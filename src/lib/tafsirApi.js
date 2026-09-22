/**
 * @file src/lib/tafsirApi.js
 * @description لایه ارتباط با Strapi برای دریافت داده‌های تفسیر و سوره‌های قرآن کریم
 */

import { apiClient } from './apiClient';
import { withErrorHandling } from './apiErrorHandler';

/**
 * دریافت اطلاعات سوره، وضعیت نمایش (showAllVerses) و تفسیر آیات از Strapi
 *
 * ساختار کوئری:
 * /api/surahs?filters[surahNumber][$eq]={surahNumber}&populate[verses][populate]=tafsirAudio
 *
 * @param {number|string} surahNumber - شماره سوره (۱ تا ۱۱۴)
 * @returns {Promise<{
 *   id: number|string,
 *   surahNumber: number,
 *   title?: string|null,
 *   showAllVerses: boolean,
 *   verses: Array<{
 *     id: number|string,
 *     verseNumber: number,
 *     tafsirText?: string|null,
 *     tafsirAudio?: object|null,
 *     tafsirAudioUrl?: string|null,
 *   }>
 * } | null>}
 */
export async function getSurahTafsir(surahNumber) {
  const num = parseInt(surahNumber, 10);
  if (isNaN(num) || num < 1 || num > 114) {
    return null;
  }

  // واکشی کامل با populate و status=draft تا حتی قبل از زدن دکمه Publish هم تغییرات در فرانت نمایش داده شوند
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

      // تابع کمکی برای استخراج URL کامل فایل‌های صوتی آپلود شده در Strapi
      const getMediaUrl = (mediaField) => {
        const audioData = mediaField?.data?.attributes || mediaField;
        let url = audioData?.url || null;
        if (url && !url.startsWith('http')) {
          const strapiBase = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337';
          url = `${strapiBase}${url}`;
        }
        return url;
      };

      // پشتیبانی از هر دو نام کامپوننت ayeha و verses
      const rawVerses = surahData.ayeha || surahData.verses || [];

      const formattedVerses = (Array.isArray(rawVerses) ? rawVerses : []).map((item) => {
        const ayeAudioUrl = getMediaUrl(item.ayeAudio);
        const translationAudioUrl = getMediaUrl(item.translationAudio);
        const tafsirAudioUrl = getMediaUrl(item.tafsirAudio);

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
          hasTafsir: true, // سوره در سامانه Strapi تعریف شده است
          tafsirVersesCount: Array.isArray(verses) ? verses.length : 0,
        };
      });
    },
    'واکشی لیست سوره‌های دارای تفسیر از Strapi',
    [],
    true
  );
}

