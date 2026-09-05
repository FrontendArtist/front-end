import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { ORDER_STATUS, PAYMENT_STATUS, PAYMENT_METHOD } from "@/lib/constants/orderConstants";

const STRAPI_BASE_URL = process.env.NEXT_PUBLIC_STRAPI_API_URL || 'http://localhost:1337';
const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN;

// --------------------------------------------------------------------------
// GET /api/orders : دریافت لیست سفارشات کاربر همراه با دوره‌های داخل آن
// --------------------------------------------------------------------------
export async function GET(request) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.id) {
        return NextResponse.json({ message: "Unauthenticated" }, { status: 401 });
    }

    try {
        // ── BUG FIX ─────────────────────────────────────────────────────────────
        // صفحه /profile/orders/[id] می‌تواند ?documentId=xyz بفرستد تا فقط
        // یک سفارش خاص برگردد. قبلاً این پارامتر کاملاً نادیده گرفته می‌شد.
        const { searchParams } = new URL(request.url);
        const documentId = searchParams.get('documentId');

        let strapiUrl;
        if (documentId) {
            // دریافت یک سفارش خاص با documentId + تأیید مالکیت کاربر
            strapiUrl = `${STRAPI_BASE_URL}/api/orders`
                + `?filters[documentId][$eq]=${encodeURIComponent(documentId)}`
                + `&filters[user][id][$eq]=${session.user.id}`
                + `&populate=*`;
        } else {
            // دریافت همه سفارشات کاربر (رفتار قبلی)
            strapiUrl = `${STRAPI_BASE_URL}/api/orders`
                + `?filters[user][id][$eq]=${session.user.id}`
                + `&sort=createdAt:desc`
                + `&populate=*`;
        }

        const res = await fetch(strapiUrl, {
            headers: { 'Authorization': `Bearer ${STRAPI_TOKEN}` },
            cache: 'no-store'
        });

        if (!res.ok) {
            const errText = await res.text();
            console.error("Strapi GET Orders Error:", errText);
            throw new Error("Failed to fetch orders from Strapi");
        }
        const data = await res.json();
        return NextResponse.json(data);

    } catch (error) {
        console.error("GET Orders Error:", error);
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}

