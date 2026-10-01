'use client';

/**
 * @file src/components/admin/Orders/ManualOrderForm/ManualOrderForm.jsx
 * @description فرم ثبت سفارش دستی و فعال‌سازی دوره بر مبنای بررسی موجودی کیف پول نور در پنل ادمین
 */

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import {
    UserPlus,
    Users,
    Search,
    BookOpen,
    CheckCircle2,
    ArrowRight,
    ChevronDown,
    ChevronUp,
    Layers,
    Coins,
    Sparkles,
    AlertTriangle,
    RefreshCw,
    Receipt,
    Gift,
} from 'lucide-react';
import { createManualOrder, searchAdminUsers } from '@/lib/client/admin/ordersClient';
import { getConversionRateWithByeMoney, getBatchBalancesWithByeMoney } from '@/lib/byeMoneyApi';
import AdminAssistedTopUpModal from '@/components/admin/Users/AdminAssistedTopUpModal/AdminAssistedTopUpModal';
import styles from './ManualOrderForm.module.scss';

// ── Toast Hook ─────────────────────────────────────────────────────────────
function useToast() {
    const [toasts, setToasts] = useState([]);
    const addToast = useCallback((message, type = 'success') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
    }, []);
    return { toasts, addToast };
}

// ── ابزارهای کمکی ──────────────────────────────────────────────────────────
const formatPrice = (p) =>
    new Intl.NumberFormat('fa-IR').format(Number(p) || 0) + ' تومان';

