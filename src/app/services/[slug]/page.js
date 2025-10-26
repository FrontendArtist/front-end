/**
 * Service Single Page - Dynamic Route for Individual Service Details
 * 
 * PURPOSE:
 * Displays detailed information for a single service based on URL slug.
 * Implements Server-Side Rendering (SSR) for optimal SEO and performance.
 * 
 * ARCHITECTURE COMPLIANCE:
 * ✅ Server Component (async function, no 'use client')
 * ✅ Uses domain API layer (servicesApi.js) instead of direct fetch
 * ✅ Follows project structure: /src/app/services/[slug]/page.js
 * ✅ Imports ServiceSingle from modules for composition
 * ✅ Uses Next.js 15 async params pattern
 * ✅ Handles invalid slugs with EmptyState
 * 
 * DATA FLOW (SSR):
 * 1. User navigates to /services/some-slug
 * 2. Next.js extracts 'some-slug' from URL and passes it as params
 * 3. getServiceBySlug(slug) fetches data from Strapi via API layer
 * 4. Data flows: Strapi → apiClient → servicesApi → this page
 * 5. Component renders with data on server
 * 6. Complete HTML is sent to browser
 * 7. No client-side loading states needed
 * 
 * ERROR HANDLING:
 * - If slug is invalid or service not found, returns EmptyState
 * - Graceful degradation: no crashes, always renders something
 * - Error logged on server for debugging
 * 
 * SEO BENEFITS:
 * - Dynamic metadata generation per service
 * - Complete content rendered on server
 * - Search engines can index individual service pages
 * - Fast Time to First Byte (TTFB)
 * 
 * @module app/services/[slug]/page
 */

import Image from 'next/image';
import Link from 'next/link';
import { getServiceBySlug } from '@/lib/servicesApi';
import ServiceSingle from '@/modules/services/ServiceSingle/ServiceSingle';
import styles from './page.module.scss';

/**
 * Generate Dynamic Metadata for SEO
 * 
 * This function runs before the page renders and generates:
 * - <title> tag with service title
 * - <meta name="description"> with service description
 * - Open Graph tags for social sharing
 * 
 * EXECUTION:
 * - Runs on server during page build/request
 * - Fetches service data independently from page component
 * - Next.js automatically caches this between metadata and page render
 * 
 * @param {Object} context - Next.js context object
 * @param {Object} context.params - URL parameters (Promise in Next.js 15)
 * @returns {Promise<Object>} Metadata object for Next.js
 */
export async function generateMetadata({ params }) {
  // Next.js 15: params is a Promise, must await it
  const { slug } = await params;
  
  // Fetch service data for metadata
  const service = await getServiceBySlug(slug);
  
  // Fallback metadata if service not found
  if (!service) {
    return {
      title: 'خدمت یافت نشد | طرح الهی',
      description: 'خدمت مورد نظر یافت نشد.',
    };
  }
  
  // Generate rich metadata for found service
  return {
    title: `${service.title} | خدمات طرح الهی`,
    description: service.description || 'اطلاعات بیشتر درباره این خدمت',
  };
}

/**
 * Service Single Page Component
 * 
 * COMPONENT TYPE: Server Component (default in App Router)
 * - Async function allows await at component level
 * - No useState, useEffect, or browser APIs
 * - Executes only on server, never on client
 * 
 * ARCHITECTURAL LAYERS INVOLVED:
 * 1. This Page Component (route handler & data orchestration)
 * 2. ServiceSingle Module (detailed service layout)
 * 3. servicesApi.js (domain-specific data fetching)
 * 4. apiClient.js (HTTP communication)
 * 5. strapiUtils.js (data formatting)
 * 6. Strapi Backend (data source)
 * 
 * URL PATTERN:
 * - /services/[slug] → slug is dynamic parameter
 * - Example: /services/astrology-consultation
 * 
 * EMPTY STATE HANDLING:
 * - If slug is invalid or service doesn't exist
 * - Displays user-friendly message instead of 404
 * - Better UX than raw error page
 * 
 * @param {Object} context - Next.js page context
 * @param {Object} context.params - URL parameters (Promise in Next.js 15)
 * @returns {Promise<JSX.Element>} Rendered service detail page
 */
