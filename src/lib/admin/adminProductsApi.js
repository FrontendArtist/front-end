import { adminFetch } from './adminFetch';

export async function getTotalProductsCount(jwt) {
    const data = await adminFetch('/api/products?pagination[limit]=1', jwt);
    return data?.meta?.pagination?.total ?? null;
}

export async function getAdminProducts(jwt, { page = 1, pageSize = 100 } = {}) {
    const endpointDraft =
        `/api/products?populate[images][fields][0]=url&populate[images][fields][1]=name&populate[images][fields][2]=id&populate[images][fields][3]=documentId&populate[categories][fields][0]=name&populate[categories][fields][1]=documentId&populate[tags][fields][0]=name&populate[tags][fields][1]=documentId&sort=createdAt:desc&pagination[page]=${page}&pagination[pageSize]=${pageSize}&status=draft`;
    const endpointPub = `/api/products?fields[0]=documentId&fields[1]=publishedAt&pagination[limit]=500&status=published`;

    const [data, pubData] = await Promise.all([
        adminFetch(endpointDraft, jwt),
        adminFetch(endpointPub, jwt),
    ]);

    if (!data) return { products: [], meta: null, error: true };

    const publishedMap = new Map();
    if (pubData?.data && Array.isArray(pubData.data)) {
        pubData.data.forEach((p) => {
            const attrs = p.attributes || p;
            const docId = p.documentId || String(p.id);
            publishedMap.set(docId, attrs.publishedAt || attrs.createdAt || true);
        });
    }

    const products = (data.data || []).map((item) => {
        const attrs = item.attributes || item;
        const docId = item.documentId || String(item.id);
        const actualPublishedAt = publishedMap.get(docId) || null;

        const rawImages = attrs.images?.data || attrs.images || [];
        const images = rawImages.map((img) => {
            const imgAttrs = img.attributes || img;
            return {
                id: img.id,
                documentId: img.documentId || String(img.id),
                url: imgAttrs.url,
                name: imgAttrs.name,
            };
        });

        const rawCats = attrs.categories?.data || attrs.categories || [];
        const categories = rawCats.map((c) => {
            const cAttrs = c.attributes || c;
            return {
                id: c.id,
                documentId: c.documentId || String(c.id),
                name: cAttrs.name,
            };
        });

        const rawTags = attrs.tags?.data || attrs.tags || [];
        const tags = rawTags.map((t) => {
            const tAttrs = t.attributes || t;
            return {
                id: t.id,
                documentId: t.documentId || String(t.id),
                name: tAttrs.name,
            };
        });

        return {
            id: item.id,
            documentId: docId,
            title: attrs.title,
            slug: attrs.slug,
            price: attrs.price ?? null,
            stock: attrs.stock ?? null,
            isAvailable: attrs.isAvailable ?? false,
            publishedAt: actualPublishedAt,
            images,
            categories,
            tags,
        };
    });

    return { products, meta: data.meta || null, error: false };
}

export async function getAdminProductById(documentId, jwt) {
    const endpointDraft =
        `/api/products/${documentId}?populate[images]=true&populate[categories]=true&populate[tags]=true&status=draft`;
    const endpointPub = `/api/products/${documentId}?fields[0]=publishedAt&status=published`;

    const [data, pubRes] = await Promise.all([
        adminFetch(endpointDraft, jwt),
        adminFetch(endpointPub, jwt),
    ]);

    if (!data) return { product: null, error: true };

    const item = data.data || data;
    const attrs = item.attributes || item;

    const pubItem = pubRes?.data || pubRes;
    const pubAttrs = pubItem?.attributes || pubItem;
    const actualPublishedAt = pubAttrs?.publishedAt || null;

    const rawImages = attrs.images?.data || attrs.images || [];
    const images = rawImages.map((img) => {
        const imgAttrs = img.attributes || img;
        return {
            id: img.id,
            documentId: img.documentId || String(img.id),
            url: imgAttrs.url,
            name: imgAttrs.name,
        };
    });

    const rawCats = attrs.categories?.data || attrs.categories || [];
    const categories = rawCats.map((c) => {
        const cAttrs = c.attributes || c;
        return { id: c.id, documentId: c.documentId || String(c.id), name: cAttrs.name };
    });

    const rawTags = attrs.tags?.data || attrs.tags || [];
    const tags = rawTags.map((t) => {
        const tAttrs = t.attributes || t;
        return { id: t.id, documentId: t.documentId || String(t.id), name: tAttrs.name };
    });

    const product = {
        id: item.id,
        documentId: item.documentId || String(item.id),
        title: attrs.title,
        slug: attrs.slug,
        price: attrs.price ?? null,
        stock: attrs.stock ?? null,
        isAvailable: attrs.isAvailable ?? false,
        description: attrs.description,
        shortDescription: attrs.shortDescription || '',
        content: attrs.content || '',
        specifications: Array.isArray(attrs.specifications) ? attrs.specifications : [],
        publishedAt: actualPublishedAt,
        images,
        categories,
        tags,
    };

    return { product, error: false };
}

export async function getAdminCategories(jwt) {
    const data = await adminFetch('/api/categories?fields[0]=name&fields[1]=slug&fields[2]=documentId&pagination[limit]=200', jwt);
    if (!data) return [];
    return (data.data || []).map((c) => {
        const attrs = c.attributes || c;
        return { id: c.id, documentId: c.documentId || String(c.id), name: attrs.name };
    });
}

export async function getAdminTags(jwt) {
    const data = await adminFetch('/api/tags?fields[0]=name&fields[1]=documentId&pagination[limit]=200', jwt);
    if (!data) return [];
    return (data.data || []).map((t) => {
        const attrs = t.attributes || t;
        return { id: t.id, documentId: t.documentId || String(t.id), name: attrs.name };
    });
}

export async function getAdminProductOptions(jwt) {
    const raw = await adminFetch('/api/products?fields[0]=title&fields[1]=slug&status=published&pagination[limit]=200', jwt);
    if (!raw?.data) return [];
    return raw.data.map((item) => {
        const attrs = item.attributes || item;
        return {
            id: item.id,
            documentId: item.documentId || String(item.id),
            title: attrs.title || '',
            slug: attrs.slug || '',
        };
    });
}
