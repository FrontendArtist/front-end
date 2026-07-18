import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getContactMessages } from '@/lib/adminApi';
import MessagesTable from '@/components/admin/Messages/MessagesTable';

export const metadata = {
    title: 'پیام‌های تماس | پنل مدیریت',
};

export default async function AdminContactMessagesPage() {
    const session = await getServerSession(authOptions);
    const jwt = session?.user?.jwt;

    // Fetch initial contact message records (up to 100 for client-side pagination to start query,
    // matches other tables page sizes/limit options)
    const { messages, error } = await getContactMessages(jwt, { pageSize: 150 });

    return (
        <div style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--color-title-primary)', fontFamily: 'var(--font-lalezar)' }}>مدیریت پیام‌های تماس</h1>
            </div>

            {error ? (
                <div style={{ padding: '2rem', backgroundColor: 'color-mix(in srgb, var(--color-error) var(--op-12), transparent)', color: 'var(--color-error)', borderRadius: '8px', border: '1px solid var(--color-error-border)' }}>
                    خطا در دریافت لیست پیام‌های تماس. لطفاً ارتباط با سرور را بررسی کرده و صفحه را مجدداً بارگذاری کنید.
                </div>
            ) : (
                <MessagesTable initialMessages={messages} />
            )}
        </div>
    );
}
