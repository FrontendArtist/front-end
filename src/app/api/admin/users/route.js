import { getServerSession } from 'next-auth/next';
import { authOptions, isUserAdmin } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { getUsers } from '@/lib/admin/adminUsersApi';

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

export async function GET(request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.jwt || !isUserAdmin(session.user)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startParam = searchParams.get('start');
    const limitParam = searchParams.get('limit');
    const page = searchParams.get('page');
    const pageSize = searchParams.get('pageSize');

    try {
        const options = {};
        if (startParam !== null) {
            options.start = parseInt(startParam, 10) || 0;
            options.limit = parseInt(limitParam, 10) || 20;
        } else if (page !== null) {
            options.page = parseInt(page, 10) || 1;
            options.pageSize = parseInt(pageSize, 10) || 50;
        } else {
            options.start = 0;
            options.limit = 20;
        }

        const { users, meta, error } = await getUsers(session.user.jwt, options);

        if (error) {
            return NextResponse.json({ error: 'خطا در دریافت لیست کاربران' }, { status: 500 });
        }

        return NextResponse.json({
            data: users,
            meta,
        });
    } catch (error) {
        console.error('❌ GET /api/admin/users Exception:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

export async function POST(request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.jwt || !isUserAdmin(session.user)) {
        return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { phoneNumber, firstName, lastName, email, username, password } = body;

        const cleanPhone = normalizePhoneNumber(phoneNumber);
        if (!cleanPhone || cleanPhone.length < 10) {
            return NextResponse.json({ error: 'شماره موبایل نامعتبر است (حداقل ۱۰ رقم).' }, { status: 400 });
        }

        const tokenToUse = process.env.STRAPI_API_TOKEN || session.user.jwt;
        const STRAPI_BASE_URL = process.env.NEXT_PUBLIC_STRAPI_API_URL || 'http://localhost:1337';

        // بررسی یکتایی شماره موبایل در سامانه
        const checkRes = await fetch(`${STRAPI_BASE_URL}/api/users?filters[phoneNumber][$eq]=${encodeURIComponent(cleanPhone)}`, {
            headers: { Authorization: `Bearer ${tokenToUse}` },
            cache: 'no-store',
        });

        if (checkRes.ok) {
            const existingUsers = await checkRes.json();
            const list = Array.isArray(existingUsers) ? existingUsers : (existingUsers.data || []);
            if (list.length > 0) {
                return NextResponse.json({ error: 'کاربری با این شماره موبایل قبلاً در سیستم ثبت شده است.' }, { status: 409 });
            }
        }

        const userEmail = email?.trim() || `${cleanPhone}@tarhelahi.com`;
        const userUsername = username?.trim() || cleanPhone;
        const userPassword = password?.trim() || `P@ss${Math.random().toString(36).slice(-6)}!1`;

        const createRes = await fetch(`${STRAPI_BASE_URL}/api/users`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${tokenToUse}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username: userUsername,
                phoneNumber: cleanPhone,
                firstName: (firstName || '').trim(),
                lastName: (lastName || '').trim(),
                email: userEmail,
                confirmed: true,
                isMobileVerified: true,
                role: 1, // Authenticated role ID
                password: userPassword,
            }),
        });

        if (!createRes.ok) {
            const errData = await createRes.json().catch(() => ({}));
            const msg = errData?.error?.message || 'خطا در ساخت حساب کاربری';
            return NextResponse.json({ error: msg }, { status: createRes.status || 400 });
        }

        const created = await createRes.json();
        const newUser = {
            id: created.id,
            documentId: created.documentId || String(created.id),
            username: created.username,
            firstName: created.firstName || '',
            lastName: created.lastName || '',
            email: created.email || '—',
            phoneNumber: created.phoneNumber || '—',
            role: 'کاربر تایید شده',
            light: 0,
            createdAt: created.createdAt || new Date().toISOString(),
        };

        return NextResponse.json({
            success: true,
            user: newUser,
            message: 'کاربر جدید با موفقیت ایجاد شد.',
        }, { status: 201 });

    } catch (err) {
        console.error('❌ POST /api/admin/users Exception:', err);
        return NextResponse.json({ error: 'خطای غیرمنتظره در سرور' }, { status: 500 });
    }
}
