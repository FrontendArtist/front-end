import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { LIGHT_TO_TOMAN_RATE } from '@/lib/constants';

const STRAPI_BASE_URL = process.env.NEXT_PUBLIC_STRAPI_API_URL || 'http://localhost:1337';
const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN;

// --------------------------------------------------------------------------
// GET /api/payment-light — دریافت موجودی نور کاربر
// --------------------------------------------------------------------------
export async function GET() {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        return NextResponse.json({ message: 'Unauthenticated' }, { status: 401 });
    }

    try {
        const res = await fetch(`${STRAPI_BASE_URL}/api/users/${session.user.id}?fields=light`, {
            headers: { Authorization: `Bearer ${STRAPI_TOKEN}` },
            cache: 'no-store',
        });

        if (!res.ok) throw new Error('Failed to fetch user light balance');

        const userData = await res.json();
        const lightBalance = userData.light ?? 0;

        return NextResponse.json({
            light: lightBalance,
            lightInToman: lightBalance * LIGHT_TO_TOMAN_RATE,
            rate: LIGHT_TO_TOMAN_RATE,
        });
    } catch (error) {
        console.error('[GET /api/payment-light]', error);
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}

// --------------------------------------------------------------------------
// POST /api/payment-light — افزایش موجودی نور پس از پرداخت موفق
// --------------------------------------------------------------------------
export async function POST(request) {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        return NextResponse.json({ message: 'Unauthenticated' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { lightAmount } = body;

        // اعتبارسنجی مقدار
        const amount = Number(lightAmount);
        if (!amount || amount <= 0 || !Number.isFinite(amount)) {
            return NextResponse.json({ message: 'مقدار نور نامعتبر است' }, { status: 400 });
        }

        // ── دریافت موجودی فعلی ─────────────────────────────────────────────
        const currentRes = await fetch(
            `${STRAPI_BASE_URL}/api/users/${session.user.id}?fields=light`,
            { headers: { Authorization: `Bearer ${STRAPI_TOKEN}` }, cache: 'no-store' }
        );
        if (!currentRes.ok) throw new Error('Failed to fetch current light balance');
        const currentData = await currentRes.json();
        const currentLight = currentData.light ?? 0;

        // ── محاسبه موجودی جدید ─────────────────────────────────────────────
        const newLight = currentLight + amount;

        // ── آپدیت در Strapi ────────────────────────────────────────────────
        const updateRes = await fetch(`${STRAPI_BASE_URL}/api/users/${session.user.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${STRAPI_TOKEN}`,
            },
            body: JSON.stringify({ light: newLight }),
        });

        if (!updateRes.ok) {
            const errText = await updateRes.text();
            console.error('[Light Update Error]', errText);
            throw new Error('Failed to update light balance');
        }

        return NextResponse.json({
            success: true,
            addedLight: amount,
            newBalance: newLight,
            newBalanceInToman: newLight * LIGHT_TO_TOMAN_RATE,
            rate: LIGHT_TO_TOMAN_RATE,
        });
    } catch (error) {
        console.error('[POST /api/payment-light]', error);
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
