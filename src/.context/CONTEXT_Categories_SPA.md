# CONTEXT_Categories_SPA.md

## هدف
افزودن نمایش SPA دسته‌ها و زیردسته‌ها در صفحه محصولات `/products`.

## اجزای اصلی
1. `CategoriesBar.jsx`
   - نمایش دسته‌های اصلی به صورت گرید 6تایی.
   - هر کارت شامل:
     - تصویر دسته (icon)
     - نام دسته (name)
   - هنگام کلیک:
     - دسته انتخاب می‌شود.
     - state انتخاب دسته در context به‌روزرسانی می‌شود.

2. `SubCategoriesBar.jsx`
   - فقط زمانی نمایش داده می‌شود که یک دسته انتخاب شده باشد.
   - نمایش زیردسته‌ها به صورت افقی (scrollable).
   - هنگام کلیک روی زیردسته، فیلتر محصولات تغییر می‌کند.

3. `ProductsPageContext.js`
   - شامل state و actionهای زیر است:
     ```js
     const [activeCategory, setActiveCategory] = useState(null);
     const [activeSubCategory, setActiveSubCategory] = useState(null);
     const [products, setProducts] = useState([]);
     const [loading, setLoading] = useState(false);
     ```
   - توابع:
     - `fetchCategories()` → دریافت دسته‌های اصلی (از categoriesApi)
     - `fetchSubCategories(slug)` → دریافت زیردسته‌ها
     - `fetchProductsByCategory(slug)` → دریافت محصولات مربوط به دسته یا زیردسته

4. `/products/page.js`
   - شامل:
     - `<CategoriesBar />`
     - `<SubCategoriesBar />`
     - `<ProductGrid />`
   - مدیریت state از طریق context

## فچ‌های مورد نیاز (Strapi)
```bash
GET /api/categories?filters[parent][id][$null]=true&populate=image
GET /api/categories?filters[slug][$eq]={slug}&populate[subCategories][populate]=products
GET /api/products?filters[category][slug][$eq]={slug}&populate=image
رویدادها
رویداد	عمل
کلیک روی دسته	setActiveCategory + fetchSubCategories + fetchProductsByCategory
کلیک روی زیردسته	setActiveSubCategory + fetchProductsByCategory
تغییر sort	fetchProductsByCategory دوباره
load more	append محصولات به state فعلی

نکات مهم
از useEffect برای فچ اولیه دسته‌ها استفاده شود.

هیچ صفحه‌ای reload نشود.

از Skeleton برای حالت loading استفاده شود.

ProductGrid فقط props products بگیرد.

yaml
Copy code
