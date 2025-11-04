/**
 * Categories API - لایه API اختصاصی برای دسته‌بندی‌ها
 * پشتیبانی از getMainCategories و getCategoryTree
 */
import { apiClient } from './apiClient';
import { formatSingleImage } from './strapiUtils';

/**
 * ✅ گرفتن دسته‌های اصلی (Parent=null)
 * برای صفحه Home و سایر بخش‌ها (سازگار با ساختار flat و attributes)
 */
export async function getMainCategories() {
  try {
    const res = await apiClient(
      '/api/categories?filters[parent][$null]=true&populate[image][fields][0]=url&populate[image][fields][1]=alternativeText'
    );

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
    console.error('❌ خطا در واکشی دسته‌های اصلی:', error);
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
      '/api/categories?filters[parent][id][$null]=true&populate[subCategories][fields][0]=name&populate[subCategories][fields][1]=slug'
    );

    // بررسی امن برای مسیر داده
    const raw = res?.data?.data || res?.data || [];
    const formatted = raw.map(item => {
      const base = item.attributes || item; // پشتیبانی از هر دو ساختار
      return {
        id: item.id,
        name: base.name || '',
        slug: base.slug || '',
        subCategories:
          (base.subCategories?.data || base.subCategories || []).map(sub => {
            const subBase = sub.attributes || sub;
            return {
              id: sub.id,
              name: subBase.name || '',
              slug: subBase.slug || '',
            };
          }),
      };
    });

    return formatted;
  } catch (error) {
    console.error('❌ خطا در واکشی ساختار درختی دسته‌ها:', error);
    return []; 
  }
}
