# CONTEXT_ProductPage.md

## 🎯 Purpose
ارتقای صفحه تکی محصول (`app/products/[slug]/page.js`) به یک لندینگ‌پیج فروشگاهی با نرخ تبدیل بالا (High Conversion) و سئوی قدرتمند (Rich Snippets).

---

### 📂 File Structure
- `app/products/[slug]/page.js` (فایل اصلی صفحه محصول)
- `app/products/[slug]/page.module.scss` (استایل‌های صفحه)
- `src/modules/products/ProductSpecs.jsx` (کامپوننت جدید برای جدول مشخصات)
- `src/modules/products/RelatedProducts.jsx` (کامپوننت جدید برای محصولات مرتبط)

---

### ⚙️ Component Type
تمام کامپوننت‌ها به صورت پیش‌فرض `Server Component` هستند، مگر بخش‌هایی که نیاز به تعامل کلاینت دارند (مانند اسلایدر).

---

### 🌐 Data Source & APIs
- **Product Data:** دریافت اطلاعات از `getProductBySlug(slug)`
- **Related Products:** دریافت محصولات مرتبط از `getRelatedProducts(currentId, categoryId)` در `productsApi.js`

---

### 🧩 Dependencies
- `marked` (برای تبدیل مارک‌داون به HTML)
- `ArticleReader` (برای رندر محتوای عمیق و ریچ‌تکست)
- `BaseSlider` و `ProductCard` (برای محصولات مرتبط)
- `JSON-LD` (اسکیمای سئو به صورت تگ اسکریپت)

---

### 🧠 Logic & Rules

۱. **SEO & JSON-LD:**
   - تولید اسکیما از نوع `@type: "Product"`.
   - شامل فیلدهای `name`, `image`, `description`.
   - بخش `offers` شامل قیمت (`price`)، واحد پول (`priceCurrency: "IRR"`) و موجودی (`availability`).

۲. **باکس اطلاعات اصلی (Hero Section & Stock FOMO):**
   - رندر `shortDescription` زیر عنوان محصول.
   - **منطق موجودی (FOMO):**
     - `stock > 10`: پیام "موجود در انبار" (رنگ سبز/عادی)
     - `0 < stock <= 10`: پیام "تنها {stock} عدد در انبار باقیست" (رنگ قرمز/هشدار برای ایجاد حس فوریت)
     - `stock === 0`: پیام "ناموجود" (رنگ خاکستری/غیرفعال)

۳. **محتوای عمیق محصول (Rich Text):**
   - متن `content` محصول باید با `marked.parse()` تبدیل به HTML شده و به کامپوننت `<ArticleReader content={parsedContent} />` پاس داده شود تا جدول محتوا و استایل‌های خوانا اعمال شود.

۴. **جدول مشخصات فنی (`ProductSpecs`):**
   - دریافت آرایه‌ای از ویژگی‌ها (`specifications`) به شکل `[{ id, key, value }]`.
   - رندر در یک جدول تمیز HTML (رنگ‌های یکی‌درمیان / Zebra Striped).
   - اگر آرایه خالی بود، کاملاً null برگرداند.

۵. **محصولات مرتبط (`RelatedProducts`):**
   - واکشی محصولاتی که هم‌دسته هستند.
   - فیلتر کردن محصول فعلی از لیست.
   - رندر در `BaseSlider` با عنوان "محصولات مرتبط".