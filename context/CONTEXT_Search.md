# CONTEXT_Search.md (نسخه V2: تقویت شده برای رفع باگ و UX جدید)

## 🎯 Purpose
This feature implements a robust, two-part global search module: an interactive, site-wide **Search Overlay** (triggered from the Navbar) and a dedicated, SEO-optimized **Search Results Page** (`/search`). This revision strictly enforces styling rules, ensures correct file imports, and utilizes `clsx` for conditional styling.

---

### 📂 File Structure
- **Global UI (Overlay/Trigger):**
  - `/src/components/layout/SearchTrigger.jsx` (The Search button placed in the Navbar - Client)
  - `/src/components/ui/SearchOverlay/SearchOverlay.jsx` (The full-screen modal/overlay input - Client)
  - `/src/components/ui/SearchOverlay/SearchOverlay.module.scss`
- **Page Module:**
  - `/src/app/search/page.js` (Server Component - Main Entry)
  - `/src/modules/search/SearchResults.jsx` (Client Component - Tabs/Grid Logic)
  - `/src/modules/search/SearchResults.module.scss`
- **API Logic:**
  - `/src/lib/searchApi.js` (Unified parallel fetch logic)

---

### ⚙️ Component Type
1.  **`SearchOverlay.jsx`**: `use client` - Handles UI state (`isOpen`), input, and keyboard events (e.g., `Escape` key to close).
2.  **`page.js` (Search Page)**: `server` - Reads `searchParams.q` and performs the data fetch.

---

### 🌐 Data Source
- **Endpoints:** All endpoints **MUST** include `populate` for images/covers.
  - `/api/products?filters[title][$containsi]={q}&populate=images`
  - `/api/articles?filters[title][$containsi]={q}&populate=cover`
  - `/api/courses?filters[title][$containsi]={q}&populate=image`
- **Logic:** `searchApi.js` **MUST** execute `Promise.all` for performance.

---

### 🧩 Dependencies (قوانین سخت‌گیرانه Import)
- `clsx`: **REQUIRED** for combining SCSS module classes conditionally.
- **Styling Consistency:** All `.module.scss` files **MUST** include `@import '@/styles/base/mixins';` to access `respond`.
- **Breadcrumbs:** `page.js` **MUST** import the Breadcrumbs component using the **EXACT** casing of the file system (e.g., `import Breadcrumbs from '@/components/layout/Breadcrumbs';` یا `import { Breadcrumb } from '@/components/ui/BreadCrumb/BreadCrumb';`) و از مسیر صحیح استفاده کند. (لطفاً از مسیر **`@/components/ui/BreadCrumb/BreadCrumb`** استفاده کند تا مطابق گفته شما باشد).

---

### 🧠 State Logic
1.  **Input State:** Local state in `SearchOverlay` برای مدیریت متنی که کاربر تایپ می‌کند.
2.  **Overlay State:** Local state in `SearchOverlay` برای مدیریت باز و بسته بودن پنجره.
3.  **Navigation:** هنگام ثبت نهایی، `SearchOverlay` باید با `router.push('/search?q=...')` به صفحه نتایج هدایت کند.

---

### 🎨 Design Notes (Focus on Precision)
- **SearchOverlay:** Full fixed position, semi-transparent background (backdrop), and input should be large and centered for focus.
- **SCSS Mixins:** The `SearchResults.module.scss` grid **MUST** use the **CORRECT** syntax for media queries: `@include respond(md) { ... }` (This prevents the previous "Undefined mixin" error).
- **Tab/Grid:** Use `clsx` for managing the `.active` class on tabs in `SearchResults.jsx`.

---
