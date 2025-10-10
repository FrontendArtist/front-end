# Feature Context: Single Article Page

## 1. Goal
To create the dynamic single article page (`/articles/[slug]`). This server component will fetch article data from Strapi, render Rich Text content as HTML, and handle SEO metadata. All code must be heavily commented.

## 2. File and Folder Structure
- Folder: `src/app/articles/[slug]`
- File: `src/app/articles/[slug]/page.js`
- File: `src/app/articles/[slug]/page.module.scss`

## 3. Page Logic (`page.js` with extensive comments)
```jsx
// We need the 'marked' library to safely convert Markdown/Rich Text to HTML
import { marked } from 'marked';
// We'll need a way to sanitize the HTML to prevent XSS attacks.
// For now, we trust our CMS content. In a real-world scenario with user-generated content,
// we would use a library like DOMPurify.
import Image from 'next/image';
import { notFound } from 'next/navigation';
import styles from './page.module.scss';

// --- DATA FETCHING ---
const STRAPI_API_URL = process.env.NEXT_PUBLIC_STRAPI_API_URL || 'http://localhost:1337';

/**
 * Fetches a single article from Strapi based on its slug.
 * @param {string} slug - The slug of the article to fetch.
 * @returns {Promise<object|null>} The formatted article object or null if not found.
 */
async function getArticleBySlug(slug) {
  try {
    // Fetch the article where the 'slug' field equals the requested slug.
    // We populate the 'cover' image as well.
    const response = await fetch(
      `${STRAPI_API_URL}/api/articles?populate=cover&filters[slug][$eq]=${slug}`,
      { next: { revalidate: 3600 } } // ISR: Revalidate every hour
    );
    if (!response.ok) return null;
    const result = await response.json();
    if (!result.data || result.data.length === 0) return null;

    // The raw article data from Strapi
    const rawArticle = result.data[0];

    // Format the data into a clean object for our component
    const formattedArticle = {
      id: rawArticle.id,
      title: rawArticle.attributes.title,
      // Convert the rich text JSON from Strapi to a single markdown string
      content: rawArticle.attributes.content, 
      cover: {
        url: STRAPI_API_URL + rawArticle.attributes.cover.data.attributes.url,
        alt: rawArticle.attributes.cover.data.attributes.alternativeText || '',
        width: rawArticle.attributes.cover.data.attributes.width,
        height: rawArticle.attributes.cover.data.attributes.height,
      },
      date: new Date(rawArticle.attributes.publishedAt).toLocaleDateString('fa-IR'),
    };
    return formattedArticle;
  } catch (error) {
    console.error("Failed to fetch article by slug:", error);
    return null;
  }
}


/**
 * Generates all possible article slugs at build time for static generation.
 * This is a Next.js function for performance optimization (SSG/ISR).
 */
export async function generateStaticParams() {
  try {
    const response = await fetch(`${STRAPI_API_URL}/api/articles`);
    const result = await response.json();
    return result.data.map((article) => ({
      slug: article.attributes.slug,
    }));
  } catch (error) {
    console.error("Failed to generate static params for articles:", error);
    return [];
  }
}


/**
 * Generates dynamic SEO metadata for each article page.
 * This runs on the server for each page.
 */
export async function generateMetadata({ params }) {
  const article = await getArticleBySlug(params.slug);
  if (!article) {
    return { title: 'مقاله یافت نشد' };
  }
  return {
    title: `${article.title} | وب‌سایت ما`,
    description: article.content.substring(0, 150), // Use the start of the content as description
  };
}


/**
 * The main React component for the single article page.
 * This is an async Server Component.
 * @param {{ params: { slug: string } }} props - The route parameters provided by Next.js.
 */
export default async function ArticlePage({ params }) {
  const { slug } = params;
  const article = await getArticleBySlug(slug);

  // If the fetch function returns null, show a 404 page.
  if (!article) {
    notFound();
  }
  
  // Convert the article's markdown content to HTML
  const htmlContent = marked(article.content);

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
            priority // Load this image with high priority
            className={styles.coverImage}
          />
        </div>

        {/* The main content of the article */}
        <article 
          className={styles.content}
          // This is the standard way to render HTML from a string in React.
          // It's "dangerous" because it can expose you to XSS attacks if the HTML is not trusted.
          // We trust the content coming from our own Strapi CMS.
          dangerouslySetInnerHTML={{ __html: htmlContent }} 
        />
        
        {/* Related Articles section will be added later */}
      </div>
    </main>
  );
}
4. SCSS (page.module.scss with comments)
SCSS

/* Main container for the article page, provides vertical spacing */
.articlePage {
  padding: var(--space-section-top-desktop) 0;
}

/* Header section containing title and date */
.header {
  text-align: center;
  margin-bottom: var(--space-title-content-desktop);
}

.title {
  font-size: var(--font-xl);
  color: var(--color-title-hover);
  margin-bottom: 1rem;
}

.date {
  color: var(--color-text-primary);
  opacity: 0.8;
}

/* Wrapper for the main cover image */
.coverImageWrapper {
  position: relative;
  width: 100%;
  max-width: 800px; /* Limit the width of the image */
  margin: 0 auto var(--space-title-content-desktop);
  aspect-ratio: 16 / 9; /* Give it a cinematic aspect ratio */
  
  .coverImage {
    border-radius: 16px;
    object-fit: cover;
  }
}

/* Styling for the article content itself */
.content {
  max-width: 800px; /* Same max-width for readability */
  margin: 0 auto;
  line-height: var(--line-height-lg);
  
  /* Style common HTML tags that will be generated from the rich text */
  h2, h3 {
    margin-top: 2.5rem;
    margin-bottom: 1rem;
    color: var(--color-title-hover);
  }

  p {
    margin-bottom: 1.5rem;
  }

  a {
    color: var(--color-text-primary);
    text-decoration: underline;
    &:hover {
      color: var(--color-title-hover);
    }
  }

  ul, ol {
    margin-bottom: 1.5rem;
    padding-right: 2rem; /* Indentation for RTL */
  }
}