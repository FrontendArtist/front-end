'use client';

/**
 * @file src/modules/quran/QuranDirectory/QuranDirectory.jsx
 * @description فهرست جامع و اسلامی سوره‌های قرآن کریم و تفسیر موضوعی با عنوان «کلام نور»
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Search, X, BookOpen, ChevronLeft, Sparkles, Tag, Layers } from 'lucide-react';
import { SURAHS_DATA } from '@/utils/quranSurahsData';
import styles from './QuranDirectory.module.scss';

/**
 * شمسه هشت‌پر اسلامی برای نمایش شماره سوره
 */
function IslamicOctagramSvg() {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <rect x="20" y="20" width="60" height="60" rx="4" />
      <rect x="20" y="20" width="60" height="60" rx="4" transform="rotate(45 50 50)" />
      <circle cx="50" cy="50" r="28" fill="none" stroke="rgba(246, 217, 130, 0.4)" strokeWidth="1" />
    </svg>
  );
}

/**
 * خوشنویسی اصیل بسم‌الله الرحمن الرحیم به فرمت SVG
 */
function BismillahCalligraphySvg() {
  return (
    <svg viewBox="0 0 500 100" fill="currentColor" aria-hidden="true" focusable="false">
      <text
        x="50%"
        y="55%"
        textAnchor="middle"
        dominantBaseline="middle"
        fontFamily="'Amiri', 'Traditional Arabic', serif"
        fontSize="38"
        fontWeight="bold"
        fill="var(--color-text-primary)"
        letterSpacing="2"
      >
        بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
      </text>
    </svg>
  );
}

/**
 * @param {{
 *   tafsirSurahs: Array<{ surahNumber: number, title?: string, hasTafsir: boolean, tafsirVersesCount?: number }>,
 *   quranSubjects?: Array<{ id: number|string, title: string, slug: string, description?: string|null, versesCount?: number }>
 * }} props
 */
