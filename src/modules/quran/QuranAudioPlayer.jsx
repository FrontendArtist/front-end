'use client';

/**
 * @file src/modules/quran/QuranAudioPlayer.jsx
 * @description نوار پخش پیوسته و شناور آیات قرآن در انتهای صفحه (Sticky Audio Player)
 */

import React, { useRef } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  X,
} from 'lucide-react';
import styles from './QuranAudioPlayer.module.scss';

/**
 * تبدیل ثانیه به فرمت mm:ss
 * @param {number} sec
 * @returns {string}
 */
function formatTime(sec) {
  if (isNaN(sec) || sec < 0) return '00:00';
  const minutes = Math.floor(sec / 60);
  const seconds = Math.floor(sec % 60);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * @param {{
 *   surahNameFa: string,
 *   currentVerseNumber: number,
 *   totalVerses: number,
 *   currentStep: 'arabic' | 'persian' | 'tafsir',
 *   isPlaying: boolean,
 *   currentTime: number,
 *   duration: number,
 *   autoScroll: boolean,
 *   onPlayPause: () => void,
 *   onNextVerse: () => void,
 *   onPrevVerse: () => void,
 *   onSeek: (seconds: number) => void,
 *   onClose: () => void,
 *   onToggleAutoScroll: () => void,
 * }} props
 */
export default function QuranAudioPlayer({
  surahNameFa,
  currentVerseNumber,
  totalVerses,
  currentStep,
  isPlaying,
  currentTime,
  duration,
  autoScroll,
  reciterName,
  onPlayPause,
  onNextVerse,
  onPrevVerse,
  onSeek,
  onClose,
  onToggleAutoScroll,
}) {
  const progressBarRef = useRef(null);

  const progressPercent = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  const handleProgressBarClick = (e) => {
    if (!progressBarRef.current || !duration) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    // در چیدمان RTL، کلیک از راست محاسبه می‌شود
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const ratio = Math.max(0, Math.min(1, (width - clickX) / width));
    onSeek(ratio * duration);
  };

  const getStepLabel = () => {
    switch (currentStep) {
      case 'arabic':
        return reciterName ? `قرائت عربی (${reciterName})` : 'قرائت عربی';
      case 'persian':
        return 'ترجمه صوتی';
      case 'tafsir':
        return 'تفسیر صوتی';
      default:
        return 'در حال بارگذاری...';
    }
  };

  return (
    <aside
      className={styles.playerBar}
      aria-label="پخش‌کننده صوتی پیوسته قرآن"
      role="region"
    >
      <div className={styles.playerInner}>
        {/* نوار پیشرفت زمان */}
        <div className={styles.progressContainer}>
          <span className={styles.timeText}>{formatTime(currentTime)}</span>
          <div
            ref={progressBarRef}
            className={styles.progressBar}
            onClick={handleProgressBarClick}
            role="slider"
            aria-label="نوار پیشرفت صوت"
            aria-valuemin={0}
            aria-valuemax={duration || 100}
            aria-valuenow={currentTime || 0}
            tabIndex={0}
          >
            <div
              className={styles.progressFill}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className={styles.timeText}>{formatTime(duration)}</span>
        </div>

        {/* ردیف کنترل‌ها و اطلاعات آیه */}
        <div className={styles.controlsRow}>
          {/* سمت راست: اطلاعات آیه و مرحله در حال پخش */}
          <div className={styles.trackInfo}>
            <span className={styles.verseBadge}>
              آیه {currentVerseNumber} از {totalVerses}
            </span>
            <div className={styles.trackTitles}>
              <div className={styles.surahTitle}>سوره {surahNameFa}</div>
              <div
                className={`${styles.stageIndicator} ${
                  styles[`stageIndicator--${currentStep}`] || ''
                }`}
              >
                <span
                  className={`${styles.stageDot} ${
                    styles[`stageDot--${currentStep}`] || ''
                  }`}
                />
                <span>{getStepLabel()}</span>
              </div>
            </div>
          </div>

          {/* مرکز: دکمه‌های ناوبری و پخش */}
          <div className={styles.playbackButtons}>
            {/* آیه قبلی */}
            <button
              type="button"
              className={styles.navBtn}
              onClick={onPrevVerse}
              disabled={currentVerseNumber <= 1}
              aria-label="آیه قبلی"
              title="آیه قبلی"
            >
              <SkipForward size={18} aria-hidden="true" />
            </button>

            {/* پخش / توقف اصلی */}
            <button
              type="button"
              className={styles.playPauseBtn}
              onClick={onPlayPause}
              aria-label={isPlaying ? 'توقف پخش' : 'شروع پخش'}
              title={isPlaying ? 'توقف' : 'پخش'}
            >
              {isPlaying ? (
                <Pause size={22} fill="currentColor" aria-hidden="true" />
              ) : (
                <Play size={22} fill="currentColor" aria-hidden="true" />
              )}
            </button>

            {/* آیه بعدی */}
            <button
              type="button"
              className={styles.navBtn}
              onClick={onNextVerse}
              disabled={currentVerseNumber >= totalVerses}
              aria-label="آیه بعدی"
              title="آیه بعدی"
            >
              <SkipBack size={18} aria-hidden="true" />
            </button>
          </div>

          {/* سمت چپ: دکمه بستن */}
          <div className={styles.extraTools}>
            <button
              type="button"
              className={styles.closeBtn}
              onClick={onClose}
              aria-label="بستن پخش‌کننده"
              title="بستن"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
