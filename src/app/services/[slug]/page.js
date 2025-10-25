/**
 * Single Service Detail Page - /services/[slug]
 * 
 * Purpose:
 * - Individual detail page for a specific service
 * - Accessed via dynamic route using slug parameter (e.g., /services/my-service)
 * - Displays comprehensive service information with image and CTA
 * - Includes "Back" navigation to return to services listing
 * 
 * Component Type: Server Component
 * - This is an async Server Component (Next.js App Router pattern)
 * - Fetches data on the server based on URL slug parameter
 * - Implements SSG (Static Site Generation) with generateStaticParams
 * - Provides ISR (Incremental Static Regeneration) for updated content
 * - No client-side JavaScript needed for initial render
 * 
 * Architecture:
 * - Follows "Server-First" principle from ARCHITECTURE_RULES.md
 * - Uses Strapi API to fetch single service by slug
 * - Implements proper error handling with Next.js notFound()
 * - Generates static paths at build time for optimal performance
 * - Dynamic metadata for SEO optimization
 * 
 * Data Flow:
 * 1. Next.js extracts slug from URL params
 * 2. getServiceBySlug() fetches data from Strapi API
 * 3. Service data is formatted and validated
 * 4. Component renders with all data available (no loading states)
 * 5. If service not found, Next.js 404 page is displayed
 * 
 * Layout Structure:
 * - Back button navigation to /services
 * - Two-column layout: Image (right in RTL) + Details (left in RTL)
 * - Service title, description, and prominent CTA button
 * - Mobile: Stacks vertically (image on top)
 * 
 * SEO:
 * - generateMetadata provides dynamic title and description
 * - generateStaticParams enables static path generation
 * - Proper semantic HTML structure
 */

import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getServiceBySlug as fetchServiceBySlug, getServices } from '@/lib/api'; // Import from centralized API layer
import { getStrapiURL } from '@/lib/strapiUtils';
import styles from './page.module.scss';

/**
 * Fetches Single Service by Slug from Centralized API Layer
 * 
 * Refactored to use src/lib/api.js per ARCHITECTURE_RULES.md Rule 2.2
 * - No direct fetch() calls in components
 * - All API logic centralized in api.js
 * - Returns { data, error } format from API layer
 * 
 * Purpose:
 * - Retrieves detailed information for one specific service
 * - Called during server-side rendering for each service page
 * - Uses slug to filter/query the specific service
 * 
 * Data Formatting:
 * - Extracts description from Strapi rich text structure
 * - Formats image URL (relative to absolute)
 * - Provides fallback placeholder if image missing
 * - Handles missing or malformed data gracefully
 * 
 * @param {string} slug - URL-friendly identifier for the service
 * @returns {Promise<Object|null>} Formatted service object or null if not found
 */
async function getServiceBySlug(slug) {
  try {
    /**
     * Call centralized API function
     * - Handles URL construction and query parameters
     * - Implements ISR revalidation strategy (3600 seconds)
     * - Returns standardized { data, error } format
     */
    const { data, error } = await fetchServiceBySlug(slug);

    // Check for API errors
    if (error) {
      console.error("API Error fetching service:", error);
      return null;
    }

    // Validate data exists
    if (!data || !data.data || data.data.length === 0) {
      console.warn(`No service found with slug: ${slug}`);
      return null;
    }

    // Extract first item from results array (slug should be unique)
    const rawService = data.data[0];

    /**
     * Format Image Data
     * - Check if image exists
     * - Convert relative URL to absolute using getStrapiURL
     * - Provide fallback placeholder if missing
     * - Extract dimensions for Next.js Image optimization
     */
    let serviceImage = {
      url: 'https://picsum.photos/seed/service/800/600',
      alt: 'Service Placeholder',
      width: 800,
      height: 600
    };

    if (rawService.image && rawService.image.url) {
      serviceImage = {
        // Use getStrapiURL for consistent URL handling
        url: rawService.image.url.startsWith('http') 
          ? rawService.image.url 
          : getStrapiURL(rawService.image.url),
        // Use alternativeText for accessibility, fallback to title
        alt: rawService.image.alternativeText || rawService.title || 'Service Image',
        // Include dimensions for Next.js Image optimization
        width: rawService.image.width || 800,
        height: rawService.image.height || 600,
      };
    }

    /**
     * Extract Description from Rich Text
     * 
     * Strapi Rich Text Structure:
     * [{ type: "paragraph", children: [{ type: "text", text: "..." }] }]
     * 
     * Traverse structure to get actual text content
     * Using optional chaining (?.) to safely handle missing data
     */
    const descriptionText = (rawService.description && 
      rawService.description[0]?.children[0]?.text) || 
      'توضیحات این خدمت در دسترس نیست.'; // Fallback: "Description not available"

    /**
     * Return Formatted Service Object
     * Clean, consistent data structure ready for rendering
     * All fields are guaranteed to exist (with fallbacks)
     */
    return {
      id: rawService.id,
      slug: rawService.slug,
      title: rawService.title,
      description: descriptionText,
      image: serviceImage,
      /**
       * External link for CTA button
       * - Could be contact form, external service page, or booking link
       * - Null if not provided
       */
      link: rawService.link || null,
    };

  } catch (error) {
    /**
     * Error Handling
     * - Logs error for debugging
     * - Returns null instead of throwing
     * - Allows graceful fallback to 404 page
     */
    console.error("Failed to fetch service by slug:", error);
    return null;
  }
}

