/**
 * Categories API - لایه API اختصاصی برای دسته‌بندی‌ها
 *
 * نقش:
 * این ماژول یک رابط تمیز و معنادار برای تمام عملیات مرتبط با دسته‌بندی‌ها (Categories) فراهم می‌کند.
 * این لایه بین UI و apiClient قرار دارد و منطق کسب‌وکار مربوط به دسته‌بندی‌ها را مدیریت می‌کند.
 *
 * @module lib/categoriesApi
 */

import { apiClient } from './apiClient';
import { formatStrapiCategories, formatStrapiProducts } from './strapiUtils';

/**
 * واکشی تمام دسته‌بندی‌ها از Strapi
 */
export async function getAllCategories() {
  try {
    const response = await apiClient(
      '/api/categories?filters[parent][$null]=true&populate[image][fields][0]=url&populate[image][fields][1]=alternativeText'
    );

    const formattedCategories = formatStrapiCategories(response);
    return formattedCategories;
  } catch (error) {
    console.error('خطا در واکشی دسته‌بندی‌ها:', error.message);
    return [];
  }
}

/**
 * واکشی جزئیات یک دسته از Strapi بر اساس slug
 * شامل محصولات مرتبط (با تصاویر کامل)
 */
export async function getCategoryBySlug(slug) {
  try {
    // واکشی دسته با محصولات و تصاویرشان
    const response = await apiClient(
      `/api/categories?filters[slug][$eq]=${slug}&populate[products][populate]=images`
    );

    const category = response?.data?.[0];
    if (!category) return null;

    // استفاده از formatter رسمی محصولات برای سازگاری داده
    const products = formatStrapiProducts({ data: category.products || [] });

    // بازگرداندن ساختار نهایی تمیز و قابل استفاده در Frontend
    return {
      id: category.id,
      slug: category.slug,
      name: category.name || category.title || 'دسته‌بندی بدون نام',
      products,
    };
  } catch (error) {
    console.error('خطا در واکشی دسته از Strapi:', error.message);
    return null;
  }
}
