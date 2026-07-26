/**
 * Recent Updates API - واکشی و دسته‌بندی آخرین تغییرات در ۴ ستون
 *
 * @module lib/recentUpdatesApi
 */

import { apiClient } from './apiClient';
import {
  formatStrapiProducts,
  formatStrapiArticles,
  formatStrapiServices,
} from './strapiUtils';

/** تعداد آیتم‌های هر منبع برای واکشی */
const FETCH_LIMITS = {
  products: 3,
  articles: 3,
  services: 3,
  comments: 3,
};

async function fetchLatestProducts() {
  try {
    const res = await apiClient(
      `/api/products?populate[images]=true&pagination[limit]=${FETCH_LIMITS.products}&sort[0]=createdAt:desc`
    );
    return formatStrapiProducts(res).map((p) => ({
      type: 'product',
      id: `product-${p.id}`,
      title: p.title || '',
      excerpt: p.shortDescription || '',
      slug: p.slug || '',
      href: `/product/${p.slug}`,
      image: p.image?.url || null,
      createdAt: p.createdAt || new Date(0).toISOString(),
    }));
  } catch {
    return [];
  }
}

async function fetchLatestArticles() {
  try {
    const res = await apiClient(
      `/api/articles?populate=cover&pagination[limit]=${FETCH_LIMITS.articles}&sort[0]=publishedAt:desc`
    );
    return formatStrapiArticles(res).map((a) => ({
      type: 'article',
      id: `article-${a.id}`,
      title: a.title || '',
      excerpt: a.excerpt || '',
      slug: a.slug || '',
      href: `/articles/${a.slug}`,
      image: a.cover?.url || null,
      createdAt: a.date || new Date(0).toISOString(),
    }));
  } catch {
    return [];
  }
}

async function fetchLatestServices() {
  try {
    const res = await apiClient(
      `/api/services?populate=image&pagination[limit]=${FETCH_LIMITS.services}&sort[0]=createdAt:desc`
    );
    return formatStrapiServices(res).map((s) => ({
      type: 'service',
      id: `service-${s.id}`,
      title: s.title || '',
      excerpt: s.description || '',
      slug: s.slug || '',
      href: `/services/${s.slug}`,
      image: s.image?.url || null,
      createdAt: s.createdAt || new Date(0).toISOString(),
    }));
  } catch {
    return [];
  }
}

async function fetchLatestComments() {
  try {
    const res = await apiClient(
      `/api/comments?filters[isApproved][$eq]=true&populate[user][fields][0]=username&populate[article][fields][0]=slug&populate[product][fields][0]=slug&populate[course][fields][0]=slug&pagination[limit]=${FETCH_LIMITS.comments}&sort[0]=createdAt:desc`
    );
    const rawItems = res?.data || [];
    return rawItems.map((item) => {
      const attrs = item.attributes || item;

      const relatedSlug =
        attrs.product?.slug ||
        attrs.article?.slug ||
        attrs.course?.slug ||
        null;
      const relatedType =
        attrs.product ? 'product' :
        attrs.article ? 'articles' :
        attrs.course  ? 'courses'  : null;

      const href =
        relatedType && relatedSlug
          ? `/${relatedType}/${relatedSlug}#comments`
          : null;

      const userName =
        attrs.user?.username ||
        attrs.user?.data?.attributes?.username ||
        attrs.name ||
        'کاربر';

      return {
        type: 'comment',
        id: `comment-${item.id}`,
        title: `نظر از ${userName}`,
        excerpt: (attrs.content || '').slice(0, 120),
        slug: null,
        href,
        image: null,
        createdAt: attrs.createdAt || new Date(0).toISOString(),
      };
    });
  } catch {
    return [];
  }
}

/**
 * واکشی موازی از ۴ منبع و تفکیک آنها در ۴ ستون مجزا
 */
export async function getRecentUpdatesGrouped() {
  const [products, articles, services, comments] = await Promise.all([
    fetchLatestProducts(),
    fetchLatestArticles(),
    fetchLatestServices(),
    fetchLatestComments(),
  ]);

  return {
    products,
    articles,
    services,
    comments,
  };
}

export async function getRecentUpdates() {
  const grouped = await getRecentUpdatesGrouped();
  const combined = [
    ...grouped.products,
    ...grouped.articles,
    ...grouped.services,
    ...grouped.comments,
  ];
  combined.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return combined.slice(0, 12);
}
