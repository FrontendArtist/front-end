'use client';

import { useState, useEffect } from 'react';
import useOfflineAudio from '@/hooks/useOfflineAudio';
import { formatFileSize } from '@/lib/offlineAudioDB';
import styles from './DownloadButton.module.scss';

/**
 * DownloadButton — دکمه دانلود آفلاین برای هر جلسه
 *
 * چهار حالت:
 *  1. آماده دانلود   → دکمه «دانلود (حجم)»
 *  2. در حال دانلود  → Progress bar + درصد + دکمه Pause
 *  3. متوقف شده      → درصد حفظ‌شده + دکمه ادامه + دکمه حذف
 *  4. دانلود شده     → بج «آفلاین» + دکمه حذف
 */
export default function DownloadButton({
  lessonId,
  audioUrl,
  courseId,
  courseTitle = '',
  courseSlug = '',
  chapterId = '',
  chapterTitle = '',
  title,
  duration = '',
  size = '',
  onLocalSrc,
}) {
  const [fetchedSize, setFetchedSize] = useState('');

  useEffect(() => {
    if (size) return;
    if (!audioUrl) return;

    let isMounted = true;
    fetch(audioUrl, { method: 'HEAD' })
      .then((res) => {
        const len = res.headers.get('content-length');
        if (len && isMounted) {
          const bytes = parseInt(len, 10);
          if (bytes > 0) {
            setFetchedSize(formatFileSize(bytes));
          }
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [audioUrl, size]);

  const displaySize = size || fetchedSize;

  const {
    isDownloaded,
    isDownloading,
    isPaused,
    downloadProgress,
    downloadError,
    localSrc,
    downloadLesson,
    pauseDownload,
    removeLesson,
  } = useOfflineAudio({
    lessonId,
    audioUrl,
    courseId,
    courseTitle,
    courseSlug,
    chapterId,
    chapterTitle,
    title,
    duration,
  });

  if (localSrc && onLocalSrc) onLocalSrc(localSrc);
  if (!audioUrl) return null;

  const stop = (e) => e.stopPropagation();

  return (
    <div className={styles.wrapper} onClick={stop}>

      {/* ── حالت ۴: دانلود کامل ─────────────────────────────────────── */}
      {isDownloaded && (
        <div className={styles.savedGroup}>
          <span className={styles.savedBadge}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            آفلاین
          </span>
          <button
            className={styles.iconBtn}
            onClick={removeLesson}
            title="حذف از حافظه مرورگر"
            aria-label="حذف فایل"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6M14 11v6" />
            </svg>
          </button>
        </div>
      )}

      {/* ── حالت ۲: در حال دانلود ───────────────────────────────────── */}
      {isDownloading && (
        <div className={styles.progressGroup}>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${downloadProgress}%` }} />
          </div>
          <span className={styles.progressText}>{downloadProgress}٪</span>

          {/* دکمه Pause */}
          <button
            className={styles.iconBtn}
            onClick={pauseDownload}
            title="توقف موقت دانلود"
            aria-label="توقف دانلود"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          </button>

          {/* دکمه حذف */}
          <button
            className={`${styles.iconBtn} ${styles.danger}`}
            onClick={removeLesson}
            title="لغو و حذف"
            aria-label="لغو دانلود"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}

      {/* ── حالت ۳: متوقف (Paused) ──────────────────────────────────── */}
      {isPaused && !isDownloading && !isDownloaded && (
        <div className={styles.pausedGroup}>
          <div className={styles.progressBar}>
            <div className={`${styles.progressFill} ${styles.paused}`} style={{ width: `${downloadProgress}%` }} />
          </div>
          <span className={styles.progressText}>{downloadProgress}٪</span>

          {/* دکمه ادامه */}
          <button
            className={`${styles.iconBtn} ${styles.resume}`}
            onClick={downloadLesson}
            title="ادامه دانلود"
            aria-label="ادامه دانلود"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          </button>

          {/* دکمه حذف */}
          <button
            className={`${styles.iconBtn} ${styles.danger}`}
            onClick={removeLesson}
            title="لغو و حذف"
            aria-label="لغو دانلود"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}

      {/* ── حالت ۱: آماده دانلود (یا خطا → تلاش مجدد) ─────────────── */}
      {!isDownloaded && !isDownloading && !isPaused && (
        <button
          className={`${styles.downloadBtn} ${downloadError ? styles.error : ''}`}
          onClick={downloadLesson}
          title={downloadError || 'دانلود برای پخش آفلاین'}
          aria-label="دانلود جلسه"
        >
          {downloadError ? (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 1 0 .49-4" />
            </svg>
          ) : (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          )}
          {downloadError ? 'تلاش مجدد' : displaySize ? `دانلود (${displaySize})` : 'دانلود'}
        </button>
      )}

    </div>
  );
}
