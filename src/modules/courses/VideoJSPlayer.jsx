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
      videoElement.classList.add('video-js', 'vjs-big-play-centered', 'vjs-fill');
      videoElement.setAttribute('controlsList', 'nodownload');
      videoElement.setAttribute('disablePictureInPicture', 'true');
      videoElement.setAttribute('oncontextmenu', 'return false;');
      videoElement.addEventListener('contextmenu', (e) => e.preventDefault());
      videoElement.style.width = '100%';
      videoElement.style.height = '100%';

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

        const updateIcons = () => {
          const backBtn = el.querySelector('.vjs-skip-backward-10');
          if (backBtn) {
            backBtn.title = '۱۰ ثانیه عقب';
            const placeholder = backBtn.querySelector('.vjs-icon-placeholder');

            backBtn.addEventListener('touchend', () => setTimeout(() => backBtn.blur(), 50), { passive: true });
            backBtn.addEventListener('mouseup', () => setTimeout(() => backBtn.blur(), 50), { passive: true });
          }
          const fwdBtn = el.querySelector('.vjs-skip-forward-10');
          if (fwdBtn) {
            fwdBtn.title = '۱۰ ثانیه جلو';
            const placeholder = fwdBtn.querySelector('.vjs-icon-placeholder');

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
    <div data-vjs-player style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }} onContextMenu={(e) => e.preventDefault()}>
      <div ref={videoRef} style={{ width: '100%', height: '100%' }} onContextMenu={(e) => e.preventDefault()} />
    </div>
  );
}
