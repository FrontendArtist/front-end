'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    Ticket,
    Sparkles,
    Calendar,
    Save,
    ArrowRight,
    Search,
    Check,
    AlertCircle,
} from 'lucide-react';
import styles from './Coupons.module.scss';
import { createCoupon, updateCoupon } from '@/lib/client/admin/couponsClient';

export default function CouponForm({
    initialData = null,
    allProducts = [],
    allCourses = [],
    isEdit = false,
}) {
    const router = useRouter();

    // ── Form State ───────────────────────────────────────────────────────────
    const [code, setCode] = useState(initialData?.code || '');
    const [title, setTitle] = useState(initialData?.title || '');
    const [discountType, setDiscountType] = useState(initialData?.discountType || 'percentage');
    const [discountValue, setDiscountValue] = useState(initialData?.discountValue != null ? String(initialData.discountValue) : '15');
    const [maxDiscountAmount, setMaxDiscountAmount] = useState(initialData?.maxDiscountAmount != null ? String(initialData.maxDiscountAmount) : '');
    const [minOrderAmount, setMinOrderAmount] = useState(initialData?.minOrderAmount != null ? String(initialData.minOrderAmount) : '');

    const [appliesToAllProducts, setAppliesToAllProducts] = useState(initialData?.appliesToAllProducts ?? true);
    const [appliesToAllCourses, setAppliesToAllCourses] = useState(initialData?.appliesToAllCourses ?? true);

    const [selectedProductIds, setSelectedProductIds] = useState(
        initialData?.products?.map((p) => p.documentId || String(p.id)) || []
    );
    const [selectedCourseIds, setSelectedCourseIds] = useState(
        initialData?.courses?.map((c) => c.documentId || String(c.id)) || []
    );

    const [startDate, setStartDate] = useState(
        initialData?.startDate ? new Date(initialData.startDate).toISOString().slice(0, 16) : ''
    );
    const [expiresAt, setExpiresAt] = useState(
        initialData?.expiresAt ? new Date(initialData.expiresAt).toISOString().slice(0, 16) : ''
    );
    const [maxUsage, setMaxUsage] = useState(initialData?.maxUsage != null ? String(initialData.maxUsage) : '');
    const [isActive, setIsActive] = useState(initialData?.isActive !== false);

    // Search filters for pickers
    const [productSearch, setProductSearch] = useState('');
    const [courseSearch, setCourseSearch] = useState('');

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const formatPrice = (num) => new Intl.NumberFormat('fa-IR').format(num || 0);

    // ── Generate Random Code ─────────────────────────────────────────────────
    const handleGenerateCode = () => {
        const prefixes = ['OFF', 'GIFT', 'SPECIAL', 'VIP', 'NOROOZ', 'GOLDEN'];
        const randomPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
        const randomNum = Math.floor(100 + Math.random() * 900);
        setCode(`${randomPrefix}${randomNum}`);
    };

    // ── Quick Expiration Presets ─────────────────────────────────────────────
    const setPresetExpiry = (days) => {
        if (days === 0) {
            setExpiresAt('');
            return;
        }
        const target = new Date();
        target.setDate(target.getDate() + days);
        setExpiresAt(target.toISOString().slice(0, 16));
    };

    // ── Filtered Products / Courses for Picker ───────────────────────────────
    const filteredProducts = useMemo(() => {
        if (!productSearch.trim()) return allProducts;
        const q = productSearch.toLowerCase();
        return allProducts.filter((p) => p.title?.toLowerCase().includes(q));
    }, [allProducts, productSearch]);

    const filteredCourses = useMemo(() => {
        if (!courseSearch.trim()) return allCourses;
        const q = courseSearch.toLowerCase();
        return allCourses.filter((c) => c.title?.toLowerCase().includes(q));
    }, [allCourses, courseSearch]);

    const toggleProductSelect = (docId) => {
        setSelectedProductIds((prev) =>
            prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId]
        );
    };

    const toggleCourseSelect = (docId) => {
        setSelectedCourseIds((prev) =>
            prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId]
        );
    };

    // ── Handle Submit ────────────────────────────────────────────────────────
    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMessage('');

        const cleanCode = code.trim().toUpperCase();
        if (!cleanCode) {
            setErrorMessage('لطفاً کد تخفیف را وارد کنید.');
            return;
        }

        const numDiscount = Number(discountValue);
        if (isNaN(numDiscount) || numDiscount <= 0) {
            setErrorMessage('مقدار تخفیف باید عددی بزرگتر از صفر باشد.');
            return;
        }

        if (discountType === 'percentage' && numDiscount > 100) {
            setErrorMessage('درصد تخفیف نمی‌تواند بیشتر از ۱۰۰ باشد.');
            return;
        }

        if (!appliesToAllProducts && !appliesToAllCourses && selectedProductIds.length === 0 && selectedCourseIds.length === 0) {
            setErrorMessage('حداقل یک محصول، یک دوره، یا یکی از گزینه‌های شمول همگانی را انتخاب کنید.');
            return;
        }

        setIsSubmitting(true);

        const payload = {
            code: cleanCode,
            title: title.trim() || null,
            discountType,
            discountValue: numDiscount,
            maxDiscountAmount: maxDiscountAmount ? Number(maxDiscountAmount) : null,
            minOrderAmount: minOrderAmount ? Number(minOrderAmount) : null,
            appliesToAllProducts,
            appliesToAllCourses,
            products: appliesToAllProducts ? [] : selectedProductIds,
            courses: appliesToAllCourses ? [] : selectedCourseIds,
            startDate: startDate ? new Date(startDate).toISOString() : null,
            expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
            maxUsage: maxUsage ? Number(maxUsage) : null,
            isActive,
        };

        try {
            if (isEdit) {
                await updateCoupon(initialData.documentId || initialData.id, payload);
            } else {
                await createCoupon(payload);
            }

            router.push('/admin/coupons');
            router.refresh();
        } catch (err) {
            setErrorMessage(err.message || 'خطا در ذخیره‌سازی کد تخفیف');
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className={styles.formCard}>
            {/* ── Error Banner ───────────────────────────────────────────────── */}
            {errorMessage && (
                <div
                    style={{
                        padding: '12px 16px',
                        background: 'rgba(239, 68, 68, 0.15)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: '8px',
                        color: '#fca5a5',
                        fontSize: '0.875rem',
                        marginBottom: '1.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                    }}
                >
                    <AlertCircle size={18} color="#ef4444" />
                    <span>{errorMessage}</span>
                </div>
            )}

            <div className={styles.formGrid}>
                {/* ── کد تخفیف ──────────────────────────────────────────────── */}
                <div className={styles.fieldGroup}>
                    <label className={styles.label}>
                        <span>کد تخفیف (Code) *</span>
                        <span className={styles.subLabel}>حروف و اعداد انگلیسی</span>
                    </label>
                    <div className={styles.inputWithAction}>
                        <input
                            type="text"
                            value={code}
                            onChange={(e) => setCode(e.target.value.toUpperCase())}
                            placeholder="مثلاً NOROOZ1405"
                            className={`${styles.input} ${styles.inputLtr} ${styles.inputUpper}`}
                            required
                        />
                        <button
                            type="button"
                            onClick={handleGenerateCode}
                            className={styles.quickBtn}
                            title="تولید کد رندوم"
                        >
                            <Sparkles size={14} style={{ display: 'inline', marginLeft: '4px' }} />
                            تولید تصادفی
                        </button>
                    </div>
                </div>

                {/* ── عنوان / مناسبت ────────────────────────────────────────── */}
                <div className={styles.fieldGroup}>
                    <label className={styles.label}>
                        <span>عنوان / مناسبت تخفیف</span>
                        <span className={styles.subLabel}>اختیاری (جهت شناسایی در گزارشات)</span>
                    </label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="مثلاً تخفیف ویژه عید نوروز"
                        className={styles.input}
                    />
                </div>

                {/* ── نوع تخفیف ──────────────────────────────────────────────── */}
                <div className={styles.fieldGroup}>
                    <label className={styles.label}>نوع تخفیف *</label>
                    <select
                        value={discountType}
                        onChange={(e) => setDiscountType(e.target.value)}
                        className={styles.select}
                    >
                        <option value="percentage">درصدی (%)</option>
                        <option value="fixed">مبلغ ثابت (تومان)</option>
                    </select>
                </div>

                {/* ── مقدار تخفیف ────────────────────────────────────────────── */}
                <div className={styles.fieldGroup}>
                    <label className={styles.label}>
                        <span>مقدار تخفیف *</span>
                        <span className={styles.subLabel}>
                            {discountType === 'percentage' ? 'درصد (بین ۱ تا ۱۰۰)' : 'مبلغ به تومان'}
                        </span>
                    </label>
                    <input
                        type="number"
                        min="1"
                        max={discountType === 'percentage' ? '100' : undefined}
                        value={discountValue}
                        onChange={(e) => setDiscountValue(e.target.value)}
                        placeholder={discountType === 'percentage' ? '20' : '50000'}
                        className={styles.input}
                        required
                    />
                </div>

                {/* ── سقف مبلغ تخفیف درصدی ────────────────────────────────────── */}
                {discountType === 'percentage' && (
                    <div className={styles.fieldGroup}>
                        <label className={styles.label}>
                            <span>حداکثر سقف تخفیف (تومان)</span>
                            <span className={styles.subLabel}>اختیاری (برای جلوگیری از تخفیف‌های سنگین)</span>
                        </label>
                        <input
                            type="number"
                            value={maxDiscountAmount}
                            onChange={(e) => setMaxDiscountAmount(e.target.value)}
                            placeholder="مثلاً 150000"
                            className={styles.input}
                        />
                    </div>
                )}

                {/* ── حداقل مبلغ سفارش ───────────────────────────────────────── */}
                <div className={styles.fieldGroup}>
                    <label className={styles.label}>
                        <span>حداقل مبلغ سفارش (تومان)</span>
                        <span className={styles.subLabel}>اختیاری</span>
                    </label>
                    <input
                        type="number"
                        value={minOrderAmount}
                        onChange={(e) => setMinOrderAmount(e.target.value)}
                        placeholder="مثلاً 200000"
                        className={styles.input}
                    />
                </div>

                {/* ── شمول تخفیف (بخش محصولات و دوره‌ها) ────────────────────────── */}
                <div className={`${styles.fieldGroup} ${styles.fullWidth}`}>
                    <label className={styles.label} style={{ fontSize: '0.95rem', color: '#ffd166', margin: '8px 0 4px' }}>
                        🎯 شمول و هدف کد تخفیف
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                        <label className={styles.checkboxCard}>
                            <input
                                type="checkbox"
                                checked={appliesToAllProducts}
                                onChange={(e) => setAppliesToAllProducts(e.target.checked)}
                            />
                            <div className={styles.checkboxText}>
                                <strong>اعمال روی تمام محصولات فیزیکی</strong>
                                <span>کد تخفیف روی همه محصولات فروشگاه فعال باشد</span>
                            </div>
                        </label>

                        <label className={styles.checkboxCard}>
                            <input
                                type="checkbox"
                                checked={appliesToAllCourses}
                                onChange={(e) => setAppliesToAllCourses(e.target.checked)}
                            />
                            <div className={styles.checkboxText}>
                                <strong>اعمال روی تمام دوره‌ها و فصل‌ها</strong>
                                <span>کد تخفیف روی همه دوره‌های آموزشی و فصل‌های آنها اعمال شود</span>
                            </div>
                        </label>
                    </div>
                </div>

                {/* ── انتخاب محصولات خاص در صورت عدم شمول همگانی ────────────────── */}
                {!appliesToAllProducts && (
                    <div className={styles.fieldGroup}>
                        <label className={styles.label}>
                            <span>انتخاب محصولات مشخص ({selectedProductIds.length} انتخاب شده)</span>
                        </label>
                        <div style={{ position: 'relative', marginBottom: '6px' }}>
                            <input
                                type="text"
                                value={productSearch}
                                onChange={(e) => setProductSearch(e.target.value)}
                                placeholder="جستجوی محصول..."
                                className={styles.input}
                                style={{ paddingRight: '2rem' }}
                            />
                            <Search size={14} style={{ position: 'absolute', right: '10px', top: '12px', color: 'rgba(255,255,255,0.4)' }} />
                        </div>
                        <div className={styles.pickerContainer}>
                            {filteredProducts.length === 0 ? (
                                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '10px' }}>
                                    محصولی یافت نشد.
                                </div>
                            ) : (
                                filteredProducts.map((prod) => {
                                    const docId = prod.documentId || String(prod.id);
                                    const isSelected = selectedProductIds.includes(docId);
                                    return (
                                        <div
                                            key={docId}
                                            onClick={() => toggleProductSelect(docId)}
                                            className={`${styles.pickerItem} ${isSelected ? styles.selected : ''}`}
                                        >
                                            <span className={styles.pickerItemTitle}>{prod.title}</span>
                                            {isSelected && <Check size={14} color="#ffd166" />}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}

                {/* ── انتخاب دوره‌های خاص در صورت عدم شمول همگانی ───────────────── */}
                {!appliesToAllCourses && (
                    <div className={styles.fieldGroup}>
                        <label className={styles.label}>
                            <span>انتخاب دوره‌های مشخص ({selectedCourseIds.length} انتخاب شده)</span>
                        </label>
                        <div style={{ position: 'relative', marginBottom: '6px' }}>
                            <input
                                type="text"
                                value={courseSearch}
                                onChange={(e) => setCourseSearch(e.target.value)}
                                placeholder="جستجوی دوره..."
                                className={styles.input}
                                style={{ paddingRight: '2rem' }}
                            />
                            <Search size={14} style={{ position: 'absolute', right: '10px', top: '12px', color: 'rgba(255,255,255,0.4)' }} />
                        </div>
                        <div className={styles.pickerContainer}>
                            {filteredCourses.length === 0 ? (
                                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '10px' }}>
                                    دوره‌ای یافت نشد.
                                </div>
                            ) : (
                                filteredCourses.map((crs) => {
                                    const docId = crs.documentId || String(crs.id);
                                    const isSelected = selectedCourseIds.includes(docId);
                                    return (
                                        <div
                                            key={docId}
                                            onClick={() => toggleCourseSelect(docId)}
                                            className={`${styles.pickerItem} ${isSelected ? styles.selected : ''}`}
                                        >
                                            <span className={styles.pickerItemTitle}>{crs.title}</span>
                                            {isSelected && <Check size={14} color="#ffd166" />}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}

                {/* ── محدودیت‌های استفاده و تاریخ‌ها ───────────────────────────── */}
                <div className={`${styles.fieldGroup} ${styles.fullWidth}`}>
                    <label className={styles.label} style={{ fontSize: '0.95rem', color: '#ffd166', margin: '8px 0 4px' }}>
                        ⏰ تاریخ و سقف استفاده
                    </label>
                </div>

                {/* سقف دفعات استفاده */}
                <div className={styles.fieldGroup}>
                    <label className={styles.label}>
                        <span>حداکثر دفعات مجاز استفاده (Max Usage)</span>
                        <span className={styles.subLabel}>خالی = نامحدود</span>
                    </label>
                    <input
                        type="number"
                        min="1"
                        value={maxUsage}
                        onChange={(e) => setMaxUsage(e.target.value)}
                        placeholder="مثلاً 100"
                        className={styles.input}
                    />
                </div>

                {/* وضعیت فعال بودن */}
                <div className={styles.fieldGroup}>
                    <label className={styles.label}>وضعیت اولیه کد تخفیف</label>
                    <label className={styles.checkboxCard} style={{ marginTop: '2px' }}>
                        <input
                            type="checkbox"
                            checked={isActive}
                            onChange={(e) => setIsActive(e.target.checked)}
                        />
                        <div className={styles.checkboxText}>
                            <strong>کد تخفیف هم‌اکنون فعال باشد</strong>
                            <span>کاربران بتوانند بلافاصله این کد را اعمال کنند</span>
                        </div>
                    </label>
                </div>

                {/* تاریخ شروع */}
                <div className={styles.fieldGroup}>
                    <label className={styles.label}>
                        <span>تاریخ و ساعت شروع اعتبار</span>
                        <span className={styles.subLabel}>خالی = از همین لحظه</span>
                    </label>
                    <input
                        type="datetime-local"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className={`${styles.input} ${styles.inputLtr}`}
                    />
                </div>

                {/* تاریخ انقضا */}
                <div className={styles.fieldGroup}>
                    <label className={styles.label}>
                        <span>تاریخ و ساعت پایان (انقضا)</span>
                        <span className={styles.subLabel}>خالی = بدون محدودیت زمانی</span>
                    </label>
                    <input
                        type="datetime-local"
                        value={expiresAt}
                        onChange={(e) => setExpiresAt(e.target.value)}
                        className={`${styles.input} ${styles.inputLtr}`}
                    />
                    <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                        <button type="button" onClick={() => setPresetExpiry(7)} className={styles.quickBtn}>
                            + ۱ هفته
                        </button>
                        <button type="button" onClick={() => setPresetExpiry(30)} className={styles.quickBtn}>
                            + ۱ ماه
                        </button>
                        <button type="button" onClick={() => setPresetExpiry(90)} className={styles.quickBtn}>
                            + ۳ ماه
                        </button>
                        <button type="button" onClick={() => setPresetExpiry(0)} className={styles.quickBtn} style={{ color: '#f87171' }}>
                            بدون انقضا
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Form Actions ───────────────────────────────────────────────── */}
            <div className={styles.formActions}>
                <Link href="/admin/coupons" className={styles.cancelButton}>
                    انصراف
                </Link>

                <button
                    type="submit"
                    disabled={isSubmitting}
                    className={styles.submitButton}
                >
                    <Save size={16} />
                    {isSubmitting ? 'در حال ذخیره‌سازی...' : isEdit ? 'بروزرسانی کد تخفیف' : 'ایجاد کد تخفیف'}
                </button>
            </div>
        </form>
    );
}
