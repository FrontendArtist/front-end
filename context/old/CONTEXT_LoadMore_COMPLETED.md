# ✅ Load More Pagination - Completed

## 🎯 هدف پروژه
افزودن قابلیت Load More (صفحه‌بندی سمت کلاینت) به تمام Gridهای پروژه با استفاده از Route Handlers داخلی Next.js و بدون fetch مستقیم از Strapi.

---

## 📦 تغییرات انجام شده

### 1️⃣ **ServiceGrid** - اضافه شدن Load More

#### `/lib/servicesApi.js`
تابع جدید `getServicesPaginated()` اضافه شد:
```javascript
export async function getServicesPaginated(page = 1, pageSize = 6, sort = 'createdAt:desc')
```
- پشتیبانی از pagination
- populate فیلد `image`
- برگرداندن `{ data: [...], meta: {...} }`

#### `/app/api/services/route.js` ✨ جدید
Route Handler جدید ساخته شد:
```javascript
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = parseInt(searchParams.get('pageSize') || '6', 10);
  const sort = searchParams.get('sort') || 'createdAt:desc';
  
  const result = await getServicesPaginated(page, pageSize, sort);
  return Response.json(result);
}
```

#### `/modules/services/ServiceGrid/ServiceGrid.jsx`
قابلیت‌های جدید اضافه شد:
- ✅ State management: `services`, `page`, `isLoading`, `hasMore`
- ✅ Handler: `handleLoadMore()`
- ✅ دکمه "بارگذاری بیشتر" با disable در حالت loading
- ✅ نظرات فارسی توضیح جریان داده

**کد نمونه:**
```javascript
const handleLoadMore = async () => {
  setIsLoading(true);
  try {
    const nextPage = page + 1;
    // ✅ استفاده از Route Handler داخلی Next.js
    const response = await fetch(`/api/services?page=${nextPage}&pageSize=${PAGE_SIZE}`);
    const result = await response.json();
    
    setServices(prev => [...prev, ...result.data]);
    setPage(nextPage);
    setHasMore(result.meta.pagination.page < result.meta.pagination.pageCount);
  } catch (error) {
    console.error("خطا در بارگذاری خدمات بیشتر:", error);
  } finally {
    setIsLoading(false);
  }
};
```

#### `/modules/services/ServiceGrid/ServiceGrid.module.scss`
استایل‌های جدید با استفاده از Design Tokens:

```scss
.loadMoreContainer {
  display: flex;
  justify-content: center;
  margin-top: var(--space-section-button-desktop); // 40px
  padding-bottom: var(--space-section-bottom-desktop); // 100px
}

.loadMoreButton {
  padding: 16px 48px;
  color: var(--color-text-primary);
  background: transparent;
  border: 2px solid var(--color-text-primary);
  border-radius: 8px;
  
  &:hover:not(:disabled) {
    background: var(--color-text-primary);
    color: var(--color-bg-primary);
    border-color: var(--color-title-hover);
    transform: translateY(-2px);
  }
  
  @include respond(sm) {
    width: 100%; // Full width on mobile
  }
}
```

**ویژگی‌های استایل:**
- ✅ استفاده از توکن‌های رنگ از `styles.md`
- ✅ Responsive: Full width در موبایل
- ✅ Hover effect با transform
- ✅ Disabled state برای loading
- ✅ Transition برای smoothness

---

### 2️⃣ **بررسی Load More در سایر Gridها**

#### ProductGrid.jsx ✅
- State: `products`, `page`, `isLoading`, `hasMore`
- Handler: `handleLoadMore()` با fetch به `/api/products`
- دکمه بارگذاری بیشتر با disable state
- **PAGE_SIZE: 3**

#### ArticleGrid.jsx ✅
- State: `articles`, `page`, `isLoading`, `hasMore`
- Handler: `handleLoadMore()` با fetch به `/api/articles`
- دکمه بارگذاری بیشتر با disable state
- **PAGE_SIZE: 6**

#### CourseGrid.jsx ✅
- State: `courses`, `page`, `isLoading`, `hasMore`
- Handler: `handleLoadMore()` با fetch به `/api/courses`
- دکمه بارگذاری بیشتر با disable state
- **PAGE_SIZE: 6**

