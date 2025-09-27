# Feature Context: Footer Component

## 1. Overall Goal
To create the main website footer as a reusable layout component. The footer should be responsive and styled according to the global design system. It will appear on all pages of the site.

## 2. Component Files
Create the following files:
- `src/modules/layout/Footer/Footer.jsx`
- `src/modules/layout/Footer/Footer.module.scss`

## 3. JSX Structure (`Footer.jsx`)
The component should have a clean, semantic structure. Use the following JSX as a baseline. The links and social media icons can be placeholders for now.

```jsx
import Link from 'next/link';
import styles from './Footer.module.scss';

const Footer = () => {
  return (
    <footer className={styles.footer}>
      <div className={`${styles.footerContainer} container`}>
        <div className={styles.footerGrid}>
          {/* Column 1: About/Brand */}
          <div className={styles.footerColumn}>
            <h3 className={styles.columnTitle}>درباره ما</h3>
            <p>
              ما به دنبال ساختن یک اقتصاد رحمانی هستیم که در آن واحد ارزش نه فقط مادیات، که «نور»، آگاهی و عشق باشد.
            </p>
          </div>

          {/* Column 2: Quick Links */}
          <div className={styles.footerColumn}>
            <h3 className={styles.columnTitle}>دسترسی سریع</h3>
            <ul className={styles.linkList}>
              <li><Link href="/products">محصولات</Link></li>
              <li><Link href="/articles">مقالات</Link></li>
              <li><Link href="/courses">دوره‌ها</Link></li>
              <li><Link href="/about-us">درباره ما</Link></li>
            </ul>
          </div>

          {/* Column 3: Contact Info */}
          <div className={styles.footerColumn}>
            <h3 className={styles.columnTitle}>تماس با ما</h3>
            <ul className={styles.linkList}>
              <li>آدرس: ایران، تهران</li>
              <li>تلفن: ۰۲۱-۱۲۳۴۵۶۷۸</li>
              <li>ایمیل: info@example.com</li>
            </ul>
            {/* Social Icons Placeholder */}
            <div className={styles.socialIcons}>
              <span>Icon1</span> <span>Icon2</span> <span>Icon3</span>
            </div>
          </div>

          {/* Column 4: Newsletter */}
          <div className={styles.footerColumn}>
            <h3 className={styles.columnTitle}>خبرنامه</h3>
            <p>از آخرین تخفیف‌ها و جدیدترین محصولات باخبر شوید.</p>
            <form className={styles.newsletterForm}>
              <input type="email" placeholder="ایمیل شما" />
              <button type="submit">عضویت</button>
            </form>
          </div>
        </div>

        <div className={styles.footerBottom}>
          <p>تمامی حقوق برای این وب‌سایت محفوظ است. © 2025</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

4. SCSS Styling (Footer.module.scss)
Use the global CSS variables and mixins from our design system. The styling should achieve the following:

Use a dark background (--color-bg-primary).

Use primary text and title colors (--color-text-primary, --color-title-hover).

The main layout should be a responsive 4-column grid that stacks on mobile.

Links should have a hover effect.

The newsletter form button should use the .card-button style as a base if possible.

Use BEM naming convention for all classes.