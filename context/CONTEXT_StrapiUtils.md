# CONTEXT_StrapiUtils.md

## 🎯 Purpose
- To create the core, low-level utility file for handling all direct communication with the Strapi v5 API.
- This module is mandated by `ARCHITECTURE_RULES.md` to be the single source of truth for `fetch` operations.
- It will handle URL construction, basic error handling, and formatting the response as `{ data: ... }` or `{ error: ... }`.

---

### 📂 File Structure
- /src/lib/strapiUtils.js

---

### ⚙️ Component Type
- Utility Module (JavaScript)

---

### 🌐 Data Source
- Reads from `process.env.NEXT_PUBLIC_STRAPI_API_URL` to get the base API URL.

---

### 🧩 Dependencies
- None. This is a pure JS module.

---

### 🧠 State Logic
- None. This module contains stateless, pure functions.

---

### 🎨 Design Notes
- **`getStrapiURL(path = "")` function:**
  - Takes an optional `path` (e.g., "/api/services").
  - Returns the full, absolute URL by combining `process.env.NEXT_PUBLIC_STRAPI_API_URL` and the path.
- **`fetchStrapiAPI` function (async):**
  - This will be the primary export.
  - **Parameters:** It should accept a config object, e.g., `({ endpoint, params = {}, options = {} })`.
  - **Query String:** It must convert the `params` object (e.g., `{ populate: '*', 'filters[slug][$eq]': 'my-slug' }`) into a valid URL query string. Using `URLSearchParams` is sufficient.
  - **Fetch Call:**
    - It constructs the full URL using `getStrapiURL` and the endpoint.
    - It performs the `fetch` call with default headers (`Content-Type: application/json`).
  - **Error Handling:**
    - It must use a `try...catch` block.
    - If `response.ok` is `false`, it should log the error and return `{ data: null, error: { status: res.status, message: res.statusText } }`.
  - **Response Format:**
    - If successful, it parses the JSON and returns `{ data: jsonResponse, error: null }`.
    - This `{ data, error }` structure is mandated by `ARCHITECTURE_RULES.md`.

---

### 🧾 Cursor Prompt
```js
// Create the core Strapi utility file based on @CONTEXT_StrapiUtils.md
// The file MUST be at src/lib/strapiUtils.js
// It must export `getStrapiURL` and the main `fetchStrapiAPI` function.
// The `fetchStrapiAPI` function must correctly handle query parameters and return the response in the { data, error } format.
// All generated code MUST be heavily commented to explain its purpose and logic.