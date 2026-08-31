/**
 * Search API - ماژول جستجوی سراسری
 * @module lib/searchApi
 */

import { apiClient } from './apiClient';
import { formatStrapiProducts, formatStrapiArticles, formatStrapiCourses } from './strapiUtils';

/**
 * جستجوی سراسری میان محصولات، مقالات و دوره‌ها
 * @param {string} query - عبارت مورد جستجو
 * @param {string} type - فیلتر نوع محتوا ('all' | 'products' | 'articles' | 'courses' | 'محصولات' | 'مقالات' | 'دوره‌ها')
 * @returns {Promise<{ products: Array, articles: Array, courses: Array }>}
 */
export const searchGlobal = async (query, type = 'all') => {
    if (!query || !query.trim()) {
        return { products: [], articles: [], courses: [] };
    }

    const q = encodeURIComponent(query.trim());
    const typeLower = type?.toLowerCase() || 'all';

    const requests = [];

    // افزودن endpoint ها بر اساس نوع جستجو
    if (typeLower === 'all' || typeLower === 'محصولات' || typeLower === 'products') {
        requests.push({
            key: 'products',
            endpoint: `/api/products?status=published&filters[title][$containsi]=${q}&populate[categories][populate]=parent&populate[images]=true&populate[image]=true&populate[cover]=true`
        });
    }
    if (typeLower === 'all' || typeLower === 'مقالات' || typeLower === 'articles') {
        requests.push({
            key: 'articles',
            endpoint: `/api/articles?filters[title][$containsi]=${q}&populate[cover]=true&populate[categories]=true`
        });
    }
    if (typeLower === 'all' || typeLower === 'دوره‌ها' || typeLower === 'courses') {
        requests.push({
            key: 'courses',
            endpoint: `/api/courses?filters[title][$containsi]=${q}&populate[media]=true&populate[image]=true`
        });
    }

    try {
        const responses = await Promise.all(requests.map(req =>
            apiClient(req.endpoint, { suppressErrorLog: true })
                .then(data => ({ key: req.key, data }))
                .catch(() => ({ key: req.key, data: null }))
        ));

        // تجمیع نتایج در ساختار استاندارد و فرمت‌شده
        const results = { products: [], articles: [], courses: [] };

        responses.forEach(res => {
            if (res.key === 'products' && res.data) {
                results.products = formatStrapiProducts(res.data);
            }
            if (res.key === 'articles' && res.data) {
                results.articles = formatStrapiArticles(res.data);
            }
            if (res.key === 'courses' && res.data) {
                results.courses = formatStrapiCourses(res.data);
            }
        });

        return results;
    } catch (error) {
        if (process.env.NODE_ENV === 'development') {
            console.error('Global search error:', error);
        }
        return { products: [], articles: [], courses: [] };
    }
};
