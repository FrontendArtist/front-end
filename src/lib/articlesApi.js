/**
 * Articles API - لایه API اختصاصی برای مقالات
 * اصلاح شده برای پشتیبانی کامل از فیلتر دسته‌بندی و ساختار داده Strapi
 */

import { apiClient } from './apiClient';
import { API_BASE_URL } from './api';
import { formatStrapiArticles, formatStrapiCourses, formatStrapiProducts } from './strapiUtils';
import { withErrorHandling } from './apiErrorHandler';
import { ARTICLES_PAGE_SIZE } from './constants';
import { CACHE_TAGS } from './cacheTags';

const ARTICLE_CACHE_OPTIONS = { next: { revalidate: 3600, tags: [CACHE_TAGS.articles] } };
const ARTICLE_CARD_FIELDS =
  'fields[0]=title&fields[1]=slug&fields[2]=excerpt&fields[3]=publishedAt&fields[4]=createdAt&fields[5]=updatedAt' +
  '&populate[cover][fields][0]=url&populate[cover][fields][1]=alternativeText&populate[cover][fields][2]=name&populate[cover][fields][3]=formats' +
  '&populate[articles_categories][fields][0]=name&populate[articles_categories][fields][1]=slug';

/**
 * واکشی دسته‌بندی‌های مقالات
 * پشتیبانی از ساختار Flat و Nested
 */
