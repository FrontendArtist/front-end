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
        // واکشی سفارشات کاربر (courses ارتباطی با سفارش ندارد و متعلق به یوزر است)
        const url = `${STRAPI_BASE_URL}/api/orders?filters[user][id][$eq]=${session.user.id}&sort=createdAt:desc&populate=*`;

        const res = await fetch(url, {
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
        const { cartItems, totalPrice, shippingAddress } = body;

        if (!cartItems || !Array.isArray(cartItems)) {
            return NextResponse.json({ message: "Invalid cartItems" }, { status: 400 });
        }

        // استخراج آیدی دوره‌ها از سبد خرید برای اتصال به ریلیشن courses در مدل User
        const courseIds = cartItems.filter(item => item.type === 'course').map(item => Number(item.id));

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

        // ساخت بدنه پِیلود بر اساس فیلدهای واقعی دیتابیس شما
        const orderPayload = {
            data: {
                totalPrice: Number(totalPrice) || 0,
                orderStatus: 'paid ', // According to Strapi enum "paid " (with space)
                fullName: session.user.firstName ? `${session.user.firstName} ${session.user.lastName}` : "کاربر",
                address: shippingAddress || "آدرس وارد نشده است",
                postalCode: "0000000000",
                phone: session.user.phoneNumber || "00000000000",
                email: session.user.email || "no-email@tarhelahi.com",
                user: session.user.id, // متصل کردن سفارش به کاربر لاگین شده
                items: itemsPayload    // اضافه کردن سبد خرید به Order
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
            // دریافت دوره‌های فعلی کاربر برای جلوگیری از بازنویسی
            const userRes = await fetch(`${STRAPI_BASE_URL}/api/users/${session.user.id}?populate=courses`, {
                headers: { 'Authorization': `Bearer ${STRAPI_TOKEN}` }
            });
            
            if (userRes.ok) {
                const userData = await userRes.json();
                const existingCourses = userData.courses ? userData.courses.map(c => c.id) : [];
                // ادغام دوره‌های قبلی با دوره‌های جدید (حذف تکراری‌ها)
                const mergedCourses = [...new Set([...existingCourses, ...courseIds])];
                
                // پلاگین users-permissions معمولا آرایه آی‌دی‌ها را مستقیما دریافت می‌کند
                userUpdatePayload.courses = mergedCourses;
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

        return NextResponse.json(newOrder, { status: 201 });

    } catch (error) {
        console.error("POST Orders Error:", error);
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}