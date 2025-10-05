# Feature Context: ArticleCard Component

## 1. Goal
Create a reusable `ArticleCard` component to display article information.

## 2. Files
- `src/components/cards/ArticleCard/ArticleCard.jsx`
- `src/components/cards/ArticleCard/ArticleCard.module.scss`

## 3. JSX Structure (`ArticleCard.jsx`)
```jsx
import Image from 'next/image';
import Link from 'next/link';
import styles from './ArticleCard.module.scss';

const ArticleCard = ({ article }) => {
  if (!article) return null;
  const { slug, cover, title, date, excerpt } = article;
  const formattedDate = new Date(date).toLocaleDateString('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <Link href={`/articles/${slug}`} className={`${styles.articleCard} card`}>
      <div className={styles.imageWrapper}>
        <Image src={cover.url} alt={cover.alt || title} fill sizes="33vw" className={styles.articleImage} />
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
4. SCSS
The styling should be consistent with other cards. The excerpt should be limited to 3 lines. The date in the footer should have a smaller font size.


**۲. فایل `CONTEXT_ArticlesSection.md`:**
```markdown
# Feature Context: Articles Section for Home Page

## 1. Goal
Create a section to showcase articles in a slider, using `BaseSlider` and `ArticleCard`.

## 2. Files
- `src/modules/home/ArticlesSection/ArticlesSection.jsx`
- `src/modules/home/ArticlesSection/ArticlesSection.module.scss`

## 3. JSX (`ArticlesSection.jsx`)
```jsx
import Link from 'next/link';
import ArticleCard from '@/components/cards/ArticleCard/ArticleCard';
import BaseSlider from '@/components/layout/BaseSlider/BaseSlider';
import { mockArticles } from '@/data/mock';
import styles from './ArticlesSection.module.scss';

const ArticlesSection = () => {
  const renderArticleCard = (article) => <ArticleCard article={article} />;

  return (
    <section className={`${styles.articlesSection} section`}>
      <div className="container">
        <header className={styles.header}>
          <h2 className={styles.title}>مقالات</h2>
          <Link href="/articles" className={styles.viewAllLink}>
            مشاهده همه مقالات ...
          </Link>
        </header>
        <div className={styles.sliderWrapper}>
          <BaseSlider
            items={mockArticles}
            renderItem={renderArticleCard}
            slidesPerView={3}
            loop={true}
          />
        </div>
      </div>
    </section>
  );
};
export default ArticlesSection;
4. SCSS
The SCSS file should be like products.

