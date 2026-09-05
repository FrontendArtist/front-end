import ArticleReader from './ArticleReader';
import { marked } from 'marked';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getArticleBySlug, getAdjacentArticles, getRelatedArticles, getArticleCTA } from '@/lib/articlesApi';
import ArticleTags from '@/modules/articles/ArticleTags';
import ArticleNav from '@/modules/articles/ArticleNav';
import RelatedArticles from '@/modules/articles/RelatedArticles';
import RelatedProductCTA from '@/modules/articles/RelatedProductCTA';
import { getComments } from '@/lib/commentsApi';
import CommentsSection from '@/modules/comments/CommentsSection';
import { API_BASE_URL } from '@/lib/api';
import Breadcrumb from '@/components/ui/BreadCrumb/Breadcrumb';
import styles from './page.module.scss';
import { SITE_NAME, SITE_URL } from '@/lib/constants';

/**
 * Generate Dynamic Metadata for SEO & OpenGraph
 */
export async function generateMetadata({ params }) {
  const { slug } = await params;
  const rawArticle = await getArticleBySlug(slug);

  if (!rawArticle) {
    return { title: 'مقاله یافت نشد' };
  }

  // محاسبه آدرس تصویر برای OpenGraph
  const rawCoverUrl = rawArticle.cover?.url || '';
  const isLocalFallback = rawCoverUrl.startsWith('/images/') || rawCoverUrl.includes('forempties');
  let ogImageUrl = `${SITE_URL}/logo.png`; // تصویر پیش‌فرض

  if (rawCoverUrl) {
    if (rawCoverUrl.startsWith('http')) {
      ogImageUrl = rawCoverUrl;
    } else if (!isLocalFallback) {
      ogImageUrl = `${API_BASE_URL}${rawCoverUrl}`;
    }
  }

  return {
    title: rawArticle.title,
    description: rawArticle.excerpt || rawArticle.title,
    alternates: {
      canonical: `${SITE_URL}/articles/${slug}`,
    },
    openGraph: {
      title: `${rawArticle.title} | ${SITE_NAME}`,
      description: rawArticle.excerpt || '',
      url: `${SITE_URL}/articles/${slug}`,
      siteName: SITE_NAME,
      locale: 'fa_IR',
      type: 'article',
      publishedTime: rawArticle.createdAt || rawArticle.date,
      modifiedTime: rawArticle.updatedAt,
      images: [
        {
          url: ogImageUrl,
          alt: rawArticle.cover?.alt || rawArticle.title,
        },
      ],
    },
  };
}

/**
 * Article Page Component (Server Component)
 */
export default async function ArticlePage({ params }) {
  const { slug } = await params;

  // دریافت داده واقعی از Strapi API
  const rawArticle = await getArticleBySlug(slug);

  if (!rawArticle) {
    notFound();
  }

  // دریافت مقاله قبلی و بعدی بر اساس ترتیب انتشار
  const adjacent = await getAdjacentArticles(rawArticle);

  // دریافت مقالات مرتبط هم‌دسته‌بندی
  const relatedArticles = await getRelatedArticles({
    currentId: rawArticle.id,
    categoryId: rawArticle.category?.id,
  });

  // دریافت جزییات کامل دوره‌ها و محصولات مرتبط متصل‌شده به مقاله
  const ctaItems = await getArticleCTA(rawArticle);

  // دریافت کامنت‌ها از API
  const initialComments = await getComments('article', rawArticle.documentId);

  // 🛠️ منطق هوشمند تشخیص تصویر
  const rawCoverUrl = rawArticle.cover?.url || '';
  const isLocalFallback = rawCoverUrl.startsWith('/images/') || rawCoverUrl.includes('forempties');

  let finalCoverUrl = rawCoverUrl;
  if (!isLocalFallback && rawCoverUrl && !rawCoverUrl.startsWith('http')) {
    finalCoverUrl = `${API_BASE_URL}${rawCoverUrl}`;
  }

  const showCoverImage = !isLocalFallback && Boolean(rawCoverUrl);

  let processedContent = rawArticle.content || '';
  if (typeof processedContent === 'string' && processedContent.trim() && !processedContent.trim().startsWith('<')) {
    try {
      processedContent = marked.parse(processedContent);
    } catch (e) {
      console.error('Error parsing markdown:', e);
    }
  }

  const article = {
    id: rawArticle.id,
    documentId: rawArticle.documentId,
    title: rawArticle.title,
    date: new Date(rawArticle.date || rawArticle.createdAt || new Date()).toLocaleDateString('fa-IR'),
    isoDate: rawArticle.createdAt || rawArticle.date || new Date().toISOString(),
    updatedAt: rawArticle.updatedAt || rawArticle.createdAt || new Date().toISOString(),
    excerpt: rawArticle.excerpt || '',
    content: processedContent,
  };

  // 🚀 ساخت داده‌های ساختاریافته (JSON-LD) برای سئوی گوگل
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${SITE_URL}/articles/${slug}`,
    },
    headline: article.title,
    description: article.excerpt || article.title,
    image: showCoverImage ? [finalCoverUrl] : [`${SITE_URL}/logo.png`],
    datePublished: article.isoDate,
    dateModified: article.updatedAt,
    author: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
    },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/logo.png`,
      },
    },
  };

  const primaryCategory = rawArticle.categories?.[0] || null;

  const breadcrumbItems = [
    { label: 'خانه', href: '/' },
    { label: 'مقالات', href: '/articles' },
    ...(primaryCategory ? [{ label: primaryCategory.name, href: `/articles?category=${primaryCategory.slug}` }] : []),
    { label: article.title },
  ];

  return (
    <main className={styles.articlePage}>
      {/* 🔹 تزریق اسکیمای JSON-LD به هدر صفحه برای موتورهای جستجو */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="container">
        <Breadcrumb items={breadcrumbItems} />

        <header className={styles.header}>
          <h1 className={styles.title}>{article.title}</h1>
          <time className={styles.date} dateTime={article.isoDate}>
            {article.date}
          </time>
        </header>

        {/* ✅ رندر شرطی: اگر عکس واقعی داریم نشان بده */}
        {showCoverImage && (
          <div className={styles.coverImageWrapper}>
            <Image
              src={finalCoverUrl}
              alt={rawArticle.cover?.alt || article.title}
              fill
              priority
              sizes="(max-width: 768px) 100vw, 800px"
              className={styles.coverImage}
            />
          </div>
        )}

        {/* مطالعه مقاله به همراه فهرست مطالب خودکار و قابلیت تغییر تم */}
        <ArticleReader excerpt={article.excerpt} content={article.content} />

        {/* 🎯 کارت‌های پیشنهاد ویژه مرتبط با مقاله (دوره آموزشی و/یا محصول متصل‌شده) */}
        <RelatedProductCTA enableCta={rawArticle.enable_cta} items={ctaItems} />

        {/* ۱) تگ‌های مقاله */}
        <ArticleTags tags={rawArticle.tags} />

        {/* ۲) ناوبری مقاله قبلی و بعدی */}
        <ArticleNav prevArticle={adjacent.prev} nextArticle={adjacent.next} />

        {/* ۳) مقالات مرتبط */}
        <RelatedArticles
          currentId={article.id}
          categoryId={rawArticle.category?.id}
          articles={relatedArticles}
        />

        {/* ۴) بخش کامنت‌ها */}
        <CommentsSection
          entityType="article"
          entityId={article.documentId}
          initialComments={initialComments}
        />
      </div>
    </main>
  );
}