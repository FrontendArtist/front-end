# مستند معماری و راهنمای ادغام: شناسه ثابت فصل‌ها (Chapter UUIDs)

این سند جهت هماهنگی توسعه میان شاخه `master` و شاخه `byeMoney` تدوین شده است.

## ۱. فایل‌های مشترک با byeMoney (کپی عینی - عیناً همگام نگه داشته شوند)
فایل‌های زیر مستقیماً و بدون تغییر ساختاری از byeMoney به master انتقال یافته‌اند:
- `backend/src/components/course-parts/chapter.json` (فیلد `integrationId`)
- `database/migrations/2026.09.16T12.00.00.course-chapters-integration-id.js`
- `database/migrations/2026.10.21T12.00.00.chapter-purchase.js`
- `backend/src/services/chapterIdentity.js`
- `backend/src/api/course/content-types/course/lifecycles.js`

> **هشدار برای توسعه‌دهنده شاخه byeMoney:** لطفاً لاجیک تولید UUID در این فایل‌ها را تغییر ندهید تا در زمان ادغام نهایی شاخه‌ها کانفلیکت رخ ندهد.

---

## ۲. فیلدهای پایدار جدید اضافه شده در سفارش‌ها و کاربر
برای اینکه در Strapi 5 با بازسازی کامپوننت‌های تکرارشونده (`course-parts.chapter`) دسترسی کاربران قدیمی و جدید نپرد:
1. در `backend/src/components/order/course-order-item.json`:
   - `chapterIntegrationId` (string, UUID): شناسه فصل
   - `courseDocumentId` (string): شناسه پایدار دوره
2. در اسکیمای کاربر (`backend/src/extensions/users-permissions/content-types/user/schema.json`):
   - `enrolledChapterIntegrationIds` (json): آرایه‌ای از UUIDهای فصل‌های خریداری‌شده کاربر.

---

## ۳. نکته حساس در زمان Merge شاخه byeMoney به master
همکار گرامی در شاخه byeMoney در فایل `extensions/users-permissions/strapi-server.js` متدی به نام `attachEnrolledChapterIntegrationIds` دارند که این فیلد را هنگام پاسخگویی واکشی می‌کند.
در هنگام ادغام، این تابع باید مقادیر موجود در دیتابیس (`user.enrolledChapterIntegrationIds`) را با مقادیر محاسبه‌شده بر اساس `enrolledChapters` **ترکیب (Merge / Set union)** کند تا هر دو گروه کاربران پوشش داده شوند:

```javascript
const storedUuids = Array.isArray(user.enrolledChapterIntegrationIds) ? user.enrolledChapterIntegrationIds : [];
const computedUuids = rows.map((r) => r.integration_id).filter(Boolean);
user.enrolledChapterIntegrationIds = [...new Set([...storedUuids, ...computedUuids])];
```

---

## ۴. اسکریپت Backfill برای سفارش‌های گذشته
اسکریپت `backend/scripts/backfill-chapter-uuids.js` به صورت مستقل طراحی شده تا بدون بلاک کردن راه‌اندازی استراپی، سفارش‌های گذشته را تطبیق دهد:
- `node scripts/backfill-chapter-uuids.js --check`: بررسی هم‌ترازی تعداد فصل‌ها در نسخه draft و published دوره‌ها.
- `node scripts/backfill-chapter-uuids.js --dry-run`: گزارش‌گیری و ذخیره موارد مشکوک در `backfill-review.csv`.
- `node scripts/backfill-chapter-uuids.js --apply`: ذخیره امن تغییرات درون تراکنش دیتابیس.

---

## ۵. گارد محافظت از حذف فصل‌ها
فایل `backend/src/services/chapterDeletionGuard.js` ثبت شده است تا در صورتی که ادمین استراپی قصد حذف فصلی را داشته باشد که برای آن سفارش ثبت شده است، عملیات را با خطای اعتبارسنجی متوقف کند.
