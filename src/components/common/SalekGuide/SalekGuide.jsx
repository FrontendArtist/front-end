'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Compass, ArrowLeft, X, Sparkles } from 'lucide-react';
import styles from './SalekGuide.module.scss';

const DEFAULT_CONFIG = {
  isActive: true,
  message: 'آیا نقشه راه سالک رو دیدی؟',
  subText: 'مسیر گام‌به‌گام دوره‌ها و خودشناسی در طرح الهی',
  buttonText: 'مشاهده نقشه راه',
  buttonLink: '/roadmap',
};

export default function SalekGuide() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  // 'hidden' | 'peeking' | 'open'
  const [guideState, setGuideState] = useState('hidden');
  const [config, setConfig] = useState(DEFAULT_CONFIG);

  const containerRef = useRef(null);
  const timersRef = useRef({
    initial: null,
    autoHide: null,
    hoverLeave: null,
  });

  const clearAllTimers = () => {
    if (timersRef.current.initial) clearTimeout(timersRef.current.initial);
    if (timersRef.current.autoHide) clearTimeout(timersRef.current.autoHide);
    if (timersRef.current.hoverLeave) clearTimeout(timersRef.current.hoverLeave);
  };

  // تایمر بسته‌شدن خودکار و بازگشت به حالت سرک کشیدن
  const startAutoHideTimer = (seconds = 6) => {
    if (timersRef.current.autoHide) {
      clearTimeout(timersRef.current.autoHide);
    }
    timersRef.current.autoHide = setTimeout(() => {
      setGuideState((current) => (current === 'open' ? 'peeking' : current));
    }, seconds * 1000);
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    let isSubscribed = true;

    async function initGuide() {
      // دریافت تنظیمات داینامیک از بک‌اند
      let activeConfig = DEFAULT_CONFIG;
      try {
        const response = await fetch('/api/salek-guide', { cache: 'no-store' });
        if (response.ok) {
          const result = await response.json();
          if (result?.success && result?.data) {
            activeConfig = {
              isActive: result.data.isActive ?? true,
              message: result.data.message || DEFAULT_CONFIG.message,
              subText: result.data.subText !== undefined ? result.data.subText : DEFAULT_CONFIG.subText,
              buttonText: result.data.buttonText || DEFAULT_CONFIG.buttonText,
              buttonLink: result.data.buttonLink || DEFAULT_CONFIG.buttonLink,
            };
          }
        }
      } catch (e) {
        // در صورت عدم دسترسی به شبکه از تنظیمات پیش‌فرض استفاده می‌شود
      }

      if (!isSubscribed) return;
      setConfig(activeConfig);

      // اگر در پنل ادمین هستیم یا خود ویجت در بک‌اند غیرفعال شده باشد
      if (!activeConfig.isActive || pathname?.startsWith('/admin')) {
        setGuideState('hidden');
        return;
      }

      // اگر کاربر در حال حاضر در همان صفحه‌ای است که ویجت به آن لینک می‌دهد
      if (activeConfig.buttonLink && pathname === activeConfig.buttonLink) {
        setGuideState('hidden');
        return;
      }

      // بررسی اینکه آیا کاربر این راهنما را قبلاً بسته است
      const isDismissed = sessionStorage.getItem('salek_guide_dismissed') === 'true';
      if (isDismissed) {
        setGuideState('hidden');
        return;
      }

      // پیش‌بارگذاری تصاویر برای انیمیشن و تغییر حالت بدون لکنت و پرش
      const img1 = new Image();
      img1.src = '/images/w1.webp';
      const img2 = new Image();
      img2.src = '/images/w2.webp';

      const hasAutoShown = sessionStorage.getItem('salek_guide_auto_shown') === 'true';
      clearAllTimers();

      if (hasAutoShown) {
        // شروع ملایم در حالت سرک کشیدن در گوشه صفحه
        setGuideState('peeking');
      } else {
        // اولین ورود در این نشست: بعد از ۲.۵ ثانیه با انیمیشن کامل باز می‌شود
        timersRef.current.initial = setTimeout(() => {
          if (!isSubscribed) return;
          setGuideState('open');
          sessionStorage.setItem('salek_guide_auto_shown', 'true');

          // پس از ۷ ثانیه اگر کاری نکرد، خودکار به حالت سرک‌کشیدن می‌رود
          startAutoHideTimer(7);
        }, 2500);
      }
    }

    initGuide();

    return () => {
      isSubscribed = false;
      clearAllTimers();
    };
  }, [mounted, pathname]);

  // بستن خودکار با لمس یا کلیک بیرون از کادر
  useEffect(() => {
    if (guideState !== 'open') return;

    const handleOutsideInteraction = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        clearAllTimers();
        setGuideState('peeking');
      }
    };

    document.addEventListener('pointerdown', handleOutsideInteraction);
    return () => {
      document.removeEventListener('pointerdown', handleOutsideInteraction);
    };
  }, [guideState]);

  // مدیریت هاور دسکتاپ
  const handleMouseEnter = () => {
    if (timersRef.current.hoverLeave) clearTimeout(timersRef.current.hoverLeave);
    if (timersRef.current.autoHide) clearTimeout(timersRef.current.autoHide);
    if (guideState === 'peeking') {
      setGuideState('open');
    }
  };

  const handleMouseLeave = () => {
    if (guideState === 'open') {
      timersRef.current.hoverLeave = setTimeout(() => {
        setGuideState('peeking');
      }, 1500);
    }
  };

  // مدیریت کلیک/لمس روی کاراکتر (مخصوص موبایل و دسکتاپ)
  const handleMascotClick = (e) => {
    e.stopPropagation();
    if (timersRef.current.hoverLeave) clearTimeout(timersRef.current.hoverLeave);

    if (guideState === 'peeking') {
      setGuideState('open');
      // هندل لمس: بعد از ۵ ثانیه اگر تعاملی نبود، خودکار جمع شود
      startAutoHideTimer(5);
    } else if (guideState === 'open') {
      clearAllTimers();
      setGuideState('peeking');
    }
  };

  // تمدید زمان بسته‌شدن در حین مطالعه یا تعامل با داخل بالن
  const handleBubbleTouch = () => {
    startAutoHideTimer(5);
  };

  // بستن با ضربدر
  const handleDismiss = (e) => {
    e.stopPropagation();
    clearAllTimers();
    setGuideState('hidden');
    try {
      sessionStorage.setItem('salek_guide_dismissed', 'true');
    } catch (err) {
      // ignore
    }
  };

  // کلیک روی دکمه مقصد
  const handleActionClick = () => {
    clearAllTimers();
    setGuideState('hidden');
    try {
      sessionStorage.setItem('salek_guide_dismissed', 'true');
    } catch (err) {
      // ignore
    }
  };

  if (!mounted || guideState === 'hidden' || !config.isActive) {
    return null;
  }

  const isOpen = guideState === 'open';
  const isExternalLink = config.buttonLink?.startsWith('http://') || config.buttonLink?.startsWith('https://');

  return (
    <aside
      ref={containerRef}
      className={`${styles.guideContainer} ${isOpen ? styles.stateOpen : styles.statePeeking}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      aria-label="راهنمای سالک"
    >
      {/* بالن گفت‌وگو / کارت پیام */}
      <div
        className={`${styles.speechBubble} ${isOpen ? styles.bubbleVisible : styles.bubbleHidden}`}
        role="dialog"
        aria-live="polite"
        onClick={handleBubbleTouch}
        onTouchStart={handleBubbleTouch}
      >
        <div className={styles.bubbleHeader}>
          <div className={styles.badge}>
            <Compass size={14} className={styles.badgeIcon} />
            <span>راهنمای سالک</span>
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={handleDismiss}
            aria-label="بستن راهنما"
          >
            <X size={15} />
          </button>
        </div>

        <div className={styles.bubbleBody}>
          <h4 className={styles.questionText}>{config.message}</h4>
          {config.subText && (
            <p className={styles.subText}>{config.subText}</p>
          )}
        </div>

        <div className={styles.bubbleFooter}>
          {isExternalLink ? (
            <a
              href={config.buttonLink}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.actionBtn}
              onClick={handleActionClick}
            >
              <span>{config.buttonText}</span>
              <ArrowLeft size={16} className={styles.btnIcon} />
            </a>
          ) : (
            <Link
              href={config.buttonLink}
              className={styles.actionBtn}
              onClick={handleActionClick}
            >
              <span>{config.buttonText}</span>
              <ArrowLeft size={16} className={styles.btnIcon} />
            </Link>
          )}
        </div>

        {/* دم حباب گفت‌وگو که به سمت دست کاراکتر اشاره می‌کند */}
        <div className={styles.bubbleTail} aria-hidden="true" />
      </div>

      {/* کاراکتر سالک (تصویر بسته w1 و تصویر باز w2 روی هم با فید نرم) */}
      <div
        className={styles.mascotWrapper}
        onClick={handleMascotClick}
        role="button"
        tabIndex={0}
        aria-label={isOpen ? 'سالک راهنما' : 'باز کردن راهنمای سالک'}
      >
        <img
          src="/images/w1.webp"
          alt="سالک در حال سرک کشیدن"
          className={`${styles.characterImg} ${!isOpen ? styles.activeImg : styles.inactiveImg}`}
          draggable={false}
        />
        <img
          src="/images/w2.webp"
          alt="سالک راهنما"
          className={`${styles.characterImg} ${isOpen ? styles.activeImg : styles.inactiveImg}`}
          draggable={false}
        />

        {/* پالس و نشانگر راهنما در حالت سرک کشیدن */}
        {!isOpen && (
          <div className={styles.peekIndicator}>
            <Sparkles size={13} className={styles.sparkleIcon} />
            <span>راهنما</span>
          </div>
        )}
      </div>
    </aside>
  );
}
