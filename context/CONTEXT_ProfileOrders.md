# CONTEXT_ProfileOrders.md

## 🎯 Target & Objective
پیاده‌سازی کامل صفحه تاریخچه سفارشات کاربر در مسیر `/profile/orders` و یکپارچه‌سازی آن با دیتابیس از طریق روت پروکسی `/api/orders`.

---

## 📂 Structural Scope
- `src/app/profile/orders/page.jsx` -> کامپوننت سرور/صفحه اصلی سفارشات
- `src/components/profile/OrdersList.jsx` -> کامپوننت کلاینت برای رندر لیست سفارشات
- `src/components/profile/OrdersList.module.scss` -> استایل ماژولار ساس به روش BEM
- `src/components/profile/OrderDetailsModal.jsx` -> مودال نمایش دوره‌های موجود در فاکتور سفارش

---

## ⚙️ Architectural Decisions
- **Data Architecture (Strapi v5):** سفارشات از مسیر `/api/orders` فچ می‌شوند. آرایه پاسخ شامل شیء `data` است که هر سفارش درون خود ریلیشن `courses` (شامل عنوان، قیمت و اطلاعات دوره) را دارد.
- **Defensive Rendering:** از ریختن به‌هم ظاهر کامپوننت در صورت نبود داده یا عدم لود تصویر دوره، با آپشنال چاینینگ (`?.`) جلوگیری شود.

---

## 🧠 Core State Logic
- `orders` (Array): لیست آرایه سفارشات کاربر از دیتابیس.
- `activeOrder` (Object | null): فاکتوری که کاربر برای دیدن جزئیات روی آن کلیک کرده است.
- `isLoading` (Boolean): کنترل وضعیت بارگذاری و لودینگ چشمی کامپوننت.