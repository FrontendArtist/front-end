'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useOrdersStore } from '@/store/useOrdersStore';
import { useUserMessagesStore } from '@/store/useUserMessagesStore';

const STORAGE_PREFIX = 'khak_read_notifications_';

// مدیریت هماهنگ‌سازی سراسری اعلان‌ها به صورت Singleton برای جلوگیری از تکرار درخواست‌ها
let globalSubscribersCount = 0;
let lastPollTimestamp = Date.now();
const VISIBILITY_THROTTLE_MS = 60000; // حداقل ۶۰ ثانیه فاصله بین رفرش‌های ناشی از سوئیچ تب

const triggerPoll = (token, userId) => {
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
    lastPollTimestamp = Date.now();
    useUserMessagesStore.getState().fetchMessages(token, userId, true);
    useOrdersStore.getState().fetchOrders(true);
};

export function useOrderNotifications() {
    const { data: session, status } = useSession();
    const userId = session?.user?.id;
    const token = session?.user?.jwt;

    const orders = useOrdersStore((state) => state.orders);
    const isOrdersLoading = useOrdersStore((state) => state.isLoading);
    const hasOrdersFetched = useOrdersStore((state) => state.hasFetched);
    const fetchOrders = useOrdersStore((state) => state.fetchOrders);

    const messages = useUserMessagesStore((state) => state.messages);
    const isMessagesLoading = useUserMessagesStore((state) => state.isLoading);
    const hasMessagesFetched = useUserMessagesStore((state) => state.hasFetched);
    const fetchMessages = useUserMessagesStore((state) => state.fetchMessages);

    const [readIds, setReadIds] = useState([]);
    const [isInitialized, setIsInitialized] = useState(false);

    // واکشی اولیه سفارش‌ها و پیام‌ها هنگام احراز هویت (بدون force تا در صورت وجود کش دوباره فچ نشود)
    useEffect(() => {
        if (status === 'authenticated' && userId) {
            fetchOrders();
            if (token) {
                fetchMessages(token, userId);
            }
        }
    }, [status, userId, token]); // eslint-disable-line react-hooks/exhaustive-deps

    // هماهنگ‌سازی فقط در زمان سوئیچ تب با تراتل ۶۰ ثانیه (بدون هیچ تایمر تکرارشونده در حین حضور در صفحه)
    useEffect(() => {
        if (status !== 'authenticated' || !userId || !token) {
            return;
        }

        globalSubscribersCount++;

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                const now = Date.now();
                if (now - lastPollTimestamp >= VISIBILITY_THROTTLE_MS) {
                    triggerPoll(token, userId);
                }
            }
        };

        // فعال‌سازی لیسنر فقط برای اولین کامپوننت مشترک در برنامه
        if (globalSubscribersCount === 1) {
            lastPollTimestamp = Date.now();
            document.addEventListener('visibilitychange', handleVisibilityChange);
        }

        return () => {
            globalSubscribersCount--;
            // اگر همه کامپوننت‌ها unmount شدند، لیسنر را متوقف کن
            if (globalSubscribersCount <= 0) {
                globalSubscribersCount = 0;
                document.removeEventListener('visibilitychange', handleVisibilityChange);
            }
        };
    }, [status, userId, token]);

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

        // ۱. اعلان‌های سفارشات (پرداخت موفق / لغو یا ناموفق آنلاین / در حال بررسی / لغو شده مدیریت)
        if (orders && Array.isArray(orders)) {
            for (const orderData of orders) {
                const order = orderData.attributes || orderData;
                const docId = order.documentId || orderData.documentId;
                const numId = order.id || orderData.id;
                const rawId = String(docId || numId);

                const oStatus = String(order.orderStatus || '').trim().toLowerCase();
                const pStatus = String(order.paymentStatus || '').trim().toLowerCase();
                const paymentMethod = String(order.paymentMethod || '').trim().toLowerCase();
                const rejectionReason = (order.rejectionReason || '').trim();

                // سفارش‌هایی که به دلیل شروع فرآیند خرید جدید از سبد خرید خودکار لغو شده‌اند، اعلان اسپم ایجاد نمی‌کنند
                if (rejectionReason.includes('لغو خودکار به دلیل ثبت فرآیند خرید جدید')) {
                    continue;
                }

                const isOnlinePayment = paymentMethod === 'online';
                const isPaid = oStatus === 'paid' || pStatus === 'paid';
                const isPendingVerification = !isPaid && (pStatus === 'pending_verification' || (isOnlinePayment && pStatus === 'processing'));

                const isOnlineFailedOrCanceled = !isPaid && isOnlinePayment && (
                    oStatus === 'canceled' ||
                    oStatus === 'cancelled' ||
                    pStatus === 'failed' ||
                    (rejectionReason && !isPendingVerification)
                );

                const isCardRejected = !isPaid && !isOnlinePayment && (
                    oStatus === 'canceled' ||
                    oStatus === 'cancelled' ||
                    oStatus === 'rejected' ||
                    oStatus === 'رد شده' ||
                    pStatus === 'failed' ||
                    pStatus === 'rejected' ||
                    Boolean(rejectionReason)
                );

                if (!isPaid && !isOnlineFailedOrCanceled && !isPendingVerification && !isCardRejected) {
                    continue;
                }

                let type = 'confirmed';
                if (isPaid) {
                    type = 'confirmed';
                } else if (isPendingVerification) {
                    type = 'pending_verification';
                } else if (isOnlineFailedOrCanceled) {
                    type = 'payment_failed';
                } else if (isCardRejected) {
                    type = 'rejected';
                }

                const notifId = `${rawId}_${type}`;
                const isRead = readIds.includes(notifId) || (type === 'confirmed' && readIds.includes(rawId));

                const items = Array.isArray(order.items) ? order.items : [];
                const firstItemTitle = items[0]?.title || items[0]?.name || null;
                const itemsCount = items.length;

                let title = '';
                let message = '';
                let link = '';
                let hint = null;

                if (type === 'confirmed') {
                    title = isOnlinePayment ? 'پرداخت با موفقیت انجام شد 🎉' : 'سفارش شما تایید شد 🎉';
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
                } else if (type === 'payment_failed') {
                    const isCanceledByUser = rejectionReason.includes('کاربر لغو') || rejectionReason.toLowerCase().includes('cancel');
                    const isVpnIssue = rejectionReason.includes('فیلترشکن') || rejectionReason.toLowerCase().includes('vpn');

                    if (isCanceledByUser) {
                        title = 'پرداخت آنلاین لغو شد ⚠️';
                    } else if (isVpnIssue) {
                        title = 'خطای اتصال به درگاه (VPN) ⚠️';
                    } else {
                        title = 'پرداخت آنلاین ناموفق بود ⚠️';
                    }

                    link = `/cart`;

                    if (firstItemTitle) {
                        if (itemsCount > 1) {
                            message = `پرداخت آنلاین «${firstItemTitle}» و ${itemsCount - 1} مورد دیگر تکمیل نشد. اقلام در سبد خرید شما محفوظ است.`;
                        } else {
                            message = `پرداخت آنلاین «${firstItemTitle}» تکمیل نشد. اقلام در سبد خرید شما محفوظ است.`;
                        }
                    } else if (rejectionReason) {
                        message = `پرداخت سفارش شماره #${numId} انجام نشد (${rejectionReason}). اقلام در سبد خرید محفوظ است.`;
                    } else {
                        message = `پرداخت سفارش شماره #${numId} در درگاه انجام نشد. در سبد خرید می‌توانید خرید را تکمیل کنید.`;
                    }

                    // راهنمای اطمینان‌بخش در صورت کسر وجه
                    hint = 'اگر مبلغ از حسابتان کسر شده ولی دسترسی فعال نشده، ظرف حداکثر ۷۲ ساعت توسط بانک عودت می‌گردد، یا با پشتیبانی تماس بگیرید.';
                } else if (type === 'pending_verification') {
                    title = 'پرداخت در حال بررسی است ⏳';
                    link = `/profile/orders/${docId || numId}`;
                    message = `تراکنش سفارش شماره #${numId} در حال استعلام بانکی است. به محض تایید نهایی، دسترسی شما فعال می‌شود.`;
                } else if (type === 'rejected') {
                    title = 'سفارش شما تایید نشد ❌';
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
                        message = `فیش واریزی سفارش شماره #${numId} توسط مدیریت تایید نشد.`;
                    }
                }

                itemsList.push({
                    id: notifId,
                    orderId: numId,
                    type,
                    title,
                    message,
                    hint,
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

        // طبق درخواست کاربر: اعلان‌هایی که خوانده می‌شوند کلاً از لیست حذف می‌شوند
        return itemsList.filter((item) => !item.isRead);
    }, [userId, orders, messages, readIds]);

    // محاسبه تعداد خوانده نشده (برابر با کل اعلان‌های موجود در لیست)
    const unreadCount = useMemo(() => {
        return notifications.length;
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
