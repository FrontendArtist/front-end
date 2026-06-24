# CONTEXT_AdminProducts.md

## 🎯 Purpose
Implement the Admin Products Management section. This includes a product list table (`/admin/products`) with quick toggles, filters, and a dedicated multi-tab create/edit form page (`/admin/products/new` & `/admin/products/[id]`).

---

### 📂 File Structure
- /src/app/admin/products/page.jsx (List Page)
- /src/app/admin/products/new/page.jsx (Create Page)
- /src/app/admin/products/[id]/page.jsx (Edit Page)
- /src/components/admin/Products/ProductsTable.jsx
- /src/components/admin/Products/ProductForm.jsx
- /src/components/admin/Products/Products.module.scss

---

### ⚙️ Component Type & Schema Specs
- Matches Strapi model `api::product.product`.
- Key fields: `title`, `slug`, `price`, `stock`, `isAvailable`, `description` (Blocks), `images` (Media array, required), `categories` (Relation), `tags` (Relation).
- Supports Draft and Publish actions (`publishedAt` handling).

---

### 🧠 Core Logic & Actions

1. **Products Table:**
   - Displays: First item of `images` as thumbnail, `title`, `price` (formatted in Tomans/Rials), `stock`, and `isAvailable` badge.
   - Quick Update: Switching the `isAvailable` toggle immediately triggers a `PUT /api/products/:id` update.
   - Delete action with confirmation.

2. **Product Form (Create/Edit):**
   - Automatically pre-fills data if `id` is provided (Edit mode).
   - Multi-image upload field that syncs with Strapi Media API.
   - Dynamic Multi-select for `categories` and `tags` (Fetches available ones on load).
   - Form Submission handles both Draft (`publishedAt: null`) and Publish (`publishedAt: new Date()`).

---

### 🎨 Design Notes
- Clean dashboard interface adhering to `styles.md` design tokens.
- Tables should be fully responsive.
- Toggle switches should have clear animations.
برای رنگ های از متغیر های فایل variables.css استفاده کن یا .light-theme.css 

---

### 🧾 Cursor Prompt
// Build the Admin Products system based on @CONTEXT_AdminProducts.md and the project's Strapi schema.
// 1. Create the `ProductsTable` component with search, pagination, and an instant toggle feature for `isAvailable`.
// 2. Create the `ProductForm` component supporting multi-image upload, relation mapping (categories/tags), and separate "Save Draft" / "Publish" actions.
// Ensure the UI strictly uses the existing BEM SCSS standards and provides clear toast notifications for success/error events.