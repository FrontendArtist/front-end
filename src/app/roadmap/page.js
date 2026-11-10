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
function InlineVerticalArrow({ stretch = false, compact = false }) {
  return (
    <div
      className={`${styles.inlineArrowWrapper} ${stretch ? styles.inlineArrowStretch : ''} ${compact ? styles.inlineArrowCompact : ''
        }`}
      aria-hidden="true"
    >
      <span className={styles.inlineArrowStem} />
      <ArrowHead />
    </div>
  );
}

/**
 * RightColumnArrow — فلش عمودی در ستون راست (نسخه موبایل)
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
 * SplitConnector — انشعاب از ستون راست به هر دو ستون راست و چپ (نسخه موبایل)
 */
function SplitConnector() {
  return (
    <div className={styles.branchConnector} aria-hidden="true">
      <div className={styles.rightStraightLine}>
        <span className={styles.inlineArrowStem} />
        <ArrowHead />
      </div>
      <div className={styles.splitElbowTop} />
      <div className={styles.splitElbowBottom}>
        <ArrowHead className={styles.splitArrowHead} />
      </div>
    </div>
  );
}

/**
 * MergeConnector — همگرایی از ستون چپ و ستون راست به گره واحد در ستون راست (نسخه موبایل)
 */
function MergeConnector() {
  return (
    <div className={styles.branchConnector} aria-hidden="true">
      <div className={styles.rightStraightLine}>
        <span className={styles.inlineArrowStem} />
        <ArrowHead />
      </div>
      <div className={styles.mergeElbowTop} />
      <div className={styles.mergeElbowBottom}>
        <ArrowHead className={styles.mergeArrowHead} />
      </div>
    </div>
  );
}

/**
 * DesktopSplitConnector — انشعاب از «قدم‌های ۱ تا ۵» (71.5%) به دو شاخه موازی چپ (45.5%) و راست (81.5%)
 */
function DesktopSplitConnector() {
  return (
    <div className={styles.desktopSplitConnector} aria-hidden="true">
      <span className={styles.desktopSplitStem} />
      <div className={styles.desktopSplitForkLeft}>
        <ArrowHead className={styles.splitArrowHead} />
      </div>
      <div className={styles.desktopSplitForkRight}>
        <ArrowHead className={styles.mergeArrowHead} />
      </div>
    </div>
  );
}

/**
 * DesktopMergeConnector — همگرایی از دو شاخه موازی (45.5% و 81.5%) به ستون مرکزی پایین (62%)
 */
function DesktopMergeConnector() {
  return (
    <div className={styles.desktopMergeConnector} aria-hidden="true">
      <div className={styles.desktopMergeArmLeft} />
      <div className={styles.desktopMergeArmRight} />
      <div className={styles.desktopMergeCenterArrow}>
        <span className={styles.inlineArrowStem} />
        <ArrowHead />
      </div>
    </div>
  );
}