---

## 🌐 جریان داده یکپارچه در تمام Grids

```
┌─────────────────────────────────────────────────────────┐
│  User Action: Click "بارگذاری بیشتر"                    │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│  Client Component (Grid.jsx)                            │
│  - setIsLoading(true)                                   │
│  - fetch(`/api/[domain]?page=${page+1}&pageSize=6`)     │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│  Next.js Route Handler (/app/api/[domain]/route.js)    │
│  - Parse searchParams (page, pageSize, sort)           │
│  - Call get[Domain]Paginated(page, pageSize, sort)     │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│  Domain API Module (/lib/[domain]Api.js)               │
│  - Build Strapi query string                           │
│  - apiClient(`/api/[domain]?pagination[page]=...`)     │
│  - Format response with formatStrapi[Domain]()          │
│  - Return { data: [...], meta: {...} }                 │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│  API Client (apiClient.js)                             │
│  - fetch(STRAPI_URL + endpoint)                         │
│  - Return JSON response                                 │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│  Strapi Backend (localhost:1337)                        │
│  - Return paginated data with meta                      │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼ (Response flows back up)
┌─────────────────────────────────────────────────────────┐
│  Client Component Update                                │
│  - setItems(prev => [...prev, ...result.data])         │
│  - setPage(page + 1)                                    │
│  - setHasMore(check pagination.pageCount)              │
│  - setIsLoading(false)                                  │
└─────────────────────────────────────────────────────────┘
```

---

## ✨ ویژگی‌های مشترک در تمام Grids

### 1. **State Management**
```javascript
const [items, setItems] = useState(initialItems || []);
const [page, setPage] = useState(1);
const [isLoading, setIsLoading] = useState(false);
const [hasMore, setHasMore] = useState(initialItems.length === PAGE_SIZE);
```

### 2. **Load More Handler**
```javascript
const handleLoadMore = async () => {
  setIsLoading(true);
  try {
    const nextPage = page + 1;
    const response = await fetch(`/api/[domain]?page=${nextPage}&pageSize=${PAGE_SIZE}`);
    const result = await response.json();
    
    setItems(prev => [...prev, ...result.data]);
    setPage(nextPage);
    setHasMore(result.meta.pagination.page < result.meta.pagination.pageCount);
  } catch (error) {
    console.error("خطا در بارگذاری:", error);
  } finally {
    setIsLoading(false);
  }
};
```

### 3. **UI Pattern**
```javascript
{hasMore && (
  <div className={styles.loadMoreContainer}>
    <button 
      onClick={handleLoadMore} 
      className={styles.loadMoreButton}
      disabled={isLoading}
    >
      {isLoading ? 'در حال بارگذاری...' : 'بارگذاری بیشتر'}
    </button>
  </div>
)}
```

---

## 🎨 استایل‌ها و Design Tokens

### توکن‌های استفاده شده:
```scss
// رنگ‌ها
--color-text-primary: #F6D982
--color-bg-primary: #061818
--color-title-hover: #F5C452

// تایپوگرافی
--font-md: 16px
--font-weight-medium: 500
--line-height-md: 1.6

// Spacing
--space-section-button-desktop: 40px
--space-section-bottom-desktop: 100px
--space-title-text-desktop: 24px
```

### الگوی واکنش‌گرا:
- **Desktop:** دکمه با عرض ثابت (min-width: 200px)
- **Mobile:** دکمه تمام‌عرض (width: 100%)
- **Hover:** Background fill + transform translateY
- **Disabled:** opacity 0.5 + cursor not-allowed

---

## 📂 فایل‌های تغییر یافته

### ایجاد شده:
- ✅ `front-end/src/app/api/services/route.js`

### به‌روزرسانی شده:
- ✅ `front-end/src/lib/servicesApi.js` (+45 lines)
- ✅ `front-end/src/modules/services/ServiceGrid/ServiceGrid.jsx` (بازنویسی کامل)
- ✅ `front-end/src/modules/services/ServiceGrid/ServiceGrid.module.scss` (+85 lines)

