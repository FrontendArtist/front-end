'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useOrdersStore } from '@/store/useOrdersStore';

const STORAGE_PREFIX = 'khak_read_notifications_';

export function useOrderNotifications() {
    const { data: session, status } = useSession();
    const userId = session?.user?.id;
    const { orders, isLoading, fetchOrders, hasFetched } = useOrdersStore();
    const [readIds, setReadIds] = useState([]);
    const [isInitialized, setIsInitialized] = useState(false);

    // واکشی سفارش‌ها هنگام لاگین بودن کاربر
    useEffect(() => {
        if (status === 'authenticated' && userId) {
            fetchOrders();
        }
    }, [status, userId, fetchOrders]);

    // بارگذاری شناسه‌های خوانده شده از localStorage
    useEffect(() => {
        if (!userId) {
            setReadIds([]);
            setIsInitialized(true);
            return;
        }

        try {
            const stored = localStorage.getItem(`${STORAGE_PREFIX}${userId}`);
            if (stored) {
                setReadIds(JSON.parse(stored));
            }
        } catch {
            setReadIds([]);
        } finally {
            setIsInitialized(true);
        }
    }, [userId]);

    // ساخت لیست اعلان‌ها بر اساس سفارش‌های تایید شده و رد شده
    const notifications = useMemo(() => {
        if (!userId || !orders || !Array.isArray(orders)) return [];

        const itemsList = [];

        for (const orderData of orders) {
            const order = orderData.attributes || orderData;
            const docId = order.documentId || orderData.documentId;
            const numId = order.id || orderData.id;
            const rawId = String(docId || numId);

            const oStatus = String(order.orderStatus || '').trim().toLowerCase();
            const pStatus = String(order.paymentStatus || '').trim().toLowerCase();
            const rejectionReason = (order.rejectionReason || '').trim();

            const isRejected = 
                oStatus === 'canceled' || 
                oStatus === 'cancelled' || 
                oStatus === 'rejected' || 
                oStatus === 'رد شده' ||
                pStatus === 'failed' || 
                pStatus === 'rejected' ||
                Boolean(rejectionReason && oStatus !== 'paid' && pStatus !== 'paid');
            const isConfirmed = !isRejected && (oStatus === 'paid' || pStatus === 'paid');

            if (!isConfirmed && !isRejected) {
                continue;
            }

            const type = isRejected ? 'rejected' : 'confirmed';
            const notifId = `${rawId}_${type}`;
            const isRead = readIds.includes(notifId) || (type === 'confirmed' && readIds.includes(rawId));

            const items = Array.isArray(order.items) ? order.items : [];
            const firstItemTitle = items[0]?.title || items[0]?.name || null;
            const itemsCount = items.length;

            let title = '';
            let message = '';
            let link = '';

            if (isConfirmed) {
                title = 'سفارش شما تایید شد 🎉';
                link = '/profile/purchases';
                if (firstItemTitle) {
                    if (itemsCount > 1) {
                        message = `دسترسی به «${firstItemTitle}» و ${itemsCount - 1} مورد دیگر فعال شد.`;
                    } else {
                        message = `دسترسی شما به «${firstItemTitle}» فعال شد.`;
                    }
                } else {
                    message = `سفارش شماره #${numId} با موفقیت تایید شد و دسترسی شما فعال گردید.`;
                }
            } else {
                title = 'سفارش شما رد شد ❌';
                link = `/profile/orders/${docId || numId}`;
                const reasonText = rejectionReason ? ` (علت: ${rejectionReason})` : '';

                if (firstItemTitle) {
                    if (itemsCount > 1) {
                        message = `سفارش مربوط به «${firstItemTitle}» و ${itemsCount - 1} مورد دیگر تایید نشد.${reasonText}`;
                    } else {
                        message = `سفارش مربوط به «${firstItemTitle}» تایید نشد.${reasonText}`;
                    }
                } else if (rejectionReason) {
                    message = `سفارش شماره #${numId} تایید نشد. علت: ${rejectionReason}`;
                } else {
                    message = `سفارش شماره #${numId} توسط مدیریت رد شد.`;
                }
            }

            itemsList.push({
                id: notifId,
                orderId: numId,
                type,
                title,
                message,
                date: order.updatedAt || orderData.updatedAt || order.createdAt || orderData.createdAt,
                isRead,
                link,
                order,
            });
        }

        // مرتب‌سازی بر اساس تاریخ (جدیدترین در ابتدا)
        itemsList.sort((a, b) => {
            const timeA = a.date ? new Date(a.date).getTime() : 0;
            const timeB = b.date ? new Date(b.date).getTime() : 0;
            return timeB - timeA;
        });

        return itemsList;
    }, [userId, orders, readIds]);

    // محاسبه تعداد خوانده نشده
    const unreadCount = useMemo(() => {
        return notifications.filter((n) => !n.isRead).length;
    }, [notifications]);

    // علامت‌گذاری یک اعلان به عنوان خوانده شده
    const markAsRead = useCallback((id) => {
        if (!userId || !id) return;
        setReadIds((prev) => {
            const strId = String(id);
            if (prev.includes(strId)) return prev;
            const next = [...prev, strId];
            try {
                localStorage.setItem(`${STORAGE_PREFIX}${userId}`, JSON.stringify(next));
            } catch {}
            return next;
        });
    }, [userId]);

    // علامت‌گذاری همه اعلان‌ها به عنوان خوانده شده
    const markAllAsRead = useCallback(() => {
        if (!userId) return;
        setReadIds((prev) => {
            const currentIds = notifications.map((n) => n.id);
            const merged = Array.from(new Set([...prev, ...currentIds]));
            try {
                localStorage.setItem(`${STORAGE_PREFIX}${userId}`, JSON.stringify(merged));
            } catch {}
            return merged;
        });
    }, [userId, notifications]);

    return {
        notifications,
        unreadCount,
        isLoading: isLoading || !isInitialized,
        hasFetched,
        markAsRead,
        markAllAsRead,
        refresh: () => fetchOrders(true),
    };
}
