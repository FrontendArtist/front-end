/**
 * Contact Page - صفحه تماس با ما
 * 
 * این صفحه شامل فرم تماس و اطلاعات تماس است.
 * Server Component که ContactForm را به‌عنوان Client Component استفاده می‌کند.
 */

import Breadcrumb from '@/components/ui/BreadCrumb/Breadcrumb';
import ContactForm from '@/modules/contact/components/ContactForm';
import styles from './page.module.scss';

export const metadata = {
    title: 'تماس با ما | طره الهی',
    description: 'با ما در ارتباط باشید. فرم تماس، شماره تماس، ایمیل و آدرس دفتر طره الهی.',
    keywords: 'تماس با ما, فرم تماس, پشتیبانی, ارتباط با طره الهی',
};

export default function ContactPage() {
    return (
        <main className={styles.contactPage}>
            <div className={styles.container}>
                <Breadcrumb items={[{ label: 'خانه', href: '/' }, { label: 'تماس با ما' }]} />

                {/* Header Section */}
                <section className={styles.header}>
                    <h1 className={styles.title}>تماس با ما</h1>
                </section>

                {/* Main Content Grid */}
                <div className={styles.contentGrid}>
                    {/* Contact Form */}
                    <div className={styles.formSection}>
                        <ContactForm />
                    </div>

                    {/* Contact Info */}
                    <aside className={styles.infoSection}>
                        <h2 className={styles.infoTitle}>اطلاعات تماس</h2>

                        <div className={styles.infoCards}>
                            {/* Phone Card */}
                            <div className={styles.infoCard}>
                                <div className={styles.iconWrapper}>
                                    <svg className={styles.icon} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                    </svg>
                                </div>
                                <div className={styles.cardContent}>
                                    <h3 className={styles.cardTitle}>تلفن</h3>
                                    <p className={styles.cardText} dir="ltr">+98 21 1234 5678</p>
                                    <p className={styles.cardText} dir="ltr">+98 912 345 6789</p>
                                </div>
                            </div>

                            {/* Email Card */}
                            <div className={styles.infoCard}>
                                <div className={styles.iconWrapper}>
                                    <svg className={styles.icon} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <div className={styles.cardContent}>
                                    <h3 className={styles.cardTitle}>ایمیل</h3>
                                    <p className={styles.cardText} dir="ltr">info@tarhelahi.com</p>
                                    <p className={styles.cardText} dir="ltr">support@tarhelahi.com</p>
                                </div>
                            </div>

                            {/* Address Card */}
                            <div className={styles.infoCard}>
                                <div className={styles.iconWrapper}>
                                    <svg className={styles.icon} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                </div>
                                <div className={styles.cardContent}>
                                    <h3 className={styles.cardTitle}>آدرس</h3>
                                    <p className={styles.cardText}>
                                        تهران، خیابان ولیعصر، نرسیده به میدان ونک، پلاک ۱۲۳۴
                                    </p>
                                </div>
                            </div>

                            {/* Social Media Card */}
                            <div className={styles.infoCard}>
                                <div className={styles.iconWrapper}>
                                    <svg className={styles.icon} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                                    </svg>
                                </div>
                                <div className={styles.cardContent}>
                                    <h3 className={styles.cardTitle}>شبکه‌های اجتماعی</h3>
                                    <div className={styles.socialLinks}>
                                        <a href="#" className={styles.socialLink} aria-label="Instagram">اینستاگرام</a>
                                        <a href="#" className={styles.socialLink} aria-label="Telegram">تلگرام</a>
                                        <a href="#" className={styles.socialLink} aria-label="LinkedIn">لینکدین</a>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Working Hours */}
                        <div className={styles.workingHours}>
                            <h3 className={styles.hoursTitle}>ساعات کاری</h3>
                            <div className={styles.hoursList}>
                                <div className={styles.hoursItem}>
                                    <span className={styles.day}>شنبه تا چهارشنبه</span>
                                    <span className={styles.time}>۹:۰۰ - ۱۸:۰۰</span>
                                </div>
                                <div className={styles.hoursItem}>
                                    <span className={styles.day}>پنج‌شنبه</span>
                                    <span className={styles.time}>۹:۰۰ - ۱۴:۰۰</span>
                                </div>
                                <div className={styles.hoursItem}>
                                    <span className={styles.day}>جمعه</span>
                                    <span className={styles.time}>تعطیل</span>
                                </div>
                            </div>
                        </div>
                    </aside>
                </div>
            </div>
        </main>
    );
}
