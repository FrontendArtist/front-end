# CONTEXT_Product_RouteMigration.md

## هدف
انتقال صفحه جزئیات محصول از مسیر `/products/[slug]` به `/product/[slug]`.

## دلایل فنی
- مسیر `/products` در حال حاضر برای نمایش لیست محصولات استفاده می‌شود.
- برای تفکیک منطقی بین صفحه محصول واحد و صفحه لیست دسته‌ها نیاز است مسیر جداگانه `/product/` تعریف شود.

## الزامات
1. انتقال فایل `page.js` از مسیر:
src/app/products/[slug]/page.js
→ src/app/product/[slug]/page.js

perl
Copy code
هیچ تغییری در محتوای فایل انجام نشود.

2. در `ProductCard.jsx` لینک محصول باید از:
```jsx
<Link href={`/products/${slug}`}>
به:

jsx
Copy code
<Link href={`/product/${slug}`}>
تغییر یابد.

در ProductGrid.jsx یا هر ماژول مشابهی که لینک به محصول دارد، همین اصلاح انجام شود.

اطمینان حاصل شود مسیر /product/[slug] به درستی کار می‌کند و متادیتا (title, desc) همچنان به درستی از SSR استخراج می‌شود.

مسیر /products/[slug] باید حذف یا خالی شود تا برای SPA دسته‌بندی‌ها استفاده گردد.