# راهنمای فنی کوتاه فرانت‌اند

این راهنما جایگزین یادداشت‌های پراکندهٔ طراحی است و فقط نقطهٔ شروع بررسی کد را معرفی می‌کند. [تصمیم‌های بای‌مانی](../../../ByeMoney/docs/architecture/ByeMoney-Decisions.md) متعلق به پروژهٔ بای‌مانی است و در فرانت طرح الهی فقط برای بخش‌های مرتبط با اتصال به آن مراجعه می‌شود. قرارداد API و هویت از [قرارداد اتصال](../../../ByeMoney/docs/integration/ByeMoney-Strapi-Integration.md) خوانده شود.

## ساختار

| مسیر | کاربرد |
|---|---|
| `src/app/` | صفحه‌ها و مسیرهای API داخلی |
| `src/lib/` | ارتباط با سرویس‌ها و منطق مشترک |
| `src/components/` و `src/modules/` | رابط و بخش‌های موضوعی |
| `src/store/` و `src/hooks/` | وضعیت مشترک و هماهنگی نشست/سبد |
| `src/styles/` | توکن‌ها و استایل‌های عمومی |

## نقاط شروع هر بخش

| بخش | فایل‌های اصلی |
|---|---|
| ورود و نشست | [auth.js](../src/lib/auth.js)، [AuthForm](../src/components/auth/AuthForm.jsx) |
| سبد | [useCartStore](../src/store/useCartStore.js)، [useCartSync](../src/hooks/useCartSync.js) |
| خرید و اتصال مالی | [checkoutService](../src/lib/checkoutService.js)، [byeMoneyApi](../src/lib/byeMoneyApi.js) |
| دوره و دسترسی | [coursesApi](../src/lib/coursesApi.js)، [courseUtils](../src/lib/courseUtils.js)، [CourseContentManager](../src/modules/courses/CourseContentManager.jsx) |
| سفارش و رسید بای‌مانی | [OrdersList](../src/components/profile/OrdersList.jsx)، [OrdersTable ادمین](../src/components/admin/Orders/OrdersTable.jsx) و توابع courseOrders/coursePurchaseReceipt در byeMoneyApi |
| سفارش و پروفایل | [useOrdersStore](../src/store/useOrdersStore.js)، [profileClientApi](../src/lib/client/profileClientApi.js) |
| پیام، نظر و جست‌وجو | [useUserMessagesStore](../src/store/useUserMessagesStore.js)، [commentsApi](../src/lib/commentsApi.js)، [searchApi](../src/lib/searchApi.js) |
| پنل | [صفحهٔ ادمین](../src/app/admin/page.jsx) و زیرمسیرهای `src/app/admin/`؛ رسیدگی مالی در `src/app/(financial)/admin/` |
| استایل | [variables.css](../src/styles/variables.css)، [light-theme.css](../src/styles/light-theme.css)، [main.scss](../src/styles/main.scss) |

## نکات نگهداری

- قبل از تغییر، مصرف‌کنندگان و آزمون‌های همان بخش بررسی شوند. مثال‌های قدیمی `id`، نقش، پرداخت و استایل مرجع قرارداد نیستند.
- مسیر Legacy سفارش، شارژ نور و خرید با موجودی سه جریان متفاوت‌اند؛ وضعیت اتصال آن‌ها از [TASKS](../../../ByeMoney/TASKS.md) و شواهد آزمون خوانده شود. قرارداد سبد دوره در I09-C و پیگیری/رسید در I11-T/I11-P است. پروفایل کاربر این APIها را مصرف می‌کند؛ وضعیت فهرست ادمین و پذیرش محیط مقصد در TASKS است.
- باگ‌های سایت فعلی فقط در [HOTFIXES](../../../ByeMoney/HOTFIXES.md) ثبت شوند؛ این راهنما فهرست تسک ندارد.
- اسکریپت‌های اجرا و آزمون در `package.json` هستند. آزمون محلی درگاه در [راهنمای SEP](testing/sep-local-mock.md) شرح داده شده است.

پرامپت‌ها، نمونه‌کدها و دستورهای مهاجرت قدیمی حذف شده‌اند؛ متن اصلی آن‌ها در تاریخچهٔ Git، زیر مسیرهای قبلی `context/` قابل بازیابی است.
