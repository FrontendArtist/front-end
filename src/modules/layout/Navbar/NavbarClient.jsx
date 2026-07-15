"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import styles from "./Navbar.module.scss";
import SearchTrigger from "@/components/layout/SearchTrigger";
import SearchOverlay from "@/components/ui/SearchOverlay/SearchOverlay";
import UserStatus from "@/components/layout/Navbar/UserStatus";
import CartIcon from "@/components/layout/Navbar/CartIcon";

const NavbarClient = ({
  categoriesSnapshot = "[]",
  articleCategoriesSnapshot = "[]",
}) => {
  const [isClient, setIsClient] = useState(false);
  const [theme, setTheme] = useState("dark");

  useEffect(() => {
    setIsClient(true);
    const savedTheme = localStorage.getItem("theme") || "dark";
    setTheme(savedTheme);
    document.documentElement.setAttribute("data-theme", savedTheme);
  }, []);

  const productCategories = useMemo(() => {
    try {
      return JSON.parse(categoriesSnapshot) || [];
    } catch {
      return [];
    }
  }, [categoriesSnapshot]);

  const articleCategories = useMemo(() => {
    try {
      return JSON.parse(articleCategoriesSnapshot) || [];
    } catch {
      return [];
    }
  }, [articleCategoriesSnapshot]);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeMobileTab, setActiveMobileTab] = useState("menu"); // menu | products | articles
  const [mobileSearchQuery, setMobileSearchQuery] = useState("");
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeMegaMenu, setActiveMegaMenu] = useState(null); // 'products' | 'articles' | null
  const closeTimerRef = useRef(null);
  const router = useRouter();

  const toggleTheme = useCallback(() => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("theme", nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
  }, [theme]);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const toggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen((prev) => {
      const next = !prev;
      document.body.style.overflow = next ? "hidden" : "";
      return next;
    });
  }, []);

  const closeMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(false);
    document.body.style.overflow = "";
  }, []);

  const handleMobileSearch = (e) => {
    e.preventDefault();
    if (mobileSearchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(mobileSearchQuery.trim())}`);
      closeMobileMenu();
    }
  };

  // مگامنو Hover کنترل
  const handleMouseEnter = (menu) => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    setActiveMegaMenu(menu);
  };

  const handleMouseLeave = () => {
    closeTimerRef.current = setTimeout(() => {
      setActiveMegaMenu(null);
    }, 300);
  };

  return (
    <>
      <header
        className={`${styles.header} ${isScrolled ? styles.scrolled : ""} ${
          activeMegaMenu ? styles.megaOpen : ""
        }`}
      >
        <nav className={`${styles.navbar} container`}>
          {/* 🟢 Logo */}
          <div className={styles.logo}>
            <Link href="/">
              <Image
                src="/images/logo.png"
                alt="لوگو"
                width={130}
                height={60}
                priority
              />
            </Link>
          </div>

          {/* 🟢 Desktop Menu */}
          <ul className={styles.navList}>
            <li
              className={styles.navItem}
              onMouseEnter={() => handleMouseEnter("products")}
              onMouseLeave={handleMouseLeave}
            >
              <Link href="/products" className={styles.navLink}>
                <span className={styles.navLinkContent}>
                  محصولات
                  <svg
                    className={`${styles.dropdownIcon} ${
                      activeMegaMenu === "products"
                        ? styles.dropdownIconOpen
                        : ""
                    }`}
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    focusable="false"
                  >
                    <path
                      d="M6 9l6 6 6-6"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                  </svg>
                </span>
              </Link>
            </li>

            <li
              className={styles.navItem}
              onMouseEnter={() => handleMouseEnter("articles")}
              onMouseLeave={handleMouseLeave}
            >
              <Link href="/articles" className={styles.navLink}>
                <span className={styles.navLinkContent}>
                  مقالات
                  <svg
                    className={`${styles.dropdownIcon} ${
                      activeMegaMenu === "articles"
                        ? styles.dropdownIconOpen
                        : ""
                    }`}
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    focusable="false"
                  >
                    <path
                      d="M6 9l6 6 6-6"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                  </svg>
                </span>
              </Link>
            </li>

            <li>
              <Link href="/courses" className={styles.navLink}>
                دوره‌ها
              </Link>
            </li>
            <li>
              <Link href="/services" className={styles.navLink}>
                خدمات
              </Link>
            </li>
            <li>
              <Link href="/about" className={styles.navLink}>
                درباره ما
              </Link>
            </li>
            <li>
              <Link href="/contact" className={styles.navLink}>
                تماس با ما
              </Link>
            </li>
          </ul>

          {/* 🟢 Action Icons - سمت چپ */}
          <div className={styles.actionIcons}>
            {/* دکمه سوئیچ تم */}
            <button
              onClick={toggleTheme}
              className={styles.iconButton}
              title={theme === "dark" ? "تم روشن" : "تم تاریک"}
              aria-label="تغییر تم"
            >
              {theme === "dark" ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"
                  />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"
                  />
                </svg>
              )}
            </button>

            {/* آیکون جستجو - فقط در دسکتاپ نمایش داده می‌شود */}
            <SearchTrigger
              className={`${styles.iconButton} ${styles.searchTrigger}`}
            />

            {/* وضعیت کاربر (ورود/پروفایل) */}
            <UserStatus />

            {/* آیکون سبد خرید با Dropdown - کلیک برای رفتن به صفحه سبد، Hover برای نمایش پیش‌نمایش */}
            <CartIcon />
          </div>

          {/* 🟢 Mobile Menu Toggle - سمت راست */}
          <div className={styles.toggleWrapper}>
            <button
              className={`${styles.mobileMenuToggle} ${
                isMobileMenuOpen ? styles.open : ""
              }`}
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
      <div
        className={`${styles.mobileMenuDrawer} ${
          isMobileMenuOpen ? styles.open : ""
        }`}
      >
        <div className={styles.mobileMenuTop}>
          <button
            className={`${styles.mobileMenuToggle} ${
              isMobileMenuOpen ? styles.open : ""
            }`}
            onClick={toggleMobileMenu}
            aria-label="منوی موبایل"
            aria-expanded={isMobileMenuOpen}
          >
            <span className={styles.hamburgerLine}></span>
            <span className={styles.hamburgerLine}></span>
            <span className={styles.hamburgerLine}></span>
          </button>
          <form
            onSubmit={handleMobileSearch}
            className={styles.mobileSearchForm}
          >
            <input
              type="text"
              placeholder="جستجو..."
              className={styles.mobileSearch}
              value={mobileSearchQuery}
              onChange={(e) => setMobileSearchQuery(e.target.value)}
            />
            <button
              type="submit"
              className={styles.mobileSearchButton}
              aria-label="جستجو"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                />
              </svg>
            </button>
          </form>
        </div>

        <div className={styles.mobileTabs}>
          <button
            onClick={() => setActiveMobileTab("menu")}
            className={`${styles.tabBtn} ${
              activeMobileTab === "menu" ? styles.active : ""
            }`}
          >
            منو
          </button>
          <button
            onClick={() => setActiveMobileTab("products")}
            className={`${styles.tabBtn} ${
              activeMobileTab === "products" ? styles.active : ""
            }`}
          >
            محصولات
          </button>
          <button
            onClick={() => setActiveMobileTab("articles")}
            className={`${styles.tabBtn} ${
              activeMobileTab === "articles" ? styles.active : ""
            }`}
          >
            مقالات
          </button>
        </div>

        <div className={styles.mobileMenuContent}>
          {activeMobileTab === "menu" && (
            <ul className={styles.mobileNavList}>
              <li className={styles.mobileCategoryGroup}>
                <Link
                  href="/"
                  onClick={closeMobileMenu}
                  className={styles.mobileCategoryTitle}
                >
                  صفحه اصلی
                </Link>
              </li>
              <li className={styles.mobileCategoryGroup}>
                <Link
                  href="/articles"
                  onClick={closeMobileMenu}
                  className={styles.mobileCategoryTitle}
                >
                  مقالات
                </Link>
              </li>
              <li className={styles.mobileCategoryGroup}>
                <Link
                  href="/courses"
                  onClick={closeMobileMenu}
                  className={styles.mobileCategoryTitle}
                >
                  دوره‌ها
                </Link>
              </li>
              <li className={styles.mobileCategoryGroup}>
                <Link
                  href="/services"
                  onClick={closeMobileMenu}
                  className={styles.mobileCategoryTitle}
                >
                  خدمات
                </Link>
              </li>
              <li className={styles.mobileCategoryGroup}>
                <Link
                  href="/about-us"
                  onClick={closeMobileMenu}
                  className={styles.mobileCategoryTitle}
                >
                  درباره ما
                </Link>
              </li>
              <li className={styles.mobileCategoryGroup}>
                <Link
                  href="/contact-us"
                  onClick={closeMobileMenu}
                  className={styles.mobileCategoryTitle}
                >
                  تماس با ما
                </Link>
              </li>
            </ul>
          )}

          {activeMobileTab === "products" && (
            <ul className={styles.mobileNavList}>
              {productCategories.map((cat) => (
                <li key={cat.id} className={styles.mobileCategoryGroup}>
                  <Link
                    href={`/products/${cat.slug}`}
                    onClick={closeMobileMenu}
                    className={styles.mobileCategoryTitle}
                  >
                    {cat.name}
                  </Link>
                  {Array.isArray(cat.subCategories) &&
                    cat.subCategories.length > 0 && (
                      <ul className={styles.mobileSubList}>
                        {cat.subCategories.map((sub) => (
                          <li key={sub.id}>
                            <Link
                              href={`/products/${cat.slug}/${sub.slug}`}
                              onClick={closeMobileMenu}
                            >
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

          {activeMobileTab === "articles" && (
            <ul className={styles.mobileNavList}>
              {articleCategories.map((cat) => (
                <li key={cat.id} className={styles.mobileCategoryGroup}>
                  <Link
                    href={`/articles?category=${cat.slug}`}
                    onClick={closeMobileMenu}
                    className={styles.mobileCategoryTitle}
                  >
                    {cat.name}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/articles"
                  onClick={closeMobileMenu}
                  className={styles.mobileCategoryTitle}
                  style={{ color: "var(--color-accent, #f39c12)" }}
                >
                  مشاهده همه مقالات
                </Link>
              </li>
            </ul>
          )}
        </div>
      </div>

      <div
        className={`${styles.mobileMenuOverlay} ${
          isMobileMenuOpen ? styles.open : ""
        }`}
        onClick={closeMobileMenu}
      />

      {/* MegaMenus */}
      {isClient && (
        <>
          {/* Products MegaMenu */}
          <div
            className={`${styles.megaMenu} ${
              activeMegaMenu === "products" ? styles.megaMenuVisible : ""
            }`}
            onMouseEnter={() => handleMouseEnter("products")}
            onMouseLeave={handleMouseLeave}
            role="menu"
            aria-label="منوی دسته‌بندی محصولات"
            aria-hidden={activeMegaMenu !== "products"}
          >
            <span className={styles.megaBorder} aria-hidden="true" />
            <div className={styles.megaMenuGrid}>
              {productCategories.map((cat) => (
                <div key={cat.id} className={styles.megaMenuColumn}>
                  <Link
                    href={`/products/${cat.slug}`}
                    className={styles.categoryTitle}
                  >
                    {cat.name}
                  </Link>
                  {cat.subCategories?.length > 0 && (
                    <ul className={styles.subCategoryList}>
                      {cat.subCategories.map((sub) => (
                        <li key={sub.id}>
                          <Link href={`/products/${cat.slug}/${sub.slug}`}>
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

          {/* Articles MegaMenu */}
          <div
            className={`${styles.megaMenu} ${
              activeMegaMenu === "articles" ? styles.megaMenuVisible : ""
            }`}
            onMouseEnter={() => handleMouseEnter("articles")}
            onMouseLeave={handleMouseLeave}
            role="menu"
            aria-label="منوی دسته‌بندی مقالات"
            aria-hidden={activeMegaMenu !== "articles"}
          >
            <span className={styles.megaBorder} aria-hidden="true" />
            <div className={styles.megaMenuGrid}>
              {articleCategories.map((cat) => (
                <div key={cat.id} className={styles.megaMenuColumn}>
                  <Link
                    href={`/articles?category=${cat.slug}`}
                    className={styles.categoryTitle}
                  >
                    {cat.image && (
                      <div className={styles.articleImage}>
                        <Image
                          src={cat.image}
                          alt={cat.name}
                          fill
                          sizes="(max-width: 768px) 100vw, 300px"
                        />
                      </div>
                    )}
                    {cat.name}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <SearchOverlay />
    </>
  );
};

export default NavbarClient;
