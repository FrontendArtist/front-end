/**
 * @file src/components/admin/StatsCard/StatsCard.jsx
 * @description کامپوننت کارت آمار برای داشبورد ادمین
 *
 * ⚙️ Server Component – هیچ state یا hook ندارد.
 * کاملاً Presentational است: فقط props می‌گیرد و UI رندر می‌کند.
 *
 * @param {object}  props
 * @param {string}  props.title       - عنوان کارت (مثلاً 'کل سفارش‌ها')
 * @param {string}  props.value       - مقدار نمایش‌داده‌شده (از قبل فرمت‌شده)
 * @param {string}  props.icon        - ایموجی یا کاراکتر آیکون
 * @param {string}  props.accentColor - رنگ تاکید (hex یا CSS value)
 * @param {string}  [props.subtitle]  - متن کمکی زیر مقدار (اختیاری)
 * @param {boolean} [props.isError]   - اگر true باشد، حالت خطا/empty state نمایش داده می‌شود
 */

import styles from './StatsCard.module.scss';

export default function StatsCard({
    title,
    value,
    icon,
    accentColor,
    subtitle,
    isError = false,
}) {
    return (
        <article
            className={`${styles.card} ${isError ? styles['card--error'] : ''}`}
            /*
             * border-right-color را به صورت inline تنظیم می‌کنیم تا هر کارت
             * رنگ منحصربه‌فرد خودش را داشته باشد، بدون نیاز به کلاس‌های جداگانه.
             */
            style={{ '--card-accent': accentColor }}
        >
            {/* ── آیکون آمار ───────────────────────────────────── */}
            <div className={styles.card__icon} aria-hidden="true">
                {icon}
            </div>

            {/* ── بدنه اصلی ────────────────────────────────────── */}
            <div className={styles.card__body}>
                <h2 className={styles.card__title}>{title}</h2>

                {/*
         * اگر isError=true باشد (داده در دسترس نیست یا سرور خاموش است)،
         * به جای عدد، یک پیام خطایی ملایم نشان می‌دهیم.
         * این Graceful Degradation است: اپ کرش نمی‌کند، فقط وضعیت را نشان می‌دهد.
         */}
                {isError ? (
                    <p className={styles.card__error}>اطلاعات در دسترس نیست</p>
                ) : (
                    <p className={styles.card__value} style={{ color: accentColor }}>
                        {value}
                    </p>
                )}

                {/* زیرنویس اختیاری (مثلاً 'نسبت به ماه گذشته') */}
                {subtitle && !isError && (
                    <span className={styles.card__subtitle}>{subtitle}</span>
                )}
            </div>
        </article>
    );
}
