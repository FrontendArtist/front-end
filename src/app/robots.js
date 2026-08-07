import { SITE_URL } from '@/lib/constants';

export default function robots() {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/profile/', '/checkout/', '/payment/'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
