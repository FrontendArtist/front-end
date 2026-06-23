# CONTEXT_AdminCommentItem.md

## 🎯 Purpose
Implement the Comment Moderation Component (`UserCommentItem.jsx`) inside the Admin Panel. It allows admins to Approve/Reject comments, Reply directly to nested comments, and navigate to the live page where the comment is posted.

---

### ⚙️ Component Details
- **File:** `/src/components/admin/Users/UserCommentItem.jsx` (Client Component)
- **Props Expected:** `comment` object (populated with `product`, `article`, `course`, and `user`).

---

### 🌐 API Interactions & Logic

1. **Approve / Reject:**
   - Endpoint: `PUT /api/comments/:id`
   - Payload: `{ data: { isApproved: true/false } }`
   - Behavior: Updates the badge status instantly in the UI.

2. **Admin Reply:**
   - Endpoint: `POST /api/comments`
   - Payload: 
     ```json
     {
       "data": {
         "content": "Admin's reply text",
         "isApproved": true,
         "comment_parent": comment.id,
         "user": adminSession.user.id,
         "product": comment.product?.id,
         "article": comment.article?.id,
         "course": comment.course?.id
       }
     }
     ```
   - Behavior: Opens an inline text area. Upon submit, creates a new comment linked as a child to the current one and auto-approves it.

3. **View on Live Site (مشاهده در سایت):**
   - Logic: Dynamically generate a Next.js `<Link>` based on which relation exists.
   - If `comment.product` exists -> `href="/products/${comment.product.slug}#comment-${comment.id}"`
   - If `comment.article` exists -> `href="/articles/${comment.article.slug}#comment-${comment.id}"`
   - If `comment.course` exists -> `href="/courses/${comment.course.slug}#comment-${comment.id}"`

---

### 🎨 Design Notes
- Use a card layout for each comment.
- Include action buttons: "تایید" (Green), "رد" (Red), "پاسخ" (Blue), "مشاهده در سایت" (Gray/Outline with an external link icon).
- When "پاسخ" is clicked, expand a smooth textarea with a submit button.
برای رنگ های از متغیر های فایل variables.css استفاده کن یا .light-theme.css 
---

### 🧾 Cursor Prompt
