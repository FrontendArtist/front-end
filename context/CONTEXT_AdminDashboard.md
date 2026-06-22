# CONTEXT_AdminDashboard.md

## 🎯 Purpose
This context implements the main Admin Dashboard view (`src/app/admin/page.jsx`). It displays key performance metrics (Total Sales, Total Orders, and Total Users) by fetching aggregated data from Strapi.

---

### 📂 File Structure
- /src/app/admin/page.jsx
- /src/components/admin/StatsCard/StatsCard.jsx
- /src/components/admin/StatsCard/StatsCard.module.scss

---

### ⚙️ Component Type
- `page.jsx`: `server` (Fetches data server-side using the admin session's JWT token).
- `StatsCard.jsx`: `server` (Presentational component for rendering individual metrics).

---

### 🌐 Data Source
- Strapi endpoints needed (or standard plural endpoints with `count` handling):
  - `/api/orders` (To calculate total revenue and count)
  - `/api/users` (To get total registered users count)
- Pass `Authorization: Bearer {session.user.jwt}` in headers.

---

### 🎨 Design Notes
- Layout: A responsive grid layout (3 columns on desktop, 1 column on mobile).
- Colors & Borders: Follow the typography and container styles inside `styles.md`.
- Numbers formatting: Currency values should be formatted with commas (e.g., `1,200,000 تومان`).