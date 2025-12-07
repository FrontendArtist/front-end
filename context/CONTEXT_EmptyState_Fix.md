# CONTEXT_EmptyState_Fix.md

## 🎯 Purpose
To improve the Empty State UX for Article and Product grids. When a category filter yields no results:
1. The **Category Filter** must remain visible (handled by parent).
2. The **Sort Controls** must be hidden.
3. The **Grid Items** must be hidden.
4. A dedicated **EmptyState** component should be displayed in their place.

---

## 🛠️ Changes Required

### 1. `src/modules/articles/ArticleGrid/ArticleGrid.jsx`
- Import `EmptyState` from `@/components/ui/EmptyState/EmptyState`.
- Logic:
  ```jsx
  if (!isLoading && articles.length === 0) {
    return <EmptyState title="هیچ مقاله‌ای یافت نشد" description="برای این دسته‌بندی مقاله‌ای ثبت نشده است." />;
  }
  // Standard return (Sort + Grid)
2. src/modules/products/ProductGrid/ProductGrid.jsx
Import EmptyState from @/components/ui/EmptyState/EmptyState.

Logic:

JavaScript

if (!isLoading && products.length === 0) {
  return <EmptyState title="هیچ محصولی یافت نشد" description="برای این دسته‌بندی محصولی ثبت نشده است." />;
}
// Standard return (Sort + Grid)
🎨 UI/UX Notes
Do NOT include a "Back" button or redirect action (as per user request "بازگشت و ... هم نداره").

Just the message and icon.