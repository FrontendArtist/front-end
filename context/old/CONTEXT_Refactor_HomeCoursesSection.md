# CONTEXT_Refactor_HomeCoursesSection.md

## 🎯 Purpose
تبدیل CoursesSection در صفحه اصلی از Mock Data به SSR Fetch واقعی از Strapi،  
با همان الگوی استاندارد سایر سکشن‌ها (Server Component Fetch در app/page.js).

---

### 📂 File Structure
- /src/modules/home/CoursesSection/CoursesSection.jsx  
- /src/lib/coursesApi.js  
- /src/app/page.js  

---

### ⚙️ Component Type
`server` — داده در سطح Server Component (app/page.js) فچ شده و به کامپوننت پاس داده می‌شود.

---

### 🌐 Data Source
- Endpoint: `/courses?populate=*`
- API: `getCourses({ limit: 4 })`  
- Fields: id, title, slug, thumbnail, shortDescription, price, duration

---

### 🧩 Dependencies
- `apiClient.js`  
- `coursesApi.js` (در صورت نبود، بساز)  

---

### 🧠 State Logic
هیچ `useEffect` یا `fetch` نباید در کامپوننت باقی بماند.  
داده به‌صورت prop از `page.js` پاس داده می‌شود.  
Fallback در صورت خالی بودن آرایه:  
```jsx
if (!data?.length) return <p>در حال حاضر دوره‌ای در دسترس نیست</p>;
esign Notes

از همان UI فعلی (اسلایدر / کارت‌ها) استفاده شود.

فقط منبع داده تغییر کند.

ساختار SCSS دست‌نخورده بماند.