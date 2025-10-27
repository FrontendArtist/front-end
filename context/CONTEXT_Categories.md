
---

## 🔵 ۳. فایل: `CONTEXT_Categories.md`

```md
# CONTEXT_Categories.md

## 🎯 Purpose
جایگزینی Mock Categories با داده‌های واقعی Strapi برای نمایش در صفحه اصلی.

---

### 📂 File Structure
- /src/modules/home/ProductCategories/ProductCategories.jsx  
- /src/lib/categoriesApi.js

---

### ⚙️ Component Type
`server` — SSR data fetching.

---

### 🌐 Data Source
- Endpoint: `/categories?populate=*`
- Fields: id, text, slug, createdAt

---

### 🧩 Dependencies
- apiClient.js  
- ساختار خروجی باید به‌صورت `props.data` به کامپوننت پاس داده شود.

---

### 🧾 Cursor Prompt
```js
// Refactor ProductCategories based on @CONTEXT_Categories.md
