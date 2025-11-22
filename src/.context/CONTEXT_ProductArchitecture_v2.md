# CONTEXT_ProductArchitecture_v2.md

## 🎯 Purpose
To migrate the product system from a flat URL structure to a fully nested, SEO-friendly architecture using Next.js 15 Server Components.

## 🌐 URL Structure (Canonical)
1. **Root:** `/products` (All products)
2. **Category:** `/products/[category]` (Filtered by category + children)
3. **Subcategory:** `/products/[category]/[subcategory]` (Filtered by specific sub)
4. **Product:** `/products/[category]/[subcategory]/[slug]` (Canonical Product Page)
5. **Legacy Redirect:** `/product/[slug]` → Redirects to #4 via API lookup.

## 🧱 Component Architecture

### 1. Server Layout & Pages
* **`app/products/page.js`**: Root listing.
* **`app/products/[category]/page.js`**: Category listing. Reuses logic but passes `params.category`.
* **`app/products/[category]/[subcategory]/page.js`**: Subcategory listing. Passes `params.category` & `params.subcategory`.
* **`app/products/[category]/[subcategory]/[slug]/page.js`**: New Single Product Page.

### 2. Client Components (`ProductsPageClient.jsx`)
* **Responsibility:** Handles Sorting, Pagination (Load More), and "Active State" visualization.
* **Navigation:** Clicking a category MUST navigate to the new URL path (hard navigation or Next.js Link), NOT just update state.
* **State:** Syncs with URL params.

### 3. Breadcrumb Strategy (Smart Logic)
* **Listing Pages:** Purely hierarchy-based (Home > Category > Sub).
* **Product Page:** * *Scenario A (Direct Hit):* Uses Canonical path (Home > PrimaryCat > PrimarySub > Product).
    * *Scenario B (Navigated):* If `document.referrer` or internal history suggests a different valid path, honor that path visually (optional advanced feature), otherwise default to Canonical.

## ⚙️ API Layer Changes (`lib/productsApi.js`)

### `getProductCanonicalPath(slug)`
* **Logic:** Fetches product categories.
* **Priority:** 1. Finds explicit `primary` category (if field exists).
    2. OR finds first category that has a parent.
    3. OR falls back to first category available.
* **Returns:** `{ category, subcategory, slug }` for redirect construction.

### `getProductsPaginated(page, pageSize, sort, filters)`
* **Refactor:** Ensure `filters` object clearly accepts `categorySlug` and `subCategorySlug` distinct from SearchParams.

## 🛠️ Implementation Steps (Cursor Prompts)

### Step 1: API Refactor
"Refactor `src/lib/productsApi.js` to support deep filtering and canonical path resolution based on @CONTEXT_ProductArchitecture_v2.md."

### Step 2: Client Logic
"Refactor `ProductsPageClient` to support URL-based navigation (nested routes) instead of query-param filtering."

### Step 3: Page Structure
"Create the nested folder structure in `app/products/...` implementing Server Components that await params and fetch data."

### Step 4: Single Page & Redirects
"Move logic from `app/product/[slug]` to the new nested route and turn the old route into a permanent redirector."