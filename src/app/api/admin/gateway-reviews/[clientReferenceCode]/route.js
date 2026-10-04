import { getServerSession } from 'next-auth/next';
import { authOptions, isUserAdmin } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { getGatewayReviewByReference } from '@/lib/admin/gatewayReviewsApi';

export async function GET(request, context) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.jwt || !isUserAdmin(session.user)) {
        return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });
    }

    try {
        const { clientReferenceCode } = await Promise.resolve(context.params);
        if (!clientReferenceCode) {
            return NextResponse.json({ error: 'کد ارجاع مشتری الزامی است' }, { status: 400 });
        }

        const result = await getGatewayReviewByReference(session.user.jwt, clientReferenceCode);
        if (!result?.data) {
            return NextResponse.json({ error: 'پرونده مورد نظر یافت نشد' }, { status: 404 });
        }

        return NextResponse.json(result);
    } catch (err) {
        console.error('[AdminGatewayReviewsDetail GET] Error:', err);
        const status = err.status || 500;
        return NextResponse.json(
            { error: err.message, code: err.code || 'CASE_FETCH_ERROR' },
            { status }
        );
    }
}

