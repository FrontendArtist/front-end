import TestimonialsSlider from './TestimonialsSlider';
import styles from './TestimonialsSection.module.scss';

const TestimonialsSection = ({ data = [], serverError = false }) => {
  const testimonials = data;

  return (
    <section className={`${styles.testimonialsSection} section`}>
      <div className={`${styles.container} container`}>
        <header className={styles.header}>
          <h2 className={styles.title}>نظرات</h2>
        </header>
        {serverError ? (
          <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-error)' }}>ارتباط با سرور برقرار نشد.</p>
        ) : testimonials && testimonials.length > 0 ? (
          <TestimonialsSlider testimonials={testimonials} />
        ) : (
          <div className={styles.emptyState}>
            <p>هیچ نظری موجود نیست.</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default TestimonialsSection;
