'use client';

/**
 * @file src/modules/quran/SurahViewer.jsx
 * @description کامپوننت کلاینت هماهنگ‌کننده آیات سوره، فیلتر مشروط تفاسیر، انتخاب قاری و پلیر پیوسته
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Play, Pause, User, Loader2, ChevronDown, BookOpen } from 'lucide-react';
import { getRazaviAudioUrl } from '@/utils/quranAudio';
import { RECITERS_LIST, DEFAULT_RECITER } from '@/utils/quranReciters';
import VerseCard from './VerseCard';
import QuranAudioPlayer from './QuranAudioPlayer';
import styles from './SurahViewer.module.scss';

/**
 * تعیین صوت بعدی در زنجیره پخش پیوسته:
 * ۱. آیه فعلی - عربی
 * ۲. آیه فعلی - ترجمه گویا (در صورت وجود)
 * ۳. آیه فعلی - تفسیر صوتی (در صورت وجود)
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
    const persianUrl = currentVerse.translationAudioUrl || getRazaviAudioUrl(surahNumber, currentVerse.verseNumber);
    const hasPersian = Boolean(persianUrl) && !failedPersianSet.has(currentVerse.verseNumber);

    if (hasPersian) {
      return { index: currentIndex, step: 'persian', url: persianUrl };
    }

    const tafsirUrl = currentVerse.tafsirAudioUrl || currentVerse.tafsirAudio?.url;
    if (tafsirUrl) {
      return { index: currentIndex, step: 'tafsir', url: tafsirUrl };
    }

    if (currentIndex + 1 < verses.length) {
      const nextVerse = verses[currentIndex + 1];
      const nextArabicUrl =
        nextVerse.customArabicAudioUrl ||
        reciterAudioMap[selectedReciter]?.[nextVerse.verseNumber] ||
        nextVerse.arabicAudioUrl;

      return {
        index: currentIndex + 1,
        step: 'arabic',
        url: nextArabicUrl,
      };
    }

    return null;
  }

  if (currentStep === 'persian') {
    const tafsirUrl = currentVerse.tafsirAudioUrl || currentVerse.tafsirAudio?.url;
    if (tafsirUrl) {
      return { index: currentIndex, step: 'tafsir', url: tafsirUrl };
    }

    if (currentIndex + 1 < verses.length) {
      const nextVerse = verses[currentIndex + 1];
      const nextArabicUrl =
        nextVerse.customArabicAudioUrl ||
        reciterAudioMap[selectedReciter]?.[nextVerse.verseNumber] ||
        nextVerse.arabicAudioUrl;

      return {
        index: currentIndex + 1,
        step: 'arabic',
        url: nextArabicUrl,
      };
    }

    return null;
  }

  if (currentStep === 'tafsir') {
    if (currentIndex + 1 < verses.length) {
      const nextVerse = verses[currentIndex + 1];
      const nextArabicUrl =
        nextVerse.customArabicAudioUrl ||
        reciterAudioMap[selectedReciter]?.[nextVerse.verseNumber] ||
        nextVerse.arabicAudioUrl;

      return {
        index: currentIndex + 1,
        step: 'arabic',
        url: nextArabicUrl,
      };
    }

    return null;
  }

  return null;
}

/**
 * دریافت آدرس فایل صوتی مناسب برای هر مرحله
 */
function getAudioUrlForStep(verse, step, surahNumber, selectedReciter, reciterAudioMap) {
  if (!verse) return '';
  switch (step) {
    case 'arabic':
      return (
        verse.customArabicAudioUrl ||
        reciterAudioMap[selectedReciter]?.[verse.verseNumber] ||
        verse.arabicAudioUrl ||
        ''
      );
    case 'persian':
      return verse.translationAudioUrl || getRazaviAudioUrl(surahNumber, verse.verseNumber);
    case 'tafsir':
      return verse.tafsirAudioUrl || verse.tafsirAudio?.url || '';
    default:
      return '';
  }
}

/**
 * @param {{
 *   verses: Array<any>,
 *   surahNumber: number,
 *   surahNameFa: string,
 *   showAllVerses: boolean,
 * }} props
 */
