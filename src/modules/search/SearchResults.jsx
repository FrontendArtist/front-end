'use client';

import { useState } from 'react';
import clsx from 'clsx';
import styles from './SearchResults.module.scss';
import ProductCard from '@/components/cards/ProductCard/ProductCard';
import ArticleCard from '@/components/cards/ArticleCard/ArticleCard';
import CourseCard from '@/components/cards/CourseCard/CourseCard';
import SearchBox from '@/components/ui/SearchBox/SearchBox';

// 1. **CRITICAL FIX:** Define Strapi Base URL for absolute image pathing
const STRAPI_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1337';

export default function SearchResults({ data, query }) {
    const { products = [], articles = [], courses = [] } = data;

    // Determine available categories
    const hasProducts = products.length > 0;
    const hasArticles = articles.length > 0;
    const hasCourses = courses.length > 0;
    const availableCategoriesCount = [hasProducts, hasArticles, hasCourses].filter(Boolean).length;

    // Initialize activeTab strictly based on data availability
    const [activeTab, setActiveTab] = useState(() => {
        if (availableCategoriesCount === 1) {
            if (hasProducts) return 'product';
            if (hasArticles) return 'article';
            if (hasCourses) return 'course';
        }
        return 'all';
    });

    const hasResults = availableCategoriesCount > 0;

    // Helper: Safely extract Image URL from various Strapi structures and ensures Absolute URL
    const extractImageUrl = (imageData) => {
        if (!imageData) return null;

        let relativeUrl = null;

        // Case 1: Simple object (flattened)
        if (imageData.url) relativeUrl = imageData.url;
        // Case 2: Strapi V5/V4 deep structure (attributes)
        if (imageData.attributes?.url) relativeUrl = imageData.attributes.url;
        // Case 3: Formats (thumbnail/small) - Preferred for card performance
        const formats = imageData.formats || imageData.attributes?.formats;
        if (formats?.thumbnail?.url) relativeUrl = formats.thumbnail.url;
        if (formats?.small?.url) relativeUrl = formats.small.url;

        if (!relativeUrl) return null;

        // **CRITICAL FIX (URL Absolute Path):** Prepend Base URL if path is relative
        const absoluteUrl = relativeUrl.startsWith('http')
            ? relativeUrl
            : `${STRAPI_BASE_URL}${relativeUrl}`;

        return absoluteUrl;
    };

    // Helper: Normalize Product
    const normalizeProduct = (item) => {
        // Handle 'item.attributes' wrapper if present
        const data = item.attributes || item;
        const id = item.id;

        // Image extraction logic
        let imageObj = null;
        const imagesRaw = data.images?.data || data.images; // Handle { data: [...] } or [...]

        if (Array.isArray(imagesRaw) && imagesRaw.length > 0) {
            const firstImage = imagesRaw[0];
            const url = extractImageUrl(firstImage);
            if (url) imageObj = { url, alt: data.title };
        }

        return {
            id: id,
            slug: data.slug,
            title: data.title,
            price: data.price,
            image: imageObj || { url: '/images/placeholder.png', alt: data.title },
            // Add other props if ProductCard needs them
        };
    };

    // Helper: Normalize Article
    const normalizeArticle = (item) => {
        const data = item.attributes || item;
        const id = item.id;

        // Cover extraction logic
        let coverObj = null;
        const coverRaw = data.cover?.data || data.cover;
        const url = extractImageUrl(coverRaw);
        if (url) coverObj = { url, alt: data.title };

        return {
            id: id,
            slug: data.slug,
            title: data.title,
            date: data.date || data.publishedAt,
            excerpt: data.excerpt,
            cover: coverObj || { url: '/images/placeholder.png', alt: data.title }
        };
    };

    // Helper: Normalize Course
    const normalizeCourse = (item) => {
        const data = item.attributes || item;
        const id = item.id;

        // Image extraction logic
        let imageObj = null;
        const imageRaw = data.image?.data || data.image;
        const url = extractImageUrl(imageRaw);
        if (url) imageObj = { url, alt: data.title };

        return {
            id: id,
            slug: data.slug,
            title: data.title,
            price: data.price,
            shortDescription: data.shortDescription,
            image: imageObj || { url: '/images/placeholder.png', alt: data.title }
        };
    };

    // Render Logic
    const renderProducts = () => {
        if (products.length === 0) return null;
        return (
            <>
                {products.map(product => (
                    // **FIXED:** Pass the normalized object as the 'product' prop
                    <ProductCard key={`prod-${product.id}`} product={normalizeProduct(product)} />
                ))}
            </>
        );
    };

    const renderArticles = () => {
        if (articles.length === 0) return null;
        return (
            <>
                {articles.map(article => (
                    // **FIXED:** Pass the normalized object as the 'article' prop
                    <ArticleCard key={`art-${article.id}`} article={normalizeArticle(article)} />
                ))}
            </>
        );
    };

    const renderCourses = () => {
        if (courses.length === 0) return null;
        return (
            <>
                {courses.map(course => (
                    // **FIXED:** Pass the normalized object as the 'course' prop
                    <CourseCard key={`crs-${course.id}`} course={normalizeCourse(course)} />
                ))}
            </>
        );
    };

    return (
        <div className={styles.resultsContainer}>
            <div className={styles.header}>
                <h1 className={styles.title}>نتایج جستجو برای: <span>"{query}"</span></h1>
            </div>

            {/* Added SearchBox for re-searching from the results page */}
            <div className={styles.searchBoxWrapper}>
                <SearchBox initialQuery={query} />
            </div>

            {!hasResults && query && (
                <div className={styles.emptyState}>
                    <p>نتیجه‌ای برای جستجوی "{query}" یافت نشد.</p>
                </div>
            )}

            {hasResults && (
                <>
                    <div className={styles.tabs}>
                        {availableCategoriesCount > 1 && (
                            <button
                                className={clsx(styles.tab, { [styles.active]: activeTab === 'all' })}
                                onClick={() => setActiveTab('all')}
                            >
                                همه ({products.length + articles.length + courses.length})
                            </button>
                        )}
                        {products.length > 0 && (
                            <button
                                className={clsx(styles.tab, { [styles.active]: activeTab === 'product' })}
                                onClick={() => setActiveTab('product')}
                            >
                                محصولات ({products.length})
                            </button>
                        )}
                        {articles.length > 0 && (
                            <button
                                className={clsx(styles.tab, { [styles.active]: activeTab === 'article' })}
                                onClick={() => setActiveTab('article')}
                            >
                                مقالات ({articles.length})
                            </button>
                        )}
                        {courses.length > 0 && (
                            <button
                                className={clsx(styles.tab, { [styles.active]: activeTab === 'course' })}
                                onClick={() => setActiveTab('course')}
                            >
                                دوره‌ها ({courses.length})
                            </button>
                        )}
                    </div>

                    <div className={styles.grid}>
                        {/* Only render the active tab content or all content */}
                        {(activeTab === 'all' || activeTab === 'product') && renderProducts()}
                        {(activeTab === 'all' || activeTab === 'article') && renderArticles()}
                        {(activeTab === 'all' || activeTab === 'course') && renderCourses()}
                    </div>
                </>
            )}
        </div>
    );
}