/**
 * @file src/utils/quranAudio.js
 * @description توابع کمکی برای تولید و مدیریت آدرس‌های صوتی قرآن کریم.
 */

/**
 * تولید آدرس فایل صوتی ترجمه گویای فارسی با صدای استاد بهروز رضوی
 * فرمت نام فایل: ۳ رقم شماره سوره + ۳ رقم شماره آیه (مثال: 001001.mp3)
 *
 * @param {number|string} surahNumber - شماره سوره (۱ تا ۱۱۴)
 * @param {number|string} ayahNumber - شماره آیه در سوره
 * @returns {string} آدرس اینترنتی مستقیم فایل mp3
 */
export function getRazaviAudioUrl(surahNumber, ayahNumber) {
  if (!surahNumber || !ayahNumber) return '';
  const surahPadded = String(surahNumber).padStart(3, '0');
  const ayahPadded = String(ayahNumber).padStart(3, '0');
  return `https://quranmehr.ir/files/verse/${surahPadded}${ayahPadded}.mp3`;
}
