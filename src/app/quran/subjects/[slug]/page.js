/**
 * @file src/app/quran/subjects/[slug]/page.js
 * @description صفحه سرور (Server Component) برای نمایش تفسیر موضوعی قرآن کریم بر اساس موضوع (Subject)
 */

import { notFound } from 'next/navigation';
import { getSubjectTafsirBySlug } from '@/lib/tafsirApi';
import { SITE_NAME, SITE_URL } from '@/lib/constants';
import { SURAH_NAMES_FA } from '../../[surahNumber]/page';
import SurahViewer from '@/modules/quran/SurahViewer';
import Breadcrumb from '@/components/ui/BreadCrumb/Breadcrumb';
import styles from './page.module.scss';

export const dynamic = 'force-dynamic';

const QURAN_CLOUD_BASE = 'https://api.alquran.cloud/v1';
const EDITIONS = 'quran-uthmani,fa.makarem,ar.alafasy';

/**
 * تولید متادیتای داینامیک برای SEO صفحه تفسیر موضوعی
 * @param {{ params: Promise<{ slug: string }> }} context
 */
export async function generateMetadata({ params }) {
  const { slug } = await params;
  const data = await getSubjectTafsirBySlug(slug);

  if (!data?.subject) {
    return { title: 'موضوع یافت نشد' };
  }

  const { subject } = data;
  const title = `تفسیر موضوعی: ${subject.title}`;
  const description =
    subject.description ||
    `مجموعه آیات، ترجمه فارسی و تفسیر اختصاصی قرآن کریم درباره موضوع «${subject.title}» در ${SITE_NAME}.`;

  return {
    title,
    description,
    alternates: {
      canonical: `${SITE_URL}/quran/subjects/${encodeURIComponent(subject.slug)}`,
    },
    openGraph: {
      title: `${title} | ${SITE_NAME}`,
      description,
      url: `${SITE_URL}/quran/subjects/${encodeURIComponent(subject.slug)}`,
      siteName: SITE_NAME,
      locale: 'fa_IR',
      type: 'website',
    },
  };
}

/**
 * کامپوننت صفحه تفسیر موضوعی
 * @param {{ params: Promise<{ slug: string }> }} props
 */
export default async function SubjectTafsirPage({ params }) {
  const { slug } = await params;
  const result = await getSubjectTafsirBySlug(slug);

  if (!result || !result.subject) {
    notFound();
  }

  const { subject, verses: rawVerses } = result;

  // تکمیل متن عربی، ترجمه و صوت قرائت برای آیاتی که در بک‌اند متن/صوتشان خالی است از Al Quran Cloud
  const settledResults = await Promise.allSettled(
    rawVerses.map(async (v) => {
      const needsExternal = !v.ayeText || !v.translationText || !v.ayeAudioUrl;
      if (!needsExternal) {
        return { strapiVerse: v, data: null };
      }

      try {
        const res = await fetch(
          `${QURAN_CLOUD_BASE}/ayah/${v.surahNumber}:${v.verseNumber}/editions/${EDITIONS}`,
          { next: { revalidate: 86400 }, signal: AbortSignal.timeout(5000) }
        );
        if (res.ok) {
          const json = await res.json();
          return {
            strapiVerse: v,
            data: json.data,
          };
        }
      } catch (err) {
        console.warn(
          `عدم دسترسی به API خارجی برای سوره ${v.surahNumber} آیه ${v.verseNumber}:`,
          err.message
        );
      }

      return { strapiVerse: v, data: null };
    })
  );

  const stitchedVerses = settledResults
    .filter((r) => r.status === 'fulfilled' && r.value?.strapiVerse)
    .map((r) => {
      const { strapiVerse, data } = r.value;
      const arabicAyah = data && Array.isArray(data) ? data[0] : null;
      const persianAyah = data && Array.isArray(data) ? data[1] : null;
      const arabicAudio = data && Array.isArray(data) ? data[2] : null;

      const surahNum = strapiVerse.surahNumber;
      const surahNameFa =
        SURAH_NAMES_FA[surahNum] || strapiVerse.surahTitle || `سوره ${surahNum}`;

      const arabicText = strapiVerse.ayeText || arabicAyah?.text || '';
      const customArabicAudio = strapiVerse.ayeAudioUrl || null;
      const arabicAudioUrl = customArabicAudio || arabicAudio?.audio || '';
      const persianTranslation = strapiVerse.translationText || persianAyah?.text || '';

      return {
        id: strapiVerse.id || `${surahNum}-${strapiVerse.verseNumber}`,
        surahNumber: surahNum,
        surahNameFa,
        verseNumber: strapiVerse.verseNumber,
        arabicText,
        customArabicAudioUrl: customArabicAudio,
        arabicAudioUrl,
        persianTranslation,
        translationText: strapiVerse.translationText || null,
        translationAudioUrl: strapiVerse.translationAudioUrl || null,
        tafsirText: strapiVerse.tafsirText || null,
        tafsirAudioUrl: strapiVerse.tafsirAudioUrl || null,
        subjects: strapiVerse.subjects || [],
        hasTafsir: Boolean(strapiVerse.tafsirText || strapiVerse.tafsirAudioUrl),
      };
    });

  const uniqueSurahsCount = new Set(stitchedVerses.map((v) => v.surahNumber)).size;

  const breadcrumbItems = [
    { label: 'خانه', href: '/' },
    { label: 'کلام نور', href: '/quran' },
    { label: `موضوع: ${subject.title}` },
  ];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `تفسیر موضوعی: ${subject.title} | ${SITE_NAME}`,
    description: subject.description || `آیات و تفسیر موضوعی قرآن کریم درباره ${subject.title}`,
    url: `${SITE_URL}/quran/subjects/${encodeURIComponent(subject.slug)}`,
    inLanguage: ['fa', 'ar'],
  };

  return (
    <main className={styles.subjectPage}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="container">
        <Breadcrumb items={breadcrumbItems} />

        <header className={styles.subjectHeader}>
          <span className={styles.subjectBadge}>تفسیر موضوعی قرآن کریم</span>
          <h1 className={styles.subjectTitle}>{subject.title}</h1>
          {subject.description && (
            <p className={styles.subjectDescription}>{subject.description}</p>
          )}

          <div className={styles.subjectMeta}>
            <span className={styles.metaPill}>{stitchedVerses.length} آیه مرتبط</span>
            {uniqueSurahsCount > 0 && (
              <span className={styles.metaPill}>در {uniqueSurahsCount} سوره</span>
            )}
          </div>
        </header>

        <SurahViewer
          verses={stitchedVerses}
          surahNameFa={`موضوع: ${subject.title}`}
          showSurahBadge={true}
        />
      </div>
    </main>
  );
}
