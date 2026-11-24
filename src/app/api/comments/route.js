// src/app/api/comments/route.js

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import { getStrapiBaseUrl } from "@/lib/api";

const ENTITY_FIELDS = ['article', 'product', 'course'];
const RELATION_ID_RE = /^[a-zA-Z0-9_-]{1,128}$/;

function extractRelationId(value) {
    if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
        return String(value);
    }
    if (typeof value === 'string') {
        const trimmed = value.trim();
        return RELATION_ID_RE.test(trimmed) ? trimmed : null;
    }
    if (value && typeof value === 'object') {
        const arr = Array.isArray(value.connect)
            ? value.connect
            : Array.isArray(value.set)
                ? value.set
                : null;
        if (arr && arr.length === 1) {
            return extractRelationId(arr[0]);
        }
    }
    return null;
}

function resolveParentEntity(parentComment, entityType) {
    const raw = parentComment?.[entityType] ?? parentComment?.attributes?.[entityType]?.data ?? null;
    if (!raw || typeof raw !== 'object') return null;
    return {
        id: raw.id != null ? String(raw.id) : null,
        documentId: raw.documentId != null ? String(raw.documentId) : null,
    };
}

export async function POST(request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user || !session.user.id) {
            return NextResponse.json({ message: "برای ثبت نظر ابتدا باید وارد حساب کاربری خود شوید" }, { status: 401 });
        }

        const strapiAdminToken = process.env.STRAPI_API_TOKEN;
        if (!strapiAdminToken) {
            console.error('[comments] STRAPI_API_TOKEN is not configured.');
            return NextResponse.json({ message: "خطای پیکربندی سرور" }, { status: 500 });
        }

        let body;
        try {
            body = await request.json();
        } catch {
            return NextResponse.json({ message: "بدنه درخواست نامعتبر است" }, { status: 400 });
        }

        const rawPayload = body?.data && typeof body.data === 'object' ? body.data : body;
        if (!rawPayload || typeof rawPayload !== 'object') {
            return NextResponse.json({ message: "اطلاعات نظر نامعتبر است" }, { status: 400 });
        }

        const content = typeof rawPayload.content === 'string' ? rawPayload.content.trim() : '';
        if (!content) {
            return NextResponse.json({ message: "متن نظر نمی‌تواند خالی باشد" }, { status: 400 });
        }

        const parsedRating = Number(rawPayload.rating);
        const rating = Number.isFinite(parsedRating)
            ? Math.min(5, Math.max(1, Math.round(parsedRating)))
            : 5;

        const targetEntities = [];
        for (const field of ENTITY_FIELDS) {
            if (rawPayload[field] !== undefined && rawPayload[field] !== null) {
                const entityId = extractRelationId(rawPayload[field]);
                if (!entityId) {
                    return NextResponse.json({ message: "شناسه محتوای هدف نامعتبر است" }, { status: 400 });
                }
                targetEntities.push({ field, rawValue: rawPayload[field], id: entityId });
            }
        }

        if (targetEntities.length > 1) {
            return NextResponse.json({ message: "نظر فقط می‌تواند به یک محتوا متصل باشد" }, { status: 400 });
        }

        const strapiBase = getStrapiBaseUrl();

        if (rawPayload.comment_parent !== undefined && rawPayload.comment_parent !== null) {
            const parentId = extractRelationId(rawPayload.comment_parent);
            if (!parentId) {
                return NextResponse.json({ message: "شناسه نظر والد نامعتبر است" }, { status: 400 });
            }
            if (targetEntities.length !== 1) {
                return NextResponse.json({ message: "برای ثبت پاسخ، مشخص‌بودن محتوای هدف الزامی است" }, { status: 400 });
            }

            const targetEntity = targetEntities[0];
            const parentUrl = /^\d+$/.test(parentId)
                ? `${strapiBase}/api/comments?filters[id][$eq]=${encodeURIComponent(parentId)}&populate[0]=article&populate[1]=product&populate[2]=course`
                : `${strapiBase}/api/comments/${encodeURIComponent(parentId)}?populate[0]=article&populate[1]=product&populate[2]=course`;

            const parentRes = await fetch(parentUrl, {
                headers: { 'Authorization': `Bearer ${strapiAdminToken}` },
                cache: 'no-store',
            });

            if (parentRes.status === 404) {
                return NextResponse.json({ message: "نظر والد یافت نشد" }, { status: 400 });
            }
            if (!parentRes.ok) {
                return NextResponse.json({ message: "امکان بررسی نظر والد وجود ندارد" }, { status: 502 });
            }

            const parentJson = await parentRes.json().catch(() => null);
            const parentComment = Array.isArray(parentJson?.data) ? parentJson.data[0] : parentJson?.data;
            if (!parentComment) {
                return NextResponse.json({ message: "نظر والد یافت نشد" }, { status: 400 });
            }

            const parentEntity = resolveParentEntity(parentComment, targetEntity.field);
            const matchesParentEntity =
                parentEntity &&
                (parentEntity.id === targetEntity.id || parentEntity.documentId === targetEntity.id);

            if (!matchesParentEntity) {
                return NextResponse.json({ message: "نظر والد به این محتوا تعلق ندارد" }, { status: 400 });
            }
        }

        const dataPayload = {
            content,
            rating,
            isApproved: false,
            user: session.user.id,
        };

        if (typeof rawPayload.name === 'string' && rawPayload.name.trim()) {
            dataPayload.name = rawPayload.name.trim().slice(0, 100);
        }
        for (const entity of targetEntities) {
            dataPayload[entity.field] = entity.rawValue;
        }
        if (rawPayload.comment_parent !== undefined && rawPayload.comment_parent !== null) {
            dataPayload.comment_parent = rawPayload.comment_parent;
        }

        const url = `${strapiBase}/api/comments`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${strapiAdminToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ data: dataPayload }),
            cache: 'no-store'
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Strapi Comment Creation Error:", response.status, errorText);
            return NextResponse.json({ message: "خطا در ثبت نظر در پایگاه داده" }, { status: response.status });
        }

        const createdData = await response.json();
        return NextResponse.json(createdData);

    } catch (error) {
        console.error("Proxy POST Comments Error:", error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
