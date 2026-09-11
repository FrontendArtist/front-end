'use client';

/**
 * @file src/components/layout/TopBanner/TopBanner.jsx
 * @description کامپوننت نوار اعلان و تخفیف بالای هدر سایت
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Sparkles, ArrowLeft, X } from 'lucide-react';
import styles from './TopBanner.module.scss';

export default function TopBanner({ initialData = null }) {
  const [bannerData, setBannerData] = useState(initialData);
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const bannerRef = useRef(null);

  // واکشی یا تنظیم اولیه داده نوار
  useEffect(() => {
    let isMounted = true;

    async function initBanner() {
      let data = initialData;

      // در صورتی که داده اولیه از سرور نیامده بود، به صورت کلاینت ساید واکشی می‌کنیم
      if (!data) {
        try {
          const res = await fetch('/api/top-banner', { cache: 'no-store' });
          if (res.ok) {
            const json = await res.json();
            if (json?.success && json?.data) {
              data = json.data;
            }
          }
        } catch {
          // در صورت بروز خطا به آرامی نادیده گرفته می‌شود
        }
      }

      if (!isMounted || !data || !data.isActive || !data.text) {
        if (typeof document !== 'undefined') {
          document.documentElement.style.setProperty('--top-banner-height', '0px');
        }
        return;
      }

      // بررسی وضعیت بسته‌شدن توسط کاربر در نشست فعلی
      const storageKey = `top_banner_dismissed_${data.id || data.documentId || 'active'}_${data.updatedAt || '0'}`;
      try {
        const isDismissed = sessionStorage.getItem(storageKey) || localStorage.getItem(storageKey);
        if (isDismissed) {
          if (typeof document !== 'undefined') {
            document.documentElement.style.setProperty('--top-banner-height', '0px');
          }
          return;
        }
      } catch {
        // خطاهای کوکی یا سشن نادیده گرفته می‌شوند
      }

      setBannerData(data);
      setIsVisible(true);
    }

    initBanner();

    return () => {
      isMounted = false;
    };
  }, [initialData]);

  // اندازه‌گیری ارتفاع دقیق و تنظیم متغیر سراسری CSS
  const updateBannerHeight = useCallback(() => {
    if (bannerRef.current && isVisible && !isClosing) {
      const height = bannerRef.current.offsetHeight || 0;
      document.documentElement.style.setProperty('--top-banner-height', `${height}px`);
    } else {
      document.documentElement.style.setProperty('--top-banner-height', '0px');
    }
  }, [isVisible, isClosing]);

  useEffect(() => {
    updateBannerHeight();
    window.addEventListener('resize', updateBannerHeight);
    return () => window.removeEventListener('resize', updateBannerHeight);
  }, [updateBannerHeight]);

  // بستن بنر با انیمیشن روان
  const handleDismiss = () => {
    setIsClosing(true);
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty('--top-banner-height', '0px');
    }

    if (bannerData) {
      const storageKey = `top_banner_dismissed_${bannerData.id || bannerData.documentId || 'active'}_${bannerData.updatedAt || '0'}`;
      try {
        sessionStorage.setItem(storageKey, 'true');
      } catch {
        // نادیده گرفتن خطا
      }
    }

    setTimeout(() => {
      setIsVisible(false);
      setIsClosing(false);
    }, 350);
  };

  if (!isVisible || !bannerData || !bannerData.isActive || !bannerData.text) {
    return null;
  }

  const themeClass = styles[`theme_${bannerData.theme || 'gold'}`] || styles.theme_gold;
  const hasButton = Boolean(bannerData.buttonText && bannerData.buttonLink);
  const isExternalLink = bannerData.buttonLink?.startsWith('http://') || bannerData.buttonLink?.startsWith('https://');

  return (
    <div
      ref={bannerRef}
      className={`${styles.bannerWrapper} ${themeClass} ${isClosing ? styles.closing : ''}`}
      role="region"
      aria-label="اعلان ویژه سایت"
    >
      <div className={styles.banner}>
        <div className={styles.container}>
          {/* نشان / برچسب کوچک */}
          {bannerData.badgeText && (
            <span className={styles.badge}>
              <Sparkles size={13} aria-hidden="true" />
              <span>{bannerData.badgeText}</span>
            </span>
          )}

          {/* متن اصلی نوار با پشتیبانی از تمام تگ‌ها و استایل‌های HTML */}
          <div
            className={styles.text}
            dangerouslySetInnerHTML={{ __html: bannerData.text }}
          />

          {/* دکمه اقدام (Call to Action) */}
          {hasButton && (
            isExternalLink ? (
              <a
                href={bannerData.buttonLink}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.actionBtn}
              >
                <span>{bannerData.buttonText}</span>
                <ArrowLeft size={14} aria-hidden="true" />
              </a>
            ) : (
              <Link href={bannerData.buttonLink} className={styles.actionBtn}>
                <span>{bannerData.buttonText}</span>
                <ArrowLeft size={14} aria-hidden="true" />
              </Link>
            )
          )}
        </div>

        {/* دکمه بستن نوار */}
        {bannerData.canDismiss !== false && (
          <button
            type="button"
            className={styles.closeBtn}
            onClick={handleDismiss}
            aria-label="بستن اعلان"
            title="بستن اعلان"
          >
            <X size={15} />
          </button>
        )}
      </div>
    </div>
  );
}
