# CONTEXT_AdminMessages.md

## 🎯 Purpose
Implement the Contact Messages Management page (`/admin/contact-messages`) to allow admins to view, read, and manage user inquiries.

---

### 📂 File Structure
- /src/app/admin/contact-messages/page.jsx
- /src/components/admin/Messages/MessagesTable.jsx
- /src/components/admin/Messages/MessageReadModal.jsx

---

### 🌐 Data Source & Schema
- Collection: `ContactMessage`
- Exact Fields: `name` (Text), `contactInfo` (Text), `subject` (Text), `body` (Text), `isRead` (Boolean).

---

### 🧠 Core Logic
1. **Unread Highlighting:** Rows where `isRead === false` should have a distinct visual style (e.g., bold text or a subtle highlighted background) to grab the admin's attention.
2. **Read Modal:** Clicking "View Message" opens `MessageReadModal` displaying the full `body`.
3. **Auto-Mark as Read:** Opening the modal should automatically trigger a `PUT /api/contact-messages/:id` request to set `isRead: true`.
4. **Delete Action:** Allow admins to delete junk or resolved messages.

---

برای رنگ های از متغیر های فایل variables.css استفاده کن یا .light-theme.css 


### 🧾 Cursor Prompt
// Build the Admin Contact Messages page based strictly on @CONTEXT_AdminMessages.md.
// Create a table showing Name, Subject, Contact Info, and Status (Read/Unread).
// Clicking a row opens a modal with the full message body and marks `isRead: true` via an API call.
// Ensure unread messages are visually distinct in the table.