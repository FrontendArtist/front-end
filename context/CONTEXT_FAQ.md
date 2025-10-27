
---

## ✅ ۲. فایل: `CONTEXT_FAQ.md` — COMPLETED

```md
# CONTEXT_FAQ.md

## 🎯 Purpose
حذف Mock FAQ و اتصال مستقیم به داده‌های واقعی Strapi — ✅ **COMPLETED**

---

### 📂 File Structure
- /src/modules/home/FAQSection/FAQSection.jsx  
- /src/lib/faqApi.js

---

### ⚙️ Component Type
`server` — داده‌ها در سرور فچ می‌شوند (بدون client hook).

---

### 🌐 Data Source
- Endpoint: `/faqs?populate=*`
- Fields: id, question, answer

/api/faqs example for fetch 

[
  {
    "id": 23,
    "documentId": "xiouagci5lm4k58i5mc5pnsb",
    "No": 1,
    "question": "از کجا شروع کنم؟",
    "answer": "پاسخ سوال اول در اینجا قرار می‌گیرد. این متن توضیح می‌دهد که کاربر برای شروع مسیر خود باید چه اقداماتی را انجام دهد."
  },...
]

---

### 🧩 Dependencies
- apiClient.js  
- استفاده از Promise.all در `page.js` برای فچ همزمان با سایر داده‌ها.

---

### 🧾 Cursor Prompt
```js
// Refactor FAQSection based on @CONTEXT_FAQ.md
