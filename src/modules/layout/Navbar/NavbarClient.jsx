'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import styles from './Navbar.module.scss';

const NavbarClient = ({ categoriesSnapshot = '[]' }) => {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => setIsClient(true), []);
  const categories = useMemo(() => {
    try { return JSON.parse(categoriesSnapshot) || []; } catch { return []; }
  }, [categoriesSnapshot]);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeMobileTab, setActiveMobileTab] = useState('menu'); // menu | categories
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMegaMenuOpen, setIsMegaMenuOpen] = useState(false);
  const closeTimerRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(prev => {
      const next = !prev;
      document.body.style.overflow = next ? 'hidden' : '';
      return next;
    });
  }, []);

  const closeMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(false);
    document.body.style.overflow = '';
  }, []);

  // مگامنو Hover کنترل
  const handleMouseEnter = () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    setIsMegaMenuOpen(true);
  };

  const handleMouseLeave = () => {
    closeTimerRef.current = setTimeout(() => {
      setIsMegaMenuOpen(false);
    }, 300);
  };

  return (
    <>
      <header className={`${styles.header} ${isScrolled ? styles.scrolled : ''} ${isMegaMenuOpen ? styles.megaOpen : ''}`}>
        <nav className={`${styles.navbar} container`}>
          {/* 🟢 Logo */}
          <div className={styles.logo}>
            <Link href="/">
              <Image src="/images/Logo.png" alt="لوگو" width={130} height={60} />
            </Link>
          </div>

          {/* 🟢 Desktop Menu */}
          <ul className={styles.navList}>
            <li
              className={styles.navItem}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              <Link href="/products" className={styles.navLink}>
                <span className={styles.navLinkContent}>
                  محصولات
                  <svg
                    className={`${styles.dropdownIcon} ${isMegaMenuOpen ? styles.dropdownIconOpen : ''}`}
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    focusable="false"
                  >
                    <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                </span>
              </Link>

            </li>
            <li><Link href="/articles" className={styles.navLink}>مقالات</Link></li>
            <li><Link href="/courses" className={styles.navLink}>دوره‌ها</Link></li>
            <li><Link href="/services" className={styles.navLink}>خدمات</Link></li>
            <li><Link href="/about-us" className={styles.navLink}>درباره ما</Link></li>
            <li><Link href="/contact-us" className={styles.navLink}>تماس با ما</Link></li>
          </ul>

          {/* 🟢 Actions + Mobile Toggle */}
          <div className={styles.actionsContainer}>
            <div className={styles.actionIcons}>
              <button className={styles.iconButton} aria-label="جستجو">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </button>
              <button className={styles.iconButton} aria-label="حساب کاربری">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none">
                  <circle cx="12" cy="8" r="4" />
                  <path d="M6 20c0-3.333 3-6 6-6s6 2.667 6 6" />
                </svg>
              </button>
              <button className={styles.iconButton} aria-label="سبد خرید">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none">
                  <circle cx="9" cy="21" r="1" />
                  <circle cx="20" cy="21" r="1" />
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                </svg>
              </button>
            </div>

            <button
              className={`${styles.mobileMenuToggle} ${isMobileMenuOpen ? styles.open : ''}`}
              onClick={toggleMobileMenu}
              aria-label="منوی موبایل"
              aria-expanded={isMobileMenuOpen}
            >
              <span className={styles.hamburgerLine}></span>
              <span className={styles.hamburgerLine}></span>
              <span className={styles.hamburgerLine}></span>
            </button>
          </div>
        </nav>

      </header>
        {/* 🟣 Mobile Drawer */}
        <div className={`${styles.mobileMenuDrawer} ${isMobileMenuOpen ? styles.open : ''}`}>
          <div className={styles.mobileMenuTop}>
            <input type="text" placeholder="جستجو..." className={styles.mobileSearch} />
          </div>

          <div className={styles.mobileTabs}>
            <button
              onClick={() => setActiveMobileTab('menu')}
              className={`${styles.tabBtn} ${activeMobileTab === 'menu' ? styles.active : ''}`}
            >
              منو
            </button>
            <button
              onClick={() => setActiveMobileTab('categories')}
              className={`${styles.tabBtn} ${activeMobileTab === 'categories' ? styles.active : ''}`}
            >
              دسته‌بندی‌ها
            </button>
          </div>

          <div className={styles.mobileMenuContent}>
            {activeMobileTab === 'menu' && (
              <ul className={styles.mobileNavList}>
                <li><Link href="/" onClick={closeMobileMenu}>صفحه اصلی</Link></li>
                <li><Link href="/articles" onClick={closeMobileMenu}>مقالات</Link></li>
                <li><Link href="/courses" onClick={closeMobileMenu}>دوره‌ها</Link></li>
                <li><Link href="/services" onClick={closeMobileMenu}>خدمات</Link></li>
                <li><Link href="/about-us" onClick={closeMobileMenu}>درباره ما</Link></li>
                <li><Link href="/contact-us" onClick={closeMobileMenu}>تماس با ما</Link></li>
              </ul>
            )}

            {activeMobileTab === 'categories' && (
              <ul className={styles.mobileNavList}>
                {categories.map(cat => (
                  <li key={cat.id} className={styles.mobileCategoryGroup}>
                    <Link href={`/category/${cat.slug}`} onClick={closeMobileMenu}>{cat.name}</Link>
                    {Array.isArray(cat.subCategories) && cat.subCategories.length > 0 && (
                      <ul className={styles.mobileSubList}>
                        {cat.subCategories.map(sub => (
                          <li key={sub.id}>
                            <Link href={`/category/${cat.slug}/${sub.slug}`} onClick={closeMobileMenu}>
                              {sub.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className={styles.mobileMenuOverlay} onClick={closeMobileMenu} />
        {/* MegaMenu */}
        {isClient && categories.length > 0 && (
          <div
            className={`${styles.megaMenu} ${isMegaMenuOpen ? styles.megaMenuVisible : ''}`}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            role="menu"
            aria-label="منوی دسته‌بندی محصولات"
            aria-hidden={!isMegaMenuOpen}
          >
            <span className={styles.megaBorder} aria-hidden="true" />
            <div className={styles.megaMenuGrid}>
              {categories.map(cat => (
                <div key={cat.id} className={styles.megaMenuColumn}>
                  <Link href={`/category/${cat.slug}`} className={styles.categoryTitle}>
                    {cat.name}
                  </Link>
                  {cat.subCategories?.length > 0 && (
                    <ul className={styles.subCategoryList}>
                      {cat.subCategories.map(sub => (
                        <li key={sub.id}>
                          <Link href={`/category/${cat.slug}/${sub.slug}`}>
                            {sub.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

    </>
  );
};

export default NavbarClient;
