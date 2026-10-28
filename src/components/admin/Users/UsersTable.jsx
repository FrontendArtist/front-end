'use client';

import { useState, useEffect, useMemo } from 'react';
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
import { getConversionRateWithByeMoney, getBatchBalancesWithByeMoney } from '@/lib/byeMoneyApi';
import Can from '@/components/admin/Permissions/Can';
import { ADMIN_PERMISSIONS } from '@/config/adminPermissions';
import AdminAssistedTopUpModal from './AdminAssistedTopUpModal/AdminAssistedTopUpModal';
import AdminNoorGiftModal from './AdminNoorGiftModal/AdminNoorGiftModal';
import CreateUserModal from './CreateUserModal/CreateUserModal';
import { UserPlus, Gift, X, AlertCircle, Eye, CreditCard } from 'lucide-react';
import styles from './Users.module.scss';

function LightCell({ user }) {
    const lightFormatted = new Intl.NumberFormat('fa-IR').format(user.light ?? 0);
    const hasGift =
        user.giftBalance !== undefined &&
        user.giftBalance !== null &&
        !Number.isNaN(Number(user.giftBalance)) &&
        Number(user.giftBalance) > 0;

    const giftFormatted =
        user.giftBalance !== undefined && user.giftBalance !== null && !Number.isNaN(Number(user.giftBalance))
            ? new Intl.NumberFormat('fa-IR').format(user.giftBalance)
            : '۰';

    return (
        <div className={styles.lightCellWrap}>
            <div className={styles.lightRow}>
                <span className={styles.lightLabel}>عادی:</span>
                <span className={styles.lightValue}>{lightFormatted}</span>
            </div>
            <div className={`${styles.giftRow} ${hasGift ? styles['giftRow--active'] : styles['giftRow--empty']}`}>
                <span className={styles.giftLabel}>هدیه:</span>
                <span className={styles.giftValue}>
                    {hasGift && <Gift size={12} className={styles.giftIcon} />}
                    {giftFormatted}
                </span>
            </div>
        </div>
    );
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
    const [roleFilter, setRoleFilter] = useState('all');
    const [selectedUserId, setSelectedUserId] = useState(null);
    const [assistedTopUpUser, setAssistedTopUpUser] = useState(null);
    const [conversionRate, setConversionRate] = useState(null);
    const [showCreateUserModal, setShowCreateUserModal] = useState(false);

    // مدیریت انتخاب چندگانه و هدیه نور
    const [selectedDocIds, setSelectedDocIds] = useState(new Set());
    const [showGiftModal, setShowGiftModal] = useState(false);
    const [giftModalUsers, setGiftModalUsers] = useState([]);
    const [refreshNotice, setRefreshNotice] = useState(null);

    // پاک‌سازی خودکار پیام اعلان بعد از ۴ ثانیه
    useEffect(() => {
        if (!refreshNotice) return;
        const timer = setTimeout(() => {
            setRefreshNotice(null);
        }, 4000);
        return () => clearTimeout(timer);
    }, [refreshNotice]);

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
        const query = searchQuery.trim().toLowerCase();
        const matchesSearch =
            !query ||
            (u.username && u.username.toLowerCase().includes(query)) ||
            (u.phoneNumber && u.phoneNumber.includes(query)) ||
            (u.firstName && u.firstName.toLowerCase().includes(query)) ||
            (u.lastName && u.lastName.toLowerCase().includes(query));

        if (!matchesSearch) return false;

        if (roleFilter === 'user') {
            const r = String(u.role || '').toLowerCase();
            return r.includes('auth') || r.includes('user') || r.includes('عادی');
        }
        if (roleFilter === 'admin') {
            const r = String(u.role || '').toLowerCase();
            return r.includes('admin') || r.includes('مدیر');
        }
        return true;
    });

    // کاربرانی که در دید فعلی دارای documentId معتبر هستند
    const eligibleUsersInPage = useMemo(
        () => filteredUsers.filter((u) => Boolean(u.documentId)),
        [filteredUsers]
    );

    const isAllCurrentPageSelected =
        eligibleUsersInPage.length > 0 &&
        eligibleUsersInPage.every((u) => selectedDocIds.has(u.documentId));

    const handleToggleSelectAll = () => {
        setSelectedDocIds((prev) => {
            const next = new Set(prev);
            if (isAllCurrentPageSelected) {
                eligibleUsersInPage.forEach((u) => next.delete(u.documentId));
            } else {
                eligibleUsersInPage.forEach((u) => next.add(u.documentId));
            }
            return next;
        });
    };

    const handleToggleUser = (docId) => {
        if (!docId) return;
        setSelectedDocIds((prev) => {
            const next = new Set(prev);
            if (next.has(docId)) {
                next.delete(docId);
            } else {
                next.add(docId);
            }
            return next;
        });
    };

    const handleClearSelection = () => {
        setSelectedDocIds(new Set());
    };

    const handleOpenBulkGiftModal = () => {
        const selected = usersList.filter((u) => selectedDocIds.has(u.documentId));
        if (selected.length === 0) {
            setRefreshNotice('هیچ کاربری برای دریافت هدیه انتخاب نشده است. لطفاً ابتدا کاربر(ان) مورد نظر را انتخاب کنید.');
            return;
        }
        setRefreshNotice(null);
        setGiftModalUsers(selected);
        setShowGiftModal(true);
    };

    const handleOpenSingleGiftModal = (user) => {
        setGiftModalUsers([user]);
        setShowGiftModal(true);
    };

    // بازخوانی دسته‌جمعی موجودی‌ها پس از موفقیت ثبت هدیه
    const refreshAllBalances = async () => {
        const jwt = session?.user?.jwt;
        if (!jwt) return;

        const userIds = usersList.map((u) => u.documentId).filter(Boolean);
        if (userIds.length === 0) return;

        try {
            const batchRes = await getBatchBalancesWithByeMoney({ userIds, jwt });
            if (batchRes.success) {
                setUsersList((prev) =>
                    prev.map((u) => {
                        const updated = { ...u };
                        if (batchRes.balances && batchRes.balances[u.documentId] !== undefined) {
                            updated.light = Number(batchRes.balances[u.documentId]);
                        }
                        if (batchRes.giftBalances) {
                            const gb = batchRes.giftBalances[u.documentId];
                            updated.giftBalance = gb !== null && gb !== undefined ? Number(gb) : null;
                        }
                        return updated;
                    })
                );
                setRefreshNotice(null);
            } else {
                setRefreshNotice('به‌روزرسانی خودکار موجودی‌ها با خطا مواجه شد. لطفاً صفحه را تازه‌سازی کنید.');
            }
        } catch (err) {
            setRefreshNotice('خطا در به‌روزرسانی خودکار موجودی‌ها پس از ثبت هدیه.');
        }
    };

    const headers = [
        <input
            key="select-all"
            type="checkbox"
            className={styles.checkboxInput}
            aria-label="انتخاب تمام کاربران این صفحه"
            checked={isAllCurrentPageSelected}
            onChange={handleToggleSelectAll}
            disabled={eligibleUsersInPage.length === 0}
        />,
        'شماره',
        'نام',
        'شماره موبایل',
        'نقش',
        'موجودی نور (عادی / هدیه)',
        'تاریخ عضویت',
        'عملیات'
    ];

    return (
        <AdminTableContainer>
            {refreshNotice && (
                <div className={styles.refreshNotice}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <AlertCircle size={16} style={{ flexShrink: 0 }} />
                        <span>{refreshNotice}</span>
                    </div>
                    <button
                        type="button"
                        onClick={() => setRefreshNotice(null)}
                        style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                        aria-label="بستن اعلان"
                    >
                        <X size={14} />
                    </button>
                </div>
            )}

            <AdminToolbar>
                <AdminSearch
                    placeholder="جستجو (نام، موبایل)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onClear={() => setSearchQuery('')}
                />
                <select
                    className={styles.roleFilterSelect}
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    aria-label="فیلتر بر اساس نقش"
                >
                    <option value="all">همه نقش‌ها</option>
                    <option value="user">کاربر عادی</option>
                    <option value="admin">مدیر سیستم</option>
                </select>
                <span style={{ fontSize: 'var(--font-sm)', color: 'var(--color-text-secondary)', marginRight: 'auto' }}>
                    نمایش {new Intl.NumberFormat('fa-IR').format(filteredUsers.length)} از {new Intl.NumberFormat('fa-IR').format(totalUsers || filteredUsers.length)} کاربر
                </span>

                {selectedDocIds.size > 0 && (
                    <AdminButton
                        variant="default"
                        onClick={handleClearSelection}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        title="لغو انتخاب تمام کاربران"
                    >
                        <X size={14} />
                        لغو انتخاب ({new Intl.NumberFormat('fa-IR').format(selectedDocIds.size)})
                    </AdminButton>
                )}

                <Can permission={ADMIN_PERMISSIONS.NOOR_GIFT}>
                    <AdminButton
                        variant="secondary"
                        onClick={handleOpenBulkGiftModal}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                        title="ثبت هدیه نور گروهی"
                    >
                        <Gift size={16} />
                        اهدای نور گروهی {selectedDocIds.size > 0 ? `(${new Intl.NumberFormat('fa-IR').format(selectedDocIds.size)})` : ''}
                    </AdminButton>
                </Can>

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
                            <td className={styles.checkboxCol}>
                                <input
                                    type="checkbox"
                                    className={styles.checkboxInput}
                                    aria-label={`انتخاب ${user.username}`}
                                    checked={Boolean(user.documentId && selectedDocIds.has(user.documentId))}
                                    disabled={!user.documentId}
                                    onChange={() => handleToggleUser(user.documentId)}
                                />
                            </td>
                            <td>{index + 1}</td>
                            <td>
                                <div className={styles.usernameText}>
                                    {[user.firstName, user.lastName].filter(Boolean).join(' ') || user.username || '—'}
                                </div>
                                {Boolean(user.firstName || user.lastName) && user.username && user.username !== user.phoneNumber && (
                                    <div className={styles.userFullNameText} style={{ direction: 'ltr', textAlign: 'right' }}>
                                        @{user.username}
                                    </div>
                                )}
                            </td>
                            <td>{user.phoneNumber}</td>
                            <td>
                                <AdminBadge status={user.role} />
                            </td>
                            <td>
                                <LightCell user={user} />
                            </td>
                            <td>{new Intl.DateTimeFormat('fa-IR').format(new Date(user.createdAt))}</td>
                            <td>
                                <div className={styles.actionBtnsWrap}>
                                    <AdminButton
                                        onClick={() => setSelectedUserId(user.id)}
                                        variant="default"
                                        title="مشاهده پروفایل کاربر"
                                        className={styles.compactBtn}
                                    >
                                        <Eye size={14} />
                                        مشاهده
                                    </AdminButton>
                                    <Can permission={ADMIN_PERMISSIONS.NOOR_GIFT}>
                                        <AdminButton
                                            onClick={() => handleOpenSingleGiftModal(user)}
                                            variant="default"
                                            title="ثبت هدیه نور برای این کاربر"
                                            className={styles.compactBtn}
                                            disabled={!user.documentId}
                                        >
                                            <Gift size={14} />
                                            هدیه نور
                                        </AdminButton>
                                    </Can>
                                    <Can permission={ADMIN_PERMISSIONS.TOPUP_REVIEW}>
                                        <AdminButton
                                            onClick={() => setAssistedTopUpUser(user)}
                                            variant="edit"
                                            title="ثبت شارژ کارت‌به‌کارت به‌نیابت از کاربر"
                                            className={styles.compactBtn}
                                        >
                                            <CreditCard size={14} />
                                            شارژ حساب
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

            {showGiftModal && (
                <AdminNoorGiftModal
                    users={giftModalUsers}
                    onClose={() => {
                        setShowGiftModal(false);
                        setGiftModalUsers([]);
                    }}
                    onSuccess={async () => {
                        await refreshAllBalances();
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
