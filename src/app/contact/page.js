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
        <main className={styles.main}>
            <div className={styles.container}>
                <Breadcrumb items={[{ label: 'خانه', href: '/' }, { label: 'تماس با ما' }]} />

                {/* Main Content Grid */}
                <div className={styles.contentGrid}>
                    {/* Contact Form */}
                    <div className={styles.formSection}>
                        <ContactForm />
                    </div>

                </div>
            </div>
        </main>
    );
}
