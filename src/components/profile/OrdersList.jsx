'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import GradientBorderCard from '@/components/ui/GradientBorderCard/GradientBorderCard';
import { useOrdersStore } from '@/store/useOrdersStore';
import OrderDetailsModal from './OrderDetailsModal';
import styles from './OrdersList.module.scss';

export default function OrdersList({ limit }) {
    const { orders, isLoading, error, fetchOrders, hasFetched } = useOrdersStore();
    const [activeOrder, setActiveOrder] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        fetchOrders(true);
    }, [fetchOrders]);

    const handleViewDetails = (order) => {
        setActiveOrder(order);
        setIsModalOpen(true);
    };

    const formatPrice = (price) => {
        return Number(price || 0).toLocaleString('fa-IR');
    };

    const formatDate = (dateString) => {
        if (!dateString) return '—';
        return new Intl.DateTimeFormat('fa-IR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }).format(new Date(dateString));
    };

    const StatusBadge = ({ status }) => {
        const normalizedStatus = status?.trim();
        const map = {
            paid:    { label: 'پرداخت شده',       cls: styles.orders__badgeSuccess },
            pending: { label: 'در انتظار پرداخت', cls: styles.orders__badgeWarning },
            failed:  { label: 'ناموفق',            cls: styles.orders__badgeDanger  },
        };
        const { label, cls } = map[normalizedStatus] ?? { label: status || 'نامشخص', cls: styles.orders__badgeDefault };
        return <span className={`${styles.orders__badge} ${cls}`}>{label}</span>;
    };

    if (isLoading) {
        return (
            <div className={styles.orders__loading}>
                <div className={styles.orders__spinner}></div>
                <p>در حال دریافت تاریخچه سفارشات...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.orders__error}>
                <p>{error}</p>
            </div>
        );
    }

    const displayedOrders = limit ? orders.slice(0, limit) : orders;

    if (!displayedOrders || displayedOrders.length === 0) {
        return (
            <div className={styles.orders__empty}>
                <div className={styles.orders__emptyIcon}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="9" cy="21" r="1" />
                        <circle cx="20" cy="21" r="1" />
                        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                    </svg>
                </div>
                <h2 className={styles.orders__emptyTitle}>سفارشی ثبت نشده است</h2>
                <p className={styles.orders__emptyDesc}>شما تاکنون هیچ دوره‌ای ثبت نام نکرده‌اید یا سفارشی نداشته‌اید.</p>
                <Link href="/courses" className={styles.orders__shopBtn}>
                    مشاهده دوره‌ها
                </Link>
            </div>
        );
    }

    return (
        <div className={styles.orders}>
            <h2 className={styles.orders__title}>
                {limit ? 'سفارش‌های اخیر' : 'تاریخچه سفارشات'}
            </h2>
            
            <div className={styles.orders__list}>
                {displayedOrders.map((orderData) => {
                    // depending on strapi version, the order data might be flat or nested under attributes
                    const order = orderData.attributes || orderData;
                    const id = orderData.id;
                    const items = Array.isArray(order.items) ? order.items : [];
                    
                    return (
                        <GradientBorderCard key={id} className={styles.orders__cardWrapper} contentClassName={styles.orders__card} enableHover={false}>
                            <div className={styles.orders__header}>
                                <div className={styles.orders__headerInfo}>
                                    <span className={styles.orders__id}>سفارش #{id}</span>
                                    <span className={styles.orders__date}>{formatDate(order.createdAt)}</span>
                                </div>
                                <StatusBadge status={order.orderStatus} />
                            </div>
                            
                            <div className={styles.orders__details}>
                                <div className={styles.orders__detailItem}>
                                    <span className={styles.orders__label}>مبلغ کل:</span>
                                    <span className={styles.orders__value}>{formatPrice(order.totalPrice)} تومان</span>
                                </div>
                                <div className={styles.orders__detailItem}>
                                    <span className={styles.orders__label}>تعداد اقلام:</span>
                                    <span className={styles.orders__value}>{items.length} آیتم</span>
                                </div>
                                
                                <button 
                                    className={styles.orders__viewBtn}
                                    onClick={() => handleViewDetails(order)}
                                    aria-label={`مشاهده جزئیات سفارش ${id}`}
                                >
                                    مشاهده جزئیات
                                </button>
                            </div>
                        </GradientBorderCard>
                    );
                })}
            </div>

            <OrderDetailsModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)}
                order={activeOrder}
            />
        </div>
    );
}
