/**
 * @file src/app/admin/orders/new/page.jsx
 * @description صفحه اختصاصی ثبت دستی سفارش، ساخت یا انتخاب کاربر، پیوست فیش و فعال‌سازی دوره – Server Component
 */

import { getServerSession } from 'next-auth/next';
import { authOptions, isUserAdmin } from '@/lib/auth';
import { redirect } from 'next/navigation';
import ManualOrderForm from '@/components/admin/Orders/ManualOrderForm/ManualOrderForm';
import styles from '../orders.module.scss';

const STRAPI_BASE_URL = process.env.NEXT_PUBLIC_STRAPI_API_URL || 'http://localhost:1337';
const STRAPI_TOKEN = process.env.STRAPI_API_TOKEN;

export const metadata = {
    title: 'ثبت دستی سفارش و فعال‌سازی دوره | پنل ادمین',
    description: 'ثبت سفارش جدید همراه با ایجاد کاربر، تخصیص دوره و پیوست فیش بانکی',
    robots: { index: false, follow: false },
};

async function getPublishedCourses(jwt) {
    try {
        const token = STRAPI_TOKEN || jwt;
        const res = await fetch(
            `${STRAPI_BASE_URL}/api/courses?populate[chapters]=true&status=published&pagination[limit]=200&sort=title:asc`,
            {
                headers: { Authorization: `Bearer ${token}` },
                cache: 'no-store',
            }
        );
        if (!res.ok) return [];
        const json = await res.json();
        const list = Array.isArray(json) ? json : (json.data || []);

        return list.map(item => {
            const attrs = item.attributes || item;
            return {
                id: item.id,
                documentId: item.documentId || String(item.id),
                title: attrs.title || '',
                slug: attrs.slug || '',
                price: attrs.price ?? 0,
                isFree: attrs.isFree ?? false,
                isChaptered: attrs.isChaptered ?? false,
                chapters: Array.isArray(attrs.chapters)
                    ? attrs.chapters.map(ch => ({
                        id: ch.id,
                        title: ch.title || '',
                        price: ch.price ?? attrs.price ?? 0,
                    }))
                    : [],
            };
        });
    } catch (err) {
        console.error('[NewManualOrderPage] Error loading courses:', err);
        return [];
    }
}

export default async function NewManualOrderPage() {
    const session = await getServerSession(authOptions);

    if (!session?.user || !isUserAdmin(session.user)) {
        redirect('/');
    }

    const courses = await getPublishedCourses(session.user.jwt);

    return (
        <div className={styles.page}>
            <ManualOrderForm initialCourses={courses} />
        </div>
    );
}
