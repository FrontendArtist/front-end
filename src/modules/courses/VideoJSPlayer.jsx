'use client';

import React, { useEffect, useRef } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';

/**
 * کامپوننت پلیر اختصاصی Video.js برای پخش ویدیو و صوت
 * این کامپوننت وظیفه رندر پلیر، مدیریت پخش و ذخیره‌سازی/بازیابی خودکار پیشرفت کاربر (Resume Playback) را بر عهده دارد.
 *
 * @param {Object} props.options - تنظیمات استاندارد Video.js
 * @param {Function} props.onReady - کال‌بک آماده شدن پلیر
 * @param {string} props.courseId - شناسه دوره
 * @param {string} props.lessonId - شناسه جلسه
 * @param {boolean} props.isAudio - آیا محتوای صوتی است
 * @param {Object} props.user - اطلاعات کاربر (اختیاری)
 */
export default function VideoJSPlayer({ options, onReady, courseId, lessonId, isAudio, user }) {
  const videoRef = useRef(null);
  const playerRef = useRef(null);
  const currentSrcRef = useRef(null);

  useEffect(() => {
    // 1. مقداردهی اولیه پلیر
    if (!playerRef.current) {
      const videoElement = document.createElement(isAudio ? 'audio' : 'video');
      videoElement.classList.add('video-js', 'vjs-big-play-centered');
      videoElement.setAttribute('controlsList', 'nodownload');
      videoElement.setAttribute('disablePictureInPicture', 'true');
      videoElement.setAttribute('oncontextmenu', 'return false;');
      videoElement.addEventListener('contextmenu', (e) => e.preventDefault());

      videoRef.current.appendChild(videoElement);

      // تنظیمات پیش‌فرض شامل دکمه‌های ۱۰ ثانیه جلو و عقب
      const mergedOptions = {
        ...options,
        controlBar: {
          skipButtons: { forward: 10, backward: 10 },
          ...(options?.controlBar || {}),
        },
      };

      // اینیشیالایز پلیر Video.js روی عنصر ساخته شده
      const player = (playerRef.current = videojs(videoElement, mergedOptions, () => {
        videojs.log('Player is ready');
        if (onReady) onReady(player);

        const el = player.el();
        if (el) {
          // مسدودسازی کلیک راست روی کل کانتینر پلیر
          el.addEventListener('contextmenu', (e) => e.preventDefault());
          // مسدودسازی کلیدهای میانبر ذخیره صفحه و مدیا
          el.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S' || e.key === 'u' || e.key === 'U')) {
              e.preventDefault();
            }
          });
        }

        // آیکون‌های سفارشی ۱۰ ثانیه
        const REPLAY_10_SVG = `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M11.99 5V1l-5 5 5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6h-2c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/><path d="M10.89 16h-.85v-3.26l-1.01.31v-.69l1.77-.63h.09zM15.17 14.24c0 .32-.03.6-.1.82s-.17.42-.29.57-.28.26-.45.33-.37.1-.59.1-.41-.03-.59-.1-.33-.18-.46-.33-.23-.34-.3-.57-.11-.5-.11-.82v-.74c0-.32.03-.6.1-.82s.17-.42.29-.57.28-.26.45-.33.37-.1.59-.1.41.03.59.1.33.18.46.33.23.34.3.57.11.5.11.82zm-.85-.86c0-.19-.01-.35-.04-.48s-.07-.23-.12-.31-.11-.14-.19-.17-.16-.05-.25-.05-.18.02-.25.05-.14.09-.19.17-.09.18-.12.31-.04.29-.04.48v-.97c0 .19.01.35.04.48s.07.24.12.32.11.14.19.17.16.05.25.05.18-.02.25-.05.14-.09.19-.17.09-.19.11-.32.04-.29.04.48v-.97z"/></svg>`;
        const FORWARD_10_SVG = `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M18 13c0 3.31-2.69 6-6 6s-6-2.69-6-6 2.69-6 6-6v4l5-5-5-5v4c-4.42 0-8 3.58-8 8s3.58 8 8 8 8-3.58 8-8z"/><path d="M10.86 15.94v-4.27h-.09L9 12.3v.69l1.01-.31v3.26zM12.25 13.44v.74c0 1.9 1.31 1.82 1.44 1.82.14 0 1.44.09 1.44-1.82v-.74c0-1.9-1.31-1.82-1.44-1.82-.14 0-1.44-.09-1.44 1.82m2.04-.12v.97c0 .77-.21 1.03-.59 1.03s-.6-.26-.6-1.03v-.97c0-.75.22-1.01.59-1.01.38-.01.6.26.6 1.01"/></svg>`;

        const updateIcons = () => {
          const backBtn = el.querySelector('.vjs-skip-backward-10');
          if (backBtn) {
            backBtn.title = '۱۰ ثانیه عقب';
            const placeholder = backBtn.querySelector('.vjs-icon-placeholder');
            if (placeholder) placeholder.innerHTML = REPLAY_10_SVG;
            backBtn.addEventListener('touchend', () => setTimeout(() => backBtn.blur(), 50), { passive: true });
            backBtn.addEventListener('mouseup', () => setTimeout(() => backBtn.blur(), 50), { passive: true });
          }
          const fwdBtn = el.querySelector('.vjs-skip-forward-10');
          if (fwdBtn) {
            fwdBtn.title = '۱۰ ثانیه جلو';
            const placeholder = fwdBtn.querySelector('.vjs-icon-placeholder');
            if (placeholder) placeholder.innerHTML = FORWARD_10_SVG;
            fwdBtn.addEventListener('touchend', () => setTimeout(() => fwdBtn.blur(), 50), { passive: true });
            fwdBtn.addEventListener('mouseup', () => setTimeout(() => fwdBtn.blur(), 50), { passive: true });
          }
        };
        player.ready(updateIcons);
        setTimeout(updateIcons, 100);

        // ذخیره‌سازی پیشرفت
        const cleanLessonId = String(lessonId).replace('-video', '').replace('-audio', '');
        const storageKey = `media_progress_c${courseId}_l${cleanLessonId}`;
        let hasRestored = false;
        const restoreProgress = () => {
          if (hasRestored) return;
          const saved = localStorage.getItem(storageKey);
          if (!saved || isNaN(saved)) { hasRestored = true; return; }
          const time = parseFloat(saved);
          if (time <= 0) { hasRestored = true; return; }
          if (player.readyState() >= 1 || (player.duration && player.duration() > 0)) {
            if (!player.duration() || time < player.duration()) player.currentTime(time);
            hasRestored = true;
          }
        };
        player.on('loadedmetadata', restoreProgress);
        player.on('canplay', restoreProgress);
        player.on('play', () => { if (!hasRestored) restoreProgress(); });
        if (player.readyState() >= 1) restoreProgress();

        let lastSaved = -1;
        player.on('timeupdate', () => {
          if (!hasRestored) return;
          const ct = player.currentTime();
          const sec = Math.floor(ct);
          if (sec > 0 && sec % 5 === 0 && sec !== lastSaved) {
            localStorage.setItem(storageKey, ct.toString());
            lastSaved = sec;
          }
        });
        player.on('pause', () => {
          if (!hasRestored) return;
          const ct = player.currentTime();
          if (ct > 0) localStorage.setItem(storageKey, ct.toString());
        });
        player.on('ended', () => localStorage.removeItem(storageKey));
      }));
    } else {
      // به‌روزرسانی منبع در صورت تغییر
      const player = playerRef.current;
      const newSrc = options?.sources?.[0]?.src;
      if (newSrc && newSrc !== currentSrcRef.current) {
        currentSrcRef.current = newSrc;
        player.src(options.sources);
        if (options.poster) player.poster(options.poster);
      }
    }
  }, [options, courseId, lessonId, isAudio, user, onReady]);

  // پاک‌سازی هنگام unmount
  useEffect(() => {
    const player = playerRef.current;
    return () => {
      if (player && !player.isDisposed()) {
        player.dispose();
        playerRef.current = null;
      }
    };
  }, []);

  return (
    <div data-vjs-player style={{ width: '100%', position: 'relative', overflow: 'hidden' }} onContextMenu={(e) => e.preventDefault()}>
      <div ref={videoRef} onContextMenu={(e) => e.preventDefault()} />
    </div>
  );
}
