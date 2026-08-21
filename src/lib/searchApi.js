/**
 * Search API - ماژول جستجوی سراسری
 * @module lib/searchApi
 */

import { apiClient } from './apiClient';

/**
 * جستجوی سراسری میان محصولات، مقالات و دوره‌ها
 * @param {string} query - عبارت مورد جستجو
 * @param {string} type - فیلتر نوع محتوا ('all' | 'products' | 'articles' | 'courses')
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
            endpoint: `/api/products?filters[title][$containsi]=${q}&populate=images`
        });
    }
    if (typeLower === 'all' || typeLower === 'مقالات' || typeLower === 'articles') {
        requests.push({
            key: 'articles',
            endpoint: `/api/articles?filters[title][$containsi]=${q}&populate=cover`
        });
    }
    if (typeLower === 'all' || typeLower === 'دوره‌ها' || typeLower === 'courses') {
        requests.push({
            key: 'courses',
            endpoint: `/api/courses?filters[title][$containsi]=${q}&populate=media`
        });
    }

    try {
        const responses = await Promise.all(requests.map(req =>
            apiClient(req.endpoint, { suppressErrorLog: true })
                .then(data => ({ key: req.key, data: data?.data || [] }))
                .catch(() => ({ key: req.key, data: [] }))
        ));

        // تجمیع نتایج در ساختار استاندارد
        const results = { products: [], articles: [], courses: [] };

        responses.forEach(res => {
            if (res.key === 'products') results.products = res.data || [];
            if (res.key === 'articles') results.articles = res.data || [];
            if (res.key === 'courses') results.courses = res.data || [];
        });

        return results;
    } catch (error) {
        if (process.env.NODE_ENV === 'development') {
            console.error('Global search error:', error);
        }
        return { products: [], articles: [], courses: [] };
    }
};
