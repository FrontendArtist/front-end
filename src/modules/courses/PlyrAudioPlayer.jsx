'use client';

import React, { useEffect, useRef } from 'react';

/**
 * کامپوننت پلیر صوتی Plyr
 * از کتابخانه Plyr برای پخش فایل‌های صوتی با استایل پیش‌فرض و حرفه‌ای استفاده می‌کند.
 * مدیریت کامل ذخیره‌سازی پیشرفت کاربر هر ۵ ثانیه و بازیابی خودکار زمان پخش (Resume Playback).
 *
 * @param {string} props.src - آدرس فایل صوتی
 * @param {string} props.courseId - شناسه دوره (برای ذخیره پیشرفت)
 * @param {string} props.lessonId - شناسه جلسه (برای ذخیره پیشرفت)
 */
export default function PlyrAudioPlayer({ src, courseId, lessonId }) {
  const audioRef = useRef(null);
  const playerRef = useRef(null);

  useEffect(() => {
    if (!audioRef.current) return;

    let player;

    // Dynamic import برای جلوگیری از خطای SSR
    const initPlyr = async () => {
      const PlyrModule = await import('plyr');
      const Plyr = PlyrModule.default;

      // ایمپورت CSS به صورت داینامیک
      await import('plyr/dist/plyr.css');

      player = new Plyr(audioRef.current, {
        controls: [
          'rewind',
          'play',
          'fast-forward',
          'progress',
          'current-time',
          'duration',
          'mute',
          'volume',
        ],
        seekTime: 10,
        i18n: {
          rewind: '۱۰ ثانیه عقب',
          fastForward: '۱۰ ثانیه جلو',
          play: 'پخش',
          pause: 'توقف',
          seek: 'تغییر زمان',
          played: 'پخش شده',
          duration: 'مدت زمان',
          volume: 'صدا',
          mute: 'بی‌صدا',
          unmute: 'با صدا',
        },
      });

      const REPLAY_10_SVG = `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M11.99 5V1l-5 5 5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6h-2c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/><path d="M10.89 16h-.85v-3.26l-1.01.31v-.69l1.77-.63h.09zM15.17 14.24c0 .32-.03.6-.1.82s-.17.42-.29.57-.28.26-.45.33-.37.1-.59.1-.41-.03-.59-.1-.33-.18-.46-.33-.23-.34-.3-.57-.11-.5-.11-.82v-.74c0-.32.03-.6.1-.82s.17-.42.29-.57.28-.26.45-.33.37-.1.59-.1.41.03.59.1.33.18.46.33.23.34.3.57.11.5.11.82zm-.85-.86c0-.19-.01-.35-.04-.48s-.07-.23-.12-.31-.11-.14-.19-.17-.16-.05-.25-.05-.18.02-.25.05-.14.09-.19.17-.09.18-.12.31-.04.29-.04.48v.97c0 .19.01.35.04.48s.07.24.12.32.11.14.19.17.16.05.25.05.18-.02.25-.05.14-.09.19-.17.09-.19.11-.32.04-.29.04-.48v-.97z"/></svg>`;
      const FORWARD_10_SVG = `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M18 13c0 3.31-2.69 6-6 6s-6-2.69-6-6 2.69-6 6-6v4l5-5-5-5v4c-4.42 0-8 3.58-8 8s3.58 8 8 8 8-3.58 8-8z"/><path d="M10.86 15.94v-4.27h-.09L9 12.3v.69l1.01-.31v3.26zM12.25 13.44v.74c0 1.9 1.31 1.82 1.44 1.82.14 0 1.44.09 1.44-1.82v-.74c0-1.9-1.31-1.82-1.44-1.82-.14 0-1.44-.09-1.44 1.82m2.04-.12v.97c0 .77-.21 1.03-.59 1.03s-.6-.26-.6-1.03v-.97c0-.75.22-1.01.59-1.01.38-.01.6.26.6 1.01"/></svg>`;

      const updateSkipIcons = () => {
        const container = player.elements?.container;
        if (!container) return;
        const rewindBtn = container.querySelector('[data-plyr="rewind"]');
        if (rewindBtn) {
          rewindBtn.innerHTML = REPLAY_10_SVG + '<span class="plyr__sr-only">۱۰ ثانیه عقب</span>';
          rewindBtn.addEventListener('touchend', () => setTimeout(() => rewindBtn.blur(), 50), { passive: true });
          rewindBtn.addEventListener('mouseup', () => setTimeout(() => rewindBtn.blur(), 50), { passive: true });
        }
        const fwdBtn = container.querySelector('[data-plyr="fast-forward"]');
        if (fwdBtn) {
          fwdBtn.innerHTML = FORWARD_10_SVG + '<span class="plyr__sr-only">۱۰ ثانیه جلو</span>';
          fwdBtn.addEventListener('touchend', () => setTimeout(() => fwdBtn.blur(), 50), { passive: true });
          fwdBtn.addEventListener('mouseup', () => setTimeout(() => fwdBtn.blur(), 50), { passive: true });
        }
      };

      player.on('ready', updateSkipIcons);
      setTimeout(updateSkipIcons, 100);

      playerRef.current = player;

      // --- کلید یکتا و یکپارچه ذخیره‌سازی پیشرفت پخش ---
      const cleanLessonId = String(lessonId).replace('-video', '').replace('-audio', '');
      const storageKey = `media_progress_c${courseId}_l${cleanLessonId}`;

      // --- سیستم بازیابی پیشرفت پخش صوتی ---
      let hasRestored = false;
      const restoreProgress = () => {
        if (hasRestored) return;

        const savedTime = localStorage.getItem(storageKey);
        if (!savedTime || isNaN(savedTime)) {
          hasRestored = true;
          return;
        }

        const time = parseFloat(savedTime);
        if (time <= 0) {
          hasRestored = true;
          return;
        }

        const mediaEl = audioRef.current;
        if (mediaEl && mediaEl.readyState >= 1) {
          if (!mediaEl.duration || time < mediaEl.duration) {
            player.currentTime = time;
          }
          hasRestored = true;
        }
      };

      // گوش دادن به رویدادهای مختلف آمادگی مدیا برای بازیابی قطعی زمان
      player.on('loadedmetadata', restoreProgress);
      player.on('canplay', restoreProgress);
      player.on('play', () => {
        if (!hasRestored) {
          restoreProgress();
        }
      });
      player.on('ready', () => {
        restoreProgress();
      });

      // بررسی وضعیت در صورتی که مدیا قبلاً لود شده باشد
      if (audioRef.current && audioRef.current.readyState >= 1) {
        restoreProgress();
      }

      // ذخیره پیشرفت هر ۵ ثانیه (0, 5, 10, 15, ...)
      let lastSavedSecond = -1;
      player.on('timeupdate', () => {
        if (!hasRestored) return;

        const currentTime = player.currentTime;
        const currentSecond = Math.floor(currentTime);

        // فقط زمانی ذخیره کن که به مضرب 5 جدیدی رسیده باشیم
        if (currentSecond > 0 && currentSecond % 5 === 0 && currentSecond !== lastSavedSecond) {
          localStorage.setItem(storageKey, currentTime.toString());
          lastSavedSecond = currentSecond;
        }
      });

      // ذخیره‌سازی هنگام جلو/عقب زدن کاربر (seeked)
      player.on('seeked', () => {
        if (!hasRestored) return;
        if (player.currentTime > 0) {
          localStorage.setItem(storageKey, player.currentTime.toString());
        }
      });

      // ذخیره‌سازی فوری هنگام توقف (pause/stop)
      player.on('pause', () => {
        if (!hasRestored) return;
        if (player.currentTime > 0) {
          localStorage.setItem(storageKey, player.currentTime.toString());
        }
      });

      // پاکسازی لوکال استوریج در صورت اتمام کامل صوت
      player.on('ended', () => {
        localStorage.removeItem(storageKey);
      });
    };

    initPlyr();

    // Cleanup
    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [src, courseId, lessonId]);

  return (
    <div style={{ width: '100%', padding: '16px' }}>
      <audio ref={audioRef} preload="metadata">
        <source src={src} type="audio/mp3" />
      </audio>
    </div>
  );
}
