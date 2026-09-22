/**
 * @file src/app/quran/[surahNumber]/page.js
 * @description صفحه‌ی سرور (Server Component) برای نمایش آیات و تفسیر اختصاصی سوره.
 *
 * منطق واکشی داده (Resilient Server Fetching):
 * ۱. خواندن تنظیمات و آیات تفسیر سوره از Strapi با getSurahTafsir.
 * ۲. اگر showAllVerses === true: واکشی کل سوره از Al Quran Cloud و ادغام با آیات Strapi.
 * ۳. اگر showAllVerses === false: واکشی تکی فقط همان آیات موجود در Strapi با Promise.allSettled.
 * ۴. متادیتای پویا (SEO) و اسکیمای JSON-LD از نوع ItemPage و AudioObject.
 */

import { notFound } from 'next/navigation';
import { getSurahTafsir } from '@/lib/tafsirApi';
import { SITE_NAME, SITE_URL } from '@/lib/constants';
import SurahViewer from '@/modules/quran/SurahViewer';
import Breadcrumb from '@/components/ui/BreadCrumb/Breadcrumb';
import styles from './page.module.scss';

export const dynamic = 'force-dynamic';



// ============================================================================
// پیکربندی API خارجی Al Quran Cloud
// ============================================================================
const QURAN_CLOUD_BASE = 'https://api.alquran.cloud/v1';
const EDITIONS = 'quran-uthmani,fa.makarem,ar.alafasy';

/**
 * نگاشت شماره سوره به نام فارسی برای SEO و UI
 * @type {Record<number, string>}
 */
const SURAH_NAMES_FA = {
  1: 'الفاتحه', 2: 'البقره', 3: 'آل عمران', 4: 'النساء', 5: 'المائده',
  6: 'الأنعام', 7: 'الأعراف', 8: 'الأنفال', 9: 'التوبه', 10: 'یونس',
  11: 'هود', 12: 'یوسف', 13: 'الرعد', 14: 'ابراهیم', 15: 'الحجر',
  16: 'النحل', 17: 'الإسراء', 18: 'الکهف', 19: 'مریم', 20: 'طه',
  21: 'الأنبیاء', 22: 'الحج', 23: 'المؤمنون', 24: 'النور', 25: 'الفرقان',
  26: 'الشعراء', 27: 'النمل', 28: 'القصص', 29: 'العنکبوت', 30: 'الروم',
  31: 'لقمان', 32: 'السجده', 33: 'الأحزاب', 34: 'سبأ', 35: 'فاطر',
  36: 'یس', 37: 'الصافات', 38: 'ص', 39: 'الزمر', 40: 'غافر',
  41: 'فصلت', 42: 'الشوری', 43: 'الزخرف', 44: 'الدخان', 45: 'الجاثیه',
  46: 'الأحقاف', 47: 'محمد', 48: 'الفتح', 49: 'الحجرات', 50: 'ق',
  51: 'الذاریات', 52: 'الطور', 53: 'النجم', 54: 'القمر', 55: 'الرحمن',
  56: 'الواقعه', 57: 'الحدید', 58: 'المجادله', 59: 'الحشر', 60: 'الممتحنه',
  61: 'الصف', 62: 'الجمعه', 63: 'المنافقون', 64: 'التغابن', 65: 'الطلاق',
  66: 'التحریم', 67: 'الملک', 68: 'القلم', 69: 'الحاقه', 70: 'المعارج',
  71: 'نوح', 72: 'الجن', 73: 'المزمل', 74: 'المدثر', 75: 'القیامه',
  76: 'الإنسان', 77: 'المرسلات', 78: 'النبأ', 79: 'النازعات', 80: 'عبس',
  81: 'التکویر', 82: 'الانفطار', 83: 'المطففین', 84: 'الانشقاق', 85: 'البروج',
  86: 'الطارق', 87: 'الأعلی', 88: 'الغاشیه', 89: 'الفجر', 90: 'البلد',
  91: 'الشمس', 92: 'اللیل', 93: 'الضحی', 94: 'الشرح', 95: 'التین',
  96: 'العلق', 97: 'القدر', 98: 'البینه', 99: 'الزلزله', 100: 'العادیات',
  101: 'القارعه', 102: 'التکاثر', 103: 'العصر', 104: 'الهمزه', 105: 'الفیل',
  106: 'قریش', 107: 'الماعون', 108: 'الکوثر', 109: 'الکافرون', 110: 'النصر',
  111: 'المسد', 112: 'الإخلاص', 113: 'الفلق', 114: 'الناس',
};

// ============================================================================
// تولید متادیتای داینامیک برای SEO
// ============================================================================

/**
 * @param {{ params: Promise<{ surahNumber: string }> }} context
 * @returns {Promise<import('next').Metadata>}
 */
