import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { STRAPI_API_URL } from '@/lib/api';

const validKey = key => typeof key === 'string' && /^(course|chapter|product):[1-9]\d*$/.test(key);

export async function POST(request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return Response.json({ message: 'ابتدا وارد حساب خود شوید.' }, { status: 401 });
    try {
        const { removedItemKey, remainingItemKeys } = await request.json();
        if (!validKey(removedItemKey) || !Array.isArray(remainingItemKeys) || remainingItemKeys.length > 500 || !remainingItemKeys.every(validKey)) {
            return Response.json({ message: 'اطلاعات حذف قلم از سبد نامعتبر است.' }, { status: 400 });
        }
        const response = await fetch(`${STRAPI_API_URL}/api/orders/cancel-abandoned`, {
            method: 'POST', headers: { Authorization: `Bearer ${process.env.STRAPI_API_TOKEN}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: { userId: Number(session.user.id), removedItemKey, remainingItemKeys } }),
            cache: 'no-store',
        });
        if (!response.ok) return Response.json({ message: 'حذف قلم و لغو سفارش انجام نشد؛ دوباره تلاش کنید.' }, { status: 502 });
        return Response.json(await response.json());
    } catch {
        return Response.json({ message: 'حذف قلم و لغو سفارش انجام نشد؛ دوباره تلاش کنید.' }, { status: 502 });
    }
}
