import { NextResponse } from 'next/server';

export async function POST() {
    return NextResponse.json({
        success: false,
        code: 'LEGACY_LIGHT_DISABLED',
        error: 'تغییر مستقیم موجودی نور غیرفعال است. از مسیر رسمی شارژ بای‌مانی استفاده کنید.',
    }, { status: 410 });
}
