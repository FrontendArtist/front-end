import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { getContactMessages } from '@/lib/admin/adminMessagesApi';

export async function GET(request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.jwt || session.user.role?.type !== 'administrator') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startParam = searchParams.get('start');
    const limitParam = searchParams.get('limit');
    const page = searchParams.get('page');
    const pageSize = searchParams.get('pageSize');

    try {
        const options = {};
        if (startParam !== null) {
            options.start = parseInt(startParam, 10) || 0;
            options.limit = parseInt(limitParam, 10) || 20;
        } else if (page !== null) {
            options.page = parseInt(page, 10) || 1;
            options.pageSize = parseInt(pageSize, 10) || 50;
        } else {
            options.start = 0;
            options.limit = 20;
        }

        const { messages, meta, error } = await getContactMessages(session.user.jwt, options);

        if (error) {
            return NextResponse.json({ error: 'خطا در دریافت لیست پیام‌ها' }, { status: 500 });
        }

        return NextResponse.json({
            data: messages,
            meta,
        });
    } catch (error) {
        console.error('❌ GET /api/admin/contact-messages Exception:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
