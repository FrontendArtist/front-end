'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

const VID_STORAGE_KEY = 'tarhelahi_vid';
const LAST_DATE_STORAGE_KEY = 'tarhelahi_last_visit_date';

/**
 * تولید یا بازیابی شناسه یکتای ناشناس برای مرورگر کلاینت
 */
function getOrCreateVisitorId() {
    if (typeof window === 'undefined') return '';
    try {
        let vid = localStorage.getItem(VID_STORAGE_KEY);
        if (!vid) {
            vid = 'v_' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
            localStorage.setItem(VID_STORAGE_KEY, vid);
        }
        return vid;
    } catch {
        return 'v_anon_' + Math.random().toString(36).substring(2, 8);
    }
}

/**
 * دریافت تاریخ امروز به فرمت YYYY-MM-DD
 */
function getTodayDateString() {
    return new Date().toISOString().split('T')[0];
}

/**
 * ارسال رویداد سبک به سرور
 */
function sendTrackingEvent(type) {
    if (typeof window === 'undefined') return;

    try {
        const visitorId = getOrCreateVisitorId();
        const bodyStr = JSON.stringify({ visitorId, type });

        fetch('/api/analytics/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: bodyStr,
            keepalive: true,
        }).catch(() => {});
    } catch {}
}

/**
 * VisitorTracker Component
 * فقط ورود اولیه روزانه به سایت و ضربان قلب آنلاین را ثبت می‌کند.
 * هیچ درخواست یا سطری به ازای تغییر صفحات یا کلیک‌ها ثبت نمی‌شود.
 */
export default function VisitorTracker() {
    const pathname = usePathname();

    useEffect(() => {
        // نادیده گرفتن مسیرهای ادمین
        if (pathname && pathname.startsWith('/admin')) {
            return;
        }

        const today = getTodayDateString();
        let lastVisitDate = '';
        try {
            lastVisitDate = localStorage.getItem(LAST_DATE_STORAGE_KEY) || '';
        } catch {}

        let lastHeartbeatTime = Date.now();

        // اگر امروز قبلاً وارد سایت نشده، به عنوان ورودی روزانه ثبت شود
        if (lastVisitDate !== today) {
            try {
                localStorage.setItem(LAST_DATE_STORAGE_KEY, today);
            } catch {}
            sendTrackingEvent('enter');
            lastHeartbeatTime = Date.now();
        } else {
            // اگر امروز قبلاً شمرده شده، فقط ضربان قلب آنلاین ارسال شود (بدون افزایش آمار روزانه)
            sendTrackingEvent('heartbeat');
            lastHeartbeatTime = Date.now();
        }

        // ضربان قلب دوره‌ای فقط برای محاسبه تعداد آنلاین‌ها (هر ۱۲۰ ثانیه)
        const intervalId = setInterval(() => {
            if (typeof document !== 'undefined' && document.hidden) {
                return;
            }
            if (window.location.pathname.startsWith('/admin')) {
                return;
            }
            lastHeartbeatTime = Date.now();
            sendTrackingEvent('heartbeat');
        }, 120 * 1000);

        // پینگ مجدد هنگام فعال شدن تب با تراتل حداقل ۶۰ ثانیه‌ای و هماهنگ با تایمر دوره‌ای
        const handleVisibility = () => {
            if (!document.hidden && !window.location.pathname.startsWith('/admin')) {
                const now = Date.now();
                if (now - lastHeartbeatTime >= 60 * 1000) {
                    lastHeartbeatTime = now;
                    sendTrackingEvent('heartbeat');
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibility);

        return () => {
            clearInterval(intervalId);
            document.removeEventListener('visibilitychange', handleVisibility);
        };
    }, []); // فقط یک‌بار هنگام لود سایت اجرا می‌شود

    return null;
}
