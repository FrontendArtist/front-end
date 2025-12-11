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
 * Uses API Layer abstraction
 */
export async function generateMetadata({ params }) {
  const { slug } = await params;
  const rawArticle = await getArticleBySlug(slug);

  if (!rawArticle) {
    return { title: 'مقاله یافت نشد' };
  }

  // Extract excerpt from content for description
  const excerpt = rawArticle.excerpt || '';

  return {
    title: `${rawArticle.title} | وب‌سایت ما`,
    description: excerpt,
  };
}
/**
 * Article Page Component (Server Component)
 * 
 * Architecture:
 * - Uses getArticleBySlug() from articlesApi.js (no direct fetch)
 * - Follows Repository Pattern for clean separation of concerns
 * - Handles invalid slugs with notFound()
 */
export default async function ArticlePage({ params }) {
  const { slug } = await params;

  // Data fetched via API Layer abstraction
  const rawArticle = await getArticleBySlug(slug);

  if (!rawArticle) {
    notFound();
  }

  // Fetch comments for this article
  const initialComments = await getComments('article', rawArticle.documentId);

  // Format the article data for display
  const article = {
    id: rawArticle.id,
    documentId: rawArticle.documentId,
    title: rawArticle.title,
    date: new Date(rawArticle.date).toLocaleDateString('fa-IR'),
    cover: {
      url: rawArticle.cover.url.startsWith('http') ? rawArticle.cover.url : `${API_BASE_URL}${rawArticle.cover.url}`,
      alt: rawArticle.cover.alt,
    },
    content: rawArticle.excerpt, // Using excerpt as content for now
  };

  // Convert content to HTML (if needed)
  const htmlContent = marked(article.content || '');

  return (
    <main className={styles.articlePage}>
      <div className="container">
        <header className={styles.header}>
          <h1 className={styles.title}>{article.title}</h1>
          <time className={styles.date}>{article.date}</time>
        </header>

        <div className={styles.coverImageWrapper}>
          <Image
            src={article.cover.url}
            alt={article.cover.alt}
            width={800}
            height={450}
            priority
            className={styles.coverImage}
          />
        </div>

        <article
          className={styles.content}
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />

        {/* Comments Section */}
        <CommentsSection
          entityType="article"
          entityId={article.documentId}
          initialComments={initialComments}
        />
      </div>
    </main>
  );
}