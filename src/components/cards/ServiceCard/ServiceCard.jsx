/**
 * ServiceCard Component
 * 
 * Purpose:
 * - A reusable presentational card that displays summary information for a single service
 * - Shows an image, title, and description
 * - The entire card acts as a clickable link to navigate to the service detail page
 * 
 * Component Type: Server Component
 * - No client-side hooks or event handlers required
 * - Purely presentational, receives data via props
 * 
 * Data Flow:
 * - Receives service data as props from parent components
 * - Props include: id, slug, image, title, description
 * - The slug is used to construct the dynamic route to /services/[slug]
 * 
 * Architecture Notes:
 * - Follows the project's "Server-First" architecture principle
 * - Uses Next.js optimized Image component for better performance
 * - Uses Next.js Link component for client-side navigation
 * - Styling is handled via SCSS modules for component isolation
 */

import Image from 'next/image'; // Next.js optimized image component
import Link from 'next/link';   // Next.js client-side navigation
import styles from './ServiceCard.module.scss'; // Component-scoped styles

/**
 * ServiceCard Functional Component
 * 
 * @param {Object} props - Component props
 * @param {Object} props.service - Service data object
 * @param {string} props.service.id - Unique identifier for the service
 * @param {string} props.service.slug - URL-friendly identifier for routing
 * @param {string} props.service.image - Image URL for the service
 * @param {string} props.service.title - Service title/name
 * @param {string} props.service.description - Brief description of the service
 * 
 * @returns {JSX.Element|null} Rendered service card or null if no service data
 */
const ServiceCard = ({ service }) => {
  // Guard clause: Return null if service data is not provided
  // This prevents rendering errors and handles edge cases gracefully
  if (!service) return null;
  
  // Destructure service properties for cleaner code
  // Using destructuring improves readability and reduces prop drilling
  const { slug, image, title, description } = service;

  return (
    /**
     * Main card container wrapped in Link component
     * The entire card is clickable and navigates to the service detail page
     * This follows UX best practices for card-based navigation
     * 
     * RTL Note: Card layout respects RTL direction set in global styles
     */
    <Link 
      href={`/services/${slug}`} 
      className={styles.serviceCard}
      aria-label={`اطلاعات بیشتر درباره ${title}`} // Accessibility: Persian label for screen readers
    >
      {/* 
        Image Section
        - Uses Next.js Image component for automatic optimization
        - fill property makes image responsive within the container
        - aspect-ratio in CSS maintains consistent proportions
      */}
      <div className={styles.imageWrapper}>
        <Image 
          src={image.url || image} // Support both object and string formats
          alt={image.alt || title}  // Fallback to title if alt text not provided
          fill                      // Fills parent container (requires position: relative on parent)
          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw" // Responsive sizes for optimization
          className={styles.serviceImage}
          priority={false}          // Lazy load images below the fold
        />
      </div>

      {/* 
        Content Section
        Contains title, description, and CTA text
        Flexbox layout ensures proper spacing and alignment
      */}
      <div className={styles.cardContent}>
        {/* 
          Service Title
          - Semantic h3 tag for proper document outline
          - Styled with project's primary text color
        */}
        <h3 className={styles.cardTitle}>{title}</h3>
        
        {/* 
          Service Description
          - Brief summary to give users context
          - Truncated with CSS if too long (see SCSS file)
        */}
        <p className={styles.cardText}>{description}</p>
        
        {/* 
          Call-to-Action Text
          - Persian text: "بیشتر بدانید" (Learn More)
          - Acts as visual indicator that the card is clickable
          - Styled to stand out from regular text
        */}
        <span className={styles.ctaText}>
          بیشتر بدانید
        </span>
      </div>
    </Link>
  );
};

export default ServiceCard;

