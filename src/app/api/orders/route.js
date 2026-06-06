import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

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

        // استخراج آیدی دوره‌ها از سبد خرید برای اتصال به ریلیشن courses در مدل User
        const courseIds = cartItems.filter(item => item.type === 'course').map(item => Number(item.id));

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

        // ── BUG FIX ─────────────────────────────────────────────────────────────
        // قبلاً orderStatus همیشه 'paid ' بود — حتی برای کارت‌به‌کارت!
        // حالا: کارت‌به‌کارت → 'pending'  |  آنلاین → 'paid '
        const resolvedPaymentMethod = paymentMethod || 'online';
        const resolvedOrderStatus = resolvedPaymentMethod === 'card_to_card'
            ? 'pending'
            : 'paid ';

        // استخراج نام کاربر/گیرنده
        const dbFullName = (userData.firstName || userData.lastName)
            ? `${userData.firstName || ''} ${userData.lastName || ''}`.trim()
            : "";
        const resolvedFullName = userData.address?.recipientName || dbFullName || session.user.name || "کاربر";

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
                totalPrice: Number(totalPrice) || 0,
                orderStatus: resolvedOrderStatus,
                fullName: resolvedFullName,
                address: resolvedAddress,
                postalCode: resolvedPostalCode,
                phone: resolvedPhone,
                email: resolvedEmail,
                user: session.user.id,
                items: itemsPayload,
                paymentMethod: resolvedPaymentMethod,
                paymentStatus: paymentStatus || 'pending_payment',
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

        // آپدیت cartData کاربر به null برای خالی شدن سبد خرید در دیتابیس
        // و اضافه کردن دوره‌های جدید به کاربر
        let userUpdatePayload = { cartData: null };

        if (courseIds.length > 0) {
            // استفاده از دوره‌های لود شده قبلی
            const existingCourses = userData.courses ? userData.courses.map(c => c.id) : [];
            // ادغام دوره‌های قبلی با دوره‌های جدید (حذف تکراری‌ها)
            const mergedCourses = [...new Set([...existingCourses, ...courseIds])];

            // پلاگین users-permissions معمولا آرایه آی‌دی‌ها را مستقیما دریافت می‌کند
            userUpdatePayload.courses = mergedCourses;
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

        return NextResponse.json(newOrder, { status: 201 });

    } catch (error) {
        console.error("POST Orders Error:", error);
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}