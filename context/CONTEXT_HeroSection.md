

# Feature Context: Hero Section

## 1. REQUIRED DESIGN SYSTEM SNIPPETS (FOR AI USE)

### CSS Variables from `_variables.scss`:

:root {
  // === Colors ===
  --color-bg-primary: #061818;
  --color-text-primary: #F6D982;
  --color-title-hover: #F5C452;
  --color-card-text: #FFFAEA;
  --color-overlay: #002B20;

  // === Typography ===
  --font-weight-bold: 700;

  // === Spacing Desktop ===
  --space-title-text-desktop: 24px;
  --space-section-button-desktop: 40px;
}
SCSS Mixins from _mixins.scss:

@mixin respond($breakpoint) {
  // Only providing the 'sm' breakpoint for this task
  @if $breakpoint == sm { @media (max-width: 440px) { @content; } }
}
2. Overall Goal
To create the main Hero section for the home page. It must be a full-width, full-height visual introduction to the site.

3. Component Files
src/modules/home/HeroSection/HeroSection.jsx

src/modules/home/HeroSection/HeroSection.module.scss

4. JSX Structure (HeroSection.jsx)
JavaScript

// Same JSX structure as before
import Image from 'next/image';
import Link from 'next/link';
import styles from './HeroSection.module.scss';

const HeroSection = () => {
  return (
    <section className={styles.heroSection}>
      <div className={styles.backgroundImage}>
        <Image
          src="[https://picsum.photos/seed/hero/1920/1080](https://picsum.photos/seed/hero/1920/1080)"
          alt="Spiritual and tranquil background"
          fill
          quality={80}
          priority={true}
          style={{ objectFit: 'cover' }}
        />
        <div className={styles.overlay}></div>
      </div>
      <div className={`${styles.content} container`}>
        <h1 className={styles.title}>تبدیل معامله به تعالی</h1>
        <p className={styles.subtitle}>
          فضایی برای رشد روح، تمرین بیداری و خدمت عاشقانه
        </p>
        <Link href="#products" className={`${styles.ctaButton} card-button`}>
          مشاهده محصولات
        </Link>
      </div>
    </section>
  );
};

export default HeroSection;
5. SCSS Styling (HeroSection.module.scss)
Create the SCSS styles for the component. Crucially, you MUST only use the variables and mixins provided in Section 1 of this document. Do not invent any new variables or use ones not listed there. Do not import any variable or mixin files.