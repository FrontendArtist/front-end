# 🎨 styles.md (نسخه V3)

> بایگانی: نمونه‌های مقدار و ساختار این سند مرجع استایل فعلی نیستند. مسیرهای فعال در [راهنمای اسناد فرانت‌اند](../README.md) آمده‌اند.

این سند نسخه‌ی ارتقایافته‌ی سیستم طراحی پروژه است و شامل دو بخش اصلی است:
1. **Technical Layer** – برای درک معماری SCSS و تعامل با Cursor.
2. **Design Layer** – برای حفظ توکن‌های رنگ، تایپوگرافی، spacing و فلسفه‌ی طراحی.

تمام ساختارها، mixinها و متغیرهای نسخه‌ی قبل حفظ شده‌اند و فقط بخش‌های جدید برای وضوح، مقیاس‌پذیری و تعامل بهتر با سیستم هوشمند اضافه شده‌اند.

---

## 🧱 بخش اول: Technical Layer (معماری فنی SCSS)

### 📁 ساختار کلی پوشه‌ها
```
/styles
  ├── base/        # متغیرها، میکسین‌ها و تایپوگرافی پایه
  ├── components/  # استایل کامپوننت‌های عمومی (cards, containers, sections, overlays)
  ├── mixins/      # منطق‌های قابل استفاده مجدد (media queries, layout helpers)
  ├── utils/       # توابع کمکی و ابزارهای عمومی
  ├── main.scss    # نقطه ورودی اصلی برای import همه فایل‌ها
```

### 🧩 منطق اجرایی SCSS
- **توکن‌های سراسری** در `base/_variables.scss` تعریف می‌شوند.
- **Mixinها** در `base/_mixins.scss` نگهداری می‌شوند و فقط در صورت نیاز درون کامپوننت‌ها import می‌شوند.
- **کامپوننت‌ها** در فایل‌های `.module.scss` مجزا تعریف می‌شوند تا با Next.js App Router سازگار باشند.
- تمام مسیرها باید **نسبی** باشند تا در هنگام build روی Liara بدون ارور کامپایل شوند.

### 🧱 اصول تعامل با Cursor
- Cursor باید از ساختار ماژولار پیروی کند: هر فایل `.module.scss` فقط استایل همان کامپوننت را در بر بگیرد.
- در هنگام تولید Context برای فیچرهای جدید، نام‌گذاری کلاس‌ها باید به‌صورت BEM انجام شود.
- تمام متغیرها باید از `var(--token)` استفاده کنند تا به Custom Properties جهانی متصل باشند.

### 🪶 الگوی نام‌گذاری BEM
```scss
.card { }
.card__title { }
.card--highlighted { }
```

### 🧠 بهبودهای نسخه V3
- اضافه شدن مسیر `/utils` برای نگهداری SCSS Functionها (مثل color-opacity, rem-calc).
- افزودن بخش “Cursor Integration Rules” برای تولید Context دقیق.
- بهینه‌سازی Mixins برای خوانایی و عملکرد بهتر در Viewportهای کوچک‌تر.

---

## 🎨 بخش دوم: Design Layer (توکن‌های طراحی و فلسفه بصری)

### 🎨 پالت رنگ‌ها (Color Tokens)
```scss
:root {
  --color-bg-primary: #061818;
  --color-text-primary: #F6D982;
  --color-title-hover: #F5C452;
  --color-card-text: #FFFAEA;
  --color-overlay: #002B20;

  --gradient-card-vertical: linear-gradient(to bottom, rgba(217, 217, 217, 0.3), rgba(115, 115, 115, 0.3));
  --gradient-card-horizontal-ltr: linear-gradient(to right, rgba(217, 217, 217, 0.3), rgba(115, 115, 115, 0.3));
  --gradient-card-horizontal-rtl: linear-gradient(to left, rgba(217, 217, 217, 0.3), rgba(115, 115, 115, 0.3));
}
```

### 🅰️ تایپوگرافی
```scss
--font-sm: 14px;
--font-md: 16px;
--font-lg: 20px;
--font-xl: 32px;
--line-height-sm: 1.4;
--line-height-md: 1.6;
--line-height-lg: 1.8;
--font-weight-regular: 400;
--font-weight-medium: 500;
--font-weight-bold: 700;
```

### 📏 Spacing
```scss
--space-section-top-desktop: 120px;
--space-section-bottom-desktop: 100px;
--space-title-content-desktop: 56px;
--space-gap-desktop: 48px;
--space-image-title-desktop: 32px;
--space-title-text-desktop: 24px;
--space-text-button-desktop: 24px;
--space-container-x-desktop: 80px;
--space-section-button-desktop: 40px;
```

### 🧩 Mixins بهینه‌سازی‌شده
```scss
@mixin respond($breakpoint) {
  @if $breakpoint == xl { @media (max-width: 1280px) { @content; } }
  @if $breakpoint == lg { @media (max-width: 960px) { @content; } }
  @if $breakpoint == md { @media (max-width: 768px) { @content; } }
  @if $breakpoint == sm { @media (max-width: 440px) { @content; } }
}

@mixin card-container {
  padding: 24px;
  border-radius: 16px;
  transition: all 0.3s ease-in-out;
  @include respond(md) { padding: 16px; }
}
```

### 🧬 فلسفه طراحی (Design Philosophy)
- **رویکرد:** مینیمال، خوانا و نورمحور.
- **اصل:** هر کامپوننت باید حس سادگی و انسجام ایجاد کند.
- **هدف:** تمرکز کاربر بر محتوا و تعامل طبیعی با رابط.
- **دسترسی‌پذیری:** رنگ‌ها باید نسبت کنتراست 4.5:1 را رعایت کنند.

### 📚 تعامل با Layoutهای پروژه
- هر صفحه از فایل `globals.scss` برای ساختار عمومی (Container، Section) استفاده می‌کند.
- فایل‌های Components فقط استایل‌های ماژولار خود را در بر دارند.
- در فاز Production، build SCSS باید سبک (minified) و بدون تداخل بین ماژول‌ها باشد.

---

## 🧾 تغییرات نسخه V3
**تغییرات:** اضافه شدن لایه utils، دستورالعمل‌های Cursor، بهینه‌سازی Mixins و ساختار Context-aware.  
**قبلی:** ساختار فنی بدون لایه مجزا برای Cursor و utils.  
**جدید:** دو‌لایه (Technical + Design)، هماهنگ با Liara و Next.js 15 App Router.  
**چرا این تغییرات ایجاد شد:** برای بهبود هماهنگی بین طراحی و معماری SCSS، افزایش قابلیت توسعه و کاهش وابستگی به importهای دستی.

