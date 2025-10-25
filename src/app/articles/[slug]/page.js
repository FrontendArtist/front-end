import { marked } from 'marked';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getArticleBySlug as fetchArticleBySlug, getArticles } from '@/lib/api'; // Import from centralized API layer
import { getStrapiURL } from '@/lib/strapiUtils';
import styles from './page.module.scss';

/**
 * Fetches a single article by slug from centralized API layer
 * 
 * Refactored to use src/lib/api.js per ARCHITECTURE_RULES.md Rule 2.2
 * - No direct fetch() calls in components
 * - All API logic centralized in api.js
 * - Returns { data, error } format from API layer
 * 
 * @param {string} slug - Article slug identifier
 * @returns {Promise<Object|null>} Formatted article object or null if not found
 */
async function getArticleBySlug(slug) {
  try {
    /**
     * Call centralized API function
     * - Handles URL construction and query parameters
     * - Implements ISR revalidation strategy
     * - Returns standardized { data, error } format
     */
    const { data, error } = await fetchArticleBySlug(slug);

    // Check for API errors
    if (error) {
      console.error("API Error fetching article:", error);
      return null;
    }

    // Validate data exists
    if (!data || !data.data || data.data.length === 0) {
      console.warn(`No article found with slug: ${slug}`);
      return null;
    }

    // Extract the raw article data (Strapi returns array for filters)
    const rawArticle = data.data[0];

    /**
     * Format cover image
     * - Handle both relative and absolute URLs
     * - Provide fallback placeholder if missing
     * - Extract dimensions for Next.js Image component
     */
    let coverImage = { 
      url: 'https://picsum.photos/seed/placeholder/800/450', 
      alt: 'Placeholder', 
      width: 800, 
      height: 450 
    };
    
    if (rawArticle.cover && rawArticle.cover.url) {
      coverImage = {
        // Use getStrapiURL for consistent URL handling
        url: rawArticle.cover.url.startsWith('http') 
          ? rawArticle.cover.url 
          : getStrapiURL(rawArticle.cover.url),
        alt: rawArticle.cover.alternativeText || '',
        width: rawArticle.cover.width || 800,
        height: rawArticle.cover.height || 450,
      };
    }

    /**
     * Format and return the article object
     * - Convert publishedAt to Persian date format
     * - Keep content in rich text format for rendering
     */
    const formattedArticle = {
      id: rawArticle.id,
      title: rawArticle.title,
      content: rawArticle.content,
      cover: coverImage,
      date: new Date(rawArticle.publishedAt).toLocaleDateString('fa-IR'),
    };
    
    return formattedArticle;
    
  } catch (error) {
    console.error("Failed to fetch article by slug:", error);
    return null;
  }
}

/**
 * Generate static params for all articles at build time
 * 
 * Refactored to use centralized API layer
 * - Fetches all articles to extract slugs
 * - Used for Static Site Generation (SSG)
 * 
 * @returns {Promise<Array>} Array of { slug } objects for static generation
 */
export async function generateStaticParams() {
  try {
    /**
     * Fetch all articles from API layer
     * - Use large pageSize to get all articles
     * - Returns { data, error } format
     */
    const { data, error } = await getArticles({ pageSize: 1000 });

    if (error || !data || !data.data) {
      console.error("Failed to generate static params for articles:", error);
      return [];
    }

    /**
     * Extract slugs from article data
     * - Strapi v5 has flat structure (no .attributes)
     * - Map directly to slug property
     * - Filter out any articles without slugs
     */
    return data.data
      .filter(article => article && article.slug)
      .map((article) => ({
        slug: article.slug,
      }));
      
  } catch (error) {
    console.error("Failed to generate static params for articles:", error);
    return [];
  }
}

/**
 * Generates dynamic SEO metadata.
 */
export async function generateMetadata({ params }) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) {
    return { title: 'مقاله یافت نشد' };
  }
  const excerpt = Array.isArray(article.content) ? article.content[0]?.children[0]?.text.substring(0, 150) : '';
  return {
    title: `${article.title} | وب‌سایت ما`,
    description: excerpt,
  };
}


export default async function ArticlePage({ params }) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);

  if (!article) {
    notFound();
  }
  
  // Convert Strapi's Rich Text JSON to a Markdown string, then to HTML
  const markdownContent = (article.content || [])
    .map(block => 
      (block.children || [])
      .map(child => child.text || '')
      .join('')
    )
    .join('\n\n');
  const htmlContent = marked(markdownContent);

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
            width={article.cover.width}
            height={article.cover.height}
            priority
            className={styles.coverImage}
          />
        </div>

        <article 
          className={styles.content}
          dangerouslySetInnerHTML={{ __html: htmlContent }} 
        />
      </div>
    </main>
  );
}