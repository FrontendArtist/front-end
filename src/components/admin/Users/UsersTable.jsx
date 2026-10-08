'use client';

import { useState, useEffect } from 'react';
import UserDetailsDrawer from './UserDetailsDrawer';
import AdminSearch from '../Shared/AdminSearch';
import { AdminTableContainer, AdminTable, AdminToolbar } from '../Shared/AdminTable';
import AdminBadge from '../Shared/AdminBadge';
import AdminButton from '../Shared/AdminButton';
import AdminLazyLoad from '../Shared/AdminLazyLoad';
import { useAdminLazyLoad } from '../Shared/useAdminLazyLoad';
import { fetchAdminUsers } from '@/lib/client/admin/usersClient';
import { triggerLightUpdate } from '@/store/useLightStore';
import { useSession } from 'next-auth/react';
import { getConversionRateWithByeMoney } from '@/lib/byeMoneyApi';
import Can from '@/components/admin/Permissions/Can';
import { ADMIN_PERMISSIONS } from '@/config/adminPermissions';
import AdminAssistedTopUpModal from './AdminAssistedTopUpModal/AdminAssistedTopUpModal';
import CreateUserModal from './CreateUserModal/CreateUserModal';
import { UserPlus } from 'lucide-react';
import styles from './Users.module.scss';

function LightCell({ user }) {
    return <span className={styles.lightValue}>{new Intl.NumberFormat('fa-IR').format(user.light ?? 0)}</span>;
}

export default function UsersTable({ initialUsers = [], initialMeta = null }) {
    // ── Lazy Loading State ───────────────────────────────────────────────────
    const {
        items: usersList,
        setItems: setUsersList,
        total: totalUsers,
        hasMore,
        isLoading: isLoadingMore,
        loadError,
        loadMore: loadMoreUsers,
        sentinelRef,
    } = useAdminLazyLoad({
        initialItems: initialUsers,
        initialMeta,
        fetchFn: fetchAdminUsers,
        chunkSize: 20,
        idKey: 'id',
    });

    const { data: session } = useSession();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedUserId, setSelectedUserId] = useState(null);
    const [assistedTopUpUser, setAssistedTopUpUser] = useState(null);
    const [conversionRate, setConversionRate] = useState(null);
    const [showCreateUserModal, setShowCreateUserModal] = useState(false);

    // پیش‌بارگذاری نرخ رسمی تبدیل از دیتابیس بای‌مانی جهت استفاده در مودال شارژ
    useEffect(() => {
        const jwt = session?.user?.jwt;
        if (!jwt) return;

        let isMounted = true;

        getConversionRateWithByeMoney({ jwt })
            .then((res) => {
                if (isMounted && res.success && res.rialPerNoor > 0) {
                    setConversionRate(res.rialPerNoor);
                }
            })
            .catch(() => {});

        return () => {
            isMounted = false;
        };
    }, [session?.user?.jwt]);

    const handleSingleLightUpdated = (userId, newLight) => {
        setUsersList(prev => prev.map(u => u.id === userId ? { ...u, light: newLight } : u));
    };


    const filteredUsers = usersList.filter((u) => {
        const query = searchQuery.toLowerCase();
        return (
            (u.username && u.username.toLowerCase().includes(query)) ||
            (u.email && u.email.toLowerCase().includes(query)) ||
            (u.phoneNumber && u.phoneNumber.includes(query))
        );
    });

    const headers = [
        'شماره',
        'نام کاربری',
        'ایمیل',
        'شماره موبایل',
        'نقش',
        'نور ★',
        'تاریخ عضویت',
        'عملیات'
    ];

    return (
        <AdminTableContainer>
            <AdminToolbar>
                <AdminSearch
                    placeholder="جستجو (نام، ایمیل، موبایل)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
                <span style={{ fontSize: 'var(--font-sm)', color: 'var(--color-text-secondary)', marginRight: 'auto' }}>
                    نمایش {new Intl.NumberFormat('fa-IR').format(filteredUsers.length)} از {new Intl.NumberFormat('fa-IR').format(totalUsers || filteredUsers.length)} کاربر
                </span>
                <AdminButton
                    variant="primary"
                    onClick={() => setShowCreateUserModal(true)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                    <UserPlus size={16} />
                    افزودن کاربر جدید
                </AdminButton>
            </AdminToolbar>

            <AdminTable headers={headers}>
                {filteredUsers.length > 0 ? (
                    filteredUsers.map((user, index) => (
                        <tr key={user.documentId || user.id}>
                            <td>{index + 1}</td>
                            <td>
                                <div className={styles.usernameText}>
                                    {user.username}
                                </div>
                                {(user.firstName || user.lastName) && (
                                    <div className={styles.userFullNameText}>
                                        {user.firstName} {user.lastName}
                                    </div>
                                )}
                            </td>
                            <td className={styles.emailCell}>{user.email}</td>
                            <td>{user.phoneNumber}</td>
                            <td>
                                <AdminBadge status={user.role} />
                            </td>
                            <td>
                                <LightCell user={user} />
                            </td>
                            <td>{new Intl.DateTimeFormat('fa-IR').format(new Date(user.createdAt))}</td>
                            <td>
                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                    <AdminButton
                                        onClick={() => setSelectedUserId(user.id)}
                                        variant="default"
                                    >
                                        مشاهده پروفایل
                                    </AdminButton>
                                    <Can permission={ADMIN_PERMISSIONS.TOPUP_REVIEW}>
                                        <AdminButton
                                            onClick={() => setAssistedTopUpUser(user)}
                                            variant="edit"
                                            title="ثبت شارژ کارت‌به‌کارت به‌نیابت از کاربر"
                                        >
                                            افزایش شارژ کارت به کارت
                                        </AdminButton>
                                    </Can>
                                </div>
                            </td>
                        </tr>
                    ))
                ) : (
                    <tr>
                        <td colSpan="8" className={styles.emptyTableCell}>
                            کاربری یافت نشد.
                        </td>
                    </tr>
                )}
            </AdminTable>

            {/* ── Lazy Load Sentinel & Load More Button ───────────────── */}
            <AdminLazyLoad
                sentinelRef={sentinelRef}
                hasMore={hasMore}
                isLoading={isLoadingMore}
                error={loadError}
                onLoadMore={loadMoreUsers}
                currentCount={usersList.length}
                totalCount={totalUsers}
                itemLabel="کاربر"
            />

            {selectedUserId && (
                <UserDetailsDrawer
                    userId={selectedUserId}
                    onClose={() => setSelectedUserId(null)}
                />
            )}

            {assistedTopUpUser && (
                <AdminAssistedTopUpModal
                    user={assistedTopUpUser}
                    conversionRate={conversionRate}
                    onClose={() => setAssistedTopUpUser(null)}
                    onSuccess={({ user: targetUser, amountNoor }) => {
                        const currentLight = Number(targetUser.light ?? 0);
                        const added = Number(amountNoor);
                        handleSingleLightUpdated(targetUser.id, currentLight + added);
                        triggerLightUpdate();
                    }}
                />
            )}

            {showCreateUserModal && (
                <CreateUserModal
                    onClose={() => setShowCreateUserModal(false)}
                    onSuccess={(newUser) => {
                        setUsersList(prev => [newUser, ...prev]);
                    }}
                />
            )}
        </AdminTableContainer>
    );
}
