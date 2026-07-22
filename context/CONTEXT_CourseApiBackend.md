# CONTEXT_CourseApiBackend.md

## 🎯 Purpose
به‌روزرسانی لایه API در Next.js (`src/lib/coursesApi.js`) برای واکشی عمیق (Deep Populate) داده‌های دوره شامل `isChaptered`، `chapters` و `lessons` از Strapi v5 جهت تغذیه کامپوننت `CourseContentManager.jsx`.

---

### 📂 File Structure
- /src/lib/coursesApi.js
- /src/types/course.ts (در صورت وجود)

---

### ⚙️ Component Type
`lib / helper` (توابع واکشی داده سمت سرور/کلاینت)

---

### 🌐 Data Source & Strapi v5 Query Structure
- Endpoint: `/api/courses`
- Params برای Strapi v5:
  ```json
  {
    "populate": {
      "chapters": {
        "populate": {
          "lessons": "*"
        }
      },
      "curriculum": "*",
      "image": "*"
    }
  }