# CONTEXT_AdminLayout.md

## 🎯 Purpose
This context defines the structural layout for the Admin Dashboard and handles role-based route protection. Access is restricted to `administrator`.

---

### 📂 File Structure
- /src/app/admin/layout.jsx
- /src/components/admin/Sidebar/AdminSidebar.jsx
- /src/components/admin/Sidebar/AdminSidebar.module.scss

---

### ⚙️ Component Type
- `layout.jsx`: `server` (Server component to check session/role security).
- `AdminSidebar`: `use client` (Interactive sidebar).

---

### 🌐 Data Source
- NextAuth Session.

---

### 🧩 Dependencies
- `next-auth/next` (for `getServerSession`)
- `next/navigation` (`redirect`)
- `lucide-react` (for icons)

---

### 🧠 Authorization Logic
- In `layout.jsx`, check `session?.user?.role?.type === 'administrator'`.
- If invalid, `redirect('/')`.

---

### 🎨 Design Notes
- Admin sidebar: 250px width, sticky, dark/neutral theme consistent with `styles.md`.
- Active link styling based on `usePathname()`.

---

### 🧾 Cursor Prompt
// Create the admin layout in `src/app/admin/layout.jsx` that wraps the content in a dashboard wrapper.
// Also create the `AdminSidebar` component in `src/components/admin/Sidebar/`.
// The `layout.jsx` must check if `session.user.role?.type === 'administrator'`. If not, redirect to `/`.
// Include professional comments explaining the access control logic.