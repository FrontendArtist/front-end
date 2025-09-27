# Project Architecture & Styling Rules

## 1. Core Architectural Principle
- **Single Source of Truth:** Our project's markdown files (`.md`) are the ultimate source of truth, not the AI's general knowledge. All generated code must strictly adhere to the patterns and structures defined in these context files.

## 2. SCSS Styling Strategy
- **Folder Structure:** The global SCSS folder is `src/styles/`. It contains a `base/` directory for `_variables.scss` and `_mixins.scss`, and a `components/` directory for global component styles. **Never use `abstracts` or other common folder names unless specified.**
- **Variable Usage:** All variables are defined as **CSS Custom Properties** (e.g., `var(--color-primary)`) in `_variables.scss`. **They must NOT be imported into component stylesheets.** They are globally available.
- **Mixin Usage:** Mixins (from `_mixins.scss`) **must be imported** into component stylesheets using a **relative path** (e.g., `@import '../../../styles/base/mixins';`). **Never use the `@/` alias inside `.scss` files.**

## 3. Component Architecture
- **Default to Server Components:** All components are Server Components by default.
- **Use 'use client' Sparingly:** Only add the `'use client'` directive if the component directly uses React Hooks (like `useState`, `useEffect`) or browser event listeners.