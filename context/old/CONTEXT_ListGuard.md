# CONTEXT_ListGuard.md

## 🎯 Purpose
A generic Server Component wrapper that acts as a "Guard" for list views (Products, Articles, Courses, Services). It checks the data array and renders the appropriate UI:
1. The List (Children) if data exists.
2. A "Not Found" EmptyState if data is empty due to filters.
3. A "No Content" EmptyState if the database is absolutely empty.

---

### 📂 File Structure
- `src/components/layout/ListGuard.jsx`

---

### ⚙️ Component Type
`Server Component` (No hooks, pure conditional rendering).

---

### 🧩 Props Interface
| Prop Name | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `data` | `Array` | Yes | The data array to check (e.g., products, articles). |
| `hasFilters` | `Boolean` | Yes | True if user has active search/sort params. |
| `children` | `ReactNode` | Yes | The grid/list component to render on success. |
| `entityName` | `String` | No | Name of the entity for default messages (e.g., "محصول", "مقاله"). Default: "مورد". |
| `resetLink` | `String` | No | URL for the "Clear Filters" action. Default: current path base or '/'. |

---

### 🧠 Logic Flow
1. **Check Data:** If `data.length > 0` → Return `children`.
2. **Check Filters:**
   - **IF `hasFilters` is TRUE:**
     - Render `<EmptyState />`
     - Title: "نتیجه‌ای یافت نشد"
     - Desc: "با توجه به فیلترهای انتخاب شده، [entityName]ی یافت نشد."
     - Action: "مشاهده همه" (Links to `resetLink`).
   - **ELSE (No Filters, just empty DB):**
     - Render `<EmptyState />`
     - Title: "هنوز [entityName]ی ثبت نشده است"
     - Desc: "محتوای این بخش به زودی تکمیل خواهد شد."
     - Action: "بازگشت به صفحه اصلی" (Links to `/`).

---

### 🧩 Dependencies
- `@/components/ui/EmptyState/EmptyState`