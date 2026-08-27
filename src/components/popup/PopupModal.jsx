'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './PopupModal.module.scss';

export default function PopupModal() {
  const [popupData, setPopupData] = useState(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function fetchPopup() {
      try {
        const response = await fetch('/api/popup', {
          cache: 'no-store',
        });
        if (!response.ok) return;

        const result = await response.json();
        if (result?.success && result?.data && result.data.isShow) {
          const popup = result.data;
          
          // کلید ذخیره‌سازی بر اساس شناسه یا اسلاگ
          const storageKey = `popup_dismissed_${popup.id || popup.slug || 'active'}`;
          
          // بررسی اینکه آیا قبلاً بسته شده است
          const isDismissedLocal = typeof window !== 'undefined' && localStorage.getItem(storageKey);
          const isDismissedSession = typeof window !== 'undefined' && sessionStorage.getItem(storageKey);

          if (isDismissedLocal || isDismissedSession) {
            return;
          }

          // اگر عکس دارد، نسبت تصویر واقعی را استخراج می‌کنیم و منتظر لود کامل آن می‌مانیم
          if (popup.image?.url) {
            const preloadedImg = new Image();
            preloadedImg.src = popup.image.url;

            preloadedImg.onload = () => {
              const naturalW = preloadedImg.naturalWidth || 500;
              const naturalH = preloadedImg.naturalHeight || 350;
              const dynamicRatio = `${naturalW} / ${naturalH}`;

              if (isMounted) {
                setPopupData({
                  ...popup,
                  aspectRatio: dynamicRatio,
                });
                setIsOpen(true);
              }
            };

            preloadedImg.onerror = () => {
              // در صورت بروز خطا در لود عکس، به عنوان متنی با نسبت پیش‌فرض باز می‌شود
              if (isMounted) {
                setPopupData({
                  ...popup,
                  aspectRatio: '500 / 350',
                });
                setIsOpen(true);
              }
            };
          } else {
            // در صورتی که عکس ندارد و فقط متنی است
            if (isMounted) {
              setPopupData({
                ...popup,
                aspectRatio: '500 / 350',
              });
              setIsOpen(true);
            }
          }
        }
      } catch (err) {
        // بدون وقفه در سایت
      }
    }

    fetchPopup();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, popupData]);

  const handleClose = () => {
    if (popupData) {
      const storageKey = `popup_dismissed_${popupData.id || popupData.slug || 'active'}`;
      try {
        localStorage.setItem(storageKey, 'true');
        sessionStorage.setItem(storageKey, 'true');
      } catch (e) {
        // ignore storage errors
      }
    }
    setIsOpen(false);
  };

  if (!isOpen || !popupData) {
    return null;
  }

  const hasImage = Boolean(popupData.image?.url);
  const hasButton = Boolean(popupData.buttonText && popupData.link);
  const isExternalLink = popupData.link?.startsWith('http://') || popupData.link?.startsWith('https://');

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div
        className={`${styles.modal} ${hasImage ? styles.hasImage : styles.hasNoImage}`}
        style={{
          '--popup-aspect-ratio': popupData.aspectRatio || '500 / 350',
          ...(hasImage && {
            backgroundImage: `url(${popupData.image.url})`,
          }),
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* دکمه بستن پاپ‌آپ */}
        <button
          className={styles.closeBtn}
          onClick={handleClose}
          aria-label="بستن پاپ‌آپ"
          type="button"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 6L6 18M6 6L18 18" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* محتوای پاپ‌آپ */}
        <div className={styles.body}>
          {/* در صورت نبود تصویر، متن یا نام را نمایش می‌دهیم؛ در صورت وجود تصویر نیز اگر متن وجود داشت نمایش داده می‌شود */}
          <div className={styles.textContainer}>
            {!hasImage && popupData.name && (
              <h3 className={styles.popupTitle}>{popupData.name}</h3>
            )}
            {popupData.text && (
              <p className={styles.popupText}>{popupData.text}</p>
            )}
          </div>

          {/* دکمه لینک در پایین وسط */}
          {hasButton && (
            <div className={styles.footer}>
              {isExternalLink ? (
                <a
                  href={popupData.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.actionButton}
                  onClick={handleClose}
                >
                  {popupData.buttonText}
                </a>
              ) : (
                <Link
                  href={popupData.link}
                  className={styles.actionButton}
                  onClick={handleClose}
                >
                  {popupData.buttonText}
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
