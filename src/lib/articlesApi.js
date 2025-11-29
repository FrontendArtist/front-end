/**
 * Articles API - لایه API اختصاصی برای مقالات
 * اصلاح شده برای پشتیبانی کامل از فیلتر دسته‌بندی و ساختار داده Strapi
 */

import { apiClient } from './apiClient';
import { formatStrapiArticles } from './strapiUtils';

/**
 * واکشی دسته‌بندی‌های مقالات
 * پشتیبانی از ساختار Flat و Nested
 */
export async function getArticleCategories() {
  try {
    const response = await apiClient(
      '/api/articles-categories?populate=image&sort=name:asc'
    );

    const categoriesRaw = response?.data || [];

    const categories = categoriesRaw.map((item) => {
      // هندل کردن ساختار Flat (v5) و Nested (v4)
      const data = item.attributes || item;
      
      // استخراج تصویر با ایمنی بالا
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
  } catch (error) {
    console.error('خطا در واکشی دسته‌بندی‌های مقالات:', error.message);
    return [];
  }
}

/**
 * واکشی تمام مقالات
 */
export async function getAllArticles() {
  try {
    const response = await apiClient('/api/articles?populate=*&sort=publishedAt:desc');
    return formatStrapiArticles(response);
  } catch (error) {
    console.error('خطا در واکشی مقالات:', error.message);
    return [];
  }
}

/**
 * واکشی یک مقاله با اسلاگ
 */
export async function getArticleBySlug(slug) {
  try {
    const response = await apiClient(
      `/api/articles?filters[slug][$eq]=${slug}&populate=*`
    );
    const formattedArticles = formatStrapiArticles(response);
    return formattedArticles[0] || null;
  } catch (error) {
    console.error(`خطا در واکشی مقاله با slug "${slug}":`, error.message);
    return null;
  }
}

/**
 * واکشی مقالات (نسخه ساده)
 */
export async function getArticles({
  limit = 3,
  sort = 'publishedAt:desc',
  categorySlug = null
} = {}) {
  try {
    let url = `/api/articles?populate=*&pagination[limit]=${limit}&sort=${sort}`;

    if (categorySlug) {
      // استفاده از نام فیلد صحیح طبق دیتابیس (articles_categories)
      url += `&filters[articles_categories][slug][$eq]=${categorySlug}`;
    }

    const response = await apiClient(url);
    return formatStrapiArticles(response);
  } catch (error) {
    console.error('خطا در واکشی مقالات:', error.message);
    return [];
  }
}

/**
 * واکشی مقالات با صفحه‌بندی (برای صفحه اصلی مقالات)
 * اصلاح شده: استفاده از populate=* برای اطمینان از دریافت کامل داده‌ها
 */
export async function getArticlesPaginated(
  page = 1,
  pageSize = 6,
  sort = 'publishedAt:desc',
  categorySlug = null
) {
  try {
    // تغییر مهم: populate=* بجای populate=cover
    // این اطمینان می‌دهد که اگر کارت مقاله نیاز به نمایش دسته یا نویسنده داشت، داده موجود باشد
    let url = `/api/articles?populate=*&pagination[page]=${page}&pagination[pageSize]=${pageSize}&sort=${sort}`;

    if (categorySlug) {
      // استفاده از نام فیلد صحیح طبق دیتابیس (articles_categories)
      url += `&filters[articles_categories][slug][$eq]=${categorySlug}`;
    }

    const response = await apiClient(url);
    
    const formattedArticles = formatStrapiArticles(response);
    
    return {
      data: formattedArticles,
      meta: response.meta || {}
    };
    
  } catch (error) {
    console.error('خطا در واکشی مقالات صفحه‌بندی‌شده:', error.message);
    return {
      data: [],
      meta: { pagination: { page: 1, pageSize, pageCount: 0, total: 0 } }
    };
  }
}