'use client';

/**
 * @file src/modules/quran/VerseCard.jsx
 * @description کامپوننت نمایش یک آیه قرآنی با قابلیت همگام‌سازی دوطرفه با پلیر پیوسته (Continuous Player)
 */

import React, { useState } from 'react';
import { Play, Pause, BookOpen, Volume2 } from 'lucide-react';
import { getRazaviAudioUrl } from '@/utils/quranAudio';
import styles from './VerseCard.module.scss';

/**
 * @typedef {Object} VerseData
 * @property {number} verseNumber - شماره آیه در سوره
 * @property {string} arabicText - متن عربی آیه
 * @property {string} persianTranslation - ترجمه فارسی آیه (اختصاصی یا الهی قمشه‌ای)
 * @property {string} [arabicAudioUrl] - آدرس صوت عربی
 * @property {string|null} [tafsirText] - متن تفسیر اختصاصی از Strapi
 * @property {string|null} [tafsirAudioUrl] - آدرس صوت تفسیر اختصاصی از Strapi
 * @property {Object|null} [strapiData] - دیتای خام Strapi
 */

/**
 * کامپوننت کارت یک آیه قرآنی
 *
 * @param {{
 *   verse: VerseData,
 *   surahNumber: number|string,
 *   isActive?: boolean,
 *   activeStep?: 'arabic' | 'persian' | 'tafsir' | null,
 *   isPlaying?: boolean,
 *   isPersianAudioAvailable?: boolean,
 *   onPlayTrack?: (step: 'arabic' | 'persian' | 'tafsir') => void,
 *   onPauseTrack?: () => void,
 * }} props
 */
