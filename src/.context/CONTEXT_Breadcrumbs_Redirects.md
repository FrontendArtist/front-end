# CONTEXT_Breadcrumbs_Redirects.md

## 🎯 Goals
1.  **UX Navigation:** Provide clear path visualization (Home > Category > Sub > Product).
2.  **SEO Retention:** Redirect old traffic (`/product/:slug`) to new canonical URLs (`/products/:cat/:sub/:slug`) to preserve page rank.
3.  **Rich Snippets:** Implement `application/ld+json` BreadcrumbList schema for Google.

## 🍞 Component: `<Breadcrumb />`
* **Type:** Client Component (UI) but receives data from Server Pages.
* **Props:** `items` array: `[{ label: string, href?: string, active?: boolean }]`.
* **Visuals:** Simple row, separated by `/` or icon. Last item is text-only (active).
* **Schema:** Must render a hidden `<script type="application/ld+json">` with `BreadcrumbList` structure.

## 🔀 Redirect Logic (Old Route)
* **File:** `src/app/product/[slug]/page.js` (Legacy).
* **Behavior:**
    1.  Fetch product by slug.
    2.  Calculate canonical path using `productsApi.getProductCategoryPath(slug)`.
    3.  Execute `permanentRedirect` (301) to the new URL.
    4.  If product not found, show 404.

## 📍 Integration Points
* **All Product Pages:**
    * `/products/page.js` -> items: [Home, Products]
    * `/products/[category]/page.js` -> items: [..., Category]
    * `/products/[category]/[subcategory]/page.js` -> items: [..., Category, Sub]
    * `/products/[category]/[subcategory]/[slug]/page.js` -> items: [..., Category, Sub, ProductTitle]