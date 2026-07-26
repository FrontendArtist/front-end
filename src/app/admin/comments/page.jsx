import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getAdminComments } from '@/lib/adminApi';
import CommentsManager from '@/components/admin/Comments/CommentsManager';

export const metadata = {
    title: 'مدیریت نظرات | پنل مدیریت',
};

export default async function AdminCommentsPage() {
    const session = await getServerSession(authOptions);
    const jwt = session?.user?.jwt;

    const { comments, error } = await getAdminComments(jwt, { pageSize: 200 });

    return (
        <div style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--color-title-hover)' }}>
                    مدیریت نظرات کاربران
                </h1>
            </div>

            {error ? (
                <div style={{ padding: '2rem', backgroundColor: 'color-mix(in srgb, var(--color-error) var(--op-12), transparent)', color: 'var(--color-error)', borderRadius: '8px', border: '1px solid var(--color-error-border)' }}>
                    خطا در دریافت لیست نظرات. لطفاً ارتباط با سرور را بررسی کرده و صفحه را مجدداً بارگذاری کنید.
                </div>
            ) : (
                <CommentsManager initialComments={comments} />
            )}
        </div>
    );
}
