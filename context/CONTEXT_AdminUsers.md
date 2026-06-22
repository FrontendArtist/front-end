# CONTEXT_AdminUsers.md

## 🎯 Purpose
Implement the Admin Users Management page (`/admin/users`). It provides a comprehensive view of all registered users. Admins can view basic info, search users, and open a "User Details Drawer" to see their purchased products/courses and moderate their comments (approve, reject, reply) directly from their profile.

---

### 📂 File Structure
- /src/app/admin/users/page.jsx
- /src/components/admin/Users/UsersTable.jsx
- /src/components/admin/Users/UserDetailsDrawer.jsx
- /src/components/admin/Users/UserCommentItem.jsx
- /src/components/admin/Users/Users.module.scss

---

### ⚙️ Component Type
- `page.jsx`: `server` (Fetches the initial lightweight list of users).
- `UsersTable.jsx`: `use client` (Table, search logic, and triggers the details drawer).
- `UserDetailsDrawer.jsx`: `use client` (Fetches and displays full user details including orders, courses, and comments via Tabs).
- `UserCommentItem.jsx`: `use client` (Handles individual comment moderation logic).

---

### 🌐 Data Source
- **List Users:** `GET /api/users?populate=role`
- **User Details (On-Demand):** `GET /api/users/:id?populate=orders.items,enrolledCourses,comments.relatedTo`
- **Comment Actions:** `PUT /api/comments/:id` (Update status to approved/rejected, or add a reply).
- **Key Fields:**
  - `User`: id, username, email, phone, role, createdAt
  - `Order`: status, items
  - `Comment`: content, status (approved, pending, rejected), relatedTo (product/article/course)

---

### 🧠 Core Logic
1. **Lightweight Listing:** Show a table of users (ID, Name, Phone, Email, Role) with a search bar.
2. **360° User Drawer:** Clicking "View Details" opens a Drawer/Modal with 3 Tabs:
   - **Info:** Basic contact info & Role editing (optional).
   - **Purchases:** Lists `enrolledCourses` and physical `orders` linked to the user.
   - **Comments:** Lists all comments authored by this user.
3. **Comment Moderation:** Inside the Comments Tab, each comment has quick actions: 
   - `Approve` (Changes status and makes it public).
   - `Reject` / `Delete`.
   - `Reply` (Opens an inline input to post a reply as Admin).

---

### 🎨 Design Notes
- Use `styles.md` tokens.
- Implement a slide-over Drawer for details to ensure the admin doesn't lose their place in the table.
- Badges: Green (Approved Comment/Paid Order), Yellow (Pending Comment), Red (Rejected).

---

### 🧾 Cursor Prompt
// Create the Admin Users page and components based on @CONTEXT_AdminUsers.md.
// 1. Build a responsive `UsersTable` fetching lightweight user data.
// 2. Add a "View Profile" button to each row that opens `UserDetailsDrawer`.
// 3. Inside the Drawer, fetch the specific user's detailed relations (orders, enrolledCourses, comments).
// 4. Create a Tabs UI in the Drawer for "Purchases" and "Comments".
// 5. Build `UserCommentItem` allowing the Admin to Approve, Reject, or Reply to the user's comment inline.
// Ensure graceful loading states (skeleton or spinner) inside the drawer and strict adherence to BEM SCSS.