export default function VerseCard({
  verse,
  surahNumber,
  isActive = false,
  activeStep = null,
  isPlaying = false,
  isPersianAudioAvailable: isPersianAudioAvailableProp = true,
  onPlayTrack,
  onPauseTrack,
}) {
  const {
    verseNumber,
    arabicText,
    persianTranslation,
    arabicAudioUrl,
    tafsirText,
    tafsirAudioUrl,
    strapiData,
  } = verse;

  // صوت تفسیر اختصاصی از Strapi (در صورت وجود)
  const tafsirAudio =
    tafsirAudioUrl ||
    (verse.tafsirAudio ? (verse.tafsirAudio.url || verse.tafsirAudio) : null) ||
    strapiData?.tafsirAudioUrl ||
    null;

  // آدرس صوت ترجمه گویا (اولویت با صوت آپلود شده در بک‌اند، سپس فال‌بک به بهروز رضوی)
  const persianAudioUrl = verse.translationAudioUrl || getRazaviAudioUrl(surahNumber, verseNumber);

  // وضعیت در دسترس بودن صوت ترجمه (Fail-safe)
  const [internalPersianAvailable, setInternalPersianAvailable] = useState(true);
  const isPersianAudioAvailable = isPersianAudioAvailableProp && internalPersianAvailable;

  // وضعیت فعال بودن هر یک از بخش‌های صوتی
  const isArabicPlaying = isActive && activeStep === 'arabic' && isPlaying;
  const isPersianPlaying = isActive && activeStep === 'persian' && isPlaying;
  const isTafsirPlaying = isActive && activeStep === 'tafsir' && isPlaying;

  // هندلر کلیک روی قرائت عربی
  const handleArabicClick = () => {
    if (onPlayTrack && onPauseTrack) {
      if (isArabicPlaying) {
        onPauseTrack();
      } else {
        onPlayTrack('arabic');
      }
    }
  };

  // هندلر کلیک روی ترجمه گویا
  const handlePersianClick = () => {
    if (onPlayTrack && onPauseTrack) {
      if (isPersianPlaying) {
        onPauseTrack();
      } else {
        onPlayTrack('persian');
      }
    }
  };

  // هندلر کلیک روی تفسیر صوتی
  const handleTafsirClick = () => {
    if (onPlayTrack && onPauseTrack) {
      if (isTafsirPlaying) {
        onPauseTrack();
      } else {
        onPlayTrack('tafsir');
      }
    }
  };

  return (
    <article
      className={`${styles.verseCard} ${isActive ? styles['verseCard--active'] : ''}`}
      id={`verse-${verseNumber}`}
      aria-label={`آیه ${verseNumber}`}
    >
      {/* ===== هدر کارت: شماره آیه + دکمه‌های صوت عربی و تفسیر ===== */}
      <header className={styles.verseCard__header}>
        <h2 className={styles.verseCard__number} aria-label={`شماره آیه ${verseNumber}`}>
          {verseNumber}
        </h2>

        {/* دکمه هدر: قرائت عربی */}
        <div className={styles.verseCard__controls} role="group" aria-label="کنترل‌های صوتی هدر">
          {/* دکمه ۱: قرائت عربی */}
          {arabicAudioUrl && (
            <button
              type="button"
              className={`${styles.verseCard__audioBtn} ${styles['verseCard__audioBtn--arabic']} ${
                isArabicPlaying ? styles['verseCard__audioBtn--active'] : ''
              }`}
              onClick={handleArabicClick}
              aria-label={`${isArabicPlaying ? 'توقف' : 'پخش'} قرائت عربی آیه ${verseNumber}`}
              aria-pressed={isArabicPlaying}
              title={isArabicPlaying ? 'توقف قرائت عربی' : 'پخش قرائت عربی'}
            >
              {isArabicPlaying ? (
                <Pause size={15} aria-hidden="true" />
              ) : (
                <Play size={15} aria-hidden="true" />
              )}
              <span className={styles.verseCard__audioBtnLabel}>قرائت عربی</span>
            </button>
          )}
        </div>
      </header>

      {/* ===== بدنه کارت ===== */}
      <div className={styles.verseCard__body}>
        {/* ۱. متن عربی آیه */}
        <p
          className={styles.verseCard__arabicText}
          lang="ar"
          dir="rtl"
          aria-label={`متن عربی آیه ${verseNumber}`}
        >
          {arabicText}
        </p>

        {/* ۲. باکس ترجمه فارسی — صوت ترجمه در این باکس قرار دارد */}
        {persianTranslation && (
          <div className={styles.verseCard__translationBox} lang="fa" dir="rtl">
            <div className={styles.verseCard__translationHeader}>
              <span className={styles.verseCard__translationLabel}>
                <Volume2 size={14} aria-hidden="true" />
                <span>ترجمه فارسی</span>
              </span>

              {/* دکمه ۲: صوت ترجمه گویا (بهروز رضوی) */}
              {isPersianAudioAvailable && persianAudioUrl && (
                <button
                  type="button"
                  className={`${styles.verseCard__audioBtn} ${styles['verseCard__audioBtn--persian']} ${
                    isPersianPlaying ? styles['verseCard__audioBtn--active'] : ''
                  }`}
                  onClick={handlePersianClick}
                  aria-label={`${isPersianPlaying ? 'توقف' : 'پخش'} ترجمه گویا آیه ${verseNumber}`}
                  aria-pressed={isPersianPlaying}
                  title={
                    isPersianPlaying
                      ? 'توقف ترجمه گویا'
                      : 'پخش ترجمه گویا (بهروز رضوی)'
                  }
                >
                  {isPersianPlaying ? (
                    <Pause size={14} aria-hidden="true" />
                  ) : (
                    <Play size={14} aria-hidden="true" />
                  )}
                  <span className={styles.verseCard__audioBtnLabel}>
                    ترجمه گویا (بهروز رضوی)
                  </span>
                </button>
              )}
            </div>

            {/* متن ترجمه */}
            <p className={styles.verseCard__translationText}>{persianTranslation}</p>
          </div>
        )}

        {/* ۳. تفسیر اختصاصی Strapi (متن و/یا صوت) */}
        {(tafsirText || tafsirAudio) && (
          <div className={styles.verseCard__tafsir} lang="fa" dir="rtl">
            <div className={styles.verseCard__tafsirHeader}>
              <div className={styles.verseCard__tafsirTitle}>
                <BookOpen size={16} aria-hidden="true" />
                <span>تفسیر اختصاصی</span>
              </div>

              {/* دکمه ۳: تفسیر صوتی (در باکس تفسیر) */}
              {tafsirAudio && (
                <button
                  type="button"
                  className={`${styles.verseCard__audioBtn} ${styles['verseCard__audioBtn--tafsir']} ${
                    isTafsirPlaying ? styles['verseCard__audioBtn--active'] : ''
                  }`}
                  onClick={handleTafsirClick}
                  aria-label={`${isTafsirPlaying ? 'توقف' : 'پخش'} تفسیر صوتی آیه ${verseNumber}`}
                  aria-pressed={isTafsirPlaying}
                  title={isTafsirPlaying ? 'توقف تفسیر صوتی' : 'پخش تفسیر صوتی'}
                >
                  {isTafsirPlaying ? (
                    <Pause size={14} aria-hidden="true" />
                  ) : (
                    <Play size={14} aria-hidden="true" />
                  )}
                  <span className={styles.verseCard__audioBtnLabel}>تفسیر صوتی</span>
                </button>
              )}
            </div>

            {/* متن تفسیر */}
            {tafsirText && <p className={styles.verseCard__tafsirText}>{tafsirText}</p>}
          </div>
        )}
      </div>
    </article>
  );
}
