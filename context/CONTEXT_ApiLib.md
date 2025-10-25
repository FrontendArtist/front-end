# CONTEXT_ApiLib.md

## 🎯 Purpose
- To create the primary API abstraction layer (`api.js`) as mandated by `ARCHITECTURE_RULES.md`.
- This module provides simple, named async functions (e.g., `getProducts`, `getArticleBySlug`) for Server Components to consume.
- It uses the low-level `fetchStrapiAPI` function from `strapiUtils.js` to perform the actual requests.
- It encapsulates the complex Strapi v5 query parameter logic (like filters, populate, sort, and pagination) away from the UI components.

---

### 📂 File Structure
- /src/lib/api.js

---

### ⚙️ Component Type
- Utility Module (JavaScript)

---

### 🌐 Data Source
- This module *is* the data source for the rest of the application.
- It imports `fetchStrapiAPI` from `./strapiUtils.js`.

---

### 🧩 Dependencies
- `fetchStrapiAPI` from `./strapiUtils.js`

---

### 🧠 State Logic
- None. This module contains stateless, async functions.

---

### 🎨 Design Notes
- The file will export multiple async functions, one for each common data-fetching need.
- **Strapi v5 Query Syntax:**
  - **Populate:** All functions should default to `populate: '*'` for simplicity in the MVP.
  - **Slug Filter:** To get a single item by slug, the params must be: `params: { 'filters[slug][$eq]': slug, populate: '*' }`.
  - **Sorting:** Listing functions should accept a `sort` parameter (e.g., `sort: 'price:asc'`).
  - **Pagination:** Listing functions should accept `page` and `pageSize` (e.g., `pagination[page]`, `pagination[pageSize]`).
- **Functions to Create:** We will create functions for all major content types identified in `PROJECT_PROGRESS.md` and `nextjs_spec-1.docx`:
  - `getProducts({ sort, page, pageSize })`
  - `getProductBySlug(slug)`
  - `getArticles({ sort, page, pageSize })`
  - `getArticleBySlug(slug)`
  - `getCourses({ sort, page, pageSize })`
  - `getCourseBySlug(slug)`
  - [cite_start]`getServices()` (Services don't have pagination/sort per spec [cite: 187-192])
  - `getServiceBySlug(slug)`
- **Return Value:** Each function must return the `{ data, error }` object it receives from `fetchStrapiAPI`.

---

### 🧾 Cursor Prompt
```js
