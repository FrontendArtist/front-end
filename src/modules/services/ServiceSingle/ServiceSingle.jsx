import Image from 'next/image';
import Link from 'next/link';
import styles from './ServiceSingle.module.scss';

/**
 * ServiceSingle Component
 * 
 * Server-side rendered component for displaying detailed service information.
 * Renders service image, title, full description, and call-to-action link.
 * 
 * Layout:
 * - Desktop: Two-column layout (image right, content left in RTL)
 * - Mobile: Single column (image top, content bottom)
 * 
 * @param {Object} service - Service data from Strapi API
 * @param {number} service.id - Service ID
 * @param {string} service.slug - Service slug for URL
 * @param {string} service.title - Service title
 * @param {string} service.description - Full service description
 * @param {Object} service.image - Service image object with url and alt
 * @param {string} service.link - External or internal link for CTA
 */
const ServiceSingle = ({ service }) => {
  /**
   * Empty State Handling
   * If no service data is provided, return null
   * The parent page component should handle notFound() before rendering
   */
  if (!service) {
    return null;
  }

  const { title, description, image, link } = service;

  return (
    <section className={styles.serviceSingle}>
      {/* Main content wrapper with responsive grid layout */}
      <div className={styles.serviceSingle__wrapper}>
        
        {/* Image Section - Right side on desktop (RTL), top on mobile */}
        <div className={styles.serviceSingle__imageContainer}>
          <Image
            src={image?.url || '/images/placeholder.jpg'}
            alt={image?.alt || title}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className={styles.serviceSingle__image}
            priority
          />
        </div>

        {/* Content Section - Left side on desktop (RTL), bottom on mobile */}
        <div className={styles.serviceSingle__content}>
          {/* Service Title - Large, bold, primary color */}
          <h1 className={styles.serviceSingle__title}>{title}</h1>
          
          {/* Service Description - Full text with proper line height */}
          <p className={styles.serviceSingle__description}>{description}</p>
          
          {/* Call-to-Action Link - Styled as button */}
          {link && (
            <Link 
              href={link}
              className={styles.serviceSingle__cta}
              target={link.startsWith('http') ? '_blank' : '_self'}
              rel={link.startsWith('http') ? 'noopener noreferrer' : ''}
            >
              درخواست خدمت
            </Link>
          )}
        </div>
      </div>
    </section>
  );
};

export default ServiceSingle;

