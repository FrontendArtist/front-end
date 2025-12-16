// src/app/api/addresses/[id]/route.js

import { NextResponse } from 'next/server';

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_API_URL.replace('/api', '');
const STRAPI_ADMIN_TOKEN = process.env.STRAPI_API_TOKEN;

export async function PUT(request, { params }) {
    const { id } = await params; // ✅ Await params before accessing id
    const body = await request.json();

    const url = `${STRAPI_URL}/api/addresses/${id}`;

    try {
        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${STRAPI_ADMIN_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
            cache: 'no-store'
        });

        if (!response.ok) {
            console.error(`Strapi Address Update Error on ID ${id}:`, response.status, await response.text());
            return NextResponse.json({ message: "Strapi Address Update Error" }, { status: response.status });
        }

        const updatedData = await response.json();
        return NextResponse.json(updatedData);
    } catch (error) {
        console.error("Proxy PUT Error:", error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
