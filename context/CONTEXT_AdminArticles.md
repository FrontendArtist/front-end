# CONTEXT_AdminArticles.md

## 🎯 Purpose
Implement the Admin Articles (Blog) Management section (`/admin/articles`). This includes a list table and a comprehensive create/edit form, matched exactly with the Strapi Article schema, using a professional Rich Text Editor.

---

### 📂 File Structure
- /src/app/admin/articles/page.jsx (Server Component - Fetches List)
- /src/app/admin/articles/new/page.jsx (Page for creating)
- /src/app/admin/articles/[id]/page.jsx (Page for editing)
- /src/components/admin/Articles/ArticlesTable.jsx (Client Component)
- /src/components/admin/Articles/ArticleForm.jsx (Client Component)
- /src/components/admin/Articles/Articles.module.scss

---

### 🌐 Data Source & Exact Fields (Strapi)
- **Collection:** `Article`
- **Fields Used:**
  - `title` (Text)*
  - `slug` (UID)*
  - `excerpt` (Text)
  - `content` (Rich text / HTML)
  - `cover` (Media)
  - `tags` (Relation - manyToMany)
  - `articles_categories` (Relation - manyToMany)
  - `publishedat` (DateTime)

---

### 🧠 Core Logic & Features
1. **List View (`ArticlesTable`):** Displays `cover` thumbnail, `title`, `slug`, `publishedat` (Draft vs Published status), and action buttons (Edit/Delete).
2. **Rich Text Editor:** Use `@tinymce/tinymce-react` inside `ArticleForm` for the `content` field. Configure basic plugins (lists, link, image, table) and a clean toolbar. 
3. **Relations Handling:** Implement multi-select dropdowns for attaching `tags` and `articles_categories`.
4. **Cover Image:** Allow uploading or selecting a cover image, mapping to Strapi's Media library.
5. **Draft & Publish:** Form submits `publishedat: null` for saving as draft, or sets the current timestamp when publishing.

---

### 🎨 Design Notes
- Use BEM methodology in `.module.scss`.
- Ensure the TinyMCE editor matches the dashboard's theme (e.g., width 100%, proper borders).
- Include toast notifications for success/error events.

برای رنگ های از متغیر های فایل variables.css استفاده کن یا .light-theme.css 
