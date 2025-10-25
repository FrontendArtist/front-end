import { notFound } from 'next/navigation';
import ServiceSingle from '@/modules/services/ServiceSingle/ServiceSingle';

/**
 * Strapi API URL from environment variables
 * Fallback to localhost for development
 */
const STRAPI_API_URL = process.env.NEXT_PUBLIC_STRAPI_API_URL || 'http://localhost:1337';

/**
 * Fetches a single service from Strapi API based on slug
 * 
 * Data Flow:
 * 1. Constructs API URL with slug filter and image population
 * 2. Fetches data with 1-hour revalidation for ISR
 * 3. Validates response and data existence
 * 4. Formats image URL (prepends API URL if relative)
 * 5. Extracts description from Strapi's rich text structure
 * 6. Returns formatted service object
 * 
 * @param {string} slug - Service slug from URL parameter
 * @returns {Object|null} Formatted service object or null if not found
 */
async function getServiceBySlug(slug) {
  try {
    // Construct API endpoint with filters and population
    const apiUrl = `${STRAPI_API_URL}/api/services?populate=image&filters[slug][$eq]=${slug}`;
    
    // Fetch with ISR revalidation (1 hour)
    const response = await fetch(apiUrl, { 
      next: { revalidate: 3600 } 
    });
    
    // Handle failed requests
    if (!response.ok) return null;
    
    const result = await response.json();
    
    // Validate data existence
    if (!result.data || result.data.length === 0) return null;
    
    // Extract first result (slug should be unique)
    const rawService = result.data[0];
    
    /**
     * Format Service Image
     * Handle both absolute URLs and relative Strapi paths
     */
    let serviceImage = { 
      url: '/images/placeholder.jpg', 
      alt: 'خدمت' 
    };
    
    if (rawService.image && rawService.image.url) {
      serviceImage = {
        url: rawService.image.url.startsWith('http') 
          ? rawService.image.url 
          : `${STRAPI_API_URL}${rawService.image.url}`,
        alt: rawService.image.alternativeText || rawService.title || 'خدمت',
      };
    }
    
    /**
     * Extract Description from Rich Text
     * Strapi stores text as array of blocks with children
     * Extract text from first block's first child
     */
    const descriptionText = rawService.description && 
                           rawService.description[0]?.children?.[0]?.text 
                           ? rawService.description[0].children[0].text 
                           : '';
    
    // Return formatted service object
    return {
      id: rawService.id,
      slug: rawService.slug,
      title: rawService.title,
      description: descriptionText,
      image: serviceImage,
      link: rawService.link || null,
    };
    
  } catch (error) {
    console.error("Failed to fetch service by slug:", error);
    return null;
  }
}

/**
 * Generates static paths for all services at build time
 * Enables Static Site Generation (SSG) for better performance
 * 
 * @returns {Array} Array of params objects with slug property
 */
export async function generateStaticParams() {
  try {
    const response = await fetch(`${STRAPI_API_URL}/api/services`);
    
    if (!response.ok) return [];
    
    const result = await response.json();
    
    // Map service data to slug params array, filtering invalid entries
    return (result.data || [])
      .filter(service => service && service.slug)
      .map(service => ({
        slug: service.slug,
      }));
      
  } catch (error) {
    console.error("Failed to generate static params for services:", error);
    return [];
  }
}

/**
 * Generates metadata for SEO optimization
 * Sets page title and description based on service data
 * 
 * @param {Object} params - Route parameters
 * @param {string} params.slug - Service slug from URL
 * @returns {Object} Metadata object with title and description
 */
export async function generateMetadata({ params }) {
  const { slug } = await params;
  const service = await getServiceBySlug(slug);
  
  if (!service) {
    return {
      title: 'خدمت یافت نشد',
      description: 'خدمت مورد نظر یافت نشد.',
    };
  }
  
  return {
    title: service.title,
    description: service.description || `اطلاعات کامل درباره ${service.title}`,
  };
}

/**
 * Service Detail Page Component
 * 
 * Server-side rendered page displaying single service details
 * Implements Next.js App Router with async/await pattern
 * 
 * Flow:
 * 1. Extracts slug from route parameters
 * 2. Fetches service data from Strapi
 * 3. Returns 404 if service not found
 * 4. Renders ServiceSingle component with service data
 * 
 * @param {Object} props - Page props
 * @param {Object} props.params - Route parameters containing slug
 * @returns {JSX.Element} Rendered service detail page
 */
export default async function ServicePage({ params }) {
  // Extract slug from route parameters (async in Next.js 15)
  const { slug } = await params;
  
  // Fetch service data by slug
  const service = await getServiceBySlug(slug);
  
  // Handle not found case (returns Next.js 404 page)
  if (!service) {
    notFound();
  }
  
  // Render service detail page
  return (
    <main className="container">
      <ServiceSingle service={service} />
    </main>
  );
}

