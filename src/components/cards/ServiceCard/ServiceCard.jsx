import Image from 'next/image';
import Link from 'next/link';
import styles from './ServiceCard.module.scss';

/**
 * ServiceCard Component
 * 
 * Server-side component for displaying service information in a card format.
 * Used in the services listing page and home page services section.
 * 
 * @param {Object} service - Service data from Strapi
 * @param {string} service.slug - URL slug for the service detail page
 * @param {Object} service.image - Service image object with url and alt text
 * @param {string} service.title - Service title
 * @param {string} service.description - Short description of the service
 */
const ServiceCard = ({ service }) => {
  // Early return if no service data provided
  if (!service) return null;
  
  const { slug, image, title, description } = service;

  return (
    // Main card container with hover effects and gradient background
    <div className={styles.serviceCard}>
      {/* Image section with optimized Next.js Image component */}
      <div className={styles.serviceCard__imageWrapper}>
        <Image 
          src={image?.url || '/images/placeholder.jpg'} 
          alt={image?.alt || title} 
          fill 
          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
          className={styles.serviceCard__image}
          priority={false}
        />
      </div>

      {/* Content section containing title, description, and CTA link */}
      <div className={styles.serviceCard__content}>
        {/* Service title with primary color */}
        <h3 className={styles.serviceCard__title}>{title}</h3>
        
        {/* Service description with card text color */}
        <p className={styles.serviceCard__description}>{description}</p>
        
        {/* Call-to-action link to service detail page */}
        <Link 
          href={`/services/${slug}`} 
          className={styles.serviceCard__link}
        >
          بیشتر بدانید
        </Link>
      </div>
    </div>
  );
};

export default ServiceCard;

