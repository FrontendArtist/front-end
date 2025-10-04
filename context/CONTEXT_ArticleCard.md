# Feature Context: ArticleCard Component

## 1. REQUIRED DESIGN SYSTEM SNIPPETS (FOR AI USE)
### CSS Variables from `_variables.scss`:
```scss
:root {
  --color-card-text: #FFFAEA;
  --color-text-primary: #F6D982;
  --font-lg: 20px;
  --font-md: 16px;
  --font-sm: 14px;
}
2. Overall Goal
To create a reusable ArticleCard component. It will display article information such as cover image, title, date, and a short excerpt.

3. Component Files
src/components/cards/ArticleCard/ArticleCard.jsx

src/components/cards/ArticleCard/ArticleCard.module.scss

4. JSX Structure (ArticleCard.jsx)
JavaScript

import Image from 'next/image';
import Link from 'next/link';
import styles from './ArticleCard.module.scss';

/**
 * A reusable card component to display article information.
 * @param {{
 * article: {
 * id: string | number;
 * slug: string;
 * cover: { url: string; alt: string; };
 * title: string;
 * date: string;
 * excerpt?: string;
 * }
 * }} props
 */
const ArticleCard = ({ article }) => {
  if (!article) return null;

  const { slug, cover, title, date, excerpt } = article;
  
  // A simple date formatting function
  const formattedDate = new Date(date).toLocaleDateString('fa-IR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <Link href={`/articles/${slug}`} className={`${styles.articleCard} card`}>
      <div className={styles.imageWrapper}>
        <Image
          src={cover.url}
          alt={cover.alt || title}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className={styles.articleImage}
        />
      </div>
      <div className={styles.cardContent}>
        <h3 className={styles.cardTitle}>{title}</h3>
        <p className={styles.cardExcerpt}>{excerpt}</p>
        <div className={styles.footer}>
          <span className={styles.date}>{formattedDate}</span>
        </div>
      </div>
    </Link>
  );
};

export default ArticleCard;
5. SCSS Styling (ArticleCard.module.scss)
The styling should be consistent with the other cards, using the global .card class.

The excerpt should be limited to 3 lines with an ellipsis for overflow.

The footer should contain the date with a smaller font size and a slightly less prominent color.

