/**
 * @file src/app/api/media/route.js
 * @description Media upload proxy – forwards multipart/form-data to Strapi Upload API
 *
 * Used by ProductForm to upload images before saving the product.
 * Requires admin JWT from session.
 */

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_API_URL || 'http://127.0.0.1:1337';

export async function POST(request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.jwt || session.user.role?.type !== 'administrator') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const formData = await request.formData();

        const res = await fetch(`${STRAPI_URL}/api/upload`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${session.user.jwt}`,
                // Note: Do NOT set Content-Type manually for multipart/form-data
                // The browser/Node sets it automatically including the boundary.
            },
            body: formData,
        });

        const data = await res.json();

        if (!res.ok) {
            if (process.env.NODE_ENV === 'development') {
                console.error('[MediaAPI] Upload error:', JSON.stringify(data));
            }
            return NextResponse.json(
                { error: data?.error?.message || 'Upload failed' },
                { status: res.status }
            );
        }

        // Returns array of uploaded file objects from Strapi
        return NextResponse.json(data, { status: 200 });
    } catch (err) {
        console.error('[MediaAPI] Server error:', err.message);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
