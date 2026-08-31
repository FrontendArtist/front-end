import { adminFetch } from './adminFetch';

export async function getAdminArticles(jwt, { page = 1, pageSize = 100 } = {}) {
    const endpointDraft =
        `/api/articles?populate[cover]=true&populate[articles_categories]=true&populate[tags]=true&sort[0]=publishedAt:desc&sort[1]=updatedAt:desc&sort[2]=createdAt:desc&pagination[page]=${page}&pagination[pageSize]=${pageSize}&status=draft`;
    const endpointPub =
        `/api/articles?fields[0]=documentId&fields[1]=publishedAt&pagination[limit]=500&status=published`;

    const [data, pubData] = await Promise.all([
        adminFetch(endpointDraft, jwt),
        adminFetch(endpointPub, jwt),
    ]);

    if (!data) return { articles: [], meta: null, error: true };

    const publishedMap = new Map();
    if (pubData?.data && Array.isArray(pubData.data)) {
        pubData.data.forEach((p) => {
            const attrs = p.attributes || p;
            const docId = p.documentId || String(p.id);
            if (attrs.publishedAt) {
                publishedMap.set(docId, attrs.publishedAt);
            }
        });
    }

    const articles = (data.data || []).map((item) => {
        const attrs = item.attributes || item;

        const coverData = attrs.cover?.data || attrs.cover;
        const cover = coverData ? {
            id: coverData.id,
            documentId: coverData.documentId || String(coverData.id),
            url: coverData.attributes?.url || coverData.url,
            name: coverData.attributes?.name || coverData.name,
        } : null;

        const rawCats = attrs.articles_categories?.data || attrs.articles_categories || [];
        const categories = rawCats.map((c) => {
            const cAttrs = c.attributes || c;
            return {
                id: c.id,
                documentId: c.documentId || String(c.id),
                name: cAttrs.name || cAttrs.title,
            };
        });

        const rawTags = attrs.tags?.data || attrs.tags || [];
        const tags = rawTags.map((t) => {
            const tAttrs = t.attributes || t;
            return {
                id: t.id,
                documentId: t.documentId || String(t.id),
                name: tAttrs.name || tAttrs.title,
            };
        });

        const docId = item.documentId || String(item.id);
        const actualPublishedAt = publishedMap.get(docId) || attrs.publishedAt || null;

        return {
            id: item.id,
            documentId: docId,
            title: attrs.title,
            slug: attrs.slug,
            excerpt: attrs.excerpt || '',
            publishedAt: actualPublishedAt,
            createdAt: attrs.createdAt || null,
            updatedAt: attrs.updatedAt || null,
            cover,
            categories,
            tags,
        };
    });

    // مرتب‌سازی مقالات:
    // ۱. مقالاتی که publishedAt دارند بر اساس تاریخ انتشار (جدیدترین به قدیمی‌ترین)
    // ۲. مقالاتی که منتشر نشده‌اند یا publishedAt ندارند بر اساس آخرین تغییرات / ایجاد (updatedAt یا createdAt)
    articles.sort((a, b) => {
        const aPub = a.publishedAt ? new Date(a.publishedAt).getTime() : null;
        const bPub = b.publishedAt ? new Date(b.publishedAt).getTime() : null;

        if (aPub && bPub) {
            return bPub - aPub;
        }
        if (aPub && !bPub) {
            return -1;
        }
        if (!aPub && bPub) {
            return 1;
        }
        const aDate = new Date(a.updatedAt || a.createdAt || 0).getTime();
        const bDate = new Date(b.updatedAt || b.createdAt || 0).getTime();
        return bDate - aDate;
    });

    return { articles, meta: data.meta || null, error: false };
}

export async function getAdminArticleById(documentId, jwt) {
    const endpointDraft =
        `/api/articles/${documentId}?populate[cover]=true&populate[articles_categories]=true&populate[tags]=true&populate[featured_course]=true&populate[featured_product]=true&status=draft`;
    const endpointPub =
        `/api/articles/${documentId}?fields[0]=publishedAt&status=published`;

    const [data, pubRes] = await Promise.all([
        adminFetch(endpointDraft, jwt),
        adminFetch(endpointPub, jwt),
    ]);

    if (!data) return { article: null, error: true };

    const item = data.data || data;
    const attrs = item.attributes || item;

    const pubItem = pubRes?.data || pubRes;
    const pubAttrs = pubItem?.attributes || pubItem;
    const actualPublishedAt = pubAttrs?.publishedAt || null;

    const coverData = attrs.cover?.data || attrs.cover;
    const cover = coverData ? {
        id: coverData.id,
        documentId: coverData.documentId || String(coverData.id),
        url: coverData.attributes?.url || coverData.url,
        name: coverData.attributes?.name || coverData.name,
    } : null;

    const rawCats = attrs.articles_categories?.data || attrs.articles_categories || [];
    const categories = rawCats.map((c) => {
        const cAttrs = c.attributes || c;
        return { id: c.id, documentId: c.documentId || String(c.id), title: cAttrs.title || cAttrs.name || '' };
    });

    const rawTags = attrs.tags?.data || attrs.tags || [];
    const tags = rawTags.map((t) => {
        const tAttrs = t.attributes || t;
        return { id: t.id, documentId: t.documentId || String(t.id), name: tAttrs.name || tAttrs.title || '' };
    });

    const featuredCourseData = attrs.featured_course?.data || attrs.featured_course;
    const featured_course = featuredCourseData ? {
        id: featuredCourseData.id,
        documentId: featuredCourseData.documentId || String(featuredCourseData.id),
        title: featuredCourseData.attributes?.title || featuredCourseData.title,
        slug: featuredCourseData.attributes?.slug || featuredCourseData.slug,
    } : null;

    const featuredProductData = attrs.featured_product?.data || attrs.featured_product;
    const featured_product = featuredProductData ? {
        id: featuredProductData.id,
        documentId: featuredProductData.documentId || String(featuredProductData.id),
        title: featuredProductData.attributes?.title || featuredProductData.title,
        slug: featuredProductData.attributes?.slug || featuredProductData.slug,
    } : null;

    const enable_cta = attrs.enable_cta !== undefined ? Boolean(attrs.enable_cta) : true;

    const article = {
        id: item.id,
        documentId: item.documentId || String(item.id),
        title: attrs.title,
        slug: attrs.slug,
        excerpt: attrs.excerpt || '',
        content: attrs.content || '',
        publishedAt: actualPublishedAt,
        cover,
        articles_categories: categories,
        tags,
        enable_cta,
        featured_course,
        featured_product,
    };

    return { article, error: false };
}

export async function getAdminArticlesCategories(jwt) {
    const data = await adminFetch('/api/articles-categories?pagination[limit]=200', jwt);
    if (!data) return [];
    return (data.data || []).map((c) => {
        const attrs = c.attributes || c;
        return { id: c.id, documentId: c.documentId || String(c.id), title: attrs.title || attrs.name };
    });
}
