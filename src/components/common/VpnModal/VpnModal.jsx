'use client';

import { useState, useEffect, useCallback } from 'react';
import styles from './VpnModal.module.scss';

export default function VpnModal() {
  const [isVpn, setIsVpn] = useState(false);
  const [vpnInfo, setVpnInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && sessionStorage.getItem('vpn_modal_dismissed') === 'true') {
        setIsDismissed(true);
      }
    } catch (e) {
      // sessionStorage unavailable
    }
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      sessionStorage.setItem('vpn_modal_dismissed', 'true');
    } catch (e) {
      // sessionStorage unavailable
    }
  };

  const checkVpn = useCallback(async () => {
    // If user already dismissed in this session, don't show
    try {
      if (typeof window !== 'undefined' && sessionStorage.getItem('vpn_modal_dismissed') === 'true') {
        setLoading(false);
        return;
      }
    } catch (e) {}

    setLoading(true);

    try {
      // ۱. ابتدا بررسی سمت سرور
      const response = await fetch('/api/check-vpn', { cache: 'no-store' });
      if (!response.ok) return;

      let data = await response.json();

      // ۲. اگر محیط لوکال‌هوست بود (isLocal === true)، استعلام آی‌پی عمومی مرورگر برای تست روی لوکال
      if (data?.success && data?.isLocal) {
        try {
          const clientPublicRes = await fetch('http://ip-api.com/json/?fields=query', { cache: 'no-store' });
          if (clientPublicRes.ok) {
            const clientPublicData = await clientPublicRes.json();
            if (clientPublicData?.query) {
              // ارسال IP عمومی مرورگر به بک‌اند جهت آنالیز VPN
              const verifyRes = await fetch(`/api/check-vpn?ip=${clientPublicData.query}`, { cache: 'no-store' });
              if (verifyRes.ok) {
                data = await verifyRes.json();
              }
            }
          }
        } catch (e) {
          // در صورت بروز خطا در فچ مستقیم مرورگر
        }
      }

      if (data?.success && data?.isVpn) {
        setIsVpn(true);
        setVpnInfo({
          ip: data.ip,
          country: data.country,
          isp: data.isp,
        });
      } else {
        setIsVpn(false);
        setVpnInfo(null);
      }
    } catch (err) {
      console.error('VPN check failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkVpn();
  }, [checkVpn]);

  if (loading || !isVpn || isDismissed) {
    return null;
  }

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="vpn-modal-title" onClick={handleDismiss}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* دکمه بستن */}
        <button className={styles.closeBtn} onClick={handleDismiss} aria-label="بستن" type="button">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* آیکون هشدار */}
        <div className={styles.iconWrapper}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        {/* عنوان و پیام */}
        <h2 id="vpn-modal-title" className={styles.title}>
          برای داشتن تجربه کاربری بهتر لطفا VPN خود را خاموش کنید
        </h2>

        {/* توضیحات تکمیلی */}
        <p className={styles.description}>
          روشن بودن فیلترشکن ممکن است سرعت بارگذاری صفحات و دسترسی به برخی بخش‌های سایت را کاهش دهد.
        </p>

        {/* اطلاعات IP شناسایی‌شده */}
        {vpnInfo?.isp && (
          <div className={styles.infoBadge}>
            <span>ارائه‌دهنده شناسایی‌شده:</span>
            <span className={styles.ispName}>{vpnInfo.isp}</span>
          </div>
        )}

        {/* دکمه اکشن */}
        <div className={styles.actions}>
          <button
            className={styles.retryBtn}
            onClick={handleDismiss}
            type="button"
          >
            باشه
          </button>
        </div>
      </div>
    </div>
  );
}