export default async function ServiceSinglePage({ params }) {
  // ============================================================================
  // PARAMS EXTRACTION (Next.js 15 Pattern)
  // ============================================================================
  
  /**
   * In Next.js 15, params is a Promise that must be awaited
   * This is part of the new async request handling model
   * 
   * Previous versions: const { slug } = params;
   * Next.js 15+: const { slug } = await params;
   */
  const { slug } = await params;
  
  // ============================================================================
  // DATA FETCHING (SSR)
  // ============================================================================
  
  /**
   * Fetch single service by slug from Strapi via API abstraction layer
   * 
   * WHY NOT fetch() DIRECTLY:
   * ❌ const res = await fetch(`http://localhost:1337/api/services?filters[slug][$eq]=${slug}`)
   *    - Exposes Strapi URL structure to page component
   *    - Duplicates filtering logic across pages
   *    - Hard to test, mock, or change backend
   *    - Mixes data fetching with UI concerns
   * 
   * ✅ const service = await getServiceBySlug(slug)
   *    - Clean, semantic API that reads like natural language
   *    - Backend implementation can change freely
   *    - Easy to test with mocked API layer
   *    - Consistent error handling across all service pages
   * 
   * EXECUTION CONTEXT:
   * - Runs on server during page request
   * - Blocks rendering until data is fetched
   * - Data is embedded in initial HTML payload
   * - No loading spinner needed on client
   * 
   * RETURN VALUE:
   * - Object with service data if found
   * - null if service doesn't exist or error occurs
   */
  const service = await getServiceBySlug(slug);
  
  // ============================================================================
  // EMPTY STATE HANDLING
  // ============================================================================
  
  /**
   * Handle case where service doesn't exist or slug is invalid
   * 
   * WHY NOT notFound():
   * - notFound() would trigger Next.js 404 page (harsh UX)
   * - EmptyState provides context-aware message (better UX)
   * - User understands they're in services section
   * - Can include navigation links to other services
   * 
   * ALTERNATIVE APPROACH (if preferred):
   * - Could use notFound() from 'next/navigation'
   * - Would require creating not-found.js in this directory
   * - Current approach is more graceful and user-friendly
   */
  if (!service) {
    return (
      <main className={styles.serviceSinglePage}>
        <div className="container">
          {/* Breadcrumbs for navigation context */}
          <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
            <Link href="/" className={styles.breadcrumbs__link}>
              خانه
            </Link>
            <span className={styles.breadcrumbs__separator}>/</span>
            <Link href="/services" className={styles.breadcrumbs__link}>
              خدمات
            </Link>
            <span className={styles.breadcrumbs__separator}>/</span>
            <span className={styles.breadcrumbs__current}>خدمت یافت نشد</span>
          </nav>
          
          {/* Empty State Component */}
          <div className={styles.emptyState}>
            <h1 className={styles.emptyState__title}>خدمت مورد نظر یافت نشد</h1>
            <p className={styles.emptyState__message}>
              متأسفانه خدمتی با این آدرس وجود ندارد. لطفاً به صفحه خدمات بازگردید.
            </p>
            <Link href="/services" className={styles.emptyState__button}>
              بازگشت به خدمات
            </Link>
          </div>
        </div>
      </main>
    );
  }
  
  // ============================================================================
  // COMPONENT RENDERING (Service Found)
  // ============================================================================
  
  /**
   * Main page layout structure:
   * 
   * 1. Breadcrumbs Navigation
   *    - Shows current location in site hierarchy
   *    - Helps users understand where they are
   *    - Improves SEO with structured navigation
   * 
   * 2. ServiceSingle Component
   *    - Renders detailed service information
   *    - Handles layout, styling, and presentation
   *    - Receives clean, formatted service data
   *    - Includes image, title, description, and CTA link
   * 
   * ACCESSIBILITY:
   * - <main> landmark for main content area
   * - <nav> with aria-label for breadcrumbs
   * - Semantic HTML structure
   * - Proper heading hierarchy (h1 in ServiceSingle)
   */
  return (
    <main className={styles.serviceSinglePage}>
      <div className="container">
        
        {/* ================================================================== */}
        {/* BREADCRUMBS NAVIGATION                                             */}
        {/* ================================================================== */}
        {/*
          Hierarchical navigation showing:
          خانه / خدمات / [Service Title]
          
          BENEFITS:
          - User orientation: Shows current location in site
          - Navigation: Quick way to move up the hierarchy
          - SEO: Helps search engines understand site structure
          - Accessibility: Screen readers announce navigation context
          
          STYLING:
          - Inline horizontal layout with separators
          - Primary color for links, muted for current page
          - Hover effects on clickable links
          - Responsive font sizing
        */}
        <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
          <Link href="/" className={styles.breadcrumbs__link}>
            خانه
          </Link>
          <span className={styles.breadcrumbs__separator}>/</span>
          <Link href="/services" className={styles.breadcrumbs__link}>
            خدمات
          </Link>
          <span className={styles.breadcrumbs__separator}>/</span>
          <span className={styles.breadcrumbs__current}>{service.title}</span>
        </nav>
        
        {/* ================================================================== */}
        {/* SERVICE DETAIL CONTENT                                             */}
        {/* ================================================================== */}
        {/*
          ServiceSingle Component renders:
          - Service image (responsive, optimized with Next.js Image)
          - Service title (large, bold, primary color)
          - Full description (readable line height, card text color)
          - Call-to-Action link (styled as button, external or internal)
          
          LAYOUT:
          - Desktop: Two-column grid (image right, content left in RTL)
          - Mobile: Single column (image top, content bottom)
          
          DATA PASSED:
          - service object with all fields from Strapi
          - Already formatted by strapiUtils
          - Includes: id, slug, title, description, image, link
          
          COMPONENT RESPONSIBILITY:
          - ServiceSingle handles all presentation logic
          - This page only handles routing and data fetching
          - Clean separation of concerns
        */}
        <ServiceSingle service={service} />
        
      </div>
    </main>
  );
}

