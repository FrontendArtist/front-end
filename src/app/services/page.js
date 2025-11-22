/**
 * Services Page - Main Listing Page
 * 
 * PURPOSE:
 * Displays all available services in a responsive grid layout.
 * Implements Server-Side Rendering (SSR) for optimal SEO and performance.
 * 
 * ARCHITECTURE COMPLIANCE:
 * ✅ Server Component (async function, no 'use client')
 * ✅ Uses domain API layer (servicesApi.js) instead of direct fetch
 * ✅ Follows project structure: /src/app/services/page.js
 * ✅ Imports ServiceGrid from modules for composition
 * ✅ Uses SCSS modules for styling
 * 
 * DATA FLOW (SSR):
 * 1. Next.js calls this component on the server
 * 2. getAllServices() is awaited before rendering
 * 3. Data flows through: Strapi → apiClient → servicesApi → this page
 * 4. Component renders with data on server
 * 5. Complete HTML is sent to browser
 * 6. No client-side loading states needed
 * 
 * WHY SSR:
 * - Better SEO: Search engines see complete content
 * - Faster initial render: No client-side fetch delay
 * - Better UX: Users see content immediately
 * - Reduced client bundle: No fetch code in JavaScript
 * 
 * @module app/services/page
 */

import ListGuard from '@/components/layout/ListGuard';
import ServiceGrid from '@/modules/services/ServiceGrid/ServiceGrid';
import { getServicesPaginated } from '@/lib/servicesApi';
import styles from './services.module.scss';

/**
 * SEO Metadata for Services Page
 * 
 * This metadata is used by Next.js to generate:
 * - <title> tag
 * - <meta name="description"> tag
 * - Open Graph tags for social sharing
 * - Twitter Card tags
 * 
 * IMPORTANT: Keep synchronized with content for consistency
 */
export const metadata = {
  title: 'خدمات ما | طرح الهی',
  description: 'در این بخش می‌توانید با خدمات ما آشنا شوید و بر اساس نیاز خود انتخاب کنید.',
};

/**
 * Services Page Component
 * 
 * COMPONENT TYPE: Server Component (default in App Router)
 * - Async function allows await at component level
 * - No useState, useEffect, or browser APIs
 * - Executes only on server, never on client
 * 
 * ARCHITECTURAL LAYERS INVOLVED:
 * 1. This Page Component (UI orchestration)
 * 2. ServiceGrid Module (grid layout and card rendering)
 * 3. servicesApi.js (domain-specific data fetching)
 * 4. apiClient.js (HTTP communication)
 * 5. strapiUtils.js (data formatting)
 * 6. Strapi Backend (data source)
 * 
 * ERROR HANDLING:
 * - getAllServices() returns [] on error (never throws)
 * - ServiceGrid handles empty array with EmptyState
 * - Page never crashes, always renders something
 * 
 * EMPTY STATE FLOW:
 * If no services → ServiceGrid displays "هیچ خدمتی ثبت نشده است"
 * 
 * @returns {Promise<JSX.Element>} Rendered services page
 */
