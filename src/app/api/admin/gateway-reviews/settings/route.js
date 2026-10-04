import { getServerSession } from 'next-auth/next';
import { authOptions, isUserAdmin } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { getGatewayReviewSettings, updateGatewayReviewSettings } from '@/lib/admin/gatewayReviewsApi';

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.jwt || !isUserAdmin(session.user)) {
        return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });
    }

    try {
        const settings = await getGatewayReviewSettings(session.user.jwt);
        return NextResponse.json(settings);
    } catch (err) {
        console.error('[AdminGatewayReviewsSettings GET] Error:', err);
        const status = err.status || 500;
        return NextResponse.json(
            { error: err.message, code: err.code || 'SETTINGS_FETCH_ERROR' },
            { status }
        );
    }
}

export async function PUT(request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.jwt || !isUserAdmin(session.user)) {
        return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });
    }

    try {
        const body = await request.json().catch(() => ({}));
        const rawMinutes = body?.noCallbackMinutes;
        const minutes = Number(rawMinutes);

        if (!Number.isInteger(minutes) || minutes < 1 || minutes > 1440) {
            return NextResponse.json(
                { code: 'REVIEW_INVALID_THRESHOLD', error: 'مقدار آستانه باید عدد صحیح بین ۱ تا ۱۴۴۰ دقیقه باشد.' },
                { status: 400 }
            );
        }

        const updated = await updateGatewayReviewSettings(session.user.jwt, minutes);
        return NextResponse.json(updated);
    } catch (err) {
        console.error('[AdminGatewayReviewsSettings PUT] Error:', err);
        const status = err.status || 500;
        return NextResponse.json(
            { error: err.message, code: err.code || 'SETTINGS_UPDATE_ERROR' },
            { status }
        );
    }
}

