// All comments from the previous version are still valid.
import { marked } from 'marked';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import styles from './page.module.scss';

const STRAPI_API_URL = process.env.NEXT_PUBLIC_STRAPI_API_URL || 'http://localhost:1337';

/**
 * Fetches a single article from Strapi based on its slug, corrected for a FLAT data structure.
 */
async function getArticleBySlug(slug) {
  try {
    const response = await fetch(
      `${STRAPI_API_URL}/api/articles?populate=cover&filters[slug][$eq]=${slug}`,
      { next: { revalidate: 3600 } }
    );
    if (!response.ok) return null;
    const result = await response.json();
    if (!result.data || result.data.length === 0) return null;

    // The raw article data from Strapi (no .attributes)
    const rawArticle = result.data[0];

    // Format the cover image from the flat structure
    let coverImage = { url: 'https://picsum.photos/seed/placeholder/800/450', alt: 'Placeholder', width: 800, height: 450 };
    if (rawArticle.cover && rawArticle.cover.url) {
      coverImage = {
        url: STRAPI_API_URL + rawArticle.cover.url,
        alt: rawArticle.cover.alternativeText || '',
        width: rawArticle.cover.width,
        height: rawArticle.cover.height,
      };
    }

    // Format the final object without accessing .attributes
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
 * Generates all possible article slugs at build time. Corrected for a FLAT data structure.
 */
export async function generateStaticParams() {
  try {
    const response = await fetch(`${STRAPI_API_URL}/api/articles`);
    const result = await response.json();
    // Access slug directly, no .attributes
    return result.data.map((article) => ({
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