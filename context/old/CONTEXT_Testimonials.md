# CONTEXT_Testimonials.md ✅ COMPLETED

## 🎯 Purpose
جایگزینی Mock Data در بخش Testimonials با داده‌های واقعی Strapi.

---

### 📂 File Structure
- /src/modules/home/TestimonialsSection/TestimonialsSection.jsx  
- /src/lib/testimonialsApi.js

---

### ⚙️ Component Type
`server` — داده در سطح سرور فچ می‌شود.

---

### 🌐 Data Source
- Endpoint: `/testimonials?populate=*`
- Fields: id, name, title, comment, createdAt

---

### 🧩 Dependencies
- apiClient.js (موجود)

---

### 🧠 State Logic
بدون state داخلی. داده به عنوان prop به `TestimonialsSection` پاس داده می‌شود.

---

### 🧾 Cursor Prompt
```js
// Refactor TestimonialsSection based on @CONTEXT_Testimonials.md
