/** اسکلت بارگذاری صفحهٔ سفارش‌ها (واکشی سروری چند ثانیه طول می‌کشد) */
import styles from './orders.module.scss';

export default function Loading() {
    return (
        <div className={styles.page} aria-busy="true" aria-label="در حال بارگذاری سفارش‌ها">
            <div className={styles.skeleton}>
                <span className={styles['skeleton--title']} />
                <span className={styles['skeleton--bar']} />
                {Array.from({ length: 6 }, (_, i) => <span key={i} className={styles['skeleton--row']} />)}
            </div>
        </div>
    );
}
