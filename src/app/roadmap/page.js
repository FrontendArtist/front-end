import Link from 'next/link';
import Breadcrumb from '@/components/ui/BreadCrumb/Breadcrumb';
import styles from './page.module.scss';
import { SITE_NAME } from '@/lib/constants';

export const metadata = {
  title: 'نقشه راه ورود به طرح الهی',
  description: `نقشه راه گام‌به‌گام آموزش‌ها، خودشناسی و مراحل سلوک عملی در ${SITE_NAME}.`,
  alternates: {
    canonical: '/roadmap',
  },
};

/**
 * ArrowHead — نوک فلش با ابعاد ثابت بدون تغییر شکل در موبایل و دسکتاپ
 */
function ArrowHead({ className = '' }) {
  return (
    <svg viewBox="0 0 14 9" className={`${styles.arrowHeadSvg} ${className}`} aria-hidden="true">
      <polyline points="1.5,1.5 7,7.5 12.5,1.5" />
    </svg>
  );
}

/**
 * InlineVerticalArrow — فلش عمودی داخل هر ستون
 */
function InlineVerticalArrow({ stretch = false }) {
  return (
    <div
      className={`${styles.inlineArrowWrapper} ${stretch ? styles.inlineArrowStretch : ''}`}
      aria-hidden="true"
    >
      <span className={styles.inlineArrowStem} />
      <ArrowHead />
    </div>
  );
}

/**
 * RightColumnArrow — فلش عمودی در ستون راست (مسیر اصلی)
 */
function RightColumnArrow() {
  return (
    <div className={styles.gridRow} aria-hidden="true">
      <div className={styles.colLeft} />
      <div className={styles.colRight}>
        <InlineVerticalArrow />
      </div>
    </div>
  );
}

/**
 * SplitConnector — انشعاب از ستون راست به هر دو ستون راست و چپ (دقیقاً مطابق نمودار)
 */
function SplitConnector() {
  return (
    <div className={styles.branchConnector} aria-hidden="true">
      {/* خط مستقیم ستون راست */}
      <div className={styles.rightStraightLine}>
        <span className={styles.inlineArrowStem} />
        <ArrowHead />
      </div>

      {/* خط انشعاب با گوشه‌های گرد از ستون راست به مرکز ستون چپ */}
      <div className={styles.splitElbowTop} />
      <div className={styles.splitElbowBottom}>
        <ArrowHead className={styles.splitArrowHead} />
      </div>
    </div>
  );
}

/**
 * MergeConnector — همگرایی از ستون چپ و ستون راست به گره واحد در ستون راست
 */
function MergeConnector() {
  return (
    <div className={styles.branchConnector} aria-hidden="true">
      {/* خط مستقیم ستون راست */}
      <div className={styles.rightStraightLine}>
        <span className={styles.inlineArrowStem} />
        <ArrowHead />
      </div>

      {/* خط همگرایی با گوشه‌های گرد از مرکز ستون چپ به ستون راست */}
      <div className={styles.mergeElbowTop} />
      <div className={styles.mergeElbowBottom}>
        <ArrowHead className={styles.mergeArrowHead} />
      </div>
    </div>
  );
}

