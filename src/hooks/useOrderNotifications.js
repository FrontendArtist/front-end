'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useOrdersStore } from '@/store/useOrdersStore';
import { useUserMessagesStore } from '@/store/useUserMessagesStore';

const STORAGE_PREFIX = 'khak_read_notifications_';

export function useOrderNotifications() {
    const { data: session, status } = useSession();
    const userId = session?.user?.id;
    const token = session?.user?.jwt;

    const { orders, isLoading: isOrdersLoading, fetchOrders, hasFetched: hasOrdersFetched } = useOrdersStore();
    const { messages, isLoading: isMessagesLoading, fetchMessages, hasFetched: hasMessagesFetched } = useUserMessagesStore();

    const [readIds, setReadIds] = useState([]);
    const [isInitialized, setIsInitialized] = useState(false);
    const pollTimerRef = useRef(null);

    // واکشی اولیه سفارش‌ها و پیام‌ها هنگام احراز هویت
    useEffect(() => {
        if (status === 'authenticated' && userId) {
            fetchOrders();
            if (token) {
                fetchMessages(token, userId);
            }
        }
    }, [status, userId, token, fetchOrders, fetchMessages]);

    // پولینگ منظم (هر ۴۵ ثانیه) در زمان فعال بودن صفحه برای دریافت اعلان‌های جدید پیام و سفارش
    useEffect(() => {
        if (status !== 'authenticated' || !userId || !token) {
            if (pollTimerRef.current) clearInterval(pollTimerRef.current);
            return;
        }

        const runPoll = () => {
            if (document.visibilityState === 'visible') {
                fetchMessages(token, userId, true);
                fetchOrders(true);
            }
        };

        pollTimerRef.current = setInterval(runPoll, 45000);

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                runPoll();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            if (pollTimerRef.current) clearInterval(pollTimerRef.current);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [status, userId, token, fetchMessages, fetchOrders]);

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

    // ساخت لیست یکپارچه اعلان‌ها (سفارش‌ها + پاسخ پیام‌های استاد و پشتیبانی)
    const notifications = useMemo(() => {
        if (!userId) return [];

        const itemsList = [];

        // ۱. اعلان‌های سفارشات (تایید شده / رد شده)
        if (orders && Array.isArray(orders)) {
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
        }

        // ۲. اعلان‌های پیام‌ها (پاسخ استاد یا پشتیبانی)
        if (messages && Array.isArray(messages)) {
            for (const msgData of messages) {
                const msg = msgData.attributes || msgData;
                const docId = msg.documentId || msgData.documentId;
                const numId = msg.id || msgData.id;
                const rawId = String(docId || numId);

                const replies = Array.isArray(msg.replies) 
                    ? msg.replies 
                    : (Array.isArray(msg.attributes?.replies) ? msg.attributes.replies : []);

                // فیلتر پاسخ‌هایی که از طرف کادر مدیریت / استاد ارسال شده‌اند
                const staffReplies = replies.filter(
                    (r) => r && (r.isAdmin || r.sender === 'instructor' || r.sender === 'admin' || r.sender === 'support')
                );
                const isStatusAnswered = (msg.status || msg.attributes?.status) === 'answered';

                // اگر نه پاسخی از طرف استاد/پشتیبانی ثبت شده و نه وضعیت answered است، اعلانی نیست
                if (staffReplies.length === 0 && !isStatusAnswered) {
                    continue;
                }

                const latestStaffReply = staffReplies[staffReplies.length - 1];
                const isMentor =
                    latestStaffReply?.sender === 'instructor' ||
                    msg.messageType === 'instructor' ||
                    msg.type === 'instructor' ||
                    Boolean(msg.metaData);

                const type = isMentor ? 'mentor_reply' : 'support_reply';
                const replyTimestamp = latestStaffReply?.createdAt || msg.updatedAt || msgData.updatedAt || msg.createdAt || msgData.createdAt;
                const notifId = `msg_${rawId}_${type}_${replyTimestamp}`;

                const isRead = readIds.includes(notifId) || readIds.includes(`msg_${rawId}`);

                // طبق بازخورد: فقط موضوع پیام نمایش داده شود و نه متن یا خلاصه پیام/پاسخ
                const subject = (msg.subject || msg.attributes?.subject || '').trim();

                let title = '';
                let message = '';
                if (isMentor) {
                    title = 'پاسخ از طرف استاد 🎓';
                    message = subject 
                        ? `پیام شما با موضوع «${subject}» توسط استاد پاسخ داده شد.`
                        : 'پیام شما توسط استاد پاسخ داده شد.';
                } else {
                    title = 'پاسخ از طرف پشتیبانی 💬';
                    message = subject
                        ? `پیام شما با موضوع «${subject}» توسط پشتیبانی پاسخ داده شد.`
                        : 'پیام شما توسط پشتیبانی پاسخ داده شد.';
                }

                const link = isMentor 
                    ? `/profile/messages?open=${rawId}&mentor=true` 
                    : `/profile/messages?open=${rawId}`;

                itemsList.push({
                    id: notifId,
                    rawId,
                    type,
                    title,
                    message,
                    date: replyTimestamp,
                    isRead,
                    link,
                    subject,
                });
            }
        }

        // مرتب‌سازی بر اساس تاریخ (جدیدترین در ابتدا)
        itemsList.sort((a, b) => {
            const timeA = a.date ? new Date(a.date).getTime() : 0;
            const timeB = b.date ? new Date(b.date).getTime() : 0;
            return timeB - timeA;
        });

        return itemsList;
    }, [userId, orders, messages, readIds]);

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

    // علامت‌گذاری اعلان‌های یک پیام خاص به عنوان خوانده شده (هنگام باز شدن پیام در صفحه پیام‌ها)
    const markMessageAsRead = useCallback((msgId) => {
        if (!userId || !msgId) return;
        const targetStr = String(msgId);
        setReadIds((prev) => {
            const relatedNotifIds = notifications
                .filter((n) => n.rawId === targetStr || n.id.includes(targetStr))
                .map((n) => n.id);
            const toAdd = [targetStr, `msg_${targetStr}`, ...relatedNotifIds].filter((id) => !prev.includes(id));
            if (toAdd.length === 0) return prev;
            const next = [...prev, ...toAdd];
            try {
                localStorage.setItem(`${STORAGE_PREFIX}${userId}`, JSON.stringify(next));
            } catch {}
            return next;
        });
    }, [userId, notifications]);

    // علامت‌گذاری همه اعلان‌ها به عنوان خوانده شده
    const markAllAsRead = useCallback(() => {
        if (!userId) return;
        setReadIds((prev) => {
            const currentIds = notifications.map((n) => n.id);
            const currentRawIds = notifications.map((n) => n.rawId ? `msg_${n.rawId}` : null).filter(Boolean);
            const merged = Array.from(new Set([...prev, ...currentIds, ...currentRawIds]));
            try {
                localStorage.setItem(`${STORAGE_PREFIX}${userId}`, JSON.stringify(merged));
            } catch {}
            return merged;
        });
    }, [userId, notifications]);

    return {
        notifications,
        unreadCount,
        isLoading: (isOrdersLoading || isMessagesLoading) || !isInitialized,
        hasFetched: hasOrdersFetched && hasMessagesFetched,
        markAsRead,
        markMessageAsRead,
        markAllAsRead,
        refresh: () => {
            fetchOrders(true);
            if (token && userId) fetchMessages(token, userId, true);
        },
    };
}