/**
 * ARCHITECTURAL NOTES:
 * 
 * 1. SEPARATION OF CONCERNS
 *    ├─ This page: Route handling, params extraction, data orchestration
 *    ├─ ServiceSingle: Layout and detailed presentation
 *    ├─ servicesApi: Data fetching and business logic
 *    ├─ apiClient: HTTP communication with Strapi
 *    └─ strapiUtils: Data transformation and formatting
 * 
 * 2. DATA FLOW VISUALIZATION
 *    Browser → /services/slug → Next.js Router
 *                                      ↓
 *                         ServiceSinglePage (this file)
 *                                      ↓
 *                          Extract slug from params
 *                                      ↓
 *                            getServiceBySlug(slug)
 *                                      ↓
 *                                 apiClient()
 *                                      ↓
 *                        Strapi: /api/services?filters[slug][$eq]=slug
 *                                      ↓
 *                          formatStrapiServices()
 *                                      ↓
 *                               ServiceSingle
 *                                      ↓
 *                            HTML Response
 * 
 * 3. ERROR HANDLING STRATEGY
 *    Level 1: servicesApi catches HTTP errors → returns null
 *    Level 2: This page checks for null → shows EmptyState
 *    Level 3: ServiceSingle checks for null (defensive) → returns null
 *    Result: No crashes, always graceful degradation
 * 
 * 4. SEO OPTIMIZATION
 *    - Dynamic metadata per service (generateMetadata)
 *    - Server-side rendering for complete HTML
 *    - Semantic HTML structure (main, nav, h1)
 *    - Breadcrumbs for site hierarchy
 *    - Fast initial load (no client-side fetch delay)
 * 
 * 5. FUTURE ENHANCEMENTS
 *    - Add structured data (JSON-LD) for rich snippets
 *    - Implement social sharing buttons
 *    - Add "Related Services" section
 *    - Include user reviews/testimonials
 *    - Add FAQ accordion for common questions
 *    - Implement loading.js for Suspense boundary
 *    - Add error.js for error boundary
 *    - Consider ISR (Incremental Static Regeneration) for caching
 * 
 * 6. TESTING STRATEGY
 *    - Mock getServiceBySlug() with valid data
 *    - Test with invalid slug for EmptyState
 *    - Test metadata generation
 *    - Test breadcrumbs navigation
 *    - Visual regression testing for layout
 *    - Test with/without service.link field
 * 
 * 7. PERFORMANCE CONSIDERATIONS
 *    - SSR eliminates client-side loading states
 *    - Consider adding revalidation: { next: { revalidate: 3600 } }
 *    - Image optimization handled by Next.js Image component
 *    - Minimal JavaScript bundle (no client components)
 *    - Fast Time to First Byte (TTFB)
 * 
 * 8. ACCESSIBILITY
 *    - Semantic HTML landmarks (main, nav)
 *    - ARIA labels for navigation (aria-label="Breadcrumb")
 *    - Proper heading hierarchy (h1 for page title)
 *    - Keyboard navigation support
 *    - Screen reader friendly structure
 */