export default async function ServicesPage({ searchParams: spPromise }) {
  // ============================================================================
  // DATA FETCHING (SSR)
  // ============================================================================
  
  /**
   * Fetch paginated services from Strapi via API abstraction layer
   * 
   * جریان داده (Data Flow):
   * این صفحه → getServicesPaginated() → apiClient → Strapi
   * 
   * WHY PAGINATION:
   * ✅ فقط صفحه اول (PAGE_SIZE = 2) در SSR واکشی می‌شود
   * ✅ بارگذاری سریع‌تر صفحه
   * ✅ بقیه آیتم‌ها با دکمه "بارگذاری بیشتر" از سمت کلاینت
   * ✅ بهبود تجربه کاربری و کاهش حجم اولیه
   * 
   * WHY NOT getAllServices():
   * ❌ const services = await getAllServices()
   *    - همه خدمات رو یکجا می‌آره (سنگین)
   *    - بارگذاری اولیه کند می‌شه
   *    - کاربر باید منتظر همه داده‌ها بمونه
   * 
   * ✅ const result = await getServicesPaginated(1, 2)
   *    - فقط 2 خدمت اول (سریع)
   *    - بقیه با Load More
   *    - تجربه کاربری بهتر
   * 
   * EXECUTION CONTEXT:
   * - This runs on the server during page request
   * - Blocks rendering until FIRST PAGE data is fetched
   * - Initial data is embedded in HTML
   * - More data loaded client-side on demand
   */
  const searchParams = await spPromise;
  const normalizedSearchParams =
    searchParams && typeof searchParams.entries === 'function'
      ? Object.fromEntries(searchParams.entries())
      : searchParams || {};
  const hasFilters = Object.keys(normalizedSearchParams).length > 0;
  const result = await getServicesPaginated(1, 2, 'createdAt:desc');
  const services = result.data;
  
  // ============================================================================
  // COMPONENT RENDERING
  // ============================================================================
  
  return (
    <main className={styles.servicesPage}>
      <div className="container">
        
        {/* ================================================================== */}
        {/* HERO SECTION                                                       */}
        {/* ================================================================== */}
        {/* 
          Page header with title and description
          - Centered layout for emphasis
          - Follows design tokens from styles.md
          - Responsive typography (32px → 28px → 24px)
        */}
        <header className={styles.servicesPage__hero}>
          <h1 className={styles.servicesPage__title}>
            خدمات ما
          </h1>
          <p className={styles.servicesPage__subtitle}>
            در این بخش می‌توانید با خدمات ما آشنا شوید و بر اساس نیاز خود انتخاب کنید.
          </p>
        </header>
        
        {/* ================================================================== */}
        {/* SERVICES GRID                                                      */}
        {/* ================================================================== */}
        {/*
          Grid of service cards with responsive layout
          
          COMPONENT PROPS:
          - initialServices: Array of service objects from Strapi
          
          GRID BEHAVIOR:
          - Client Component for potential future interactivity
          - Currently just displays static data
          - Handles empty state internally
          
          RESPONSIVE LAYOUT:
          - Desktop (>960px): 4 columns
          - Tablet (768px-960px): 3 columns
          - Mobile (<768px): 2 columns
          
          DATA SHAPE:
          Each service object contains:
          {
            id: number,
            slug: string,
            title: string,
            description: string,
            image: { url: string, alt: string },
            link: string | null
          }
        */}
        <ListGuard
          data={services}
          hasFilters={hasFilters}
          entityName="خدمت"
          resetLink="/services"
        >
          <ServiceGrid initialServices={services} />
        </ListGuard>
        
      </div>
    </main>
  );
}

/**
 * ARCHITECTURAL NOTES:
 * 
 * 1. SEPARATION OF CONCERNS
 *    ├─ This page: Route handler and data orchestration
 *    ├─ ServiceGrid: Layout and rendering logic
 *    ├─ ServiceCard: Individual card presentation
 *    ├─ servicesApi: Data fetching and business logic
 *    └─ apiClient: HTTP communication
 * 
 * 2. DATA FLOW VISUALIZATION
 *    Browser Request → Next.js → ServicesPage (this file)
 *                                      ↓
 *                              getAllServices()
 *                                      ↓
 *                                 apiClient()
 *                                      ↓
 *                              Strapi Backend
 *                                      ↓
 *                           formatStrapiServices()
 *                                      ↓
 *                               ServiceGrid
 *                                      ↓
 *                              ServiceCard(s)
 *                                      ↓
 *                            HTML Response
 * 
 * 3. IMPLEMENTED FEATURES
 *    ✅ Pagination با Load More button
 *    ✅ واکشی صفحه اول با getServicesPaginated()
 *    ✅ بارگذاری تدریجی برای بهبود performance
 * 
 * 4. FUTURE ENHANCEMENTS
 *    - Add breadcrumbs navigation
 *    - Implement filtering by category
 *    - Add search functionality
 *    - Add loading.js for Suspense boundary
 *    - Add error.js for error boundary
 * 
 * 5. TESTING STRATEGY
 *    - Mock getAllServices() to test rendering
 *    - Test with empty array for EmptyState
 *    - Test with various service counts
 *    - Visual regression testing for responsive layout
 * 
 * 6. PERFORMANCE CONSIDERATIONS
 *    - SSR eliminates loading spinners
 *    - Consider adding revalidation for cached data
 *    - Images should use Next.js Image component (check ServiceCard)
 *    - Monitor bundle size if adding client-side features
 */

