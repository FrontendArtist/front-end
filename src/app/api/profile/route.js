// src/app/api/profile/route.js

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

// تنظیم آدرس پایه استرپی (حذف /api اگر وجود داشته باشد تا آدرس‌ها درست ساخته شوند)
const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_API_URL.replace('/api', '');
// دریافت توکن ادمین از متغیرهای محیطی
const STRAPI_ADMIN_TOKEN = process.env.STRAPI_API_TOKEN;

// --------------------------------------------------------------------------
// GET /api/profile : دریافت اطلاعات کاربر + سبد خرید
// --------------------------------------------------------------------------
export async function GET(request) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.id) {
        return NextResponse.json({ message: "Unauthenticated" }, { status: 401 });
    }

    // مسیر Strapi: دریافت یوزر به همراه آدرس (cartData خودکار می‌آید چون در یوزر است)
    const url = `${STRAPI_URL}/api/users/${session.user.id}?populate=address`;

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                // 🚨 Proxy Pattern: استفاده از توکن ادمین برای دور زدن محدودیت‌های کلاینت
                'Authorization': `Bearer ${STRAPI_ADMIN_TOKEN}`,
                'Content-Type': 'application/json',
            },
            cache: 'no-store'
        });

        if (!response.ok) {
            console.error("Strapi fetch failed with status:", response.status);
            return NextResponse.json({ message: "Strapi Error" }, { status: response.status });
        }

        const userData = await response.json();
        // console.log('📊 User Data:', JSON.stringify(userData, null, 2)); 
        return NextResponse.json(userData);

    } catch (error) {
        console.error("Proxy GET Error:", error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

// --------------------------------------------------------------------------
// PUT /api/profile : به‌روزرسانی پروفایل و همگام‌سازی سبد خرید (Sync)
// --------------------------------------------------------------------------
export async function PUT(request) {
    const session = await getServerSession(authOptions);

    // 1. بررسی احراز هویت
    if (!session || !session.user || !session.user.id) {
        return NextResponse.json({ message: "Unauthenticated" }, { status: 401 });
    }

    try {
        const body = await request.json();

        // 2. استخراج داده‌های مجاز (Security Layer)
        // به جای ارسال کل body، فقط چیزهایی که اجازه داریم را جدا می‌کنیم
        const { firstName, lastName, cartData } = body;

        // 3. ساخت پی‌لود نهایی
        const payload = {};
        if (firstName !== undefined) payload.firstName = firstName;
        if (lastName !== undefined) payload.lastName = lastName;
        if (cartData !== undefined) payload.cartData = cartData; // ✅ اضافه شدن پشتیبانی از سبد خرید

        // اگر هیچ دیتایی برای آپدیت نبود
        if (Object.keys(payload).length === 0) {
            return NextResponse.json({ message: "No valid fields to update" }, { status: 400 });
        }

        const url = `${STRAPI_URL}/api/users/${session.user.id}`;

        // 4. ارسال به Strapi با توکن ادمین
        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${STRAPI_ADMIN_TOKEN}`, // دسترسی کامل ادمین
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
            cache: 'no-store'
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("Strapi update failed:", errorData);
            return NextResponse.json(
                { message: errorData?.error?.message || "Strapi Update Error" }, 
                { status: response.status }
            );
        }

        const updatedData = await response.json();
        return NextResponse.json(updatedData);

    } catch (error) {
        console.error("Proxy PUT Error:", error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}