# Feature Context: FaqSection for Home Page

## 1. Goal
To create the FAQ section for the home page, which uses the `Accordion` component to display FAQ data.

## 2. Files
- `src/modules/home/FaqSection/FaqSection.jsx`
- `src/modules/home/FaqSection/FaqSection.module.scss`

## 3. JSX Structure (`FaqSection.jsx`)
```jsx
import Accordion from '@/components/ui/Accordion/Accordion';
import { mockFaqs } from '@/data/mock';
import styles from './FaqSection.module.scss';

const FaqSection = () => {
  return (
    <section className={`${styles.faqSection} section`}>
      <div className="container">
        <header className={styles.header}>
          <h2 className={styles.title}>سوالات متداول</h2>
        </header>
        <div className={styles.accordionWrapper}>
          <Accordion items={mockFaqs} />
        </div>
      </div>
    </section>
  );
};

export default FaqSection;
4. SCSS
The SCSS should provide padding for the section and center the title.


