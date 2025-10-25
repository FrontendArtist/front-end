# CONTEXT_SingleServicePage.md

## 🎯 Purpose
- To create the individual detail page for a single service, accessed via a dynamic route (e.g., `/services/my-service-slug`).
- The page fetches data for one specific service using the `slug` parameter from the URL.
- [cite_start]It displays the service's image, detailed information (title, description), and a primary Call-to-Action (CTA) button [cite: 167-168].
- [cite_start]It also includes a "Back" navigation element to return to the main services listing page[cite: 166].

---

### 📂 File Structure
- /src/app/services/[slug]/page.jsx
- /src/app/services/[slug]/serviceSlugPage.module.scss

---

### ⚙️ Component Type
`server`
- **Reasoning:** This is a dynamic page that must fetch data from the API based on the `slug` URL parameter. This data fetching must happen on the server, making it a Server Component as per `ARCHITECTURE_RULES.md`.

---

### 🌐 Data Source
- **Endpoint:** `/api/services/:slug` (The `api.js` library will handle resolving this).
- **Method:** A GET request to fetch a single service by its slug.
- **Data Usage:** The component will receive `params` (containing `slug`) from Next.js, pass it to the `api.js` fetch function, and receive the specific service data.
- [cite_start]**Fields Required:** `title`, `description`, `image`, and `link` (for the CTA button) [cite: 23, 167-168].

---

### 🧩 Dependencies
- `React` (for the component)
- `next/link` (For the "Back" button)
- `next/image` (For the service image)
- `api` from `/src/lib/api.js` (to fetch the single service data)
- `styles` from `./serviceSlugPage.module.scss`
- An icon library (e.g., `react-icons`) for the "Back" arrow.

---

### 🧠 State Logic
- None. This is a stateless Server Component.

---

### 🎨 Design Notes
- The layout should be simple and focused.
- [cite_start]A "Back" link or icon button must be present, navigating the user to `/services`[cite: 166].
- [cite_start]The page will display the service `image` and `info` (title, description)[cite: 167].
- [cite_start]A prominent CTA button (e.g., `<a href={service.link}>`) should be displayed with text like "Request Service" or similar[cite: 168]. This CTA links to an external or internal page specified by the `link` prop.
- Use BEM naming and CSS variables from `styles.md`.
- Handle the case where the service is not found (e.g., show a "Not Found" message or use Next.js `notFound()` function).

