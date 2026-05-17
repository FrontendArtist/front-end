'use client';

import React, { useEffect, useRef } from 'react';

/**
 * کامپوننت پلیر صوتی Plyr
 * از کتابخانه Plyr برای پخش فایل‌های صوتی با استایل پیش‌فرض و حرفه‌ای استفاده می‌کند.
 * Plyr به صورت dynamic import لود می‌شود تا مشکل SSR (document is not defined) رخ ندهد.
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

      // --- سیستم بازیابی پیشرفت پخش ---
      const storageKey = `plyr_progress_c${courseId}_l${lessonId}`;

      player.on('ready', () => {
        const savedTime = localStorage.getItem(storageKey);
        if (savedTime && !isNaN(savedTime)) {
          player.currentTime = parseFloat(savedTime);
        }
      });

      // ذخیره پیشرفت هر ۵ ثانیه (0, 5, 10, 15, ...)
      let lastSavedSecond = -1;
      player.on('timeupdate', () => {
        const currentSecond = Math.floor(player.currentTime);
        // فقط زمانی ذخیره کن که به مضرب 5 جدیدی رسیده باشیم
        if (currentSecond % 5 === 0 && currentSecond !== lastSavedSecond) {
          localStorage.setItem(storageKey, player.currentTime.toString());
          lastSavedSecond = currentSecond;
        }
      });

      // ذخیره‌سازی فوری هنگام توقف (pause/stop) — زمان دقیق توقف ذخیره می‌شود
      player.on('pause', () => {
        localStorage.setItem(storageKey, player.currentTime.toString());
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
