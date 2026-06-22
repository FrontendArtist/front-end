# CONTEXT_AdminOrders.md

## 🎯 Purpose
Implement the Admin Orders Management page (`/admin/orders`). It handles viewing all orders, approving "Card-to-Card" payment receipts, updating order fulfillment statuses, and attaching shipping tracking codes.

---

### 📂 File Structure
- /src/app/admin/orders/page.jsx
- /src/components/admin/Orders/OrdersTable.jsx
- /src/components/admin/Orders/ReceiptModal.jsx
- /src/components/admin/Orders/StatusUpdateModal.jsx
- /src/components/admin/Orders/OrdersTable.module.scss

---

### ⚙️ Component Type
- `page.jsx`: `server` (Fetches orders with user and receipt relations).
- `OrdersTable.jsx`: `use client` (Data table with actions).
- `ReceiptModal.jsx`: `use client` (Displays uploaded payment receipt for approval).
- `StatusUpdateModal.jsx`: `use client` (Form to change order status and input `trackingCode`).

---

### 🌐 Data Source
- `GET /api/orders?populate=user,receiptImage` (List orders).
- `PUT /api/orders/:id` (Update `paymentStatus`, `orderStatus`, and `trackingCode`).

---

### 🧠 Core Logic
1. **Receipt Approval:** If `paymentMethod === 'card_to_card'` & `paymentStatus === 'pending'`, show "View Receipt" -> Admin approves -> Update to `paid`.
2. **Shipping Update:** Admin changes status to `shipped` -> Prompt for `trackingCode` -> Save to Strapi so the user's tracking timeline updates.

---

### 🎨 Design Notes
- Use `styles.md` tokens.
- Badges: Yellow (Pending), Orange (Awaiting Receipt), Green (Paid), Blue (Shipped), Gray (Delivered).

---

### 🧾 Cursor Prompt
// Create the Admin Orders page and components based on @CONTEXT_AdminOrders.md.
// Display fields: ID, User, Payment Method, Status, Amount, Date.
// Add a "View Receipt" action for card-to-card payments.
// Add an "Update Status" action that opens a modal to select the new status and input a tracking code if shipped.
// Ensure graceful loading states and modular SCSS.