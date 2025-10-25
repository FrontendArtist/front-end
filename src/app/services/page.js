import ServiceGrid from '@/modules/services/ServiceGrid/ServiceGrid';
import { formatStrapiServices } from '@/lib/strapiUtils';
import styles from './services.module.scss';

/**
 * SEO Metadata
 */
export const metadata = {
  title: 'خدمات ما | طرح الهی',
  description: 'در این بخش می‌توانید با خدمات ما آشنا شوید و بر اساس نیاز خود انتخاب کنید.',
};

/**
 * Fetches all services from Strapi API
 * Server-side data fetching for SSR
 */
async function getInitialServices() {
  const STRAPI_API_URL = process.env.NEXT_PUBLIC_STRAPI_API_URL || 'http://localhost:1337';
  
  try {
    const response = await fetch(
      `${STRAPI_API_URL}/api/services?populate=image&sort=createdAt:desc`,
      { next: { revalidate: 3600 } }
    );
    
    if (!response.ok) {
      console.error('Failed to fetch services:', response.status);
      return [];
    }
    
    const result = await response.json();
    return formatStrapiServices(result);
    
  } catch (error) {
    console.error("Services Fetch Error:", error);
    return [];
  }
}

/**
 * Services Page Component
 * Server component with SSR data fetching
 */
export default async function ServicesPage() {
  const initialServices = await getInitialServices();

  return (
    <main className={styles.servicesPage}>
      <div className="container">
        {/* Hero Section */}
        <header className={styles.servicesPage__hero}>
          <h1 className={styles.servicesPage__title}>خدمات ما</h1>
          <p className={styles.servicesPage__subtitle}>
            در این بخش می‌توانید با خدمات ما آشنا شوید و بر اساس نیاز خود انتخاب کنید.
          </p>
        </header>
        
        {/* Services Grid */}
        <ServiceGrid initialServices={initialServices} />
      </div>
    </main>
  );
}

