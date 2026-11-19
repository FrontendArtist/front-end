'use client';

import React from 'react';
import { useDisplayRate } from '@/context/DisplayRateContext';
import { formatNoor, formatTomanHint } from '@/lib/formatters';
import styles from './PriceWithHint.module.scss';

/**
 * کامپوننت مشترک نمایش قیمت با واحد نور و راهنمای تومانی (Display Hint)
 *
 * @param {object} props
 * @param {number|string} props.price - قیمت نهایی به واحد نور
 * @param {number|string} [props.originalPrice] - قیمت اصلی قبل از تخفیف به واحد نور (اختیاری)
 * @param {boolean} [props.hideHint=false] - آیا راهنمای تومانی مخفی شود؟
 * @param {'sm'|'md'|'lg'} [props.size='md'] - اندازه فونت
 * @param {string} [props.className] - کلاس سفارشی اختیاری
 */
export default function PriceWithHint({
  price,
  originalPrice = null,
  hideHint = false,
  size = 'md',
  className = '',
}) {
  const { tomanPerNoor } = useDisplayRate();

  const numericPrice = Number(price) || 0;
  const numericOriginal = originalPrice !== null && originalPrice !== undefined ? Number(originalPrice) : null;
  const hasDiscount = numericOriginal !== null && numericOriginal > numericPrice;

  const hintText = !hideHint && tomanPerNoor ? formatTomanHint(numericPrice, tomanPerNoor) : null;

  const sizeClass = size === 'sm' ? styles.sizeSm : size === 'lg' ? styles.sizeLg : '';

  if (numericPrice <= 0 && (!numericOriginal || numericOriginal <= 0)) {
    return (
      <div className={`${styles.priceContainer} ${sizeClass} ${className}`.trim()}>
        <span className={styles.currentPrice} style={{ color: '#4ade80' }}>
          رایگان
        </span>
      </div>
    );
  }

  return (
    <div className={`${styles.priceContainer} ${sizeClass} ${className}`.trim()}>
      <div className={styles.priceRow}>
        {hasDiscount && (
          <del className={styles.originalPrice}>
            {formatNoor(numericOriginal)} نور
          </del>
        )}
        <span className={styles.currentPrice}>
          {formatNoor(numericPrice)} <span className={styles.unit}>نور</span>
        </span>
      </div>

      {hintText && (
        <span className={styles.tomanHint}>
          ({hintText})
        </span>
      )}
    </div>
  );
}
