/**
 * About Page - صفحه درباره ما
 * 
 * این صفحه شامل اطلاعات درباره طره الهی، ماموریت، و معرفی تیم است.
 * Server Component با محتوای استاتیک.
 */

import Image from 'next/image';
import Breadcrumb from '@/components/ui/BreadCrumb/Breadcrumb';
import styles from './page.module.scss';

export const metadata = {
    title: 'درباره ما | طره الهی',
    description: 'داستان طره الهی، ماموریت ما، و معرفی تیم متخصص. بیشتر درباره ما بدانید.',
    keywords: 'درباره ما, طره الهی, ماموریت, تیم, معرفی شرکت',
};

export default function AboutPage() {
    return (
        <main className={styles.main}>
            <div className={styles.container}>
                <Breadcrumb items={[{ label: 'خانه', href: '/' }, { label: 'درباره ما' }]} />

                {/* Header Section */}
                <header className={styles.header}>
                    <h1 className={styles.title}>درباره ما</h1>
                </header>

                {/* Mission Section */}
                <section className={styles.missionSection}>
                    <div className={styles.missionGrid}>
                        <div className={styles.missionContent}>
                            <h2 className={styles.sectionTitle}>ماموریت ما</h2>
                            <p className={styles.missionText}>
                                در طره الهی، ماموریت ما فراتر از ارائه خدمات است. ما معتقدیم که هر پروژه،
                                فرصتی برای خلق ارزش پایدار و ایجاد تاثیر مثبت در زندگی مشتریان است.
                            </p>
                            <p className={styles.missionText}>
                                با تکیه بر تیمی متخصص و متعهد، ما تلاش می‌کنیم تا بهترین راهکارها را
                                با استفاده از جدیدترین فناوری‌ها و روش‌های نوین به شما ارائه دهیم.
                            </p>
                            <p className={styles.missionText}>
                                اعتماد شما سرمایه‌ی ماست و ما متعهدیم که با شفافیت، کیفیت و نوآوری،
                                همواره در کنار شما باشیم.
                            </p>

                            {/* Mission Values */}
                            <div className={styles.values}>
                                <div className={styles.valueItem}>
                                    <div className={styles.valueIcon}>✓</div>
                                    <div>
                                        <h3 className={styles.valueTitle}>کیفیت برتر</h3>
                                        <p className={styles.valueText}>تعهد به ارائه بالاترین استانداردها</p>
                                    </div>
                                </div>
                                <div className={styles.valueItem}>
                                    <div className={styles.valueIcon}>✓</div>
                                    <div>
                                        <h3 className={styles.valueTitle}>نوآوری</h3>
                                        <p className={styles.valueText}>استفاده از جدیدترین فناوری‌ها</p>
                                    </div>
                                </div>
                                <div className={styles.valueItem}>
                                    <div className={styles.valueIcon}>✓</div>
                                    <div>
                                        <h3 className={styles.valueTitle}>اعتماد</h3>
                                        <p className={styles.valueText}>شفافیت و صداقت در همه مراحل</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className={styles.missionImage}>
                            <div className={styles.imagePlaceholder}>
                                <svg className={styles.placeholderIcon} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                </svg>
                                <p>تصویر ماموریت</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Team Section */}
                <section className={styles.teamSection}>
                    <h2 className={styles.sectionTitle}>تیم ما</h2>
                    <p className={styles.sectionSubtitle}>
                        آشنایی با افراد متخصص و متعهدی که طره الهی را می‌سازند
                    </p>

                    <div className={styles.teamGrid}>
                        {/* Mentor Card */}
                        <div className={styles.teamCard}>
                            <div className={styles.avatarWrapper}>
                                <div className={styles.avatarPlaceholder}>
                                    <svg className={styles.avatarIcon} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                </div>
                            </div>
                            <div className={styles.teamContent}>
                                <h3 className={styles.memberName}>استاد منتور</h3>
                                <p className={styles.memberRole}>مشاور ارشد</p>
                                <p className={styles.memberBio}>
                                    با بیش از ۱۵ سال تجربه در حوزه مدیریت و مشاوره، استاد منتور
                                    راهنمای اصلی تیم طره الهی در تعیین مسیرهای استراتژیک و تضمین
                                    کیفیت خدمات است. تخصص ایشان در برنامه‌ریزی بلندمدت و توسعه کسب‌وکار،
                                    نقش مهمی در موفقیت پروژه‌های ما ایفا کرده است.
                                </p>
                                <div className={styles.memberStats}>
                                    <div className={styles.stat}>
                                        <span className={styles.statNumber}>15+</span>
                                        <span className={styles.statLabel}>سال تجربه</span>
                                    </div>
                                    <div className={styles.stat}>
                                        <span className={styles.statNumber}>100+</span>
                                        <span className={styles.statLabel}>پروژه موفق</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Hakim Elahi Card */}
                        <div className={styles.teamCard}>
                            <div className={styles.avatarWrapper}>
                                <div className={styles.avatarPlaceholder}>
                                    <svg className={styles.avatarIcon} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                </div>
                            </div>
                            <div className={styles.teamContent}>
                                <h3 className={styles.memberName}>حکیم الهی</h3>
                                <p className={styles.memberRole}>بنیان‌گذار و مدیرعامل</p>
                                <p className={styles.memberBio}>
                                    حکیم الهی، بنیان‌گذار طره الهی، فردی با چشم‌انداز روشن و اشتیاق
                                    به نوآوری است. با تجربه گسترده در مدیریت پروژه‌های بزرگ و رهبری
                                    تیم‌های چندتخصصی، ایشان موفق شده‌اند طره الهی را به یکی از
                                    نام‌های معتبر در صنعت تبدیل کنند. فلسفه کاری او بر پایه اعتماد،
                                    کیفیت و رشد پایدار استوار است.
                                </p>
                                <div className={styles.memberStats}>
                                    <div className={styles.stat}>
                                        <span className={styles.statNumber}>10+</span>
                                        <span className={styles.statLabel}>سال تجربه</span>
                                    </div>
                                    <div className={styles.stat}>
                                        <span className={styles.statNumber}>200+</span>
                                        <span className={styles.statLabel}>مشتری راضی</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* CTA Section */}
                <section className={styles.ctaSection}>
                    <div className={styles.ctaCard}>
                        <h2 className={styles.ctaTitle}>آماده همکاری با ما هستید؟</h2>
                        <p className={styles.ctaText}>
                            بیایید با هم پروژه بعدی شما را به واقعیت تبدیل کنیم
                        </p>
                        <a href="/contact" className={styles.ctaButton}>
                            تماس با ما
                        </a>
                    </div>
                </section>
            </div>
        </main>
    );
}
