'use client';

/**
 * @file src/modules/quran/SurahViewer.jsx
 * @description کامپوننت کلاینت هماهنگ‌کننده آیات سوره، فیلتر موضوعی، انتخاب قاری و پلیر پیوسته
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Play, Pause, User, Loader2, ChevronDown, BookOpen, Tag } from 'lucide-react';
import { getRazaviAudioUrl } from '@/utils/quranAudio';
import { RECITERS_LIST, DEFAULT_RECITER } from '@/utils/quranReciters';
import VerseCard from './VerseCard';
import QuranAudioPlayer from './QuranAudioPlayer';
import styles from './SurahViewer.module.scss';

/**
 * کلید یکتای هر آیه (پشتیبانی از حالت تک‌سوره و چندسوره در تفسیر موضوعی)
 */
function getVerseKey(verse, fallbackSurahNumber) {
  const sNum = verse?.surahNumber || fallbackSurahNumber || 0;
  return `${sNum}:${verse?.verseNumber}`;
}

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

  const currentSurahNum = currentVerse.surahNumber || surahNumber;
  const currentKey = getVerseKey(currentVerse, surahNumber);

  if (currentStep === 'arabic') {
    const persianUrl =
      currentVerse.translationAudioUrl ||
      getRazaviAudioUrl(currentSurahNum, currentVerse.verseNumber);
    const hasPersian = Boolean(persianUrl) && !failedPersianSet.has(currentKey);

    if (hasPersian) {
      return { index: currentIndex, step: 'persian', url: persianUrl };
    }

    const tafsirUrl = currentVerse.tafsirAudioUrl || currentVerse.tafsirAudio?.url;
    if (tafsirUrl) {
      return { index: currentIndex, step: 'tafsir', url: tafsirUrl };
    }

    if (currentIndex + 1 < verses.length) {
      const nextVerse = verses[currentIndex + 1];
      const nextKey = getVerseKey(nextVerse, surahNumber);
      const nextArabicUrl =
        nextVerse.customArabicAudioUrl ||
        reciterAudioMap[selectedReciter]?.[nextKey] ||
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
      const nextKey = getVerseKey(nextVerse, surahNumber);
      const nextArabicUrl =
        nextVerse.customArabicAudioUrl ||
        reciterAudioMap[selectedReciter]?.[nextKey] ||
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
      const nextKey = getVerseKey(nextVerse, surahNumber);
      const nextArabicUrl =
        nextVerse.customArabicAudioUrl ||
        reciterAudioMap[selectedReciter]?.[nextKey] ||
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
  const effectiveSurahNum = verse.surahNumber || surahNumber;
  const vKey = getVerseKey(verse, surahNumber);

  switch (step) {
    case 'arabic':
      return (
        verse.customArabicAudioUrl ||
        reciterAudioMap[selectedReciter]?.[vKey] ||
        reciterAudioMap[selectedReciter]?.[verse.verseNumber] ||
        verse.arabicAudioUrl ||
        ''
      );
    case 'persian':
      return (
        verse.translationAudioUrl ||
        getRazaviAudioUrl(effectiveSurahNum, verse.verseNumber)
      );
    case 'tafsir':
      return verse.tafsirAudioUrl || verse.tafsirAudio?.url || '';
    default:
      return '';
  }
}

/**
 * @param {{
 *   verses: Array<any>,
 *   surahNumber?: number,
 *   surahNameFa: string,
 *   showSurahBadge?: boolean,
 * }} props
 */
export default function SurahViewer({
  verses = [],
  surahNumber,
  surahNameFa,
  showSurahBadge = false,
}) {
  // --------------------------------------------------------------------------
  // فیلتر موضوعی در داخل سوره (در صورتی که آیات دارای موضوع باشند)
  // --------------------------------------------------------------------------
  const [selectedSubjectSlug, setSelectedSubjectSlug] = useState('all');

  const availableSubjects = useMemo(() => {
    if (showSurahBadge) return []; // در صفحه خود موضوع، نیازی به فیلتر مجدد موضوع نیست
    const map = new Map();
    verses.forEach((v) => {
      if (Array.isArray(v.subjects)) {
        v.subjects.forEach((sub) => {
          if (sub && sub.title) {
            const key = sub.slug || String(sub.id);
            const existing = map.get(key);
            if (existing) {
              existing.count += 1;
            } else {
              map.set(key, {
                slug: key,
                title: sub.title,
                count: 1,
              });
            }
          }
        });
      }
    });
    return Array.from(map.values());
  }, [verses, showSurahBadge]);

  const displayedVerses = useMemo(() => {
    if (selectedSubjectSlug === 'all') return verses;
    return verses.filter(
      (v) =>
        Array.isArray(v.subjects) &&
        v.subjects.some((s) => (s.slug || String(s.id)) === selectedSubjectSlug)
    );
  }, [verses, selectedSubjectSlug]);

  // --------------------------------------------------------------------------
  // State: انتخاب قاری
  // --------------------------------------------------------------------------
  const [selectedReciter, setSelectedReciter] = useState(DEFAULT_RECITER);
  const [isReciterLoading, setIsReciterLoading] = useState(false);

  // کش صوت قاریان: { [reciterId]: { [verseKey]: url } }
  const [reciterAudioMap, setReciterAudioMap] = useState(() => {
    const initialMap = {};
    verses.forEach((v) => {
      if (v.arabicAudioUrl) {
        const key = getVerseKey(v, surahNumber);
        initialMap[key] = v.arabicAudioUrl;
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

  // نگهداری آیاتی که صوت ترجمه‌شان لود نشد
  const [failedPersianAudios, setFailedPersianAudios] = useState(() => new Set());

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
          const vKey = getVerseKey(currentVerse, surahNumber);
          const newUrl =
            reciterAudioMap[newReciterId][vKey] ||
            reciterAudioMap[newReciterId][currentVerse?.verseNumber];
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
        // جمع‌آوری سوره‌های یکتا (پشتیبانی از حالت تک‌سوره و چندسوره در تفسیر موضوعی)
        const uniqueSurahNumbers = Array.from(
          new Set(
            verses
              .map((v) => v.surahNumber || surahNumber)
              .filter(Boolean)
          )
        );

        const mapForReciter = {};

        await Promise.allSettled(
          uniqueSurahNumbers.map(async (sNum) => {
            const response = await fetch(
              `https://api.alquran.cloud/v1/surah/${sNum}/${newReciterId}`
            );
            if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
            const data = await response.json();

            if (data?.data?.ayahs && Array.isArray(data.data.ayahs)) {
              data.data.ayahs.forEach((ayah) => {
                mapForReciter[`${sNum}:${ayah.numberInSurah}`] = ayah.audio;
                if (sNum === surahNumber) {
                  mapForReciter[ayah.numberInSurah] = ayah.audio;
                }
              });
            }
          })
        );

        if (Object.keys(mapForReciter).length > 0) {
          setReciterAudioMap((prev) => ({
            ...prev,
            [newReciterId]: mapForReciter,
          }));

          if (isPlaying && currentStep === 'arabic') {
            const currentVerse = displayedVerses[currentVerseIndex];
            const vKey = getVerseKey(currentVerse, surahNumber);
            const newUrl =
              mapForReciter[vKey] || mapForReciter[currentVerse?.verseNumber];
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
    [reciterAudioMap, isPlaying, currentStep, currentVerseIndex, displayedVerses, verses, surahNumber]
  );

  // اسکرول نرم به آیه فعال
  const scrollToVerse = useCallback(
    (verse) => {
      if (!verse) return;
      const effectiveSurahNum = verse.surahNumber || surahNumber;
      const domId = showSurahBadge
        ? `verse-${effectiveSurahNum}-${verse.verseNumber}`
        : `verse-${verse.verseNumber}`;
      const el = document.getElementById(domId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    },
    [surahNumber, showSurahBadge]
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
            scrollToVerse(verse);
          })
          .catch((err) => {
            if (err.name === 'AbortError') {
              return;
            }
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

  const handleAudioError = useCallback(() => {
    consecutiveErrorsRef.current += 1;

    if (consecutiveErrorsRef.current >= 2) {
      console.warn('⚠️ فایل صوتی در دسترس نیست. برای جلوگیری از قفل شدن مرورگر، پخش متوقف شد.');
      setIsPlaying(false);
      consecutiveErrorsRef.current = 0;
      return;
    }

    const verse = displayedVerses[currentVerseIndex];
    const updatedFailed = new Set(failedPersianAudios);
    if (currentStep === 'persian' && verse) {
      updatedFailed.add(getVerseKey(verse, surahNumber));
      setFailedPersianAudios(updatedFailed);
    }

    if (playTimeoutRef.current) clearTimeout(playTimeoutRef.current);
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
      {/* ===== نوار بالایی: انتخاب قاری، فیلتر موضوعی و دکمه پخش ===== */}
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

          {/* دکمه شروع / توقف پخش پیوسته */}
          <button
            type="button"
            className={`${styles.playContinuousBtn} ${
              isPlayerOpen && isPlaying ? styles['playContinuousBtn--active'] : ''
            }`}
            onClick={handleContinuousPlayBtnClick}
            aria-label="پخش پیوسته آیات"
          >
            {isPlayerOpen && isPlaying ? (
              <>
                <Pause size={16} aria-hidden="true" />
                <span>توقف پخش</span>
              </>
            ) : (
              <>
                <Play size={16} aria-hidden="true" />
                <span>{showSurahBadge ? 'پخش پیوسته موضوع' : 'پخش پیوسته سوره'}</span>
              </>
            )}
          </button>
        </div>

        {/* نوار فیلتر موضوعات موجود در این سوره */}
        {availableSubjects.length > 0 && (
          <div className={styles.filterContainer}>
            <div className={styles.filterTabs} role="tablist" aria-label="فیلتر موضوعی آیات سوره">
              <button
                type="button"
                role="tab"
                aria-selected={selectedSubjectSlug === 'all'}
                className={`${styles.filterTab} ${
                  selectedSubjectSlug === 'all' ? styles['filterTab--active'] : ''
                }`}
                onClick={() => setSelectedSubjectSlug('all')}
              >
                <span>همه آیات</span>
                <span className={styles.filterCountBadge}>{verses.length}</span>
              </button>

              {availableSubjects.map((sub) => (
                <button
                  key={sub.slug}
                  type="button"
                  role="tab"
                  aria-selected={selectedSubjectSlug === sub.slug}
                  className={`${styles.filterTab} ${
                    selectedSubjectSlug === sub.slug ? styles['filterTab--active'] : ''
                  }`}
                  onClick={() => setSelectedSubjectSlug(sub.slug)}
                >
                  <Tag size={12} aria-hidden="true" />
                  <span>{sub.title}</span>
                  <span className={styles.filterCountBadge}>{sub.count}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ===== لیست کارت‌های آیات ===== */}
      <section
        className={styles.versesList}
        aria-label={`آیات ${surahNameFa}`}
      >
        {displayedVerses.length > 0 ? (
          displayedVerses.map((verse, index) => {
            const isThisVerseActive = isPlayerOpen && currentVerseIndex === index;
            const activeStepForCard = isThisVerseActive ? currentStep : null;
            const vKey = getVerseKey(verse, surahNumber);

            const currentArabicAudioUrl =
              verse.customArabicAudioUrl ||
              reciterAudioMap[selectedReciter]?.[vKey] ||
              reciterAudioMap[selectedReciter]?.[verse.verseNumber] ||
              verse.arabicAudioUrl;

            const verseWithActiveReciter = {
              ...verse,
              arabicAudioUrl: currentArabicAudioUrl,
            };

            const nextVerse =
              index < displayedVerses.length - 1 ? displayedVerses[index + 1] : null;
            const isSurahChanging = Boolean(
              nextVerse &&
                Number(nextVerse.surahNumber || surahNumber) !==
                  Number(verse.surahNumber || surahNumber)
            );

            return (
              <VerseCard
                key={verse.id || vKey}
                verse={verseWithActiveReciter}
                surahNumber={verse.surahNumber || surahNumber}
                showSurahBadge={showSurahBadge}
                showDivider={showSurahBadge ? isSurahChanging : undefined}
                isActive={isThisVerseActive}
                activeStep={activeStepForCard}
                isPlaying={isPlaying}
                isPersianAudioAvailable={!failedPersianAudios.has(vKey)}
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
          surahNameFa={activeVerse.surahNameFa || surahNameFa}
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
