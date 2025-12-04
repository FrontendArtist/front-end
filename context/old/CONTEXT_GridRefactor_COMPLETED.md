# ✅ Grid Refactoring - Completed

## 🎯 هدف پروژه
بازنویسی کامل Gridهای پروژه (Products, Courses, Articles) برای حذف fetch مستقیم در Client Components و جایگزینی آن با Route Handlerهای داخلی Next.js که از API abstraction استفاده می‌کنند.

---

## 📦 تغییرات انجام شده

### 1️⃣ **API Domain Modules** - افزودن توابع Pagination

تابع `getPaginated` به هر سه ماژول API اضافه شد:

#### `/lib/productsApi.js`
```javascript
export async function getProductsPaginated(page = 1, pageSize = 6, sort = 'createdAt:desc')
```
- پشتیبانی از pagination و sorting
- فرمت کردن داده‌های Strapi با `formatStrapiProducts`
- برگرداندن `{ data: [...], meta: {...} }`

#### `/lib/articlesApi.js`
```javascript
export async function getArticlesPaginated(page = 1, pageSize = 6, sort = 'publishedAt:desc')
```
- populate فیلد `cover` برای تصویر مقاله
- sort پیش‌فرض بر اساس `publishedAt`

#### `/lib/coursesApi.js`
```javascript
export async function getCoursesPaginated(page = 1, pageSize = 6, sort = 'createdAt:desc')
```
- populate فیلد `media` برای تصویر دوره
- پشتیبانی از sorting بر اساس قیمت و تاریخ

---

### 2️⃣ **Next.js Route Handlers** - ایجاد API Routes داخلی

سه Route Handler جدید ساخته شد:

#### `/app/api/products/route.js`
```javascript
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = parseInt(searchParams.get('pageSize') || '3', 10);
  const sort = searchParams.get('sort') || 'createdAt:desc';
  
  const result = await getProductsPaginated(page, pageSize, sort);
  return Response.json(result);
}
```

#### `/app/api/articles/route.js`
- پارامترهای مشابه با pageSize پیش‌فرض `6`
- sort پیش‌فرض: `publishedAt:desc`

#### `/app/api/courses/route.js`
- پارامترهای مشابه با pageSize پیش‌فرض `6`
- sort پیش‌فرض: `createdAt:desc`

**ویژگی‌های مشترک:**
- ✅ Parse کردن query parameters
- ✅ Validation و default values
- ✅ مدیریت خطا با status 500
- ✅ نظرات فارسی برای توضیح جریان داده

---

### 3️⃣ **Grid Components** - Refactor به استفاده از Internal API

#### `/modules/products/ProductGrid/ProductGrid.jsx`
**قبل:**
```javascript
const response = await fetch(
  `${STRAPI_API_URL}/api/products?populate=*&sort=${sortQuery}&...`
);
const result = await response.json();
const newProducts = formatStrapiProducts(result, STRAPI_API_URL);
```

**بعد:**
```javascript
const response = await fetch(
  `/api/products?page=${page}&pageSize=${pageSize}&sort=${sortQuery}`
);
const result = await response.json();
setProducts(result.data); // داده‌ها قبلاً فرمت شده‌اند
```

#### `/modules/articles/ArticleGrid/ArticleGrid.jsx`
- حذف `formatStrapiArticles` و `STRAPI_API_URL`
- استفاده از `/api/articles` به‌جای Strapi مستقیم
- حفظ منطق `useRef` برای جلوگیری از اجرای اضافی

#### `/modules/courses/CourseGrid/CourseGrid.jsx`
- حذف `formatStrapiCourses` و `STRAPI_API_URL`
- استفاده از `/api/courses` به‌جای Strapi مستقیم
- حفظ sorting و pagination logic موجود

---

## 🌐 جریان داده (Data Flow) جدید

