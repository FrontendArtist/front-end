'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

/**
 * کلید ذخیره‌سازی شناسه ناشناس در localStorage
 */
const STORAGE_KEY = 'tarhelahi_vid';

/**
 * تولید یا بازیابی شناسه یکتای ناشناس برای مرورگر کلاینت
 */
function getOrCreateVisitorId() {
    if (typeof window === 'undefined') return '';
    try {
        let vid = localStorage.getItem(STORAGE_KEY);
        if (!vid) {
            vid = 'v_' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
            localStorage.setItem(STORAGE_KEY, vid);
        }
        return vid;
    } catch {
        return 'v_anonymous_' + Math.random().toString(36).substring(2, 8);
    }
}

/**
 * تشخیص نوع دستگاه کاربر به صورت سبک
 */
function getDeviceType() {
    if (typeof window === 'undefined') return 'desktop';
    const width = window.innerWidth;
    const ua = navigator.userAgent || '';
    if (/tablet|ipad|playbook|silk/i.test(ua) || (width >= 768 && width <= 1024)) {
        return 'tablet';
    }
    if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua) || width < 768) {
        return 'mobile';
    }
    return 'desktop';
}

/**
 * ارسال رویداد رهگیری به API Next.js با روش‌های بدون انسداد (keepalive / beacon)
 */
function sendTrackingEvent(payload) {
    if (typeof window === 'undefined') return;

    try {
        const bodyStr = JSON.stringify(payload);
        fetch('/api/analytics/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: bodyStr,
            keepalive: true,
        }).catch(() => {
            // نادیده گرفتن خطای شبکه کلاینت تا کاربر متوجه هیچ مشکلی نشود
        });
    } catch {
        // نادیده گرفتن خطا
    }
}

/**
 * VisitorTracker Component
 * کامپوننت کلاینتی بسیار سبک جهت ثبت بازدیدها و ضربان قلب کاربران آنلاین
 */
export default function VisitorTracker() {
    const pathname = usePathname();
    const lastTrackedPath = useRef('');

    // ۱. ثبت بازدید هنگام ورود یا تغییر مسیر صفحه
    useEffect(() => {
        // نادیده گرفتن مسیرهای پنل مدیریت ادمین تا آمار واقعی کاربران سایت مخدوش نشود
        if (!pathname || pathname.startsWith('/admin')) {
            return;
        }

        // جلوگیری از ثبت تکراری در همان رندر
        if (lastTrackedPath.current === pathname) {
            return;
        }
        lastTrackedPath.current = pathname;

        const visitorId = getOrCreateVisitorId();
        const device = getDeviceType();

        sendTrackingEvent({
            visitorId,
            path: pathname,
            device,
            type: 'pageview',
        });
    }, [pathname]);

    // ۲. ارسال ضربان قلب دوره‌ای (Heartbeat) برای محاسبه دقیق افراد آنلاین
    useEffect(() => {
        const intervalId = setInterval(() => {
            if (typeof document !== 'undefined' && document.hidden) {
                // اگر تب مرورگر در پس‌زمینه باشد، پینگ ارسال نکن
                return;
            }

            if (pathname && pathname.startsWith('/admin')) {
                return;
            }

            const visitorId = getOrCreateVisitorId();
            const device = getDeviceType();

            sendTrackingEvent({
                visitorId,
                path: pathname || '/',
                device,
                type: 'heartbeat',
            });
        }, 60 * 1000); // هر ۶۰ ثانیه

        // پینگ مجدد هنگام برگشتن کاربر به تب فعال
        const handleVisibilityChange = () => {
            if (!document.hidden && (!pathname || !pathname.startsWith('/admin'))) {
                const visitorId = getOrCreateVisitorId();
                const device = getDeviceType();
                sendTrackingEvent({
                    visitorId,
                    path: pathname || '/',
                    device,
                    type: 'heartbeat',
                });
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            clearInterval(intervalId);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [pathname]);

    return null;
}
