/**
 * PATCH /api/admin/users/[id]/light
 * ادمین می‌تواند مقدار نور یک کاربر را تغییر دهد (افزایش یا مستقیم set)
 */
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';

const STRAPI_BASE_URL = process.env.NEXT_PUBLIC_STRAPI_API_URL || 'http://localhost:1337';
const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN;

export async function PATCH(request, { params }) {
    const session = await getServerSession(authOptions);

    // فقط ادمین اجازه دارد
    if (!session?.user?.jwt || session.user.role?.type !== 'administrator') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
        return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    try {
        const body = await request.json();
        const { addAmount, setAmount } = body;

        // ── دریافت موجودی فعلی ─────────────────────────────────────
        if (addAmount !== undefined) {
            const currentRes = await fetch(
                `${STRAPI_BASE_URL}/api/users/${id}?fields=light`,
                { headers: { Authorization: `Bearer ${STRAPI_TOKEN}` }, cache: 'no-store' }
            );
            if (!currentRes.ok) throw new Error('Failed to fetch current light');
            const currentData = await currentRes.json();
            const currentLight = currentData.light ?? 0;
            const newLight = currentLight + Number(addAmount);

            const updateRes = await fetch(`${STRAPI_BASE_URL}/api/users/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${STRAPI_TOKEN}`,
                },
                body: JSON.stringify({ light: newLight }),
            });
            if (!updateRes.ok) throw new Error('Failed to update light');
            return NextResponse.json({ success: true, newLight });
        }

        // ── set مستقیم ───────────────────────────────────────────────
        if (setAmount !== undefined) {
            const updateRes = await fetch(`${STRAPI_BASE_URL}/api/users/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${STRAPI_TOKEN}`,
                },
                body: JSON.stringify({ light: Number(setAmount) }),
            });
            if (!updateRes.ok) throw new Error('Failed to set light');
            return NextResponse.json({ success: true, newLight: Number(setAmount) });
        }

        return NextResponse.json({ error: 'addAmount or setAmount is required' }, { status: 400 });

    } catch (error) {
        console.error('[PATCH /api/admin/users/[id]/light]', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
