'use client';

import React, { useEffect, useRef } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';

/**
 * کامپوننت پلیر اختصاصی Video.js برای پخش ویدیو و صوت
 * این کامپوننت وظیفه رندر پلیر، مدیریت پخش و ذخیره‌سازی/بازیابی خودکار پیشرفت کاربر (Resume Playback) را بر عهده دارد.
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
  const currentSrcRef = useRef(options?.sources?.[0]?.src);

  useEffect(() => {
    // 1. مقداردهی اولیه پلیر (تنها در صورتی که پلیر قبلاً ساخته نشده باشد)
    if (!playerRef.current) {
      // ساخت عنصر ویدیویی/صوتی متناسب با نوع محتوا
      const videoElement = document.createElement(isAudio ? 'audio' : 'video');
      videoElement.classList.add('video-js', 'vjs-big-play-centered');

      videoRef.current.appendChild(videoElement);

      // اینیشیالایز پلیر Video.js روی عنصر ساخته شده
      const player = (playerRef.current = videojs(videoElement, options, () => {
        videojs.log('Player is ready');
        if (onReady) {
          onReady(player);
        }

        // --- کلید یکتا برای ذخیره‌سازی زمان هر جلسه از هر دوره ---
        const cleanLessonId = String(lessonId).replace('-video', '').replace('-audio', '');
        const storageKey = `media_progress_c${courseId}_l${cleanLessonId}`;

        // --- سیستم بازیابی پیشرفت پخش (Resume Playback) ---
        const restoreProgress = () => {
          const savedTime = localStorage.getItem(storageKey);
          if (savedTime && !isNaN(savedTime)) {
            const time = parseFloat(savedTime);
            if (time > 0 && (!player.duration() || time < player.duration())) {
              player.currentTime(time);
            }
          }
        };

        player.one('loadedmetadata', restoreProgress);
        if (player.readyState() >= 1) {
          restoreProgress();
        }

        // --- سیستم ذخیره‌سازی زمان فعلی کاربر ---
        let lastSavedSecond = -1;
        player.on('timeupdate', () => {
          const currentTime = player.currentTime();
          const currentSecond = Math.floor(currentTime);

          if (currentSecond > 0 && currentSecond % 5 === 0 && currentSecond !== lastSavedSecond) {
            localStorage.setItem(storageKey, currentTime.toString());
            lastSavedSecond = currentSecond;
          }
        });

        // ذخیره‌سازی فوری هنگام توقف (pause/stop)
        player.on('pause', () => {
          const currentTime = player.currentTime();
          if (currentTime > 0) {
            localStorage.setItem(storageKey, currentTime.toString());
          }
        });

        // پاکسازی لوکال استوریج پس از پایان کامل ویدیو
        player.on('ended', () => {
          localStorage.removeItem(storageKey);
        });
      }));
    } else {
      // 2. فقط در صورت تغییر واقعی آدرس منبع ویدیو (src)، آدرس ویدیوی پلیر تغییر پیدا کند
      // جلوگیری از ریست شدن منبع ویدیو در هنگام جلو/عقب زدن ویدیو یا رندر مجدد کامپوننت
      const player = playerRef.current;
      const newSrc = options?.sources?.[0]?.src;
      if (newSrc && newSrc !== currentSrcRef.current) {
        currentSrcRef.current = newSrc;
        player.src(options.sources);
        if (options.poster) {
          player.poster(options.poster);
        }
      }
    }
  }, [options, videoRef, courseId, lessonId, isAudio, onReady]);

  // 3. مکانیزم Disposal: از بین بردن شیء پلیر در هنگام Unmount برای جلوگیری از مموری لیک
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
