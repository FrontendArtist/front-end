// File: src/lib/breadcrumbs.js

/**
 * تابع پایه برای ترکیب با صفحه اصلی
 */
export const createBreadcrumbs = (paths = []) => {
    const base = [{ label: 'خانه', href: '/' }];
    return [...base, ...paths];
  };
  
  /**
   * تولید هوشمند بردکرامب برای صفحات محصول
   * این تابع به جای Slug، از Name (عنوان فارسی) استفاده می‌کند
   */
  export const getProductBreadcrumbs = ({ category, subcategory, product } = {}) => {
    const items = [{ label: 'محصولات', href: '/products' }];
  
    // 1. افزودن دسته اصلی
    if (category) {
      // نکته مهم: اولویت با name است، اگر نبود title، اگر نبود slug
      const label = category.name || category.title || category.slug;
      items.push({ 
        label: label, 
        href: `/products/${category.slug}` 
      });
    }
  
    // 2. افزودن زیر‌دسته
    if (category && subcategory) {
      const label = subcategory.name || subcategory.title || subcategory.slug;
      items.push({ 
        label: label, 
        href: `/products/${category.slug}/${subcategory.slug}` 
      });
    }
  
    // 3. افزودن محصول (یا فعال کردن آیتم آخر)
    if (product) {
      items.push({ 
        label: product.title, 
        active: true 
      });
    } else if (items.length > 0) {
      // اگر در صفحه لیست هستیم، آخرین آیتم باید غیرفعال (متن خالی) شود
      items[items.length - 1].active = true;
      delete items[items.length - 1].href;
    }
  
    return createBreadcrumbs(items);
  };