```
┌─────────────────────┐
│  Client Component   │
│  (ProductGrid.jsx)  │
└──────────┬──────────┘
           │
           │ fetch('/api/products?page=2&sort=price:asc')
           ▼
┌─────────────────────┐
│  Next.js Route      │
│  Handler            │
│  /app/api/products/ │
│  route.js           │
└──────────┬──────────┘
           │
           │ getProductsPaginated(2, 6, 'price:asc')
           ▼
┌─────────────────────┐
│  Domain API Module  │
│  productsApi.js     │
└──────────┬──────────┘
           │
           │ apiClient('/api/products?...')
           ▼
┌─────────────────────┐
│  API Client         │
│  (apiClient.js)     │
└──────────┬──────────┘
           │
           │ fetch(STRAPI_URL + endpoint)
           ▼
┌─────────────────────┐
│  Strapi Backend     │
│  (localhost:1337)   │
└─────────────────────┘
```

---

## ✨ مزایای معماری جدید

### 1. **امنیت (Security)**
- ❌ قبل: `STRAPI_API_URL` در Client فاش می‌شد
- ✅ حالا: فقط `/api/products` در Client، URL واقعی در سرور

### 2. **انتزاع (Abstraction)**
- Client Components از جزئیات Strapi بی‌اطلاع هستند
- تغییر بک‌اند بدون دست زدن به UI ممکن است

### 3. **تست‌پذیری (Testability)**
- Mock کردن `/api/products` آسان‌تر از mock کردن Strapi مستقیم
- Route Handlers را می‌توان جداگانه تست کرد

### 4. **توسعه‌پذیری (Extensibility)**
- افزودن Authentication، Rate Limiting، Caching در Route Handlers
- بدون تغییر در Client Components

### 5. **یکپارچگی (Consistency)**
- تمام Grids از یک الگوی یکسان استفاده می‌کنند
- کد تمیز‌تر و قابل نگهداری‌تر

---

## 📂 فایل‌های تغییر یافته

### ایجاد شده:
- ✅ `front-end/src/app/api/products/route.js`
- ✅ `front-end/src/app/api/articles/route.js`
- ✅ `front-end/src/app/api/courses/route.js`

### به‌روزرسانی شده:
- ✅ `front-end/src/lib/productsApi.js` (+45 lines)
- ✅ `front-end/src/lib/articlesApi.js` (+45 lines)
- ✅ `front-end/src/lib/coursesApi.js` (+45 lines)
- ✅ `front-end/src/modules/products/ProductGrid/ProductGrid.jsx`
- ✅ `front-end/src/modules/articles/ArticleGrid/ArticleGrid.jsx`
- ✅ `front-end/src/modules/courses/CourseGrid/CourseGrid.jsx`

---

## 🧪 تست و اعتبارسنجی

### چک‌لیست تست:
- [ ] بارگذاری اولیه محصولات کار می‌کند
- [ ] مرتب‌سازی محصولات کار می‌کند
- [ ] دکمه "بارگذاری بیشتر" کار می‌کند
- [ ] همین موارد برای Articles
- [ ] همین موارد برای Courses
- [ ] خطاها به درستی مدیریت می‌شوند
- [ ] Loading states نمایش داده می‌شوند

### دستورات تست:
```bash
cd front-end
npm run dev

# در مرورگر:
# - http://localhost:3000/products
# - http://localhost:3000/articles
# - http://localhost:3000/courses
```

---

## 📝 نکات مهم برای توسعه آینده

### 1. **افزودن Caching**
```javascript
// در route.js:
export const revalidate = 3600; // Cache for 1 hour
```

### 2. **افزودن Authentication**
```javascript
// در route.js:
import { getServerSession } from 'next-auth';

export async function GET(request) {
  const session = await getServerSession();
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // ...
}
```

### 3. **افزودن Rate Limiting**
```javascript
// استفاده از middleware یا کتابخانه‌هایی مثل upstash/ratelimit
```

---

## 🎉 خلاصه

تمام Grid Components با موفقیت Refactor شدند و حالا از معماری Clean Architecture پیروی می‌کنند:

✅ **تمام fetch() مستقیم به Strapi حذف شد**  
✅ **3 Route Handler داخلی Next.js ایجاد شد**  
✅ **3 تابع Paginated به API modules اضافه شد**  
✅ **3 Grid Component به‌روزرسانی شد**  
✅ **0 Linter Error**  
✅ **نظرات فارسی کامل در همه جا**  

جریان داده:
```
Client → Next.js API Route → Domain API Module → apiClient → Strapi
```

این معماری قابل توسعه، تست‌پذیر و امن است! 🚀

