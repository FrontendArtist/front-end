/**
 * @file src/lib/courseOrderSettlementRoute.js
 * @description کمک‌کارهای مشترک routeهای سروری تسویهٔ سفارش‌های بای‌مانی (I11-S، BND-07)
 *
 * JWT فقط از session سروری ادمین خوانده می‌شود و به مرورگر نمی‌رسد.
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { isGuid } from '@/lib/physicalCancel';
import { adminFetch } from '@/lib/admin/adminFetch';

export const SETTLEMENT_TITLE_MAX = 200;
export const SETTLEMENT_NOTE_MAX = 1000;
const PREVIEW_TOKEN_RE = /^[0-9a-fA-F]{64}$/;

export async function getSettlementAdminJwt() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.jwt || session.user.role?.type !== 'administrator') return null;
    return session.user.jwt;
}

export const unauthorized = () => NextResponse.json({ success: false, error: 'دسترسی غیرمجاز' }, { status: 401 });
export const badRequest = (error = 'اطلاعات واردشده معتبر نیست.') =>
    NextResponse.json({ success: false, error }, { status: 400 });

export const isPeriodId = isGuid;

/** page پیش‌فرض ۱ و pageSize پیش‌فرض ۲۰ (۱ تا ۱۰۰)؛ مقدار نامعتبر null. */
export function readPaging(request) {
    const { searchParams } = new URL(request.url);
    const page = Number(searchParams.get('page') ?? 1);
    const pageSize = Number(searchParams.get('pageSize') ?? 20);
    if (!Number.isInteger(page) || page < 1) return null;
    if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) return null;
    return { page, pageSize };
}

/** بدنهٔ بستن دوره؛ previewToken تفسیر نمی‌شود و فقط شکلش بررسی می‌شود. */
export function readCloseBody(body) {
    if (!body || typeof body !== 'object') return null;
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const note = typeof body.note === 'string' ? body.note.trim() : '';
    if (title.length > SETTLEMENT_TITLE_MAX || note.length > SETTLEMENT_NOTE_MAX) return null;
    if (typeof body.previewToken !== 'string' || !PREVIEW_TOKEN_RE.test(body.previewToken)) return null;
    return { title: title || null, note: note || null, previewToken: body.previewToken };
}

/**
 * نام و موبایل کاربران استرپی برای documentIdهای داده‌شده (خریدار یا ادمین بستن‌کننده).
 * DTO تسویه فقط documentId دارد؛ شکست این واکشی فقط نام را خالی می‌گذارد و پاسخ تسویه را نمی‌شکند.
 * @returns {Promise<Map<string, { name: string|null, phone: string|null }>>}
 */
export async function lookupPeople(jwt, ids) {
    const unique = [...new Set((ids || []).filter((id) => typeof id === 'string' && id))];
    const people = new Map();
    if (!unique.length) return people;
    const params = new URLSearchParams();
    unique.forEach((id, i) => params.set(`filters[documentId][$in][${i}]`, id));
    params.set('pagination[limit]', String(unique.length));
    ['documentId', 'username', 'firstName', 'lastName', 'phoneNumber'].forEach((f, i) => params.set(`fields[${i}]`, f));
    const res = await adminFetch(`/api/users?${params.toString()}`, jwt);
    const list = Array.isArray(res) ? res : (res?.data || []);
    for (const u of list) {
        if (!u?.documentId) continue;
        const fullName = `${u.firstName || ''} ${u.lastName || ''}`.trim();
        people.set(u.documentId, { name: fullName || u.username || null, phone: u.phoneNumber || null });
    }
    return people;
}

/** به هر سفارش buyerName و buyerPhone اضافه می‌کند (بدون تغییر فیلدهای بای‌مانی). */
export async function withBuyerNames(jwt, items) {
    const people = await lookupPeople(jwt, (items || []).map((o) => o.buyerExternalUserId));
    return (items || []).map((o) => ({
        ...o,
        buyerName: people.get(o.buyerExternalUserId)?.name ?? null,
        buyerPhone: people.get(o.buyerExternalUserId)?.phone ?? null,
    }));
}

/** به هر دوره closedByName اضافه می‌کند. */
export async function withClosedByNames(jwt, periods) {
    const people = await lookupPeople(jwt, (periods || []).map((p) => p.closedByExternalUserId));
    return (periods || []).map((p) => ({ ...p, closedByName: people.get(p.closedByExternalUserId)?.name ?? null }));
}

/** توکن یا جزئیات داخلی بازتاب داده نمی‌شود؛ فقط code ساختاریافته و پیام فارسی. */
export function respondSettlementResult(result) {
    if (result.success) {
        return NextResponse.json({ success: true, data: result.data }, { status: result.status === 201 ? 201 : 200 });
    }
    const allowed = [400, 401, 403, 404, 409];
    const status = allowed.includes(result.status) ? result.status : 502;
    return NextResponse.json({ success: false, code: result.code, error: result.error }, { status });
}
