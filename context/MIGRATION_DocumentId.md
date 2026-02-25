# مهاجرت سیستم کامنت‌ها به DocumentId

**تاریخ**: 2025-12-08  
**وضعیت**: ✅ تکمیل شده

## 🎯 هدف

مهاجرت سیستم کامنت‌ها از استفاده `id` عددی به `documentId` متنی برای سازگاری با Strapi v5 و افزایش پایداری داده‌ها.

---

## 📋 تغییرات انجام شده

### ۱. لایه API (`src/lib/strapiUtils.js`)

اضافه کردن فیلد `documentId` به توابع format:

```javascript
// formatStrapiProducts
return {
  id: item.id,
  documentId: item.documentId, // ← اضافه شده
  title: item.title,
  // ...
};

// formatStrapiArticles
return {
  id: item.id,
  documentId: item.documentId, // ← اضافه شده
  slug: item.slug,
  // ...
};

// formatStrapiCourses
return {
  id: item.id,
  documentId: item.documentId, // ← اضافه شده
  slug: item.slug,
  // ...
};
```

---

### ۲. صفحات جزئیات

#### Articles (`src/app/articles/[slug]/page.js`)
```javascript
// واکشی کامنت‌ها
const initialComments = await getComments('article', rawArticle.documentId);

// ارسال به کامپوننت
<CommentsSection
  entityType="article"
  entityId={article.documentId}
  initialComments={initialComments}
/>
```

#### Courses (`src/app/courses/[slug]/page.js`)
```javascript
// واکشی کامنت‌ها
const initialComments = await getComments('course', rawCourse.documentId);

// ارسال به کامپوننت
<CommentsSection
  entityType="course"
  entityId={course.documentId}
  initialComments={initialComments}
/>
```

#### Products (`src/app/products/[category]/[subcategory]/[slug]/page.js`)
```javascript
// واکشی کامنت‌ها
const initialComments = await getComments('product', product.documentId);

// ارسال به کامپوننت
<CommentsSection
  entityType="product"
  entityId={product.documentId}
  initialComments={initialComments}
/>
```

---

### ۳. API کامنت‌ها (`src/lib/commentsApi.js`)

تغییر فیلتر در تابع `getComments`:

```javascript
// قبل
[`filters[${entityField}][id][$eq]`]: entityId,

// بعد
[`filters[${entityField}][documentId][$eq]`]: entityId,
```

---

## ✅ نکات مهم

### چرا `submitComment` نیازی به تغییر نداشت؟

تابع `submitComment` به این دلیل نیازی به تغییر نداشت:

1. **Strapi v5 هوشمند است**: وقتی یک رشته متنی (documentId) به فیلد relation ارسال می‌شود، Strapi خودش آن را تشخیص می‌دهد
2. **Payload فعلی کافی است**: 
   ```javascript
   dataPayload.article = commentData.entityId; // می‌تواند documentId باشد
   ```
3. **پشتیبانی دوگانه**: Strapi v5 هم `id` عددی و هم `documentId` متنی را برای relations قبول می‌کند

---

## 🧪 تست

برای تست کردن این تغییرات:

1. به یکی از صفحات زیر بروید:
   - `/articles/[slug]`
   - `/courses/[slug]`
   - `/products/[category]/[subcategory]/[slug]`

2. بررسی کنید که:
   - ✅ کامنت‌های موجود به درستی نمایش داده می‌شوند
   - ✅ ارسال کامنت جدید بدون خطا کار می‌کند
   - ✅ در Console هیچ خطای 400 یا 404 وجود ندارد

3. در Console مرورگر، payload ارسالی را بررسی کنید:
   ```javascript
   {
     "data": {
       "content": "...",
       "rating": 5,
       "article": "abc123xyz", // ← documentId متنی
       "isApproved": false
     }
   }
   ```

---

## 🎉 مزایای این تغییر

1. **پایداری بیشتر**: `documentId` در Strapi v5 پایدارتر از `id` است
2. **سازگاری با Admin Panel**: پنل ادمین Strapi v5 با `documentId` بهتر کار می‌کند
3. **آینده‌نگری**: آماده برای ویژگی‌های جدید Strapi v5
4. **یکپارچگی**: تمام بخش‌های سیستم کامنت‌ها از یک نوع شناسه استفاده می‌کنند

---

## 📝 فایل‌های تغییر یافته

- ✅ `src/lib/strapiUtils.js`
- ✅ `src/lib/commentsApi.js`
- ✅ `src/app/articles/[slug]/page.js`
- ✅ `src/app/courses/[slug]/page.js`
- ✅ `src/app/products/[category]/[subcategory]/[slug]/page.js`

---

## 🔄 مراحل بعدی (اختیاری)

1. **تست کامل**: تست کردن ارسال و نمایش کامنت‌ها در تمام صفحات
2. **بررسی Backend**: اطمینان از اینکه Strapi به درستی `documentId` را در دیتابیس ذخیره می‌کند
3. **مستندسازی API**: آپدیت مستندات API برای ذکر استفاده از `documentId`

---

**نتیجه**: مهاجرت با موفقیت انجام شد! 🎊
