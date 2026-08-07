/**
 * Products API - Safe Mode
 * @module lib/productsApi
 */

import { apiClient } from './apiClient';
import { formatStrapiProducts } from './strapiUtils';
import { withErrorHandling } from './apiErrorHandler';

/**
 * واکشی تمام محصولات از Strapi
 */
export async function getAllProducts() {
  return withErrorHandling(
    async () => {
      const response = await apiClient('/api/products?status=published&populate[categories][populate]=parent&populate[images]=true');
      return formatStrapiProducts(response);
    },
    'واکشی محصولات',
    []
  );
}

/**
 * واکشی یک محصول خاص با استفاده از slug
 * populate شامل تمام فیلدهای مورد نیاز صفحه تکی محصول
 */
export async function getProductBySlug(slug) {
  return withErrorHandling(
    async () => {
      const response = await apiClient(
        `/api/products?status=published&filters[slug][$eq]=${slug}&populate[categories][populate]=parent&populate[images]=true`
      );
      const formattedProducts = formatStrapiProducts(response);
      return formattedProducts[0] || null;
    },
    `واکشی محصول با slug "${slug}"`,
    null
  );
}

/**
 * یافتن مسیر Canonical
 */
export async function getProductCategoryPath(slug) {
  return withErrorHandling(
    async () => {
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
    },
    'استخراج مسیر دسته',
    null
  );
}

/**
 * واکشی محصولات برای صفحه اصلی
 */
export async function getProducts({ limit = 4, sort = 'createdAt:desc' } = {}) {
  return withErrorHandling(
    async () => {
      const response = await apiClient(
        `/api/products?status=published&populate[categories][populate]=parent&populate[images]=true&pagination[limit]=${limit}&sort=${sort}`
      );
      return formatStrapiProducts(response);
    },
    'واکشی محصولات',
    []
  );
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
  return withErrorHandling(
    async () => {
      const params = new URLSearchParams();

      params.set('status', 'published');
      params.set('populate[categories][populate]', 'parent');
      params.set('populate[images]', 'true');

      params.set('pagination[page]', String(page));
      params.set('pagination[pageSize]', String(pageSize));
      params.set('sort', sort);

      if (subCategorySlug) {
        params.set('filters[categories][slug][$eq]', subCategorySlug);
      }
      else if (categorySlug) {
        const validSubSlugs = Array.isArray(subSlugs) ? subSlugs.filter(Boolean) : [];

        if (validSubSlugs.length === 0) {
          params.set('filters[categories][slug][$eq]', categorySlug);
        } else {
          const allSlugs = [categorySlug, ...validSubSlugs];
          allSlugs.forEach((slug, idx) => {
            params.set(`filters[categories][slug][$in][${idx}]`, slug);
          });
        }
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 Products Query URL:', decodeURIComponent(params.toString()));
      }

      const res = await apiClient(`/api/products?${params.toString()}`);

      return {
        data: formatStrapiProducts(res),
        meta: res?.meta || {},
      };
    },
    'واکشی محصولات صفحه‌بندی‌شده',
    {
      data: [],
      meta: { pagination: { page: 1, pageSize, pageCount: 0, total: 0 } },
    }
  );
}

/**
 * واکشی محصولات مرتبط (هم‌دسته‌بندی، با استثنا کردن محصول جاری)
 * @param {{
 *   currentId?: string | number,
 *   currentSlug?: string,
 *   categorySlug?: string,
 *   limit?: number
 * }} params
 */
export async function getRelatedProducts({ currentId = null, currentSlug = null, categorySlug = null, limit = 6 } = {}) {
  return withErrorHandling(
    async () => {
      const excludeCurrent = (list) =>
        list.filter((p) => {
          if (currentSlug && p.slug === currentSlug) return false;
          if (currentId && String(p.id) === String(currentId)) return false;
          if (currentId && String(p.documentId) === String(currentId)) return false;
          return true;
        });

      let result = [];
      if (categorySlug) {
        const url = `/api/products?populate[categories][populate]=parent&populate[images]=true&pagination[limit]=${limit + 4}&sort=createdAt:desc&filters[categories][slug][$eq]=${categorySlug}`;
        const res = await apiClient(url);
        result = excludeCurrent(formatStrapiProducts(res));
      }

      if (result.length < limit) {
        const fbUrl = `/api/products?populate[categories][populate]=parent&populate[images]=true&pagination[limit]=${limit + 4}&sort=createdAt:desc`;
        const fbRes = await apiClient(fbUrl);
        const extra = excludeCurrent(formatStrapiProducts(fbRes)).filter(
          (p) => !result.some((r) => String(r.id) === String(p.id))
        );
        result = [...result, ...extra];
      }

      return result.slice(0, limit);
    },
    'واکشی محصولات مرتبط',
    []
  );
}