export default function RoadmapPage() {
  return (
    <main className={styles.main}>
      <div className={styles.container}>
        {/* Top bar: Breadcrumb + Download button */}
        <div className={styles.topBar}>
          <Breadcrumb
            items={[
              { label: 'خانه', href: '/' },
              { label: 'نقشه راه طرح الهی' },
            ]}
          />


        </div>

        {/* Page Header */}
        <header className={styles.heroHeader}>
          <h1 className={styles.mainTitle}>نقشه مسیر ورود به طرح الهی و آغاز سلوک عملی</h1>
          <p className={styles.subtitle}>
            گام‌به‌گام از آغاز آموزش‌ها تا ورود به سلوک عملی زیر نظر مستقیم استاد
          </p>

          <a
            href="/images/tarhelahi-roadmap.jpg"
            download="نقشه-راه-طرح-الهی.jpg"
            className={styles.downloadButton}
            title="دانلود نقشه راه به صورت تصویر (1920x1080)"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={styles.downloadIcon}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
              />
            </svg>
            <span>دانلود نقشه راه</span>
          </a>
        </header>

        {/* Flowchart Board */}
        <section className={styles.boardCard} aria-label="نمودار نقشه راه طرح الهی">
          {/* ═══════════════ نسخه دسکتاپ (چیدمان افقی ۱۶:۹ متناسب با ۱۹۲۰×۱۰۸۰) ═══════════════ */}
          <div className={styles.flowchartDesktop}>
            {/* ۱. گره ریشه در مرکز بالا + بازوهای چپ و راست */}
            <div className={styles.desktopRootRow}>
              <div className={styles.desktopRootWingLeft} aria-hidden="true">
                <ArrowHead className={styles.splitArrowHead} />
              </div>

              <div className={`${styles.nodeCardDesktop} ${styles.nodeRootDesktop}`}>
                <span className={styles.nodeTitleDesktop}>ورود به طرح الهی</span>
              </div>

              <div className={styles.desktopRootWingRight} aria-hidden="true">
                <ArrowHead className={styles.mergeArrowHead} />
              </div>
            </div>

            {/* ۲. ردیف بالای دوشاخه: چپ (همراهی در طول مسیر) و راست (شروع آموزش + قدم‌های ۱ تا ۵) */}
            <div className={styles.desktopTopBranchesRow}>
              <div className={styles.desktopTopLeftCol}>
                <div className={`${styles.nodeCardDesktop} ${styles.nodeCompanionDesktop}`}>
                  <span className={styles.nodeTextDesktop}>
                    همراهی در طول مسیر: عضویت در کانال‌های
                    <br />
                    «طرح الهی» و «از خاک تا افلاک عمومی»
                  </span>
                </div>
              </div>

              <div className={styles.desktopTopRightCol}>
                <div className={`${styles.nodeCardDesktop} ${styles.nodeTwoLineDesktop}`}>
                  <span className={styles.nodeTextDesktop}>
                    شروع آموزش: تماشای دو جلسه
                    <br />
                    «راز شهر گم‌شده»
                  </span>
                </div>

                <InlineVerticalArrow compact={true} />

                <div className={styles.nodeCardDesktop}>
                  <span className={styles.nodeTextDesktop}>
                    از خاک تا افلاک: قدم‌های ۱ تا ۵
                  </span>
                </div>
              </div>
            </div>

            {/* انشعاب به دو شاخه موازی */}
            <DesktopSplitConnector />

            {/* ۳. دو شاخه موازی آموزشی */}
            <div className={styles.desktopParallelRow}>
              {/* شاخه میانی-چپ: ۳ مرحله */}
              <div className={styles.desktopParallelLeftCol}>
                <div className={styles.nodeCardDesktop}>
                  <span className={styles.nodeTextDesktop}>
                    ادامه «از خاک تا افلاک»: قدم‌های ۶ تا ۱۳
                  </span>
                </div>

                <InlineVerticalArrow stretch={true} compact={true} />

                <div className={styles.nodeCardDesktop}>
                  <span className={styles.nodeTextDesktop}>تغییر مسیر: «۲ قدم»</span>
                </div>

                <InlineVerticalArrow stretch={true} compact={true} />

                <div className={styles.nodeCardDesktop}>
                  <span className={styles.nodeTextDesktop}>مهاجرت: «۳ قدم»</span>
                </div>
              </div>

              {/* شاخه راست: ۴ مرحله */}
              <div className={styles.desktopParallelRightCol}>
                <div className={styles.nodeCardDesktop}>
                  <span className={styles.nodeTextDesktop}>شناخت سایه‌های درون</span>
                </div>

                <InlineVerticalArrow compact={true} />

                <div className={styles.nodeCardDesktop}>
                  <span className={styles.nodeTextDesktop}>ازدواج کائناتی</span>
                </div>

                <InlineVerticalArrow compact={true} />

                <div className={styles.nodeCardDesktop}>
                  <span className={styles.nodeTextDesktop}>کیمیاگری روح</span>
                </div>

                <InlineVerticalArrow compact={true} />

                <div className={styles.nodeCardDesktop}>
                  <span className={styles.nodeTextDesktop}>شناخت هفت چاکرا</span>
                </div>
              </div>
            </div>

            {/* همگرایی دو شاخه به ستون مرکزی پایین */}
            <DesktopMergeConnector />

            {/* ۴. ستون متمرکز پایانی (۶ مرحله فشرده) */}
            <div className={styles.desktopBottomStack}>
              <div className={`${styles.nodeCardDesktop} ${styles.nodeMilestoneDesktop}`}>
                <span className={styles.nodeTextDesktop}>پایان هر دو شاخه آموزشی</span>
              </div>

              <InlineVerticalArrow compact={true} />

              <div className={styles.nodeCardDesktop}>
                <span className={styles.nodeTextDesktop}>تکمیل فرم نمودار سطح آگاهی</span>
              </div>

              <InlineVerticalArrow compact={true} />

              <div className={styles.nodeCardDesktop}>
                <span className={styles.nodeTextDesktop}>ارسال فرم برای استاد</span>
              </div>

              <InlineVerticalArrow compact={true} />

              <div className={styles.nodeCardDesktop}>
                <span className={styles.nodeTextDesktop}>دریافت دستورهای سلوک عملی از استاد</span>
              </div>

              <InlineVerticalArrow compact={true} />

              <div className={`${styles.nodeCardDesktop} ${styles.nodeMilestoneDesktop}`}>
                <span className={styles.nodeTextDesktop}>آغاز سلوک عملی زیر نظر مستقیم استاد</span>
              </div>

              <InlineVerticalArrow compact={true} />

              <div className={`${styles.nodeCardDesktop}`}>
                <span className={styles.nodeTextDesktop}>
                  عضویت در کانال‌های «از سی مرغ تا سیمرغ» و «کلام نور»
                </span>
              </div>
            </div>
          </div>

          {/* ═══════════════ نسخه موبایل و تبلت (دقیقاً همان چیدمان فعلی) ═══════════════ */}
          <div className={styles.flowchartMobile}>
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
          <a
            href="/images/tarhelahi-roadmap.jpg"
            download="نقشه-راه-طرح-الهی.jpg"
            className={styles.downloadButtonLarge}
            title="دانلود نقشه راه به صورت تصویر (1920x1080)"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={styles.downloadIcon}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
              />
            </svg>
            <span>دانلود نقشه راه</span>
          </a>
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
