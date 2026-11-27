export const CACHE_TAGS = {
  categories: 'categories',
  articles: 'articles',
  articleCategories: 'article-categories',
  courses: 'courses',
  products: 'products',
  services: 'services',
  faqs: 'faqs',
  testimonials: 'testimonials',
  topBanner: 'top-banner',
  popup: 'popup',
  salekGuide: 'salek-guide',
  tafsir: 'tafsir',
  comments: 'comments',
  socials: 'socials',
};

const MODEL_TO_TAGS = {
  category: [CACHE_TAGS.categories],
  categories: [CACHE_TAGS.categories],
  article: [CACHE_TAGS.articles],
  articles: [CACHE_TAGS.articles],
  'articles-category': [CACHE_TAGS.articleCategories, CACHE_TAGS.articles],
  'article-category': [CACHE_TAGS.articleCategories, CACHE_TAGS.articles],
  course: [CACHE_TAGS.courses],
  courses: [CACHE_TAGS.courses],
  product: [CACHE_TAGS.products],
  products: [CACHE_TAGS.products],
  service: [CACHE_TAGS.services],
  services: [CACHE_TAGS.services],
  faq: [CACHE_TAGS.faqs],
  faqs: [CACHE_TAGS.faqs],
  testimontial: [CACHE_TAGS.testimonials],
  testimonial: [CACHE_TAGS.testimonials],
  testimonials: [CACHE_TAGS.testimonials],
  'top-banner': [CACHE_TAGS.topBanner],
  'popup-message': [CACHE_TAGS.popup],
  popup: [CACHE_TAGS.popup],
  'salek-guide': [CACHE_TAGS.salekGuide],
  surah: [CACHE_TAGS.tafsir],
  surahs: [CACHE_TAGS.tafsir],
  'quran-subject': [CACHE_TAGS.tafsir],
  'quran-subjects': [CACHE_TAGS.tafsir],
  comment: [CACHE_TAGS.comments],
  comments: [CACHE_TAGS.comments],
  social: [CACHE_TAGS.socials],
  socials: [CACHE_TAGS.socials],
};

export const VALID_CACHE_TAGS = new Set(Object.values(CACHE_TAGS));

/**
 * Resolve Strapi webhook model / explicit tag list into known Next.js cache tags.
 * @param {{ model?: string, tags?: string[] }} payload
 * @returns {string[]}
 */
export function resolveRevalidateTags(payload = {}) {
  const resolved = new Set();

  if (typeof payload.model === 'string') {
    const key = payload.model.trim().toLowerCase();
    for (const tag of MODEL_TO_TAGS[key] || []) {
      resolved.add(tag);
    }
  }

  if (Array.isArray(payload.tags)) {
    for (const raw of payload.tags) {
      if (typeof raw === 'string') {
        const clean = raw.trim().toLowerCase();
        if (VALID_CACHE_TAGS.has(clean)) resolved.add(clean);
      }
    }
  }

  return [...resolved];
}
