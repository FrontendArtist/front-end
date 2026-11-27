// src/app/api/profile/route.js

import { getServerSession } from "next-auth";
import { lightAuthOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

// تنظیم آدرس پایه استرپی (حذف /api اگر وجود داشته باشد تا آدرس‌ها درست ساخته شوند)
const STRAPI_URL = (process.env.NEXT_PUBLIC_STRAPI_API_URL || 'http://127.0.0.1:1337').trim().replace(/\/api\/?$/, '').replace(/\/+$/, '');
// دریافت توکن ادمین از متغیرهای محیطی
const STRAPI_ADMIN_TOKEN = process.env.STRAPI_API_TOKEN;

const PROFILE_ALLOWED_INCLUDES = new Set(['basic', 'cart', 'address', 'courses']);

function buildStrapiProfileQuery(includeParam) {
    if (!includeParam) {
        return 'populate[0]=address&populate[1]=courses&populate[2]=address.cityLink';
    }

    const tokens = includeParam
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter((t) => PROFILE_ALLOWED_INCLUDES.has(t));

    if (tokens.length === 0) {
        return 'populate[0]=address&populate[1]=courses&populate[2]=address.cityLink';
    }

    const params = new URLSearchParams();
    const fields = new Set(['id']);

    if (tokens.includes('basic') || tokens.includes('address')) {
        fields.add('firstName');
        fields.add('lastName');
        fields.add('phoneNumber');
    }
    if (tokens.includes('cart')) {
        fields.add('cartData');
    }
    if (tokens.includes('courses')) {
        fields.add('enrolledChapters');
        fields.add('enrolledChapterIntegrationIds');
        params.set('populate[courses][fields][0]', 'id');
        params.set('populate[courses][fields][1]', 'documentId');
        params.set('populate[courses][fields][2]', 'slug');
        params.set('populate[courses][fields][3]', 'title');
        params.set('populate[courses][fields][4]', 'price');
        params.set('populate[courses][fields][5]', 'isFree');
    }
    if (tokens.includes('address')) {
        params.set('populate[address][populate][0]', 'cityLink');
    }

    [...fields].forEach((field, idx) => {
        params.set(`fields[${idx}]`, field);
    });

    return params.toString();
}

// --------------------------------------------------------------------------
// GET /api/profile : دریافت اطلاعات کاربر (قابل تفکیک با ?include=basic|cart|address|courses)
// --------------------------------------------------------------------------
export async function GET(request) {
    const session = await getServerSession(lightAuthOptions);

    if (!session || !session.user || !session.user.id) {
        return NextResponse.json({ message: "Unauthenticated" }, { status: 401 });
    }

    const includeParam = new URL(request.url).searchParams.get('include');
    const query = buildStrapiProfileQuery(includeParam);
    const url = `${STRAPI_URL}/api/users/${session.user.id}?${query}`;

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${STRAPI_ADMIN_TOKEN}`,
                'Content-Type': 'application/json',
            },
            cache: 'no-store'
        });

        const rawText = await response.text();

        if (!response.ok) {
            console.error("Strapi fetch user failed with status:", response.status, rawText);
            return NextResponse.json(
                { message: response.status === 404 ? "User not found in Strapi. Please log in again." : "Strapi Error" },
                { status: response.status }
            );
        }

        const userData = rawText ? JSON.parse(rawText) : {};
        if (!Array.isArray(userData.enrolledChapterIntegrationIds)) {
            userData.enrolledChapterIntegrationIds = [];
        }

        return NextResponse.json(userData);

    } catch (error) {
        console.error("Proxy GET Error:", error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

// --------------------------------------------------------------------------
// PUT /api/profile : به‌روزرسانی پروفایل و همگام‌سازی سبد خرید (Sync)
// --------------------------------------------------------------------------
export async function PUT(request) {
    const session = await getServerSession(lightAuthOptions);

    // 1. بررسی احراز هویت
    if (!session || !session.user || !session.user.id) {
        return NextResponse.json({ message: "Unauthenticated" }, { status: 401 });
    }

    try {
        const body = await request.json();

        // 2. استخراج داده‌های مجاز (Security Layer)
        const { firstName, lastName, cartData } = body;

        // 3. ساخت پی‌لود نهایی
        const payload = {};
        if (firstName !== undefined) payload.firstName = firstName;
        if (lastName !== undefined) payload.lastName = lastName;
        if (cartData !== undefined) payload.cartData = cartData;

        // اگر هیچ دیتایی برای آپدیت نبود
        if (Object.keys(payload).length === 0) {
            return NextResponse.json({ message: "No valid fields to update" }, { status: 400 });
        }

        const url = `${STRAPI_URL}/api/users/${session.user.id}`;

        // 4. ارسال به Strapi با توکن ادمین
        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${STRAPI_ADMIN_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
            cache: 'no-store'
        });

        const rawText = await response.text();
        let parsedData = {};
        try {
            parsedData = rawText ? JSON.parse(rawText) : {};
        } catch (e) {
            console.error("Failed to parse Strapi PUT response:", rawText);
        }

        if (!response.ok) {
            console.error("Strapi update failed:", parsedData);
            return NextResponse.json(
                { message: parsedData?.error?.message || (response.status === 404 ? "User not found in Strapi. Please log in again." : "Strapi Update Error") },
                { status: response.status }
            );
        }

        if (firstName === undefined && lastName === undefined && cartData !== undefined) {
            return NextResponse.json({
                ok: true,
                id: parsedData?.id ?? session.user.id,
                cartData: parsedData?.cartData ?? payload.cartData,
            });
        }

        return NextResponse.json(parsedData);

    } catch (error) {
        console.error("Proxy PUT Error:", error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}