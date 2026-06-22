import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getUsers } from '@/lib/adminApi';
import UsersTable from '@/components/admin/Users/UsersTable';

export const metadata = {
    title: 'مدیریت کاربران | پنل مدیریت',
};

export default async function AdminUsersPage() {
    const session = await getServerSession(authOptions);
    const jwt = session?.user?.jwt;

    // ── واکشی اولیه کاربران ──────────────────────────────────────────
    const { users, meta, error } = await getUsers(jwt, { pageSize: 50 });

    return (
        <div style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>مدیریت کاربران</h1>
            </div>

            {error ? (
                <div style={{ padding: '2rem', backgroundColor: '#fee2e2', color: '#b91c1c', borderRadius: '8px' }}>
                    خطا در دریافت لیست کاربران. لطفاً دوباره تلاش کنید.
                </div>
            ) : (
                <UsersTable initialUsers={users} />
            )}
        </div>
    );
}
