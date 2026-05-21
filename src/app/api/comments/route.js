// src/app/api/comments/route.js

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

const STRAPI_URL = (process.env.NEXT_PUBLIC_STRAPI_API_URL || 'http://127.0.0.1:1337').replace('/api', '');
const STRAPI_ADMIN_TOKEN = process.env.STRAPI_API_TOKEN;

export async function POST(request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.user || !session.user.id) {
            return NextResponse.json({ message: "برای ثبت نظر ابتدا باید وارد حساب کاربری خود شوید" }, { status: 401 });
        }

        const body = await request.json();

        // استخراج payload یا data
        const dataPayload = body.data || body;

        // قرار دادن شناسه کاربر لاگین شده به صورت امن در سمت سرور
        dataPayload.user = session.user.id;

        const url = `${STRAPI_URL}/api/comments`;

        console.log('📤 Proxy sending to Strapi:', JSON.stringify({ data: dataPayload }, null, 2));

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${STRAPI_ADMIN_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ data: dataPayload }),
            cache: 'no-store'
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Strapi Comment Creation Error:", response.status, errorText);
            return NextResponse.json({ message: "خطا در ثبت نظر در پایگاه داده" }, { status: response.status });
        }

        const createdData = await response.json();
        return NextResponse.json(createdData);

    } catch (error) {
        console.error("Proxy POST Comments Error:", error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
