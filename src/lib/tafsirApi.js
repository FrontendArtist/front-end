/**
 * @file src/lib/tafsirApi.js
 * @description لایه ارتباط با Strapi برای دریافت داده‌های تفسیر، سوره‌ها و موضوعات قرآن کریم (تفسیر موضوعی)
 */

import { apiClient } from './apiClient';
import { withErrorHandling } from './apiErrorHandler';

/**
 * تابع کمکی برای استخراج URL کامل فایل‌های صوتی آپلود شده در Strapi
 */
function getMediaUrl(mediaField) {
  const audioData = mediaField?.data?.attributes || mediaField;
  let url = audioData?.url || null;
  if (url && !url.startsWith('http')) {
    const strapiBase = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337';
    url = `${strapiBase}${url}`;
  }
  return url;
}

/**
 * تابع کمکی برای نرمال‌سازی لیست موضوعات (Subjects) متصل به هر آیه در Strapi v4/v5
 */
function normalizeSubjects(subjectsField) {
  const rawList = Array.isArray(subjectsField)
    ? subjectsField
    : Array.isArray(subjectsField?.data)
    ? subjectsField.data
    : [];

  return rawList
    .map((sub) => {
      const attr = sub?.attributes || sub;
      if (!attr || !attr.title) return null;
      const id = sub.id || attr.id || sub.documentId;
      return {
        id,
        documentId: sub.documentId || attr.documentId || null,
        title: attr.title,
        slug: attr.slug || String(id),
        description: attr.description || null,
      };
    })
    .filter(Boolean);
}

/**
 * دریافت اطلاعات سوره، وضعیت نمایش (showAllVerses)، تفسیر آیات و موضوعات هر آیه از Strapi
 *
 * @param {number|string} surahNumber - شماره سوره (۱ تا ۱۱۴)
 */
export async function getSurahTafsir(surahNumber) {
  const num = parseInt(surahNumber, 10);
  if (isNaN(num) || num < 1 || num > 114) {
    return null;
  }

  // واکشی کامل با populate=* برای دریافت فایل‌های صوتی و رابطه subjects در هر آیه
  const endpoint = `/api/surahs?filters[surahNumber][$eq]=${num}&populate[ayeha][populate]=*&status=draft`;

  return withErrorHandling(
    async () => {
      let response = null;
      try {
        response = await apiClient(endpoint, {
          suppressErrorLog: true,
          cache: 'no-store',
        });
      } catch (err) {
        if (err.message?.includes('403') || err.message?.includes('404')) {
          return null;
        }
        throw err;
      }

      if (!response?.data || !Array.isArray(response.data) || response.data.length === 0) {
        return null;
      }

      const rawSurah = response.data[0];
      const surahData = rawSurah.attributes || rawSurah;

      // پشتیبانی از هر دو نام کامپوننت ayeha و verses
      const rawVerses = surahData.ayeha || surahData.verses || [];

      const formattedVerses = (Array.isArray(rawVerses) ? rawVerses : []).map((item) => {
        const ayeAudioUrl = getMediaUrl(item.ayeAudio);
        const translationAudioUrl = getMediaUrl(item.translationAudio);
        const tafsirAudioUrl = getMediaUrl(item.tafsirAudio);
        const subjects = normalizeSubjects(item.subjects);

        return {
          id: item.id,
          verseNumber: Number(item.verseNumber),
          // ۱. متن عربی آیه وارد شده در بک‌اند
          ayeText: item.ayeText || item.arabicText || null,
          // ۲. صوت عربی آیه آپلود شده در بک‌اند
          ayeAudioUrl,
          // ۳. متن ترجمه فارسی وارد شده در بک‌اند
          translationText: item.translationText || item.translation || null,
          // ۴. صوت ترجمه فارسی آپلود شده در بک‌اند
          translationAudioUrl,
          // ۵. متن و صوت تفسیر
          tafsirText: item.tafsirText || null,
          tafsirAudioUrl,
          // ۶. موضوعات مرتبط با آیه (تفسیر موضوعی)
          subjects,
        };
      });

      return {
        id: rawSurah.id,
        surahNumber: Number(surahData.surahNumber || num),
        title: surahData.title || null,
        showAllVerses: Boolean(surahData.showAllVerses),
        verses: formattedVerses,
      };
    },
    `واکشی اطلاعات تفسیر سوره ${num}`,
    null,
    true
  );
}

