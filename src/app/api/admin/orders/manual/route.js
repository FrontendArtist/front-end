/**
 * @file src/app/api/admin/orders/manual/route.js
 * @description API سروری جهت ثبت دستی سفارش، ساخت یا انتخاب کاربر، آپلود فیش و فعال‌سازی مستقیم دوره
 *
 * 🔐 امنیت: منحصراً برای ادمین‌های احراز هویت شده در دسترس است.
 */

import { getServerSession } from 'next-auth/next';
import { authOptions, isUserAdmin } from '@/lib/auth';
import { NextResponse } from 'next/server';

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
            const cleanQ = encodeURIComponent(query.trim());
            endpoint += `&filters[$or][0][phoneNumber][$containsi]=${cleanQ}&filters[$or][1][firstName][$containsi]=${cleanQ}&filters[$or][2][lastName][$containsi]=${cleanQ}&filters[$or][3][email][$containsi]=${cleanQ}&filters[$or][4][username][$containsi]=${cleanQ}`;
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
                username: u.username,
                phoneNumber: u.phoneNumber || '',
                firstName: u.firstName || '',
                lastName: u.lastName || '',
                fullName,
                email: u.email || '',
                courses: (u.courses || []).map(c => ({ id: c.id, title: c.title })),
                enrolledChapters: Array.isArray(u.enrolledChapters) ? u.enrolledChapters : [],
            };
        });

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
        let paymentMethod = 'card_to_card';
        let paymentStatus = 'paid';
        let orderStatus = 'paid';
        let trackingNumber = '';
        let cardHolderName = '';
        let notes = '';
        let receiptFile = null;

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
            paymentMethod = formData.get('paymentMethod') || 'card_to_card';
            paymentStatus = formData.get('paymentStatus') || 'paid';
            orderStatus = formData.get('orderStatus') || 'paid';
            trackingNumber = (formData.get('trackingNumber') || '').trim();
            cardHolderName = (formData.get('cardHolderName') || '').trim();
            notes = (formData.get('notes') || '').trim();

            const fileEntry = formData.get('receiptImage');
            if (fileEntry && typeof fileEntry.arrayBuffer === 'function' && fileEntry.size > 0) {
                receiptFile = fileEntry;
            }
        } else {
            const body = await request.json();
            userMode = body.userMode || 'new';
            userId = body.userId;
            phoneNumber = body.phoneNumber || '';
            firstName = body.firstName || '';
            lastName = body.lastName || '';
            email = body.email || '';
            selectedCourses = body.courses || [];
            totalPrice = Number(body.totalPrice) || 0;
            paymentMethod = body.paymentMethod || 'card_to_card';
            paymentStatus = body.paymentStatus || 'paid';
            orderStatus = body.orderStatus || 'paid';
            trackingNumber = (body.trackingNumber || '').trim();
            cardHolderName = (body.cardHolderName || '').trim();
            notes = (body.notes || '').trim();
        }

        // ── 1. اعتبارسنجی دوره‌های انتخاب شده ────────────────────────────────
        if (!selectedCourses || !Array.isArray(selectedCourses) || selectedCourses.length === 0) {
            return NextResponse.json({ error: 'حداقل یک دوره باید برای فعال‌سازی انتخاب شود.' }, { status: 400 });
        }

        // ── 2. بارگذاری فیش واریزی در صورت وجود ──────────────────────────────
        let uploadedMediaId = null;
        if (receiptFile) {
            try {
                const uploadForm = new FormData();
                const fileExt = (receiptFile.name || 'receipt.jpg').split('.').pop() || 'jpg';
                const uniqueFileName = `manual-receipt-${Date.now()}.${fileExt}`;

                uploadForm.append('files', receiptFile, uniqueFileName);
                uploadForm.append('path', 'receipts');
                uploadForm.append(
                    'fileInfo',
                    JSON.stringify({
                        name: uniqueFileName,
                        caption: `Manual order receipt for ${cardHolderName || phoneNumber || 'customer'}`,
                        alternativeText: 'Payment receipt',
                    })
                );

                const uploadRes = await fetch(`${STRAPI_BASE_URL}/api/upload`, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${tokenToUse}` },
                    body: uploadForm,
                });

                if (uploadRes.ok) {
                    const uploadData = await uploadRes.json();
                    uploadedMediaId = uploadData?.[0]?.id || null;
                } else {
                    console.error('[ManualOrderAPI] Upload failed:', await uploadRes.text());
                }
            } catch (upErr) {
                console.error('[ManualOrderAPI] Receipt upload exception:', upErr);
            }
        }

        // ── 3. تعیین و ساخت/واکشی کاربر ─────────────────────────────────────
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

        // ── 4. آماده‌سازی اقلام سفارش (Items) ──────────────────────────────────
        const courseIdsToActivate = new Set();
        const chapterIdsToActivate = new Set();

        const itemsPayload = selectedCourses.map((c) => {
            const courseId = Number(c.courseId || c.id);
            const chapterId = c.chapterId ? Number(c.chapterId) : null;
            const price = Number(c.price) >= 0 ? Number(c.price) : 0;
            const slug = c.slug || '';
            const itemSlug = chapterId ? `${slug}-chapter-${chapterId}` : slug;

            if (chapterId) {
                chapterIdsToActivate.add(chapterId);
            } else if (courseId) {
                courseIdsToActivate.add(courseId);
            }

            return {
                __component: 'order.course-order-item',
                title: c.chapterTitle ? `${c.title} - ${c.chapterTitle}` : c.title,
                price,
                courseId,
                chapterId,
                slug: itemSlug,
                itemUrl: slug ? `/courses/${slug}` : '#',
            };
        });

        // ── 5. نام خریدار و یادداشت‌ها ─────────────────────────────────────────
        const userFullName = (targetUser.firstName || targetUser.lastName)
            ? `${targetUser.firstName || ''} ${targetUser.lastName || ''}`.trim()
            : (cardHolderName || targetUser.username || `کاربر (${targetUser.phoneNumber})`);

        const adminAuthor = session.user.name || session.user.email || 'مدیر سیستم';
        const formattedNotes = [
            `📌 [ثبت دستی توسط ادمین: ${adminAuthor}]`,
            notes ? `توضیحات: ${notes}` : null,
            trackingNumber ? `شماره پیگیری: ${trackingNumber}` : null,
            cardHolderName ? `نام واریزکننده: ${cardHolderName}` : null,
            `اقلام فعال‌شده: ${selectedCourses.map(c => c.chapterTitle ? `${c.title} (${c.chapterTitle})` : c.title).join('، ')}`
        ].filter(Boolean).join('\n');

        // ── 6. ساخت سفارش در Strapi ──────────────────────────────────────────
        const orderPayload = {
            data: {
                fullName: userFullName,
                address: 'ثبت دستی توسط مدیریت سیستم',
                postalCode: '0000000000',
                phone: targetUser.phoneNumber || '00000000000',
                email: targetUser.email || `${targetUser.phoneNumber || targetUser.id}@tarhelahi.com`,
                totalPrice: Number(totalPrice) || 0,
                originalTotalPrice: Number(totalPrice) || 0,
                orderStatus: orderStatus || 'paid',
                paymentStatus: paymentStatus || 'paid',
                paymentMethod: paymentMethod || 'card_to_card',
                receiptImage: uploadedMediaId,
                trackingNumber: trackingNumber || null,
                cardHolderName: cardHolderName || null,
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

        // ── 7. فعال‌سازی مستقیم و قطعی دوره‌ها در پروفایل کاربر ────────────────
        const isPaid = orderStatus === 'paid' || paymentStatus === 'paid';
        if (isPaid) {
            try {
                // به‌روزرسانی سرفصل‌های خریداری‌شده کاربر
                const existingChapters = Array.isArray(targetUser.enrolledChapters)
                    ? targetUser.enrolledChapters.map(Number)
                    : [];
                const mergedChapters = [...new Set([...existingChapters, ...Array.from(chapterIdsToActivate)])];

                const userUpdateData = {
                    enrolledChapters: mergedChapters,
                };

                // فقط در صورتی که خرید کامل دوره انتخاب شده باشد، دوره به لیست دوره‌های کلی اضافه می‌شود
                if (courseIdsToActivate.size > 0) {
                    const existingCourses = Array.isArray(targetUser.courses)
                        ? targetUser.courses.map(c => typeof c === 'object' ? c.id : Number(c))
                        : [];
                    userUpdateData.courses = [...new Set([...existingCourses, ...Array.from(courseIdsToActivate)])];
                }

                await fetch(`${STRAPI_BASE_URL}/api/users/${targetUser.id}`, {
                    method: 'PUT',
                    headers: {
                        Authorization: `Bearer ${tokenToUse}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(userUpdateData),
                });

                // ج) به‌روزرسانی رابطه دوطرفه در سمت Courseها جهت نمایش در Strapi Admin UI
                for (const cId of courseIdsToActivate) {
                    try {
                        const courseRes = await fetch(`${STRAPI_BASE_URL}/api/courses/${cId}?populate[users_permissions_users][fields][0]=id`, {
                            headers: { Authorization: `Bearer ${tokenToUse}` },
                        });
                        if (courseRes.ok) {
                            const cData = await courseRes.json();
                            const courseUsers = cData.data?.users_permissions_users || [];
                            const userIds = courseUsers.map(u => u.id).filter(Boolean);
                            if (!userIds.includes(targetUser.id)) {
                                userIds.push(targetUser.id);
                                await fetch(`${STRAPI_BASE_URL}/api/courses/${cId}`, {
                                    method: 'PUT',
                                    headers: {
                                        Authorization: `Bearer ${tokenToUse}`,
                                        'Content-Type': 'application/json',
                                    },
                                    body: JSON.stringify({
                                        data: { users_permissions_users: userIds }
                                    }),
                                });
                            }
                        }
                    } catch (cSyncErr) {
                        console.warn(`[ManualOrderAPI] Could not sync course ${cId} users:`, cSyncErr);
                    }
                }
            } catch (syncErr) {
                console.error('[ManualOrderAPI] User enrollment sync error:', syncErr);
            }
        }

        return NextResponse.json({
            success: true,
            orderId,
            orderNumber: newOrder.data?.orderNumber || `#${orderId}`,
            message: 'سفارش دستی با موفقیت ثبت شد و دوره‌ها برای کاربر فعال گردیدند.',
        }, { status: 201 });

    } catch (error) {
        console.error('[ManualOrderAPI POST] Exception:', error);
        return NextResponse.json({ error: error.message || 'خطای غیرمنتظره در سرور' }, { status: 500 });
    }
}
