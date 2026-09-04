'use client';

import { useState, useMemo, useEffect } from 'react';
import { Sun, Moon, ChevronDown, ChevronUp, List } from 'lucide-react';
import styles from './page.module.scss';

/**
 * Decode common HTML entities for clean TOC button titles
 */
function decodeEntities(str) {
  if (!str) return '';
  return str
    .replace(/&zwnj;/gi, '\u200c')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

/**
 * ArticleReader Component
 * 
 * Renders HTML article content with automatic Table of Contents (TOC) extraction from <h2> and <h3> tags,
 * sticky sidebar with active heading scroll spy, and light/dark theme switching.
 */
export default function ArticleReader({ excerpt, content }) {
  const [theme, setTheme] = useState('dark');
  const [isTocOpen, setIsTocOpen] = useState(false);
  const [activeId, setActiveId] = useState('');

  const isLight = theme === 'light';

  // ─── 1. Smart Auto TOC Extraction from HTML ────────────────────────────────
  const { tocItems, cleanContent } = useMemo(() => {
    if (!content || typeof content !== 'string') {
      return { tocItems: [], cleanContent: '' };
    }

    let cleaned = content;

    // Handle legacy <nav class="table-of-contents"> tags without wiping article text
    const navMatch = cleaned.match(/<nav[^>]*table-of-contents[^>]*>([\s\S]*?)<\/nav>/i);
    if (navMatch) {
      const innerNav = navMatch[1];
      const containsBodyContent = /<(?:h[1-6]|p|table|blockquote|ul|ol|figure)\b/i.test(innerNav);
      if (containsBodyContent) {
        // <nav> wraps body content: unwrap <nav> open and close tags
        cleaned = cleaned
          .replace(/<nav[^>]*table-of-contents[^>]*>/gi, '')
          .replace(/<\/nav>/gi, '');
      } else {
        // <nav> only contains a standalone TOC list: remove it
        cleaned = cleaned.replace(/<nav[^>]*table-of-contents[^>]*>[\s\S]*?<\/nav>/gi, '');
      }
    }

    // Also strip divider HR tags if present
    cleaned = cleaned.replace(/<hr\s+class(?:Name)?=["']divider["']\s*\/?>/gi, '');

    // Strip redundant outer or nested <article> tags to prevent duplicate nested <article> in DOM
    cleaned = cleaned
      .replace(/<article[^>]*>/gi, '')
      .replace(/<\/article>/gi, '');

    const items = [];
    let headingCounter = 0;

    // Regex matching all <h2> and <h3> tags
    // Group 1: heading level ('2' or '3')
    // Group 2: existing attributes
    // Group 3: inner HTML / text content of the heading
    const headingRegex = /<h([23])([^>]*)>([\s\S]*?)<\/h\1>/gi;

    cleaned = cleaned.replace(headingRegex, (match, levelStr, attrs, innerHtml) => {
      headingCounter += 1;
      const level = parseInt(levelStr, 10);

      // Check if tag already contains an id attribute
      const idMatch = attrs.match(/\bid=["']([^"']+)["']/i);
      let id = idMatch ? idMatch[1] : '';

      // If no id exists, generate a dynamic unique ID
      if (!id) {
        id = `heading-${headingCounter}`;
        attrs = ` id="${id}"${attrs}`;
      }

      // Strip inner HTML tags to get clean plain text for TOC item display
      const plainText = decodeEntities(innerHtml.replace(/<[^>]+>/g, '').trim());

      if (plainText) {
        items.push({
          id,
          text: plainText,
          level,
        });
      }

      return `<h${levelStr}${attrs}>${innerHtml}</h${levelStr}>`;
    });

    return { tocItems: items, cleanContent: cleaned };
  }, [content]);

  // ─── 2. Body background class toggle for Light/Dark Mode ───────────────────
  useEffect(() => {
    if (isLight) {
      document.body.classList.add('article-light-mode-active');
    } else {
      document.body.classList.remove('article-light-mode-active');
    }

    return () => {
      document.body.classList.remove('article-light-mode-active');
    };
  }, [isLight]);

  // ─── 3. Scroll Spy: Active Heading Scroll Highlighting ─────────────────────
  useEffect(() => {
    if (!tocItems || tocItems.length === 0) return;

    const handleScroll = () => {
      const scrollBuffer = 110; // Offset for navbar (100px) + small buffer
      let currentId = tocItems[0].id;

      for (const item of tocItems) {
        const el = document.getElementById(item.id);
        if (el) {
          const top = el.getBoundingClientRect().top + window.scrollY;
          if (top <= window.scrollY + scrollBuffer) {
            currentId = item.id;
          } else {
            break;
          }
        }
      }

      setActiveId(currentId);
    };

    // Initial evaluation after painting
    const timer = setTimeout(() => {
      handleScroll();
      window.addEventListener('scroll', handleScroll, { passive: true });
    }, 100);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [tocItems]);

  // ─── 4. Smooth Scroll to Heading on TOC Link Click ─────────────────────────
  const handleTocClick = (e, id) => {
    e.preventDefault();
    setActiveId(id);
    setIsTocOpen(false);

    // Closing the TOC on mobile changes the document flow/height.
    // Calculate the target scroll position after the TOC collapses.
    setTimeout(() => {
      const element = document.getElementById(id);
      if (element) {
        const navbarHeight = 100; // Header height is 100px
        const currentScroll = window.pageYOffset || document.documentElement.scrollTop || window.scrollY || 0;
        const elementTop = element.getBoundingClientRect().top + currentScroll;
        const targetPosition = elementTop - navbarHeight;

        window.scrollTo({
          top: Math.max(0, targetPosition),
          behavior: 'smooth',
        });
      }
    }, 30);
  };

  return (
    <div className={`${styles.readerWrapper} ${isLight ? styles.lightTheme : ''}`}>
      {/* Article Reader Toolbar */}
      <div className={styles.readerToolbar}>
        <button
          type="button"
          onClick={() => setTheme(isLight ? 'dark' : 'light')}
          className={styles.themeToggleBtn}
          aria-label="تغییر حالت مطالعه"
        >
          {isLight ? (
            <>
              <Moon size={16} />
              <span>حالت شب</span>
            </>
          ) : (
            <>
              <Sun size={16} />
              <span>حالت روز</span>
            </>
          )}
        </button>
      </div>

      {/* Excerpt section */}
      {excerpt && <div className={styles.excerpt}>{excerpt}</div>}

      {/* Main Layout: Sticky TOC Sidebar (Right) + Article Content (Left) */}
      <div className={styles.articleLayout}>
        {/* Render Sticky TOC Sidebar if at least 1 heading is extracted */}
        {tocItems.length > 0 && (
          <aside className={styles.tocSidebar}>
            {/* Mobile Header / Toggle */}
            <div
              className={styles.tocMobileToggle}
              onClick={() => setIsTocOpen(!isTocOpen)}
            >
              <span>
                <List size={16} style={{ display: 'inline', marginLeft: '6px' }} />
                فهرست مطالب
              </span>
              {isTocOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>

            {/* Desktop & Mobile TOC Links Container */}
            <div className={`${styles.tocContent} ${isTocOpen ? styles.tocOpen : ''}`}>
              <h3>فهرست مطالب</h3>
              <ul>
                {tocItems.map((item) => {
                  const isActive = activeId === item.id;
                  const isSub = item.level === 3;
                  return (
                    <li
                      key={item.id}
                      className={isSub ? styles.subHeading : ''}
                    >
                      <a
                        href={`#${item.id}`}
                        className={isActive ? styles.active : ''}
                        data-active={isActive ? 'true' : 'false'}
                        onClick={(e) => handleTocClick(e, item.id)}
                      >
                        {item.text}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          </aside>
        )}

        {/* Article Body Content */}
        {cleanContent && (
          <article
            className={styles.content}
            dangerouslySetInnerHTML={{ __html: cleanContent }}
          />
        )}
      </div>
    </div>
  );
}

