'use client';

import React, { useState, useEffect, useMemo } from 'react';

const POSITIONS = [
  { top: '12%', left: '10%' },
  { top: '14%', right: '12%' },
  { bottom: '18%', left: '12%' },
  { bottom: '20%', right: '10%' },
  { top: '45%', left: '25%' },
  { top: '48%', right: '22%' },
];

/**
 * کامپوننت واترمارک متحرک پویا برای حفاظت از مدیاهای آموزشی
 * شماره تماس یا شناسه کاربر را با شفافیت کم و به صورت متحرک در فواصل زمانی مشخص روی تصویر نمایش می‌دهد.
 * 
 * @param {Object} props.user - اطلاعات کاربر جاری از سشن
 * @param {string} props.extraText - متن اضافی اختیاری (مثل نام سایت)
 */
export default function MediaWatermark({ user, extraText = 'طرح الهی' }) {
  const watermarkText = useMemo(() => {
    if (!user) return extraText;
    const phone = user.phoneNumber || user.phone || '';
    const name = user.name || [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || '';
    const id = user.id ? `ID: ${user.id}` : '';

    if (phone) return `${phone} • ${extraText}`;
    if (name) return `${name} • ${extraText}`;
    if (id) return `${id} • ${extraText}`;
    return extraText;
  }, [user, extraText]);

  const [posIndex, setPosIndex] = useState(0);
  const [opacity, setOpacity] = useState(0.38);

  useEffect(() => {
    // تغییر موقعیت هر ۱۲ ثانیه
    const interval = setInterval(() => {
      // تغییر ملایم فید قبل از جابجایی
      setOpacity(0.1);
      setTimeout(() => {
        setPosIndex((prev) => (prev + 1) % POSITIONS.length);
        setOpacity(0.35 + Math.random() * 0.15); // شفافیت تصادفی ملایم بین 0.35 تا 0.50
      }, 500);
    }, 12000);

    return () => clearInterval(interval);
  }, []);

  const currentPos = POSITIONS[posIndex];

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        ...currentPos,
        pointerEvents: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        zIndex: 25,
        color: 'rgba(255, 255, 255, 0.85)',
        opacity: opacity,
        fontSize: '13px',
        fontWeight: '600',
        letterSpacing: '1px',
        direction: 'ltr',
        padding: '3px 8px',
        borderRadius: '4px',
        background: 'rgba(0, 0, 0, 0.25)',
        backdropFilter: 'blur(1px)',
        textShadow: '0 1px 3px rgba(0, 0, 0, 0.9)',
        transform: 'rotate(-8deg)',
        transition: 'all 1s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      <span>{watermarkText}</span>
    </div>
  );
}
