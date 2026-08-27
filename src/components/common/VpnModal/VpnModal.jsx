'use client';

import { useState, useEffect, useCallback } from 'react';
import styles from './VpnModal.module.scss';

export default function VpnModal() {
  const [isVpn, setIsVpn] = useState(false);
  const [vpnInfo, setVpnInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);

  const checkVpn = useCallback(async (isManual = false) => {
    if (isManual) {
      setChecking(true);
    } else {
      setLoading(true);
    }

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
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    checkVpn();
  }, [checkVpn]);

  if (loading || !isVpn) {
    return null;
  }

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="vpn-modal-title">
      <div className={styles.modal}>
        {/* آیکون هشدار درخشان */}
        <div className={styles.iconWrapper}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        {/* عنوان */}
        <h2 id="vpn-modal-title" className={styles.title}>
          لطفاً VPN خود را خاموش کنید ⚠️
        </h2>

        {/* توضیحات */}
        <p className={styles.description}>
          برای دسترسی کامل، افزایش سرعت و جلوگیری از بروز اختلال در دریافت خدمات سایت، لطفا <strong>فیلترشکن (VPN)</strong> خود را غیرفعال کرده و سپس روی دکمه زیر کلیک کنید.
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
            onClick={() => checkVpn(true)}
            disabled={checking}
            type="button"
          >
            {checking ? (
              <>
                <span className={styles.spinner} />
                در حال بررسی مجدد...
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                خاموش کردم / بررسی مجدد
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
