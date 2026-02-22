// src/app/api/addresses/route.js

import { NextResponse } from 'next/server';

const STRAPI_URL = (process.env.NEXT_PUBLIC_STRAPI_API_URL || 'http://127.0.0.1:1337').replace('/api', '');
const STRAPI_ADMIN_TOKEN = process.env.STRAPI_API_TOKEN;

export async function POST(request) {
    const body = await request.json();

    const url = `${STRAPI_URL}/api/addresses`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${STRAPI_ADMIN_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
            cache: 'no-store'
        });

        if (!response.ok) {
            console.error("Strapi Address Creation Error:", response.status, await response.text());
            return NextResponse.json({ message: "Strapi Address Creation Error" }, { status: response.status });
        }

        const createdData = await response.json();
        return NextResponse.json(createdData);
    } catch (error) {
        console.error("Proxy POST Error:", error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