/**
 * واکشی خلاصه تمام سوره‌های ثبت‌شده در Strapi جهت تعیین وضعیت تفسیر در فهرست سوره‌ها
 * @returns {Promise<Array<{ surahNumber: number, title?: string|null, hasTafsir: boolean }>>}
 */
export async function getAllTafsirSurahsSummary() {
  const endpoint = `/api/surahs?populate[ayeha][fields][0]=verseNumber&populate[ayeha][fields][1]=tafsirText&pagination[limit]=120&status=draft`;

  return withErrorHandling(
    async () => {
      let response = null;
      try {
        response = await apiClient(endpoint, {
          suppressErrorLog: true,
          cache: 'no-store',
        });
      } catch (err) {
        if (err.message?.includes('403') || err.message?.includes('404')) {
          return [];
        }
        return [];
      }

      if (!response?.data || !Array.isArray(response.data)) {
        return [];
      }

      return response.data.map((rawItem) => {
        const item = rawItem.attributes || rawItem;
        const verses = item.ayeha || item.verses || [];
        return {
          id: rawItem.id,
          surahNumber: Number(item.surahNumber),
          title: item.title || null,
          hasTafsir: true,
          tafsirVersesCount: Array.isArray(verses) ? verses.length : 0,
        };
      });
    },
    'واکشی لیست سوره‌های دارای تفسیر از Strapi',
    [],
    true
  );
}

/**
 * واکشی تمام موضوعات قرآنی (Quran Subjects) به همراه تعداد آیات مرتبط با هر موضوع
 * @returns {Promise<Array<{ id: number|string, title: string, slug: string, description?: string|null, versesCount: number }>>}
 */
export async function getAllQuranSubjects() {
  return withErrorHandling(
    async () => {
      const [subjectsRes, surahsRes] = await Promise.allSettled([
        apiClient('/api/quran-subjects?pagination[limit]=200&status=draft', {
          suppressErrorLog: true,
          cache: 'no-store',
        }),
        apiClient(
          '/api/surahs?populate[ayeha][populate][0]=subjects&pagination[limit]=120&status=draft',
          {
            suppressErrorLog: true,
            cache: 'no-store',
          }
        ),
      ]);

      const subjectMap = new Map();

      // ۱. ثبت تمام موضوعات تعریف‌شده در کالکشن quran-subjects
      if (subjectsRes.status === 'fulfilled' && Array.isArray(subjectsRes.value?.data)) {
        subjectsRes.value.data.forEach((rawSub) => {
          const attr = rawSub.attributes || rawSub;
          if (!attr?.title) return;
          const id = rawSub.id || attr.id || rawSub.documentId;
          const slug = attr.slug || String(id);
          subjectMap.set(slug, {
            id,
            documentId: rawSub.documentId || attr.documentId || null,
            title: attr.title,
            slug,
            description: attr.description || null,
            versesCount: 0,
          });
        });
      }

      // ۲. شمارش آیات مرتبط با هر موضوع در سوره‌ها
      if (surahsRes.status === 'fulfilled' && Array.isArray(surahsRes.value?.data)) {
        surahsRes.value.data.forEach((rawSurah) => {
          const surahData = rawSurah.attributes || rawSurah;
          const rawVerses = surahData.ayeha || surahData.verses || [];
          if (!Array.isArray(rawVerses)) return;

          rawVerses.forEach((verseItem) => {
            const verseSubjects = normalizeSubjects(verseItem.subjects);
            verseSubjects.forEach((sub) => {
              const existing = subjectMap.get(sub.slug);
              if (existing) {
                existing.versesCount += 1;
              } else {
                subjectMap.set(sub.slug, {
                  ...sub,
                  versesCount: 1,
                });
              }
            });
          });
        });
      }

      return Array.from(subjectMap.values());
    },
    'واکشی لیست موضوعات تفسیر قرآن',
    [],
    true
  );
}

