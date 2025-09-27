# Feature Context: Navbar Component

## 1. Overall Goal
To create the main website navigation bar (`Navbar`). It must be a responsive, sticky header that includes the site logo, primary navigation links, and action icons. For mobile devices, it should collapse into a hamburger menu that toggles a slide-in drawer.

**IMPORTANT:** This component requires state to manage the mobile menu's open/close state. Therefore, it must be a **Client Component**.

## 2. Component Files
Create the following files:
- `src/modules/layout/Navbar/Navbar.jsx`
- `src/modules/layout/Navbar/Navbar.module.scss`

## 3. JSX Structure (`Navbar.jsx`)
Use the following structure as a baseline. Note the `'use client'` directive at the top and the use of `useState` for the mobile menu.

```jsx
'use client'; // This directive is essential for using state

import { useState } from 'react';
import Link from 'next/link';
import styles from './Navbar.module.scss';

const Navbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <header className={styles.header}>
      <nav className={`${styles.navbar} container`}>
        {/* Logo */}
        <div className={styles.logo}>
          <Link href="/">لوگو سایت</Link>
        </div>

        {/* Desktop Navigation */}
        <ul className={styles.navList}>
          <li><Link href="/products">محصولات</Link></li>
          <li><Link href="/articles">مقالات</Link></li>
          <li><Link href="/courses">دوره‌ها</Link></li>
          <li><Link href="/hakim-elahi">حکیم الهی</Link></li>
          <li><Link href="/about-us">درباره ما</Link></li>
          <li><Link href="/contact-us">تماس با ما</Link></li>
        </ul>

        {/* Action Icons */}
        <div className={styles.actionIcons}>
          <span>آیکون جستجو</span>
          <span>آیکون کاربر</span>
          <span>آیکون سبد خرید</span>
        </div>

        {/* Mobile Menu Toggle (Hamburger) */}
        <button className={styles.mobileMenuToggle} onClick={toggleMobileMenu}>
          ☰
        </button>
      </nav>

      {/* Mobile Menu Drawer */}
      {isMobileMenuOpen && (
        <div className={styles.mobileMenuDrawer}>
          <ul className={styles.mobileNavList}>
            <li><Link href="/products">محصولات</Link></li>
            <li><Link href="/articles">مقالات</Link></li>
            <li><Link href="/courses">دوره‌ها</Link></li>
            <li><Link href="/hakim-elahi">حکیم الهی</Link></li>
            <li><Link href="/about-us">درباره ما</Link></li>
            <li><Link href="/contact-us">تماس با ما</Link></li>
          </ul>
        </div>
      )}
    </header>
  );
};

export default Navbar;


4. SCSS Styling (Navbar.module.scss)
The styling should achieve the following:

Implement a sticky header.

Use Flexbox for layout alignment.

The desktop navigation (.navList) and action icons should be hidden on mobile.

The hamburger icon (.mobileMenuToggle) should only be visible on mobile.

The mobile drawer (.mobileMenuDrawr) should slide in from the right and have a semi-transparent overlay background.

All styling must use the established global CSS variables.


