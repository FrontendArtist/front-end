'use client';

import React, { useEffect, useRef } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';

/**
 * کامپوننت پلیر اختصاصی Video.js برای پخش ویدیو و صوت
 * این کامپوننت وظیفه رندر پلیر، مدیریت پخش و ذخیره/بازیابی پیشرفت کاربر (Resume Playback) را بر عهده دارد.
 *
 * @param {Object} props.options - تنظیمات استاندارد Video.js
 * @param {string} props.courseId - شناسه دوره (برای یکتا کردن کلید ذخیره‌سازی)
 * @param {string} props.lessonId - شناسه جلسه (برای یکتا کردن کلید ذخیره‌سازی)
 * @param {boolean} props.isAudio - مشخص می‌کند که محتوا فقط صوتی است یا خیر
 * @param {Function} props.onReady - کال‌بک در زمان آماده شدن پلیر
 */
export default function VideoJSPlayer({ options, courseId, lessonId, isAudio, onReady }) {
  const videoRef = useRef(null);
  const playerRef = useRef(null);

  useEffect(() => {
    // 1. مقداردهی اولیه پلیر (تنها در صورتی که پلیر قبلاً ساخته نشده باشد)
    if (!playerRef.current) {
      // ساخت عنصر ویدیویی/صوتی متناسب با نوع محتوا
      const videoElement = document.createElement(isAudio ? 'audio' : 'video');
      videoElement.classList.add('video-js', 'vjs-big-play-centered');

      videoRef.current.appendChild(videoElement);

      // اینیشیالایز پلیر Video.js روی عنصر ساخته شده
      const player = playerRef.current = videojs(videoElement, options, () => {
        videojs.log('Player is ready');
        if (onReady) {
          onReady(player);
        }

        // --- سیستم بازیابی پیشرفت پخش (Local Playback Persistence) ---
        // کلید یکتا برای ذخیره‌سازی زمان هر جلسه از هر دوره
        const storageKey = `vjs_progress_c${courseId}_l${lessonId}`;
        const savedTime = localStorage.getItem(storageKey);

        // اگر زمان قبلی در سیستم کاربر موجود بود، پلیر را به آن زمان می‌بریم
        if (savedTime && !isNaN(savedTime)) {
          player.currentTime(parseFloat(savedTime));
        }

        // شنونده رویداد timeupdate برای ذخیره‌سازی زمان فعلی کاربر
        // ذخیره‌سازی هر 5 ثانیه (0, 5, 10, 15, ...)
        let lastSavedSecond = -1;
        player.on('timeupdate', () => {
          const currentSecond = Math.floor(player.currentTime());
          // فقط زمانی ذخیره کن که به مضرب 5 جدیدی رسیده باشیم
          if (currentSecond % 5 === 0 && currentSecond !== lastSavedSecond) {
            localStorage.setItem(storageKey, player.currentTime().toString());
            lastSavedSecond = currentSecond;
          }
        });

        // ذخیره‌سازی فوری هنگام توقف (pause/stop) — زمان دقیق توقف ذخیره می‌شود
        player.on('pause', () => {
          localStorage.setItem(storageKey, player.currentTime().toString());
        });
      });
    } else {
      // 2. بروزرسانی تنظیمات پلیر موجود در صورت تغییر محتوا (مثلا کلیک روی یک جلسه دیگر)
      const player = playerRef.current;
      player.autoplay(options.autoplay);
      player.src(options.sources);
      if (options.poster) {
        player.poster(options.poster);
      }
    }
  }, [options, videoRef, courseId, lessonId, isAudio, onReady]);

  // 3. مکانیزم Disposal: از بین بردن شیء پلیر در هنگام Unmount شدن کامپوننت برای جلوگیری از مموری لیک
  useEffect(() => {
    const player = playerRef.current;
    return () => {
      if (player && !player.isDisposed()) {
        player.dispose();
        playerRef.current = null;
      }
    };
  }, [playerRef]);

  return (
    <div data-vjs-player style={{ width: '100%' }}>
      <div ref={videoRef} />
    </div>
  );
}
