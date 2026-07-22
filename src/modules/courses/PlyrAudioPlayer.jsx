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
          'play',
          'progress',
          'current-time',
          'duration',
          'mute',
          'volume',
        ],
      });

      playerRef.current = player;

      // --- کلید یکتا و یکپارچه ذخیره‌سازی پیشرفت پخش ---
      const cleanLessonId = String(lessonId).replace('-video', '').replace('-audio', '');
      const storageKey = `media_progress_c${courseId}_l${cleanLessonId}`;

      // --- سیستم بازیابی پیشرفت پخش صوتی (تنها یک‌بار در لود اولیه) ---
      let hasRestored = false;
      const restoreProgress = () => {
        if (hasRestored) return;
        hasRestored = true;

        const savedTime = localStorage.getItem(storageKey);
        if (savedTime && !isNaN(savedTime)) {
          const time = parseFloat(savedTime);
          if (time > 0) {
            player.currentTime = time;
          }
        }
      };

      // استفاده از once به جای on تا با هر بار جلو/عقب زدن (seek) مجدداً به زمان قبلی برنگردد
      player.once('canplay', restoreProgress);
      player.once('ready', restoreProgress);

      // ذخیره پیشرفت هر ۵ ثانیه (0, 5, 10, 15, ...)
      let lastSavedSecond = -1;
      player.on('timeupdate', () => {
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
        if (player.currentTime > 0) {
          localStorage.setItem(storageKey, player.currentTime.toString());
        }
      });

      // ذخیره‌سازی فوری هنگام توقف (pause/stop)
      player.on('pause', () => {
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
