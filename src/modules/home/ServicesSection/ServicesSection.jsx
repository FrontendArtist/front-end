'use client';
import Link from 'next/link';
import ServiceCard from '@/components/cards/ServiceCard/ServiceCard';
import BaseSlider from '@/components/layout/BaseSlider/BaseSlider';
import styles from './ServicesSection.module.scss';

const ServicesSection = ({ data = [], serverError = false }) => {
  const renderServiceCard = (service) => <ServiceCard service={service} />;

  // Show fallback message if server error
  if (serverError) {
    return (
      <section className={`${styles.servicesSection} section`}>
        <div className="container">
          <header className={styles.header}>
            <h2 className={styles.title}>خدمات</h2>
            <Link href="/services" className={styles.viewAllLink}>
              مشاهده همه خدمات ...
            </Link>
          </header>
          <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-error)' }}>ارتباط با سرور برقرار نشد.</p>
        </div>
      </section>
    );
  }

  if (!data || data.length === 0) {
    return (
      <section className={`${styles.servicesSection} section`}>
        <div className="container">
          <header className={styles.header}>
            <h2 className={styles.title}>خدمات</h2>
            <Link href="/services" className={styles.viewAllLink}>
              مشاهده همه خدمات ...
            </Link>
          </header>
          <p style={{ textAlign: 'center', padding: '2rem' }}>در حال حاضر خدماتی وجود ندارد.</p>
        </div>
      </section>
    );
  }
  const servicesBreakpoints = {
    0: { slidesPerView: 1, spaceBetween: 15 },
    576: { slidesPerView: 2, spaceBetween: 15 },
    768: { slidesPerView: 2, spaceBetween: 20 },
    1024: { slidesPerView: 2, spaceBetween: 30 },
    1280: { slidesPerView: 2, spaceBetween: 30 },
  };
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
            items={data}
            renderItem={renderServiceCard}
            slidesPerView={2}
            loop={true}
            breakpoints={servicesBreakpoints}
          />
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;

