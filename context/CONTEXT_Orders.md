# CONTEXT_Orders.md

## 🎯 Purpose
این ماژول وظیفه ثبت سفارش جدید پس از پرداخت موفق، به‌روزرسانی دوره‌های خریداری شده کاربر، پاکسازی سبد خرید و در نهایت نمایش تاریخچه سفارشات کاربر در پنل کاربری (Profile) را بر عهده دارد.

---

### 📂 File Structure
- `src/app/api/orders/route.js` (Proxy API for fetching and creating orders safely)
- `src/app/profile/orders/page.jsx` (Server Component for layout)
- `src/components/profile/OrdersList.jsx` (Client Component for interactive order list)
- `src/components/profile/OrdersList.module.scss` (Styles)
- `src/components/profile/OrderDetailsModal.jsx` (Modal for showing order items)

---

### ⚙️ Component Type
- **`src/app/profile/orders/page.jsx`**: `server` (واکشی اولیه داده‌ها برای سئو و سرعت بهتر در صورت امکان، یا استفاده از کلاینت برای واکشی داینامیک).
- **`OrdersList` & `OrderDetailsModal`**: `use client` (نیاز به مدیریت State برای باز و بسته کردن مودال و نمایش تب‌ها).
- **`route.js`**: `server` (API Route برای مخفی نگه‌داشتن Strapi Admin Token و امنیت داده‌ها).

---

### 🌐 Data Source
- **Endpoints:** - `POST /api/orders` (ایجاد سفارش جدید، اتصال دوره‌ها به کاربر، پاکسازی cartData)
  - `GET /api/orders` (دریافت لیست سفارشات کاربر لاگین شده)
- **Strapi Collections:** `api::order.order`, `plugin::users-permissions.user`
- **Fields used:** `id`, `totalPrice`, `status`, `items` (JSON/Relation), `createdAt`, `address`.

---

### 🧩 Dependencies
- `next-auth/react` (برای دریافت سشن و ID کاربر)
- `zustand` (`useCartStore` برای خالی کردن سبد کلاینت پس از خرید موفق)
- `src/components/ui/Modal.jsx` (برای نمایش جزئیات سفارش)
- `src/components/ui/Notification.jsx` (برای پیام موفقیت)
- `src/lib/api.js` یا `fetch` داخلی برای ارتباط با Proxy.

---

### 🧠 State Logic
- `isModalOpen` (boolean): برای کنترل وضعیت مودال جزئیات سفارش.
- `selectedOrder` (object | null): نگهداری اطلاعات سفارشی که کاربر روی آن کلیک کرده تا در مودال نمایش داده شود.
- `isLoading` (boolean): برای مدیریت وضعیت لودینگ هنگام فچ کردن لیست سفارشات.

---

### 🎨 Design Notes
!important استایل باید دقیقا سازگار با /profile باشه 
- استفاده از کلاس‌های تعریف شده در `styles.md`.
- استفاده از `GradientBorderCard` (که در فاز قبل ساخته شد) برای نمایش هر سفارش در لیست.
- رعایت BEM naming (`.orders`, `.orders__item`, `.orders__status--paid`).
- استفاده از Badgeهای رنگی برای وضعیت سفارش (مثلاً سبز برای `paid`، زرد برای `pending`).