/**
 * ProductSpecs — Server Component
 *
 * جدول مشخصات فنی محصول با طراحی Zebra-Striped حرفه‌ای
 * آرایه‌ای از { key, value } را دریافت کرده و در قالب جدول HTML رندر می‌کند.
 *
 * @param {{ specifications: Array<{ key: string, value: string }> }} props
 * @returns {JSX.Element | null}
 */

import styles from './ProductSpecs.module.scss';

export default function ProductSpecs({ specifications }) {
  // اگر آرایه خالی بود یا وجود نداشت، چیزی رندر نکن
  if (!specifications || specifications.length === 0) {
    return null;
  }

  return (
    <section className={styles.specsSection} aria-label="مشخصات فنی محصول">
      {/* عنوان بخش */}
      <header className={styles.specsHeader}>
        <h2 className={styles.specsTitle}>مشخصات فنی</h2>
      </header>

      {/* Wrapper برای overflow افقی در موبایل */}
      <div className={styles.tableWrapper}>
        <table className={styles.specsTable}>
          <caption className={styles.visuallyHidden}>جدول مشخصات فنی محصول</caption>
          <tbody>
            {specifications.map((spec, index) => (
              <tr
                key={spec.id || index}
                className={index % 2 === 0 ? styles.rowEven : styles.rowOdd}
              >
                {/* کلید مشخصه */}
                <th scope="row" className={styles.specKey}>
                  {spec.key}
                </th>
                {/* مقدار مشخصه */}
                <td className={styles.specValue}>
                  {spec.value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