export async function generateMetadata({ params }) {
  const { surahNumber } = await params;
  const num = parseInt(surahNumber, 10);

  if (isNaN(num) || num < 1 || num > 114) {
    return { title: 'سوره یافت نشد' };
  }

  const surahNameFa = SURAH_NAMES_FA[num] || `سوره ${num}`;
  const title = `تفسیر سوره ${surahNameFa}`;
  const description = `متن آیات، ترجمه فارسی و تفسیر اختصاصی سوره ${surahNameFa} به همراه پخش صوت قرائت عربی و ترجمه گویا در ${SITE_NAME}.`;

  return {
    title,
    description,
    alternates: {
      canonical: `${SITE_URL}/quran/${num}`,
    },
    openGraph: {
      title: `${title} | ${SITE_NAME}`,
      description,
      url: `${SITE_URL}/quran/${num}`,
      siteName: SITE_NAME,
      locale: 'fa_IR',
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title: `${title} | ${SITE_NAME}`,
      description,
    },
  };
}

// ============================================================================
// کامپوننت اصلی صفحه (Server Component)
// ============================================================================

/**
 * @param {{ params: Promise<{ surahNumber: string }> }} props
 */
export default async function SurahTafsirPage({ params }) {
  const { surahNumber } = await params;
  const num = parseInt(surahNumber, 10);

  if (isNaN(num) || num < 1 || num > 114) {
    notFound();
  }

  // --------------------------------------------------------------------------
  // مرحله ۱: واکشی داده‌های سوره از Strapi
  // --------------------------------------------------------------------------
  const strapiSurah = await getSurahTafsir(num);
  const strapiVerses = strapiSurah?.verses || [];
  const showAllVerses = Boolean(strapiSurah?.showAllVerses);

  // فقط سوره‌هایی که در سامانه ثبت شده‌اند و (دارای آیه بوده یا showAllVerses روشن باشد) مجازند
  if (!strapiSurah || (!showAllVerses && strapiVerses.length === 0)) {
    notFound();
  }

  // --------------------------------------------------------------------------
  // مرحله ۲: واکشی مقاوم با اولویت دیتای بک‌اند و فال‌بک به API خارجی
  // --------------------------------------------------------------------------
  let surahArabicName = '';
  let surahEnglishName = '';
  let stitchedVerses = [];

  if (showAllVerses) {
    // در صورت فعال بودن showAllVerses، تمام آیات سوره لود می‌شوند
    try {
      const res = await fetch(
        `${QURAN_CLOUD_BASE}/surah/${num}/editions/${EDITIONS}`,
        { next: { revalidate: 86400 }, signal: AbortSignal.timeout(8000) }
      );
      if (res.ok) {
        const json = await res.json();
        const arabicData = json.data?.[0]?.ayahs || [];
        const persianData = json.data?.[1]?.ayahs || [];
        const audioData = json.data?.[2]?.ayahs || [];

        if (json.data?.[0]?.name) surahArabicName = json.data[0].name;
        if (json.data?.[0]?.englishName) surahEnglishName = json.data[0].englishName;

        stitchedVerses = arabicData.map((ayah, idx) => {
          const vNum = ayah.numberInSurah;
          const strapiVerse = strapiVerses.find((v) => v.verseNumber === vNum);
          const persianAyah = persianData[idx];
          const audioAyah = audioData[idx];

          const arabicText = strapiVerse?.ayeText || ayah.text || '';
          const customArabicAudio = strapiVerse?.ayeAudioUrl || null;
          const arabicAudioUrl = customArabicAudio || audioAyah?.audio || '';

          const persianTranslation = strapiVerse?.translationText || persianAyah?.text || '';
          const translationAudioUrl = strapiVerse?.translationAudioUrl || null;

          const tafsirText = strapiVerse?.tafsirText || null;
          const tafsirAudioUrl = strapiVerse?.tafsirAudioUrl || null;
          const hasTafsir = Boolean(tafsirText || tafsirAudioUrl);

          return {
            verseNumber: vNum,
            arabicText,
            customArabicAudioUrl: customArabicAudio,
            arabicAudioUrl,
            persianTranslation,
            translationText: strapiVerse?.translationText || null,
            translationAudioUrl,
            tafsirText,
            tafsirAudioUrl,
            hasTafsir,
          };
        });
      }
    } catch (err) {
      console.warn(`عدم دسترسی به API کل سوره ${num}:`, err.message);
    }
  }

  // اگر showAllVerses غیرفعال باشد یا دریافت کل سوره با خطا مواجه شود، فقط آیات ثبت‌شده استراپی لود می‌شوند
  if (stitchedVerses.length === 0) {
    const settledResults = await Promise.allSettled(
      strapiVerses.map(async (v) => {
        try {
          const res = await fetch(
            `${QURAN_CLOUD_BASE}/ayah/${num}:${v.verseNumber}/editions/${EDITIONS}`,
            { next: { revalidate: 86400 }, signal: AbortSignal.timeout(5000) }
          );
          if (res.ok) {
            const json = await res.json();
            return {
              verseNumber: v.verseNumber,
              data: json.data,
              strapiVerse: v,
            };
          }
        } catch (err) {
          // در صورت قطعی اینترنت یا API خارجی، برنامه متوقف نمی‌شود و از دیتای بک‌اند استفاده می‌کند
          console.warn(`عدم دسترسی به API خارجی برای آیه ${v.verseNumber}:`, err.message);
        }
        return {
          verseNumber: v.verseNumber,
          data: null,
          strapiVerse: v,
        };
      })
    );

    stitchedVerses = settledResults
      .filter((r) => r.status === 'fulfilled' && r.value?.strapiVerse)
      .map((r) => {
        const { verseNumber, data, strapiVerse } = r.value;
        const arabicAyah = data && Array.isArray(data) ? data[0] : null;
        const persianAyah = data && Array.isArray(data) ? data[1] : null;
        const arabicAudio = data && Array.isArray(data) ? data[2] : null;

        if (!surahArabicName && arabicAyah?.surah?.name) {
          surahArabicName = arabicAyah.surah.name;
        }
        if (!surahEnglishName && arabicAyah?.surah?.englishName) {
          surahEnglishName = arabicAyah.surah.englishName;
        }

        // شرط اولویت:
        // ۱. اگر متن یا صوت در بک‌اند شما پر شده باشد، حتماً از همان استفاده می‌شود.
        // ۲. در غیر این صورت، از API خارجی و منابع پیش‌فرض استفاده می‌گردد.
        const arabicText = strapiVerse?.ayeText || arabicAyah?.text || '';
        const customArabicAudio = strapiVerse?.ayeAudioUrl || null;
        const arabicAudioUrl = customArabicAudio || arabicAudio?.audio || '';

        const persianTranslation = strapiVerse?.translationText || persianAyah?.text || '';
        const translationAudioUrl = strapiVerse?.translationAudioUrl || null;

        return {
          verseNumber,
          arabicText,
          customArabicAudioUrl: customArabicAudio,
          arabicAudioUrl,
          persianTranslation,
          translationText: strapiVerse?.translationText || null,
          translationAudioUrl,
          tafsirText: strapiVerse?.tafsirText || null,
          tafsirAudioUrl: strapiVerse?.tafsirAudioUrl || null,
          hasTafsir: Boolean(strapiVerse?.tafsirText || strapiVerse?.tafsirAudioUrl),
        };
      })
      .sort((a, b) => a.verseNumber - b.verseNumber);
  }

  if (stitchedVerses.length === 0) {
    notFound();
  }

  const surahNameFa = SURAH_NAMES_FA[num] || surahEnglishName || `سوره ${num}`;
  const finalArabicName = surahArabicName || `سُورَةُ ${surahNameFa}`;

  // --------------------------------------------------------------------------
  // مرحله ۳: تولید ساختار داده‌ای ساختارمند JSON-LD (ItemPage & AudioObject)
  // --------------------------------------------------------------------------
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemPage',
    name: `تفسیر سوره ${surahNameFa} | ${SITE_NAME}`,
    description: `آیات و تفسیر اختصاصی سوره ${surahNameFa}`,
    url: `${SITE_URL}/quran/${num}`,
    inLanguage: ['fa', 'ar'],
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/images/SITELOGO.png`,
      },
    },
    audio: stitchedVerses
      .filter((v) => v.arabicAudioUrl || v.tafsirAudioUrl)
      .slice(0, 5)
      .map((v) => ({
        '@type': 'AudioObject',
        name: `صوت آیه ${v.verseNumber} سوره ${surahNameFa}`,
        contentUrl: v.tafsirAudioUrl || v.arabicAudioUrl,
        encodingFormat: 'audio/mpeg',
      })),
  };

  const breadcrumbItems = [
    { label: 'خانه', href: '/' },
    { label: 'قرآن کریم', href: '/quran' },
    { label: `تفسیر سوره ${surahNameFa}` },
  ];

  return (
    <main className={styles.tafsirPage}>
      {/* تزریق اسکیما برای موتورهای جستجو */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="container">
        {/* مسیر ناوبری */}
        <Breadcrumb items={breadcrumbItems} />

        {/* هدر سوره */}
        <header className={styles.surahHeader}>
          <h1 className={styles.surahNameArabic} lang="ar" dir="rtl">
            {finalArabicName}
          </h1>
          <p className={styles.surahMeta}>
            <span className={styles.surahNumber}>سوره {num}</span>
            {surahEnglishName && (
              <span className={styles.surahEnglishName}>{surahEnglishName}</span>
            )}
            <span className={styles.verseCount}>
              {showAllVerses
                ? `${stitchedVerses.length} آیه`
                : `${stitchedVerses.length} آیه دارای تفسیر اختصاصی`}
            </span>
          </p>

          {/* بسم‌الله الرحمن الرحیم */}
          {num !== 9 && num !== 1 && (
            <p className={styles.basmala} lang="ar" dir="rtl" aria-label="بسم‌الله الرحمن الرحیم">
              بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
            </p>
          )}
        </header>

        {/* کلاینت‌کامپوننت مدیریت و نمایش آیات و پلیر */}
        <SurahViewer
          verses={stitchedVerses}
          surahNumber={num}
          surahNameFa={surahNameFa}
        />
      </div>
    </main>
  );
}
