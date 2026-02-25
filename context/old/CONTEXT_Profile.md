# CONTEXT_Profile.md

## 🎯 Purpose
Build the **User Profile Dashboard** (`/profile`).
This section is critical for **Lazy Registration**: Users who logged in via OTP must complete their profile (FirstName, LastName, Address) here.

---

## 📂 File Structure (App Router)
- **Layout:** `src/app/profile/layout.js`
  - Needs to be protected (redirect to home if not logged in).
  - Contains a specific `ProfileSidebar` component.
- **Main Page:** `src/app/profile/page.js`
  - Displays the "Account Details" form (Name, Address, Phone).
- **Orders Page:** `src/app/profile/orders/page.js` (Placeholder for now).

---

## 🧩 Components
1. **ProfileSidebar (`src/components/profile/ProfileSidebar.jsx`):**
   - Links: "اطلاعات حساب" (active), "سفارش‌های من", "خروج".
   - Shows a mini user summary (Avatar + Phone).
   - Glassmorphism style.

2. **ProfileForm (`src/components/profile/ProfileForm.jsx`):**
   - Inputs: FirstName, LastName, City, Full Address (Textarea).
   - Phone Number input should be **Disabled/Read-only** (cannot be changed).
   - **Submit Action:** Calls `PUT /api/users/me` (Strapi) to update details.
   - Should check `session.user.jwt` for authorization.

---

## 🎨 Design Rules
- **Layout:** 2-Column layout on Desktop (Sidebar Left/Right depending on RTL, Content Center).
- **Mobile:** Sidebar becomes a top navigation or collapsible menu.
- **Styling:** Use `styles/modules/Profile.module.scss`.
- **Glassmorphism:** Apply standard project cards with `backdrop-filter`.

## 🔄 Data Logic
1. **Fetch:** On mount, fetch fresh user data from Strapi (`/api/users/me`) using the JWT from the session. Do NOT rely solely on session data as it might be stale.
2. **Update:** Update user data in Strapi and then ideally trigger a session update (optional for now).