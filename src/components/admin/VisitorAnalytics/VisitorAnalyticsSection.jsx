'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    Activity,
    Users,
    Calendar,
    TrendingUp,
    RotateCw,
    Globe,
    UserCheck,
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
 * کامپوننت آمار افراد آنلاین و ورودی‌های یکتای روزانه سایت
 */
export default function VisitorAnalyticsSection({ initialStats }) {
    const [stats, setStats] = useState(initialStats || null);
    const [isLoading, setIsLoading] = useState(false);
    const [lastRefreshTime, setLastRefreshTime] = useState('');

    const updateTimeLabel = () => {
        const now = new Date();
        const timeStr = new Intl.DateTimeFormat('fa-IR', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        }).format(now);
        setLastRefreshTime(timeStr);
    };

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
        } finally {
            if (isManual) setIsLoading(false);
        }
    }, []);

    // به‌روزرسانی خودکار هر ۳۰ ثانیه برای مانیتور افراد آنلاین
    useEffect(() => {
        updateTimeLabel();
        const intervalId = setInterval(() => {
            fetchLatestStats(false);
        }, 30 * 1000);

        return () => clearInterval(intervalId);
    }, [fetchLatestStats]);

    const onlineUsers = stats?.onlineUsers ?? 1;
    const daily = stats?.daily ?? 0;
    const weekly = stats?.weekly ?? 0;
    const monthly = stats?.monthly ?? 0;
    const yearly = stats?.yearly ?? 0;
    const total = stats?.total ?? 0;

    const cards = [
        {
            id: 'online',
            label: 'افراد آنلاین در لحظه',
            value: formatFa(onlineUsers),
            unit: 'نفر فعال',
            sub: 'فعالیت در ۳ دقیقه اخیر',
            icon: Activity,
            accent: '#22c55e',
        },
        {
            id: 'daily',
            label: 'ورودی‌های امروز',
            value: formatFa(daily),
            unit: 'نفر',
            sub: 'افراد یکتا در ۲۴ ساعت گذشته',
            icon: UserCheck,
            accent: '#F6D982',
        },
        {
            id: 'weekly',
            label: 'ورودی‌های این هفته (۷ روز)',
            value: formatFa(weekly),
            unit: 'نفر',
            sub: 'مجموع ۷ روز اخیر',
            icon: Calendar,
            accent: '#38bdf8',
        },
        {
            id: 'monthly',
            label: 'ورودی‌های این ماه (۳۰ روز)',
            value: formatFa(monthly),
            unit: 'نفر',
            sub: 'مجموع ۳۰ روز اخیر',
            icon: TrendingUp,
            accent: '#a855f7',
        },
        {
            id: 'yearly',
            label: 'ورودی‌های امسال (۳۶۵ روز)',
            value: formatFa(yearly),
            unit: 'نفر',
            sub: 'مجموع ۱ سال اخیر',
            icon: Globe,
            accent: '#f97316',
        },
        {
            id: 'total',
            label: 'کل افراد از ابتدا',
            value: formatFa(total),
            unit: 'نفر',
            sub: 'کل تاریخچه ثبت‌شده',
            icon: Users,
            accent: '#ec4899',
        },
    ];

    const chartData = stats?.chartData || [];
    const maxChartValue = Math.max(...chartData.map((d) => d.count), 1);

    return (
        <section className={styles.section} aria-labelledby="visitor-analytics-heading">

            {/* ── سرصفحه آمار ────────────────────────────────────────── */}
            <div className={styles.header}>
                <div className={styles.header__title_group}>
                    <h2 id="visitor-analytics-heading" className={styles.header__title}>
                        <Activity size={22} color="#F6D982" />
                        آمار ورودی‌ها و افراد آنلاین
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

            {/* ── کارت‌های ۶ گانه ────────────────────────────────────── */}
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

            {/* ── نمودار روند ۷ روز اخیر ──────────────────────────────── */}
            <div className={styles.chart_card}>
                <div className={styles.chart_card__header}>
                    <h3 className={styles.chart_card__title}>
                        <TrendingUp size={18} color="#F6D982" />
                        روند ورودی افراد در ۷ روز اخیر
                    </h3>
                </div>

                <div className={styles.chart_card__body}>
                    {chartData.map((item, idx) => {
                        const val = item.count;
                        const heightPct = Math.max(Math.round((val / maxChartValue) * 100), val > 0 ? 12 : 3);

                        return (
                            <div key={idx} className={styles.chart_bar_item}>
                                <div className={styles.chart_tooltip}>
                                    <strong>{item.weekday} ({item.label})</strong>
                                    <span>تعداد ورودی: {formatFa(val)} نفر</span>
                                </div>

                                <div className={styles.chart_bar_item__bar_container}>
                                    <div
                                        className={styles.chart_bar_item__bar}
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

        </section>
    );
}
