 CONTEXT_NavbarMegaMenu.md

## 🎯 Purpose
افزودن Mega Menu داینامیک به `Navbar` برای نمایش دسته‌ها و زیردسته‌ها به‌صورت درختی (از Strapi).  
این MegaMenu باید در حالت دسکتاپ به‌صورت hover/dropdown چندستونه و در موبایل به‌صورت accordion نمایش داده شود.

---

### 📂 File Structure
- `/src/components/layout/Navbar.jsx` → افزودن منطق SSR و رندر MegaMenu  
- `/src/components/layout/Navbar.module.scss` → افزودن استایل‌های grid و transition  
- `/lib/categoriesApi.js` → داده از `getCategoryTree()` دریافت می‌شود  

---

### ⚙️ Component Type
`server`  
> چون داده‌های دسته‌بندی برای SEO و سرعت رندر اولیه اهمیت دارد و از Strapi واکشی می‌شود.

---

### 🌐 Data Source
- Endpoint: `/api/categories`  
- Function: `getCategoryTree()`  
- Fields: `id`, `title`, `slug`, `subCategories[title, slug]`

---

### 🧩 Dependencies
- `next/link`
- `next/image`
- `getCategoryTree` from `/lib/categoriesApi`
- CSS transitions + SCSS grid system (`@include respond()` از `styles.md`)

---

### 🧠 State Logic
در این نسخه نیازی به Zustand نیست.  
در موبایل از `useState` برای کنترل باز و بسته‌شدن accordion استفاده می‌شود.

---

### 🎨 Design Notes
استایل بر اساس ساختار موجود در `styles.md` و SCSS Modules.  
- از mixin `card-container` برای باکس مگامنو استفاده شود.  
- رنگ پس‌زمینه: `var(--color-overlay)` با `backdrop-filter: blur(8px)`  
- انیمیشن باز شدن: fade-down با `transition: all 0.3s ease-in-out`.  
- Grid برای دسکتاپ: 3 ستون (`grid-template-columns: repeat(3, 1fr)`)، در تبلت 2، در موبایل 1.  
- Hover روی هر آیتم منو → نمایش زیرمجموعه با opacity + transformY.

---

### 🧱 Implementation Notes
افزودن بخش جدید بدون حذف خطوط فعلی:

1. **افزودن SSR Fetch در بالای فایل:**
   ```js
   // در بالای فایل Navbar.jsx قبل از تعریف component
   import { getCategoryTree } from '@/lib/categoriesApi';

   export const revalidate = 300; // ISR caching
افزودن دریافت داده در بخش سرور:

js
Copy code
// پیش از بازگشت JSX در Navbar
const categories = await getCategoryTree();
افزودن بخش MegaMenu زیر آیتم "محصولات":

jsx
Copy code
<li className={styles.navItem}>
  <div className={styles.megaMenuWrapper}>
    <Link href="/products">محصولات</Link>
    <div className={styles.megaMenu}>
      {categories.map(cat => (
        <div key={cat.id} className={styles.megaMenuColumn}>
          <Link href={`/category/${cat.slug}`} className={styles.categoryTitle}>{cat.title}</Link>
          <ul>
            {cat.subCategories?.map(sub => (
              <li key={sub.id}>
                <Link href={`/category/${cat.slug}/${sub.slug}`}>{sub.title}</Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  </div>
</li>
افزودن منطق موبایل (Accordion):

jsx
Copy code
// در بخش mobileNavList
{categories.map(cat => (
  <li key={cat.id}>
    <button
      className={styles.mobileCategoryToggle}
      onClick={() => toggleCategory(cat.id)}
    >
      {cat.title}
    </button>
    {openCategory === cat.id && (
      <ul className={styles.mobileSubList}>
        {cat.subCategories?.map(sub => (
          <li key={sub.id}>
            <Link href={`/category/${cat.slug}/${sub.slug}`} onClick={toggleMobileMenu}>
              {sub.title}
            </Link>
          </li>
        ))}
      </ul>
    )}
  </li>
))}
افزودن SCSS در Navbar.module.scss:

scss
Copy code
.megaMenuWrapper {
  position: relative;
  &:hover .megaMenu { opacity: 1; transform: translateY(0); pointer-events: auto; }
}

.megaMenu {
  @include card-container;
  position: absolute;
  top: 100%;
  right: 0;
  background: var(--color-overlay);
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
  padding: 24px;
  opacity: 0;
  transform: translateY(16px);
  pointer-events: none;
  transition: all 0.3s ease-in-out;
  @include respond(md) { grid-template-columns: repeat(2, 1fr); }
  @include respond(sm) { grid-template-columns: 1fr; }
}

.megaMenuColumn {
  .categoryTitle {
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
    margin-bottom: 12px;
    display: block;
    &:hover { color: var(--color-title-hover); }
  }
  ul {
    list-style: none;
    padding: 0;
    li a {
      display: block;
      padding: 4px 0;
      color: var(--color-card-text);
      &:hover { color: var(--color-title-hover); }
    }
  }
}

.mobileCategoryToggle {
  width: 100%;
  text-align: right;
  background: none;
  border: none;
  color: var(--color-card-text);
  font-size: var(--font-md);
  padding: 8px 0;
}

.mobileSubList {
  margin-right: 12px;
  border-right: 1px solid rgba(255,255,255,0.1);
  padding-right: 12px;
  li a { color: var(--color-text-primary); font-size: var(--font-sm); }
}
