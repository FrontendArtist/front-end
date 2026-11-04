import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { CANCEL_REASON_MAX, isGuid } from '@/lib/physicalCancel';

/** JWT را فقط از session سروری می‌خواند؛ برای ادمین نقش administrator لازم است. */
export async function getCancelSession({ admin }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.jwt) return null;
    if (admin && session.user.role?.type !== 'administrator') return null;
    return session.user.jwt;
}

export const unauthorized = () => NextResponse.json({ success: false, error: 'دسترسی غیرمجاز' }, { status: 401 });
export const badRequest = (error = 'اطلاعات واردشده معتبر نیست.') => NextResponse.json({ success: false, error }, { status: 400 });

export async function readCancelBody(request, { withQuantity }) {
    let body;
    try { body = await request.json(); } catch { return null; }
    const reason = typeof body?.reason === 'string' ? body.reason.trim() : '';
    if (!isGuid(body?.operationId) || reason.length < 1 || reason.length > CANCEL_REASON_MAX) return null;
    if (!withQuantity) return { operationId: body.operationId, reason };
    if (!Number.isInteger(body?.quantity) || body.quantity < 1) return null;
    return { operationId: body.operationId, reason, quantity: body.quantity };
}

/** توکن یا جزئیات داخلی بازتاب داده نمی‌شود؛ فقط code ساختاریافته و پیام فارسی سرور. */
export function respondCancelResult(result) {
    if (result.success) return NextResponse.json({ success: true, data: result.data });
    const allowed = [400, 401, 403, 404, 409, 503];
    const status = allowed.includes(result.status) ? result.status : 502;
    return NextResponse.json({ success: false, code: result.code, error: result.error }, { status });
}