/**
 * Generate Static Params for Static Site Generation (SSG)
 * 
 * Refactored to use centralized API layer
 * - Fetches all services to extract slugs
 * - Used for Static Site Generation (SSG)
 * 
 * Purpose:
 * - Runs at build time to generate all service detail pages
 * - Next.js pre-renders a page for each slug
 * - Results in instant page loads (no server request needed)
 * 
 * Performance Benefits:
 * - Pages are pre-rendered at build time
 * - No API calls needed when users visit these pages
 * - Near-instant page loads
 * - Better SEO (fully rendered HTML)
 * 
 * @returns {Promise<Array>} Array of param objects with slug
 */
export async function generateStaticParams() {
  try {
    /**
     * Fetch all services from API layer
     * - getServices fetches all services (no pagination)
     * - Returns { data, error } format
     */
    const { data, error } = await getServices();

    if (error || !data || !data.data) {
      console.error("Failed to generate static params for services:", error);
      return [];
    }

    /**
     * Map Services to Param Objects
     * - Filter out services without slugs (data integrity)
     * - Extract only the slug field
     * - Return in format Next.js expects: [{ slug: 'value' }, ...]
     */
    return data.data
      .filter(service => service && service.slug)
      .map((service) => ({
        slug: service.slug, // Must match the [slug] folder name
      }));

  } catch (error) {
    /**
     * Error Handling
     * - Log error but don't crash build process
     * - Return empty array (no static pages generated)
     * - Pages can still be generated on-demand (ISR fallback)
     */
    console.error("Failed to generate static params for services:", error);
    return [];
  }
}

/**
 * Generate Dynamic Metadata for SEO
 * 
 * Purpose:
 * - Creates unique meta tags for each service page
 * - Improves SEO with descriptive title and description
 * - Better social media sharing (Open Graph)
 * 
 * How It Works:
 * 1. Receives params containing the slug
 * 2. Fetches the service data using getServiceBySlug
 * 3. Extracts title and description for meta tags
 * 4. Returns metadata object for Next.js to inject in <head>
 * 
 * Metadata Structure:
 * - title: Page title shown in browser tab and search results
 * - description: Meta description for search engines
 * - Can be extended with og:image, og:title, etc.
 * 
 * SEO Benefits:
 * - Each page has unique, descriptive title
 * - Search engines index with relevant keywords
 * - Better click-through rates from search results
 * - Improved social media preview cards
 * 
 * @param {Object} params - Route parameters
 * @param {string} params.slug - Service slug from URL
 * @returns {Promise<Object>} Metadata object for the page
 */
export async function generateMetadata({ params }) {
  // Await params (Next.js 15 pattern)
  const { slug } = await params;
  
  // Fetch service data
  const service = await getServiceBySlug(slug);
  
  /**
   * Handle Not Found Case
   * - If service doesn't exist, return fallback metadata
   * - Persian message: "خدمت یافت نشد" = "Service not found"
   * - Still provides valid metadata for 404 page
   */
  if (!service) {
    return { 
      title: 'خدمت یافت نشد',
      description: 'متأسفانه خدمت مورد نظر یافت نشد.'
    };
  }

  /**
   * Return Service Metadata
   * - Title format: "Service Name | Website Name"
   * - Description: First 200 chars of service description
   * - Both in Persian for proper localization
   */
  return {
    title: `${service.title} | وب‌سایت ما`,
    // Limit description length for meta tag best practices
    description: service.description.substring(0, 200),
  };
}

/**
 * Single Service Page Component
 * 
 * Main page component that renders service detail view
 * - Async function allows using await for data fetching
 * - Executed on the server, not in the browser
 * - Returns fully rendered JSX sent as HTML to client
 * 
 * Layout Structure:
 * 1. Back button to return to services listing
 * 2. Two-column layout (desktop): Image + Details
 * 3. Single column (mobile): Image on top, details below
 * 4. Service title, description, and CTA button
 * 
 * User Flow:
 * 1. User clicks service card on /services page
 * 2. Navigates to /services/[slug]
 * 3. Server fetches service data
 * 4. Page renders with all content
 * 5. User can read details and click CTA
 * 6. User can click "Back" to return to listing
 * 
 * Accessibility:
 * - Semantic HTML structure (main, header, section)
 * - Proper heading hierarchy (h1 for title)
 * - Alt text for images
 * - Keyboard navigation support
 * - RTL text direction for Persian
 * 
 * @param {Object} props - Component props
 * @param {Object} props.params - Route parameters from Next.js
 * @param {string} props.params.slug - Service slug from URL
 * @returns {Promise<JSX.Element>} Rendered page component
 */
