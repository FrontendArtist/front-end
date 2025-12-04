# CONTEXT_About_Contact.md

## 🎯 Purpose
To implement the static "About Us" page and the functional "Contact Us" page with form submission logic, based on the `nextjs_spec-1.docx`.

---

## ⚙️ Backend Strategy (Strapi)
**New Content Type:** `Message` (for Contact Form)
- **Fields:**
  - `name` (Text, Required)
  - `contactInfo` (Text, Required) - Can be Phone or Email
  - `subject` (Text, Optional)
  - `body` (Rich Text or Long Text, Required)
  - `isRead` (Boolean, Default: false)
- **Permissions:** Public `create` permission is required.

---

## 📂 File Structure
- `src/app/about/page.js` & `.module.scss`
- `src/app/contact/page.js` & `.module.scss`
- `src/modules/about/components/...` (Optional: AboutHero, MissionSection)
- `src/modules/contact/components/ContactForm.jsx`
- `src/lib/contactApi.js` (API Layer for form submission)

---

## 🎨 Design Notes
- **About Page:**
  - Hero Section: Full width, welcoming text.
  - Mission Section: Two-column layout (Text Left / Image Right in RTL).
  - Mentor/Hakim Sections: Card-like or section-based layout with Bio and Image.
- **Contact Page:**
  - **Form:** Glassmorphism style, validation feedback, success toast using `sonner` or existing notification system.
  - **Info Cards:** Grid layout for Social/Phone/Address info.

---

## 🧩 Logic
- **Contact Form:**
  - Uses `react-hook-form` (recommended) or simple state.
  - Submits to `/api/messages` in Strapi via `contactApi.js`.
  - Shows success/error state.