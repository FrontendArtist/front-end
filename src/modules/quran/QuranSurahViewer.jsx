'use client';

/**
 * @file src/modules/quran/QuranSurahViewer.jsx
 * @description کامپوننت کلاینت هماهنگ‌کننده آیات سوره، مدیریت انتخاب قاری و پخش پیوسته و ترتیبی
 *
 * توالی پخش هوشمند:
 * آیه (با قاری انتخابی) ➔ ترجمه گویا (در صورت وجود) ➔ تفسیر صوتی (در صورت وجود) ➔ آیه بعد ... تا پایان سوره
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Play, Pause, User, Loader2, ChevronDown } from 'lucide-react';
import { getRazaviAudioUrl } from '@/utils/quranAudio';
import { RECITERS_LIST, DEFAULT_RECITER } from '@/utils/quranReciters';
import VerseCard from './VerseCard';
import QuranAudioPlayer from './QuranAudioPlayer';
import styles from './QuranSurahViewer.module.scss';

/**
 * تعیین صوت بعدی بر اساس چرخه:
 * ۱. آیه فعلی - عربی
 * ۲. آیه فعلی - ترجمه (در صورت در دسترس بودن)
 * ۳. آیه فعلی - تفسیر (در صورت وجود)
 * ۴. آیه بعدی - عربی
 */
function getNextTrack(
  currentIndex,
  currentStep,
  verses,
  surahNumber,
  failedPersianSet,
  selectedReciter,
  reciterAudioMap
) {
  const currentVerse = verses[currentIndex];
  if (!currentVerse) return null;

  if (currentStep === 'arabic') {
    // ۱. بررسی صوت ترجمه فارسی
    const persianUrl = getRazaviAudioUrl(surahNumber, currentVerse.verseNumber);
    const hasPersian = Boolean(persianUrl) && !failedPersianSet.has(currentVerse.verseNumber);

    if (hasPersian) {
      return { index: currentIndex, step: 'persian', url: persianUrl };
    }

    // ۲. بررسی صوت تفسیر
    const tafsirUrl = currentVerse.tafsirAudioUrl || currentVerse.strapiData?.tafsirAudioUrl;
    if (tafsirUrl) {
      return { index: currentIndex, step: 'tafsir', url: tafsirUrl };
    }

    // ۳. رفتن به آیه بعد
    if (currentIndex + 1 < verses.length) {
      const nextVerse = verses[currentIndex + 1];
      const nextArabicUrl =
        reciterAudioMap[selectedReciter]?.[nextVerse.verseNumber] ||
        nextVerse.arabicAudioUrl;

      return {
        index: currentIndex + 1,
        step: 'arabic',
        url: nextArabicUrl,
      };
    }

    return null; // پایان سوره
  }

  if (currentStep === 'persian') {
    // ۱. بررسی صوت تفسیر برای همین آیه
    const tafsirUrl = currentVerse.tafsirAudioUrl || currentVerse.strapiData?.tafsirAudioUrl;
    if (tafsirUrl) {
      return { index: currentIndex, step: 'tafsir', url: tafsirUrl };
    }

    // ۲. رفتن به آیه بعد
    if (currentIndex + 1 < verses.length) {
      const nextVerse = verses[currentIndex + 1];
      const nextArabicUrl =
        reciterAudioMap[selectedReciter]?.[nextVerse.verseNumber] ||
        nextVerse.arabicAudioUrl;

      return {
        index: currentIndex + 1,
        step: 'arabic',
        url: nextArabicUrl,
      };
    }

    return null; // پایان سوره
  }

  if (currentStep === 'tafsir') {
    // پس از تفسیر مستقیماً به آیه بعد می‌رویم
    if (currentIndex + 1 < verses.length) {
      const nextVerse = verses[currentIndex + 1];
      const nextArabicUrl =
        reciterAudioMap[selectedReciter]?.[nextVerse.verseNumber] ||
        nextVerse.arabicAudioUrl;

      return {
        index: currentIndex + 1,
        step: 'arabic',
        url: nextArabicUrl,
      };
    }

    return null; // پایان سوره
  }

  return null;
}

/**
 * دریافت URL صوت متناسب با مرحله مشخص‌شده و قاری انتخابی
 */
