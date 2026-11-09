/**
 * @file src/app/api/admin/orders/manual/route.js
 * @description جستجوی کاربر (GET) و ثبت دستی سفارش دوره/فصل روی سبد بای‌مانی (POST، I11-AO)
 *
 * 🔐 امنیت: منحصراً برای ادمین‌های احراز هویت شده در دسترس است.
 */

import { getServerSession } from 'next-auth/next';
import { authOptions, isUserAdmin } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { getBatchBalancesWithByeMoney, createAdminCartOrderWithByeMoney, CourseOrderId } from '@/lib/byeMoneyApi';
import { parseManualOrderItems, resolveBeneficiary } from '@/lib/admin/manualOrderInput';
import { requireAdminJwt, respondByeMoneyResult, invalidBody } from '@/lib/admin/byeMoneyAdminRoute';

const STRAPI_BASE_URL = process.env.NEXT_PUBLIC_STRAPI_API_URL || 'http://localhost:1337';
const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN;

// ── ابزار کمکی برای نرمال‌سازی شماره تلفن فارسی/عربی ───────────────────────
function normalizePhoneNumber(input) {
    if (!input) return '';
    let cleaned = String(input)
        .trim()
        .replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
        .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))
        .replace(/\s+/g, '')
        .replace(/^(\+98|0098)/, '0');

    if (!cleaned.startsWith('0') && cleaned.length === 10) {
        cleaned = '0' + cleaned;
    }
    return cleaned;
}

// ── GET: جستجوی زنده کاربران برای فرم ثبت سفارش دستی ──────────────────────
export async function GET(request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.jwt || !isUserAdmin(session.user)) {
        return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || searchParams.get('search') || '';

    try {
        const tokenToUse = STRAPI_TOKEN || session.user.jwt;
        let endpoint = `${STRAPI_BASE_URL}/api/users?populate[courses][fields][0]=id&populate[courses][fields][1]=title&sort=createdAt:desc&pagination[limit]=20`;

        if (query && query.trim()) {
            const rawQ = query.trim();
            const cleanQ = encodeURIComponent(rawQ);
            const normalizedPhone = normalizePhoneNumber(rawQ);
            endpoint += `&filters[$or][0][phoneNumber][$containsi]=${cleanQ}&filters[$or][1][firstName][$containsi]=${cleanQ}&filters[$or][2][lastName][$containsi]=${cleanQ}&filters[$or][3][email][$containsi]=${cleanQ}&filters[$or][4][username][$containsi]=${cleanQ}`;
            if (normalizedPhone && normalizedPhone !== rawQ) {
                endpoint += `&filters[$or][5][phoneNumber][$containsi]=${encodeURIComponent(normalizedPhone)}`;
            }
        }

        const res = await fetch(endpoint, {
            headers: { Authorization: `Bearer ${tokenToUse}` },
            cache: 'no-store',
        });

        if (!res.ok) {
            const errText = await res.text();
            console.error('[ManualOrderAPI GET] Strapi Error:', errText);
            return NextResponse.json({ error: 'خطا در واکشی کاربران' }, { status: res.status });
        }

        const rawUsers = await res.json();
        const usersList = Array.isArray(rawUsers) ? rawUsers : (rawUsers.data || []);

        const users = usersList.map(u => {
            const fullName = (u.firstName || u.lastName)
                ? `${u.firstName || ''} ${u.lastName || ''}`.trim()
                : (u.username || 'کاربر');
            return {
                id: u.id,
                documentId: u.documentId || String(u.id),
                username: u.username,
                phoneNumber: u.phoneNumber || '',
                firstName: u.firstName || '',
                lastName: u.lastName || '',
                fullName,
                email: u.email || '',
                noorBalance: null, // فقط از بای‌مانی؛ null = نامشخص
                balanceUnavailable: true,
                courses: (u.courses || []).map(c => ({ id: c.id, title: c.title })),
                enrolledChapters: Array.isArray(u.enrolledChapters) ? u.enrolledChapters : [],
            };
        });

        // ── دریافت دسته‌جمعی موجودی زنده نور از سامانه ByeMoney ────────────
        const userIds = users.map(u => u.documentId || String(u.id)).filter(Boolean);
        if (userIds.length > 0) {
            try {
                const batchRes = await getBatchBalancesWithByeMoney({ userIds, jwt: session.user.jwt });
                if (batchRes.success && batchRes.balances) {
                    users.forEach(u => {
                        u.balanceUnavailable = false;
                        const docBalance = batchRes.balances[u.documentId];
                        const idBalance = batchRes.balances[String(u.id)];
                        const liveBalance = docBalance !== undefined ? docBalance : idBalance;
                        if (liveBalance !== undefined && liveBalance !== null) {
                            u.noorBalance = Number(liveBalance);
                        }
                    });
                }
            } catch (err) {
                console.warn('[ManualOrderAPI GET] ByeMoney balances enrichment failed:', err.message || err);
            }
        }

        return NextResponse.json({ users });
    } catch (err) {
        console.error('[ManualOrderAPI GET] Exception:', err);
        return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
    }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const bad = (error) => NextResponse.json({ success: false, error }, { status: 400 });

// ── POST: سفارش دستی ادمین روی سبد بای‌مانی (I11-AO) — فقط دوره و فصل ─────
// رکورد order استرپی ساخته نمی‌شود (D08). JWT فقط از نشست سروری می‌آید.
export async function POST(request) {
    const auth = await requireAdminJwt();
    if (auth.response) return auth.response;

    let body;
    try {
        body = await request.json();
    } catch {
        return invalidBody();
    }

    const cartId = typeof body?.cartId === 'string' ? body.cartId.trim().toLowerCase() : '';
    if (!UUID_RE.test(cartId)) return bad('شناسهٔ سبد نامعتبر است.');

    const parsed = parseManualOrderItems(body.items);
    if (parsed.error) return bad(parsed.error);

    const isFree = body.isFree === true;
    const freeReason = isFree ? String(body.freeReason ?? '').trim() : '';
    if (isFree && (freeReason.length < 1 || freeReason.length > 1000)) {
        return bad('علت ثبت رایگان الزامی است (حداکثر ۱۰۰۰ نویسه).');
    }

    const beneficiary = await resolveBeneficiary({
        strapiBaseUrl: STRAPI_BASE_URL, token: STRAPI_TOKEN || auth.jwt, userId: body.userId,
    });
    if (beneficiary.error) return NextResponse.json({ success: false, error: beneficiary.error }, { status: beneficiary.status });

    const result = await createAdminCartOrderWithByeMoney({
        cartId,
        beneficiaryExternalUserId: beneficiary.id,
        items: parsed.items,
        isFree,
        freeReason,
        jwt: auth.jwt,
    });

    if (!result.success) {
        return respondByeMoneyResult({
            ...result,
            error: result.insufficientBalance
                ? 'موجودی نور کاربر برای این سفارش کافی نیست. سفارشی ثبت نشد؛ ابتدا کیف کاربر را شارژ کنید و دوباره ثبت کنید.'
                : result.error,
        });
    }

    return NextResponse.json({
        success: true,
        orderId: CourseOrderId.for('Cart', cartId),
        cartId,
        status: result.data?.status || null,
    });
}
