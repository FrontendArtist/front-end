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
            endpoint:
                `/api/products?status=published&filters[title][$containsi]=${q}` +
                `&fields[0]=title&fields[1]=slug&fields[2]=price&fields[3]=discountPercent&fields[4]=discountUntil&fields[5]=description&fields[6]=shortDescription&fields[7]=stock&fields[8]=isAvailable` +
                `&populate[categories][fields][0]=slug&populate[categories][fields][1]=name&populate[categories][populate][parent][fields][0]=slug&populate[categories][populate][parent][fields][1]=name` +
                `&populate[images][fields][0]=url&populate[images][fields][1]=alternativeText&populate[images][fields][2]=formats` +
                `&pagination[limit]=20`
        });
    }
    if (normalizedType === 'all' || normalizedType === 'article') {
        requests.push({
            key: 'articles',
            endpoint:
                `/api/articles?status=published&filters[title][$containsi]=${q}` +
                `&fields[0]=title&fields[1]=slug&fields[2]=excerpt&fields[3]=publishedAt&fields[4]=createdAt&fields[5]=updatedAt` +
                `&populate[cover][fields][0]=url&populate[cover][fields][1]=alternativeText&populate[cover][fields][2]=formats` +
                `&pagination[limit]=20`
        });
    }
    if (normalizedType === 'all' || normalizedType === 'course') {
        requests.push({
            key: 'courses',
            endpoint:
                `/api/courses?status=published&filters[title][$containsi]=${q}` +
                `&fields[0]=title&fields[1]=slug&fields[2]=price&fields[3]=internationalPrice&fields[4]=discountPercent&fields[5]=discountUntil&fields[6]=description&fields[7]=isChaptered&fields[8]=isFree` +
                `&populate[media][fields][0]=url&populate[media][fields][1]=alternativeText&populate[media][fields][2]=formats` +
                `&pagination[limit]=20`
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
