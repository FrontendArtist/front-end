import { NextResponse } from 'next/server';
import { getPendingPhysicalRestocks } from '@/lib/byeMoneyApi';
import { getCancelSession, unauthorized } from '@/lib/physicalCancelRoute';

export async function GET() {
    const jwt = await getCancelSession({ admin: true });
    if (!jwt) return unauthorized();
    const result = await getPendingPhysicalRestocks({ jwt });
    if (result.success) return NextResponse.json({ success: true, data: result.data });
    return NextResponse.json({ success: false, error: result.error }, { status: result.forbidden ? 403 : 502 });
}
