# CONTEXT_SingleArticleModules.md

## 🎯 Purpose
این سند، مشخصات فنی ۳ ماژول تکمیلی صفحه مقاله (`/articles/[slug]`) شامل تگ‌ها، ناوبری مقاله قبلی/بعدی و اسلایدر مقالات مرتبط بر پایه `BaseSlider` را تعریف می‌کند.

---

### 📂 File Structure
- `/src/modules/articles/ArticleTags.jsx` & `ArticleTags.module.scss`
- `/src/modules/articles/ArticleNav.jsx` & `ArticleNav.module.scss`
- `/src/modules/articles/RelatedArticles.jsx` & `RelatedArticles.module.scss`
- `/src/lib/articlesApi.js` (ارتقا برای دریافت مقالات مرتبط و مجاور)

---

### ⚙️ Component Type
- `ArticleTags`: Server Component (رندر ساده لیست تگ‌ها با لینک‌های جستجو)
- `ArticleNav`: Server Component (نمایش لینک مقاله قبلی و بعدی)
- `RelatedArticles`: Server Component / Client Component (بر پایه `BaseSlider` موجود در پروژه)

---

### 🌐 Data Source
1. **ArticleTags:**
   - Input: `tags` (آرایه‌ای از رشته‌ها یا آبجکت‌های تگ از داده Strapi مقاله)
   - Link: `/articles?tag={tag.slug}`
2. **ArticleNav:**
   - Input: `prevArticle` و `nextArticle` شامل `{ slug, title }`
   - Fetching: از متد `getAdjacentArticles(currentCreatedAt)` در `articlesApi.js`
3. **RelatedArticles:**
   - Input: `currentArticleId`, `category` یا `tags`
   - Fetching: از متد `getRelatedArticles({ categoryId, currentId })` در `articlesApi.js`

---

### 🧩 Dependencies
- `BaseSlider` (کامپوننت اسلایدر عمومی پروژه)
- `ArticleCard` (کامپوننت کارت مقاله)
- `Lucide Icons` (`ArrowRight`, `ArrowLeft`, `Tag`)

---

### 🧠 Logic & Rules
1. **تگ‌ها (`ArticleTags`):**
   - اگر آرایه تگ‌ها خالی یا undefined بود، هیچی رندر نشود (Conditional rendering).
   - استایل به‌صورت Pills/Badges با Hover effect روی رنگ برند.

2. **ناوبری (`ArticleNav`):**
   - اگر مقاله قبلی یا بعدی وجود نداشت، فلکس به شکل صحیح (مثلاً `justify-content: flex-end` یا `flex-start`) حفظ شود.
   - شامل فلش راهنما + عنوان مقاله با حالت `truncated` برای جلوگیری از بهم ریختگی متن‌های طولانی.

3. **اسلایدر مقالات مرتبط (`RelatedArticles`):**
   - حتماً مقاله‌ی جاری (`currentArticleId`) از لیست فیلتر/استثنا شود.
   - از `BaseSlider` با پروپس `slidesPerView={3}` و `renderItem={(article) => <ArticleCard ... />}` استفاده شود.

---

