# CONTEXT_CartSync.md

## 🎯 Purpose
همگام‌سازی سبد خرید (Zustand) با دیتابیس (Strapi) از طریق API Proxy در Next.js.

## ⚙️ Logic Flow
1. **Sync to DB:** هر بار که سبد خرید در کلاینت تغییر کرد، اگر کاربر لاگین بود، دیتای جدید به `/api/profile` ارسال شود.
2. **Hydrate from DB:** در لحظه لاگین، اگر سبد خرید کلاینت خالی بود، دیتای `cartData` از دیتابیس واکشی و در Zustand بارگذاری شود.

## 🌐 API Endpoint
- **Next.js:** `PUT /api/profile`
- [cite_start]**Strapi:** `PUT /api/users/[id]` (توسط سرور با API Token فراخوانی می‌شود). [cite: 519]

## 🧩 Variables
- [cite_start]`cartData`: فیلد JSON در مدل User (Strapi). [cite: 402]