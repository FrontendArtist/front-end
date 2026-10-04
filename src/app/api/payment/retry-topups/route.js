import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({ code: 'GATEWAY_RECOVERY_MOVED_TO_STRAPI' }, { status: 410 });
}
