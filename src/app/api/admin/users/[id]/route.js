/**
 * @file src/app/api/admin/users/[id]/route.js
 * @description Proxy Route برای دریافت جزئیات یک کاربر (برای ادمین)
 */
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { getUserDetails } from '@/lib/adminApi';

export async function GET(request, { params }) {
    const session = await getServerSession(authOptions);

    if (!session?.user?.jwt || session.user.role?.type !== 'administrator') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
        return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const result = await getUserDetails(id, session.user.jwt);

    if (result.error) {
        return NextResponse.json({ error: 'Failed to fetch user details' }, { status: 500 });
    }

    return NextResponse.json(result.user, { status: 200 });
}