export default async function ServicePage({ params }) {
  // Await params (Next.js 15 pattern for async params)
  const { slug } = await params;
  
  // Fetch service data from API
  const service = await getServiceBySlug(slug);

  /**
   * Handle Not Found Case
   * - If service is null (not found or error), trigger 404
   * - Next.js notFound() function shows the 404 page
   * - Proper HTTP 404 status code
   * - Better SEO than rendering "not found" message
   */
  if (!service) {
    notFound();
  }

  /**
   * Determine if CTA link is external
   * - External links (http/https) should open in new tab
   * - Internal links stay in same tab
   * - Security: Use rel="noopener noreferrer" for external links
   */
  const isExternalLink = service.link && 
    (service.link.startsWith('http://') || service.link.startsWith('https://'));

  return (
    /**
     * Main Container
     * - Semantic <main> tag for accessibility
     * - .servicePage class provides page-level styling
     */
    <main className={styles.servicePage}>
      {/**
       * Container Wrapper
       * - Global .container class provides:
       *   - Centered content
       *   - Max-width constraint
       *   - Horizontal padding
       * - Defined in global styles
       */}
      <div className="container">
        
        {/**
         * Back Button Navigation
         * - Link component for client-side navigation (no full page reload)
         * - Returns user to /services listing page
         * - Styled as button with arrow icon
         * - Important for UX: Easy way to go back
         * 
         * Accessibility:
         * - Clear aria-label for screen readers
         * - Keyboard accessible (tab + enter)
         * - Visual indicator (arrow + text)
         */}
        <div className={styles.backButtonWrapper}>
          <Link 
            href="/services" 
            className={styles.backButton}
            aria-label="بازگشت به لیست خدمات"
          >
            {/* 
              Arrow Icon (Unicode)
              - ← for RTL (pointing right in visual display)
              - Indicates navigation direction
              - No icon library dependency
            */}
            <span className={styles.backIcon}>←</span>
            {/* Persian text: "Back" */}
            <span>بازگشت</span>
          </Link>
        </div>

        {/**
         * Main Content Grid
         * - Two-column layout on desktop (CSS Grid)
         * - Left column (in RTL): Service details
         * - Right column (in RTL): Service image
         * - Single column on mobile (stacks vertically)
         * 
         * Grid Structure:
         * - Desktop: [Details | Image] (in LTR view)
         * - Mobile: [Image above Details] (stacked)
         */}
        <div className={styles.contentGrid}>
          
          {/**
           * Details Section
           * - Contains title, description, and CTA button
           * - Flexbox layout for vertical stacking
           * - Text aligned right for RTL
           */}
          <div className={styles.details}>
            {/**
             * Service Title
             * - <h1> for proper semantic hierarchy
             * - Most important heading on page (only one h1)
             * - Large, bold, gold color for emphasis
             * - Establishes page topic for users and SEO
             */}
            <h1 className={styles.title}>{service.title}</h1>
            
            {/**
             * Service Description
             * - Detailed explanation of the service
             * - Extracted from Strapi rich text content
             * - Comfortable line height for reading
             * - Takes up available space (flex-grow)
             */}
            <p className={styles.description}>{service.description}</p>
            
            {/**
             * Call-to-Action Button
             * - Primary action user should take
             * - Links to external service page, contact form, or booking
             * - Only rendered if link exists in data
             * - Prominent styling to draw attention
             * 
             * External Link Handling:
             * - Opens in new tab if external (target="_blank")
             * - Security: rel="noopener noreferrer" prevents tabnabbing
             * - Internal links stay in same tab
             * 
             * Conditional Rendering:
             * - Only show if service.link exists
             * - Some services might not have a link yet
             */}
            {service.link && (
              <a 
                href={service.link}
                className={styles.ctaButton}
                // Open external links in new tab
                target={isExternalLink ? "_blank" : undefined}
                // Security for external links
                rel={isExternalLink ? "noopener noreferrer" : undefined}
                aria-label={`درخواست خدمت ${service.title}`}
              >
                {/* Persian text: "Request Service" or "Learn More" */}
                درخواست خدمت
              </a>
            )}
          </div>

          {/**
           * Image Section
           * - Displays service image
           * - Right side of grid (in RTL layout)
           * - Wrapper maintains aspect ratio
           * - Next.js Image for optimization
           * 
           * Image Optimization:
           * - Next.js automatically optimizes images
           * - Responsive srcset for different screen sizes
           * - Lazy loading for better performance
           * - WebP format when browser supports it
           */}
          <div className={styles.imageWrapper}>
            <Image
              src={service.image.url}
              alt={service.image.alt}
              // Fixed width/height for proper aspect ratio
              width={service.image.width}
              height={service.image.height}
              // Load this image with high priority (above the fold)
              priority
              // Responsive sizes for optimization
              sizes="(max-width: 768px) 100vw, 50vw"
              // Image styling
              className={styles.image}
            />
          </div>
        </div>
      </div>
    </main>
  );
}