### بررسی شده (قبلاً وجود داشت):
- ✅ `front-end/src/modules/products/ProductGrid/ProductGrid.jsx`
- ✅ `front-end/src/modules/articles/ArticleGrid/ArticleGrid.jsx`
- ✅ `front-end/src/modules/courses/CourseGrid/CourseGrid.jsx`

---

## 🧪 چک‌لیست تست

### ServiceGrid (جدید):
- [ ] بارگذاری اولیه 6 خدمت
- [ ] کلیک روی "بارگذاری بیشتر" خدمات جدید را می‌آورد
- [ ] دکمه در حین loading غیرفعال می‌شود
- [ ] دکمه در صفحه آخر مخفی می‌شود
- [ ] در موبایل دکمه تمام‌عرض است

### ProductGrid:
- [ ] Load More با PAGE_SIZE=3 کار می‌کند
- [ ] Sorting حفظ می‌شود
- [ ] State درست مدیریت می‌شود

### ArticleGrid:
- [ ] Load More با PAGE_SIZE=6 کار می‌کند
- [ ] useRef برای جلوگیری از اجرای اضافی کار می‌کند

### CourseGrid:
- [ ] Load More با PAGE_SIZE=6 کار می‌کند
- [ ] Sorting حفظ می‌شود

---

## 🚀 دستورات تست

```bash
cd front-end
npm run dev

# در مرورگر:
# - http://localhost:3000/products (Load More با 3 آیتم)
# - http://localhost:3000/articles (Load More با 6 آیتم)
# - http://localhost:3000/courses (Load More با 6 آیتم)
# - http://localhost:3000/services (Load More با 6 آیتم - جدید)
```

---

## 📝 یادداشت‌های مهم

### 1. **PAGE_SIZE متفاوت**
- ProductGrid: `PAGE_SIZE = 3` (چون محصولات بزرگ‌تر هستند)
- Articles, Courses, Services: `PAGE_SIZE = 6`

### 2. **Sorting در Products و Courses**
- Products: latest, price:asc, price:desc
- Articles: latest (publishedAt:desc), oldest (publishedAt:asc)
- Courses: latest, price:asc, price:desc
- Services: فقط createdAt:desc (بدون UI sorting)

### 3. **Metadata Structure**
تمام API ها ساختار یکسان برمی‌گردانند:
```javascript
{
  data: [...],
  meta: {
    pagination: {
      page: 2,
      pageSize: 6,
      pageCount: 5,
      total: 30
    }
  }
}
```

### 4. **Error Handling**
همه handlers خطا را catch می‌کنند و:
- در console لاگ می‌کنند
- loading را false می‌کنند
- لیست فعلی را حفظ می‌کنند

---

## ✅ خلاصه

**4 Grid Component** حالا دارای قابلیت Load More کامل هستند:

| Grid | Route Handler | Paginated Function | PAGE_SIZE | Status |
|------|---------------|-------------------|-----------|--------|
| ProductGrid | `/api/products` | `getProductsPaginated()` | 3 | ✅ |
| ArticleGrid | `/api/articles` | `getArticlesPaginated()` | 6 | ✅ |
| CourseGrid | `/api/courses` | `getCoursesPaginated()` | 6 | ✅ |
| ServiceGrid | `/api/services` | `getServicesPaginated()` | 6 | ✅ جدید |

**جریان داده:**
```
Client → Next.js API Route → Domain API Module → apiClient → Strapi
```

**ویژگی‌ها:**
- ✅ State management کامل
- ✅ Loading states
- ✅ Disabled button در حین بارگذاری
- ✅ hasMore برای مخفی کردن دکمه
- ✅ استایل با Design Tokens
- ✅ Responsive design
- ✅ نظرات فارسی کامل
- ✅ 0 Linter Errors

این معماری Clean، Scalable و Maintainable است! 🎉

---

## 🎯 Commit Message

```
feat: add Load More pagination for all Grids

- Add getServicesPaginated() to servicesApi.js
- Create /app/api/services/route.js Route Handler
- Implement Load More in ServiceGrid with state management
- Add Load More button styling with design tokens
- Ensure responsive design (full-width on mobile)
- Follow Clean Architecture and ARCHITECTURE_RULES.md
- Persian comments explaining data flow

All 4 Grids (Products, Articles, Courses, Services) now support
Load More pagination through internal Next.js API routes.
```

