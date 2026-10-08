import Link from 'next/link';
import { getGatewayReviewAccess } from '@/lib/admin/gatewayReviewAccess';
import { isUserAdmin } from '@/lib/auth';
import AdminSidebar from '@/components/admin/Sidebar/AdminSidebar';
import { PermissionsProvider } from '@/context/PermissionsContext';
import { getAdminCurrentUserPermissions } from '@/lib/byeMoneyApi';
import styles from '@/app/admin/admin.module.scss';
import { ShieldAlert } from 'lucide-react';

export default async function FinancialReviewLayout({ children }) {
    const { session, status } = await getGatewayReviewAccess();
    if (status !== 200) {
        return (
            <main
                dir="rtl"
                style={{
                    minHeight: 'calc(100vh - 100px)',
                    marginTop: '100px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '2rem',
                    backgroundColor: 'var(--color-bg-primary)',
                    color: 'var(--color-card-text)',
                }}
            >
                <div
                    style={{
                        maxWidth: '480px',
                        width: '100%',
                        backgroundColor: 'rgba(0, 0, 0, 0.3)',
                        border: '1px solid rgba(246, 217, 130, 0.2)',
                        borderRadius: '16px',
                        padding: '2.5rem 2rem',
                        textAlign: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '1.25rem',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                    }}
                >
                    <div
                        style={{
                            width: '56px',
                            height: '56px',
                            borderRadius: '14px',
                            backgroundColor: 'rgba(255, 107, 107, 0.15)',
                            color: 'var(--color-error)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <ShieldAlert size={32} />
                    </div>
                    <p style={{ margin: 0, fontSize: 'var(--font-md)', lineHeight: 1.7 }}>
                        برای مشاهده پرونده‌ها، ورود و مجوز رسیدگی مالی بای‌مانی لازم است.
                    </p>
                    <Link
                        href="/"
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '0.65rem 1.75rem',
                            borderRadius: '8px',
                            background: 'linear-gradient(135deg, #ffd166, #f59e0b)',
                            color: '#061818',
                            fontWeight: 'bold',
                            textDecoration: 'none',
                            fontSize: 'var(--font-sm)',
                            boxShadow: '0 4px 12px rgba(245, 158, 11, 0.25)',
                        }}
                    >
                        بازگشت
                    </Link>
                </div>
            </main>
        );
    }

    const permissionsData = await getAdminCurrentUserPermissions({ jwt: session.user.jwt });

    return (
        <PermissionsProvider
            initialPermissions={permissionsData.permissions}
            initialRoles={permissionsData.roles}
            isLoaded={permissionsData.isLoaded}
        >
            <div className={styles.dashboard}>
                <AdminSidebar user={session.user} financialOnly={!isUserAdmin(session.user)} />
                <main className={styles.dashboard__main}>{children}</main>
            </div>
        </PermissionsProvider>
    );
}
