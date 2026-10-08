# 📗 CONTEXT_RULES_V3.md

> بایگانی: این قواعد مربوط به نسخهٔ اولیه‌اند و الزام فعال برای کار جدید نیستند. [راهنمای اسناد فرانت‌اند](../README.md)، قرارداد اتصال و کد فعلی را مبنا قرار دهید.

## 🎯 Purpose

This document defines the **core architectural, design, and implementation rules** that every component, API, and feature in the project must follow. It ensures that all generated code through Cursor AI remains consistent, modular, and aligned with the project's established structure.

---

## 🧱 Frontend Architecture Rules

### 1. Component Architecture

* **Directory Structure:**

  * All components reside in `src/components/`, organized by domain or purpose (`ui/`, `layout/`, `product/`, `course/`, etc.).
  * Shared layout or section components belong under `src/components/layout/`.
* **Server-First Rendering:**

  * By default, all components are **Server Components**.
  * A component should use `'use client'` **only** if it depends on React Hooks (`useState`, `useEffect`) or DOM events (`onClick`, etc.).
* **Reusability Principle:**

  * Extract repeated logic into **Custom Hooks** under `src/hooks/` or **Utilities** under `src/utils/`.
  * Prefer composition over duplication.

### 2. Styling Rules

* **Styling Method:** SCSS Modules.
* **Design Tokens:** Use **CSS Custom Properties (`--var`)** instead of SCSS `$variables`.
* **Source of Truth:** All color palettes, spacing, typography, and breakpoints are defined in `styles.md` and implemented under `src/styles/`.
* **SCSS File Structure:**

  ```
  styles/
   ├── base/
   ├── components/
   ├── layout/
   ├── mixins/
   ├── variables/
   └── globals.scss
  ```
* **Imports:** Always use `@use` instead of `@import`.
* **Consistency:** Follow BEM naming conventions and avoid inline styles unless absolutely necessary.

### 3. State Management

* **Local State:** Use `useState` for local UI-only logic.
* **Global State:** Use **Zustand** for application-wide state (e.g., auth, cart, UI preferences).
* **Persistence:** When needed, sync Zustand with `localStorage` through a dedicated hook.

### 4. API and Data Handling

* **Centralized API Layer:**

  * All network requests go through `src/lib/api.js` using the base URL defined in `src/lib/apiConfig.js`.
  * Direct use of `fetch` or `axios` inside components is **strictly prohibited**.
* **Response Formatting:**

  * Every API response must be cleaned and formatted through dedicated utility functions inside `src/lib/strapiUtils.js` before reaching UI components.
* **Error Management:**

  * Handle API errors gracefully. Components must not crash; use fallback states and empty UI patterns.

### 5. Security Rules

* **Sanitization:**

  * Any HTML content fetched from Strapi (e.g., articles, descriptions) must be sanitized using **DOMPurify** before rendering.
* **No Dangerous HTML Rendering:**

  * Use `dangerouslySetInnerHTML` **only** when sanitized content is guaranteed safe.

### 6. Layout & Section Components

* **ContentSection Component:**

  * Reusable container for all main sections.
  * Props: `title`, `viewAllLink`, and `children` (dynamic content like sliders or grids).
* **Children Components:**

  * Subcomponents (e.g., `ArticlesSection`, `CoursesSection`) must use `ContentSection` for consistency.

---

## ⚙️ Backend & API Rules

### 1. Strapi Content-Types

* **Naming Convention:** Use **PascalCase** for models (e.g., `Product`, `Article`, `Course`).
* **Mandatory Fields:**

  * `slug` for SEO-friendly URLs.
  * `metaTitle`, `metaDescription` for SEO metadata.
  * `alt` text for all media.
* **Relations:**

  * Define relations explicitly to avoid deep nested fetch chains.

### 2. Data Hygiene

* **Rich Text Handling:**

  * Sanitize all HTML fields before usage.
* **API Response Shape:**

  * Success → `{ data: ... }`
  * Error → `{ error: ... }`

---

## 🧠 Development Best Practices

1. **Context-Aware Coding** → Always refer to existing components or logic before creating new ones.
2. **Clarity Over Cleverness** → Write explicit, readable, and maintainable code.
3. **Consistent Naming** → Follow kebab-case for files, camelCase for functions, PascalCase for components.
4. **No Hardcoding** → Never hardcode API URLs or magic values; use centralized constants.
5. **Code Comments** → Include short comments explaining *why* (not just *what*) a block of code does.
6. **Error Resilience** → Implement fallback UI and try/catch in all async logic.
7. **Testing:**

   * Unit Tests → Jest for utilities and hooks.
   * E2E Tests → Playwright for core user flows (auth, cart, content loading).
8. **Performance Optimization:** Lazy load heavy components and images.
9. **Accessibility (a11y):** Follow semantic HTML, use alt attributes, and maintain keyboard navigation.

---

## 🔍 AI Integration Rules

* AI-generated code must comply with the project’s architecture and styling conventions.
* Each new feature or component must have an associated **CONTEXT_*.md** file describing its purpose and data flow.
* AI must not modify the file/folder structure.
* For each feature prompt, refer to:

  * `CONTEXT_PROJECT_OVERVIEW.md` for scope alignment.
  * `ARCHITECTURE_RULES.md` for implementation guidelines.
  * `styles.md` for visual consistency.

---

## 🧾 Final Notes

* These rules are mandatory for all stages of the project.
* Any architectural or structural changes must be logged in `PROJECT_PROGRESS.md` as an **Architecture Sync Update**.
* Cursor AI should always follow this document before generating, refactoring, or suggesting new code.
