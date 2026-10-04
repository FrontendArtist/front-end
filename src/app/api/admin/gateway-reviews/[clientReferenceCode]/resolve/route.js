import { getServerSession } from 'next-auth/next';
import { authOptions, isUserAdmin } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { resolveGatewayReview } from '@/lib/admin/gatewayReviewsApi';

const VALID_OUTCOMES = ['PAID_AND_CONFIRMED', 'UNPAID_REJECTED', 'REVERSED_REJECTED'];

export async function POST(request, context) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.jwt || !isUserAdmin(session.user)) {
        return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });
    }

    try {
        const { clientReferenceCode } = await Promise.resolve(context.params);
        if (!clientReferenceCode) {
            return NextResponse.json({ error: 'کد ارجاع مشتری الزامی است' }, { status: 400 });
        }

        const body = await request.json().catch(() => ({}));
        const outcomeCode = String(body?.outcomeCode || '').trim();
        const financialRef = body?.resolutionFinancialReferenceId;

        // بررسی صریح عدم پشتیبانی از بازپرداخت دستی
        if (outcomeCode === 'MANUAL_REFUND') {
            return NextResponse.json(
                {
                    code: 'REVIEW_MANUAL_REFUND_NOT_SUPPORTED',
                    error: 'بازپرداخت دستی یا استرداد وجه در این سامانه پشتیبانی نمی‌شود.',
                },
                { status: 422 }
            );
        }

        // اعتبارسنجی نتیجه‌های مجاز
        if (!VALID_OUTCOMES.includes(outcomeCode)) {
            return NextResponse.json(
                {
                    code: 'REVIEW_INVALID_RESOLUTION',
                    error: 'نتیجه رسیدگی نامعتبر است. نتیجه باید یکی از مقادیر PAID_AND_CONFIRMED، UNPAID_REJECTED یا REVERSED_REJECTED باشد.',
                },
                { status: 400 }
            );
        }

        // اعتبارسنجی مرجع مالی: برای UNPAID_REJECTED باید null باشد و برای سایر موارد الزامی است
        if (outcomeCode === 'UNPAID_REJECTED') {
            if (financialRef !== null && financialRef !== undefined && String(financialRef).trim() !== '') {
                return NextResponse.json(
                    {
                        code: 'REVIEW_INVALID_RESOLUTION',
                        error: 'برای رد شارژ پرداخت‌نشده، مرجع مالی باید خالی (null) باشد.',
                    },
                    { status: 400 }
                );
            }
        } else {
            if (!financialRef || !String(financialRef).trim()) {
                return NextResponse.json(
                    {
                        code: 'REVIEW_INVALID_RESOLUTION',
                        error: 'برای این نتیجه، ثبت شناسه مرجع مالی الزامی است.',
                    },
                    { status: 400 }
                );
            }
        }

        const result = await resolveGatewayReview(session.user.jwt, clientReferenceCode, {
            outcomeCode,
            resolutionFinancialReferenceId: outcomeCode === 'UNPAID_REJECTED' ? null : String(financialRef).trim(),
        });

        return NextResponse.json(result);
    } catch (err) {
        console.error('[AdminGatewayReviewsResolve POST] Error:', err);
        const status = err.status || 500;
        return NextResponse.json(
            {
                code: err.code || (status === 503 ? 'REVIEW_RESOLUTION_DELIVERY_UNKNOWN' : 'RESOLUTION_FAILED'),
                error: err.message || 'خطا در ثبت نتیجه رسیدگی',
                details: err.details,
            },
            { status }
        );
    }
}

