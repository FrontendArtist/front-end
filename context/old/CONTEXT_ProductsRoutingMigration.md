## Context: Migration to Path-Based Product Routes (SEO + SPA-Compatible)

### هدف
انتقال کامل مسیرهای صفحات محصولات از حالت Query-Based Routing به ساختار Path-Based Routing در مسیر `/products/...`  
به‌منظور بهبود SEO، ساختار URL، و سازگاری با SSR + SPA.

---

### وضعیت فعلی
- مسیر فعلی صفحه لیست محصولات:
/products?category=books&sub=medicalbooks&page=1&sort=createdAt:desc

diff
Copy code
- مسیر فعلی محصول تکی:
/product/giahandarooei

yaml
Copy code
- منطق دسته‌بندی و فیلتر در `getProductsPaginated()` و `ProductsPageClient.jsx` پیاده‌سازی شده است.
- ساختار داده‌ی دسته‌بندی‌ها شامل `category` (والد) و `subCategories` (فرزند) است.
- SSR و ISR در پروژه فعال هستند.

---

### هدف نهایی
1. جایگزینی ساختار بالا با مسیرهای خواناتر و SEO-Friendly:
/products/{categorySlug}
/products/{categorySlug}/{subcategorySlug}
/products/{categorySlug}/{subcategorySlug}/{productSlug}

markdown
Copy code
2. حفظ سازگاری کامل با:
- SSR و ISR
- فیلتر و مرتب‌سازی (Sort, Pagination)
- ساختار SPA و ناوبری کلاینتی (Client-Side Routing)
3. اعمال Redirectهای دائمی (301):
- از `/products?category=...&sub=...` به مسیر جدید `/products/...`
- از `/product/[slug]` به مسیر محصول جدید
4. اضافه کردن JSON-LD و Canonical برای SEO
5. Breadcrumb بر اساس مسیر ساخته شود.

---

### قوانین فنی مورد تأکید
- ساختار مسیر باید از App Router استفاده کند (`/app/products/...`)
- سورت و صفحه‌بندی از query string حفظ شود (`?sort=...&page=...`)
- نام پوشه‌ها مطابق با Next.js Dynamic Segments:
app/products/[category]/page.jsx
app/products/[category]/[subcategory]/page.jsx
app/products/[category]/[subcategory]/[slug]/page.jsx

yaml
Copy code
- همه صفحات باید از `getProductsPaginated` و `getCategoryTree` استفاده کنند.
- `ProductsPageClient.jsx` نباید منطق SSR داشته باشد (فقط تعامل کلاینتی).
- Redirectها باید در `middleware.js` و `/app/product/[slug]/page.jsx` انجام شوند.
- فیلتر دسته‌بندی و زیر‌دسته از path استخراج شود (params).

---

### خروجی مورد انتظار
1. ایجاد مسیرهای جدید طبق ساختار بالا در `/app/products/...`
2. ایجاد فایل `middleware.js` برای Redirect خودکار از مسیرهای Query-Based
3. ویرایش `ProductsPageClient.jsx` برای پشتیبانی از URLهای path-based
4. به‌روزرسانی `generateMetadata` در هر صفحه جهت canonical دقیق
5. افزودن JSON-LD به صفحات محصول
6. حفظ سازگاری کامل با:
 - Load More
 - SortControls
 - SPA Navigation
7. نوشتن commit message کامل با توضیح تغییرات

---

### نمونه مسیرها
| وضعیت | URL جدید | توضیح |
|--------|-----------|--------|
| صفحه محصولات کلی | `/products` | همه محصولات |
| دسته اصلی | `/products/books` | محصولات دسته «کتاب‌ها» |
| زیر‌دسته | `/products/books/medicalbooks` | محصولات زیر‌دسته «کتاب‌های طبی» |
| محصول تکی | `/products/books/medicalbooks/giahandarooei` | صفحه محصول تکی |

---

### وابستگی‌ها
- `productsApi.js`  
- `categoriesApi.js`  
- `ProductsPageClient.jsx`  
- `ProductsListPage.jsx`  
- `ProductPage.jsx` (یا `/app/product/[slug]/page.jsx`)  

---

### الزامات کیفیتی
- Clean Architecture حفظ شود (تفکیک SSR و Client)
- نام‌گذاری متغیرها و مسیرها مطابق قوانین `ARCHITECTURE_RULES.md`
- از `router.replace()` در بخش SPA استفاده شود
- انیمیشن‌ها و اسکرول حفظ شوند
- هیچ break در Load More یا Sort رخ ندهد

---

### نمونه Metadata در صفحات
```js
export async function generateMetadata({ params }) {
const { category, subcategory, slug } = params;
const url = `${process.env.NEXT_PUBLIC_SITE_URL}/products/${category}${subcategory ? '/' + subcategory : ''}${slug ? '/' + slug : ''}`;
return {
  title: slug || subcategory || category,
  alternates: { canonical: url },
};
}
تعریف موفقیت (Success Criteria)
✅ مسیرها به‌صورت /products/... کار کنند
✅ SSR/ISR فعال و بدون ارور Hydration
✅ SPA Load More + Sort سالم و همگام
✅ Redirectهای Query-Based کار کنند
✅ canonical + JSON-LD صحیح باشند
✅ UI بدون تغییر ظاهری غیرضروری باقی بماند
✅ هیچ refetch اضافی یا full reload رخ ندهد

scss
Copy code
