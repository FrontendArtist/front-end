# CONTEXT_Breadcrumbs_Integration.md

## 🎯 Purpose
To implement the standard `Breadcrumb` component across all remaining pages (Services, Courses, About, Contact) to ensure consistent navigation and SEO structure (JSON-LD).

---

## 🛠️ Implementation Scope

### 1. About & Contact Pages
- **Files:** `src/app/about/page.js`, `src/app/contact/page.js`
- **Logic:** Static breadcrumbs.
  - About: `Home > About Us`
  - Contact: `Home > Contact Us`

### 2. Services Module (Refactor)
- **Files:** `src/app/services/page.js`, `src/app/services/[slug]/page.js`
- **Listing:** `Home > Services`
- **Detail:** `Home > Services > [Service Title]`
- **Note:** In `[slug]/page.js`, remove the existing manual inline breadcrumb logic (refactor).

### 3. Courses Module
- **Files:** `src/app/courses/page.js`, `src/app/courses/[slug]/page.js`
- **Listing:** `Home > Courses`
- **Detail:** `Home > Courses > [Course Title]`

---

## 🧩 Component Usage
- **Import:** `import Breadcrumb from '@/components/ui/Breadcrumb';` (Verify exact path).
- **Props:** `items={[{ label: '...', href: '...' }, ...]}`.
- **Placement:** Top of the main container, before the title/hero.