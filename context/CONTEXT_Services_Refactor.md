# CONTEXT_Services_Refactor.md

## 🎯 Purpose
To refactor the `Services` module to align with the project's architecture standards, specifically regarding Breadcrumbs, Empty States, and Error Handling. This will eliminate technical debt and enforce consistency with Products/Articles sections.

---

## 🛠️ Refactoring Targets

### 1. Service Detail Page (`src/app/services/[slug]/page.js`)
**Current State:**
- Uses inline HTML/CSS for breadcrumbs.
- Returns a custom "Empty State" UI when a service is not found.
- `page.module.scss` is bloated with unused styles for these elements.

**Target State:**
- **Breadcrumb:** Use the shared `@/components/layout/Breadcrumbs` component.
- **Error Handling:** Use Next.js standard `notFound()` function if service is null.
- **Styles:** Remove all CSS related to `.breadcrumbs` and `.emptyState` from the module SCSS.

### 2. Service Grid (`src/modules/services/ServiceGrid.jsx`)
**Current State:**
- Manually checks `if (!services.length)` to render a hardcoded empty message.

**Target State:**
- **Wrapper:** Wrap the grid in the shared `<ListGuard>` component.
- **Props:** Pass `entityName="خدمت"` and `resetLink="/services"` to ListGuard.
- **Cleanup:** Remove the manual length check and the associated JSX/CSS.

---

## 📂 File Structure Changes
- **Modify:** `src/app/services/[slug]/page.js`
- **Modify:** `src/app/services/[slug]/page.module.scss`
- **Modify:** `src/modules/services/ServiceGrid.jsx`

---

## 🧩 Logic & Imports
- **Import:** `import Breadcrumb from '@/components/layout/Breadcrumbs';`
- **Import:** `import { notFound } from 'next/navigation';`
- **Import:** `import ListGuard from '@/components/layout/ListGuard';`

---

## 🧾 Cursor Prompt Strategy
The refactor should be done in two steps to ensure safety:
1. Refactor the Grid (ServiceGrid).
2. Refactor the Page ([slug]/page.js) and clean up SCSS.