function getAudioUrlForStep(verse, step, surahNumber, selectedReciter, reciterAudioMap) {
  if (!verse) return '';
  switch (step) {
    case 'arabic':
      return (
        reciterAudioMap[selectedReciter]?.[verse.verseNumber] ||
        verse.arabicAudioUrl ||
        ''
      );
    case 'persian':
      return getRazaviAudioUrl(surahNumber, verse.verseNumber);
    case 'tafsir':
      return verse.tafsirAudioUrl || verse.strapiData?.tafsirAudioUrl || '';
    default:
      return '';
  }
}

/**
 * @param {{
 *   verses: Array<any>,
 *   surahNumber: number,
 *   surahNameFa: string,
 * }} props
 */
export default function QuranSurahViewer({ verses, surahNumber, surahNameFa }) {
  // --------------------------------------------------------------------------
  // State: انتخاب قاری
  // --------------------------------------------------------------------------
  const [selectedReciter, setSelectedReciter] = useState(DEFAULT_RECITER);
  const [isReciterLoading, setIsReciterLoading] = useState(false);

  // کش آدرس‌های صوت قاریان مختلف برای این سوره: { [reciterId]: { [verseNumber]: url } }
  const [reciterAudioMap, setReciterAudioMap] = useState(() => {
    const initialMap = {};
    verses.forEach((v) => {
      if (v.arabicAudioUrl) {
        initialMap[v.verseNumber] = v.arabicAudioUrl;
      }
    });
    return { [DEFAULT_RECITER]: initialMap };
  });

  // --------------------------------------------------------------------------
  // State: وضعیت پلیر
  // --------------------------------------------------------------------------
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);
  const [currentVerseIndex, setCurrentVerseIndex] = useState(0);
  const [currentStep, setCurrentStep] = useState('arabic'); // 'arabic' | 'persian' | 'tafsir'
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [autoScroll, setAutoScroll] = useState(true);

  // نگهداری آیاتی که صوت ترجمه‌شان در دسترس نیست
  const [failedPersianAudios, setFailedPersianAudios] = useState(() => new Set());

  // Ref به المنت صوتی پلیر
  const audioRef = useRef(null);
  const consecutiveErrorsRef = useRef(0);
  const playTimeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (playTimeoutRef.current) {
        clearTimeout(playTimeoutRef.current);
      }
    };
  }, []);

  // نام قاری انتخاب‌شده برای نمایش در پلیر
  const currentReciterObj = useMemo(() => {
    return (
      RECITERS_LIST.find((r) => r.identifier === selectedReciter) ||
      RECITERS_LIST[0]
    );
  }, [selectedReciter]);

  // --------------------------------------------------------------------------
  // خواندن قاری ذخیره‌شده از حافظه مرورگر در هنگام لود
  // --------------------------------------------------------------------------
  useEffect(() => {
    try {
      const savedReciter = localStorage.getItem('preferred_quran_reciter');
      if (
        savedReciter &&
        savedReciter !== DEFAULT_RECITER &&
        RECITERS_LIST.some((r) => r.identifier === savedReciter)
      ) {
        handleReciterSelect(savedReciter);
      }
    } catch {
      // نادیده گرفتن خطای دسترسی به localStorage
    }
  }, []);

  // --------------------------------------------------------------------------
  // تغییر قاری و دریافت صوت‌های جدید در صورت عدم وجود در کش
  // --------------------------------------------------------------------------
  const handleReciterSelect = useCallback(
    async (newReciterId) => {
      if (!newReciterId) return;
      setSelectedReciter(newReciterId);

      try {
        localStorage.setItem('preferred_quran_reciter', newReciterId);
      } catch {
        // نادیده گرفتن
      }

      // اگر از قبل در کش است، فقط در صورت نیاز صوت فعال را بروز کن
      if (reciterAudioMap[newReciterId]) {
        if (isPlaying && currentStep === 'arabic') {
          const currentVerse = verses[currentVerseIndex];
          const newUrl = reciterAudioMap[newReciterId][currentVerse.verseNumber];
          if (newUrl && audioRef.current) {
            const time = audioRef.current.currentTime;
            audioRef.current.src = newUrl;
            audioRef.current.currentTime = time;
            audioRef.current.play().catch(() => {});
          }
        }
        return;
      }

      // دریافت داده‌های صوت قاری جدید برای این سوره از API خارجی
      setIsReciterLoading(true);
      try {
        const response = await fetch(
          `https://api.alquran.cloud/v1/surah/${surahNumber}/${newReciterId}`
        );
        if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
        const data = await response.json();

        if (data?.data?.ayahs && Array.isArray(data.data.ayahs)) {
          const mapForReciter = {};
          data.data.ayahs.forEach((ayah) => {
            mapForReciter[ayah.numberInSurah] = ayah.audio;
          });

          setReciterAudioMap((prev) => ({
            ...prev,
            [newReciterId]: mapForReciter,
          }));

          // اگر در حال پخش قرائت عربی هستیم، صوت فوراً با قاری جدید ادامه یابد
          if (isPlaying && currentStep === 'arabic') {
            const currentVerse = verses[currentVerseIndex];
            const newUrl = mapForReciter[currentVerse.verseNumber];
            if (newUrl && audioRef.current) {
              const time = audioRef.current.currentTime;
              audioRef.current.src = newUrl;
              audioRef.current.currentTime = time;
              audioRef.current.play().catch(() => {});
            }
          }
        }
      } catch (error) {
        console.warn('⚠️ خطا در دریافت صوت قاری انتخابی:', error.message);
      } finally {
        setIsReciterLoading(false);
      }
    },
    [reciterAudioMap, isPlaying, currentStep, currentVerseIndex, verses, surahNumber]
  );

  // --------------------------------------------------------------------------
  // اسکرول نرم به آیه فعال
  // --------------------------------------------------------------------------
  const scrollToVerse = useCallback(
    (verseNum) => {
      if (!autoScroll) return;
      const el = document.getElementById(`verse-${verseNum}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    },
    [autoScroll]
  );

  // --------------------------------------------------------------------------
  // بارگذاری و شروع پخش قطعه مشخص
  // --------------------------------------------------------------------------
  const playTrack = useCallback(
    (index, step) => {
      if (playTimeoutRef.current) {
        clearTimeout(playTimeoutRef.current);
        playTimeoutRef.current = null;
      }

      const verse = verses[index];
      if (!verse) {
        setIsPlaying(false);
        return;
      }

      const url = getAudioUrlForStep(
        verse,
        step,
        surahNumber,
        selectedReciter,
        reciterAudioMap
      );

      if (!url) {
        consecutiveErrorsRef.current += 1;
        if (consecutiveErrorsRef.current >= 3) {
          console.warn('⚠️ چند آدرس صوتی یافت نشد. پخش متوقف شد.');
          setIsPlaying(false);
          consecutiveErrorsRef.current = 0;
          return;
        }

        const next = getNextTrack(
          index,
          step,
          verses,
          surahNumber,
          failedPersianAudios,
          selectedReciter,
          reciterAudioMap
        );
        if (next) {
          playTimeoutRef.current = setTimeout(() => {
            playTrack(next.index, next.step);
          }, 150);
        } else {
          setIsPlaying(false);
          consecutiveErrorsRef.current = 0;
        }
        return;
      }

      setCurrentVerseIndex(index);
      setCurrentStep(step);
      setIsPlayerOpen(true);
      setCurrentTime(0);
      setDuration(0);

      const audio = audioRef.current;
      if (audio) {
        audio.src = url;
        audio.load();
        audio
          .play()
          .then(() => {
            setIsPlaying(true);
            consecutiveErrorsRef.current = 0;
            scrollToVerse(verse.verseNumber);
          })
          .catch((err) => {
            if (err.name === 'AbortError') return;
            if (err.name === 'NotAllowedError') {
              console.warn('⚠️ پخش خودکار توسط مرورگر مسدود شد');
              setIsPlaying(false);
              return;
            }
            console.warn('⚠️ خطا در دستور play صوت:', err.message);
            setIsPlaying(false);
          });
      }
    },
    [
      verses,
      surahNumber,
      selectedReciter,
      reciterAudioMap,
      failedPersianAudios,
      scrollToVerse,
    ]
  );

  // توقف پخش
  const pauseAudio = useCallback(() => {
    if (playTimeoutRef.current) {
      clearTimeout(playTimeoutRef.current);
      playTimeoutRef.current = null;
    }
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      setIsPlaying(false);
    }
  }, []);

  // ادامه پخش
  const resumeAudio = useCallback(() => {
    const audio = audioRef.current;
    if (audio && audio.src) {
      audio
        .play()
        .then(() => setIsPlaying(true))
        .catch((err) => console.warn('خطا در ادامه پخش:', err.message));
    } else {
      playTrack(currentVerseIndex, currentStep);
    }
  }, [currentVerseIndex, currentStep, playTrack]);

  // کلیک روی دکمه Play/Pause نوار پلیر
  const handlePlayPauseToggle = useCallback(() => {
    if (isPlaying) {
      pauseAudio();
    } else {
      resumeAudio();
    }
  }, [isPlaying, pauseAudio, resumeAudio]);

  // اتمام پخش یک فایل صوتی -> انتقال به مرحله بعد
  const handleAudioEnded = useCallback(() => {
    consecutiveErrorsRef.current = 0;
    const next = getNextTrack(
      currentVerseIndex,
      currentStep,
      verses,
      surahNumber,
      failedPersianAudios,
      selectedReciter,
      reciterAudioMap
    );

    if (next) {
      if (playTimeoutRef.current) clearTimeout(playTimeoutRef.current);
      playTimeoutRef.current = setTimeout(() => {
        playTrack(next.index, next.step);
      }, 100);
    } else {
      setIsPlaying(false);
      setCurrentTime(0);
    }
  }, [
    currentVerseIndex,
    currentStep,
    verses,
    surahNumber,
    failedPersianAudios,
    selectedReciter,
    reciterAudioMap,
    playTrack,
  ]);

  // بروزرسانی زمان
  const handleTimeUpdate = () => {
    const audio = audioRef.current;
    if (audio) {
      setCurrentTime(audio.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    const audio = audioRef.current;
    if (audio) {
      setDuration(audio.duration || 0);
    }
  };

  // خطا در المنت صوتی با Circuit Breaker و Throttle
  const handleAudioError = useCallback(() => {
    consecutiveErrorsRef.current += 1;
    if (consecutiveErrorsRef.current >= 2) {
      console.warn('⚠️ فایل صوتی در دسترس نیست. برای جلوگیری از قفل شدن مرورگر، پخش متوقف شد.');
      setIsPlaying(false);
      consecutiveErrorsRef.current = 0;
      return;
    }

    const verse = verses[currentVerseIndex];
    const updatedFailed = new Set(failedPersianAudios);
    if (currentStep === 'persian' && verse) {
      updatedFailed.add(verse.verseNumber);
      setFailedPersianAudios(updatedFailed);
    }

    if (playTimeoutRef.current) clearTimeout(playTimeoutRef.current);
    playTimeoutRef.current = setTimeout(() => {
      const next = getNextTrack(
        currentVerseIndex,
        currentStep,
        verses,
        surahNumber,
        updatedFailed,
        selectedReciter,
        reciterAudioMap
      );
      if (next) {
        playTrack(next.index, next.step);
      } else {
        setIsPlaying(false);
        consecutiveErrorsRef.current = 0;
      }
    }, 350);
  }, [
    currentVerseIndex,
    currentStep,
    verses,
    failedPersianAudios,
    surahNumber,
    selectedReciter,
    reciterAudioMap,
    playTrack,
  ]);

  // آیه بعدی
  const handleNextVerse = useCallback(() => {
    if (currentVerseIndex + 1 < verses.length) {
      playTrack(currentVerseIndex + 1, 'arabic');
    }
  }, [currentVerseIndex, verses.length, playTrack]);

  // آیه قبلی
  const handlePrevVerse = useCallback(() => {
    if (currentTime > 3) {
      const audio = audioRef.current;
      if (audio) audio.currentTime = 0;
    } else if (currentVerseIndex > 0) {
      playTrack(currentVerseIndex - 1, 'arabic');
    }
  }, [currentTime, currentVerseIndex, playTrack]);

  // Seek
  const handleSeek = useCallback((seconds) => {
    const audio = audioRef.current;
    if (audio && !isNaN(seconds)) {
      audio.currentTime = seconds;
      setCurrentTime(seconds);
    }
  }, []);

  // بستن کامل پلیر
  const handleClosePlayer = useCallback(() => {
    if (playTimeoutRef.current) {
      clearTimeout(playTimeoutRef.current);
      playTimeoutRef.current = null;
    }
    consecutiveErrorsRef.current = 0;
    pauseAudio();
    setIsPlayerOpen(false);
  }, [pauseAudio]);

  // کلیک روی دکمه شاخص بالای صفحه برای شروع یا توقف کل سوره
  const handleContinuousPlayBtnClick = useCallback(() => {
    if (isPlayerOpen && isPlaying) {
      pauseAudio();
    } else if (isPlayerOpen && !isPlaying) {
      resumeAudio();
    } else {
      playTrack(0, 'arabic');
    }
  }, [isPlayerOpen, isPlaying, pauseAudio, resumeAudio, playTrack]);

  const activeVerse = verses[currentVerseIndex] || verses[0];

  return (
    <div
      className={`${styles.surahViewer} ${
        isPlayerOpen ? styles['surahViewer--playerOpen'] : ''
      }`}
    >
      {/* ===== نوار ابزار بالای آیات: انتخاب قاری + پخش پیوسته سوره ===== */}
      <div className={styles.surahActionBar}>
        {/* گروه انتخاب قاری قرآن */}
        <div className={styles.reciterGroup}>
          <div className={styles.reciterIconWrap} title="قاری قرآن کریم">
            <User size={15} aria-hidden="true" />
          </div>

          <div className={styles.reciterSelectContainer}>
            {isReciterLoading ? (
              <Loader2 size={15} className={styles.reciterLoading} />
            ) : (
              <ChevronDown
                size={14}
                className={styles.reciterSelectArrow}
                aria-hidden="true"
              />
            )}
            <select
              id="reciter-select"
              className={styles.reciterSelect}
              value={selectedReciter}
              onChange={(e) => handleReciterSelect(e.target.value)}
              disabled={isReciterLoading}
              aria-label="انتخاب قاری قرآن برای قرائت عربی"
            >
              {RECITERS_LIST.map((reciter) => (
                <option key={reciter.identifier} value={reciter.identifier}>
                  {reciter.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* دکمه پخش پیوسته سوره */}
        <button
          type="button"
          className={`${styles.playContinuousBtn} ${
            isPlayerOpen && isPlaying ? styles['playContinuousBtn--active'] : ''
          }`}
          onClick={handleContinuousPlayBtnClick}
          aria-label="پخش پیوسته سوره"
        >
          {isPlayerOpen && isPlaying ? (
            <>
              <Pause size={16} aria-hidden="true" />
              <span>توقف پخش</span>
            </>
          ) : (
            <>
              <Play size={16} aria-hidden="true" />
              <span>پخش پیوسته سوره</span>
            </>
          )}
        </button>
      </div>

      {/* ===== لیست کارت‌های آیات ===== */}
      <section
        className={styles.versesList}
        aria-label={`آیات سوره ${surahNameFa}`}
      >
        {verses.map((verse, index) => {
          const isThisVerseActive = isPlayerOpen && currentVerseIndex === index;
          const activeStepForCard = isThisVerseActive ? currentStep : null;

          // اعمال صوت قاری انتخابی روی هر کارت
          const currentArabicAudioUrl =
            reciterAudioMap[selectedReciter]?.[verse.verseNumber] ||
            verse.arabicAudioUrl;

          const verseWithActiveReciter = {
            ...verse,
            arabicAudioUrl: currentArabicAudioUrl,
          };

          return (
            <VerseCard
              key={verse.verseNumber}
              verse={verseWithActiveReciter}
              surahNumber={surahNumber}
              isActive={isThisVerseActive}
              activeStep={activeStepForCard}
              isPlaying={isPlaying}
              isPersianAudioAvailable={!failedPersianAudios.has(verse.verseNumber)}
              onPlayTrack={(step) => playTrack(index, step)}
              onPauseTrack={pauseAudio}
            />
          );
        })}
      </section>

      {/* ===== نوار پلیر چسبان انتهای صفحه ===== */}
      {isPlayerOpen && activeVerse && (
        <QuranAudioPlayer
          surahNameFa={surahNameFa}
          currentVerseNumber={activeVerse.verseNumber}
          totalVerses={verses.length}
          currentStep={currentStep}
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
          autoScroll={autoScroll}
          reciterName={currentReciterObj.name}
          onPlayPause={handlePlayPauseToggle}
          onNextVerse={handleNextVerse}
          onPrevVerse={handlePrevVerse}
          onSeek={handleSeek}
          onClose={handleClosePlayer}
          onToggleAutoScroll={() => setAutoScroll((prev) => !prev)}
        />
      )}

      {/* تگ مخفی صوتی مرکزی پلیر پیوسته */}
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleAudioEnded}
        onError={handleAudioError}
        preload="auto"
        aria-hidden="true"
      />
    </div>
  );
}
