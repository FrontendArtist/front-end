import { NextResponse } from 'next/server';
import { API_BASE_URL } from '@/lib/api';
import { CACHE_TAGS } from '@/lib/cacheTags';

export const revalidate = 3600;

/**
 * GET /api/courses/catalog-lite
 * فهرست سبک دوره‌ها (فقط شناسه، اسلاگ، عنوان و فصل‌ها بدون دروس/متن/رسانه)
 * برای نگاشت عنوان خریدهای فصلی در پروفایل و صفحه نتیجه پرداخت.
 */
export async function GET() {
  try {
    const query = new URLSearchParams({
      status: 'published',
      'fields[0]': 'id',
      'fields[1]': 'documentId',
      'fields[2]': 'slug',
      'fields[3]': 'title',
      'populate[chapters][fields][0]': 'id',
      'populate[chapters][fields][1]': 'integrationId',
      'populate[chapters][fields][2]': 'title',
      'pagination[pageSize]': '200',
    });

    const response = await fetch(`${API_BASE_URL}/api/courses?${query.toString()}`, {
      headers: { 'Content-Type': 'application/json' },
      next: { revalidate: 3600, tags: [CACHE_TAGS.courses] },
    });

    if (!response.ok) {
      return NextResponse.json({ data: [] }, { status: response.status });
    }

    const json = await response.json();
    const rawList = Array.isArray(json?.data) ? json.data : [];

    const data = rawList.map((raw) => {
      const item = raw?.attributes ? { id: raw.id, documentId: raw.documentId, ...raw.attributes } : raw;
      const chapters = Array.isArray(item?.chapters) ? item.chapters : [];
      return {
        id: item?.id,
        documentId: item?.documentId || null,
        slug: item?.slug || '',
        title: item?.title || '',
        chapters: chapters.map((ch) => ({
          id: ch?.id,
          integrationId: ch?.integrationId || null,
          title: ch?.title || '',
        })),
      };
    });

    return NextResponse.json({ data });
  } catch (error) {
    console.error('[GET /api/courses/catalog-lite] Error:', error?.message || error);
    return NextResponse.json({ data: [] }, { status: 500 });
  }
}