export async function getArticleCategories() {
  return withErrorHandling(
    async () => {
      const response = await apiClient(
        '/api/articles-categories?fields[0]=name&fields[1]=slug&populate[image][fields][0]=url&populate[image][fields][1]=formats&sort=name:asc',
        { next: { revalidate: 3600, tags: [CACHE_TAGS.articleCategories] } }
      );

      const categoriesRaw = response?.data || [];

      const categories = categoriesRaw.map((item) => {
        const data = item.attributes || item;
        const rawImg = data.image?.data?.attributes || data.image || null;

        let imageUrl = null;
        if (typeof rawImg === 'string' && rawImg.trim()) {
          const trimmed = rawImg.trim();
          imageUrl = (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('/images/'))
            ? trimmed
            : `${API_BASE_URL}${trimmed.startsWith('/') ? trimmed : `/${trimmed}`}`;
        } else if (rawImg && typeof rawImg === 'object') {
          const rawUrl = rawImg.url || rawImg.formats?.small?.url || rawImg.formats?.thumbnail?.url || null;
          if (rawUrl) {
            imageUrl = (rawUrl.startsWith('http://') || rawUrl.startsWith('https://') || rawUrl.startsWith('/images/'))
              ? rawUrl
              : `${API_BASE_URL}${rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`}`;
          }
        }

        return {
          id: item.id,
          name: data.name ?? '',
          slug: data.slug ?? '',
          description: data.description ?? '',
          image: imageUrl || '/images/placeholder.png'
        };
      });

      return categories;
    },
    'واکشی دسته‌بندی‌های مقالات',
    []
  );
}

/**
 * واکشی تمام مقالات
 */
export async function getAllArticles() {
  return withErrorHandling(
    async () => {
      const response = await apiClient(
        '/api/articles?status=published&fields[0]=title&fields[1]=slug&fields[2]=updatedAt&fields[3]=publishedAt&pagination[pageSize]=200&sort[0]=publishedAt:desc&sort[1]=updatedAt:desc&sort[2]=createdAt:desc',
        ARTICLE_CACHE_OPTIONS
      );
      return formatStrapiArticles(response);
    },
    'واکشی مقالات',
    []
  );
}

/**
 * واکشی یک مقاله با اسلاگ
 */
export async function getArticleBySlug(slug) {
  return withErrorHandling(
    async () => {
      const response = await apiClient(
        `/api/articles?status=published&filters[slug][$eq]=${encodeURIComponent(slug)}&populate=*`,
        ARTICLE_CACHE_OPTIONS
      );
      const formattedArticles = formatStrapiArticles(response);
      return formattedArticles[0] || null;
    },
    `واکشی مقاله با slug "${slug}"`,
    null
  );
}

/**
 * واکشی مقالات (نسخه ساده)
 */
export async function getArticles({
  limit = 3,
  sort = 'publishedAt:desc',
  categorySlug = null
} = {}) {
  return withErrorHandling(
    async () => {
      let sortParam = sort;
      if (sort === 'publishedAt:desc') {
        sortParam = 'sort[0]=publishedAt:desc&sort[1]=updatedAt:desc&sort[2]=createdAt:desc';
      } else if (sort === 'publishedAt:asc') {
        sortParam = 'sort[0]=publishedAt:asc&sort[1]=updatedAt:asc&sort[2]=createdAt:asc';
      } else {
        sortParam = `sort=${sort}`;
      }

      let url = `/api/articles?status=published&${ARTICLE_CARD_FIELDS}&pagination[limit]=${limit}&${sortParam}`;

      if (categorySlug) {
        url += `&filters[articles_categories][slug][$eq]=${categorySlug}`;
      }

      const response = await apiClient(url, ARTICLE_CACHE_OPTIONS);
      return formatStrapiArticles(response);
    },
    'واکشی مقالات',
    []
  );
}

/**
 * واکشی مقالات با صفحه‌بندی (برای صفحه اصلی مقالات)
 */
export async function getArticlesPaginated(
  page = 1,
  pageSize = ARTICLES_PAGE_SIZE,
  sort = 'publishedAt:desc',
  categorySlug = null
) {
  return withErrorHandling(
    async () => {
      let sortParam = sort;
      if (sort === 'publishedAt:desc') {
        sortParam = 'sort[0]=publishedAt:desc&sort[1]=updatedAt:desc&sort[2]=createdAt:desc';
      } else if (sort === 'publishedAt:asc') {
        sortParam = 'sort[0]=publishedAt:asc&sort[1]=updatedAt:asc&sort[2]=createdAt:asc';
      } else {
        sortParam = `sort=${sort}`;
      }

      let url = `/api/articles?status=published&${ARTICLE_CARD_FIELDS}&pagination[page]=${page}&pagination[pageSize]=${pageSize}&${sortParam}`;

      if (categorySlug) {
        url += `&filters[articles_categories][slug][$eq]=${categorySlug}`;
      }

      const response = await apiClient(url, ARTICLE_CACHE_OPTIONS);
      const formattedArticles = formatStrapiArticles(response);

      return {
        data: formattedArticles,
        meta: response.meta || {}
      };
    },
    'واکشی مقالات صفحه‌بندی‌شده',
    {
      data: [],
      meta: { pagination: { page: 1, pageSize, pageCount: 0, total: 0 } }
    }
  );
}

/**
 * واکشی مقالات مجاور (قبلی و بعدی بر اساس ترتیب انتشار)
 * @param {object | string} identifier - آبجکت مقاله جاری یا اسلاگ/شناسه آن
 * @returns {Promise<{ prev: { slug: string, title: string } | null, next: { slug: string, title: string } | null }>}
 */
export async function getAdjacentArticles(identifier) {
  if (!identifier) return { prev: null, next: null };

  return withErrorHandling(
    async () => {
      // واکشی لیست مقالات منتشرشده با ترتیب نزولی تاریخ انتشار (مشابه صفحه مقالات)
      const response = await apiClient(
        '/api/articles?status=published&fields[0]=title&fields[1]=slug&fields[2]=documentId&fields[3]=publishedAt&fields[4]=createdAt&sort[0]=publishedAt:desc&sort[1]=updatedAt:desc&sort[2]=createdAt:desc&pagination[pageSize]=100',
        ARTICLE_CACHE_OPTIONS
      );

      const articles = formatStrapiArticles(response);
      if (!articles || articles.length === 0) {
        return { prev: null, next: null };
      }

      // تعیین مشخصه مقاله جاری
      let targetSlug = null;
      let targetId = null;
      let targetDocId = null;

      if (typeof identifier === 'object' && identifier !== null) {
        targetSlug = identifier.slug;
        targetId = identifier.id;
        targetDocId = identifier.documentId;
      } else if (typeof identifier === 'string') {
        targetSlug = identifier;
      }

      // پیدا کردن ایندکس مقاله جاری در لیست
      let currentIndex = -1;
      if (targetSlug) {
        currentIndex = articles.findIndex((art) => {
          if (!art.slug) return false;
          if (art.slug === targetSlug) return true;
          try {
            return decodeURIComponent(art.slug) === decodeURIComponent(targetSlug);
          } catch {
            return false;
          }
        });
      }

      if (currentIndex === -1 && (targetDocId || targetId)) {
        currentIndex = articles.findIndex(
          (art) =>
            (targetDocId && (art.documentId === targetDocId || String(art.id) === String(targetDocId))) ||
            (targetId && String(art.id) === String(targetId))
        );
      }

      if (currentIndex === -1) {
        return { prev: null, next: null };
      }

      // در آرایه مرتب‌شده از جدید به قدیم (publishedAt:desc):
      // ایندکس کمتر (currentIndex - 1) = مقاله جدیدتر / بعدی
      // ایندکس بیشتر (currentIndex + 1) = مقاله قدیمی‌تر / قبلی
      const nextArticle = currentIndex > 0 ? articles[currentIndex - 1] : null;
      const prevArticle = currentIndex < articles.length - 1 ? articles[currentIndex + 1] : null;

      return {
        prev: prevArticle ? { slug: prevArticle.slug, title: prevArticle.title } : null,
        next: nextArticle ? { slug: nextArticle.slug, title: nextArticle.title } : null,
      };
    },
    'واکشی مقالات مجاور',
    { prev: null, next: null }
  );
}

/**
 * واکشی مقالات مرتبط (هم‌دسته‌بندی یا جدیدتر با استثنا کردن مقاله جاری)
 * @param {{ categoryId?: string | number, categorySlug?: string, currentId?: string | number, limit?: number }} params
 */
export async function getRelatedArticles({ categoryId = null, categorySlug = null, currentId = null, limit = 6 } = {}) {
  return withErrorHandling(
    async () => {
      let url = `/api/articles?status=published&${ARTICLE_CARD_FIELDS}&pagination[limit]=${limit + 2}&sort[0]=publishedAt:desc&sort[1]=createdAt:desc`;

      if (categoryId) {
        url += `&filters[articles_categories][id][$eq]=${categoryId}`;
      } else if (categorySlug) {
        url += `&filters[articles_categories][slug][$eq]=${categorySlug}`;
      }

      if (currentId) {
        url += `&filters[id][$ne]=${currentId}`;
      }

      const response = await apiClient(url, ARTICLE_CACHE_OPTIONS);
      let formattedArticles = formatStrapiArticles(response);

      if (currentId) {
        formattedArticles = formattedArticles.filter(
          (art) => String(art.id) !== String(currentId) && String(art.documentId) !== String(currentId)
        );
      }

      if (formattedArticles.length === 0 && (categoryId || categorySlug)) {
        const fallbackUrl = `/api/articles?status=published&${ARTICLE_CARD_FIELDS}&pagination[limit]=${limit + 2}&sort[0]=publishedAt:desc&sort[1]=createdAt:desc`;
        const fallbackResponse = await apiClient(fallbackUrl, ARTICLE_CACHE_OPTIONS);
        formattedArticles = formatStrapiArticles(fallbackResponse).filter(
          (art) => String(art.id) !== String(currentId) && String(art.documentId) !== String(currentId)
        );
      }

      return formattedArticles.slice(0, limit);
    },
    'واکشی مقالات مرتبط',
    []
  );
}

/**
 * واکشی تمام دوره‌ها و محصولات مرتبط متصل‌شده برای RelatedProductCTA
 * @param {object} article - آبجکت مقاله خروجی از formatStrapiArticles
 * @returns {Promise<Array>} آرایه‌ای از اشیاء CTA (دوره و/یا محصول) یا [] در صورت غیرفعال بودن enable_cta یا عدم وجود موارد مرتبط
 */
export async function getArticleCTA(article) {
  if (!article) return [];

  const enableCta = article.enable_cta !== undefined ? Boolean(article.enable_cta) : true;
  if (!enableCta) {
    return [];
  }

  const items = [];

  // 1. بررسی دوره مرتبط متصل‌شده (featured_course)
  if (article.featured_course) {
    const courseSlug = article.featured_course.slug;
    if (courseSlug) {
      try {
        const courseRes = await apiClient(
          `/api/courses?filters[slug][$eq]=${encodeURIComponent(courseSlug)}&fields[0]=title&fields[1]=slug&fields[2]=price&fields[3]=discountPercent&fields[4]=discountUntil&fields[5]=description&fields[6]=isChaptered&fields[7]=isFree&populate[media][fields][0]=url&populate[media][fields][1]=alternativeText&populate[media][fields][2]=formats`,
          { next: { revalidate: 3600, tags: [CACHE_TAGS.courses] } }
        );
        const courses = formatStrapiCourses(courseRes);
        if (courses && courses.length > 0) {
          items.push({
            type: 'course',
            ...courses[0],
          });
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('خطا در واکشی جزییات دوره مرتبط با مقاله:', error.message);
        }
      }
    }
    if (items.length === 0) {
      const rawFormatted = formatStrapiCourses({ data: [article.featured_course] })[0];
      if (rawFormatted) {
        items.push({
          type: 'course',
          ...rawFormatted,
        });
      }
    }
  }

  // 2. بررسی محصول مرتبط متصل‌شده (featured_product)
  if (article.featured_product) {
    const productSlug = article.featured_product.slug;
    if (productSlug) {
      try {
        const productRes = await apiClient(
          `/api/products?filters[slug][$eq]=${encodeURIComponent(productSlug)}&fields[0]=title&fields[1]=slug&fields[2]=price&fields[3]=discountPercent&fields[4]=discountUntil&fields[5]=description&fields[6]=shortDescription&fields[7]=stock&fields[8]=isAvailable&populate[images][fields][0]=url&populate[images][fields][1]=alternativeText&populate[images][fields][2]=formats&populate[categories][fields][0]=slug&populate[categories][fields][1]=name&populate[categories][populate][parent][fields][0]=slug`,
          { next: { revalidate: 3600, tags: [CACHE_TAGS.products] } }
        );
        const products = formatStrapiProducts(productRes);
        if (products && products.length > 0) {
          items.push({
            type: 'product',
            ...products[0],
          });
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('خطا در واکشی جزییات محصول مرتبط با مقاله:', error.message);
        }
      }
    }
    if (!items.some(i => i.type === 'product')) {
      const rawFormatted = formatStrapiProducts({ data: [article.featured_product] })[0];
      if (rawFormatted) {
        items.push({
          type: 'product',
          ...rawFormatted,
        });
      }
    }
  }

  return items;
}
