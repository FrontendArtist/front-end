/**
 * Services Listing Page - /services
 * 
 * Purpose:
 * - Main listing page displaying all available services on the site
 * - Fetches service data from Strapi API on the server (SSR/ISR)
 * - Displays services in a responsive grid layout using ServiceCard components
 * - Includes a hero section with title and description
 * - Handles empty state when no services are available
 * 
 * Component Type: Server Component
 * - This is an async Server Component (Next.js App Router pattern)
 * - Data is fetched on the server during the rendering process
 * - No client-side JavaScript needed for initial render
 * - Provides better SEO and faster initial page load
 * 
 * Architecture:
 * - Follows "Server-First" principle from ARCHITECTURE_RULES.md
 * - Uses formatStrapiServices utility for data transformation
 * - Implements ISR (Incremental Static Regeneration) with revalidation
 * - Separates data fetching logic into dedicated function for clarity
 * 
 * Data Flow:
 * 1. getInitialServices() fetches data from Strapi API
 * 2. formatStrapiServices() transforms raw data into clean format
 * 3. Formatted data is passed to ServiceCard components via grid
 * 4. Page renders with all data available (no loading states needed)
 * 
 * SEO:
 * - Metadata is exported for proper SEO optimization
 * - Title and description are in Persian matching the site language
 */

import { formatStrapiServices } from '@/lib/strapiUtils';
import { getServices } from '@/lib/api'; // Import from centralized API layer
import ServiceCard from '@/components/cards/ServiceCard/ServiceCard';
import styles from './services.module.scss';

/**
 * Page Metadata for SEO
 * - Exported as metadata object for Next.js App Router
 * - Used in <head> for title and meta description tags
 * - Persian language content for proper localization
 */
export const metadata = {
  title: 'خدمات | وب‌سایت ما',
  description: 'تمامی خدمات و راهکارهای ما را بررسی کنید.',
};

/**
 * Fetches Initial Services from Centralized API Layer
 * 
 * Refactored to use src/lib/api.js per ARCHITECTURE_RULES.md Rule 2.2
 * - No direct fetch() calls in components
 * - All API logic centralized in api.js
 * - Returns { data, error } format from API layer
 * - Handles data formatting with strapiUtils
 * 
 * Purpose:
 * - Fetches all services during server-side rendering
 * - Called during SSR or at ISR revalidation
 * - Handles errors gracefully with empty array fallback
 * 
 * Note: Unlike products/articles pages, this fetches ALL services at once
 * - No pagination or "Load More" functionality required per specs
 * - Assumes reasonable number of services (< 50 for performance)
 * 
 * @returns {Promise<Array>} Array of formatted service objects
 */
async function getInitialServices() {
  try {
    /**
     * Call centralized API function instead of direct fetch
     * - getServices handles URL construction
     * - getServices handles query parameters (populate, sort)
     * - getServices handles error scenarios
     * - Returns standardized { data, error } format
     * 
     * No parameters needed - getServices fetches all by design
     */
    const { data, error } = await getServices();

    // Check for API errors
    if (error) {
      console.error("API Error fetching services:", error);
      return [];
    }

    // Validate data structure
    if (!data) {
      console.warn("No data returned from services API");
      return [];
    }

    /**
     * Format the raw Strapi response
     * - data contains the raw Strapi response: { data: [...], meta: {...} }
     * - formatStrapiServices transforms it into clean service objects
     * - Extracts id, slug, title, description, image, link
     * - Handles image URL formatting and fallbacks
     */
    const formattedServices = formatStrapiServices(data);

    // Return the formatted array of service objects
    return formattedServices;

  } catch (error) {
    /**
     * Error Handling
     * - Logs error for debugging but doesn't crash the page
     * - Returns empty array so page can still render with empty state
     * - Allows graceful degradation if API is unavailable
     */
    console.error("Initial Services Fetch Error:", error);
    return [];
  }
}

/**
 * Services Page Component
 * 
 * Main page component that renders the services listing
 * - Async function allows using await for data fetching
 * - Executed on the server, not in the browser
 * - Returns JSX that will be sent as HTML to client
 * 
 * Structure:
 * 1. Hero section with title and subtitle
 * 2. Grid of service cards (or empty state if no services)
 * 
 * Responsive Design:
 * - Grid adjusts columns based on screen size (see SCSS file)
 * - Desktop: 3-4 columns
 * - Tablet: 2 columns
 * - Mobile: 1 column
 * 
 * @returns {Promise<JSX.Element>} Rendered page component
 */
export default async function ServicesPage() {
  // Fetch all services during server-side rendering
  // This await happens on the server, not in the browser
  const services = await getInitialServices();

  return (
    /**
     * Main Container
     * - Semantic <main> tag for accessibility
     * - .main class provides vertical padding from SCSS
     */
    <main className={styles.main}>
      {/**
       * Container Wrapper
       * - .container is a global class that provides:
       *   - Centered content
       *   - Max-width constraint
       *   - Horizontal padding
       * - Defined in global styles (base/_containers.scss or similar)
       */}
      <div className="container">
        
        {/**
         * Hero Section
         * - Introductory section at top of page
         * - Contains main title and descriptive subtitle
         * - Centered layout with bottom margin
         */}
        <header className={styles.hero}>
          {/**
           * Main Page Title
           * - <h1> for proper semantic hierarchy (only one per page)
           * - Persian text: "خدمات ما" (Our Services)
           * - Styled with large font size and gold color
           */}
          <h1 className={styles.title}>خدمات ما</h1>
          
          {/**
           * Hero Subtitle/Description
           * - Provides context about what services are offered
           * - Centered, smaller font than title
           * - Max-width for optimal readability
           */}
          <p className={styles.subtitle}>
            ما طیف گسترده‌ای از خدمات تخصصی را برای شما ارائه می‌دهیم. هر خدمت با دقت و تخصص طراحی شده تا نیازهای شما را برآورده کند.
          </p>
        </header>

        {/**
         * Conditional Rendering: Grid or Empty State
         * 
         * If services exist and array length > 0:
         * - Render grid of ServiceCard components
         * 
         * If no services (empty array):
         * - Render empty state message
         * 
         * This handles the case where:
         * - No services have been created in Strapi yet
         * - API fetch failed and returned empty array
         * - All services were filtered out due to missing data
         */}
        {services && services.length > 0 ? (
          /**
           * Services Grid
           * - Responsive CSS Grid layout (defined in SCSS)
           * - Each ServiceCard is a clickable link to /services/[slug]
           * - Grid automatically adjusts columns based on viewport
           * 
           * Key Prop:
           * - service.id ensures React can efficiently track each card
           * - Important for performance and avoiding render bugs
           */
          <div className={styles.grid}>
            {services.map((service) => (
              <ServiceCard 
                key={service.id}
                service={service}
              />
            ))}
          </div>
        ) : (
          /**
           * Empty State
           * - Displayed when no services are available
           * - Persian message: "Currently no services are registered"
           * - Centered with appropriate padding
           * - Maintains page layout even when empty
           * 
           * UX Considerations:
           * - Clear message explaining why page is empty
           * - Prevents confusing blank page
           * - Professional appearance even with no content
           */
          <div className={styles.emptyState}>
            <p className={styles.emptyMessage}>
              در حال حاضر هیچ خدمتی ثبت نشده است.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}

