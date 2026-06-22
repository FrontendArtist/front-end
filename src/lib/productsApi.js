/**
 * Products API - Safe Mode
 * @module lib/productsApi
 */

import { apiClient } from './apiClient';
import { formatStrapiProducts } from './strapiUtils';

/**
 * واکشی تمام محصولات از Strapi
 */
export async function getAllProducts() {
  try {
    // تغییر: استفاده از سینتکس امن‌تر برای populate
    // تصاویر را با true صدا می‌زنیم نه *
    const response = await apiClient('/api/products?populate[categories][populate]=parent&populate[images]=true');
    return formatStrapiProducts(response);
  } catch (error) {
    if (error.message !== 'BACKEND_UNAVAILABLE' && process.env.NODE_ENV === 'development') {
      console.error('خطا در واکشی محصولات:', error.message);
    }
    const fallback = [];
    if (error.message === 'BACKEND_UNAVAILABLE') {
      fallback.error = 'BACKEND_UNAVAILABLE';
    }
    return fallback;
  }
}

/**
 * واکشی یک محصول خاص با استفاده از slug
 */
export async function getProductBySlug(slug) {
  try {
    const response = await apiClient(
      `/api/products?filters[slug][$eq]=${slug}&populate[categories][populate]=parent&populate[images]=true`
    );
    const formattedProducts = formatStrapiProducts(response);
    return formattedProducts[0] || null;
  } catch (error) {
    if (error.message !== 'BACKEND_UNAVAILABLE' && process.env.NODE_ENV === 'development') {
      console.error(`خطا در واکشی محصول با slug "${slug}":`, error.message);
    }
    return null;
  }
}

/**
 * یافتن مسیر Canonical
 */
export async function getProductCategoryPath(slug) {
  try {
    const res = await apiClient(
      `/api/products?filters[slug][$eq]=${slug}&populate[categories][populate]=parent`
    );

    const raw = res?.data?.[0] || null;
    if (!raw) return null;

    const base = raw?.attributes || raw;
    const cats = base?.categories?.data || base?.categories || [];

    if (!cats.length) {
      return { categorySlug: null, subcategorySlug: null, productSlug: slug };
    }

    // نرمال‌سازی
    const normalizedCats = cats.map(c => {
      const attrs = c.attributes || c;
      const parentAttrs = attrs.parent?.data?.attributes || attrs.parent || null;
      return { ...attrs, parent: parentAttrs };
    });

    // اولویت 1: دسته Primary
    const primaryCat = normalizedCats.find(c => c.isPrimary === true);
    if (primaryCat) {
      if (primaryCat.parent?.slug) {
        return { categorySlug: primaryCat.parent.slug, subcategorySlug: primaryCat.slug, productSlug: slug };
      }
      return { categorySlug: primaryCat.slug, subcategorySlug: null, productSlug: slug };
    }

    // اولویت 2: اولین دسته‌ای که parent دارد
    const deepCat = normalizedCats.find(c => c.parent?.slug);
    if (deepCat) {
      return { categorySlug: deepCat.parent.slug, subcategorySlug: deepCat.slug, productSlug: slug };
    }

    // اولویت 3: Fallback
    const firstCat = normalizedCats[0];
    return { categorySlug: firstCat.slug, subcategorySlug: null, productSlug: slug };

  } catch (e) {
    if (e.message !== 'BACKEND_UNAVAILABLE' && process.env.NODE_ENV === 'development') {
      console.error('خطا در استخراج مسیر دسته:', e?.message);
    }
    return null;
  }
}

/**
 * واکشی محصولات برای صفحه اصلی
 */
export async function getProducts({ limit = 4, sort = 'createdAt:desc' } = {}) {
  try {
    const response = await apiClient(
      `/api/products?populate[categories][populate]=parent&populate[images]=true&pagination[limit]=${limit}&sort=${sort}`
    );
    return formatStrapiProducts(response);
  } catch (error) {
    if (error.message !== 'BACKEND_UNAVAILABLE' && process.env.NODE_ENV === 'development') {
      console.error('خطا در واکشی محصولات:', error.message);
    }
    const fallback = [];
    if (error.message === 'BACKEND_UNAVAILABLE') {
      fallback.error = 'BACKEND_UNAVAILABLE';
    }
    return fallback;
  }
}

/**
 * واکشی محصولات با صفحه‌بندی (تابع حساس)
 */
export async function getProductsPaginated(
  page = 1,
  pageSize = 6,
  sort = 'createdAt:desc',
  { categorySlug, subCategorySlug, subSlugs = [] } = {}
) {
  try {
    const params = new URLSearchParams();

    // ✅ Fix: استفاده از true به جای * برای تصاویر
    params.set('populate[categories][populate]', 'parent');
    params.set('populate[images]', 'true');

    params.set('pagination[page]', String(page));
    params.set('pagination[pageSize]', String(pageSize));
    params.set('sort', sort);

    // ---- فیلتر دسته/زیر‌دسته

    if (subCategorySlug) {
      // حالت ساده: فقط زیر‌دسته
      params.set('filters[categories][slug][$eq]', subCategorySlug);
    }
    else if (categorySlug) {
      // ✅ Fix: جلوگیری از باگ $or تک‌عضوی
      const validSubSlugs = Array.isArray(subSlugs) ? subSlugs.filter(Boolean) : [];

      if (validSubSlugs.length === 0) {
        // اگر زیر‌دسته‌ای نداریم، فقط خود دسته را فیلتر کن (بدون $or)
        params.set('filters[categories][slug][$eq]', categorySlug);
      } else {
        // اگر زیر‌دسته داریم، از $in استفاده کن که تمیزتر و امن‌تر از $or است
        // لیست شامل: خود دسته والد + تمام زیر‌دسته‌ها
        const allSlugs = [categorySlug, ...validSubSlugs];

        // استفاده از سینتکس $in برای چندین مقدار (بهینه‌تر از $or)
        allSlugs.forEach((slug, idx) => {
          params.set(`filters[categories][slug][$in][${idx}]`, slug);
        });
      }
    }

    // دیباگ
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 Products Query URL:', decodeURIComponent(params.toString()));
    }

    const res = await apiClient(`/api/products?${params.toString()}`);

    return {
      data: formatStrapiProducts(res),
      meta: res?.meta || {},
    };

  } catch (error) {
    if (error.message !== 'BACKEND_UNAVAILABLE' && process.env.NODE_ENV === 'development') {
      console.error('خطا در واکشی محصولات صفحه‌بندی‌شده:', error.message);
    }
    const fallback = {
      data: [],
      meta: { pagination: { page: 1, pageSize, pageCount: 0, total: 0 } },
    };
    if (error.message === 'BACKEND_UNAVAILABLE') {
      fallback.error = 'BACKEND_UNAVAILABLE';
    }
    return fallback;
  }
}