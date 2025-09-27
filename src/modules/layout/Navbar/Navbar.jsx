'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './Navbar.module.scss';

const Navbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
    // Prevent body scroll when menu is open
    document.body.style.overflow = !isMobileMenuOpen ? 'hidden' : '';
  };

  return (
    <header className={`${styles.header} ${isScrolled ? styles.scrolled : ''}`}>
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
          <button className={styles.iconButton} aria-label="جستجو">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </button>
          <button className={styles.iconButton} aria-label="حساب کاربری">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          </button>
          <button className={styles.iconButton} aria-label="سبد خرید">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
          </button>
        </div>

        {/* Mobile Menu Toggle */}
        <button 
          className={`${styles.mobileMenuToggle} ${isMobileMenuOpen ? styles.open : ''}`}
          onClick={toggleMobileMenu}
          aria-label="منو"
          aria-expanded={isMobileMenuOpen}
        >
          <span className={styles.hamburgerLine}></span>
          <span className={styles.hamburgerLine}></span>
          <span className={styles.hamburgerLine}></span>
        </button>
      </nav>

      {/* Mobile Menu Drawer */}
      <div className={`${styles.mobileMenuDrawer} ${isMobileMenuOpen ? styles.open : ''}`}>
        <div className={styles.mobileMenuContent}>
          <ul className={styles.mobileNavList}>
            <li><Link href="/products" onClick={toggleMobileMenu}>محصولات</Link></li>
            <li><Link href="/articles" onClick={toggleMobileMenu}>مقالات</Link></li>
            <li><Link href="/courses" onClick={toggleMobileMenu}>دوره‌ها</Link></li>
            <li><Link href="/hakim-elahi" onClick={toggleMobileMenu}>حکیم الهی</Link></li>
            <li><Link href="/about-us" onClick={toggleMobileMenu}>درباره ما</Link></li>
            <li><Link href="/contact-us" onClick={toggleMobileMenu}>تماس با ما</Link></li>
          </ul>
        </div>
        <div className={styles.mobileMenuOverlay} onClick={toggleMobileMenu} />
      </div>
    </header>
  );
};

export default Navbar; 