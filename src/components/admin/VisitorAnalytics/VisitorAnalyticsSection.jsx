'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    Activity,
    Users,
    Calendar,
    TrendingUp,
    RotateCw,
    Globe,
    Smartphone,
    Monitor,
    Tablet,
    Eye,
    Clock,
} from 'lucide-react';
import styles from './VisitorAnalyticsSection.module.scss';

/**
 * فرمت اعداد به صورت فارسی با جداکننده هزارگان
 */
function formatFa(num) {
    if (num === null || num === undefined) return '۰';
    return new Intl.NumberFormat('fa-IR').format(num);
}

/**
 * کامپوننت آمار بازدید و کاربران آنلاین در داشبورد ادمین
 */
export default function VisitorAnalyticsSection({ initialStats }) {
    const [stats, setStats] = useState(initialStats || null);
    const [isLoading, setIsLoading] = useState(false);
    const [chartMetric, setChartMetric] = useState('pageViews'); // 'pageViews' یا 'uniqueVisitors'
    const [lastRefreshTime, setLastRefreshTime] = useState('');

    // به‌روزرسانی زمان آخرین تازه‌سازی
    const updateTimeLabel = () => {
        const now = new Date();
        const timeStr = new Intl.DateTimeFormat('fa-IR', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        }).format(now);
        setLastRefreshTime(timeStr);
    };

    // تابع واکشی مجدد داده‌های آمار
    const fetchLatestStats = useCallback(async (isManual = false) => {
        if (isManual) setIsLoading(true);
        try {
            const res = await fetch('/api/admin/visitor-stats');
            if (res.ok) {
                const json = await res.json();
                if (json?.data) {
                    setStats(json.data);
                    updateTimeLabel();
                }
            }
        } catch {
            // خطا در تازه‌سازی نادیده گرفته می‌شود تا UI کرش نکند
        } finally {
            if (isManual) setIsLoading(false);
        }
    }, []);

    // تازه‌سازی خودکار هر ۳۰ ثانیه برای مانیتور زنده ترافیک و افراد آنلاین
    useEffect(() => {
        updateTimeLabel();
        const intervalId = setInterval(() => {
            fetchLatestStats(false);
        }, 30 * 1000);

        return () => clearInterval(intervalId);
    }, [fetchLatestStats]);

    const onlineUsers = stats?.onlineUsers ?? 1;
    const dailyViews = stats?.daily?.pageViews ?? 0;
    const dailyUniques = stats?.daily?.uniqueVisitors ?? 0;
    const weeklyViews = stats?.weekly?.pageViews ?? 0;
    const weeklyUniques = stats?.weekly?.uniqueVisitors ?? 0;
    const monthlyViews = stats?.monthly?.pageViews ?? 0;
    const yearlyViews = stats?.yearly?.pageViews ?? 0;
    const totalViews = stats?.total?.pageViews ?? 0;

    // کارت‌های اصلی متریک‌ها
    const cards = [
        {
            id: 'online',
            label: 'افراد آنلاین در لحظه',
            value: formatFa(onlineUsers),
            unit: 'کاربر فعال',
            sub: 'فعالیت در ۳ دقیقه اخیر',
            icon: Activity,
            accent: '#22c55e', // سبز نئونی
        },
        {
            id: 'daily',
            label: 'بازدید امروز',
            value: formatFa(dailyViews),
            unit: 'صفحه',
            sub: `${formatFa(dailyUniques)} بازدیدکننده یکتا`,
            icon: Eye,
            accent: '#F6D982', // طلایی اصلی
        },
        {
            id: 'weekly',
            label: 'بازدید این هفته (۷ روز)',
            value: formatFa(weeklyViews),
            unit: 'صفحه',
            sub: `${formatFa(weeklyUniques)} بازدیدکننده یکتا`,
            icon: Calendar,
            accent: '#38bdf8', // آبی روشن
        },
        {
            id: 'monthly',
            label: 'بازدید این ماه (۳۰ روز)',
            value: formatFa(monthlyViews),
            unit: 'صفحه',
            sub: 'مجموع ترافیک ماه گذشته',
            icon: TrendingUp,
            accent: '#a855f7', // بنفش
        },
        {
            id: 'yearly',
            label: 'بازدید امسال (۳۶۵ روز)',
            value: formatFa(yearlyViews),
            unit: 'صفحه',
            sub: 'ترافیک کل یک سال اخیر',
            icon: Globe,
            accent: '#f97316', // نارنجی
        },
        {
            id: 'total',
            label: 'کل بازدیدها از ابتدا',
            value: formatFa(totalViews),
            unit: 'صفحه',
            sub: 'از زمان راه‌اندازی آمار',
            icon: Users,
            accent: '#ec4899', // صورتی
        },
    ];

    // محاسبه حداکثر مقدار برای مقیاس‌بندی نمودار ۷ روزه
    const chartData = stats?.chartData || [];
    const maxChartValue = Math.max(
        ...chartData.map((d) => (chartMetric === 'pageViews' ? d.pageViews : d.uniqueVisitors)),
        1
    );

    // محاسبه درصدهای دستگاه‌ها
    const deviceStats = stats?.deviceStats || { mobile: 0, desktop: 0, tablet: 0 };
    const totalDevices = (deviceStats.mobile + deviceStats.desktop + deviceStats.tablet) || 1;
    const mobilePct = Math.round((deviceStats.mobile / totalDevices) * 100);
    const desktopPct = Math.round((deviceStats.desktop / totalDevices) * 100);
    const tabletPct = Math.round((deviceStats.tablet / totalDevices) * 100);

    const topPages = stats?.topPages || [];

    return (
        <section className={styles.section} aria-labelledby="visitor-analytics-heading">

            {/* ── سرصفحه آمار بازدید ─────────────────────────────────── */}
            <div className={styles.header}>
                <div className={styles.header__title_group}>
                    <h2 id="visitor-analytics-heading" className={styles.header__title}>
                        <Activity size={22} color="#F6D982" />
                        آمار ترافیک و بازدیدهای سایت
                    </h2>

                    <div className={styles.header__online_badge} title="تعداد کاربرانی که هم‌اکنون در سایت حضور دارند">
                        <span className={styles.header__pulse_dot} />
                        <span>{formatFa(onlineUsers)} کاربر هم‌اکنون آنلاین</span>
                    </div>
                </div>

                <div className={styles.header__actions}>
                    {lastRefreshTime && (
                        <span className={styles.header__auto_info}>
                            آخرین به‌روزرسانی: {lastRefreshTime}
                        </span>
                    )}

                    <button
                        type="button"
                        className={styles.header__refresh_btn}
                        onClick={() => fetchLatestStats(true)}
                        disabled={isLoading}
                        title="تازه‌سازی فوری اطلاعات"
                    >
                        <RotateCw size={15} className={isLoading ? styles.header__spin : ''} />
                        <span>تازه‌سازی</span>
                    </button>
                </div>
            </div>

            {/* ── کارت‌های آمار ۶ گانه ──────────────────────────────── */}
            <div className={styles.cards_grid}>
                {cards.map((card) => {
                    const IconComponent = card.icon;
                    return (
                        <article
                            key={card.id}
                            className={styles.card}
                            style={{ '--card-accent': card.accent }}
                        >
                            <div className={styles.card__icon_wrap} aria-hidden="true">
                                <IconComponent size={24} />
                            </div>

                            <div className={styles.card__content}>
                                <span className={styles.card__label}>{card.label}</span>
                                <div className={styles.card__value_row}>
                                    <span className={styles.card__value}>{card.value}</span>
                                    <span className={styles.card__unit}>{card.unit}</span>
                                </div>
                                <span className={styles.card__sub}>{card.sub}</span>
                            </div>
                        </article>
                    );
                })}
            </div>

            {/* ── نمودار و ویجت‌های تحلیلی تکمیلی ─────────────────────── */}
            <div className={styles.analytics_details}>

                {/* ۱. نمودار میله‌ای روند ۷ روز اخیر */}
                <div className={styles.chart_card}>
                    <div className={styles.chart_card__header}>
                        <h3 className={styles.chart_card__title}>
                            <TrendingUp size={18} color="#F6D982" />
                            روند ترافیک ۷ روز اخیر
                        </h3>

                        <div className={styles.chart_card__tabs}>
                            <button
                                type="button"
                                className={`${styles.chart_card__tab} ${chartMetric === 'pageViews' ? styles['chart_card__tab--active'] : ''}`}
                                onClick={() => setChartMetric('pageViews')}
                            >
                                کل بازدیدها
                            </button>
                            <button
                                type="button"
                                className={`${styles.chart_card__tab} ${chartMetric === 'uniqueVisitors' ? styles['chart_card__tab--active'] : ''}`}
                                onClick={() => setChartMetric('uniqueVisitors')}
                            >
                                بازدیدکنندگان یکتا
                            </button>
                        </div>
                    </div>

                    <div className={styles.chart_card__body}>
                        {chartData.map((item, idx) => {
                            const val = chartMetric === 'pageViews' ? item.pageViews : item.uniqueVisitors;
                            const heightPct = Math.max(Math.round((val / maxChartValue) * 100), val > 0 ? 12 : 3);

                            return (
                                <div key={idx} className={styles.chart_bar_item}>
                                    <div className={styles.chart_tooltip}>
                                        <strong>{item.weekday} ({item.label})</strong>
                                        <span>کل بازدیدها: {formatFa(item.pageViews)}</span>
                                        <span>یکتا: {formatFa(item.uniqueVisitors)}</span>
                                    </div>

                                    <div className={styles.chart_bar_item__bar_container}>
                                        <div
                                            className={`${styles.chart_bar_item__bar} ${chartMetric === 'uniqueVisitors' ? styles['chart_bar_item__bar--uniques'] : ''}`}
                                            style={{ height: `${heightPct}%` }}
                                        />
                                    </div>

                                    <span className={styles.chart_bar_item__label_day}>{item.weekday}</span>
                                    <span className={styles.chart_bar_item__label_date}>{item.label}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* ۲. ویجت‌های سهم دستگاه‌ها و صفحات محبوب */}
                <div className={styles.widgets_card}>
                    <h3 className={styles.widgets_card__title}>
                        <Monitor size={18} color="#F6D982" />
                        توزیع دستگاه‌های کاربران
                    </h3>

                    <div className={styles.widgets_card__group}>
                        {/* دسکتاپ */}
                        <div className={styles.device_item}>
                            <div className={styles.device_item__row}>
                                <span>💻 دسکتاپ و کامپیوتر</span>
                                <span>{formatFa(desktopPct)}% ({formatFa(deviceStats.desktop)})</span>
                            </div>
                            <div className={styles.device_item__bar_bg}>
                                <div
                                    className={styles.device_item__bar_fill}
                                    style={{ width: `${desktopPct}%`, background: '#38bdf8' }}
                                />
                            </div>
                        </div>

                        {/* موبایل */}
                        <div className={styles.device_item}>
                            <div className={styles.device_item__row}>
                                <span>📱 گوشی‌های موبایل</span>
                                <span>{formatFa(mobilePct)}% ({formatFa(deviceStats.mobile)})</span>
                            </div>
                            <div className={styles.device_item__bar_bg}>
                                <div
                                    className={styles.device_item__bar_fill}
                                    style={{ width: `${mobilePct}%`, background: '#22c55e' }}
                                />
                            </div>
                        </div>

                        {/* تبلت */}
                        <div className={styles.device_item}>
                            <div className={styles.device_item__row}>
                                <span>📟 تبلت</span>
                                <span>{formatFa(tabletPct)}% ({formatFa(deviceStats.tablet)})</span>
                            </div>
                            <div className={styles.device_item__bar_bg}>
                                <div
                                    className={styles.device_item__bar_fill}
                                    style={{ width: `${tabletPct}%`, background: '#a855f7' }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* صفحات پربازدید اخیر */}
                    {topPages.length > 0 && (
                        <div className={styles.widgets_card__group}>
                            <h4 className={styles.widgets_card__group_header}>
                                پربازدیدترین صفحات (۳۰ روز اخیر)
                            </h4>
                            <div className={styles.pages_list}>
                                {topPages.map((p, idx) => (
                                    <div key={idx} className={styles.page_item}>
                                        <span className={styles.page_item__path} title={p.path}>
                                            {p.path}
                                        </span>
                                        <span className={styles.page_item__badge}>
                                            {formatFa(p.count)} بازدید
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

            </div>

        </section>
    );
}
