import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { STRAPI_API_URL } from '@/lib/api';
import { isOrderPaid } from '@/lib/constants/orderConstants';
import { recoverOrderItems } from '@/lib/recoverOrderItems';

export async function POST(request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return Response.json({ message: 'ابتدا وارد حساب خود شوید.' }, { status: 401 });
    try {
        const { orderId } = await request.json();
        if (typeof orderId !== 'string' || !orderId || orderId.length > 100) return Response.json({ message: 'شناسه سفارش نامعتبر است.' }, { status: 400 });
        const read = async (path) => {
            const response = await fetch(`${STRAPI_API_URL}${path}`, {
                headers: { Authorization: `Bearer ${process.env.STRAPI_API_TOKEN}` }, cache: 'no-store',
            });
            if (!response.ok) throw new Error('دریافت اطلاعات روز با خطا مواجه شد؛ دوباره تلاش کنید.');
            return response.json();
        };
        const query = new URLSearchParams({ 'filters[documentId][$eq]': orderId,
            'filters[user][id][$eq]': String(session.user.id), 'populate': '*' });
        const order = (await read(`/api/orders?${query}`)).data?.[0];
        if (!order) return Response.json({ message: 'سفارش یافت نشد.' }, { status: 404 });
        const attrs = order.attributes || order;
        if (isOrderPaid(order) || attrs.paymentMethod !== 'online') return Response.json({ message: 'این سفارش قابل انتقال نیست.' }, { status: 409 });
        return Response.json(await recoverOrderItems(attrs.items || [], session.user, read));
    } catch {
        return Response.json({ message: 'دریافت اطلاعات روز با خطا مواجه شد؛ دوباره تلاش کنید.' }, { status: 502 });
    }
}
