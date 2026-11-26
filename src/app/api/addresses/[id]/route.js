// src/app/api/addresses/[id]/route.js

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getStrapiBaseUrl } from '@/lib/api';

const ADDRESS_ID_RE = /^[a-zA-Z0-9_-]{1,128}$/;
const ALLOWED_ADDRESS_FIELDS = [
    'title',
    'recipientName',
    'recipientPhone',
    'province',
    'city',
    'fullAddress',
    'postalCode',
    'cityLink',
];

function pickAddressFields(raw) {
    const payload = {};
    for (const key of ALLOWED_ADDRESS_FIELDS) {
        if (raw[key] !== undefined) {
            payload[key] = raw[key];
        }
    }
    return payload;
}

export async function PUT(request, { params }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session?.user?.jwt) {
        return NextResponse.json(
            { message: 'برای ویرایش آدرس ابتدا باید وارد حساب کاربری خود شوید.' },
            { status: 401 }
        );
    }

    const { id } = await params;
    const trimmedId = typeof id === 'string' ? id.trim() : '';
    if (!trimmedId || !ADDRESS_ID_RE.test(trimmedId)) {
        return NextResponse.json({ message: 'شناسه آدرس نامعتبر است.' }, { status: 400 });
    }

    let body;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ message: 'بدنه درخواست نامعتبر است.' }, { status: 400 });
    }

    const rawData = body?.data && typeof body.data === 'object' ? body.data : body;
    if (!rawData || typeof rawData !== 'object') {
        return NextResponse.json({ message: 'اطلاعات آدرس نامعتبر است.' }, { status: 400 });
    }

    const strapiBase = getStrapiBaseUrl();
    const encodedId = encodeURIComponent(trimmedId);
    const userJwt = session.user.jwt;

    try {
        // بررسی مالکیت آدرس پیش از ویرایش (جلوگیری از IDOR)
        const existingRes = await fetch(`${strapiBase}/api/addresses/${encodedId}?populate[0]=user`, {
            headers: { 'Authorization': `Bearer ${userJwt}` },
            cache: 'no-store',
        });

        if (existingRes.status === 404) {
            return NextResponse.json({ message: 'آدرس مورد نظر یافت نشد.' }, { status: 404 });
        }
        if (existingRes.status === 403) {
            return NextResponse.json({ message: 'شما مجاز به ویرایش این آدرس نیستید.' }, { status: 403 });
        }
        if (!existingRes.ok) {
            return NextResponse.json({ message: 'امکان بررسی مالکیت آدرس وجود ندارد.' }, { status: 502 });
        }

        const existingJson = await existingRes.json().catch(() => null);
        const existingAddress = existingJson?.data;
        if (!existingAddress) {
            return NextResponse.json({ message: 'آدرس مورد نظر یافت نشد.' }, { status: 404 });
        }

        const ownerId =
            existingAddress.user?.id ??
            existingAddress.attributes?.user?.data?.id ??
            null;

        if (!ownerId || String(ownerId) !== String(session.user.id)) {
            return NextResponse.json(
                { message: 'شما مجاز به ویرایش این آدرس نیستید.' },
                { status: 403 }
            );
        }

        const sanitizedData = pickAddressFields(rawData);
        const url = `${strapiBase}/api/addresses/${encodedId}`;

        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${userJwt}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ data: sanitizedData }),
            cache: 'no-store'
        });

        if (!response.ok) {
            const rawText = await response.text();
            let message = "Strapi Address Update Error";
            try {
                const parsed = JSON.parse(rawText);
                message = parsed?.error?.message || parsed?.message || message;
            } catch {}
            console.error(`Strapi Address Update Error on ID ${trimmedId}:`, response.status);
            return NextResponse.json({ message }, { status: response.status });
        }

        const updatedData = await response.json();
        return NextResponse.json(updatedData);
    } catch (error) {
        console.error("Proxy PUT Error:", error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
