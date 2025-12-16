import styles from './orders.module.scss';

export const metadata = {
    title: 'سفارش‌های من | پنل کاربری',
    description: 'مشاهده و مدیریت سفارش‌های شما',
};

export default function OrdersPage() {
    return (
        <div className={styles.ordersCard}>
            <div className={styles.header}>
                <h1 className={styles.title}>سفارش‌های من</h1>
            </div>
            <div className={styles.placeholder}>
                <svg
                    width="80"
                    height="80"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className={styles.icon}
                >
                    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M16 10a4 4 0 0 1-8 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <h2 className={styles.placeholderTitle}>به زودی...</h2>
                <p className={styles.placeholderText}>
                    سفارش‌های شما به زودی در اینجا نمایش داده می‌شوند
                </p>
            </div>
        </div>
    );
}
