# CONTEXT_ServiceCard.md

## 🎯 Purpose
Briefly describe what this component/feature does.
- [cite_start]This component is a reusable presentational card[cite: 5].
- [cite_start]It displays summary information for a single service, including an image, title, and description[cite: 23].
- [cite_start]The entire card acts as a link navigating to the single service details page (e.g., `/services/[slug]`)[cite: 24].

---

### 📂 File Structure
- [cite_start]/src/components/cards/ServiceCard.jsx [cite: 261]
- [cite_start]/src/components/cards/ServiceCard.module.scss [cite: 262]

---

### ⚙️ Component Type
`server`
- **Reasoning:** This is a "Server-First" component as defined in `ARCHITECTURE_RULES.md`. It is purely presentational, receives props, and does not require any client-side hooks (`useState`, `useEffect`) or event handlers.

---

### 🌐 Data Source
- **Props (from `nextjs_spec-1.docx`):**
  - `id`: string
  - [cite_start]`slug`: string (Used to build the navigation link [cite: 24])
  - `image`: string (URL for the service image)
  - `title`: string
  - [cite_start]`description`: string [cite: 23]
- [cite_start]**Note:** The `link` prop specified in the spec [cite: 23] [cite_start]is not used on the card itself, as the entire card links to the single service page via `slug`[cite: 24]. [cite_start]The `link` prop is likely intended for the CTA on the single service page[cite: 168].

---

### 🧩 Dependencies
- `next/link` (For navigation to `/services/[slug]`)
- [cite_start]`next/image` (For optimized image rendering [cite: 324])
- [cite_start]`styles` from `./ServiceCard.module.scss` [cite: 262]
- `src/styles/abstracts/_variables.scss` (To import color/font tokens)
- `src/styles/abstracts/_mixins.scss` (To import mixins like `respond`)

---

### 🧠 State Logic
- None. This is a stateless server component.

---

### 🎨 Design Notes
- The component structure should be: `<Link href={`/services/${slug}`}>` wrapping the card content.
- [cite_start]Use `next/image` for the `image` prop[cite: 324].
- [cite_start]Styling must be done using the SCSS module file[cite: 208, 317].
- Naming conventions must follow BEM.
- Use CSS variables for all colors, spacing, and typography defined in `styles.md` (e.g., `var(--color-text-primary)`, `var(--color-card-text)`).
- Use the `@include respond(md)` mixin for responsive breakpoints.

---
