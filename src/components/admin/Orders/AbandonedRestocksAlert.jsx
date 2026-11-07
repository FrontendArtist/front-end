/**
 * @file src/components/admin/Orders/AbandonedRestocksAlert.jsx
 * @description یک خط هشدار برای لغوهایی که برگشت موجودی‌شان رها شده (BND-05)
 *
 * جزئیات (نام کالا، علت، دکمه‌ها) در پنل همان سفارش است؛ اینجا فقط تعداد می‌آید و ردیف‌های مربوط
 * در جدول برچسب «موجودی برنگشته» دارند. اگر دریافت فهرست شکست بخورد، «نامشخص» نمایش داده می‌شود
 * تا نبودِ هشدار به‌اشتباه به‌معنی سالم‌بودن برداشت نشود.
 */

import styles from './AbandonedRestocksAlert.module.scss';

const faCount = (n) => n.toLocaleString('fa-IR');

export default function AbandonedRestocksAlert({ restocks, error }) {
    if (error) {
        return (
            <div className={styles.alert} role="alert">
                <p>وضعیت برگشت موجودی لغوها نامشخص است: {error}</p>
            </div>
        );
    }

    const cartIds = [...new Set((restocks || []).filter((r) => r.abandoned).map((r) => String(r.cartId)))];
    if (cartIds.length === 0) return null;

    // همان «شمارهٔ سفارش» ستون جدول (۸ نویسهٔ اول شناسهٔ سبد) تا ادمین سفارش را پیدا کند
    const orderNumbers = cartIds.map((id) => id.slice(0, 8).toUpperCase());

    return (
        <div className={styles.alert} role="alert">
            <p>
                {faCount(cartIds.length)} سفارش لغوشده موجودی‌اش برنگشته و نیاز به اصلاح دستی دارد
                (سفارش <span dir="ltr">{orderNumbers.join('، ')}</span>)؛ سفارش را باز کنید تا کالا و راه اصلاح را ببینید.
            </p>
        </div>
    );
}
