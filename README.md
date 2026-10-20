# فرانت‌اند طرح الهی

رابط Next.js طرح الهی؛ هویت و کاتالوگ از Strapi و عملیات مالی نور از بای‌مانی دریافت می‌شود. نسخهٔ وابستگی‌ها در `package.json` و `package-lock.json` ثبت است.

## اجرای محلی و آزمون

تنظیمات محیط محلی را آماده کنید؛ سپس از ریشهٔ این مخزن:

```powershell
npm ci
npm run dev
```

ساخت و اجرای نسخهٔ ساخته‌شده: `npm run build` و `npm start`. آزمون تعاملی `npm test` است؛ برای اجرای یک‌باره از `npm test -- --watch=false --runInBand` استفاده کنید. فرمان‌های موجود در [package.json](package.json) مرجع‌اند.

آدرس‌های `NEXT_PUBLIC_STRAPI_URL`، `NEXT_PUBLIC_STRAPI_API_URL` و `NEXT_PUBLIC_BYEMONEY_API_URL` باید به محیط انتخاب‌شده اشاره کنند. `STRAPI_API_TOKEN` و `NEXTAUTH_SECRET` در تنظیمات محرمانهٔ سرور نگهداری شوند. پیشوند `NEXT_PUBLIC_` برای کلید محرمانه مناسب نیست. روش پیکربندی و آزمون درگاه در [SEP محلی](docs/testing/sep-local-mock.md) است.

## راهنمای اسناد

- [نقشهٔ مشترک اسناد سه پروژه](../../ByeMoney/docs/README.md)
- [راهنمای فنی فرانت](docs/Technical-Guide.md): ساختار و نقطهٔ شروع هر بخش
- [قرارداد اتصال](../../ByeMoney/docs/integration/ByeMoney-Strapi-Integration.md): API، DTO و هویت
- [تصمیم‌های بای‌مانی](../../ByeMoney/docs/architecture/ByeMoney-Decisions.md): فقط برای بخش‌های مرتبط با اتصال
- [کارهای باز اتصال](../../ByeMoney/TASKS.md) و [باگ‌های سایت فعلی](../../ByeMoney/HOTFIXES.md)
- [شواهد آزمون مشترک](../../ByeMoney/docs/testing/Verification-Summary.md)

تاریخچهٔ تغییرات جزئی در Git قابل بازیابی است؛ CHANGELOG قدیمی فهرست کار فعال یا قرارداد امروز نیست. راهنمای فنی، تصمیم و فهرست تسک برای شاخه‌ها تکثیر نشوند. `CLAUDE.md` فقط ورودی ابزار برای ارجاع به `AGENTS.md` است و سند موازی محسوب نمی‌شود.
