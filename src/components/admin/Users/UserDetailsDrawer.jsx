'use client';

import { useState, useEffect } from 'react';
import styles from './Users.module.scss';
import UserCommentItem from './UserCommentItem';

export default function UserDetailsDrawer({ userId, onClose }) {
    const [activeTab, setActiveTab] = useState('info'); // 'info' | 'purchases' | 'comments'
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchDetails = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await fetch(`/api/admin/users/${userId}`);
                const data = await res.json();

                if (!res.ok) throw new Error(data.error || 'خطا در دریافت اطلاعات');

                setUser(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        if (userId) fetchDetails();
    }, [userId]);

    // Handle Comment Update Locally without fetching all details again
    const handleCommentUpdated = (commentId, changes) => {
        setUser(prev => ({
            ...prev,
            comments: prev.comments.map(c =>
                c.id === commentId ? { ...c, ...changes } : c
            )
        }));
    };

    const handleCommentDeleted = (commentId) => {
        setUser(prev => ({
            ...prev,
            comments: prev.comments.filter(c => c.id !== commentId)
        }));
    };

    return (
        <div className={styles.drawerBackdrop} onClick={onClose} role="dialog" aria-modal="true">
            <div className={styles.drawer} onClick={e => e.stopPropagation()}>
                <div className={styles.drawerHeader}>
                    <h2>پروفایل کاربر</h2>
                    <button onClick={onClose} aria-label="بستن">✕</button>
                </div>

                <div className={styles.tabs}>
                    <button
                        className={`${styles.tabBtn} ${activeTab === 'info' ? styles['tabBtn--active'] : ''}`}
                        onClick={() => setActiveTab('info')}
                    >
                        اطلاعات
                    </button>
                    <button
                        className={`${styles.tabBtn} ${activeTab === 'purchases' ? styles['tabBtn--active'] : ''}`}
                        onClick={() => setActiveTab('purchases')}
                    >
                        خریدها
                    </button>
                    <button
                        className={`${styles.tabBtn} ${activeTab === 'comments' ? styles['tabBtn--active'] : ''}`}
                        onClick={() => setActiveTab('comments')}
                    >
                        نظرات
                        {user?.comments?.length > 0 && ` (${user.comments.length})`}
                    </button>
                </div>

                <div className={styles.drawerContent}>
                    {loading && <div className={styles.loading}>در حال بارگذاری اطلاعات...</div>}

                    {error && <div style={{ color: 'var(--color-error)', textAlign: 'center' }}>⚠️ {error}</div>}

                    {!loading && !error && user && (
                        <>
                            {/* TAB: INFO */}
                            {activeTab === 'info' && (
                                <div className={styles.infoGrid}>
                                    <div className={styles.infoRow}>
                                        <span>نام کاربری:</span>
                                        <span>{user.username}</span>
                                    </div>
                                    <div className={styles.infoRow}>
                                        <span>ایمیل:</span>
                                        <span dir="ltr">{user.email}</span>
                                    </div>
                                    <div className={styles.infoRow}>
                                        <span>شماره موبایل:</span>
                                        <span>{user.phoneNumber}</span>
                                    </div>
                                    <div className={styles.infoRow}>
                                        <span>تاریخ عضویت:</span>
                                        <span>{new Intl.DateTimeFormat('fa-IR', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(user.createdAt))}</span>
                                    </div>
                                </div>
                            )}

                            {/* TAB: PURCHASES */}
                            {activeTab === 'purchases' && (
                                <div>
                                    <div className={styles.purchaseSection}>
                                        <h3>دوره‌های ثبت‌نام شده ({user.courses?.length || 0})</h3>
                                        {user.courses?.length > 0 ? (
                                            user.courses.map(c => (
                                                <div key={c.id} className={styles.card}>
                                                    <h4>{c.title}</h4>
                                                    <div className={styles.meta}>
                                                        <span>مبلغ: {new Intl.NumberFormat('fa-IR').format(c.price)} تومان</span>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className={styles.empty}>هیچ دوره‌ای ثبت‌نام نشده است.</div>
                                        )}
                                    </div>

                                    <div className={styles.purchaseSection}>
                                        <h3>سفارشات فروشگاه ({user.orders?.length || 0})</h3>
                                        {user.orders?.length > 0 ? (
                                            user.orders.map(o => (
                                                <div key={o.id} className={styles.card}>
                                                    <h4>سفارش #{o.id}</h4>
                                                    <div className={styles.meta}>
                                                        <span className={`${styles.badge} ${o.paymentStatus === 'paid' ? styles['badge--green'] : styles['badge--yellow']}`}>
                                                            {o.paymentStatus}
                                                        </span>
                                                        <span>{new Intl.NumberFormat('fa-IR').format(o.totalPrice)} تومان</span>
                                                    </div>
                                                    {o.items?.length > 0 && (
                                                        <div style={{ marginTop: '0.5rem', fontSize: 'var(--font-ssm)', color: 'var(--color-card-text)' }}>
                                                            {o.items.length} آیتم خریداری شده
                                                        </div>
                                                    )}
                                                </div>
                                            ))
                                        ) : (
                                            <div className={styles.empty}>هیچ سفارشی ثبت نشده است.</div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* TAB: COMMENTS */}
                            {activeTab === 'comments' && (
                                <div>
                                    {user.comments?.length > 0 ? (
                                        user.comments.map(comment => (
                                            <UserCommentItem
                                                key={comment.id}
                                                comment={comment}
                                                onUpdate={(changes) => handleCommentUpdated(comment.id, changes)}
                                                onDelete={() => handleCommentDeleted(comment.id)}
                                            />
                                        ))
                                    ) : (
                                        <div className={styles.purchaseSection}>
                                            <div className={styles.empty}>این کاربر هیچ نظری ثبت نکرده است.</div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
