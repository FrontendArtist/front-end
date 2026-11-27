import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { resolveRevalidateTags } from '@/lib/cacheTags';
import { invalidateCacheTags } from '@/lib/revalidateCache';

function isValidSecret(provided, expected) {
  if (!provided || !expected) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/**
 * POST /api/revalidate
 * Webhook برای بازسازی آنی کش صفحات و داده‌های عمومی پس از تغییر محتوا در Strapi.
 * هدر `x-revalidate-secret` یا `Authorization: Bearer <secret>` الزامی است.
 */
export async function POST(request) {
  const expectedSecret = (process.env.REVALIDATE_SECRET || process.env.STRAPI_WEBHOOK_SECRET || '').trim();
  if (!expectedSecret) {
    return NextResponse.json({ error: 'Revalidation webhook is not configured' }, { status: 503 });
  }

  const headerSecret = request.headers.get('x-revalidate-secret')?.trim() || '';
  const authHeader = request.headers.get('authorization')?.trim() || '';
  const bearerSecret = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : '';
  const providedSecret = headerSecret || bearerSecret;

  if (!isValidSecret(providedSecret, expectedSecret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const tags = resolveRevalidateTags({
    model: body?.model || body?.uid?.split?.('.')?.pop?.(),
    tags: body?.tags,
  });

  if (tags.length === 0) {
    return NextResponse.json({ revalidated: false, tags: [], message: 'No matching cache tags' }, { status: 200 });
  }

  invalidateCacheTags(tags);
  return NextResponse.json({ revalidated: true, tags });
}
