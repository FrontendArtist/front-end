/**
 * @file src/app/api/admin/coupons/route.js
 * @description API Route for listing (GET) and creating (POST) discount coupons
 *
 * 🔐 Security: JWT is verified server-side from session (Administrator role required).
 */

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { getAdminCoupons } from '@/lib/admin/adminCouponsApi';

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_API_URL || 'http://127.0.0.1:1337';

export async function GET(request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.jwt || session.user.role?.type !== 'administrator') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startParam = searchParams.get('start');
    const limitParam = searchParams.get('limit');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '50', 10);

    const options = (startParam !== null && limitParam !== null)
        ? { start: parseInt(startParam, 10), limit: parseInt(limitParam, 10) }
        : { page, pageSize };

    try {
        const { coupons, meta, error } = await getAdminCoupons(session.user.jwt, options);

        if (error) {
            return NextResponse.json({ error: 'Failed to fetch coupons' }, { status: 500 });
        }

        return NextResponse.json({ coupons, meta });
    } catch (error) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

export async function POST(request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.jwt || session.user.role?.type !== 'administrator') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const {
        code,
        title,
        discountType,
        discountValue,
        maxDiscountAmount,
        minOrderAmount,
        appliesToAllProducts,
        appliesToAllCourses,
        products,
        courses,
        startDate,
        expiresAt,
        maxUsage,
        usedCount,
        isActive,
    } = body;

    if (!code || typeof code !== 'string' || !code.trim()) {
        return NextResponse.json({ error: 'کد تخفیف الزامی است' }, { status: 400 });
    }

    if (discountValue == null || isNaN(Number(discountValue)) || Number(discountValue) <= 0) {
        return NextResponse.json({ error: 'مقدار تخفیف باید عددی بزرگتر از صفر باشد' }, { status: 400 });
    }

    const strapiPayload = {
        data: {
            code: code.trim().toUpperCase(),
            title: title ? title.trim() : null,
            discountType: discountType === 'fixed' ? 'fixed' : 'percentage',
            discountValue: Number(discountValue),
            maxDiscountAmount: (maxDiscountAmount !== null && maxDiscountAmount !== '' && !isNaN(Number(maxDiscountAmount))) ? Number(maxDiscountAmount) : null,
            minOrderAmount: (minOrderAmount !== null && minOrderAmount !== '' && !isNaN(Number(minOrderAmount))) ? Number(minOrderAmount) : null,
            appliesToAllProducts: !!appliesToAllProducts,
            appliesToAllCourses: !!appliesToAllCourses,
            products: Array.isArray(products) ? products : [],
            courses: Array.isArray(courses) ? courses : [],
            startDate: startDate || null,
            expiresAt: expiresAt || null,
            maxUsage: (maxUsage !== null && maxUsage !== '' && !isNaN(Number(maxUsage))) ? Number(maxUsage) : null,
            usedCount: Number(usedCount) || 0,
            isActive: isActive !== false,
        },
    };

    try {
        const res = await fetch(`${STRAPI_URL}/api/coupons`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${session.user.jwt}`,
            },
            cache: 'no-store',
            body: JSON.stringify(strapiPayload),
        });

        const data = await res.json();

        if (!res.ok) {
            if (process.env.NODE_ENV === 'development') {
                console.error('[AdminCouponsAPI] POST error:', JSON.stringify(data));
            }
            return NextResponse.json(
                { error: data?.error?.message || 'خطا در ثبت کد تخفیف در Strapi' },
                { status: res.status }
            );
        }

        return NextResponse.json(data, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
