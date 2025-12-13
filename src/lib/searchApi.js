export const searchGlobal = async (query, type = 'all') => {
    if (!query) return { products: [], articles: [], courses: [] };

    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1337'; // Fallback or env
    const q = encodeURIComponent(query);
    const typeLower = type?.toLowerCase() || 'all';

    const endpoints = [];

    // Add endpoints based on type
    if (typeLower === 'all' || typeLower === 'محصولات' || typeLower === 'products') {
        endpoints.push({ key: 'products', url: `${baseUrl}/api/products?filters[title][$containsi]=${q}&populate=images` });
    }
    if (typeLower === 'all' || typeLower === 'مقالات' || typeLower === 'articles') {
        endpoints.push({ key: 'articles', url: `${baseUrl}/api/articles?filters[title][$containsi]=${q}&populate=cover` });
    }
    if (typeLower === 'all' || typeLower === 'دوره‌ها' || typeLower === 'courses') {
        endpoints.push({ key: 'courses', url: `${baseUrl}/api/courses?filters[title][$containsi]=${q}&populate=media` });
    }

    try {
        const responses = await Promise.all(endpoints.map(ep =>
            fetch(ep.url).then(res => res.json().then(data => ({ key: ep.key, data: data.data })))
        ));

        // Initialize result object
        const results = { products: [], articles: [], courses: [] };

        // Map responses back to keys
        responses.forEach(res => {
            if (res.key === 'products') results.products = res.data || [];
            if (res.key === 'articles') results.articles = res.data || [];
            if (res.key === 'courses') results.courses = res.data || [];
        });

        return results;
    } catch (error) {
        console.error("Global search error:", error);
        return { products: [], articles: [], courses: [] };
    }
};
