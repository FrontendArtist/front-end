'use client';

import { useState } from 'react';
import clsx from 'clsx';
import styles from './SearchResults.module.scss';
import ProductCard from '@/components/cards/ProductCard/ProductCard';
import ArticleCard from '@/components/cards/ArticleCard/ArticleCard';
import CourseCard from '@/components/cards/CourseCard/CourseCard';
import SearchBox from '@/components/ui/SearchBox/SearchBox';

const STRAPI_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1337';

export default function SearchResults({ data, query, initialType = 'all' }) {
    const { products = [], articles = [], courses = [] } = data || {};

    const hasProducts = products.length > 0;
    const hasArticles = articles.length > 0;
    const hasCourses = courses.length > 0;
    const totalResults = products.length + articles.length + courses.length;
    const availableCategoriesCount = [hasProducts, hasArticles, hasCourses].filter(Boolean).length;

    const [activeTab, setActiveTab] = useState(() => {
        if (availableCategoriesCount === 1) {
            if (hasProducts) return 'product';
            if (hasArticles) return 'article';
            if (hasCourses) return 'course';
        }
        return 'all';
    });

    const hasResults = availableCategoriesCount > 0;

    const extractImageUrl = (imageData) => {
        if (!imageData) return null;
        let relativeUrl = null;

        if (imageData.url) relativeUrl = imageData.url;
        if (imageData.attributes?.url) relativeUrl = imageData.attributes.url;

        const formats = imageData.formats || imageData.attributes?.formats;
        if (formats?.thumbnail?.url) relativeUrl = formats.thumbnail.url;
        if (formats?.small?.url) relativeUrl = formats.small.url;

        if (!relativeUrl) return null;

        return relativeUrl.startsWith('http')
            ? relativeUrl
            : `${STRAPI_BASE_URL}${relativeUrl}`;
    };

    const normalizeProduct = (item) => {
        const data = item.attributes || item;
        const id = item.id;
        let imageObj = null;
        const imagesRaw = data.images?.data || data.images;

        if (Array.isArray(imagesRaw) && imagesRaw.length > 0) {
            const firstImage = imagesRaw[0];
            const url = extractImageUrl(firstImage);
            if (url) imageObj = { url, alt: data.title };
        }

        let discountPercent = Number(data.discountPercent || 0);
        const discountUntil = data.discountUntil || null;
        if (discountUntil && new Date(discountUntil).getTime() <= Date.now()) {
            discountPercent = 0;
        }

        const rawPrice = typeof data.price === 'object' ? data.price?.toman || 0 : (data.price || 0);
        const discountPrice = discountPercent > 0 ? Math.round(rawPrice * (1 - discountPercent / 100)) : null;
        const finalPrice = discountPrice !== null ? discountPrice : rawPrice;

        return {
            id,
            slug: data.slug,
            title: data.title,
            price: { toman: finalPrice, original: rawPrice },
            originalPrice: rawPrice,
            discountPercent,
            discountPrice,
            discountUntil,
            image: imageObj || { url: '/images/forempties2.png', alt: data.title },
        };
    };

    const normalizeArticle = (item) => {
        const data = item.attributes || item;
        const id = item.id;
        let coverObj = null;
        const coverRaw = data.cover?.data || data.cover;
        const url = extractImageUrl(coverRaw);
        if (url) coverObj = { url, alt: data.title };

        return {
            id,
            slug: data.slug,
            title: data.title,
            date: data.date || data.publishedAt,
            excerpt: data.excerpt,
            cover: coverObj || { url: '/images/forempties2.png', alt: data.title }
        };
    };

    const normalizeCourse = (item) => {
        const data = item.attributes || item;
        const id = item.id;
        let imageObj = null;
        const imageRaw = data.image?.data || data.image;
        const url = extractImageUrl(imageRaw);
        if (url) imageObj = { url, alt: data.title };

        let discountPercent = Number(data.discountPercent || 0);
        const discountUntil = data.discountUntil || null;
        if (discountUntil && new Date(discountUntil).getTime() <= Date.now()) {
            discountPercent = 0;
        }

        const rawPrice = typeof data.price === 'object' ? data.price?.toman || 0 : (data.price || 0);
        const discountPrice = discountPercent > 0 ? Math.round(rawPrice * (1 - discountPercent / 100)) : null;
        const finalPrice = discountPrice !== null ? discountPrice : rawPrice;

        return {
            id,
            slug: data.slug,
            title: data.title,
            price: { toman: finalPrice, original: rawPrice },
            originalPrice: rawPrice,
            discountPercent,
            discountPrice,
            discountUntil,
            shortDescription: data.shortDescription,
            image: imageObj || { url: '/images/forempties2.png', alt: data.title }
        };
    };

    const renderProducts = () => products.map(product => (
        <ProductCard key={`prod-${product.id}`} product={normalizeProduct(product)} />
    ));

    const renderArticles = () => articles.map(article => (
        <ArticleCard key={`art-${article.id}`} article={normalizeArticle(article)} />
    ));

    const renderCourses = () => courses.map(course => (
        <CourseCard key={`crs-${course.id}`} course={normalizeCourse(course)} />
    ));

    return (
        <div className={styles.resultsContainer}>
            <div className={styles.header}>
                <div className={styles.titleBadge}>
                    <span className={styles.badgeLabel}>نتایج جستجو</span>
                    {hasResults && <span className={styles.countBadge}>{totalResults} مورد یافت شد</span>}
                </div>
                {query ? (
                    <h1 className={styles.title}>
                        جستجو برای عبارت: <span className={styles.queryHighlight}>"{query}"</span>
                    </h1>
                ) : (
                    <h1 className={styles.title}>جستجوی پیشرفته در سایت</h1>
                )}
            </div>

            <div className={styles.searchBoxWrapper}>
                <SearchBox initialQuery={query} initialType={initialType} />
            </div>

            {!hasResults && (
                <div className={styles.emptyState}>
                    <div className={styles.emptyIconWrapper}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                        </svg>
                    </div>
                    <h3>نتیجه‌ای یافت نشد</h3>
                    <p>متأسفانه هیچ نتیجه‌ای متناسب با عبارت {query ? `"${query}"` : 'جستجوی شما'} پیدا نشد.</p>
                    <p className={styles.emptyTip}>پیشنهاد می‌کنیم از کلمات کلیدی دیگری استفاده کنید یا املای کلمات را بررسی نمایید.</p>
                </div>
            )}

            {hasResults && (
                <>
                    <div className={styles.tabsWrapper}>
                        <div className={styles.tabs}>
                            {availableCategoriesCount > 1 && (
                                <button
                                    className={clsx(styles.tab, { [styles.active]: activeTab === 'all' })}
                                    onClick={() => setActiveTab('all')}
                                >
                                    <span>همه موارد</span>
                                    <span className={styles.tabCount}>{totalResults}</span>
                                </button>
                            )}
                            {hasProducts && (
                                <button
                                    className={clsx(styles.tab, { [styles.active]: activeTab === 'product' })}
                                    onClick={() => setActiveTab('product')}
                                >
                                    <span>محصولات</span>
                                    <span className={styles.tabCount}>{products.length}</span>
                                </button>
                            )}
                            {hasArticles && (
                                <button
                                    className={clsx(styles.tab, { [styles.active]: activeTab === 'article' })}
                                    onClick={() => setActiveTab('article')}
                                >
                                    <span>مقالات</span>
                                    <span className={styles.tabCount}>{articles.length}</span>
                                </button>
                            )}
                            {hasCourses && (
                                <button
                                    className={clsx(styles.tab, { [styles.active]: activeTab === 'course' })}
                                    onClick={() => setActiveTab('course')}
                                >
                                    <span>دوره‌ها</span>
                                    <span className={styles.tabCount}>{courses.length}</span>
                                </button>
                            )}
                        </div>
                    </div>

                    <div className={styles.grid}>
                        {(activeTab === 'all' || activeTab === 'product') && renderProducts()}
                        {(activeTab === 'all' || activeTab === 'article') && renderArticles()}
                        {(activeTab === 'all' || activeTab === 'course') && renderCourses()}
                    </div>
                </>
            )}
        </div>
    );
}