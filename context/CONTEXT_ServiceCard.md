# Feature Context: ServiceCard Component

## 1. Goal
Create a reusable `ServiceCard` component, visually identical to the `CourseCard`.

## 2. Files
- `src/components/cards/ServiceCard/ServiceCard.jsx`
- `src/components/cards/ServiceCard/ServiceCard.module.scss`

## 3. JSX Structure (`ServiceCard.jsx`)
```jsx
import Image from 'next/image';
import Link from 'next/link';
import styles from './ServiceCard.module.scss';

const ServiceCard = ({ service }) => {
  if (!service) return null;
  const { slug, image, title, description } = service;

  return (
    <div className={`${styles.serviceCard} card`}>
      <div className={styles.imageWrapper}>
        <Image src={image.url} alt={image.alt || title} fill sizes="50vw" className={styles.serviceImage} />
      </div>
      <div className={styles.cardContent}>
        <h3 className={styles.cardTitle}>{title}</h3>
        <p className={styles.cardText}>{description}</p>
        <Link href={`/services/${slug}`} className={`${styles.ctaButton} card-button`}>
          بیشتر بدانید
        </Link>
      </div>
    </div>
  );
};
export default ServiceCard;
4. SCSS
The SCSS file should be identical in structure to CourseCard.module.scss to maintain visual consistency.


**۲. فایل `CONTEXT_ServicesSection.md`:**
```markdown
# Feature Context: Services Section for Home Page

## 1. Goal
Create a section to showcase services in a slider, using `BaseSlider` and `ServiceCard`.

## 2. Files
- `src/modules/home/ServicesSection/ServicesSection.jsx`
- `src/modules/home/ServicesSection/ServicesSection.module.scss`

## 3. JSX (`ServicesSection.jsx`)
```jsx
import Link from 'next/link';
import ServiceCard from '@/components/cards/ServiceCard/ServiceCard';
import BaseSlider from '@/components/layout/BaseSlider/BaseSlider';
import { mockServices } from '@/data/mock';
import styles from './ServicesSection.module.scss';

const ServicesSection = () => {
  const renderServiceCard = (service) => <ServiceCard service={service} />;

  return (
    <section className={`${styles.servicesSection} section`}>
      <div className="container">
        <header className={styles.header}>
          <h2 className={styles.title}>خدمات</h2>
          <Link href="/services" className={styles.viewAllLink}>
            مشاهده همه خدمات ...
          </Link>
        </header>
        <div className={styles.sliderWrapper}>
          <BaseSlider
            items={mockServices}
            renderItem={renderServiceCard}
            slidesPerView={2}
            loop={true}
          />
        </div>
      </div>
    </section>
  );
};
export default ServicesSection;
4. SCSS
The SCSS file should be identical in structure to CoursesSection.module.scss.


**پرامپت‌ها برای AI:**

ابتدا پرامپت زیر را برای ساخت `ServiceCard` اجرا کن:
```prompt
// Context & Rules are active.
// Current Task: @CONTEXT_ServiceCard.md
// Instruction: Create the `ServiceCard` component and its stylesheet based on the context 