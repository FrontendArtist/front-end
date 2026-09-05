'use client';

/**
 * @file src/components/admin/Orders/ManualOrderForm/ManualOrderForm.jsx
 * @description فرم ثبت سفارش دستی، ایجاد کاربر، فعال‌سازی دوره و پیوست فیش در پنل ادمین
 */

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    UserPlus,
    Users,
    Search,
    BookOpen,
    UploadCloud,
    CreditCard,
    CheckCircle2,
    ArrowRight,
    Trash2,
    Check,
    ChevronDown,
    ChevronUp,
    AlertCircle,
    Layers,
    FileText,
} from 'lucide-react';
import { createManualOrder, searchAdminUsers } from '@/lib/client/admin/ordersClient';
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
    const { toasts, addToast } = useToast();
    const fileInputRef = useRef(null);

    // ── حالت کاربر: 'new' (کاربر جدید) یا 'existing' (کاربر موجود) ───────────
    const [userMode, setUserMode] = useState('new');

    // ── فیلدهای کاربر جدید ──────────────────────────────────────────────────
    const [phoneNumber, setPhoneNumber] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');

    // ── فیلدهای کاربر موجود ─────────────────────────────────────────────────
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);

    // ── دوره‌های انتخاب شده ────────────────────────────────────────────────
    // کلید: 'course-{id}' یا 'chapter-{id}'
    // مقدار: { key, id, title, slug, price, courseId, chapterId, chapterTitle }
    const [selectedItems, setSelectedItems] = useState({});
    const [courseSearch, setCourseSearch] = useState('');
    const [openChapters, setOpenChapters] = useState({}); // { [courseId]: boolean }

    // ── فیلدهای پرداخت و فیش ───────────────────────────────────────────────
    const [receiptFile, setReceiptFile] = useState(null);
    const [receiptPreview, setReceiptPreview] = useState(null);
    const [cardHolderName, setCardHolderName] = useState('');
    const [trackingNumber, setTrackingNumber] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('card_to_card');
    const [paymentStatus, setPaymentStatus] = useState('paid');
    const [orderStatus, setOrderStatus] = useState('paid');
    const [customTotalPrice, setCustomTotalPrice] = useState('');
    const [notes, setNotes] = useState('');

    // ── وضعیت لودینگ ارسال ────────────────────────────────────────────────
    const [isSubmitting, setIsSubmitting] = useState(false);

    // ── جستجوی کاربران موجود با دی‌بانس ────────────────────────────────────
    useEffect(() => {
        if (userMode !== 'existing') return;
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
    }, [searchQuery, userMode]);

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

    // ── محاسبه خودکار مجموع مبلغ ──────────────────────────────────────────
    const calculatedSum = useMemo(() => {
        return Object.values(selectedItems).reduce((sum, item) => sum + (Number(item.price) || 0), 0);
    }, [selectedItems]);

    // مبلغ نهایی سفارش: اگر کاربر دستی تغییر داده بود از آن استفاده می‌شود، در غیر این صورت مجموع
    const effectiveTotalPrice = customTotalPrice !== '' ? Number(customTotalPrice) : calculatedSum;

    // ── فیلتر دوره‌ها ──────────────────────────────────────────────────────
    const filteredCourses = useMemo(() => {
        if (!courseSearch.trim()) return initialCourses;
        const q = courseSearch.trim().toLowerCase();
        return initialCourses.filter(c =>
            (c.title && c.title.toLowerCase().includes(q)) ||
            (c.slug && c.slug.toLowerCase().includes(q))
        );
    }, [initialCourses, courseSearch]);

    // ── مدیریت آپلود فایل فیش ─────────────────────────────────────────────
    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            addToast('لطفاً یک فایل تصویری (JPG, PNG, WebP) انتخاب کنید.', 'error');
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            addToast('حجم تصویر فیش نباید بیشتر از ۱۰ مگابایت باشد.', 'error');
            return;
        }

        setReceiptFile(file);
        const reader = new FileReader();
        reader.onload = (ev) => {
            setReceiptPreview(ev.target.result);
        };
        reader.readAsDataURL(file);
    };

    const handleRemoveReceipt = () => {
        setReceiptFile(null);
        setReceiptPreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    // ── اعتبارسنجی و ثبت سفارش ────────────────────────────────────────────
    const handleSubmit = async (e) => {
        e.preventDefault();

        // 1. بررسی کاربر
        if (userMode === 'new') {
            const cleanPhone = phoneNumber.trim().replace(/\s+/g, '');
            if (!cleanPhone || cleanPhone.length < 10) {
                addToast('شماره موبایل کاربر الزامی و باید حداقل ۱۰ رقم باشد.', 'error');
                return;
            }
        } else {
            if (!selectedUser) {
                addToast('لطفاً یک کاربر از لیست جستجو انتخاب کنید.', 'error');
                return;
            }
        }

        // 2. بررسی دوره‌های انتخاب شده
        const selectedList = Object.values(selectedItems);
        if (selectedList.length === 0) {
            addToast('حداقل یک دوره یا سرفصل باید انتخاب شود.', 'error');
            return;
        }

        setIsSubmitting(true);

        try {
            const formData = new FormData();
            formData.append('userMode', userMode);

            if (userMode === 'new') {
                formData.append('phoneNumber', phoneNumber.trim());
                formData.append('firstName', firstName.trim());
                formData.append('lastName', lastName.trim());
                formData.append('email', email.trim());
            } else {
                formData.append('userId', String(selectedUser.id));
            }

            formData.append('courses', JSON.stringify(selectedList));
            formData.append('totalPrice', String(effectiveTotalPrice));
            formData.append('paymentMethod', paymentMethod);
            formData.append('paymentStatus', paymentStatus);
            formData.append('orderStatus', orderStatus);
            formData.append('trackingNumber', trackingNumber.trim());
            formData.append('cardHolderName', cardHolderName.trim());
            formData.append('notes', notes.trim());

            if (receiptFile) {
                formData.append('receiptImage', receiptFile);
            }

            const result = await createManualOrder(formData);

            addToast(result.message || 'سفارش با موفقیت ثبت شد.', 'success');

            // انتقال به صفحه سفارشات پس از ۱.۵ ثانیه
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
                        ایجاد یا انتخاب کاربر، تخصیص دوره‌های آموزشی و ضمیمه کردن فیش پرداختی به لیست سفارشات
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

                    {/* ── بخش ۱: انتخاب یا ایجاد کاربر ──────────────── */}
                    <section className={styles.card}>
                        <div className={styles.card__header}>
                            <h2 className={styles.card__title}>
                                <Users size={20} />
                                ۱. مشخصات کاربر
                            </h2>
                            <span className={styles.card__badge}>
                                {userMode === 'new' ? 'کاربر جدید' : 'کاربر موجود'}
                            </span>
                        </div>

                        {/* سوئیچر تب‌ها */}
                        <div className={styles.tabSwitch}>
                            <button
                                type="button"
                                className={`${styles.tabSwitch__tab} ${userMode === 'new' ? styles['tabSwitch__tab--active'] : ''}`}
                                onClick={() => setUserMode('new')}
                            >
                                <UserPlus size={18} />
                                ایجاد کاربر جدید
                            </button>
                            <button
                                type="button"
                                className={`${styles.tabSwitch__tab} ${userMode === 'existing' ? styles['tabSwitch__tab--active'] : ''}`}
                                onClick={() => setUserMode('existing')}
                            >
                                <Users size={18} />
                                انتخاب از کاربران موجود
                            </button>
                        </div>

                        {/* فرم کاربر جدید */}
                        {userMode === 'new' && (
                            <div>
                                <div className={styles.formRow}>
                                    <div className={styles.field}>
                                        <label className={styles.field__label}>
                                            شماره موبایل <span className={styles.required}>*</span>
                                        </label>
                                        <input
                                            type="tel"
                                            className={styles.input}
                                            value={phoneNumber}
                                            onChange={(e) => setPhoneNumber(e.target.value)}
                                            placeholder="مثال: 09123456789"
                                            dir="ltr"
                                            required
                                        />
                                        <span className={styles.field__hint}>
                                            در صورت وجود شماره در سیستم، دوره به همین کاربر متصل می‌گردد.
                                        </span>
                                    </div>
                                    <div className={styles.field}>
                                        <label className={styles.field__label}>ایمیل (اختیاری)</label>
                                        <input
                                            type="email"
                                            className={styles.input}
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="example@mail.com"
                                            dir="ltr"
                                        />
                                    </div>
                                </div>
                                <div className={styles.formRow}>
                                    <div className={styles.field}>
                                        <label className={styles.field__label}>نام</label>
                                        <input
                                            type="text"
                                            className={styles.input}
                                            value={firstName}
                                            onChange={(e) => setFirstName(e.target.value)}
                                            placeholder="مثال: علی"
                                        />
                                    </div>
                                    <div className={styles.field}>
                                        <label className={styles.field__label}>نام خانوادگی</label>
                                        <input
                                            type="text"
                                            className={styles.input}
                                            value={lastName}
                                            onChange={(e) => setLastName(e.target.value)}
                                            placeholder="مثال: محمدی"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* انتخاب کاربر موجود */}
                        {userMode === 'existing' && (
                            <div>
                                {selectedUser ? (
                                    <div className={styles.selectedUserCard}>
                                        <div className={styles.selectedUserCard__details}>
                                            <div className={styles.selectedUserCard__avatar}>
                                                {selectedUser.firstName ? selectedUser.firstName[0] : 'U'}
                                            </div>
                                            <div className={styles.selectedUserCard__meta}>
                                                <span className={styles.selectedUserCard__title}>
                                                    {selectedUser.fullName || selectedUser.username}
                                                </span>
                                                <span className={styles.selectedUserCard__sub}>
                                                    شماره تماس: {selectedUser.phoneNumber || 'ثبت نشده'} | ایمیل: {selectedUser.email || 'ثبت نشده'}
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
                                            </div>
                                        ) : null}
                                    </div>
                                )}
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
                                className={styles.input}
                                value={courseSearch}
                                onChange={(e) => setCourseSearch(e.target.value)}
                                placeholder="جستجو در لیست دوره‌ها..."
                                style={{ maxWidth: '320px' }}
                            />
                        </div>

                        <div className={styles.coursesList}>
                            {filteredCourses.length === 0 ? (
                                <p style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                                    دوره‌ای یافت نشد.
                                </p>
                            ) : (
                                filteredCourses.map((course) => {
                                    const isCourseSelected = !!selectedItems[`course-${course.id}`];
                                    const hasChapters = course.isChaptered && Array.isArray(course.chapters) && course.chapters.length > 0;
                                    const isOpen = openChapters[course.id];

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

                    {/* ── بخش ۳: اطلاعات پرداخت و فیش واریزی ──────── */}
                    <section className={styles.card}>
                        <div className={styles.card__header}>
                            <h2 className={styles.card__title}>
                                <CreditCard size={20} />
                                ۳. اطلاعات پرداخت و پیوست فیش
                            </h2>
                        </div>

                        {/* آپلود فیش */}
                        <div className={styles.field} style={{ marginBottom: '1.25rem' }}>
                            <label className={styles.field__label}>
                                تصویر فیش واریزی (اختیاری)
                            </label>

                            {receiptPreview ? (
                                <div className={styles.previewBox}>
                                    <img src={receiptPreview} alt="Receipt preview" className={styles.previewBox__img} />
                                    <div className={styles.previewBox__overlay}>
                                        <button
                                            type="button"
                                            className={styles.previewBox__deleteBtn}
                                            onClick={handleRemoveReceipt}
                                            title="حذف فیش"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div
                                    className={styles.uploadDropzone}
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <div className={styles.uploadDropzone__icon}>
                                        <UploadCloud size={24} />
                                    </div>
                                    <span className={styles.uploadDropzone__text}>
                                        کلیک کنید یا تصویر فیش را اینجا رها نمایید
                                    </span>
                                    <span className={styles.uploadDropzone__subtext}>
                                        فرمت‌های مجاز: JPG, PNG, WebP (حداکثر ۱۰ مگابایت)
                                    </span>
                                </div>
                            )}

                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                style={{ display: 'none' }}
                                onChange={handleFileChange}
                            />
                        </div>

                        <div className={styles.formRow}>
                            <div className={styles.field}>
                                <label className={styles.field__label}>نام صاحب کارت / واریزکننده</label>
                                <input
                                    type="text"
                                    className={styles.input}
                                    value={cardHolderName}
                                    onChange={(e) => setCardHolderName(e.target.value)}
                                    placeholder="مثال: علی محمدی"
                                />
                            </div>
                            <div className={styles.field}>
                                <label className={styles.field__label}>شماره پیگیری / ارجاع</label>
                                <input
                                    type="text"
                                    className={styles.input}
                                    value={trackingNumber}
                                    onChange={(e) => setTrackingNumber(e.target.value)}
                                    placeholder="مثال: 849204859"
                                    dir="ltr"
                                />
                            </div>
                        </div>

                        <div className={styles.formRow}>
                            <div className={styles.field}>
                                <label className={styles.field__label}>روش پرداخت</label>
                                <select
                                    className={styles.select}
                                    value={paymentMethod}
                                    onChange={(e) => setPaymentMethod(e.target.value)}
                                >
                                    <option value="card_to_card">کارت به کارت</option>
                                    <option value="online">آنلاین (درگاه)</option>
                                    <option value="free">رایگان (هدیه / بورسیه)</option>
                                </select>
                            </div>
                            <div className={styles.field}>
                                <label className={styles.field__label}>وضعیت پرداخت و سفارش</label>
                                <select
                                    className={styles.select}
                                    value={paymentStatus}
                                    onChange={(e) => {
                                        setPaymentStatus(e.target.value);
                                        setOrderStatus(e.target.value === 'paid' ? 'paid' : 'pending');
                                    }}
                                >
                                    <option value="paid">پرداخت شده (فعال‌سازی آنی دوره)</option>
                                    <option value="pending_payment">در انتظار پرداخت</option>
                                    <option value="pending_verification">در انتظار بررسی و تأیید</option>
                                </select>
                            </div>
                        </div>

                        <div className={styles.formRow}>
                            <div className={styles.field}>
                                <label className={styles.field__label}>مبلغ کل سفارش (تومان)</label>
                                <input
                                    type="number"
                                    className={styles.input}
                                    value={effectiveTotalPrice}
                                    onChange={(e) => setCustomTotalPrice(e.target.value)}
                                    placeholder="مبلغ دلخواه"
                                />
                                <span className={styles.field__hint}>
                                    پیش‌فرض: {formatPrice(calculatedSum)} (محاسبه خودکار بر اساس اقلام)
                                </span>
                            </div>
                            <div className={styles.field}>
                                <label className={styles.field__label}>یادداشت برای سفارش</label>
                                <input
                                    type="text"
                                    className={styles.input}
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="توضیحات و جزئیات ثبت سفارش..."
                                />
                            </div>
                        </div>
                    </section>
                </div>

                {/* ── ستون کناری: خلاصه و دکمه ثبت ───────────────────── */}
                <aside className={styles.sideColumn}>
                    <div className={styles.summaryCard}>
                        <h3 className={styles.summaryCard__title}>
                            <FileText size={20} />
                            خلاصه ثبت سفارش
                        </h3>

                        <div className={styles.summaryCard__list}>
                            <div className={styles.summaryCard__row}>
                                <span>کاربر:</span>
                                <span>
                                    {userMode === 'new'
                                        ? (phoneNumber ? `${firstName || ''} ${lastName || ''}`.trim() || phoneNumber : 'مشخص نشده')
                                        : (selectedUser ? selectedUser.fullName || selectedUser.username : 'انتخاب نشده')}
                                </span>
                            </div>

                            <div className={styles.summaryCard__row}>
                                <span>تعداد اقلام:</span>
                                <span>{Object.keys(selectedItems).length} مورد</span>
                            </div>

                            <div className={styles.summaryCard__row}>
                                <span>روش پرداخت:</span>
                                <span>
                                    {paymentMethod === 'card_to_card' ? 'کارت به کارت' : paymentMethod === 'free' ? 'رایگان' : 'آنلاین'}
                                </span>
                            </div>

                            <div className={styles.summaryCard__row}>
                                <span>وضعیت فعال‌سازی:</span>
                                <span style={{ color: paymentStatus === 'paid' ? 'var(--color-success)' : 'var(--color-warning-amber)' }}>
                                    {paymentStatus === 'paid' ? 'فعال‌سازی فوری' : 'در انتظار تأیید'}
                                </span>
                            </div>

                            <div className={styles.summaryCard__row}>
                                <span>فیش پیوست:</span>
                                <span>{receiptFile ? 'دارد (آپلود می‌شود)' : 'ندارد'}</span>
                            </div>

                            <div className={styles.summaryCard__totalRow}>
                                <span>مبلغ نهایی:</span>
                                <span className={styles.totalPrice}>
                                    {formatPrice(effectiveTotalPrice)}
                                </span>
                            </div>
                        </div>

                        <button
                            type="submit"
                            className={styles.summaryCard__submitBtn}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                'در حال ثبت سفارش و فعال‌سازی...'
                            ) : (
                                <>
                                    <CheckCircle2 size={20} />
                                    ثبت نهایی و فعال‌سازی دوره
                                </>
                            )}
                        </button>
                    </div>
                </aside>
            </form>
        </div>
    );
}