export default function ManualOrderForm({ initialCourses = [] }) {
    const router = useRouter();
    const { data: session } = useSession();
    const { toasts, addToast } = useToast();

    // ── فیلدهای انتخاب کاربر ─────────────────────────────────────────────────
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);

    // ── دوره‌های انتخاب شده ────────────────────────────────────────────────
    // کلید: 'course-{id}' یا 'chapter-{id}'
    // مقدار: { key, id, title, slug, price, courseId, chapterId, chapterTitle, documentId }
    const [selectedItems, setSelectedItems] = useState({});
    const [courseSearch, setCourseSearch] = useState('');
    const [openChapters, setOpenChapters] = useState({}); // { [courseId]: boolean }

    // ── وضعیت‌های کیف پول نور و اتصال به سامانه ByeMoney ────────────────────
    const [conversionRate, setConversionRate] = useState(null);
    const [rateLoading, setRateLoading] = useState(false);
    const [userBalance, setUserBalance] = useState(null);
    const [balanceLoading, setBalanceLoading] = useState(false);
    const [showTopUpModal, setShowTopUpModal] = useState(false);
    const [notes, setNotes] = useState('');
    const [isFreeOrder, setIsFreeOrder] = useState(false);
    const [freeReason, setFreeReason] = useState('');

    // ── وضعیت لودینگ ارسال ────────────────────────────────────────────────
    const [isSubmitting, setIsSubmitting] = useState(false);

    // ── دریافت نرخ رسمی تبدیل ریال به نور از بای‌مانی ──────────────────
    useEffect(() => {
        let isMounted = true;
        setRateLoading(true);
        getConversionRateWithByeMoney({ jwt: session?.user?.jwt })
            .then(res => {
                if (!isMounted) return;
                if (res.success && res.rialPerNoor > 0) {
                    setConversionRate(res);
                }
            })
            .catch(err => {
                console.warn('[ManualOrderForm] Conversion rate fetch error:', err);
            })
            .finally(() => {
                if (isMounted) setRateLoading(false);
            });

        return () => { isMounted = false; };
    }, [session?.user?.jwt]);

    // ── تابع استعلام موجودی زنده نور کاربر از ByeMoney ──────────────────
    const fetchUserBalance = useCallback(async (userObj) => {
        if (!userObj) {
            setUserBalance(null);
            return;
        }
        const userExternalId = userObj.documentId || String(userObj.id);
        if (!userExternalId) return;

        setBalanceLoading(true);
        try {
            const batchRes = await getBatchBalancesWithByeMoney({
                userIds: [userExternalId],
                jwt: session?.user?.jwt,
            });
            if (batchRes && batchRes.success && batchRes.balances) {
                const docBal = batchRes.balances[userExternalId];
                const idBal = batchRes.balances[String(userObj.id)];
                const liveBal = Number(docBal !== undefined ? docBal : (idBal !== undefined ? idBal : 0));
                setUserBalance(liveBal);
            } else {
                setUserBalance(Number(userObj.light ?? 0));
            }
        } catch (err) {
            console.warn('[ManualOrderForm] Error fetching balance:', err);
            setUserBalance(Number(userObj.light ?? 0));
        } finally {
            setBalanceLoading(false);
        }
    }, [session?.user?.jwt]);

    // به‌روزرسانی موجودی هنگام تغییر یا انتخاب کاربر
    useEffect(() => {
        if (selectedUser) {
            fetchUserBalance(selectedUser);
        } else {
            setUserBalance(null);
        }
    }, [selectedUser, fetchUserBalance]);

    // ── جستجوی کاربران با دی‌بانس ──────────────────────────────────────────
    useEffect(() => {
        if (!searchQuery.trim()) {
            setSearchResults([]);
            return;
        }

        const timer = setTimeout(async () => {
            setIsSearching(true);
            try {
                const users = await searchAdminUsers(searchQuery);
                setSearchResults(users);
            } catch (err) {
                console.error('User search failed:', err);
            } finally {
                setIsSearching(false);
            }
        }, 350);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    // ── مدیریت انتخاب / عدم انتخاب دوره کامل ───────────────────────────────
    const handleToggleCourse = (course) => {
        const key = `course-${course.id}`;
        setSelectedItems(prev => {
            const next = { ...prev };
            if (next[key]) {
                delete next[key];
            } else {
                // اگر دوره انتخاب شد، تمام فصول مجزای آن حذف می‌شوند تا تکراری محاسبه نشود
                Object.keys(next).forEach(k => {
                    if (next[k].courseId === course.id) {
                        delete next[k];
                    }
                });
                next[key] = {
                    key,
                    id: course.id,
                    courseId: course.id,
                    documentId: course.documentId || String(course.id),
                    title: course.title,
                    slug: course.slug,
                    price: Number(course.price) || 0,
                };
            }
            return next;
        });
    };

    // ── مدیریت انتخاب / عدم انتخاب یک سرفصل مشخص ───────────────────────────
    const handleToggleChapter = (course, chapter) => {
        const chapterKey = `chapter-${chapter.id}`;
        const courseKey = `course-${course.id}`;

        setSelectedItems(prev => {
            const next = { ...prev };
            // در صورت انتخاب سرفصل، انتخاب کل دوره غیرفعال می‌شود
            if (next[courseKey]) {
                delete next[courseKey];
            }

            if (next[chapterKey]) {
                delete next[chapterKey];
            } else {
                next[chapterKey] = {
                    key: chapterKey,
                    id: course.id,
                    courseId: course.id,
                    documentId: course.documentId || String(course.id),
                    chapterId: chapter.id,
                    title: course.title,
                    chapterTitle: chapter.title,
                    slug: course.slug,
                    price: Number(chapter.price) || 0,
                };
            }
            return next;
        });
    };

    // ── محاسبه خودکار مجموع مبلغ و نور مورد نیاز ──────────────────────────
    const calculatedSum = useMemo(() => {
        return Object.values(selectedItems).reduce((sum, item) => sum + (Number(item.price) || 0), 0);
    }, [selectedItems]);

    const tomanPerNoor = useMemo(() => {
        if (conversionRate?.tomanPerNoor && conversionRate.tomanPerNoor > 0) {
            return conversionRate.tomanPerNoor;
        }
        if (conversionRate?.rialPerNoor && conversionRate.rialPerNoor > 0) {
            return conversionRate.rialPerNoor / 10;
        }
        return null;
    }, [conversionRate]);

    const requiredNoor = useMemo(() => {
        if (isFreeOrder) return 0;
        if (calculatedSum <= 0) return 0;
        return Number(Number(calculatedSum).toFixed(4));
    }, [isFreeOrder, calculatedSum]);

    const hasSelectedUser = Boolean(selectedUser);
    const hasEnoughBalance = isFreeOrder || (userBalance !== null && userBalance !== undefined && userBalance >= requiredNoor);
    const shortfallNoor = isFreeOrder ? 0 : Math.max(0, requiredNoor - (userBalance || 0));
    const shortfallToman = (tomanPerNoor && tomanPerNoor > 0) ? Math.round(shortfallNoor * tomanPerNoor) : null;
    const remainingBalance = userBalance !== null ? (isFreeOrder ? userBalance : userBalance - requiredNoor) : 0;

    // ── فیلتر دوره‌ها ──────────────────────────────────────────────────────
    const filteredCourses = useMemo(() => {
        if (!courseSearch.trim()) return initialCourses;
        const q = courseSearch.trim().toLowerCase();
        return initialCourses.filter(c =>
            (c.title && c.title.toLowerCase().includes(q)) ||
            (c.slug && c.slug.toLowerCase().includes(q))
        );
    }, [initialCourses, courseSearch]);

    // ── بازخورد موفقیت شارژ کاربر ─────────────────────────────────────────
    const handleTopUpSuccess = () => {
        setShowTopUpModal(false);
        addToast('کیف پول کاربر با موفقیت شارژ شد.', 'success');
        if (selectedUser) {
            fetchUserBalance(selectedUser);
        }
    };

    // ── اعتبارسنجی و ثبت نهایی سفارش ──────────────────────────────────────
    const handleSubmit = async (e) => {
        e.preventDefault();

        // 1. بررسی انتخاب کاربر
        if (!selectedUser) {
            addToast('لطفاً یک کاربر از لیست جستجو انتخاب کنید.', 'error');
            return;
        }

        // 2. بررسی دوره‌های انتخاب شده
        const selectedList = Object.values(selectedItems);
        if (selectedList.length === 0) {
            addToast('حداقل یک دوره یا سرفصل باید انتخاب شود.', 'error');
            return;
        }

        // 3. بررسی کفایت موجودی نور (در صورت غیررایگان بودن)
        if (!isFreeOrder && requiredNoor > 0 && !hasEnoughBalance) {
            addToast(`موجودی نور کاربر کافی نیست. کسری: ${shortfallNoor.toLocaleString('fa-IR')} نور. لطفاً ابتدا حساب کاربر را شارژ کنید یا گزینه ثبت رایگان را فعال نمایید.`, 'error');
            return;
        }

        setIsSubmitting(true);

        try {
            const payload = {
                userMode: 'existing',
                userId: String(selectedUser.id),
                courses: selectedList,
                totalPrice: calculatedSum,
                isFree: isFreeOrder,
                freeReason: isFreeOrder ? freeReason.trim() : '',
                notes: notes.trim(),
            };

            const result = await createManualOrder(payload);

            addToast(result.message || (isFreeOrder ? 'سفارش رایگان با موفقیت ثبت شد و دوره‌ها برای کاربر فعال گردیدند.' : 'سفارش با موفقیت ثبت شد و دوره‌ها برای کاربر فعال گردیدند.'), 'success');

            // انتقال به صفحه سفارشات پس از ۱.۲ ثانیه
            setTimeout(() => {
                router.push('/admin/orders');
                router.refresh();
            }, 1200);

        } catch (err) {
            console.error('Submit manual order error:', err);
            addToast(err.message || 'خطا در ثبت سفارش. لطفاً مجدداً تلاش کنید.', 'error');
            setIsSubmitting(false);
        }
    };

    return (
        <div className={styles.container}>
            {/* ── Toast Messages ────────────────────────────────────── */}
            <div className={styles.toastContainer}>
                {toasts.map(t => (
                    <div key={t.id} className={`${styles.toast} ${styles[`toast--${t.type}`]}`}>
                        {t.type === 'success' ? '✅' : '❌'} {t.message}
                    </div>
                ))}
            </div>

            {/* ── سرصفحه ───────────────────────────────────────────── */}
            <header className={styles.header}>
                <div className={styles.header__titleWrap}>
                    <h1 className={styles.header__title}>
                        <BookOpen size={28} />
                        ثبت دستی سفارش و فعال‌سازی دوره
                    </h1>
                    <p className={styles.header__subtitle}>
                        انتخاب کاربر خریدار، تخصیص دوره‌های آموزشی و پرداخت مستقیم با موجودی کیف پول نور
                    </p>
                </div>
                <Link href="/admin/orders" className={styles.header__backBtn}>
                    <ArrowRight size={18} />
                    بازگشت به سفارش‌ها
                </Link>
            </header>

            <form onSubmit={handleSubmit} className={styles.layoutGrid}>
                {/* ── ستون اصلی ─────────────────────────────────────── */}
                <div className={styles.mainColumn}>

                    {/* ── بخش ۱: انتخاب کاربر خریدار ──────────────── */}
                    <section className={styles.card}>
                        <div className={styles.card__header}>
                            <h2 className={styles.card__title}>
                                <Users size={20} />
                                ۱. انتخاب کاربر خریدار
                            </h2>
                            <span className={styles.card__badge}>
                                {selectedUser ? 'کاربر انتخاب‌شده' : 'در انتظار انتخاب'}
                            </span>
                        </div>

                        {selectedUser ? (
                            <div className={styles.selectedUserCard}>
                                <div className={styles.selectedUserCard__details}>
                                    <div className={styles.selectedUserCard__avatar}>
                                        {selectedUser.firstName ? selectedUser.firstName[0] : (selectedUser.fullName ? selectedUser.fullName[0] : 'U')}
                                    </div>
                                    <div className={styles.selectedUserCard__meta}>
                                        <span className={styles.selectedUserCard__title}>
                                            {selectedUser.fullName || selectedUser.username}
                                        </span>
                                        <span className={styles.selectedUserCard__sub}>
                                            شماره تماس: {selectedUser.phoneNumber || 'ثبت نشده'} | ایمیل: {selectedUser.email || 'ثبت نشده'}
                                            {userBalance !== null && (
                                                <span style={{ marginRight: '8px', color: 'var(--color-title-hover)', fontWeight: 'bold' }}>
                                                    | موجودی: {new Intl.NumberFormat('fa-IR').format(userBalance)} نور
                                                </span>
                                            )}
                                        </span>
                                        {selectedUser.courses && selectedUser.courses.length > 0 && (
                                            <span className={styles.selectedUserCard__courses}>
                                                دوره‌های فعال: {selectedUser.courses.map(c => c.title).join('، ')}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    className={styles.selectedUserCard__clearBtn}
                                    onClick={() => setSelectedUser(null)}
                                >
                                    تغییر کاربر
                                </button>
                            </div>
                        ) : (
                            <div>
                                <div className={styles.searchBox}>
                                    <Search className={styles.searchBox__icon} size={18} />
                                    <input
                                        type="text"
                                        className={`${styles.input} ${styles.searchBox__input}`}
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="جستجو با نام، نام خانوادگی، شماره موبایل یا ایمیل..."
                                        autoFocus
                                    />
                                    {isSearching && <div className={styles.searchBox__spinner} />}
                                </div>

                                {searchResults.length > 0 ? (
                                    <div className={styles.userResults}>
                                        {searchResults.map((u) => (
                                            <div
                                                key={u.id}
                                                className={styles.userResults__item}
                                                onClick={() => {
                                                    setSelectedUser(u);
                                                    setSearchQuery('');
                                                }}
                                            >
                                                <div className={styles.userResults__info}>
                                                    <span className={styles.userResults__name}>{u.fullName}</span>
                                                    <span className={styles.userResults__phone}>{u.phoneNumber}</span>
                                                    {u.light !== undefined && (
                                                        <span style={{ fontSize: '0.78rem', color: 'var(--color-title-hover)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                            <Coins size={12} /> {new Intl.NumberFormat('fa-IR').format(u.light)} نور
                                                        </span>
                                                    )}
                                                </div>
                                                <button
                                                    type="button"
                                                    className={styles.userResults__selectBtn}
                                                >
                                                    انتخاب
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : searchQuery.trim() && !isSearching ? (
                                    <div className={styles.userResults__empty}>
                                        کاربری با این مشخصات یافت نشد.
                                        <div style={{ marginTop: '0.6rem' }}>
                                            <Link href="/admin/users" target="_blank" className={styles.addUserPromptLink}>
                                                <UserPlus size={14} />
                                                افزودن کاربر جدید در صفحه مدیریت کاربران
                                            </Link>
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                        )}
                    </section>

                    {/* ── بخش ۲: انتخاب دوره و سرفصل‌ها ────────────── */}
                    <section className={styles.card}>
                        <div className={styles.card__header}>
                            <h2 className={styles.card__title}>
                                <BookOpen size={20} />
                                ۲. انتخاب دوره‌ها و سرفصل‌ها
                            </h2>
                            <span className={styles.card__badge}>
                                {Object.keys(selectedItems).length} مورد انتخاب شده
                            </span>
                        </div>

                        <div className={styles.coursesHeader}>
                            <input
                                type="text"
                                className={`${styles.input} ${styles.coursesHeader__search}`}
                                value={courseSearch}
                                onChange={(e) => setCourseSearch(e.target.value)}
                                placeholder="فیلتر در دوره‌های موجود..."
                            />
                        </div>

                        <div className={styles.coursesList}>
                            {filteredCourses.length === 0 ? (
                                <div className={styles.coursesList__empty}>
                                    دوره‌ای با این عنوان یافت نشد.
                                </div>
                            ) : (
                                filteredCourses.map((course) => {
                                    const isCourseSelected = !!selectedItems[`course-${course.id}`];
                                    const hasChapters = Array.isArray(course.chapters) && course.chapters.length > 0;
                                    const isOpen = !!openChapters[course.id];

                                    // تعداد فصول انتخاب‌شده از این دوره
                                    const selectedChaptersCount = Object.values(selectedItems).filter(
                                        it => it.courseId === course.id && it.chapterId
                                    ).length;

                                    return (
                                        <div
                                            key={course.id}
                                            className={`${styles.courseItem} ${isCourseSelected ? styles['courseItem--selected'] : ''}`}
                                        >
                                            <div className={styles.courseItem__main}>
                                                <label className={styles.courseItem__label}>
                                                    <input
                                                        type="checkbox"
                                                        className={styles.courseItem__checkbox}
                                                        checked={isCourseSelected}
                                                        onChange={() => handleToggleCourse(course)}
                                                    />
                                                    <span className={styles.courseItem__name}>
                                                        {course.title}
                                                    </span>
                                                </label>

                                                <div className={styles.courseItem__priceBlock}>
                                                    <span className={styles.courseItem__price}>
                                                        {formatPrice(course.price)}
                                                    </span>

                                                    {hasChapters && (
                                                        <button
                                                            type="button"
                                                            className={styles.courseItem__chaptersToggle}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setOpenChapters(prev => ({ ...prev, [course.id]: !prev[course.id] }));
                                                            }}
                                                        >
                                                            <Layers size={14} />
                                                            {course.chapters.length} سرفصل
                                                            {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* نمایش سرفصل‌های مجزا */}
                                            {hasChapters && isOpen && (
                                                <div className={styles.courseItem__chaptersList}>
                                                    <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '0 0 4px 0' }}>
                                                        💡 می‌توانید به جای کل دوره، فقط سرفصل‌های مشخص را فعال کنید:
                                                    </p>
                                                    {course.chapters.map((chapter) => {
                                                        const isChapterSelected = !!selectedItems[`chapter-${chapter.id}`];
                                                        return (
                                                            <label key={chapter.id} className={styles.courseItem__chapterRow}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                    <input
                                                                        type="checkbox"
                                                                        className={styles.courseItem__checkbox}
                                                                        checked={isChapterSelected}
                                                                        disabled={isCourseSelected}
                                                                        onChange={() => handleToggleChapter(course, chapter)}
                                                                    />
                                                                    <span>{chapter.title}</span>
                                                                </div>
                                                                <span className={styles.courseItem__price}>
                                                                    {formatPrice(chapter.price || course.price)}
                                                                </span>
                                                            </label>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </section>

                    {/* ── تنظیمات ثبت رایگان و یادداشت سفارش ── */}
                    <div className={styles.card} style={{ padding: '1.25rem 1.75rem' }}>
                        <div className={styles.freeOrderBlock}>
                            <label className={styles.freeOrderCheckbox}>
                                <input
                                    type="checkbox"
                                    checked={isFreeOrder}
                                    onChange={(e) => setIsFreeOrder(e.target.checked)}
                                    className={styles.freeOrderCheckbox__input}
                                />
                                <div className={styles.freeOrderCheckbox__content}>
                                    <span className={styles.freeOrderCheckbox__title}>
                                        <Gift size={18} />
                                        ثبت به‌صورت رایگان (بدون کسر از کیف پول نور)
                                    </span>
                                    <span className={styles.freeOrderCheckbox__subtitle}>
                                        در صورت فعال‌سازی، هزینه دوره صفر منظور شده و بدون کسر نور، دسترسی کاربر بلافاصله فعال می‌شود.
                                    </span>
                                </div>
                            </label>

                            {isFreeOrder && (
                                <div className={styles.freeReasonWrap}>
                                    <label className={styles.field__label}>علت ثبت رایگان (اختیاری)</label>
                                    <input
                                        type="text"
                                        className={styles.input}
                                        value={freeReason}
                                        onChange={(e) => setFreeReason(e.target.value)}
                                        placeholder="مثال: هدیه به کاربر، بورسیه، جبران نقص فنی، مسابقه..."
                                    />
                                </div>
                            )}
                        </div>

                        <div className={styles.field} style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px dashed fade(var(--color-primary), 15%)' }}>
                            <label className={styles.field__label}>یادداشت برای سفارش (اختیاری)</label>
                            <input
                                type="text"
                                className={styles.input}
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="توضیحات تکمیلی یا علت ثبت دستی توسط ادمین..."
                            />
                        </div>
                    </div>
                </div>

                {/* ── ستون کناری (چپ): خلاصه فاکتور و ثبت نهایی ─────────── */}
                <aside className={styles.sideColumn}>
                    <div className={styles.summaryCard}>
                        <div className={styles.summaryCard__header}>
                            <h3 className={styles.summaryCard__title}>
                                <Receipt size={20} />
                                خلاصه فاکتور سفارش
                            </h3>
                            {conversionRate && (
                                <span className={styles.summaryCard__ratePill}>
                                    هر ۱ نور = {new Intl.NumberFormat('fa-IR').format(tomanPerNoor)} تومان
                                </span>
                            )}
                        </div>

                        <div className={styles.summaryCard__list}>
                            <div className={styles.summaryCard__row}>
                                <span>کاربر خریدار:</span>
                                <span className={styles.summaryCard__userValue} title={selectedUser ? (selectedUser.fullName || selectedUser.username) : ''}>
                                    {selectedUser ? (selectedUser.fullName || selectedUser.username) : 'انتخاب نشده'}
                                </span>
                            </div>

                            <div className={styles.summaryCard__row}>
                                <span>تعداد اقلام:</span>
                                <span>{new Intl.NumberFormat('fa-IR').format(Object.keys(selectedItems).length)} مورد</span>
                            </div>

                            <div className={styles.summaryCard__row}>
                                <span>روش پرداخت:</span>
                                <span className={styles.noorHighlight}>
                                    <Coins size={14} />
                                    {isFreeOrder ? 'ثبت رایگان (بدون کسر)' : 'کیف پول نور'}
                                </span>
                            </div>

                            <div className={styles.summaryCard__row}>
                                <span>موجودی کیف پول:</span>
                                <div className={styles.summaryCard__balanceValue}>
                                    {balanceLoading ? (
                                        <span className={styles.loadingText}>در حال استعلام...</span>
                                    ) : userBalance !== null ? (
                                        <span className={userBalance > 0 ? styles.balancePositive : ''}>
                                            {new Intl.NumberFormat('fa-IR').format(userBalance)} نور
                                        </span>
                                    ) : (
                                        '—'
                                    )}
                                    {selectedUser && !balanceLoading && (
                                        <button
                                            type="button"
                                            className={styles.refreshBtn}
                                            onClick={() => fetchUserBalance(selectedUser)}
                                            title="به‌روزرسانی موجودی کیف پول"
                                        >
                                            <RefreshCw size={13} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className={styles.summaryCard__totalRow}>
                                <span>{isFreeOrder ? 'ارزش دوره (تومان):' : 'مبلغ نهایی (تومان):'}</span>
                                <span className={styles.totalPrice} style={isFreeOrder ? { textDecoration: 'line-through', opacity: 0.65, fontSize: '0.95rem' } : undefined}>
                                    {formatPrice(calculatedSum)}
                                </span>
                            </div>

                            <div className={styles.summaryCard__totalNoorRow} style={isFreeOrder ? { backgroundColor: 'fade(var(--color-title-hover), 14%)', borderColor: 'var(--color-title-hover)' } : undefined}>
                                <span>مبلغ قابل پرداخت:</span>
                                <span className={styles.totalNoorPrice}>
                                    {isFreeOrder ? (
                                        <>
                                            <Gift size={18} />
                                            رایگان (۰ نور)
                                        </>
                                    ) : (
                                        <>
                                            <Coins size={18} />
                                            {new Intl.NumberFormat('fa-IR').format(requiredNoor)} نور
                                        </>
                                    )}
                                </span>
                            </div>
                        </div>

                        {/* وضعیت موجودی و امکان شارژ در صورت کسری */}
                        {hasSelectedUser && Object.keys(selectedItems).length > 0 && (
                            <div className={styles.balanceStatusBlock}>
                                {isFreeOrder ? (
                                    <div className={`${styles.statusBanner} ${styles['statusBanner--free']}`}>
                                        <div className={styles.statusBanner__content}>
                                            <Gift size={18} className={styles.statusBanner__icon} />
                                            <div>
                                                <h4 className={styles.statusBanner__title}>ثبت به‌صورت رایگان</h4>
                                                <p className={styles.statusBanner__desc}>
                                                    این سفارش بدون کسر نور ثبت و دوره بلافاصله فعال می‌شود.
                                                    {freeReason && <><br /><strong>علت: </strong>{freeReason}</>}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ) : hasEnoughBalance ? (
                                    <div className={`${styles.statusBanner} ${styles['statusBanner--success']}`}>
                                        <div className={styles.statusBanner__content}>
                                            <CheckCircle2 size={18} className={styles.statusBanner__icon} />
                                            <div>
                                                <h4 className={styles.statusBanner__title}>موجودی نور کاربر کافی است</h4>
                                                <p className={styles.statusBanner__desc}>
                                                    مانده پس از خرید: <strong>{new Intl.NumberFormat('fa-IR').format(remainingBalance)} نور</strong>
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className={`${styles.statusBanner} ${styles['statusBanner--warning']}`}>
                                        <div className={styles.statusBanner__content}>
                                            <AlertTriangle size={18} className={styles.statusBanner__icon} />
                                            <div>
                                                <h4 className={styles.statusBanner__title}>کسری موجودی نور کاربر!</h4>
                                                <p className={styles.statusBanner__desc}>
                                                    کسری: <strong>{new Intl.NumberFormat('fa-IR').format(shortfallNoor)} نور</strong> ({formatPrice(shortfallToman)})
                                                </p>
                                            </div>
                                        </div>
                                        {selectedUser && (
                                            <button
                                                type="button"
                                                className={styles.chargeBtn}
                                                onClick={() => setShowTopUpModal(true)}
                                            >
                                                <Sparkles size={16} />
                                                شارژ کارت به کارت کاربر
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        <button
                            type="submit"
                            className={styles.summaryCard__submitBtn}
                            disabled={isSubmitting || !selectedUser || Object.keys(selectedItems).length === 0 || (!isFreeOrder && requiredNoor > 0 && !hasEnoughBalance)}
                        >
                            {isSubmitting ? (
                                'در حال ثبت سفارش و فعال‌سازی...'
                            ) : !selectedUser ? (
                                'ابتدا کاربر را انتخاب کنید'
                            ) : Object.keys(selectedItems).length === 0 ? (
                                'دوره یا سرفصلی انتخاب نشده'
                            ) : isFreeOrder ? (
                                <>
                                    <Gift size={19} />
                                    ثبت نهایی سفارش رایگان
                                </>
                            ) : requiredNoor > 0 && !hasEnoughBalance ? (
                                'موجودی نور کاربر کافی نیست'
                            ) : (
                                <>
                                    <CheckCircle2 size={19} />
                                    ثبت نهایی و فعال‌سازی دوره
                                </>
                            )}
                        </button>
                    </div>
                </aside>
            </form>

            {/* ── مودال شارژ کارت به کارت ادمین به‌نیابت از کاربر ──────── */}
            {showTopUpModal && selectedUser && (
                <AdminAssistedTopUpModal
                    user={selectedUser}
                    conversionRate={conversionRate?.rialPerNoor}
                    onClose={() => setShowTopUpModal(false)}
                    onSuccess={handleTopUpSuccess}
                />
            )}
        </div>
    );
}
