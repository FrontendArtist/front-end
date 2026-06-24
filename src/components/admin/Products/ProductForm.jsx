'use client';

/**
 * @file src/components/admin/Products/ProductForm.jsx
 * @description فرم ایجاد / ویرایش محصول – Client Component
 *
 * ✅ ویژگی‌ها:
 *   - آپلود چند تصویر با پیش‌نمایش و امکان حذف هر تصویر
 *   - مالتی‌سلکت برای categories و tags
 *   - دو دکمه جداگانه: "ذخیره پیش‌نویس" و "انتشار"
 *   - پیش‌پر شدن فرم در حالت ویرایش
 *   - اعلان Toast
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import styles from './Products.module.scss';

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_API_URL || 'http://127.0.0.1:1337';

// ─────────────────────────────────────────────────────────────────────────────
// Toast hook
// ─────────────────────────────────────────────────────────────────────────────

function useToast() {
    const [toasts, setToasts] = useState([]);
    const addToast = useCallback((message, type = 'success') => {
        const id = Date.now();
        setToasts((prev) => [...prev, { id, message, type }]);
        setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
    }, []);
    return { toasts, addToast };
}

const TOAST_ICONS = { success: '✅', error: '❌', info: 'ℹ️' };

// ─────────────────────────────────────────────────────────────────────────────
// MultiSelect sub-component
// ─────────────────────────────────────────────────────────────────────────────

function MultiSelect({ options, selected, onChange, placeholder }) {
    const toggle = (item) => {
        const exists = selected.find((s) => s.documentId === item.documentId);
        if (exists) {
            onChange(selected.filter((s) => s.documentId !== item.documentId));
        } else {
            onChange([...selected, item]);
        }
    };

    const remove = (documentId) => {
        onChange(selected.filter((s) => s.documentId !== documentId));
    };

    const isSelected = (item) => selected.some((s) => s.documentId === item.documentId);

    return (
        <div>
            {/* Selected tags */}
            {selected.length > 0 && (
                <div className={styles.multiSelect__list}>
                    {selected.map((item) => (
                        <span key={item.documentId} className={styles.multiSelect__tag}>
                            {item.name || item.title}
                            <button type="button" onClick={() => remove(item.documentId)} aria-label="حذف">
                                ×
                            </button>
                        </span>
                    ))}
                </div>
            )}

            {/* Options */}
            {options.length > 0 ? (
                <div className={styles.multiSelect__options} style={{ marginTop: selected.length ? '0.5rem' : 0 }}>
                    {options.map((item) => (
                        <button
                            key={item.documentId}
                            type="button"
                            className={`${styles.multiSelect__option} ${isSelected(item) ? styles['multiSelect__option--selected'] : ''}`}
                            onClick={() => toggle(item)}
                        >
                            {isSelected(item) ? '✓ ' : ''}{item.name || item.title}
                        </button>
                    ))}
                </div>
            ) : (
                <p className={styles.hint}>{placeholder || 'داده‌ای برای انتخاب وجود ندارد.'}</p>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// ProductForm
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {{ product?: object, categories?: object[], tags?: object[] }} props
 *  - product: اگر وجود داشته باشد، فرم در حالت ویرایش است.
 *  - categories: لیست دسته‌بندی‌ها از Strapi
 *  - tags: لیست تگ‌ها از Strapi
 */
export default function ProductForm({ product = null, categories = [], tags = [] }) {
    const router = useRouter();
    const { toasts, addToast } = useToast();
    const fileInputRef = useRef(null);
    const isEdit = !!product;

    // ── Form fields state ────────────────────────────────────────────────────
    const [title, setTitle] = useState(product?.title || '');
    const [slug, setSlug] = useState(product?.slug || '');
    const [price, setPrice] = useState(product?.price ?? '');
    const [stock, setStock] = useState(product?.stock ?? '');
    const [isAvailable, setIsAvailable] = useState(product?.isAvailable ?? true);
    const [description, setDescription] = useState(() => {
        // Strapi Blocks field is an array of block objects.
        // Extract all text from all paragraphs so the textarea is fully pre-filled.
        if (Array.isArray(product?.description)) {
            return product.description
                .map((block) =>
                    (block.children || [])
                        .map((child) => child.text || '')
                        .join('')
                )
                .filter(Boolean)
                .join('\n');
        }
        return product?.description || '';
    });
    const [selectedCategories, setSelectedCategories] = useState(
        (product?.categories || []).map((c) => ({
            documentId: c.documentId || String(c.id),
            name: c.name || c.title,
        }))
    );
    const [selectedTags, setSelectedTags] = useState(
        (product?.tags || []).map((t) => ({
            documentId: t.documentId || String(t.id),
            name: t.name || t.title,
        }))
    );

    // ── Images state ──────────────────────────────────────────────────────────
    // existingImages: already saved in Strapi (have a documentId / url)
    // newFiles: File objects selected by user (not yet uploaded)
    const [existingImages, setExistingImages] = useState(
        (product?.images || []).map((img) => ({
            id: img.id,
            documentId: img.documentId,
            url: img.url?.startsWith('http') ? img.url : `${STRAPI_URL}${img.url}`,
            name: img.name,
        }))
    );
    const [newFiles, setNewFiles] = useState([]); // { file, preview }[]
    const [isDragging, setIsDragging] = useState(false);

    // ── Loading state ─────────────────────────────────────────────────────────
    const [saving, setSaving] = useState(false);

    // ── Auto-slug from title (only in create mode) ───────────────────────────
    useEffect(() => {
        if (!isEdit && title) {
            const generated = title
                .trim()
                .toLowerCase()
                .replace(/[\s_]+/g, '-')
                .replace(/[^a-z0-9\u0600-\u06FF-]/g, '')
                .replace(/-+/g, '-');
            setSlug(generated);
        }
    }, [title, isEdit]);

    // ── File handling ─────────────────────────────────────────────────────────
    const addFiles = useCallback((files) => {
        const validFiles = Array.from(files).filter((f) =>
            f.type.startsWith('image/')
        );
        validFiles.forEach((file) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                setNewFiles((prev) => [...prev, { file, preview: e.target.result }]);
            };
            reader.readAsDataURL(file);
        });
    }, []);

    const handleFileChange = (e) => addFiles(e.target.files);

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        addFiles(e.dataTransfer.files);
    };

    const removeExistingImage = (documentId) => {
        setExistingImages((prev) => prev.filter((img) => img.documentId !== documentId));
    };

    const removeNewFile = (index) => {
        setNewFiles((prev) => prev.filter((_, i) => i !== index));
    };

    // ── Upload images to Strapi ───────────────────────────────────────────────
    async function uploadImages(files) {
        if (!files.length) return [];
        const formData = new FormData();
        files.forEach(({ file }) => formData.append('files', file));

        const res = await fetch('/api/media', {
            method: 'POST',
            body: formData,
        });

        if (!res.ok) throw new Error('آپلود تصاویر ناموفق بود');
        const data = await res.json();
        // Return array of ids
        return Array.isArray(data) ? data.map((f) => f.id) : [];
    }

    // ── Save / Publish ────────────────────────────────────────────────────────
    async function handleSubmit(publish) {
        if (!title.trim()) {
            addToast('عنوان محصول الزامی است', 'error');
            return;
        }
        if (!slug.trim()) {
            addToast('اسلاگ محصول الزامی است', 'error');
            return;
        }
        if (existingImages.length === 0 && newFiles.length === 0) {
            addToast('حداقل یک تصویر الزامی است', 'error');
            return;
        }

        setSaving(true);
        try {
            // 1. Upload new images
            let uploadedIds = [];
            if (newFiles.length > 0) {
                addToast('در حال آپلود تصاویر...', 'info');
                uploadedIds = await uploadImages(newFiles);
            }

            // 2. Combine image ids (existing + newly uploaded)
            const existingIds = existingImages.map((img) => img.id).filter(Boolean);
            const allImageIds = [...existingIds, ...uploadedIds];

            // 3. Build payload
            // ⚠️ Strapi Blocks field requires a specific array-of-objects format.
            // Sending a plain string is silently ignored by Strapi – always convert.
            const descriptionBlocks = description.trim()
                ? description
                    .split('\n')
                    .filter((line) => line.trim() !== '')
                    .map((line) => ({
                        type: 'paragraph',
                        children: [{ type: 'text', text: line }],
                    }))
                : [];

            const payload = {
                title: title.trim(),
                slug: slug.trim(),
                price: price !== '' ? Number(price) : null,
                stock: stock !== '' ? Number(stock) : null,
                isAvailable,
                description: descriptionBlocks,
                images: allImageIds,
                categories: selectedCategories.map((c) => c.documentId),
                tags: selectedTags.map((t) => t.documentId),
                publishedAt: publish ? new Date().toISOString() : null,
            };

            // 4. Send to API route
            const method = isEdit ? 'PUT' : 'POST';
            const endpoint = isEdit
                ? `/api/admin/products/${product.documentId}`
                : '/api/admin/products';

            const res = await fetch(endpoint, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err?.error || 'ذخیره‌سازی ناموفق بود');
            }

            addToast(
                publish
                    ? `محصول با موفقیت ${isEdit ? 'بروز شد و' : ''} منتشر شد`
                    : `پیش‌نویس با موفقیت ${isEdit ? 'بروز شد' : 'ذخیره شد'}`,
                'success'
            );

            // ⚡ router.refresh() پیش از push باعث می‌شود Next.js Router Cache پاک شود
            // و صفحه لیست محصولات داده جدید را از سرور بخواند (نه نسخه کش‌شده)
            router.refresh();
            setTimeout(() => router.push('/admin/products'), 1500);
        } catch (err) {
            addToast(err.message || 'خطای ناشناخته', 'error');
        } finally {
            setSaving(false);
        }
    }

    // ── Delete (edit mode) ────────────────────────────────────────────────────
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [deleting, setDeleting] = useState(false);

    async function handleDelete() {
        setDeleting(true);
        try {
            const res = await fetch(`/api/admin/products/${product.documentId}`, {
                method: 'DELETE',
            });
            if (!res.ok) throw new Error('حذف ناموفق بود');
            addToast('محصول حذف شد', 'success');
            setTimeout(() => router.push('/admin/products'), 1500);
        } catch (err) {
            addToast(err.message, 'error');
            setDeleting(false);
            setConfirmDelete(false);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Render
    // ─────────────────────────────────────────────────────────────────────────

    return (
        <>
            <div className={styles.formWrapper}>
                <form onSubmit={(e) => e.preventDefault()} noValidate>
                    <div className={styles.formGrid}>

                        {/* ── عنوان ─────────────────────────────────────── */}
                        <div className={styles.field}>
                            <label htmlFor="pf-title">
                                عنوان محصول <span className={styles.required}>*</span>
                            </label>
                            <input
                                id="pf-title"
                                type="text"
                                className={styles.input}
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="مثال: قهوه اسپرسو ممتاز"
                                disabled={saving}
                                required
                            />
                        </div>

                        {/* ── اسلاگ ────────────────────────────────────── */}
                        <div className={styles.field}>
                            <label htmlFor="pf-slug">
                                اسلاگ (Slug) <span className={styles.required}>*</span>
                            </label>
                            <input
                                id="pf-slug"
                                type="text"
                                className={styles.input}
                                value={slug}
                                onChange={(e) => setSlug(e.target.value)}
                                placeholder="product-slug"
                                dir="ltr"
                                disabled={saving}
                            />
                            <span className={styles.hint}>
                                اسلاگ منحصربه‌فرد و به حروف لاتین یا فارسی کوچک.
                            </span>
                        </div>

                        {/* ── قیمت ─────────────────────────────────────── */}
                        <div className={styles.field}>
                            <label htmlFor="pf-price">قیمت (تومان)</label>
                            <input
                                id="pf-price"
                                type="number"
                                min="0"
                                className={styles.input}
                                value={price}
                                onChange={(e) => setPrice(e.target.value)}
                                placeholder="0"
                                dir="ltr"
                                disabled={saving}
                            />
                        </div>

                        {/* ── موجودی ───────────────────────────────────── */}
                        <div className={styles.field}>
                            <label htmlFor="pf-stock">موجودی (عدد)</label>
                            <input
                                id="pf-stock"
                                type="number"
                                min="0"
                                className={styles.input}
                                value={stock}
                                onChange={(e) => setStock(e.target.value)}
                                placeholder="0"
                                dir="ltr"
                                disabled={saving}
                            />
                        </div>

                        {/* ── توضیحات ──────────────────────────────────── */}
                        <div className={`${styles.field} ${styles['field--full']}`}>
                            <label htmlFor="pf-description">توضیحات</label>
                            <textarea
                                id="pf-description"
                                className={styles.textarea}
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="توضیحات محصول را وارد کنید..."
                                disabled={saving}
                                rows={5}
                            />
                        </div>

                        {/* ── در دسترس بودن ────────────────────────────── */}
                        <div className={`${styles.field} ${styles['field--full']}`}>
                            <label>دسترس‌پذیری</label>
                            {/* ⚠️ فقط label/checkbox تاگل را کنترل می‌کند.
                                div والد نباید onClick داشته باشد — باعث double-toggle می‌شود */}
                            <label
                                htmlFor="pf-available"
                                className={styles.toggleRow}
                                style={{ cursor: saving ? 'not-allowed' : 'pointer' }}
                            >
                                <input
                                    type="checkbox"
                                    className={styles.toggleInput}
                                    id="pf-available"
                                    checked={isAvailable}
                                    onChange={(e) => !saving && setIsAvailable(e.target.checked)}
                                    disabled={saving}
                                />
                                <span className={styles.toggleTrack} />
                                <span>{isAvailable ? '✅ محصول در دسترس است' : '❌ محصول موجود نیست'}</span>
                            </label>
                        </div>


                        {/* ── آپلود تصاویر ─────────────────────────────── */}
                        <div className={`${styles.field} ${styles['field--full']}`}>
                            <label>
                                تصاویر محصول <span className={styles.required}>*</span>
                            </label>

                            {/* Drop zone */}
                            <div
                                className={`${styles.imageUploadZone} ${isDragging ? styles['imageUploadZone--drag'] : ''}`}
                                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                onDragLeave={() => setIsDragging(false)}
                                onDrop={handleDrop}
                                onClick={() => !saving && fileInputRef.current?.click()}
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={handleFileChange}
                                    disabled={saving}
                                />
                                <span className={styles.uploadIcon}>🖼️</span>
                                <p>برای آپلود کلیک کنید یا فایل را اینجا رها کنید</p>
                                <p style={{ fontSize: '0.75rem', opacity: 0.6 }}>
                                    فرمت‌های پشتیبانی‌شده: JPG, PNG, WebP
                                </p>
                            </div>

                            {/* Preview grid */}
                            {(existingImages.length > 0 || newFiles.length > 0) && (
                                <div className={styles.imagePreviewGrid}>
                                    {/* Existing images */}
                                    {existingImages.map((img) => (
                                        <div key={img.documentId} className={styles.imagePreviewItem}>
                                            <img src={img.url} alt={img.name} />
                                            <button
                                                type="button"
                                                className={styles.imagePreviewItem__remove}
                                                onClick={() => removeExistingImage(img.documentId)}
                                                title="حذف تصویر"
                                                disabled={saving}
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}

                                    {/* New (not yet uploaded) images */}
                                    {newFiles.map((nf, idx) => (
                                        <div key={idx} className={styles.imagePreviewItem}>
                                            <img src={nf.preview} alt={nf.file.name} />
                                            <button
                                                type="button"
                                                className={styles.imagePreviewItem__remove}
                                                onClick={() => removeNewFile(idx)}
                                                title="حذف تصویر"
                                                disabled={saving}
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <span className={styles.hint}>
                                تصویر اول به عنوان تصویر اصلی محصول نمایش داده می‌شود.
                            </span>
                        </div>

                        {/* ── دسته‌بندی‌ها ──────────────────────────────── */}
                        <div className={`${styles.field} ${styles['field--full']}`}>
                            <label>دسته‌بندی‌ها</label>
                            <MultiSelect
                                options={categories.map((c) => ({
                                    documentId: c.documentId || String(c.id),
                                    name: c.name || c.title,
                                }))}
                                selected={selectedCategories}
                                onChange={setSelectedCategories}
                                placeholder="هیچ دسته‌بندی‌ای وجود ندارد."
                            />
                        </div>

                        {/* ── تگ‌ها ────────────────────────────────────── */}
                        <div className={`${styles.field} ${styles['field--full']}`}>
                            <label>تگ‌ها</label>
                            <MultiSelect
                                options={tags.map((t) => ({
                                    documentId: t.documentId || String(t.id),
                                    name: t.name || t.title,
                                }))}
                                selected={selectedTags}
                                onChange={setSelectedTags}
                                placeholder="هیچ تگی وجود ندارد."
                            />
                        </div>

                    </div>

                    {/* ── دکمه‌های عملیات ─────────────────────────────── */}
                    <div className={styles.formActions}>
                        {/* حذف – فقط در حالت ویرایش */}
                        {isEdit && (
                            <button
                                type="button"
                                className={`${styles.btnPrimary} ${styles['btnPrimary--danger']}`}
                                onClick={() => setConfirmDelete(true)}
                                disabled={saving || deleting}
                            >
                                🗑 حذف محصول
                            </button>
                        )}

                        {/* ذخیره پیش‌نویس */}
                        <button
                            type="button"
                            className={`${styles.btnPrimary} ${styles['btnPrimary--draft']}`}
                            onClick={() => handleSubmit(false)}
                            disabled={saving}
                        >
                            {saving ? (
                                <>
                                    <span className={styles.spinner} />
                                    در حال ذخیره...
                                </>
                            ) : (
                                '💾 ذخیره پیش‌نویس'
                            )}
                        </button>

                        {/* انتشار */}
                        <button
                            type="button"
                            className={`${styles.btnPrimary} ${styles['btnPrimary--publish']}`}
                            onClick={() => handleSubmit(true)}
                            disabled={saving}
                        >
                            {saving ? (
                                <>
                                    <span className={styles.spinner} />
                                    در حال انتشار...
                                </>
                            ) : (
                                '🚀 انتشار'
                            )}
                        </button>
                    </div>
                </form>
            </div>

            {/* ─── Delete Confirmation ───────────────────────────────────── */}
            {confirmDelete && (
                <div className={styles.confirmOverlay} onClick={() => !deleting && setConfirmDelete(false)}>
                    <div className={styles.confirmBox} onClick={(e) => e.stopPropagation()}>
                        <h3>حذف محصول</h3>
                        <p>
                            آیا از حذف <strong>«{product?.title}»</strong> اطمینان دارید؟
                            این عمل برگشت‌ناپذیر است.
                        </p>
                        <div className={styles.confirmBox__buttons}>
                            <button
                                className={styles.confirmBox__cancel}
                                onClick={() => setConfirmDelete(false)}
                                disabled={deleting}
                            >
                                انصراف
                            </button>
                            <button
                                className={styles.confirmBox__confirm}
                                onClick={handleDelete}
                                disabled={deleting}
                            >
                                {deleting ? 'در حال حذف...' : 'بله، حذف کن'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Toast Notifications ──────────────────────────────────── */}
            <div className={styles.toastContainer} aria-live="polite">
                {toasts.map((t) => (
                    <div
                        key={t.id}
                        className={`${styles.toast} ${styles[`toast--${t.type}`]}`}
                        role="alert"
                    >
                        <span className={styles.toastIcon}>{TOAST_ICONS[t.type]}</span>
                        {t.message}
                    </div>
                ))}
            </div>
        </>
    );
}
