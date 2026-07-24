'use client';

/**
 * @file src/components/chat/MentorFormEditor.jsx
 * @description مودال ویرایش فرم پیش‌نیاز سالکان — Client Component
 *
 * ✨ قابلیت‌ها:
 *  - دریافت سوالات فعلی از Strapi (mentor-form-setting)
 *  - افزودن / ویرایش / حذف / مرتب‌سازی سوالات
 *  - ذخیره تغییرات از طریق PUT /api/mentor-form-setting
 *
 * Props:
 *  - token {string} — JWT token ادمین
 *  - isOpen {boolean} — نمایش / پنهان‌سازی مودال
 *  - onClose {function} — callback بستن مودال
 */

import { useState, useEffect, useCallback } from 'react';
import { getMentorFormSetting, updateMentorFormSetting } from '@/lib/messagesApi';
import styles from './MentorFormEditor.module.scss';

const FIELD_TYPES = [
    { value: 'text', label: 'متن کوتاه' },
    { value: 'number', label: 'عدد' },
    { value: 'textarea', label: 'متن بلند' },
    { value: 'select', label: 'انتخابی (چند گزینه)' },
];

const emptyQuestion = () => ({
    key: '',
    label: '',
    fieldType: 'text',
    isRequired: false,
    placeholder: '',
    options: '',
    __id: Math.random().toString(36).slice(2),
});

function serializeOptions(raw) {
    if (!raw) return null;
    const trimmed = raw.trim();
    if (!trimmed) return null;
    // تلاش برای parse کردن به عنوان JSON
    try {
        const parsed = JSON.parse(trimmed);
        return parsed;
    } catch {
        // اگر JSON نبود، با کاما تقسیم می‌کنیم
        return trimmed.split(',').map((s) => s.trim()).filter(Boolean);
    }
}

function displayOptions(options) {
    if (!options) return '';
    if (typeof options === 'string') return options;
    try {
        return JSON.stringify(options);
    } catch {
        return '';
    }
}