export default function SurahViewer({
  verses = [],
  surahNumber,
  surahNameFa,
}) {
  // تمام آیاتی که به کامپوننت ارسال می‌شوند، منحصراً آیات دارای تفسیر اختصاصی هستند
  const displayedVerses = verses;

  // --------------------------------------------------------------------------
  // State: انتخاب قاری
  // --------------------------------------------------------------------------
  const [selectedReciter, setSelectedReciter] = useState(DEFAULT_RECITER);
  const [isReciterLoading, setIsReciterLoading] = useState(false);

  // کش صوت قاریان: { [reciterId]: { [verseNumber]: url } }
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

  // نگهداری آیاتی که صوت ترجمه‌شان لود نشد
  const [failedPersianAudios, setFailedPersianAudios] = useState(() => new Set());

  const audioRef = useRef(null);
  // متغیرهای جلوگیری از حلقه بی‌پایان خطا و قفل شدن صفحه (Circuit Breaker & Throttle)
  const consecutiveErrorsRef = useRef(0);
  const playTimeoutRef = useRef(null);

  // پاکسازی تایمرها هنگام خروج از کامپوننت
  useEffect(() => {
    return () => {
      if (playTimeoutRef.current) {
        clearTimeout(playTimeoutRef.current);
      }
    };
  }, []);

  const currentReciterObj = useMemo(() => {
    return (
      RECITERS_LIST.find((r) => r.identifier === selectedReciter) ||
      RECITERS_LIST[0]
    );
  }, [selectedReciter]);

  // لود قاری ذخیره‌شده از حافظه مرورگر
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
      // نادیده گرفتن خطا
    }
  }, []);

  // تغییر قاری
  const handleReciterSelect = useCallback(
    async (newReciterId) => {
      if (!newReciterId) return;
      setSelectedReciter(newReciterId);

      try {
        localStorage.setItem('preferred_quran_reciter', newReciterId);
      } catch {
        // نادیده گرفتن
      }

      if (reciterAudioMap[newReciterId]) {
        if (isPlaying && currentStep === 'arabic') {
          const currentVerse = displayedVerses[currentVerseIndex];
          const newUrl = reciterAudioMap[newReciterId][currentVerse?.verseNumber];
          if (newUrl && audioRef.current) {
            const time = audioRef.current.currentTime;
            audioRef.current.src = newUrl;
            audioRef.current.currentTime = time;
            audioRef.current.play().catch(() => {});
          }
        }
        return;
      }

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

          if (isPlaying && currentStep === 'arabic') {
            const currentVerse = displayedVerses[currentVerseIndex];
            const newUrl = mapForReciter[currentVerse?.verseNumber];
            if (newUrl && audioRef.current) {
              const time = audioRef.current.currentTime;
              audioRef.current.src = newUrl;
              audioRef.current.currentTime = time;
              audioRef.current.play().catch(() => {});
            }
          }
        }
      } catch (error) {
        console.warn('⚠️ خطا در دریافت صوت قاری:', error.message);
      } finally {
        setIsReciterLoading(false);
      }
    },
    [reciterAudioMap, isPlaying, currentStep, currentVerseIndex, displayedVerses, surahNumber]
  );

  // اسکرول نرم به آیه فعال (همیشه فعال)
  const scrollToVerse = useCallback(
    (verseNum) => {
      const el = document.getElementById(`verse-${verseNum}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    },
    []
  );

  // پخش قطعه مشخص
  const playTrack = useCallback(
    (index, step) => {
      if (playTimeoutRef.current) {
        clearTimeout(playTimeoutRef.current);
        playTimeoutRef.current = null;
      }

      const verse = displayedVerses[index];
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

      // اگر برای این مرحله صوت وجود نداشت
      if (!url) {
        consecutiveErrorsRef.current += 1;
        // Circuit Breaker: اگر ۳ فایل متوالی آدرس نداشتند، پخش متوقف می‌شود تا صفحه قفل نکند
        if (consecutiveErrorsRef.current >= 3) {
          console.warn('⚠️ چند آدرس صوتی یافت نشد. پخش متوقف شد.');
          setIsPlaying(false);
          consecutiveErrorsRef.current = 0;
          return;
        }

        const next = getNextTrack(
          index,
          step,
          displayedVerses,
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
            // ۱. خطای AbortError (ناشی از توقف یا تغییر توسط کاربر) کاملاً طبیعی است و نباید به آیه بعدی بپرد
            if (err.name === 'AbortError') {
              return;
            }
            // ۲. خطای مسدود شدن پخش خودکار توسط مرورگر (Autoplay Policy)
            if (err.name === 'NotAllowedError') {
              console.warn('⚠️ پخش خودکار توسط مرورگر مسدود شد');
              setIsPlaying(false);
              return;
            }
            // توجه: خطای لود فایل در onError تگ audio مدیریت می‌شود، بنابراین در اینجا هرگز getNextTrack صدا زده نمی‌شود
            console.warn('⚠️ خطا در دستور play صوت:', err.message);
            setIsPlaying(false);
          });
      }
    },
    [
      displayedVerses,
      surahNumber,
      selectedReciter,
      reciterAudioMap,
      failedPersianAudios,
      scrollToVerse,
    ]
  );

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

  const handlePlayPauseToggle = useCallback(() => {
    if (isPlaying) {
      pauseAudio();
    } else {
      resumeAudio();
    }
  }, [isPlaying, pauseAudio, resumeAudio]);

  const handleAudioEnded = useCallback(() => {
    consecutiveErrorsRef.current = 0;
    const next = getNextTrack(
      currentVerseIndex,
      currentStep,
      displayedVerses,
      surahNumber,
      failedPersianAudios,
      selectedReciter,
      reciterAudioMap
    );

    if (next) {
      if (playTimeoutRef.current) clearTimeout(playTimeoutRef.current);
      // مکث کوتاه ۱۰۰ میلی‌ثانیه‌ای بین ترک‌ها
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
    displayedVerses,
    surahNumber,
    failedPersianAudios,
    selectedReciter,
    reciterAudioMap,
    playTrack,
  ]);

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

  // مدیریت خطای فایل صوتی با Circuit Breaker و Throttle
  const handleAudioError = useCallback(() => {
    consecutiveErrorsRef.current += 1;

    // اگر ۲ بار متوالی فایل صوتی لود نشد، پخش متوقف می‌شود تا صفحه قفل نکند
    if (consecutiveErrorsRef.current >= 2) {
      console.warn('⚠️ فایل صوتی در دسترس نیست. برای جلوگیری از قفل شدن مرورگر، پخش متوقف شد.');
      setIsPlaying(false);
      consecutiveErrorsRef.current = 0;
      return;
    }

    const verse = displayedVerses[currentVerseIndex];
    const updatedFailed = new Set(failedPersianAudios);
    if (currentStep === 'persian' && verse) {
      updatedFailed.add(verse.verseNumber);
      setFailedPersianAudios(updatedFailed);
    }

    if (playTimeoutRef.current) clearTimeout(playTimeoutRef.current);
    // تاخیر ۳۵۰ میلی‌ثانیه‌ای به جای پرش فوری برای حفظ روانی UI
    playTimeoutRef.current = setTimeout(() => {
      const next = getNextTrack(
        currentVerseIndex,
        currentStep,
        displayedVerses,
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
    displayedVerses,
    failedPersianAudios,
    surahNumber,
    selectedReciter,
    reciterAudioMap,
    playTrack,
  ]);

  const handleNextVerse = useCallback(() => {
    if (currentVerseIndex + 1 < displayedVerses.length) {
      playTrack(currentVerseIndex + 1, 'arabic');
    }
  }, [currentVerseIndex, displayedVerses.length, playTrack]);

  const handlePrevVerse = useCallback(() => {
    if (currentTime > 3) {
      const audio = audioRef.current;
      if (audio) audio.currentTime = 0;
    } else if (currentVerseIndex > 0) {
      playTrack(currentVerseIndex - 1, 'arabic');
    }
  }, [currentTime, currentVerseIndex, playTrack]);

  const handleSeek = useCallback((seconds) => {
    const audio = audioRef.current;
    if (audio && !isNaN(seconds)) {
      audio.currentTime = seconds;
      setCurrentTime(seconds);
    }
  }, []);

  const handleClosePlayer = useCallback(() => {
    if (playTimeoutRef.current) {
      clearTimeout(playTimeoutRef.current);
      playTimeoutRef.current = null;
    }
    consecutiveErrorsRef.current = 0;
    pauseAudio();
    setIsPlayerOpen(false);
  }, [pauseAudio]);

  const handleContinuousPlayBtnClick = useCallback(() => {
    if (isPlayerOpen && isPlaying) {
      pauseAudio();
    } else if (isPlayerOpen && !isPlaying) {
      resumeAudio();
    } else {
      playTrack(0, 'arabic');
    }
  }, [isPlayerOpen, isPlaying, pauseAudio, resumeAudio, playTrack]);

  const activeVerse = displayedVerses[currentVerseIndex] || displayedVerses[0];

  return (
    <div
      className={`${styles.surahViewer} ${
        isPlayerOpen ? styles['surahViewer--playerOpen'] : ''
      }`}
    >
      {/* ===== نوار بالایی: انتخاب قاری، فیلتر سوره و دکمه پخش ===== */}
      <div className={styles.topBar}>
        <div className={styles.toolbarRow}>
          {/* انتخابگر قاری قرآن */}
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

          {/* دکمه شروع / توقف پخش سوره */}
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

      </div>

      {/* ===== لیست کارت‌های آیات ===== */}
      <section
        className={styles.versesList}
        aria-label={`آیات سوره ${surahNameFa}`}
      >
        {displayedVerses.length > 0 ? (
          displayedVerses.map((verse, index) => {
            const isThisVerseActive = isPlayerOpen && currentVerseIndex === index;
            const activeStepForCard = isThisVerseActive ? currentStep : null;

            const currentArabicAudioUrl =
              verse.customArabicAudioUrl ||
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
          })
        ) : (
          <div className={styles.emptyState}>
            <BookOpen size={32} aria-hidden="true" />
            <p>هیچ آیه‌ای با تفسیر اختصاصی در این بخش یافت نشد.</p>
          </div>
        )}
      </section>

      {/* ===== نوار پلیر چسبان انتهای صفحه ===== */}
      {isPlayerOpen && activeVerse && (
        <QuranAudioPlayer
          surahNameFa={surahNameFa}
          currentVerseNumber={activeVerse.verseNumber}
          totalVerses={displayedVerses.length}
          currentStep={currentStep}
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
          reciterName={currentReciterObj.name}
          onPlayPause={handlePlayPauseToggle}
          onNextVerse={handleNextVerse}
          onPrevVerse={handlePrevVerse}
          onSeek={handleSeek}
          onClose={handleClosePlayer}
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
