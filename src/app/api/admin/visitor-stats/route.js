import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { getVisitorStats } from '@/lib/admin/adminVisitorApi';

/**
 * Route Handler برای دریافت آخرین آمار بازدیدها و افراد آنلاین توسط ادمین
 * GET /api/admin/visitor-stats
 */
export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.jwt || session.user.role?.type !== 'administrator') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const stats = await getVisitorStats(session.user.jwt);
        if (!stats) {
            return NextResponse.json({ error: 'Failed to fetch visitor stats' }, { status: 502 });
        }
        return NextResponse.json({ success: true, data: stats });
    } catch (error) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
