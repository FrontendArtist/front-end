// src/app/api/localities/route.js
// پروکسی فهرست رسمی استان/شهر شامل نام استان و شهرها به همراه شناسهٔ داخلی استرپی (documentId).

import { getServerSession } from 'next-auth';
import { lightAuthOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';

const UNAUTHENTICATED_MESSAGE = 'برای دریافت فهرست استان و شهر باید وارد حساب کاربری شوید.';
const UPSTREAM_MESSAGE = 'دریافت فهرست استان و شهر ناموفق بود.';
const INTERNAL_MESSAGE = 'خطای داخلی در دریافت فهرست استان و شهر.';

function strapiBaseUrl() {
    return (process.env.NEXT_PUBLIC_STRAPI_API_URL || 'http://127.0.0.1:1337')
        .trim()
        .replace(/\/api\/?$/, '')
        .replace(/\/+$/, '');
}

function normalizeLocalities(data) {
    if (!Array.isArray(data)) return null;

    const rows = [];
    for (const row of data) {
        if (!row || typeof row.name !== 'string' || row.name.trim().length === 0) return null;
        if (!Array.isArray(row.cities)) return null;

        const cities = [];
        for (const city of row.cities) {
            if (!city) return null;
            if (typeof city === 'object') {
                const name = typeof city.name === 'string' ? city.name.trim() : '';
                const documentId = typeof city.documentId === 'string' ? city.documentId.trim() : '';
                if (!name || !documentId) return null;
                cities.push({ documentId, name });
            } else if (typeof city === 'string') {
                const name = city.trim();
                if (!name) return null;
                cities.push({ documentId: name, name });
            } else {
                return null;
            }
        }
        rows.push({ name: row.name.trim(), cities });
    }
    return rows;
}

export async function GET() {
    const session = await getServerSession(lightAuthOptions);

    if (!session || !session.user || !session.user.id) {
        return NextResponse.json({ message: UNAUTHENTICATED_MESSAGE }, { status: 401 });
    }

    const headers = { Accept: 'application/json' };
    const token = process.env.STRAPI_API_TOKEN;
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    try {
        const response = await fetch(`${strapiBaseUrl()}/api/localities`, {
            method: 'GET',
            headers,
            cache: 'no-store',
        });

        const rawText = await response.text();
        let parsed = {};
        if (rawText) {
            try {
                parsed = JSON.parse(rawText);
            } catch {
                parsed = null;
            }
        }

        if (!response.ok || parsed == null) {
            console.error('Strapi localities failed:', response.status);
            return NextResponse.json({ message: UPSTREAM_MESSAGE }, { status: 502 });
        }

        const data = normalizeLocalities(parsed.data);
        if (!data) {
            console.error('Strapi localities payload was not a name/cities list');
            return NextResponse.json({ message: UPSTREAM_MESSAGE }, { status: 502 });
        }

        return NextResponse.json({ data });
    } catch (error) {
        console.error('Proxy GET /api/localities error:', error);
        return NextResponse.json({ message: INTERNAL_MESSAGE }, { status: 500 });
    }
}
