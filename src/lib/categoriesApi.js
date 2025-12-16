/**
 * Categories API - لایه API اختصاصی برای دسته‌بندی‌ها
 * پشتیبانی از getMainCategories و getCategoryTree
 */
import { apiClient } from './apiClient';
import { formatSingleImage } from './strapiUtils';
import { API_BASE_URL } from './api';

/**
 * ✅ گرفتن دسته‌های اصلی (Parent=null)
 * برای صفحه Home و سایر بخش‌ها (سازگار با ساختار flat و attributes)
 */
export async function getMainCategories() {
  try {
    const res = await apiClient(
      '/api/categories?filters[parent][$null]=true&populate[image][fields][0]=url&populate[image][fields][1]=alternativeText'
    );
    console.log("getMainCategories res:", res);
    // هم ساختار قدیمی { data: [...] } و هم آرایهٔ مستقیم
    const raw = res?.data?.data || res?.data || [];
    if (!Array.isArray(raw)) return [];

    // خروجی استاندارد: [{id, name, slug, image:{url,alt}}]
    const formatted = raw.map(item => {
      const base = item?.attributes || item; // ← پشتیبانی از هر دو
      return {
        id: item.id,
        name: base?.name || '',
        slug: base?.slug || '',
        image: formatSingleImage(base?.image), // alt/url امن
      };
    });

    return formatted;
  } catch (error) {
    if (error.message !== 'BACKEND_UNAVAILABLE' && process.env.NODE_ENV === 'development') {
      console.error('❌ خطا در واکشی دسته‌های اصلی:', error);
    }
    return [];
  }
}

/**
 * ✅ گرفتن ساختار درختی (برای Navbar)
 * (بدون تغییر)
 */
export async function getCategoryTree() {
  try {
    const res = await apiClient(
      '/api/categories?filters[parent][id][$null]=true' +
      '&populate[subCategories][fields][0]=name' +
      '&populate[subCategories][fields][1]=slug' +
      '&populate=image'
    );

    if (!res?.data) return [];

    return res.data.map(item => {
      const attrs = item;
      const img = attrs.image;

      return {
        id: attrs.id,
        name: attrs.name || '',
        slug: attrs.slug || '',
        image: img
          ? {
            url: img.formats?.thumbnail?.url
              ? API_BASE_URL + img.formats.thumbnail.url
              : API_BASE_URL + img.url,
            alt: img.alternativeText || attrs.name || '',
          }
          : null,
        subCategories: (attrs.subCategories || []).map(sub => ({
          id: sub.id,
          name: sub.name,
          slug: sub.slug,
        })),
      };
    });
  } catch (error) {
    if (error.message !== 'BACKEND_UNAVAILABLE' && process.env.NODE_ENV === 'development') {
      console.error('❌ خطا در واکشی ساختار درختی دسته‌ها:', error);
    }
    return [];
  }
}
