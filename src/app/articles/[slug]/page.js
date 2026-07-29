import ArticleReader from './ArticleReader';
import { marked } from 'marked';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getArticleBySlug } from '@/lib/articlesApi';
import { getComments } from '@/lib/commentsApi';
import CommentsSection from '@/modules/comments/CommentsSection';
import { API_BASE_URL } from '@/lib/api';
import styles from './page.module.scss';

// ثوابت برند و دامنه سایت
const SITE_NAME = 'طرح الهی';
const SITE_URL = 'https://tarhelahi.ir';

/**
 * Generate Dynamic Metadata for SEO & OpenGraph
 */
export async function generateMetadata({ params }) {
  const { slug } = await params;
  const rawArticle = await getArticleBySlug(slug);

  if (!rawArticle) {
    return { title: `مقاله یافت نشد | ${SITE_NAME}` };
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
    title: `${rawArticle.title} | ${SITE_NAME}`,
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

  return (
    <main className={styles.articlePage}>
      {/* 🔹 تزریق اسکیمای JSON-LD به هدر صفحه برای موتورهای جستجو */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="container">
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
              width={800}
              height={450}
              priority
              className={styles.coverImage}
            />
          </div>
        )}

        {/* مطالعه مقاله به همراه فهرست مطالب خودکار و قابلیت تغییر تم */}
        <ArticleReader excerpt={article.excerpt} content={article.content} />

        <CommentsSection
          entityType="article"
          entityId={article.documentId}
          initialComments={initialComments}
        />
      </div>
    </main>
  );
}