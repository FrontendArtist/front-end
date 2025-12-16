// src/app/api/profile/route.js

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_API_URL.replace('/api', '');
const STRAPI_ADMIN_TOKEN = process.env.STRAPI_API_TOKEN;

// --------------------------------------------------------------------------
// GET /api/profile : دریافت اطلاعات کاربر
// --------------------------------------------------------------------------
export async function GET(request) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.id) {
        return NextResponse.json({ message: "Unauthenticated" }, { status: 401 });
    }

    // مسیر Strapi: /api/users/[id] با populate برای دریافت آدرس
    const url = `${STRAPI_URL}/api/users/${session.user.id}?populate=address`;

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                // 🚨 استفاده از توکن قدرتمند (Admin/API Token)
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
        console.log('📊 User Data from Strapi:', JSON.stringify(userData, null, 2)); // Debug log
        return NextResponse.json(userData);

    } catch (error) {
        console.error("Proxy GET Error:", error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

// --------------------------------------------------------------------------
// PUT /api/profile : به‌روزرسانی اطلاعات پروفایل
// --------------------------------------------------------------------------
export async function PUT(request) {
    const session = await getServerSession(authOptions);
    const body = await request.json();

    if (!session || !session.user || !session.user.id) {
        return NextResponse.json({ message: "Unauthenticated" }, { status: 401 });
    }

    const url = `${STRAPI_URL}/api/users/${session.user.id}`;

    try {
        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                // 🚨 استفاده از توکن قدرتمند
                'Authorization': `Bearer ${STRAPI_ADMIN_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
            cache: 'no-store'
        });

        if (!response.ok) {
            console.error("Strapi update failed with status:", response.status);
            return NextResponse.json({ message: "Strapi Update Error" }, { status: response.status });
        }

        const updatedData = await response.json();
        return NextResponse.json(updatedData);

    } catch (error) {
        console.error("Proxy PUT Error:", error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}