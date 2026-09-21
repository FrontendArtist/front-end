import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { LIGHT_TO_TOMAN_RATE } from '@/lib/constants';
import { getWalletBalanceWithByeMoney } from '@/lib/byeMoneyApi';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// --------------------------------------------------------------------------
// GET /api/payment-light — دریافت موجودی واقعی کیف پول نور کاربر از ByeMoney
// --------------------------------------------------------------------------
export async function GET() {
    const session = await getServerSession(authOptions);

    if (!session?.user?.jwt) {
        return NextResponse.json({ message: 'Unauthenticated' }, { status: 401 });
    }

    try {
        const balanceRes = await getWalletBalanceWithByeMoney({ jwt: session.user.jwt });

        if (!balanceRes.success && balanceRes.unauthorized) {
            return NextResponse.json({ message: 'Unauthorized session' }, { status: 401 });
        }

        const lightBalance = balanceRes.balance ?? 0;

        return NextResponse.json({
            light: lightBalance,
            balance: lightBalance,
            currency: balanceRes.currency || 'Noor',
            lightInToman: lightBalance * LIGHT_TO_TOMAN_RATE,
            rate: LIGHT_TO_TOMAN_RATE,
        });
    } catch (error) {
        console.error('[GET /api/payment-light]', error);
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}

// --------------------------------------------------------------------------
// POST /api/payment-light — منسوخ شده (مسدودسازی تغییر مستقیم موجودی)
// بر اساس معماری ByeMoney (D05/D06/I07)، کلیه تغییرات موجودی نور باید از طریق Ledger ثبت شوند.
// --------------------------------------------------------------------------
export async function POST() {
    return NextResponse.json(
        {
            error: 'Method Not Allowed',
            message: 'تغییر مستقیم موجودی نور مجاز نمی‌باشد. افزایش اعتبار باید از طریق درخواست شارژ (TopUp) در سامانه مالی ByeMoney انجام گیرد.',
        },
        { status: 405 }
    );
}

