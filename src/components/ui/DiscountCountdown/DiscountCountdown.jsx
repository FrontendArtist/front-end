'use client';

import { useState, useEffect } from 'react';
import styles from './DiscountCountdown.module.scss';

/**
 * کامپوننت تایمر شمارش معکوس تخفیف (Discount Countdown Timer)
 * 
 * @param {{
 *   targetDate: string | Date | number;
 *   compact?: boolean;
 *   onExpire?: () => void;
 *   label?: string;
 * }} props
 */
export default function DiscountCountdown({
  targetDate,
  compact = false,
  onExpire,
  label = 'فرصت باقی‌مانده تخفیف'
}) {
  const [timeLeft, setTimeLeft] = useState(null);
  const [isExpired, setIsExpired] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!targetDate) return;

    const calculateTime = () => {
      const targetTime = new Date(targetDate).getTime();
      const now = new Date().getTime();
      const difference = targetTime - now;

      if (difference <= 0) {
        setIsExpired(true);
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        if (onExpire) onExpire();
        return false;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds });
      return true;
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);

    return () => clearInterval(interval);
  }, [targetDate, onExpire]);

  if (!isMounted || !targetDate || isExpired || !timeLeft) {
    return null;
  }

  const toPersian = (num) => {
    return new Intl.NumberFormat('fa-IR', { minimumIntegerDigits: 2, useGrouping: false }).format(num);
  };

  if (compact) {
    return (
      <div className={styles.compactContainer} title={label}>
        <span className={styles.pulseDot} aria-hidden="true" />
        <span className={styles.compactIcon}>⏳</span>
        <div className={styles.compactDigits}>
          {timeLeft.days > 0 && (
            <>
              <span className={styles.num}>{toPersian(timeLeft.days)}</span>
              <span className={styles.unit}></span>
              <span className={styles.sep}>:</span>
            </>
          )}
          <span className={styles.num}>{toPersian(timeLeft.hours)}</span>
          <span className={styles.sep}>:</span>
          <span className={styles.num}>{toPersian(timeLeft.minutes)}</span>
          <span className={styles.sep}>:</span>
          <span className={styles.num}>{toPersian(timeLeft.seconds)}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.fullContainer}>
      <div className={styles.header}>
        <span className={styles.badgePulse}>🔥</span>
        <span className={styles.headerTitle}>{label}</span>
      </div>
      <div className={styles.timerGrid}>
        {timeLeft.days > 0 && (
          <div className={styles.timeBox}>
            <span className={styles.timeVal}>{toPersian(timeLeft.days)}</span>
            <span className={styles.timeLabel}>روز</span>
          </div>
        )}
        <div className={styles.timeBox}>
          <span className={styles.timeVal}>{toPersian(timeLeft.hours)}</span>
          <span className={styles.timeLabel}>ساعت</span>
        </div>
        <span className={styles.colon}>:</span>
        <div className={styles.timeBox}>
          <span className={styles.timeVal}>{toPersian(timeLeft.minutes)}</span>
          <span className={styles.timeLabel}>دقیقه</span>
        </div>
        <span className={styles.colon}>:</span>
        <div className={styles.timeBox}>
          <span className={styles.timeVal}>{toPersian(timeLeft.seconds)}</span>
          <span className={styles.timeLabel}>ثانیه</span>
        </div>
      </div>
    </div>
  );
}