// --------------------------------------------------------------------------
// POST /api/orders : ایجاد سفارش جدید (اتصال مستقیم به کاربر و دوره‌ها)
// --------------------------------------------------------------------------
export async function POST(request) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.id) {
        return NextResponse.json({ message: "Unauthenticated" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { cartItems, totalPrice, shippingAddress, paymentMethod, paymentStatus } = body;

        if (!cartItems || !Array.isArray(cartItems)) {
            return NextResponse.json({ message: "Invalid cartItems" }, { status: 400 });
        }

        // استخراج آیدی دوره‌ها و فصل‌ها از سبد خرید برای پرکردن پروفایل کاربر
        const courseIds = cartItems
          .filter(item => item.type === 'course')
          .map(item => Number(item.id));

        const chapterIds = cartItems
          .filter(item => item.type === 'chapter')
          .map(item => Number(item.chapterId || (typeof item.id === 'string' ? item.id.replace('chapter-', '') : item.id)));

        // دریافت اطلاعات کامل کاربر از استراپی همراه با آدرس و دوره‌ها
        const userRes = await fetch(`${STRAPI_BASE_URL}/api/users/${session.user.id}?populate[0]=address&populate[1]=courses`, {
            headers: { 'Authorization': `Bearer ${STRAPI_TOKEN}` }
        });

        if (!userRes.ok) {
            const errText = await userRes.text();
            console.error("Strapi Fetch User for Order Error:", errText);
            throw new Error("Failed to fetch user profiles from Strapi");
        }
        const userData = await userRes.json();

        // ایجاد آرایه dynamic zone برای اتصال به فیلد items در سفارش
        const itemsPayload = cartItems.map(item => {
            if (item.type === 'course') {
                return {
                    __component: "order.course-order-item",
                    title: item.title,
                    price: Number(item.price) || 0,
                    courseId: Number(item.id),
                    slug: item.slug || "",
                    itemUrl: item.slug ? `/courses/${item.slug}` : "#"
                };
            } else if (item.type === 'chapter') {
                const cleanChapterId = item.chapterId || (typeof item.id === 'string' ? item.id.replace('chapter-', '') : item.id);
                const courseSlug = item.slug ? item.slug.split('-chapter-')[0] : '';
                return {
                    __component: "order.course-order-item",
                    title: item.title,
                    price: Number(item.price) || 0,
                    courseId: Number(item.courseId) || 0,
                    chapterId: Number(cleanChapterId) || 0,
                    slug: item.slug || "",
                    itemUrl: `/courses/${courseSlug || item.slug}`
                };
            } else if (item.type === 'light_topup') {
                // آیتم شارژ نور — به‌عنوان محصول ثبت می‌شود با توضیح مشخص
                return {
                    __component: "order.product-order-item",
                    title: item.title || `شارژ نور`,
                    price: Number(item.price) || 0,
                    quantity: 1,
                    productId: 0,
                    slug: "light-topup",
                    itemUrl: "/profile"
                };
            } else {
                let productUrl = `/product/${item.slug || ''}`;
                if (item.subcategorySlug && item.categorySlug) {
                    productUrl = `/products/${item.categorySlug}/${item.subcategorySlug}/${item.slug}`;
                } else if (item.categorySlug) {
                    productUrl = `/products/${item.categorySlug}/${item.slug}`;
                }

                return {
                    __component: "order.product-order-item",
                    title: item.title,
                    price: Number(item.price) || 0,
                    quantity: Number(item.quantity) || 1,
                    productId: Number(item.id),
                    slug: item.slug || "",
                    itemUrl: productUrl
                };
            }
        });

        // ── 0. محاسبه امن و سروری قیمت اقلام و اعتبارسنجی کد تخفیف ──────────
        const calculatedCartTotal = cartItems.reduce((sum, item) => {
            const price = Number(item.price) || 0;
            const qty = Number(item.quantity) > 0 ? Number(item.quantity) : 1;
            return sum + (price * qty);
        }, 0);

        let appliedCouponCode = body.couponCode || body.coupon?.code || null;
        let discountAmount = 0;
        let originalTotalPrice = calculatedCartTotal;
        let finalPayablePrice = originalTotalPrice;
        let couponValidationResult = null;

        if (appliedCouponCode) {
            try {
                const couponRes = await fetch(`${STRAPI_BASE_URL}/api/coupons/validate`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${STRAPI_TOKEN}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        code: appliedCouponCode,
                        cartItems: cartItems,
                        currentTotal: calculatedCartTotal
                    })
                });

                if (couponRes.ok) {
                    couponValidationResult = await couponRes.json();
                    if (couponValidationResult?.valid) {
                        discountAmount = Number(couponValidationResult.discountAmount) || 0;
                        originalTotalPrice = Number(couponValidationResult.originalTotalPrice) || calculatedCartTotal;
                        finalPayablePrice = Number(couponValidationResult.finalTotalPrice) || Math.max(0, originalTotalPrice - discountAmount);
                    } else {
                        appliedCouponCode = null;
                    }
                } else {
                    console.warn("Coupon validation failed on server order creation");
                    appliedCouponCode = null;
                }
            } catch (couponErr) {
                console.error("Coupon verification error during order create:", couponErr);
                appliedCouponCode = null;
            }
        }

        // ── وضعیت پرداخت و سفارش ─────────────────────────────────────────────
        // سفارش رایگان (قیمت ۰ تومان یا تخفیف ۱۰۰٪) → مستقیماً paid
        // کارت‌به‌کارت → orderStatus: 'pending', paymentStatus: 'pending_payment'
        // آنلاین → orderStatus: 'paid', paymentStatus: 'paid'
        const isFreeOrder = finalPayablePrice <= 0 || paymentMethod === PAYMENT_METHOD.FREE;
        const resolvedPaymentMethod = isFreeOrder ? PAYMENT_METHOD.FREE : (paymentMethod || PAYMENT_METHOD.ONLINE);
        const resolvedOrderStatus = isFreeOrder
            ? ORDER_STATUS.PAID
            : (resolvedPaymentMethod === PAYMENT_METHOD.CARD_TO_CARD ? ORDER_STATUS.PENDING : ORDER_STATUS.PAID);
        const resolvedPaymentStatus = isFreeOrder
            ? PAYMENT_STATUS.PAID
            : (resolvedPaymentMethod === PAYMENT_METHOD.CARD_TO_CARD
                ? PAYMENT_STATUS.PENDING_PAYMENT
                : (paymentStatus && paymentStatus !== PAYMENT_STATUS.PENDING_PAYMENT ? paymentStatus : PAYMENT_STATUS.PAID));
        const isOrderPaid = resolvedOrderStatus === ORDER_STATUS.PAID || resolvedPaymentStatus === PAYMENT_STATUS.PAID;

        // ── 1. هوشمندسازی نام خریدار (fullName) ───────────────────────────────────
        // اولویت 1: نام و نام‌خانوادگی در پروفایل کاربر
        // اولویت 2: نام گیرنده در آدرس (در صورتی که معتبر باشد و تک‌رقمی مانند '1' نباشد)
        // اولویت 3: نام کاربری یا شماره موبایل به صورت کاربر (09123456789)
        const userFullName = (userData.firstName || userData.lastName)
            ? `${userData.firstName || ''} ${userData.lastName || ''}`.trim()
            : "";
        const recipientName = userData.address?.recipientName?.trim();
        const isValidRecipient = recipientName && recipientName.length > 1 && !/^\d+$/.test(recipientName);

        const resolvedFullName = userFullName
            || (isValidRecipient ? recipientName : null)
            || (userData.username && !/^\d+$/.test(userData.username) ? userData.username : null)
            || (userData.phoneNumber ? `کاربر (${userData.phoneNumber})` : null)
            || (session.user.phoneNumber ? `کاربر (${session.user.phoneNumber})` : null)
            || session.user.name
            || "کاربر فروشگاه";

        // ── 2. ساخت خلاصه کامل اقلام خریداری شده در فیلد notes ───────────────────
        const itemSummaryList = cartItems.map((item, idx) => {
            const num = idx + 1;
            if (item.type === 'course') {
                return `${num}. [دوره آموزشی] ${item.title}`;
            } else if (item.type === 'chapter') {
                return `${num}. [فصل آموزشی] ${item.title}`;
            } else if (item.type === 'light_topup') {
                const lightAmt = Number(item.lightAmount) || 0;
                // ⚠️ عدد را ASCII نگه می‌داریم تا در admin route قابل parse باشد
                return `${num}. [شارژ نور] ${lightAmt} نور [LIGHT_AMOUNT:${lightAmt}]`;
            } else {
                const qty = (item.quantity && Number(item.quantity) > 1) ? ` (${item.quantity} عدد)` : '';
                return `${num}. [محصول فیزیکی] ${item.title}${qty}`;
            }
        });

        const generatedNotes = `📋 اقلام این سفارش:\n${itemSummaryList.join('\n')}${appliedCouponCode ? `\n\n🎟️ کد تخفیف اعمال شده: ${appliedCouponCode} (تخفیف: ${new Intl.NumberFormat('fa-IR').format(discountAmount)} تومان)` : ''}${isFreeOrder ? `\n\n🎁 این سفارش به صورت رایگان ثبت و تأیید شد.` : ''}`;
        const resolvedNotes = body.notes ? `${body.notes.trim()}\n\n${generatedNotes}` : generatedNotes;

        // استخراج آدرس کامل
        let resolvedAddress = "آدرس وارد نشده است";
        if (userData.address) {
            const { province, city, fullAddress } = userData.address;
            resolvedAddress = [province, city, fullAddress].filter(Boolean).join(" - ");
        } else if (shippingAddress) {
            resolvedAddress = shippingAddress;
        }

        // استخراج سایر اطلاعات پستی و تماس
        const resolvedPostalCode = userData.address?.postalCode || "0000000000";
        const resolvedPhone = userData.address?.recipientPhone || userData.phoneNumber || session.user.phoneNumber || "00000000000";
        const resolvedEmail = userData.email || session.user.email || "no-email@tarhelahi.com";

        // ساخت بدنه پِیلود بر اساس فیلدهای واقعی دیتابیس شما
        const orderPayload = {
            data: {
                totalPrice: Number(finalPayablePrice) || 0,
                orderStatus: resolvedOrderStatus,
                fullName: resolvedFullName,
                address: resolvedAddress,
                postalCode: resolvedPostalCode,
                phone: resolvedPhone,
                email: resolvedEmail,
                user: session.user.id,
                items: itemsPayload,
                paymentMethod: resolvedPaymentMethod,
                paymentStatus: resolvedPaymentStatus,
                notes: resolvedNotes,
                couponCode: appliedCouponCode,
                discountAmount: Number(discountAmount) || 0,
                originalTotalPrice: Number(originalTotalPrice) || Number(finalPayablePrice) || 0,
            }
        };

        // ارسال درخواست ساخت اردر به استراپی
        const orderRes = await fetch(`${STRAPI_BASE_URL}/api/orders`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${STRAPI_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(orderPayload)
        });

        if (!orderRes.ok) {
            const errData = await orderRes.json();
            console.error("Strapi Create Order Failed Details:", JSON.stringify(errData));
            throw new Error(errData?.error?.message || "Failed to create order in Strapi");
        }

        const newOrder = await orderRes.json();

        // ── مصرف اتومیک کوپن در استراپی (جلوگیری قطعی از Race Condition) ───────
        if (appliedCouponCode && couponValidationResult?.valid) {
            try {
                const consumeRes = await fetch(`${STRAPI_BASE_URL}/api/coupons/consume`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${STRAPI_TOKEN}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ code: appliedCouponCode })
                });

                if (!consumeRes.ok) {
                    const consumeErr = await consumeRes.json().catch(() => ({}));
                    console.warn("Coupon consume rejected (limit reached or invalid):", consumeErr);
                }
            } catch (incErr) {
                console.error("Failed to atomically consume coupon:", incErr);
            }
        }

        // آپدیت cartData کاربر به null برای خالی شدن سبد خرید در دیتابیس
        // دوره‌ها و فصل‌ها فقط و فقط در صورتی اضافه می‌شوند که سفارش پرداخت شده باشد (پرداخت آنلاین یا سفارش رایگان)
        // در سفارشات کارت‌به‌کارت که وضعیت pending است، پس از تأیید پرداخت توسط ادمین فعال خواهند شد.
        let userUpdatePayload = { cartData: null };

        if (isOrderPaid) {
            if (courseIds.length > 0) {
                const existingCourses = userData.courses ? userData.courses.map(c => c.id) : [];
                const mergedCourses = [...new Set([...existingCourses, ...courseIds])];
                userUpdatePayload.courses = mergedCourses;
            }

            if (chapterIds.length > 0) {
                const existingChapters = Array.isArray(userData.enrolledChapters)
                    ? userData.enrolledChapters.map(Number)
                    : [];
                userUpdatePayload.enrolledChapters = [...new Set([...existingChapters, ...chapterIds])];
            }
        }

        const userUpdateRes = await fetch(`${STRAPI_BASE_URL}/api/users/${session.user.id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${STRAPI_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userUpdatePayload)
        });

        if (!userUpdateRes.ok) {
            console.error("User update failed:", await userUpdateRes.text());
        }

        // ── اضافه کردن فوری نور برای پرداخت آنلاین ─────────────────────────
        const orderType = body.orderType;
        const lightAmount = Number(body.lightAmount);
        if (orderType === 'light_topup' && lightAmount > 0 && resolvedPaymentMethod === 'online') {
            const currentLight = userData.light ?? 0;
            const lightUpdateRes = await fetch(`${STRAPI_BASE_URL}/api/users/${session.user.id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${STRAPI_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ light: currentLight + lightAmount })
            });
            if (!lightUpdateRes.ok) {
                console.error("Light update failed:", await lightUpdateRes.text());
            }
        }

        try {
            revalidatePath('/products', 'layout');
            revalidatePath('/product', 'layout');
        } catch (revalErr) {
            console.warn("Revalidation warning:", revalErr?.message);
        }

        return NextResponse.json(newOrder, { status: 201 });

    } catch (error) {
        console.error("POST Orders Error:", error);
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}