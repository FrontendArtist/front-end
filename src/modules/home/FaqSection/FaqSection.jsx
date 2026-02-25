import Accordion from '@/components/ui/Accordion/Accordion';
import styles from './FaqSection.module.scss';

const FaqSection = ({ data = [] }) => {
  const faqs = data;

  return (
    <section className={`${styles.faqSection} section`}>
      <div className="container">
        <header className={styles.header}>
          <h2 className={styles.title}>سوالات متداول</h2>
        </header>
        {faqs.length > 0 ? (
          <div className={styles.accordionWrapper}>
            <Accordion items={faqs} />
          </div>
        ) : (
          <div className={styles.emptyState}>
            <p>هیچ سوال متداولی موجود نیست.</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default FaqSection;

