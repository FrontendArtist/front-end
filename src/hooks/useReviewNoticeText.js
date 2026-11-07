'use client';

import { useEffect, useState } from 'react';
import { DEFAULT_REVIEW_MINUTES, buildReviewNoticeText, normalizeReviewMinutes } from '@/lib/reviewNotice';

/**
 * متن پیام «در حال بررسی» با عدد آستانهٔ تنظیم‌شده؛ فقط وقتی enabled است از route سروری می‌خواند.
 * هر شکستی (شبکه، 401، پاسخ نامعتبر) بی‌صدا به پیش‌فرض برمی‌گردد و صفحه را نمی‌شکند.
 */
export default function useReviewNoticeText(enabled) {
    const [minutes, setMinutes] = useState(DEFAULT_REVIEW_MINUTES);

    useEffect(() => {
        if (!enabled || typeof fetch !== 'function') return undefined;
        let active = true;
        (async () => {
            try {
                const res = await fetch('/api/gateway-reviews/threshold', { cache: 'no-store' });
                if (!res?.ok) return;
                const data = await res.json();
                if (active) setMinutes(normalizeReviewMinutes(data?.noCallbackMinutes));
            } catch { /* پیش‌فرض می‌ماند */ }
        })();
        return () => { active = false; };
    }, [enabled]);

    return buildReviewNoticeText(minutes);
}
