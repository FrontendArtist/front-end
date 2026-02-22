import { marked } from 'marked';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getArticleBySlug } from '@/lib/articlesApi';
import { getComments } from '@/lib/commentsApi';
import CommentsSection from '@/modules/comments/CommentsSection';
import { API_BASE_URL } from '@/lib/api';
import styles from './page.module.scss';

/**
 * Generate Dynamic Metadata for SEO
 */
export async function generateMetadata({ params }) {
  const { slug } = await params;
  const rawArticle = await getArticleBySlug(slug);

  if (!rawArticle) {
    return { title: 'مقاله یافت نشد' };
  }

  return {
    title: `${rawArticle.title} | وب‌سایت ما`,
    description: rawArticle.excerpt || '',
  };
}

/**
 * Article Page Component (Server Component)
 */
export default async function ArticlePage({ params }) {
  const { slug } = await params;

  // Data fetched via API Layer abstraction
  const rawArticle = await getArticleBySlug(slug);

  if (!rawArticle) {
    notFound();
  }

  // Fetch comments
  const initialComments = await getComments('article', rawArticle.documentId);

  // 🛠️ منطق هوشمند تشخیص تصویر
  // 1. دریافت URL خام از API
  const rawCoverUrl = rawArticle.cover?.url || '';

  // 2. تشخیص اینکه آیا این تصویر، یک فال‌بک لوکال (از پوشه public) است؟
  // معمولاً عکس‌های Strapi در /uploads هستند و عکس‌های لوکال در /images
  const isLocalFallback = rawCoverUrl.startsWith('/images/') || rawCoverUrl.includes('forempties');

  // 3. ساخت URL نهایی برای نمایش (فقط اگر تصویر واقعی باشد استفاده می‌شود)
  let finalCoverUrl = rawCoverUrl;
  if (!isLocalFallback && !rawCoverUrl.startsWith('http')) {
      // اگر عکس واقعی Strapi است و آدرس نسبی دارد، آدرس پایه را اضافه کن
      finalCoverUrl = `${API_BASE_URL}${rawCoverUrl}`;
  }

  // 4. تصمیم‌گیری برای نمایش: فقط اگر فال‌بک نباشد، عکس را نشان می‌دهیم
  const showCoverImage = !isLocalFallback && rawCoverUrl;

  const article = {
    id: rawArticle.id,
    documentId: rawArticle.documentId,
    title: rawArticle.title,
    date: new Date(rawArticle.date).toLocaleDateString('fa-IR'),
    content: rawArticle.excerpt, 
  };

  const htmlContent = marked(article.content || '');

  return (
    <main className={styles.articlePage}>
      <div className="container">
        <header className={styles.header}>
          <h1 className={styles.title}>{article.title}</h1>
          <time className={styles.date}>{article.date}</time>
        </header>

        {/* ✅ رندر شرطی: اگر عکس واقعی داریم نشان بده، اگر نه (لوگو/فال‌بک) هیچی نشان نده */}
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

        <article
          className={styles.content}
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />

        <CommentsSection
          entityType="article"
          entityId={article.documentId}
          initialComments={initialComments}
        />
      </div>
    </main>
  );
}