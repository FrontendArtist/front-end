import { getServerSession } from 'next-auth/next';
import { authOptions, isUserAdmin } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { getGatewayReviews } from '@/lib/admin/gatewayReviewsApi';

export async function GET(request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.jwt || !isUserAdmin(session.user)) {
        return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1', 10);
        const pageSize = parseInt(searchParams.get('pageSize') || '25', 10);
        const status = searchParams.get('status') || '';
        const reasonCode = searchParams.get('reasonCode') || '';

        const result = await getGatewayReviews(session.user.jwt, {
            page,
            pageSize,
            status,
            reasonCode,
        });

        return NextResponse.json(result);
    } catch (err) {
        console.error('[AdminGatewayReviews GET] Error:', err);
        const status = err.status || 500;
        return NextResponse.json(
            { error: err.message, code: err.code || 'GATEWAY_REVIEW_FETCH_ERROR', details: err.details },
            { status }
        );
    }
}

