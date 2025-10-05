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
The SCSS file should be minimal and consistent with other homepage sections.

