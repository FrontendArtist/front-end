/**
 * POST /api/admin/users/bulk-light
 * اضافه کردن مقدار مشخصی نور به تمام کاربران در دیتابیس (توسط ادمین)
 */
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';

const STRAPI_BASE_URL = process.env.NEXT_PUBLIC_STRAPI_API_URL || 'http://localhost:1337';
const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN;

export async function POST(request) {
    const session = await getServerSession(authOptions);

    if (!session?.user?.jwt || session.user.role?.type !== 'administrator') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { amount } = body;

        const addAmount = Number(amount);
        if (!addAmount || addAmount <= 0 || !Number.isFinite(addAmount)) {
            return NextResponse.json({ error: 'مقدار نور نامعتبر است' }, { status: 400 });
        }

        // دریافت لیست همه کاربران
        const usersRes = await fetch(`${STRAPI_BASE_URL}/api/users?pagination[limit]=1000&fields=id,light`, {
            headers: { Authorization: `Bearer ${STRAPI_TOKEN}` },
            cache: 'no-store',
        });

        if (!usersRes.ok) {
            throw new Error('Failed to fetch users list');
        }

        const users = await usersRes.json();
        const usersList = Array.isArray(users) ? users : (users.data || []);

        if (!usersList.length) {
            return NextResponse.json({ success: true, updatedCount: 0, addedAmount: addAmount });
        }

        // آپدیت همزمان تمام کاربران
        const updatePromises = usersList.map(async (u) => {
            const currentLight = u.light ?? 0;
            const newLight = currentLight + addAmount;

            const res = await fetch(`${STRAPI_BASE_URL}/api/users/${u.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${STRAPI_TOKEN}`,
                },
                body: JSON.stringify({ light: newLight }),
            });

            if (!res.ok) {
                console.error(`[Bulk Light] Failed to update user ${u.id}`);
            }
            return res.ok;
        });

        await Promise.all(updatePromises);

        return NextResponse.json({
            success: true,
            updatedCount: usersList.length,
            addedAmount: addAmount,
        });

    } catch (error) {
        console.error('[POST /api/admin/users/bulk-light]', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
