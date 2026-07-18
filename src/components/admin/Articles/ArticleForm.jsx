'use client';

/**
 * @file src/components/admin/Articles/ArticleForm.jsx
 * @description فرم ایجاد/ویرایش مقاله – Client Component
 */

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Editor } from '@tinymce/tinymce-react';
import styles from './Articles.module.scss';

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_API_URL || 'http://127.0.0.1:1337';

// ─────────────────────────────────────────────────────────────────────────────
// Toast Helper
// ─────────────────────────────────────────────────────────────────────────────
function useToast() {
    const [toasts, setToasts] = useState([]);

    const addToast = (message, type = 'success') => {
        const id = Date.now();
        setToasts((prev) => [...prev, { id, message, type }]);
        setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
    };

    return { toasts, addToast };
}
const TOAST_ICONS = { success: '✅', error: '❌', info: 'ℹ️' };

// ─────────────────────────────────────────────────────────────────────────────
// MultiSelect Helper Component
// ─────────────────────────────────────────────────────────────────────────────
function MultiSelect({ label, options, selectedIds, onChange, required }) {
    const [isOpen, setIsOpen] = useState(false);

    const toggleOption = (id) => {
        if (selectedIds.includes(id)) {
            onChange(selectedIds.filter((x) => x !== id));
        } else {
            onChange([...selectedIds, id]);
        }
    };

    const selectedItems = options.filter((o) => selectedIds.includes(o.documentId));

    return (
        <div className={styles.field}>
            <label>
                {required && <span className={styles.required}>*</span>}
                {label}
            </label>
            <div className={styles.multiSelect}>
                <div
                    className={styles.multiSelect__list}
                    onClick={() => setIsOpen(!isOpen)}
                >
                    {selectedItems.length === 0 ? (
                        <span style={{ opacity: 0.5, fontSize: 'var(--font-sm)', padding: '0.2rem' }}>
                            انتخاب کنید...
                        </span>
                    ) : (
                        selectedItems.map((item) => (
                            <span key={item.documentId} className={styles.multiSelect__tag}>
                                {item.title || item.name}
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        toggleOption(item.documentId);
                                    }}
                                >
                                    ×
                                </button>
                            </span>
                        ))
                    )}
                </div>

                {isOpen && (
                    <div className={styles.multiSelect__options}>
                        {options.map((opt) => {
                            const isSelected = selectedIds.includes(opt.documentId);
                            return (
                                <button
                                    key={opt.documentId}
                                    type="button"
                                    className={`${styles.multiSelect__option} ${isSelected ? styles['multiSelect__option--selected'] : ''}`}
                                    onClick={() => toggleOption(opt.documentId)}
                                >
                                    {opt.title || opt.name}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────
export default function ArticleForm({
    initialData = null,
    availableCategories = [],
    availableTags = [],
}) {
    const router = useRouter();
    const { toasts, addToast } = useToast();
    const editorRef = useRef(null);

    // Form state
    const [title, setTitle] = useState(initialData?.title || '');
    const [slug, setSlug] = useState(initialData?.slug || '');
    const [excerpt, setExcerpt] = useState(initialData?.excerpt || '');

    const [content, setContent] = useState(initialData?.content || '');
    const [cover, setCover] = useState(initialData?.cover || null);

    const [selectedCategories, setSelectedCategories] = useState(
        initialData?.articles_categories?.map((c) => c.documentId) || []
    );
    const [selectedTags, setSelectedTags] = useState(
        initialData?.tags?.map((t) => t.documentId) || []
    );

    // UI state
    const [isSaving, setIsSaving] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const isEdit = !!initialData;
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // ── Validation ──────────────────────────────────────────────────────────
    function validate() {
        if (!title.trim() || !slug.trim()) {
            addToast('عنوان و اسلاگ الزامی است.', 'error');
            return false;
        }
        return true;
    }

    // ── Image Upload ───────────────────────────────────────────────────────
    async function handleFileUpload(e) {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingImage(true);
        const formData = new FormData();
        formData.append('files', file);

        try {
            const upRes = await fetch('/api/media', {
                method: 'POST',
                body: formData,
            });

            if (!upRes.ok) throw new Error('Upload failed');
            const uploaded = await upRes.json();

            if (uploaded && uploaded.length > 0) {
                setCover(uploaded[0]);
                addToast('تصویر کاور با موفقیت آپلود شد.', 'success');
            }
        } catch (err) {
            console.error(err);
            addToast('خطا در آپلود تصویر', 'error');
        } finally {
            setUploadingImage(false);
            e.target.value = '';
        }
    }

    // ── Submit logic ───────────────────────────────────────────────────────
    async function handleSubmit(e, isDraft = false) {
        e.preventDefault();
        if (!validate()) return;

        setIsSaving(true);

        // Ensure get editor content
        const currentContent = editorRef.current ? editorRef.current.getContent() : content;

        const payload = {
            title,
            slug,
            excerpt,
            content: currentContent,
            articles_categories: selectedCategories,
            tags: selectedTags,
        };

        if (cover?.id) {
            payload.cover = cover.id;
        }

        if (isDraft) {
            payload.publishedAt = null;
        } else {
            // اگر قبلاً منتشر شده همون رو نگه دار، وگرنه الآن رو بفرست
            payload.publishedAt = initialData?.publishedAt || new Date().toISOString();
        }

        if (isEdit) {
            payload.documentId = initialData.documentId;
        }

        const url = isEdit
            ? `/api/admin/articles/${initialData.documentId}`
            : `/api/admin/articles`;
        const method = isEdit ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data?.error || 'خطای شبکه');
            }

            addToast(
                isEdit ? 'مقاله با موفقیت ویرایش شد.' : 'مقاله جدید با موفقیت ایجاد شد.',
                'success'
            );

            router.refresh();
            setTimeout(() => {
                router.push('/admin/articles');
            }, 1500);
        } catch (err) {
            console.error(err);
            addToast(err.message || 'خطا در ذخیره مقاله', 'error');
            setIsSaving(false);
        }
    }

    // ── Render ─────────────────────────────────────────────────────────────
    return (
        <>
            <form className={styles.formWrapper} onSubmit={(e) => e.preventDefault()}>
                <div className={styles.formGrid}>

                    {/* Title */}
                    <div className={styles.field}>
                        <label htmlFor="title">
                            <span className={styles.required}>*</span> عنوان مقاله
                        </label>
                        <input
                            id="title"
                            className={styles.input}
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="مثلا: راهنمای خرید قهوه"
                        />
                    </div>

                    {/* Slug */}
                    <div className={styles.field}>
                        <label htmlFor="slug">
                            <span className={styles.required}>*</span> اسلاگ (آدرس URL)
                        </label>
                        <input
                            id="slug"
                            className={styles.input}
                            value={slug}
                            onChange={(e) => setSlug(e.target.value)}
                            placeholder="مثلا: coffee-buying-guide"
                            style={{ direction: 'ltr', textAlign: 'left' }}
                        />
                        <span className={styles.hint}>
                            باید یکتای انگلیسی/انگلیسی-فارسی بدون خط فاصله اضافه باشد
                        </span>
                    </div>

                    {/* Excerpt */}
                    <div className={`${styles.field} ${styles['field--full']}`}>
                        <label htmlFor="excerpt">خلاصه (Excerpt)</label>
                        <textarea
                            id="excerpt"
                            className={styles.textarea}
                            style={{ minHeight: '80px' }}
                            value={excerpt}
                            onChange={(e) => setExcerpt(e.target.value)}
                            placeholder="توضیح کوتاه در مورد مقاله..."
                        />
                    </div>

                    {/* Content (TinyMCE) */}
                    <div className={`${styles.field} ${styles['field--full']}`}>
                        <label>محتوای مقاله</label>
                        {isMounted ? (
                            <Editor
                                apiKey={process.env.NEXT_PUBLIC_TINYMCE_API_KEY || 'no-api-key'}
                                onInit={(_evt, editor) => editorRef.current = editor}
                                initialValue={initialData?.content || ''}
                                init={{
                                    height: 500,
                                    menubar: false,
                                    language: 'fa',
                                    directionality: 'rtl',
                                    plugins: [
                                        'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
                                        'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
                                        'insertdatetime', 'media', 'table', 'code', 'help', 'wordcount'
                                    ],
                                    toolbar: 'undo redo | blocks | ' +
                                        'bold italic forecolor | alignright aligncenter alignleft alignjustify | ' +
                                        'bullist numlist outdent indent | ' +
                                        'table link image media | code preview fullscreen | removeformat',
                                    content_style: 'body { font-family:tahoma,arial,sans-serif; font-size:14px; direction: rtl; text-align: right; }'
                                }}
                            />
                        ) : (
                            <div style={{ height: 500, backgroundColor: 'color-mix(in srgb, var(--color-primary) var(--op-05), transparent)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-primary)' }}>
                                در حال بارگذاری ویرایشگر...
                            </div>
                        )}
                    </div>

                    <h3 className={styles.sectionTitle}>دسته‌بندی و برچسب‌ها</h3>

                    {/* Categories */}
                    <MultiSelect
                        label="دسته‌بندی‌ها (Categories)"
                        options={availableCategories}
                        selectedIds={selectedCategories}
                        onChange={setSelectedCategories}
                    />

                    {/* Tags */}
                    <MultiSelect
                        label="برچسب‌ها (Tags)"
                        options={availableTags}
                        selectedIds={selectedTags}
                        onChange={setSelectedTags}
                    />

                    <h3 className={styles.sectionTitle}>تصویر کاور</h3>

                    {/* Cover Image Upload */}
                    <div className={`${styles.field} ${styles['field--full']}`}>
                        <label className={styles.imageUploadZone}>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleFileUpload}
                                disabled={uploadingImage}
                            />
                            <span className={styles.uploadIcon}>
                                {uploadingImage ? '⏳' : '📥'}
                            </span>
                            <p>
                                {uploadingImage
                                    ? 'در حال آپلود، کمی صبر کنید...'
                                    : 'برای آپلود تصویر کاور جدید (یا تغییر) کلیک کنید یا فایل را بکشید.'}
                            </p>
                        </label>

                        {/* Cover image preview */}
                        {cover && (
                            <div className={styles.imagePreviewGrid}>
                                <div className={styles.imagePreviewItem} style={{ width: '160px', height: '100px' }}>
                                    <img
                                        src={cover.url ? (cover.url.startsWith('http') ? cover.url : `${STRAPI_URL}${cover.url}`) : ''}
                                        alt="Cover preview"
                                    />
                                    <button
                                        type="button"
                                        className={styles.imagePreviewItem__remove}
                                        onClick={() => setCover(null)}
                                        title="حذف تصویر"
                                    >
                                        ×
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                </div>

                {/* ── Actions ───────────────────────────────────────────────── */}
                <div className={styles.formActions}>
                    <button
                        type="button"
                        className={`${styles.btnPrimary} ${styles['btnPrimary--publish']}`}
                        disabled={isSaving}
                        onClick={(e) => handleSubmit(e, false)}
                    >
                        {isSaving ? <span className={styles.spinner} /> : '💾 ذخیره و انتشار'}
                    </button>

                    <button
                        type="button"
                        className={`${styles.btnPrimary} ${styles['btnPrimary--draft']}`}
                        disabled={isSaving}
                        onClick={(e) => handleSubmit(e, true)}
                    >
                        📝 ذخیره به عنوان پیش‌نویس
                    </button>

                    <button
                        type="button"
                        className={`${styles.btnPrimary} ${styles['btnPrimary--danger']}`}
                        onClick={() => router.back()}
                    >
                        انصراف و بازگشت
                    </button>
                </div>
            </form>

            {/* ── Toasts ──────────────────────────────────────────────────────── */}
            <div className={styles.toastContainer} aria-live="polite">
                {toasts.map((t) => (
                    <div key={t.id} className={`${styles.toast} ${styles[`toast--${t.type}`]}`}>
                        <span className={styles.toastIcon}>{TOAST_ICONS[t.type]}</span>
                        {t.message}
                    </div>
                ))}
            </div>
        </>
    );
}
