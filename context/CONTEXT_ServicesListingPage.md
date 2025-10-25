# CONTEXT_ServicesListingPage.md

## 🎯 Purpose
- To create the main listing page for all services available on the site, located at `/services`.
- [cite_start]The page will feature a hero section with a title and description[cite: 188].
- [cite_start]It will fetch a list of all services from the Strapi API and display them in a responsive grid[cite: 189].
- It will use the `ServiceCard` component to render each item in the grid.
- [cite_start]Based on `nextjs_spec-1.docx` , this page does not require sorting or "Load More" pagination, unlike the products or articles pages.

---

### 📂 File Structure
- /src/app/services/page.jsx
- /src/app/services/servicesPage.module.scss

---

### ⚙️ Component Type
`server`
- **Reasoning:** This page is a Server Component. [cite_start]It needs to fetch data from the API (`/api/services`) on the server during the rendering process[cite: 254]. This aligns with the "Server-First" rule in `ARCHITECTURE_RULES.md`.

---

### 🌐 Data Source
- [cite_start]**Endpoint:** `/api/services` [cite: 254]
- **Method:** A GET request to fetch all entries from the "Service" Content Type in Strapi.
- **Data Usage:** The component will fetch the complete list of services. The `api.js` library (which uses `strapiUtils.js` as per `ARCHITECTURE_RULES.md`) should be used for the fetch call.
- **Fields Required:** The data fetched for each service must include `id`, `slug`, `title`, `description`, and `image` to pass as props to the `ServiceCard` component.

---

### 🧩 Dependencies
- `React` (for the component)
- `ServiceCard` from `/src/components/cards/ServiceCard.jsx` (to render each item)
- `styles` from `./servicesPage.module.scss`
- `api` from `/src/lib/api.js` (to fetch the services data)
- `src/styles/abstracts/_mixins.scss` (for responsive mixins like `respond`)

---

### 🧠 State Logic
- None. This is a stateless Server Component. Data is fetched and passed directly to the UI.

---

### 🎨 Design Notes
- [cite_start]The page layout should start with a hero section containing a main title (e.g., "خدمات ما") and a brief description[cite: 188].
- Below the hero, a container should hold the grid of services.
- The grid will be implemented using SCSS (likely CSS Grid or Flexbox) in `servicesPage.module.scss`.
- [cite_start]The grid must be responsive, following the breakpoints in `styles.md` and the suggestion of 1 column on mobile, 2 on tablet, and 3-4 on desktop[cite: 191].
- BEM naming conventions must be used for all CSS classes.
- [cite_start]If no services are returned from the API, the page should display an "Empty State" message (e.g., "در حال حاضر خدماتی برای نمایش وجود ندارد.") [cite: 131-132, 192].