export default function QuranDirectory({ tafsirSurahs = [], quranSubjects = [] }) {
  const [activeTab, setActiveTab] = useState('surahs'); // 'surahs' | 'subjects'
  const [searchQuery, setSearchQuery] = useState('');

  // نگاشت سوره‌های دارای تفسیر از Strapi برای جستجوی O(1)
  const tafsirMap = useMemo(() => {
    const map = new Map();
    (tafsirSurahs || []).forEach((item) => {
      if (item && item.surahNumber && item.hasTafsir) {
        map.set(Number(item.surahNumber), item);
      }
    });
    return map;
  }, [tafsirSurahs]);

  // فقط سوره‌هایی که در سامانه دارای تفسیر ثبت‌شده هستند
  const tafsirSurahsList = useMemo(() => {
    return SURAHS_DATA.filter((s) => tafsirMap.has(s.number));
  }, [tafsirMap]);

  // فیلتر و جستجو میان سوره‌های دارای تفسیر
  const filteredSurahs = useMemo(() => {
    return tafsirSurahsList.filter((surah) => {
      if (!searchQuery.trim()) return true;

      const query = searchQuery.trim().toLowerCase();
      const numStr = String(surah.number);
      const nameFa = (surah.nameFa || '').toLowerCase();
      const nameAr = (surah.name || '').toLowerCase();
      const nameEn = (surah.englishName || '').toLowerCase();

      return (
        numStr === query ||
        numStr.padStart(3, '0') === query ||
        nameFa.includes(query) ||
        nameAr.includes(query) ||
        nameEn.includes(query)
      );
    });
  }, [searchQuery, tafsirSurahsList]);

  // فیلتر و جستجو میان موضوعات قرآنی
  const filteredSubjects = useMemo(() => {
    return (quranSubjects || []).filter((sub) => {
      if (!searchQuery.trim()) return true;
      const query = searchQuery.trim().toLowerCase();
      const title = (sub.title || '').toLowerCase();
      const desc = (sub.description || '').toLowerCase();
      return title.includes(query) || desc.includes(query);
    });
  }, [searchQuery, quranSubjects]);

  // تعداد آیتم‌ها در هر بار بارگذاری (Lazy Load)
  const PAGE_SIZE = 12;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef(null);

  // ریست تعداد آیتم‌ها با تغییر عبارت جستجو یا تب
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [searchQuery, activeTab]);

  // بارگذاری خودکار با اسکرول (Infinite Scroll / Lazy Load)
  useEffect(() => {
    if (!sentinelRef.current || activeTab !== 'surahs') return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => {
            if (prev < filteredSurahs.length) {
              return prev + PAGE_SIZE;
            }
            return prev;
          });
        }
      },
      { rootMargin: '250px' }
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [filteredSurahs.length, activeTab]);

  const visibleSurahs = useMemo(() => {
    return filteredSurahs.slice(0, visibleCount);
  }, [filteredSurahs, visibleCount]);

  return (
    <div className={styles.directory} dir="rtl">
      {/* ===== بخش Hero: خوشنویسی و عنوان اسلامی ===== */}
      <header className={styles.hero}>
        <div className={styles.bismillahWrap}>
          <BismillahCalligraphySvg />
        </div>

        <h1 className={styles.heroTitle}>کلام نور</h1>
        <p className={styles.heroSubtitle}>
          فهرست سوره‌ها، تفاسیر اختصاصی و تفسیر موضوعی قرآن کریم در طرح الهی
        </p>

        <div className={styles.statsBar}>
          <span className={styles.statPill}>
            <Sparkles size={14} aria-hidden="true" />
            <span>سوره‌های دارای تفسیر:</span>
            <strong>{tafsirSurahsList.length} سوره</strong>
          </span>

          {quranSubjects.length > 0 && (
            <span className={styles.statPill}>
              <Tag size={14} aria-hidden="true" />
              <span>موضوعات قرآنی:</span>
              <strong>{quranSubjects.length} موضوع</strong>
            </span>
          )}
        </div>
      </header>

      {/* ===== تب‌های انتخاب حالت نمایش: فهرست سوره‌ها / تفسیر موضوعی ===== */}
      <div className={styles.modeSwitchRow}>
        <div className={styles.filterTabs} role="tablist" aria-label="نوع دسته‌بندی تفسیر">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'surahs'}
            className={`${styles.tabBtn} ${
              activeTab === 'surahs' ? styles['tabBtn--active'] : ''
            }`}
            onClick={() => setActiveTab('surahs')}
          >
            <BookOpen size={15} aria-hidden="true" />
            <span>تفسیر سوره به سوره</span>
            <span className={styles.badgeCount}>{tafsirSurahsList.length}</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'subjects'}
            className={`${styles.tabBtn} ${
              activeTab === 'subjects' ? styles['tabBtn--active'] : ''
            }`}
            onClick={() => setActiveTab('subjects')}
          >
            <Layers size={15} aria-hidden="true" />
            <span>تفسیر موضوعی</span>
            <span className={styles.badgeCount}>{quranSubjects.length}</span>
          </button>
        </div>
      </div>

      {/* ===== باکس جستجو ===== */}
      <div className={styles.searchBox}>
        <Search size={18} className={styles.searchIcon} aria-hidden="true" />
        <input
          type="text"
          className={styles.searchInput}
          placeholder={
            activeTab === 'surahs'
              ? 'جستجوی سوره با نام فارسی، عربی یا شماره ...'
              : 'جستجوی موضوع قرآنی (مثلاً: تقوا، توحید، انفاق ...)'
          }
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          aria-label={activeTab === 'surahs' ? 'جستجوی سوره' : 'جستجوی موضوع قرآنی'}
        />
        {searchQuery && (
          <button
            type="button"
            className={styles.clearSearchBtn}
            onClick={() => setSearchQuery('')}
            aria-label="پاک کردن جستجو"
            title="پاک کردن"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* ===== محتوای تب ۱: گرید کارت‌های سوره‌ها ===== */}
      {activeTab === 'surahs' && (
        <>
          <main className={styles.surahGrid} aria-label="فهرست سوره‌ها">
            {visibleSurahs.length > 0 ? (
              visibleSurahs.map((surah) => {
                const strapiInfo = tafsirMap.get(surah.number);
                const hasTafsir = Boolean(strapiInfo?.hasTafsir);

                return (
                  <Link
                    key={surah.number}
                    href={`/quran/${surah.number}`}
                    className={`${styles.surahCard} ${
                      hasTafsir ? styles['surahCard--hasTafsir'] : ''
                    }`}
                    aria-label={`سوره ${surah.nameFa}، شماره ${surah.number}`}
                  >
                    {/* ردیف بالا: شمسه شماره سوره + برچسب‌ها */}
                    <div className={styles.cardHeader}>
                      <div
                        className={styles.octagramBadge}
                        aria-label={`شماره سوره ${surah.number}`}
                      >
                        <IslamicOctagramSvg />
                        <span className={styles.numberText}>{surah.number}</span>
                      </div>

                      <div className={styles.badgesGroup}>
                        {hasTafsir && (
                          <span className={`${styles.tagBadge} ${styles['tagBadge--tafsir']}`}>
                            <BookOpen size={11} aria-hidden="true" />
                            <span>تفسیر اختصاصی</span>
                          </span>
                        )}
                        <span className={styles.tagBadge}>
                          {surah.revelationType === 'Meccan' ? 'مکی' : 'مدنی'}
                        </span>
                        <span className={styles.tagBadge}>
                          {surah.numberOfAyahs} آیه
                        </span>
                      </div>
                    </div>

                    {/* بدنه کارت: نام عربی و فارسی */}
                    <div className={styles.cardBody}>
                      <h2 className={styles.arabicName} lang="ar">
                        {surah.name}
                      </h2>
                      <div className={styles.faNameRow}>
                        <span className={styles.faName}>سوره {surah.nameFa}</span>
                        <span className={styles.enName}>{surah.englishName}</span>
                      </div>
                    </div>

                    {/* فوتر کارت: دکمه مشاهده */}
                    <div className={styles.cardFooter}>
                      <span>مشاهده آیات و تفسیر</span>
                      <span className={styles.surahArrow} aria-hidden="true">
                        <ChevronLeft size={16} />
                      </span>
                    </div>
                  </Link>
                );
              })
            ) : searchQuery.trim() ? (
              <div className={styles.emptyState}>
                <BookOpen size={48} aria-hidden="true" color="var(--color-text-primary)" />
                <h3>سوره‌ای با این مشخصات یافت نشد</h3>
                <p>لطفاً عبارت دیگری را جستجو نمایید یا جستجو را پاک کنید.</p>
                <button
                  type="button"
                  className={styles.resetBtn}
                  onClick={() => setSearchQuery('')}
                >
                  پاک کردن جستجو
                </button>
              </div>
            ) : (
              <div className={styles.emptyState}>
                <BookOpen size={48} aria-hidden="true" color="var(--color-text-primary)" />
                <h3>هنوز سوره‌ای ثبت نشده است</h3>
                <p>در حال حاضر هیچ سوره‌ای از دیتابیس دریافت نشد.</p>
              </div>
            )}
          </main>

          {visibleCount < filteredSurahs.length && (
            <div className={styles.loadMoreContainer}>
              <button
                type="button"
                onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
                className={styles.loadMoreButton}
              >
                بارگذاری بیشتر
              </button>
              <div ref={sentinelRef} className={styles.sentinel} aria-hidden="true" />
            </div>
          )}
        </>
      )}

      {/* ===== محتوای تب ۲: گرید کارت‌های موضوعات (تفسیر موضوعی) ===== */}
      {activeTab === 'subjects' && (
        <main className={styles.surahGrid} aria-label="فهرست موضوعات قرآنی">
          {filteredSubjects.length > 0 ? (
            filteredSubjects.map((sub) => (
              <Link
                key={sub.slug || sub.id}
                href={`/quran/subjects/${encodeURIComponent(sub.slug || sub.id)}`}
                className={`${styles.surahCard} ${styles['surahCard--hasTafsir']}`}
                aria-label={`موضوع ${sub.title}`}
              >
                <div className={styles.cardHeader}>
                  <div className={styles.subjectIconBadge}>
                    <Tag size={18} aria-hidden="true" />
                  </div>

                  <div className={styles.badgesGroup}>
                    <span className={`${styles.tagBadge} ${styles['tagBadge--tafsir']}`}>
                      <span>تفسیر موضوعی</span>
                    </span>
                    {typeof sub.versesCount === 'number' && (
                      <span className={styles.tagBadge}>
                        {sub.versesCount} آیه
                      </span>
                    )}
                  </div>
                </div>

                <div className={styles.cardBody}>
                  <h2 className={styles.subjectCardTitle}>{sub.title}</h2>
                  {sub.description && (
                    <p className={styles.subjectCardDesc}>{sub.description}</p>
                  )}
                </div>

                <div className={styles.cardFooter}>
                  <span>مشاهده آیات مرتبط</span>
                  <span className={styles.surahArrow} aria-hidden="true">
                    <ChevronLeft size={16} />
                  </span>
                </div>
              </Link>
            ))
          ) : searchQuery.trim() ? (
            <div className={styles.emptyState}>
              <Tag size={48} aria-hidden="true" color="var(--color-text-primary)" />
              <h3>موضوعی با این عنوان یافت نشد</h3>
              <p>لطفاً عبارت دیگری را جستجو نمایید یا جستجو را پاک کنید.</p>
              <button
                type="button"
                className={styles.resetBtn}
                onClick={() => setSearchQuery('')}
              >
                پاک کردن جستجو
              </button>
            </div>
          ) : (
            <div className={styles.emptyState}>
              <Tag size={48} aria-hidden="true" color="var(--color-text-primary)" />
              <h3>هنوز موضوعی ثبت نشده است</h3>
              <p>
                می‌توانید از پنل مدیریت استراپی در بخش QuranSubject موضوعات جدید اضافه کرده و به آیات متصل نمایید.
              </p>
            </div>
          )}
        </main>
      )}
    </div>
  );
}
