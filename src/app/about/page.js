/**
 * About Page - صفحه درباره ما
 * 
 * این صفحه شامل اطلاعات درباره طرح الهی، مأموریت، ارزش‌ها و آموزه‌ها است.
 * Server Component با محتوای استاتیک.
 */

import Breadcrumb from '@/components/ui/BreadCrumb/Breadcrumb';
import styles from './page.module.scss';

export const metadata = {
    title: 'درباره ما | طرح الهی',
    description: 'طرح الهی؛ مسیری برای خودشناسی، بیداری معنوی، نشر آگاهی و حرکت آگاهانه در مسیر زندگی بر پایه آموزه‌های قرآن و مولانا.',
    keywords: 'درباره ما, طرح الهی, نشر آگاهی, استاد مجید سعیدیان, خودشناسی, بیداری معنوی, قرآن, مثنوی, عرفان',
};

export default function AboutPage() {
    const values = [
        {
            title: 'نشر آگاهی',
            desc: 'گسترش نگاهی عمیق‌تر به خود، زندگی و حقیقت',
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M12 3c-3.314 0-6 2.686-6 6 0 2.222 1.209 4.16 3 5.198V15.75c0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75v-1.552c1.791-1.038 3-2.976 3-5.198 0-3.314-2.686-6-6-6z" />
                </svg>
            )
        },
        {
            title: 'اصالت در آموزش',
            desc: 'ارائه آموزه‌هایی ریشه‌دار در مطالعه، تجربه و مسیر سلوک',
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18c-2.305 0-4.408.867-6 2.292m0-14.25v14.25" />
                </svg>
            )
        },
        {
            title: 'از دانایی تا آگاهی',
            desc: 'کمک به تبدیل مفاهیم آموخته‌شده به درکی زنده و قابل تجربه',
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                </svg>
            )
        },
        {
            title: 'رشد و تحول درونی',
            desc: 'ایجاد بستری برای شناخت خویشتن و حرکت آگاهانه در زندگی',
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 005.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
                </svg>
            )
        },
        {
            title: 'عمق و کیفیت',
            desc: 'توجه به معنا، محتوا و تأثیر واقعی هر آموزش در مسیر انسان',
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385c.116.488-.42.879-.844.622l-4.77-2.887a.563.563 0 00-.582 0l-4.77 2.887c-.425.257-.96-.134-.844-.622l1.285-5.385a.563.563 0 00-.182-.557l-4.204-3.602c-.38-.325-.178-.948.32-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                </svg>
            )
        },
        {
            title: 'همراهی در مسیر',
            desc: 'فراهم‌کردن فضایی برای ادامه مسیر شناخت، بیداری و رشد آگاهانه',
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a5.97 5.97 0 00-.942 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                </svg>
            )
        }
    ];

    return (
        <main className={styles.main}>
            <div className={styles.container}>
                <Breadcrumb items={[{ label: 'خانه', href: '/' }, { label: 'درباره ما' }]} />

                {/* Hero / Header Section */}
                <header className={styles.heroHeader}>
                    <h1 className={styles.mainTitle}>درباره ما</h1>
                    <p className={styles.subtitle}>طرح الهی؛ مسیری برای آگاهی و بیداری</p>
                    
                    <div className={styles.heroCard}>
                        <p className={styles.heroQuote}>
                            «طرح الهی» با شعار «طرح الهی ما نشر آگاهی است» شکل گرفته تا فضایی برای خودشناسی، بیداری معنوی و حرکت آگاهانه در مسیر زندگی فراهم کند؛ مسیری که انسان در آن بتواند نگاه عمیق‌تری به خود، جهان و معنای حضورش در این زندگی پیدا کند.
                        </p>
                    </div>
                </header>

                {/* Mission Section */}
                <section className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <h2 className={styles.sectionTitle}>مأموریت ما</h2>
                    </div>
                    <div className={styles.missionCard}>
                        <p className={styles.paragraph}>
                            مأموریت طرح الهی، نشر آگاهی و فراهم‌کردن مسیری برای شناخت عمیق‌تر انسان از خود و حقیقت زندگی است.
                        </p>
                        <p className={styles.paragraph}>
                            تلاش ما این است که آموزه‌های معنوی، مفاهیم قرآن و اندیشه‌های مولانا به شکلی قابل‌فهم و کاربردی در دسترس جویندگان قرار بگیرد و زمینه‌ای برای بیداری، تحول درونی و تجربه آگاهانه‌تر زندگی ایجاد شود.
                        </p>
                        <p className={styles.paragraph}>
                            می‌خواهیم هر فرد بتواند از دل این آموزش‌ها، پاسخ پرسش‌های عمیق زندگی خود را جست‌وجو کند، الگوهای ذهنی و درونی‌اش را بهتر بشناسد و با آگاهی بیشتری مسیر شخصی زندگی‌اش را طی کند.
                        </p>
                    </div>
                </section>

                {/* Values Section */}
                <section className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <h2 className={styles.sectionTitle}>ارزش‌های ما</h2>
                    </div>
                    <div className={styles.valuesGrid}>
                        {values.map((val, idx) => (
                            <div key={idx} className={styles.valueCard}>
                                <div className={styles.valueIconWrapper}>
                                    {val.icon}
                                </div>
                                <h3 className={styles.valueTitle}>{val.title}</h3>
                                <p className={styles.valueDesc}>{val.desc}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Teachings & Mentor Section */}
                <section className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <h2 className={styles.sectionTitle}>آموزه‌هایی بر پایه قرآن، مثنوی و مولانا</h2>
                    </div>
                    <div className={styles.featureCard}>
                        <p className={styles.paragraph}>
                            بخش مهمی از محتوای طرح الهی بر آموزه‌های استاد مجید سعیدیان استوار است؛ پژوهشگر و مدرس حوزه قرآن، مثنوی و عرفان که سال‌ها در مسیر مطالعه، سلوک و تجربه این مفاهیم گام برداشته است.
                        </p>
                        <p className={styles.paragraph}>
                            در آموزش‌های ایشان، مفاهیم عمیق قرآن و آثار مولانا باز می‌شوند تا مخاطب بتواند ارتباط آن‌ها را با زندگی، روابط، انتخاب‌ها، ترس‌ها، خواسته‌ها و مسیر رشد درونی خود بهتر درک کند.
                        </p>
                    </div>
                </section>

                {/* Concept & Experience Grid */}
                <div className={styles.twoColGrid}>
                    {/* From Knowledge to Awareness */}
                    <section className={styles.section}>
                        <div className={styles.sectionHeader}>
                            <h2 className={styles.sectionTitle}>از دانایی تا آگاهی</h2>
                        </div>
                        <div className={styles.featureCard}>
                            <p className={styles.paragraph}>
                                در نگاه طرح الهی، دانستن آغاز مسیر است. زمانی که یک مفهوم در وجود انسان تجربه و در زندگی او جاری می‌شود، دانایی به آگاهی تبدیل می‌شود.
                            </p>
                            <p className={styles.paragraph}>
                                به همین دلیل، آموزش‌های طرح الهی با هدف ایجاد تغییر در نوع نگاه و شناخت عمیق‌تر انسان از خویشتن ارائه می‌شوند؛ از شناخت ذهن و الگوهای درونی تا درک عشق، حضور، رهایی، معنای زندگی و مسیر حرکت انسان به سوی حقیقت.
                            </p>
                        </div>
                    </section>

                    {/* Hundreds of Hours of Training */}
                    <section className={styles.section}>
                        <div className={styles.sectionHeader}>
                            <h2 className={styles.sectionTitle}>صدها ساعت آموزش و تجربه</h2>
                        </div>
                        <div className={styles.featureCard}>
                            <p className={styles.paragraph}>
                                در طول سال‌ها، صدها ساعت آموزش در قالب جلسات، کلاس‌ها، دوره‌ها و محتوای آموزشی در طرح الهی تولید شده است.
                            </p>
                            <p className={styles.paragraph}>
                                این مجموعه تلاش می‌کند مسیرهای مختلفی برای ورود به این آموزه‌ها فراهم کند تا هر فرد متناسب با دغدغه‌ها و مرحله‌ای که در آن قرار دارد، بتواند مسیر مناسب خود را پیدا کند.
                            </p>
                        </div>
                    </section>
                </div>

                {/* Destination & Closing Slogan Section */}
                <section className={styles.section}>
                    <div className={styles.destinationCard}>
                        <h2 className={styles.destinationTitle}>مقصد این مسیر</h2>
                        <p className={styles.destinationText}>
                            هدف طرح الهی ایجاد فضایی برای جست‌وجو، تأمل، شناخت خویشتن و تجربه آگاهانه‌تر زندگی است؛ فضایی که بتواند انسان را قدم‌به‌قدم به آرامش درونی، عشق، روشنایی و حقیقت نزدیک‌تر کند.
                        </p>
                        <div className={styles.sloganDivider}></div>
                        <h3 className={styles.finalSlogan}>«طرح الهی ما، نشر آگاهی است»</h3>
                    </div>
                </section>
            </div>
        </main>
    );
}

