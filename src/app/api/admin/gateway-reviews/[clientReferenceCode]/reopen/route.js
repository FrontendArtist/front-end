import { NextResponse } from 'next/server';
import { getGatewayReviewAccess } from '@/lib/admin/gatewayReviewAccess';
import { reopenGatewayReview } from '@/lib/admin/gatewayReviewsApi';

export async function POST(request, context) {
    const { session, status } = await getGatewayReviewAccess();
    if (status !== 200) return NextResponse.json({ code: 'REVIEW_PERMISSION_DENIED' }, { status });
    try {
        const { clientReferenceCode } = await context.params;
        const body = await request.json();
        return NextResponse.json(await reopenGatewayReview(session.user.jwt, clientReferenceCode,
            { evidenceId: body.evidenceId, note: body.note }));
    } catch (error) {
        return NextResponse.json({ code: error.code || 'REVIEW_RESOLUTION_DELIVERY_UNKNOWN' }, { status: error.status || 503 });
    }
}
