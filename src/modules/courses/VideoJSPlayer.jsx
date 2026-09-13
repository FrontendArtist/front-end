'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Maximize,
  Minimize,
  Volume2,
  VolumeX,
} from 'lucide-react';
import styles from './VideoJSPlayer.module.scss';

/**
 * فرمت‌بندی ثانیه به فرمت زمان mm:ss یا hh:mm:ss
 */
function formatTime(seconds) {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  }
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

/**
 * کامپوننت پلیر اختصاصی React با قابلیت شخصی‌سازی آسان در JSX و SCSS
 */
export default function VideoJSPlayer({ options, onReady, courseId, lessonId, isAudio, user }) {
  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const hideTimerRef = useRef(null);

  // استیت‌های پلیر
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bufferedPercent, setBufferedPercent] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);

  // استخراج آدرس منبع و پوستر از options
  const videoSrc = options?.sources?.[0]?.src || '';
  const posterSrc = options?.poster || '';

  // مدیریت مخفی‌سازی خودکار نوار کنترل هنگام پخش
  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    if (isPlaying && !isAudio) {
      hideTimerRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  }, [isPlaying, isAudio]);

  const handleMouseMove = () => {
    resetHideTimer();
  };

  const handleMouseLeave = () => {
    if (isPlaying && !isAudio) {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      setShowControls(false);
    }
  };

  // اکشن‌های پخش
  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  };

  const skipSeconds = (seconds) => {
    const video = videoRef.current;
    if (!video) return;
    const newTime = Math.max(0, Math.min(video.currentTime + seconds, duration || video.duration));
    video.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleSeek = (e) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    const nextMuted = !isMuted;
    video.muted = nextMuted;
    setIsMuted(nextMuted);
  };

  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
      setIsMuted(val === 0);
    }
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      if (container.requestFullscreen) {
        container.requestFullscreen().catch(() => {});
      } else if (container.webkitRequestFullscreen) {
        container.webkitRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      }
    }
  };

  // گوش دادن به تغییر حالت Fullscreen
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  // ذخیره‌سازی و بازیابی پیشرفت (Resume Playback)
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !courseId || !lessonId) return;

    const cleanLessonId = String(lessonId).replace('-video', '').replace('-audio', '');
    const storageKey = `media_progress_c${courseId}_l${cleanLessonId}`;
    let hasRestored = false;

    const restoreProgress = () => {
      if (hasRestored) return;
      const saved = localStorage.getItem(storageKey);
      if (!saved || isNaN(saved)) {
        hasRestored = true;
        return;
      }
      const time = parseFloat(saved);
      if (time > 0 && (!video.duration || time < video.duration)) {
        video.currentTime = time;
      }
      hasRestored = true;
    };

    video.addEventListener('loadedmetadata', restoreProgress);
    video.addEventListener('canplay', restoreProgress);

    let lastSaved = -1;
    const handleTimeUpdate = () => {
      const ct = video.currentTime;
      setCurrentTime(ct);

      // به‌روزرسانی نوار بافر
      if (video.buffered && video.buffered.length > 0 && video.duration > 0) {
        const bufEnd = video.buffered.end(video.buffered.length - 1);
        setBufferedPercent((bufEnd / video.duration) * 100);
      }

      // ذخیره در localStorage هر ۵ ثانیه
      const sec = Math.floor(ct);
      if (sec > 0 && sec % 5 === 0 && sec !== lastSaved) {
        localStorage.setItem(storageKey, ct.toString());
        lastSaved = sec;
      }
    };

    const handleEnded = () => {
      localStorage.removeItem(storageKey);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('loadedmetadata', restoreProgress);
      video.removeEventListener('canplay', restoreProgress);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('ended', handleEnded);
    };
  }, [courseId, lessonId, videoSrc]);

  // رویدادهای اصلی ویدیو
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay = () => {
      setIsPlaying(true);
      resetHideTimer();
    };

    const onPause = () => {
      setIsPlaying(false);
      setShowControls(true);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };

    const onLoadedMetadata = () => {
      setDuration(video.duration || 0);
    };

    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('loadedmetadata', onLoadedMetadata);

    if (onReady) {
      onReady(video);
    }

    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [onReady, resetHideTimer]);

  // مسدودسازی کلیدهای میانبر ذخیره صفحه و کلیک راست
  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && ['s', 'S', 'u', 'U'].includes(e.key)) {
      e.preventDefault();
    }
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className={styles.playerWrapper}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onTouchStart={resetHideTimer}
      onContextMenu={(e) => e.preventDefault()}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* عنصر ویدیو نیتیو با پروتکل‌های ضد دانلود */}
      <video
        ref={videoRef}
        className={styles.videoElement}
        src={videoSrc}
        poster={posterSrc}
        playsInline
        controlsList="nodownload"
        disablePictureInPicture
        onContextMenu={(e) => e.preventDefault()}
        onClick={togglePlay}
        onDoubleClick={toggleFullscreen}
      />

      {/* کلیک روی صفحه جهت پخش/توقف */}
      <div
        className={styles.clickOverlay}
        onClick={togglePlay}
        onDoubleClick={toggleFullscreen}
      />

      {/* دکمه بزرگ پخش در مرکز صفحه هنگامی که ویدیو متوقف است */}
      {!isPlaying && (
        <button
          type="button"
          className={styles.centerPlayBtn}
          onClick={togglePlay}
          aria-label="پخش ویدیو"
        >
          <Play />
        </button>
      )}

      {/* =========================================================================
          نوار کنترل ۲ ردیفه سفارشی (کنترل کامل در JSX و SCSS بدون هیچ محدودیت)
          ========================================================================= */}
      <div
        className={`${styles.controlsBar} ${
          !showControls && isPlaying ? styles.controlsHidden : ''
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ردیف بالا: زمان در سمت چپ / دکمه‌ها در سمت راست */}
        <div className={styles.topRow}>
          <div className={styles.timeDisplay}>
            <span>{formatTime(currentTime)}</span>
            <span className={styles.timeDivider}>/</span>
            <span className={styles.durationText}>{formatTime(duration)}</span>
          </div>

          <div className={styles.rightControls}>
            <button
              type="button"
              className={styles.iconBtn}
              onClick={() => skipSeconds(-10)}
              title="۱۰ ثانیه عقب"
            >
              <RotateCcw />
            </button>

            <button
              type="button"
              className={styles.iconBtn}
              onClick={togglePlay}
              title={isPlaying ? 'توقف' : 'پخش'}
            >
              {isPlaying ? <Pause /> : <Play />}
            </button>

            <button
              type="button"
              className={styles.iconBtn}
              onClick={() => skipSeconds(10)}
              title="۱۰ ثانیه جلو"
            >
              <RotateCw />
            </button>

            <button
              type="button"
              className={styles.iconBtn}
              onClick={toggleFullscreen}
              title={isFullscreen ? 'خروج از تمام‌صفحه' : 'تمام‌صفحه'}
            >
              {isFullscreen ? <Minimize /> : <Maximize />}
            </button>
          </div>
        </div>

        {/* ردیف پایین: نوار پیشرفت (Progress Bar) و ولوم */}
        <div className={styles.bottomRow}>
          <div className={styles.progressContainer}>
            <div className={styles.progressTrack}>
              <div
                className={styles.bufferBar}
                style={{ width: `${bufferedPercent}%` }}
              />
              <div
                className={styles.playedBar}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div
              className={styles.progressThumb}
              style={{ left: `${progressPercent}%` }}
            />
            <input
              type="range"
              min={0}
              max={duration || 1}
              step={0.1}
              value={currentTime}
              onChange={handleSeek}
              className={styles.rangeInput}
              aria-label="نوار پیشرفت ویدیو"
            />
          </div>

          <div className={styles.volumeGroup}>
            <button
              type="button"
              className={styles.iconBtn}
              onClick={toggleMute}
              title={isMuted || volume === 0 ? 'وصل صدا' : 'قطع صدا'}
            >
              {isMuted || volume === 0 ? <VolumeX /> : <Volume2 />}
            </button>
            <div className={styles.volumeSliderWrapper}>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className={styles.volumeRange}
                aria-label="تنظیم صدا"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
