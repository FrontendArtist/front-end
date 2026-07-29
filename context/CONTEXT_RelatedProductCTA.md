# CONTEXT_RelatedProductCTA.md

## 🎯 Purpose
این کامپوننت یک کارت پیشنهاد ویژه (CTA) بنری/کارتی برای ترغیب خواننده مقاله به ثبت‌نام در دوره آموزشی یا خرید محصول مرتبط است.

---

### 📂 File Structure
- `/src/modules/articles/RelatedProductCTA.jsx`
- `/src/modules/articles/RelatedProductCTA.module.scss`
- `/src/lib/articlesApi.js` (افزودن متد getArticleCTA)

---

### ⚙️ Component Type
`Server Component` (رندر کاملاً SSR جهت سئو و پرفورمنس بالا)

---

### 🌐 Data Source
- Endpoint: `/api/articles/[slug]?populate[featured_course][populate]=cover&populate[featured_product][populate]=cover`
- Fallback Query: واکشی از `/api/courses` یا `/api/products` بر اساس `tags` یا `category.id`

---

### 🧩 Dependencies
- `Image` از `next/image`
- `Link` از `next/link`
- `ShoppingBag`, `GraduationCap`, `ArrowLeft` از `lucide-react`
- `strapiUtils.js` (برای مپ کردن عکس و قیمت)

---

### 🧠 Logic & Rules (الگوریتم ۳ مرحله‌ای)
1. **بررسی Direct Relation:** اگر مقاله دارای `featured_course` یا `featured_product` بود، اطلاعات همان رندر شود.
2. **بررسی Tag/Category Matching:** در غیر این صورت، با یک کوئری به API، اولین دوره/محصولی که تگ مشترک با مقاله دارد واکشی شود.
3. **فال‌بک نهایی:** اگر هیچ‌کدام نبود، یک کارت عمومی دعوت به مشاوره یا دوره شاخص سایت رندر شود.
4. **نمایش قیمت و تخفیف:** قیمت اصلی، قیمت با تخفیف و دکمه "مشاهده و ثبت‌نام" به همراه تصویر کاور دوره نشان داده شود.

---

### 🎨 Design Notes
- طراحی با گرید دو ستونه در دسکتاپ (سمت راست: عکس کاور و نشان تخفیف / سمت چپ: عنوان دوره، توضیحات کوتاه، قیمت و دکمه CTA).
- استفاده کامل از رنگ ها وسایز های variables.css
- ریسپانسیو کاملاً تک‌ستونه در دیوایس‌های موبایل.