/**
 * واکشی اطلاعات یک موضوع قرآنی و تمام آیات مرتبط با آن در سراسر قرآن بر اساس slug
 *
 * @param {string} slug - اسلاگ موضوع
 */
export async function getSubjectTafsirBySlug(slug) {
  if (!slug) return null;
  const decodedSlug = decodeURIComponent(slug).trim();

  return withErrorHandling(
    async () => {
      const [subjectsRes, surahsRes] = await Promise.allSettled([
        apiClient(
          `/api/quran-subjects?filters[slug][$eq]=${encodeURIComponent(decodedSlug)}&status=draft`,
          {
            suppressErrorLog: true,
            cache: 'no-store',
          }
        ),
        apiClient('/api/surahs?populate[ayeha][populate]=*&pagination[limit]=120&status=draft', {
          suppressErrorLog: true,
          cache: 'no-store',
        }),
      ]);

      let targetSubject = null;

      if (
        subjectsRes.status === 'fulfilled' &&
        Array.isArray(subjectsRes.value?.data) &&
        subjectsRes.value.data.length > 0
      ) {
        const rawSub = subjectsRes.value.data[0];
        const attr = rawSub.attributes || rawSub;
        targetSubject = {
          id: rawSub.id || attr.id || rawSub.documentId,
          documentId: rawSub.documentId || attr.documentId || null,
          title: attr.title,
          slug: attr.slug || decodedSlug,
          description: attr.description || null,
        };
      }

      const matchedVerses = [];

      if (surahsRes.status === 'fulfilled' && Array.isArray(surahsRes.value?.data)) {
        surahsRes.value.data.forEach((rawSurah) => {
          const surahData = rawSurah.attributes || rawSurah;
          const surahNumber = Number(surahData.surahNumber);
          const surahTitle = surahData.title || null;
          const rawVerses = surahData.ayeha || surahData.verses || [];

          if (!Array.isArray(rawVerses)) return;

          rawVerses.forEach((item) => {
            const subjects = normalizeSubjects(item.subjects);
            const matchedSub = subjects.find(
              (s) =>
                s.slug === decodedSlug ||
                String(s.id) === decodedSlug ||
                String(s.documentId) === decodedSlug
            );

            if (matchedSub) {
              if (!targetSubject) {
                targetSubject = matchedSub;
              }

              matchedVerses.push({
                id: `${surahNumber}-${item.verseNumber}`,
                surahNumber,
                surahTitle,
                verseNumber: Number(item.verseNumber),
                ayeText: item.ayeText || item.arabicText || null,
                ayeAudioUrl: getMediaUrl(item.ayeAudio),
                translationText: item.translationText || item.translation || null,
                translationAudioUrl: getMediaUrl(item.translationAudio),
                tafsirText: item.tafsirText || null,
                tafsirAudioUrl: getMediaUrl(item.tafsirAudio),
                subjects,
              });
            }
          });
        });
      }

      if (!targetSubject) {
        return null;
      }

      // مرتب‌سازی بر اساس شماره سوره و سپس شماره آیه
      matchedVerses.sort((a, b) => {
        if (a.surahNumber !== b.surahNumber) {
          return a.surahNumber - b.surahNumber;
        }
        return a.verseNumber - b.verseNumber;
      });

      return {
        subject: targetSubject,
        verses: matchedVerses,
      };
    },
    `واکشی آیات موضوع ${decodedSlug}`,
    null,
    true
  );
}
