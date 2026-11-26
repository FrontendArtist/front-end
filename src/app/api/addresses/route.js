// src/app/api/addresses/route.js

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getStrapiBaseUrl } from '@/lib/api';

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

export async function POST(request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session?.user?.jwt) {
        return NextResponse.json(
            { message: 'برای ثبت آدرس ابتدا باید وارد حساب کاربری خود شوید.' },
            { status: 401 }
        );
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

    const sanitizedData = {
        ...pickAddressFields(rawData),
        user: session.user.id,
    };

    const url = `${getStrapiBaseUrl()}/api/addresses`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${session.user.jwt}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ data: sanitizedData }),
            cache: 'no-store'
        });

        if (!response.ok) {
            const rawText = await response.text();
            let message = "Strapi Address Creation Error";
            try {
                const parsed = JSON.parse(rawText);
                message = parsed?.error?.message || parsed?.message || message;
            } catch {}
            console.error("Strapi Address Creation Error:", response.status);
            return NextResponse.json({ message }, { status: response.status });
        }

        const createdData = await response.json();
        return NextResponse.json(createdData);
    } catch (error) {
        console.error("Proxy POST Error:", error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
