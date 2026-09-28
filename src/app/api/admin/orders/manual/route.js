/**
 * @file src/app/api/admin/orders/manual/route.js
 * @description API سروری جهت ثبت دستی سفارش، ساخت یا انتخاب کاربر، آپلود فیش و فعال‌سازی مستقیم دوره
 *
 * 🔐 امنیت: منحصراً برای ادمین‌های احراز هویت شده در دسترس است.
 */

import { getServerSession } from 'next-auth/next';
import { authOptions, isUserAdmin } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { getBatchBalancesWithByeMoney, getConversionRateWithByeMoney, purchaseCoursesAsAdminWithByeMoney } from '@/lib/byeMoneyApi';

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
                light: u.light ?? 0,
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
                        const docBalance = batchRes.balances[u.documentId];
                        const idBalance = batchRes.balances[String(u.id)];
                        const liveBalance = docBalance !== undefined ? docBalance : idBalance;
                        if (liveBalance !== undefined && liveBalance !== null) {
                            u.light = Number(liveBalance);
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

// ── POST: ثبت سفارش دستی، ساخت/انتخاب کاربر و فعال‌سازی دوره ─────────────
export async function POST(request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.jwt || !isUserAdmin(session.user)) {
        return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });
    }

    const tokenToUse = STRAPI_TOKEN || session.user.jwt;

    try {
        let userMode = 'new';
        let userId = null;
        let phoneNumber = '';
        let firstName = '';
        let lastName = '';
        let email = '';
        let selectedCourses = [];
        let totalPrice = 0;
        let isFree = false;
        let freeReason = '';
        let notes = '';

        const contentType = request.headers.get('content-type') || '';

        if (contentType.includes('multipart/form-data')) {
            const formData = await request.formData();
            userMode = formData.get('userMode') || 'new';
            userId = formData.get('userId');
            phoneNumber = formData.get('phoneNumber') || '';
            firstName = formData.get('firstName') || '';
            lastName = formData.get('lastName') || '';
            email = formData.get('email') || '';
            
            const rawCourses = formData.get('courses');
            if (rawCourses) {
                try {
                    selectedCourses = JSON.parse(rawCourses);
                } catch {
                    selectedCourses = [];
                }
            }

            totalPrice = Number(formData.get('totalPrice')) || 0;
            isFree = formData.get('isFree') === 'true' || formData.get('isFree') === true;
            freeReason = (formData.get('freeReason') || '').trim();
            notes = (formData.get('notes') || '').trim();
        } else {
            let body = {};
            try {
                body = await request.json();
            } catch {
                try {
                    const rawText = await request.text();
                    body = rawText ? JSON.parse(rawText) : {};
                } catch {
                    return NextResponse.json({ error: 'قالب داده‌های ارسالی معتبر نیست.' }, { status: 400 });
                }
            }

            userMode = body.userMode || 'new';
            userId = body.userId;
            phoneNumber = body.phoneNumber || '';
            firstName = body.firstName || '';
            lastName = body.lastName || '';
            email = body.email || '';
            selectedCourses = Array.isArray(body.courses) ? body.courses : [];
            totalPrice = Number(body.totalPrice) || 0;
            isFree = Boolean(body.isFree);
            freeReason = body.freeReason ? String(body.freeReason).trim() : '';
            notes = (body.notes || '').trim();
        }

        // ── 1. اعتبارسنجی دوره‌های انتخاب شده ────────────────────────────────
        if (!selectedCourses || !Array.isArray(selectedCourses) || selectedCourses.length === 0) {
            return NextResponse.json({ error: 'حداقل یک دوره باید برای فعال‌سازی انتخاب شود.' }, { status: 400 });
        }

        // ── 2. تعیین و ساخت/واکشی کاربر ─────────────────────────────────────
        let targetUser = null;

        if (userMode === 'new') {
            const cleanPhone = normalizePhoneNumber(phoneNumber);
            if (!cleanPhone || cleanPhone.length < 10) {
                return NextResponse.json({ error: 'شماره موبایل وارد شده نامعتبر است.' }, { status: 400 });
            }

            // چک کردن اینکه آیا کاربر قبلاً در دیتابیس ثبت‌نام کرده است یا خیر
            const checkRes = await fetch(`${STRAPI_BASE_URL}/api/users?filters[phoneNumber][$eq]=${encodeURIComponent(cleanPhone)}&populate[0]=courses`, {
                headers: { Authorization: `Bearer ${tokenToUse}` },
                cache: 'no-store',
            });

            if (checkRes.ok) {
                const existingUsers = await checkRes.json();
                const list = Array.isArray(existingUsers) ? existingUsers : (existingUsers.data || []);
                if (list.length > 0) {
                    targetUser = list[0];
                    // در صورت نیاز، نام و نام خانوادگی را در صورت خالی بودن تکمیل می‌کنیم
                    if ((!targetUser.firstName && firstName) || (!targetUser.lastName && lastName)) {
                        await fetch(`${STRAPI_BASE_URL}/api/users/${targetUser.id}`, {
                            method: 'PUT',
                            headers: {
                                Authorization: `Bearer ${tokenToUse}`,
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                firstName: firstName || targetUser.firstName,
                                lastName: lastName || targetUser.lastName,
                            }),
                        });
                        targetUser.firstName = firstName || targetUser.firstName;
                        targetUser.lastName = lastName || targetUser.lastName;
                    }
                }
            }

            // اگر کاربر وجود نداشت، یک کاربر جدید می‌سازیم
            if (!targetUser) {
                const userEmail = email.trim() || `${cleanPhone}@tarhelahi.com`;
                const tempPassword = `P@ss${Math.random().toString(36).slice(-6)}!1`;

                const createRes = await fetch(`${STRAPI_BASE_URL}/api/users`, {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${tokenToUse}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        username: cleanPhone,
                        phoneNumber: cleanPhone,
                        firstName: firstName.trim(),
                        lastName: lastName.trim(),
                        email: userEmail,
                        confirmed: true,
                        isMobileVerified: true,
                        role: 1, // Authenticated role ID
                        password: tempPassword,
                    }),
                });

                if (!createRes.ok) {
                    const createErr = await createRes.json().catch(() => ({}));
                    console.error('[ManualOrderAPI] User creation error:', createErr);
                    return NextResponse.json({
                        error: createErr?.error?.message || 'خطا در ساخت حساب کاربری کاربر جدید'
                    }, { status: 400 });
                }

                targetUser = await createRes.json();
            }
        } else {
            // کاربر موجود
            if (!userId) {
                return NextResponse.json({ error: 'کاربر مورد نظر انتخاب نشده است.' }, { status: 400 });
            }

            const userRes = await fetch(`${STRAPI_BASE_URL}/api/users/${userId}?populate[0]=courses`, {
                headers: { Authorization: `Bearer ${tokenToUse}` },
                cache: 'no-store',
            });

            if (!userRes.ok) {
                return NextResponse.json({ error: 'کاربر انتخاب شده در سیستم یافت نشد.' }, { status: 404 });
            }

            targetUser = await userRes.json();
        }

        if (!targetUser || !targetUser.id) {
            return NextResponse.json({ error: 'خطا در بازیابی اطلاعات کاربر' }, { status: 500 });
        }

        // ── 3. بررسی موجودی نور کاربر در سامانه ByeMoney ──────────────────────
        const conversionRes = await getConversionRateWithByeMoney({ jwt: session.user.jwt }).catch(() => null);
        const tomanPerNoor = conversionRes?.tomanPerNoor || (conversionRes?.rialPerNoor ? conversionRes.rialPerNoor / 10 : 1000);
        const requiredNoor = (!isFree && totalPrice > 0) ? Math.ceil(totalPrice / tomanPerNoor) : 0;

        const userExternalId = targetUser.documentId || String(targetUser.id);
        let userBalance = 0;

        try {
            const batchRes = await getBatchBalancesWithByeMoney({ userIds: [userExternalId], jwt: session.user.jwt });
            if (batchRes && batchRes.success && batchRes.balances) {
                const docBal = batchRes.balances[userExternalId];
                const idBal = batchRes.balances[String(targetUser.id)];
                userBalance = Number(docBal !== undefined ? docBal : (idBal !== undefined ? idBal : 0));
            }
        } catch (balErr) {
            console.warn('[ManualOrderAPI] Error checking user balance from ByeMoney:', balErr.message || balErr);
        }

        if (!isFree && requiredNoor > 0 && userBalance < requiredNoor) {
            const shortfall = requiredNoor - userBalance;
            return NextResponse.json({
                error: `موجودی نور کاربر برای خرید این دوره‌ها کافی نیست. موجودی فعلی: ${userBalance.toLocaleString('fa-IR')} نور، مبلغ مورد نیاز: ${requiredNoor.toLocaleString('fa-IR')} نور (کسری: ${shortfall.toLocaleString('fa-IR')} نور). لطفاً ابتدا حساب کاربر را شارژ کنید یا گزینه ثبت رایگان را فعال فرمایید.`,
                insufficientBalance: true,
                userBalance,
                requiredNoor,
                shortfallNoor: shortfall,
                shortfallToman: shortfall * tomanPerNoor,
            }, { status: 400 });
        }

        // ── 4. خرید دوره‌ها در سامانه ByeMoney (کسر نور یا ثبت رایگان) ──────────
        // استخراج شناسه‌های یکتای دوره‌ها (documentId) جهت ارسال به سامانه مالی ByeMoney
        const externalCourseIds = Array.from(new Set(
            selectedCourses
                .map(c => c.documentId || c.courseDocumentId || (c.slug ? c.slug : String(c.courseId || c.id)))
                .filter(Boolean)
        ));

        if (externalCourseIds.length === 0) {
            return NextResponse.json({ error: 'شناسه معتبر دوره‌ها برای ثبت در سامانه مالی یافت نشد.' }, { status: 400 });
        }

        let byeMoneyTransaction = null;

        // تمام تراکنش‌ها (چه با کسر نور و چه ثبت رایگان) مستقیماً به اندپوینت رسمی خرید بای‌مانی ارسال می‌شوند
        const byeMoneyRes = await purchaseCoursesAsAdminWithByeMoney({
            beneficiaryExternalUserId: userExternalId,
            externalCourseIds,
            isFree,
            freeReason: isFree ? freeReason : null,
            jwt: session.user.jwt,
        });

        if (!byeMoneyRes.success) {
            if (byeMoneyRes.insufficientBalance && !isFree) {
                const shortfall = Math.max(0, requiredNoor - userBalance);
                return NextResponse.json({
                    error: byeMoneyRes.error || `موجودی نور کاربر برای خرید این دوره‌ها کافی نیست. لطفاً ابتدا حساب کاربر را شارژ کنید.`,
                    insufficientBalance: true,
                    userBalance,
                    requiredNoor,
                    shortfallNoor: shortfall,
                    shortfallToman: shortfall * tomanPerNoor,
                }, { status: 400 });
            }

            return NextResponse.json({
                error: byeMoneyRes.error || 'خطا در ثبت تراکنش در سامانه ByeMoney.',
                conflict: byeMoneyRes.conflict || false,
            }, { status: byeMoneyRes.conflict ? 409 : 400 });
        }

        byeMoneyTransaction = byeMoneyRes.data;

        // ── 5. آماده‌سازی اقلام سفارش (Items) ──────────────────────────────────
        const itemsPayload = selectedCourses.map((c) => {
            const courseId = Number(c.courseId || c.id);
            const chapterId = c.chapterId ? Number(c.chapterId) : null;
            const price = Number(c.price) >= 0 ? Number(c.price) : 0;
            const slug = c.slug || '';
            const itemSlug = chapterId ? `${slug}-chapter-${chapterId}` : slug;

            return {
                __component: 'order.course-order-item',
                title: c.chapterTitle ? `${c.title} - ${c.chapterTitle}` : c.title,
                price: isFree ? 0 : price,
                courseId,
                chapterId,
                slug: itemSlug,
                itemUrl: slug ? `/courses/${slug}` : '#',
            };
        });

        // ── 6. نام خریدار و یادداشت‌ها ─────────────────────────────────────────
        const userFullName = (targetUser.firstName || targetUser.lastName)
            ? `${targetUser.firstName || ''} ${targetUser.lastName || ''}`.trim()
            : (targetUser.username || `کاربر (${targetUser.phoneNumber})`);

        const adminAuthor = session.user.name || session.user.email || 'مدیر سیستم';
        const formattedNotes = [
            isFree
                ? `🎁 [ثبت رایگان توسط ادمین: ${adminAuthor}${freeReason ? ` | علت: ${freeReason}` : ''}]`
                : `📌 [ثبت دستی با پرداخت نور از کیف پول توسط ادمین: ${adminAuthor}]`,
            byeMoneyTransaction?.transactionId ? `کد تراکنش مالی: ${byeMoneyTransaction.transactionId}` : null,
            isFree
                ? `وضعیت مالی: ثبت رایگان (ارزش پایه دوره‌ها: ${Number(totalPrice).toLocaleString('fa-IR')} تومان)`
                : `موجودی نور پیش از سفارش: ${userBalance.toLocaleString('fa-IR')} نور | مبلغ سفارش: ${requiredNoor.toLocaleString('fa-IR')} نور (${Number(totalPrice).toLocaleString('fa-IR')} تومان)`,
            notes ? `توضیحات: ${notes}` : null,
            `اقلام ثبت‌شده: ${selectedCourses.map(c => c.chapterTitle ? `${c.title} (${c.chapterTitle})` : c.title).join('، ')}`
        ].filter(Boolean).join('\n');

        // ── 7. ثبت لاگ سفارش در Strapi ────────────────────────────────────────
        const orderPayload = {
            data: {
                fullName: userFullName,
                address: isFree ? 'ثبت رایگان توسط مدیر سیستم' : 'ثبت دستی با تسویه از کیف پول نور',
                postalCode: '0000000000',
                phone: targetUser.phoneNumber || '00000000000',
                email: targetUser.email || `${targetUser.phoneNumber || targetUser.id}@tarhelahi.com`,
                totalPrice: isFree ? 0 : (Number(totalPrice) || 0),
                originalTotalPrice: Number(totalPrice) || 0,
                orderStatus: 'paid',
                paymentStatus: 'paid',
                paymentMethod: isFree ? 'free_grant' : 'byemoney_noor',
                receiptImage: null,
                trackingNumber: byeMoneyTransaction?.transactionId ? String(byeMoneyTransaction.transactionId) : null,
                cardHolderName: null,
                user: targetUser.id,
                items: itemsPayload,
                notes: formattedNotes,
            }
        };

        const orderRes = await fetch(`${STRAPI_BASE_URL}/api/orders`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${tokenToUse}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(orderPayload),
        });

        if (!orderRes.ok) {
            const errData = await orderRes.json().catch(() => ({}));
            console.error('[ManualOrderAPI] Create order failed:', errData);
            return NextResponse.json({
                error: errData?.error?.message || 'خطا در ثبت سفارش در سرور'
            }, { status: 500 });
        }

        const newOrder = await orderRes.json();
        const orderId = newOrder.data?.id || newOrder.id;

        // ── 8. فعال‌سازی دسترسی دوره ────────────────────────────────────────────
        // توجه: فعال‌سازی دوره در استراپی منحصراً توسط وب‌هوک سرور-به-سرور ByeMoney
        // (به مسیر /api/integrations/byemoney/v1/purchases/confirm) انجام می‌گیرد
        // و فرانت‌اند هرگز اقدام به دستکاری مستقیم رابطه کاربری در استراپی نمی‌کند.

        return NextResponse.json({
            success: true,
            orderId,
            orderNumber: newOrder.data?.orderNumber || `#${orderId}`,
            transactionId: byeMoneyTransaction?.transactionId || null,
            message: isFree
                ? 'سفارش رایگان با موفقیت ثبت شد و فرآیند فعال‌سازی دوره آغاز گردید.'
                : 'سفارش دستی با موفقیت ثبت شد و مبلغ از کیف پول نور کاربر کسر گردید.',
        }, { status: 201 });

    } catch (error) {
        console.error('[ManualOrderAPI POST] Exception:', error);
        return NextResponse.json({ error: error.message || 'خطای غیرمنتظره در سرور' }, { status: 500 });
    }
}
