/**
 * Articles API - لایه API اختصاصی برای مقالات
 * اصلاح شده برای پشتیبانی کامل از فیلتر دسته‌بندی و ساختار داده Strapi
 */

import { apiClient } from './apiClient';
import { formatStrapiArticles, formatStrapiCourses, formatStrapiProducts } from './strapiUtils';
import { withErrorHandling } from './apiErrorHandler';
import { ARTICLES_PAGE_SIZE } from './constants';

/**
 * واکشی دسته‌بندی‌های مقالات
 * پشتیبانی از ساختار Flat و Nested
 */
export async function getArticleCategories() {
  return withErrorHandling(
    async () => {
      const response = await apiClient(
        '/api/articles-categories?populate=image&sort=name:asc'
      );

      const categoriesRaw = response?.data || [];

      const categories = categoriesRaw.map((item) => {
        const data = item.attributes || item;

        const imageSource = data.image?.data?.attributes || data.image || null;
        const imageUrl = imageSource?.url || null;

        return {
          id: item.id,
          name: data.name ?? '',
          slug: data.slug ?? '',
          description: data.description ?? '',
          image: imageUrl
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
      const response = await apiClient('/api/articles?status=published&populate=*&sort[0]=publishedAt:desc&sort[1]=updatedAt:desc&sort[2]=createdAt:desc');
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
        `/api/articles?status=published&filters[slug][$eq]=${slug}&populate=*`
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

      let url = `/api/articles?status=published&populate=*&pagination[limit]=${limit}&${sortParam}`;

      if (categorySlug) {
        url += `&filters[articles_categories][slug][$eq]=${categorySlug}`;
      }

      const response = await apiClient(url);
      return formatStrapiArticles(response);
    },
    'واکشی مقالات',
    []
  );
}

/**
 * واکشی مقالات با صفحه‌بندی (برای صفحه اصلی مقالات)
 * اصلاح شده: استفاده از populate=* برای اطمینان از دریافت کامل داده‌ها
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

      let url = `/api/articles?status=published&populate=*&pagination[page]=${page}&pagination[pageSize]=${pageSize}&${sortParam}`;

      if (categorySlug) {
        url += `&filters[articles_categories][slug][$eq]=${categorySlug}`;
      }

      const response = await apiClient(url);
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
 * واکشی مقالات مجاور (قبلی و بعدی بر اساس تاریخ انتشار)
 * @param {string | Date} createdAt - تاریخ مقاله جاری
 * @returns {Promise<{ prev: { slug: string, title: string } | null, next: { slug: string, title: string } | null }>}
 */
export async function getAdjacentArticles(createdAt) {
  if (!createdAt) return { prev: null, next: null };

  return withErrorHandling(
    async () => {
      const isoDate = new Date(createdAt).toISOString();

      const prevRes = await apiClient(
        `/api/articles?filters[publishedAt][$lt]=${isoDate}&sort=publishedAt:desc&pagination[limit]=1`
      ).catch(() => null);

      const nextRes = await apiClient(
        `/api/articles?filters[publishedAt][$gt]=${isoDate}&sort=publishedAt:asc&pagination[limit]=1`
      ).catch(() => null);

      const prevArticles = prevRes ? formatStrapiArticles(prevRes) : [];
      const nextArticles = nextRes ? formatStrapiArticles(nextRes) : [];

      return {
        prev: prevArticles[0] ? { slug: prevArticles[0].slug, title: prevArticles[0].title } : null,
        next: nextArticles[0] ? { slug: nextArticles[0].slug, title: nextArticles[0].title } : null,
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
      let url = `/api/articles?populate=*&pagination[limit]=${limit + 2}&sort[0]=publishedAt:desc&sort[1]=createdAt:desc`;

      if (categoryId) {
        url += `&filters[articles_categories][id][$eq]=${categoryId}`;
      } else if (categorySlug) {
        url += `&filters[articles_categories][slug][$eq]=${categorySlug}`;
      }

      if (currentId) {
        url += `&filters[id][$ne]=${currentId}`;
      }

      const response = await apiClient(url);
      let formattedArticles = formatStrapiArticles(response);

      if (currentId) {
        formattedArticles = formattedArticles.filter(
          (art) => String(art.id) !== String(currentId) && String(art.documentId) !== String(currentId)
        );
      }

      if (formattedArticles.length === 0 && (categoryId || categorySlug)) {
        const fallbackUrl = `/api/articles?populate=*&pagination[limit]=${limit + 2}&sort[0]=publishedAt:desc&sort[1]=createdAt:desc`;
        const fallbackResponse = await apiClient(fallbackUrl);
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
          `/api/courses?filters[slug][$eq]=${encodeURIComponent(courseSlug)}&populate=*`
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
          `/api/products?filters[slug][$eq]=${encodeURIComponent(productSlug)}&populate=*`
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