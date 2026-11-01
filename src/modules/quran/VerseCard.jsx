'use client';

/**
 * @file src/modules/quran/VerseCard.jsx
 * @description کامپوننت نمایش یک آیه قرآنی با قابلیت همگام‌سازی دوطرفه با پلیر پیوسته و نمایش موضوعات تفسیر موضوعی
 */

import React, { useState } from 'react';
import Link from 'next/link';
import { Play, Pause, BookOpen, Volume2, Tag } from 'lucide-react';
import { getRazaviAudioUrl } from '@/utils/quranAudio';
import styles from './VerseCard.module.scss';

/**
 * @typedef {Object} SubjectItem
 * @property {number|string} id
 * @property {string} title
 * @property {string} slug
 * @property {string|null} [description]
 */

/**
 * @typedef {Object} VerseData
 * @property {number} verseNumber - شماره آیه در سوره
 * @property {number} [surahNumber] - شماره سوره (در نمای تفسیر موضوعی)
 * @property {string} [surahNameFa] - نام فارسی سوره (در نمای تفسیر موضوعی)
 * @property {string} arabicText - متن عربی آیه
 * @property {string} persianTranslation - ترجمه فارسی آیه (اختصاصی یا الهی قمشه‌ای)
 * @property {string} [arabicAudioUrl] - آدرس صوت عربی
 * @property {string|null} [tafsirText] - متن تفسیر اختصاصی از Strapi
 * @property {string|null} [tafsirAudioUrl] - آدرس صوت تفسیر اختصاصی از Strapi
 * @property {Array<SubjectItem>} [subjects] - موضوعات مرتبط با آیه (تفسیر موضوعی)
 * @property {Object|null} [strapiData] - دیتای خام Strapi
 */

/**
 * کامپوننت کارت یک آیه قرآنی
 *
 * @param {{
 *   verse: VerseData,
 *   surahNumber: number|string,
 *   showSurahBadge?: boolean,
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
  showSurahBadge = false,
  showDivider,
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
    subjects: verseSubjects,
    strapiData,
  } = verse;

  const effectiveSurahNumber = verse.surahNumber || surahNumber;
  const surahNameFa = verse.surahNameFa || null;

  // موضوعات مرتبط با این آیه
  const subjects = Array.isArray(verseSubjects)
    ? verseSubjects
    : Array.isArray(strapiData?.subjects)
    ? strapiData.subjects
    : [];

  // صوت تفسیر اختصاصی از Strapi (در صورت وجود)
  const tafsirAudio =
    tafsirAudioUrl ||
    (verse.tafsirAudio ? (verse.tafsirAudio.url || verse.tafsirAudio) : null) ||
    strapiData?.tafsirAudioUrl ||
    null;

  // بررسی وجود صوت تفسیر برای انداختن بوردر/جداکننده با رنگ روشن بعد از این آیه
  const hasTafsirAudio = Boolean(
    tafsirAudio ||
    verse.tafsirAudioUrl ||
    (verse.tafsirAudio && (verse.tafsirAudio.url || typeof verse.tafsirAudio === 'string')) ||
    strapiData?.tafsirAudioUrl
  );

  // در صفحه سوره: پس از هر آیه دارای صوت تفسیر؛ در صفحه موضوع: فقط هنگام تغییر سوره (showDivider)
  const shouldShowDivider =
    typeof showDivider === 'boolean' ? showDivider : !showSurahBadge && hasTafsirAudio;

  // آدرس صوت ترجمه گویا (اولویت با صوت آپلود شده در بک‌اند، سپس فال‌بک به بهروز رضوی)
  const persianAudioUrl =
    verse.translationAudioUrl || getRazaviAudioUrl(effectiveSurahNumber, verseNumber);

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

  const cardDomId = showSurahBadge
    ? `verse-${effectiveSurahNumber}-${verseNumber}`
    : `verse-${verseNumber}`;

  return (
    <>
      <article
        className={`${styles.verseCard} ${isActive ? styles['verseCard--active'] : ''} ${
          shouldShowDivider ? styles['verseCard--hasTafsirAudio'] : ''
        }`}
        id={cardDomId}
        aria-label={
          surahNameFa ? `سوره ${surahNameFa} آیه ${verseNumber}` : `آیه ${verseNumber}`
        }
      >
        {/* ===== هدر کارت: شماره آیه + نام سوره (در نمای موضوعی) + دکمه‌های صوت ===== */}
        <header className={styles.verseCard__header}>
          <div className={styles.verseCard__titleGroup}>
            <h2 className={styles.verseCard__number} aria-label={`شماره آیه ${verseNumber}`}>
              {verseNumber}
            </h2>

            {showSurahBadge && surahNameFa && (
              <Link
                href={`/quran/${effectiveSurahNumber}#verse-${verseNumber}`}
                className={styles.verseCard__surahBadge}
                title={`مشاهده در سوره ${surahNameFa}`}
              >
                سوره {surahNameFa} • آیه {verseNumber}
              </Link>
            )}
          </div>

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

          {/* ۴. موضوعات مرتبط با آیه (تفسیر موضوعی) */}
          {subjects.length > 0 && (
            <div className={styles.verseCard__subjects} lang="fa" dir="rtl">
              <span className={styles.verseCard__subjectsLabel}>
                <Tag size={13} aria-hidden="true" />
                <span>موضوعات:</span>
              </span>
              <div className={styles.verseCard__subjectsList}>
                {subjects.map((sub) => (
                  <Link
                    key={sub.slug || sub.id}
                    href={`/quran/subjects/${encodeURIComponent(sub.slug || sub.id)}`}
                    className={styles.verseCard__subjectBadge}
                    title={`مشاهده تمام آیات مرتبط با موضوع «${sub.title}»`}
                  >
                    {sub.title}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </article>

      {/* خط و بوردر جداکننده با رنگ روشن (در سوره: پس از صوت تفسیر / در موضوع: هنگام تغییر سوره) */}
      {shouldShowDivider && (
        <div
          className={styles.verseCard__tafsirDivider}
          role="separator"
          aria-label={`جداکننده پس از آیه ${verseNumber}`}
        />
      )}
    </>
  );
}
