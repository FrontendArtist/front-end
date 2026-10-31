'use client';

import { useEffect, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useShallow } from 'zustand/react/shallow';
import { useOrdersStore } from '@/store/useOrdersStore';
import { useAccountOrders } from '@/hooks/useAccountOrders';
import { useUserMessagesStore } from '@/store/useUserMessagesStore';
import {
    useNotificationsStore,
    selectAccountNotifications,
} from '@/store/useNotificationsStore';

// مدیریت هماهنگ‌سازی سراسری اعلان‌ها به صورت Singleton برای جلوگیری از تکرار درخواست‌ها
let lastPollTimestamp = Date.now();
const VISIBILITY_THROTTLE_MS = 60000; // حداقل ۶۰ ثانیه فاصله بین رفرش‌های ناشی از سوئیچ تب

const triggerPoll = (token, userId) => {
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
    lastPollTimestamp = Date.now();
    useNotificationsStore.getState().fetchNotifications(true, userId);
    useUserMessagesStore.getState().fetchMessages(token, userId, true);
    useOrdersStore.getState().fetchOrders(true, userId);
};

export function useOrderNotifications() {
    const { data: session, status } = useSession();
    const userId = status === 'authenticated' ? session?.user?.id : null;
    const token = session?.user?.jwt;

    const { isLoading: isOrdersLoading, hasFetched: hasOrdersFetched, fetchOrders } = useAccountOrders();

    const notifState = useNotificationsStore(
        useShallow((store) => {
            const matches = userId != null && store.userId === String(userId);
            return {
                matches,
                notifications: selectAccountNotifications(store, userId),
                hasFetched: matches && store.hasFetched,
                isLoading: userId != null && (!matches || store.isLoading),
            };
        })
    );

    const fetchNotifications = useCallback(
        (force = false) => useNotificationsStore.getState().fetchNotifications(force, userId),
        [userId]
    );

    // واکشی اولیه اعلان‌ها و سفارش‌ها هنگام احراز هویت یا بی‌اعتبارشدن کش
    useEffect(() => {
        if (status === 'authenticated' && userId != null) {
            if (!notifState.matches) {
                useNotificationsStore.getState().setNotificationsUser(userId);
            }
            if (!notifState.hasFetched) {
                fetchNotifications();
            }
            fetchOrders();
        }
    }, [status, userId, notifState.matches, notifState.hasFetched, fetchNotifications, fetchOrders]);

    // هماهنگ‌سازی در زمان سوئیچ تب با تراتل ۶۰ ثانیه
    useEffect(() => {
        if (status !== 'authenticated' || !userId || !token) {
            return;
        }

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                const now = Date.now();
                if (now - lastPollTimestamp >= VISIBILITY_THROTTLE_MS) {
                    triggerPoll(token, userId);
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [status, userId, token]);

    const notifications = notifState.notifications;

    const unreadCount = useMemo(() => {
        return notifications.length;
    }, [notifications]);

    const markAsRead = useCallback(
        (id) => {
            if (!userId || !id) return;
            useNotificationsStore.getState().markAsRead(id, userId);
        },
        [userId]
    );

    const markMessageAsRead = useCallback(
        (msgId) => {
            if (!userId || !msgId) return;
            useNotificationsStore.getState().markMessageAsRead(msgId, userId);
        },
        [userId]
    );

    const markAllAsRead = useCallback(() => {
        if (!userId) return;
        useNotificationsStore.getState().markAllAsRead(userId);
    }, [userId]);

    const refresh = useCallback(() => {
        if (!userId) return;
        fetchNotifications(true);
        fetchOrders(true);
        if (token) {
            useUserMessagesStore.getState().fetchMessages(token, userId, true);
        }
    }, [userId, token, fetchNotifications, fetchOrders]);

    return {
        notifications,
        unreadCount,
        isLoading: notifState.isLoading || isOrdersLoading,
        hasFetched: notifState.hasFetched && hasOrdersFetched,
        markAsRead,
        markMessageAsRead,
        markAllAsRead,
        refresh,
    };
}
