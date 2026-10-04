import { NextResponse } from 'next/server';
import { getGatewayReviewAccess } from '@/lib/admin/gatewayReviewAccess';
import { resolveGatewayReview } from '@/lib/admin/gatewayReviewsApi';
import { validateGatewayReviewResolution } from '@/lib/gatewayReviewResolution';

export async function POST(request, context) {
    const { session, status } = await getGatewayReviewAccess();
    if (status !== 200) return NextResponse.json({ code: 'REVIEW_PERMISSION_DENIED', error: 'مجوز رسیدگی مالی ندارید.' }, { status });
    try {
        const { clientReferenceCode } = await context.params;
        const body = await request.json();
        const error = validateGatewayReviewResolution(body);
        if (error) return NextResponse.json({ code: 'REVIEW_INVALID_RESOLUTION', error }, { status: 400 });
        const result = await resolveGatewayReview(session.user.jwt, clientReferenceCode, {
            outcomeCode: body.outcomeCode, resolutionFinancialReferenceId: body.resolutionFinancialReferenceId || null,
            evidence: body.evidence,
        });
        return NextResponse.json(result);
    } catch (error) {
        return NextResponse.json({ code: error.code || 'REVIEW_RESOLUTION_DELIVERY_UNKNOWN' }, { status: error.status || 503 });
    }
}

