# Known deferred bugs

## OTP input removes Persian and Arabic digits

- Recorded: 2026-10-13.
- Status: Deferred by the user for later review; no fix requested.
- Location: `src/components/auth/AuthForm.jsx`, OTP input `onChange` handler.
- Reproduction: Enter or paste `۱۲۳۴۵۶` or `١٢٣٤٥٦`; the `/\D/g` filter removes all digits before submission normalization can run.
- Effect: Users entering Persian or Arabic OTP digits cannot complete login with that input.
- Future fix: Normalize digits before filtering non-digit characters.

## نبود رکورد مستقل برای هر تلاش پرداخت آنلاین

- تاریخ ثبت: ۲۰۲۶-۱۰-۱۴.
- مسئول پیگیری: محمد، برنامه‌نویس طرح الهی.
- وضعیت: ثبت برای پیگیری بعدی؛ پیاده‌سازی جدول تلاش‌های پرداخت در این درخواست انجام نمی‌شود.
- محل: `src/app/api/payment/request/route.js` و `src/app/api/payment/verify/route.js` در فرانت‌اند؛ مدل `src/api/order/content-types/order/schema.json` در بک‌اند.
- ساختار فعلی: وضعیت و رسید پرداخت روی سفارش ذخیره می‌شوند و شرح تلاش‌های ناموفق در یادداشت سفارش ثبت می‌شود؛ جدول مستقل برای تلاش‌های پرداخت وجود ندارد.
- اصلاح انجام‌شده: شکست پرداخت به‌تنهایی سفارش را لغو نمی‌کند و امکان تلاش مجدد روی همان سفارش معتبر وجود دارد. این مورد درباره نبود تاریخچه ساختاریافته هر تلاش است، نه مسدودبودن تلاش مجدد.
- پیامدها: دشواری پیگیری کسر وجه و تطبیق پاسخ بانک با هر تلاش، نبود گزارش دقیق تعداد و علت شکست‌ها، و دشواری رسیدگی به پاسخ‌های تکراری یا چند پرداخت موفق برای یک سفارش. به‌روزرسانی هم‌زمان یادداشت‌ها نیز ممکن است بخشی از سابقه را بازنویسی کند؛ این پیامدها ریسک معماری هستند و وقوع همه آن‌ها تأیید نشده است.
- پیشنهاد اصلاح: مدل مستقل «تلاش پرداخت» با رابطه چندبه‌یک به سفارش؛ هر تلاش دارای شناسه یکتا، مبلغ، زمان ایجاد و تکمیل، وضعیت درخواست توکن و تأیید بانک، کد خطا و رسید بانکی مستقل باشد. پاسخ بانک به همان تلاش متصل شود و پردازش تکراری اثر مالی یا دسترسی دوباره ایجاد نکند. توکن، اطلاعات محرمانه و شماره کامل کارت در سابقه ذخیره نشوند.
- معیار پذیرش: ده تلاش ناموفق و سپس یک تلاش موفق، همگی رکورد مستقل داشته باشند و فقط یک سفارش تسویه شود؛ پاسخ تکراری بانک دوباره اعمال نشود؛ پاسخ دیرهنگام تلاش قبلی و دو پرداخت موفق برای یک سفارش قابل تشخیص و پیگیری باشند؛ کاربر فقط سوابق خودش را ببیند و ادمین بتواند تلاش‌های هر سفارش را بررسی کند.

## Review scope exclusion

The production server does not currently use Light (نور). All Light-related issues are excluded from deployment bug reports until the user explicitly changes this scope.
