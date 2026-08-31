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

    // ساخت لیست اعلان‌ها بر اساس سفارش‌های تایید شده
    const notifications = useMemo(() => {
        if (!userId || !orders || !Array.isArray(orders)) return [];

        const confirmedOrders = orders.filter((order) => {
            const oStatus = (order.orderStatus || '').trim().toLowerCase();
            const pStatus = (order.paymentStatus || '').trim().toLowerCase();
            return oStatus === 'paid' || pStatus === 'paid';
        });

        return confirmedOrders.map((order) => {
            const id = String(order.documentId || order.id);
            const isRead = readIds.includes(id);

            // استخراج عنوان اولین آیتم یا دوره برای متن اعلان
            const items = order.items || [];
            const firstItemTitle = items[0]?.title || items[0]?.name || null;
            const itemsCount = items.length;

            let description = `سفارش شماره #${order.id} با موفقیت تایید شد و دسترسی شما فعال گردید.`;
            if (firstItemTitle) {
                if (itemsCount > 1) {
                    description = `دسترسی به «${firstItemTitle}» و ${itemsCount - 1} مورد دیگر فعال شد.`;
                } else {
                    description = `دسترسی شما به «${firstItemTitle}» فعال شد.`;
                }
            }

            return {
                id,
                orderId: order.id,
                title: 'سفارش شما تایید شد 🎉',
                message: description,
                date: order.updatedAt || order.createdAt,
                isRead,
                link: '/profile/purchases',
                order,
            };
        });
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
        const allIds = notifications.map((n) => n.id);
        setReadIds(allIds);
        try {
            localStorage.setItem(`${STORAGE_PREFIX}${userId}`, JSON.stringify(allIds));
        } catch {}
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
