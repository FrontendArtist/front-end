import { NextResponse } from "next/server";

const STRAPI_BASE_URL = process.env.NEXT_PUBLIC_STRAPI_API_URL || 'http://localhost:1337';
const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN;

export async function POST(request) {
    try {
        const body = await request.json();
        const { code, cartItems, currentTotal } = body;

        if (!code || typeof code !== 'string' || !code.trim()) {
            return NextResponse.json(
                { valid: false, message: "لطفاً کد تخفیف را وارد کنید." },
                { status: 400 }
            );
        }

        const strapiUrl = `${STRAPI_BASE_URL}/api/coupons/validate`;
        const headers = {
            'Content-Type': 'application/json',
        };

        if (STRAPI_TOKEN) {
            headers['Authorization'] = `Bearer ${STRAPI_TOKEN}`;
        }

        const res = await fetch(strapiUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                code: code.trim(),
                cartItems: cartItems || [],
                currentTotal: currentTotal || 0,
            }),
            cache: 'no-store',
        });

        const data = await res.json();

        if (!res.ok) {
            return NextResponse.json(
                { valid: false, message: data?.error?.message || data?.message || "کد تخفیف نامعتبر است." },
                { status: res.status }
            );
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error("Coupon Validation Route Error:", error);
        return NextResponse.json(
            { valid: false, message: error.message || "خطا در برقراری ارتباط با سرور." },
            { status: 500 }
        );
    }
}
