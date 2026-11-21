/**
 * @file src/app/api/bank-settings/route.js
 * @description Proxy سروری برای دریافت اطلاعات کارت بانکی فروشگاه از Strapi (bank-setting)
 */

import { NextResponse } from 'next/server';
import { STRAPI_API_URL } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const headers = {};
        if (process.env.STRAPI_API_TOKEN) {
            headers.Authorization = `Bearer ${process.env.STRAPI_API_TOKEN}`;
        }

        const res = await fetch(`${STRAPI_API_URL}/api/bank-setting`, {
            headers,
            cache: 'no-store',
        });

        if (!res.ok) {
            return NextResponse.json(
                { message: 'دریافت اطلاعات بانکی با خطا مواجه شد.' },
                { status: 502 }
            );
        }

        const json = await res.json().catch(() => null);
        const data = json?.data;

        if (!data) {
            return NextResponse.json(
                { message: 'اطلاعات بانکی موجود نیست.' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            data: {
                bankName: data.bankName || '',
                cardNumber: data.cardNumber || '',
                accountHolder: data.accountHolder || '',
            },
        });
    } catch (err) {
        console.error('[bank-settings] Failed to fetch bank settings:', err);
        return NextResponse.json(
            { message: 'خطا در ارتباط با سرور اطلاعات بانکی.' },
            { status: 503 }
        );
    }
}
