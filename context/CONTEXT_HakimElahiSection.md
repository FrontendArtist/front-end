فایل CONTEXT_HakimElahiSection.md را در ریشه پروژه ایجاد کن و محتوای زیر را که بر اساس تصویر و توضیحات شما آماده شده، در آن قرار بده.

📄 نام فایل: CONTEXT_HakimElahiSection.md

Markdown

# Feature Context: Hakim Elahi Section for Home Page

## 1. REQUIRED DESIGN SYSTEM SNIPPETS (FOR AI USE)

### CSS Variables from `_variables.scss`:
```scss
:root {
  --color-bg-primary: #061818;
  --color-text-primary: #F6D982;
  --color-title-hover: #F5C452;
  // Add any other variables needed for text, buttons etc.
}
2. Overall Goal
To create the "Hakim Elahi" section for the home page, which is a two-column layout featuring an image on one side and text content (title, paragraph, CTA button) on the other. It should be visually similar in structure to the AboutMentorSection.

3. Component Files
src/modules/home/HakimElahiSection/HakimElahiSection.jsx

src/modules/home/HakimElahiSection/HakimElahiSection.module.scss

4. JSX Structure (HakimElahiSection.jsx)
JavaScript

import Image from 'next/image';
import Link from 'next/link';
import styles from './HakimElahiSection.module.scss';

const HakimElahiSection = () => {
  return (
    <section className={`${styles.hakimElahiSection} section`}>
      <div className={`${styles.container} container`}>
        <div className={styles.contentWrapper}>
          <h2 className={styles.title}>حکیم الهی</h2>
          <p className={styles.text}>
            درمان آنها نه رفع نشانه‌های بیماری محدود می‌شود، بلکه به سرچشمه‌های مشکل توان جسم، روان و روح توجه می‌شود. طب ایرانی از دانشی پیشینیان است که با شناخت دقیق مزاج، سبک زندگی و بهره‌گیری از گیاهان دارویی و روش‌های طبیعی، بدن را به مسیر سلامتی بازمی‌گرداند.
          </p>
          <Link href="/contact-us" className={`${styles.ctaButton} card-button`}>
            ارتباط با حکیم الهی
          </Link>
        </div>
        <div className={styles.imageWrapper}>
          <Image
            src="/images/hakim-elahi-placeholder.jpg" // We need to add the actual image here
            alt="تصویری از حکیم الهی و یک شاگرد"
            width={500}
            height={400}
            style={{ objectFit: 'cover', borderRadius: '16px' }}
          />
        </div>
      </div>
    </section>
  );
};

export default HakimElahiSection;
5. SCSS Styling (HakimElahiSection.module.scss)
Create SCSS styles to achieve the following:

The main container (.container) should be a two-column layout (CSS Grid or Flexbox). On desktop, the text is on the left and the image on the right.

The layout must be responsive. On medium screens and below (e.g., max-width: 768px), the columns should stack vertically.

Use the provided CSS variables for styling.