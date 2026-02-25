# CONTEXT_CommentsSystem.md

## 🎯 Purpose
To implement a robust, polymorphic (multi-entity) comments system with user authentication, star ratings, and admin moderation, adhering to project standards.

---

## ⚙️ Final Data Model (Comment Content Type)
* **Relations (Mutually Exclusive):** `user` (ManyToOne), `article` (ManyToOne), `product` (ManyToOne), `course` (ManyToOne), `parent`/`replies` (Threading).
* **Fields:** `content` (Text), `rating` (Integer 1-5), `isApproved` (Boolean, Default: false).

---

## 📂 File Structure & Scope
-   `src/lib/commentsApi.js` (Handling fetching, posting, and moderation logic)
-   `src/modules/comments/CommentsSection.jsx` (Reusable client component)
-   `src/modules/comments/CommentItem.jsx` (Recursive component for replies)
-   Integration into: `src/app/articles/[slug]/page.js`, `src/app/products/[slug]/page.js`, `src/app/courses/[slug]/page.js`.

---

## 🧩 Key Implementation Logic

### 1. API Fetching (GET)
-   **Goal:** Fetch all approved, top-level comments for a specific entity (e.g., Article ID 123).
-   **Filters:** Must include `filters[isApproved][$eq]=true` AND filter by ONE relationship (`filters[article][id][$eq]=123`).
-   **Population:** Must populate `user`, `replies` (recursively), and `rating`.

### 2. Comment Submission (POST)
-   **Rule Enforcement (Mutually Exclusive):** The API submission logic must ensure that only ONE entity ID (`articleId` OR `productId` OR `courseId`) is sent. If multiple are present, only one is used/saved.
-   **Moderation:** `isApproved` is always set to `false` upon creation.
-   **Permissions:** Only allow submission if the user is authenticated (Server-Side check).

### 3. Frontend Display (CommentsSection.jsx)
-   **Data Flow:** Fetch approved comments (SSR/Client side) → Construct comment tree (handle nesting/replies) → Render.
-   **UI:** Display star ratings (5 stars). Indentation for replies. Show a success message for pending approval.
-   **Interactions:** Implement "Reply" button functionality (which opens a new submission form).