export default function MentorFormEditor({ token, isOpen, onClose }) {
    const [questions, setQuestions] = useState([]);
    const [formTitle, setFormTitle] = useState('');
    const [formDescription, setFormDescription] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState(null);
    const [successMsg, setSuccessMsg] = useState(null);

    // ─── Fetch current settings ───────────────────────────────────────────────
    const loadSettings = useCallback(async () => {
        if (!token || !isOpen) return;
        setIsLoading(true);
        setError(null);
        try {
            const res = await getMentorFormSetting(token);
            const data = res?.data?.attributes || res?.data;
            if (data) {
                setFormTitle(data.title || '');
                setFormDescription(data.description || '');
                const raw = data.questions?.data || data.questions;
                if (Array.isArray(raw) && raw.length > 0) {
                    setQuestions(
                        raw.map((q) => {
                            const attrs = q.attributes || q;
                            return {
                                key: attrs.key || '',
                                label: attrs.label || '',
                                fieldType: attrs.fieldType || 'text',
                                isRequired: Boolean(attrs.isRequired),
                                placeholder: attrs.placeholder || '',
                                options: displayOptions(attrs.options),
                                __id: Math.random().toString(36).slice(2),
                            };
                        })
                    );
                } else {
                    setQuestions([emptyQuestion()]);
                }
            } else {
                setQuestions([emptyQuestion()]);
            }
        } catch {
            setQuestions([emptyQuestion()]);
        } finally {
            setIsLoading(false);
        }
    }, [token, isOpen]);

    useEffect(() => {
        if (isOpen) {
            setSuccessMsg(null);
            loadSettings();
        }
    }, [isOpen, loadSettings]);

    // ─── Close on Escape ─────────────────────────────────────────────────────
    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        if (isOpen) window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isOpen, onClose]);

    // ─── Question CRUD ────────────────────────────────────────────────────────
    const addQuestion = () => setQuestions((prev) => [...prev, emptyQuestion()]);

    const removeQuestion = (id) =>
        setQuestions((prev) => prev.filter((q) => q.__id !== id));

    const updateQuestion = (id, field, value) =>
        setQuestions((prev) =>
            prev.map((q) => (q.__id === id ? { ...q, [field]: value } : q))
        );

    const moveQuestion = (id, direction) => {
        setQuestions((prev) => {
            const idx = prev.findIndex((q) => q.__id === id);
            if (idx < 0) return prev;
            const next = [...prev];
            const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
            if (swapIdx < 0 || swapIdx >= next.length) return prev;
            [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
            return next;
        });
    };

    // ─── Save ─────────────────────────────────────────────────────────────────
    const handleSave = async () => {
        setError(null);
        setSuccessMsg(null);

        // validation ساده
        for (const q of questions) {
            if (!q.key.trim()) { setError('کلید (key) برای همه سوالات الزامی است.'); return; }
            if (!q.label.trim()) { setError('عنوان (label) برای همه سوالات الزامی است.'); return; }
        }

        setIsSaving(true);
        try {
            const payload = {
                title: formTitle,
                description: formDescription,
                questions: questions.map(({ __id, options, ...rest }) => ({
                    ...rest,
                    options: serializeOptions(options),
                })),
            };
            await updateMentorFormSetting(payload, token);
            setSuccessMsg('تنظیمات فرم با موفقیت ذخیره شد ✓');
        } catch {
            setError('خطا در ذخیره تنظیمات. لطفاً دوباره تلاش کنید.');
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="ویرایش فرم پیش‌نیاز">
            {/* Backdrop */}
            <div className={styles.backdrop} onClick={onClose} />

            {/* Modal */}
            <div className={styles.modal}>

                {/* ── Header ── */}
                <div className={styles.modal__header}>
                    <div className={styles.modal__headerLeft}>
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                        <h2 className={styles.modal__title}>ویرایش فرم پیش‌نیاز سالک</h2>
                    </div>
                    <button
                        className={styles.modal__close}
                        onClick={onClose}
                        aria-label="بستن"
                        type="button"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                {/* ── Body ── */}
                <div className={styles.modal__body}>
                    {isLoading ? (
                        <div className={styles.loading}>
                            <span className={styles.spinner} />
                            <span>در حال بارگذاری...</span>
                        </div>
                    ) : (
                        <>
                            {/* ─ عنوان و توضیح فرم ─ */}
                            <div className={styles.section}>
                                <h3 className={styles.section__title}>اطلاعات کلی فرم</h3>
                                <div className={styles.field}>
                                    <label className={styles.label}>عنوان فرم</label>
                                    <input
                                        type="text"
                                        className={styles.input}
                                        value={formTitle}
                                        onChange={(e) => setFormTitle(e.target.value)}
                                        placeholder="مثلاً: اطلاعات پایه سالک"
                                    />
                                </div>
                                <div className={styles.field}>
                                    <label className={styles.label}>توضیح فرم</label>
                                    <input
                                        type="text"
                                        className={styles.input}
                                        value={formDescription}
                                        onChange={(e) => setFormDescription(e.target.value)}
                                        placeholder="راهنمای نمایش داده‌شده به سالک زیر عنوان فرم"
                                    />
                                </div>
                            </div>

                            {/* ─ سوالات ─ */}
                            <div className={styles.section}>
                                <div className={styles.section__header}>
                                    <h3 className={styles.section__title}>سوالات فرم</h3>
                                    <button
                                        type="button"
                                        className={styles.addBtn}
                                        onClick={addQuestion}
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                                        </svg>
                                        افزودن سوال
                                    </button>
                                </div>

                                <div className={styles.questions}>
                                    {questions.map((q, idx) => (
                                        <div key={q.__id} className={styles.questionCard}>
                                            {/* Card header */}
                                            <div className={styles.questionCard__header}>
                                                <span className={styles.questionCard__num}>سوال {idx + 1}</span>
                                                <div className={styles.questionCard__actions}>
                                                    <button
                                                        type="button"
                                                        title="بالاتر"
                                                        disabled={idx === 0}
                                                        onClick={() => moveQuestion(q.__id, 'up')}
                                                        className={styles.iconBtn}
                                                    >↑</button>
                                                    <button
                                                        type="button"
                                                        title="پایین‌تر"
                                                        disabled={idx === questions.length - 1}
                                                        onClick={() => moveQuestion(q.__id, 'down')}
                                                        className={styles.iconBtn}
                                                    >↓</button>
                                                    <button
                                                        type="button"
                                                        title="حذف"
                                                        onClick={() => removeQuestion(q.__id)}
                                                        className={`${styles.iconBtn} ${styles['iconBtn--danger']}`}
                                                    >
                                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Card fields */}
                                            <div className={styles.questionCard__grid}>
                                                <div className={styles.field}>
                                                    <label className={styles.label}>
                                                        کلید (key) <span className={styles.required}>*</span>
                                                    </label>
                                                    <input
                                                        type="text"
                                                        className={styles.input}
                                                        value={q.key}
                                                        onChange={(e) => updateQuestion(q.__id, 'key', e.target.value.replace(/\s/g, '_'))}
                                                        placeholder="مثلاً: age"
                                                        dir="ltr"
                                                    />
                                                </div>
                                                <div className={styles.field}>
                                                    <label className={styles.label}>
                                                        عنوان (label) <span className={styles.required}>*</span>
                                                    </label>
                                                    <input
                                                        type="text"
                                                        className={styles.input}
                                                        value={q.label}
                                                        onChange={(e) => updateQuestion(q.__id, 'label', e.target.value)}
                                                        placeholder="مثلاً: سن"
                                                    />
                                                </div>
                                                <div className={styles.field}>
                                                    <label className={styles.label}>نوع فیلد</label>
                                                    <select
                                                        className={styles.select}
                                                        value={q.fieldType}
                                                        onChange={(e) => updateQuestion(q.__id, 'fieldType', e.target.value)}
                                                    >
                                                        {FIELD_TYPES.map((t) => (
                                                            <option key={t.value} value={t.value}>{t.label}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className={styles.field}>
                                                    <label className={styles.label}>متن راهنما (placeholder)</label>
                                                    <input
                                                        type="text"
                                                        className={styles.input}
                                                        value={q.placeholder}
                                                        onChange={(e) => updateQuestion(q.__id, 'placeholder', e.target.value)}
                                                        placeholder="متن کمکی داخل فیلد..."
                                                    />
                                                </div>
                                            </div>

                                            {/* Options (only for select) */}
                                            {q.fieldType === 'select' && (
                                                <div className={styles.field} style={{ marginTop: '8px' }}>
                                                    <label className={styles.label}>
                                                        گزینه‌ها
                                                        <span className={styles.hint}> (با کاما جدا کنید یا JSON وارد کنید)</span>
                                                    </label>
                                                    <textarea
                                                        className={`${styles.input} ${styles['input--textarea']}`}
                                                        rows={2}
                                                        value={q.options}
                                                        onChange={(e) => updateQuestion(q.__id, 'options', e.target.value)}
                                                        placeholder={`مثال: مجرد, متاهل, مطلقه\nیا: [{"value":"single","label":"مجرد"},{"value":"married","label":"متاهل"}]`}
                                                        dir="rtl"
                                                    />
                                                </div>
                                            )}

                                            {/* isRequired toggle */}
                                            <label className={styles.toggleLabel}>
                                                <input
                                                    type="checkbox"
                                                    className={styles.toggle}
                                                    checked={q.isRequired}
                                                    onChange={(e) => updateQuestion(q.__id, 'isRequired', e.target.checked)}
                                                />
                                                <span>پاسخ به این سوال الزامی است</span>
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}

                    {/* Feedback */}
                    {error && (
                        <div className={styles.alert} role="alert">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
                            </svg>
                            {error}
                        </div>
                    )}
                    {successMsg && (
                        <div className={`${styles.alert} ${styles['alert--success']}`} role="status">
                            {successMsg}
                        </div>
                    )}
                </div>

                {/* ── Footer ── */}
                <div className={styles.modal__footer}>
                    <button
                        type="button"
                        className={styles.cancelBtn}
                        onClick={onClose}
                    >
                        انصراف
                    </button>
                    <button
                        type="button"
                        id="mentor-form-editor-save"
                        className={styles.saveBtn}
                        onClick={handleSave}
                        disabled={isSaving || isLoading}
                    >
                        {isSaving ? (
                            <><span className={styles.spinner} /> در حال ذخیره...</>
                        ) : (
                            <>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                                    <polyline points="17 21 17 13 7 13 7 21" />
                                    <polyline points="7 3 7 8 15 8" />
                                </svg>
                                ذخیره تغییرات
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
