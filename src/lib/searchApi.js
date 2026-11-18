/**
 * Search API - ماژول جستجوی سراسری
 * @module lib/searchApi
 */

import { apiClient } from './apiClient';
import { formatStrapiProducts, formatStrapiArticles, formatStrapiCourses } from './strapiUtils';

/**
 * نرمال‌سازی کلید دسته‌بندی جستجو به شناسه‌های استاندارد
 * @param {string} type
 * @returns {'all'|'product'|'article'|'course'}
 */
export const normalizeSearchType = (type) => {
    const val = String(type || 'all').trim().toLowerCase();
    if (val === 'product' || val === 'products' || val === 'محصولات') return 'product';
    if (val === 'article' || val === 'articles' || val === 'مقالات') return 'article';
    if (val === 'course' || val === 'courses' || val === 'دوره‌ها' || val === 'دوره ها') return 'course';
    return 'all';
};

/**
 * جستجوی سراسری میان محصولات، مقالات و دوره‌ها
 * @param {string} query - عبارت مورد جستجو
 * @param {string} type - فیلتر نوع محتوا ('all' | 'product' | 'article' | 'course')
 * @returns {Promise<{ products: Array, articles: Array, courses: Array }>}
 */
export const searchGlobal = async (query, type = 'all') => {
    if (!query || !query.trim()) {
        return { products: [], articles: [], courses: [] };
    }

    const q = encodeURIComponent(query.trim());
    const normalizedType = normalizeSearchType(type);

    const requests = [];

    // افزودن endpoint ها بر اساس نوع جستجو با فیلدهای معتبر اسکیما
    if (normalizedType === 'all' || normalizedType === 'product') {
        requests.push({
            key: 'products',
            endpoint: `/api/products?filters[title][$containsi]=${q}&populate[categories][populate]=parent&populate[images]=true`
        });
    }
    if (normalizedType === 'all' || normalizedType === 'article') {
        requests.push({
            key: 'articles',
            endpoint: `/api/articles?filters[title][$containsi]=${q}&populate[cover]=true`
        });
    }
    if (normalizedType === 'all' || normalizedType === 'course') {
        requests.push({
            key: 'courses',
            endpoint: `/api/courses?filters[title][$containsi]=${q}&populate[media]=true`
        });
    }

    try {
        const responses = await Promise.all(requests.map(req =>
            apiClient(req.endpoint, { suppressErrorLog: false })
                .then(data => ({ key: req.key, data }))
                .catch(err => {
                    if (process.env.NODE_ENV === 'development') {
                        console.error(`Search failed for ${req.key}:`, err);
                    }
                    return { key: req.key, data: null };
                })
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
