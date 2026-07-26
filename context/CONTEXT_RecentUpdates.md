# CONTEXT_RecentUpdates.md

## 🎯 Purpose
پیاده‌سازی بخش «آخرین تغییرات» (Recent Updates Feed) برای نمایش آخرین تعاملات و محتواها شامل آخرین محصول، آخرین مقاله، آخرین خدمت، و آخرین کامنت‌ها. این بخش به صورت یک گرید دو ردیفه ۹ تایی (Grid Feed) با کارت‌های کلیک‌پذیر و لینک مستقیم به صفحه مربوطه طراحی می‌شود.

---

### 📂 File Structure
- `src/components/home/RecentUpdates/RecentUpdates.jsx`
- `src/components/home/RecentUpdates/RecentUpdates.module.scss`
- `src/components/cards/UpdateCard.jsx`
- `src/components/cards/UpdateCard.module.scss`

---

### ⚙️ Component Type
- `RecentUpdates.jsx`: `server` (واکشی هم‌زمان داده‌ها سمت سرور برای عملکرد بهینه و سئو)
- `UpdateCard.jsx`: `use client` (برای انیمیشن‌های تعاملی و کلیک)

---

### 🌐 Data Source & Aggregation
داده‌ها از ۴ منبع مجزا واکشی و ترکیب می‌شوند:
1. **آخرین محصولات:** `/api/products?sort[0]=createdAt:desc&pagination[limit]=3`
2. **آخرین مقالات:** `/api/articles?sort[0]=publishedAt:desc&pagination[limit]=2`
3. **آخرین خدمات:** `/api/services?sort[0]=createdAt:desc&pagination[limit]=2`
4. **آخرین کامنت‌ها:** `/api/comments?sort[0]=createdAt:desc&pagination[limit]=2&populate=user`

**منطق ترکیب داده‌ها (Aggregation Logic):**
- داده‌ها با شناسه نوع (`type`: 'product' | 'article' | 'service' | 'comment') و تاریخ ایجاد (`createdAt`) برچسب‌گذاری می‌شوند.
- آرایه ۹ تایی مرتب‌شده بر اساس تاریخ ترکیب و مرتب‌سازی به کارت‌ها پاس داده می‌شود.

---

### 🧠 Component Props & Layout
- **چیدمان:** Grid دو ردیفه (در دسکتاپ 5-4 یا 9 آیتم به صورت Responsive Grid با 2 ردیف اسکرول افقی یا Grid چندستونه).
- **نوع لینک‌ها:**
  - `product` -> `/products/[slug]`
  - `article` -> `/articles/[slug]`
  - `service` -> `/services/[slug]`
  - `comment` -> لینک مستقیم به صفحه مربوطه با Anchortag.

---

### 🎨 Design Notes
- پیروی کامل از CSS Variables موجود در `variables.css` .
- استفاده از آیکون یا تایپ‌بج (Type Badge) روی هر کارت برای مشخص بودن نوع محتوا (مثلاً: «محصول جدید»، «کامنت جدید»).
- افکت‌های Hover تعاملی (Border Highlight با رنگ طلایی/اصلی برند).

---