export default function RoadmapPage() {
  return (
    <main className={styles.main}>
      <div className={styles.container}>
        {/* Top bar: Breadcrumb + Back button */}
        <div className={styles.topBar}>
          <Breadcrumb
            items={[
              { label: 'خانه', href: '/' },
              { label: 'نقشه راه طرح الهی' },
            ]}
          />

          {/* <Link href="/" className={styles.backButton}>
            <span>بازگشت به صفحه اصلی</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={styles.backIcon}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          </Link> */}
        </div>

        {/* Page Header */}
        <header className={styles.heroHeader}>
          <span className={styles.badge}>مسیر بیداری و خودشناسی</span>
          <h1 className={styles.mainTitle}>نقشه راه ورود به طرح الهی</h1>
          <p className={styles.subtitle}>
            گام‌به‌گام از آغاز آموزش‌ها تا ورود به سلوک عملی زیر نظر مستقیم استاد
          </p>
        </header>

        {/* Flowchart Board */}
        <section className={styles.boardCard} aria-label="نمودار نقشه راه طرح الهی">

          <div className={styles.flowchart}>
            {/* ۱. ورود به طرح الهی */}
            <div className={styles.gridRow}>
              <div className={styles.colLeft} />
              <div className={styles.colRight}>
                <div className={`${styles.nodeCard} ${styles.nodeRoot}`}>
                  <span className={styles.nodeTitle}>ورود به طرح الهی</span>
                </div>
              </div>
            </div>

            {/* انشعاب اول */}
            <SplitConnector />

            {/* ۲. شروع آموزش + همراهی در طول مسیر */}
            <div className={styles.gridRow}>
              <div className={styles.colLeft}>
                <div className={`${styles.nodeCard} ${styles.nodeCompanion}`}>
                  <span className={styles.nodeText}>
                    همراهی در طول مسیر: عضویت در کانال‌های «طرح الهی» و «از خاک تا افلاک عمومی»
                  </span>
                </div>
              </div>
              <div className={styles.colRight}>
                <div className={styles.nodeCard}>
                  <span className={styles.nodeText}>
                    شروع آموزش: تماشای دو جلسه «راز شهر گم‌شده»
                  </span>
                </div>
              </div>
            </div>

            {/* فلش به قدم‌های ۱ تا ۵ */}
            <RightColumnArrow />

            {/* ۳. از خاک تا افلاک: قدم‌های ۱ تا ۵ */}
            <div className={styles.gridRow}>
              <div className={styles.colLeft} />
              <div className={styles.colRight}>
                <div className={styles.nodeCard}>
                  <span className={styles.nodeText}>
                    «از خاک تا افلاک»: قدم‌های ۱ تا ۵
                  </span>
                </div>
              </div>
            </div>

            {/* انشعاب دوم به دو شاخه موازی */}
            <SplitConnector />

            {/* ۴. دو شاخه آموزشی موازی */}
            <div className={`${styles.gridRow} ${styles.parallelBranchesRow}`}>
              {/* شاخه چپ: ۳ مرحله (مرحله آخر هم‌تراز با مرحله چهارم شاخه راست) */}
              <div className={styles.colLeftParallel}>
                <div className={styles.nodeCard}>
                  <span className={styles.nodeText}>
                    ادامه «از خاک تا افلاک»: قدم‌های ۶ تا ۱۳
                  </span>
                </div>

                <InlineVerticalArrow />

                <div className={styles.nodeCard}>
                  <span className={styles.nodeText}>
                    «تغییر مسیر»: ۲ قدم
                  </span>
                </div>

                <InlineVerticalArrow stretch={true} />

                <div className={styles.nodeCard}>
                  <span className={styles.nodeText}>
                    «مهاجرت»: ۳ قدم
                  </span>
                </div>
              </div>

              {/* شاخه راست: ۴ مرحله */}
              <div className={styles.colRightParallel}>
                <div className={styles.nodeCard}>
                  <span className={styles.nodeText}>
                    «شناخت سایه‌های درون»
                  </span>
                </div>

                <InlineVerticalArrow />

                <div className={styles.nodeCard}>
                  <span className={styles.nodeText}>
                    «ازدواج کائناتی»
                  </span>
                </div>

                <InlineVerticalArrow />

                <div className={styles.nodeCard}>
                  <span className={styles.nodeText}>
                    «کیمیاگری روح»
                  </span>
                </div>

                <InlineVerticalArrow />

                <div className={styles.nodeCard}>
                  <span className={styles.nodeText}>
                    «شناخت هفت چاکرا»
                  </span>
                </div>
              </div>
            </div>

            {/* همگرایی دو شاخه */}
            <MergeConnector />

            {/* ۵. پایان هر دو شاخه آموزشی */}
            <div className={styles.gridRow}>
              <div className={styles.colLeft} />
              <div className={styles.colRight}>
                <div className={`${styles.nodeCard} ${styles.nodeMilestone}`}>
                  <span className={styles.nodeText}>
                    پایان هر دو شاخه آموزشی
                  </span>
                </div>
              </div>
            </div>

            <RightColumnArrow />

            {/* ۶. تکمیل فرم نمودار سطح آگاهی */}
            <div className={styles.gridRow}>
              <div className={styles.colLeft} />
              <div className={styles.colRight}>
                <div className={styles.nodeCard}>
                  <span className={styles.nodeText}>
                    تکمیل فرم نمودار سطح آگاهی
                  </span>
                </div>
              </div>
            </div>

            <RightColumnArrow />

            {/* ۷. ارسال فرم برای استاد */}
            <div className={styles.gridRow}>
              <div className={styles.colLeft} />
              <div className={styles.colRight}>
                <div className={styles.nodeCard}>
                  <span className={styles.nodeText}>
                    ارسال فرم برای استاد
                  </span>
                </div>
              </div>
            </div>

            <RightColumnArrow />

            {/* ۸. دریافت دستورهای سلوک عملی از استاد */}
            <div className={styles.gridRow}>
              <div className={styles.colLeft} />
              <div className={styles.colRight}>
                <div className={styles.nodeCard}>
                  <span className={styles.nodeText}>
                    دریافت دستورهای سلوک عملی از استاد
                  </span>
                </div>
              </div>
            </div>

            <RightColumnArrow />

            {/* ۹. آغاز سلوک عملی زیر نظر مستقیم استاد */}
            <div className={styles.gridRow}>
              <div className={styles.colLeft} />
              <div className={styles.colRight}>
                <div className={`${styles.nodeCard} ${styles.nodeMilestone}`}>
                  <span className={styles.nodeText}>
                    آغاز سلوک عملی زیر نظر مستقیم استاد
                  </span>
                </div>
              </div>
            </div>

            <RightColumnArrow />

            {/* ۱۰. عضویت در کانال‌های از سی مرغ تا سیمرغ و کلام نور */}
            <div className={styles.gridRow}>
              <div className={styles.colLeft} />
              <div className={styles.colRight}>
                <div className={`${styles.nodeCard} ${styles.nodeFinal}`}>
                  <span className={styles.nodeText}>
                    عضویت در کانال‌های «از سی مرغ تا سیمرغ» و «کلام نور»
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Bottom Back CTA */}
        <div className={styles.bottomActions}>
          <Link href="/courses" className={styles.coursesButton}>
            مشاهده دوره‌های آموزشی
          </Link>
          <Link href="/" className={styles.backButtonLarge}>
            <span>بازگشت به صفحه اصلی</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={styles.backIcon}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          </Link>
        </div>
      </div>
    </main>
  );
}
