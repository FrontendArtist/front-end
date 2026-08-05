'use client';

/**
 * @file src/components/admin/Courses/CourseForm.jsx
 * @description فرم ایجاد / ویرایش دوره – Client Component
 *
 * ✅ ویژگی‌ها:
 *   - تمام فیلدهای Course schema از Strapi
 *   - آپلود چند رسانه (media) با پیش‌نمایش
 *   - Chapters + nested Lessons (وقتی isChaptered=true)
 *   - Curriculum ساده (وقتی isChaptered=false)
 *   - TinyMCE برای فیلد content
 *   - دو دکمه: «ذخیره پیش‌نویس» و «انتشار»
 *   - Toast notifications
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Editor } from '@tinymce/tinymce-react';
import styles from './Courses.module.scss';

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_API_URL || 'http://127.0.0.1:1337';

// ── Toast ──────────────────────────────────────────────────────────────────────
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

// ── Helpers ────────────────────────────────────────────────────────────────────
function emptyLesson() {
    return { _key: Date.now() + Math.random(), title: '', isFree: false, videoUrl: '', audioUrl: '', duration: '' };
}

function emptyChapter() {
    return {
        _key: Date.now() + Math.random(),
        title: '',
        price: '',
        duration: '',
        lessons: [emptyLesson()],
        _open: true,
    };
}

// ── LessonRow sub-component ────────────────────────────────────────────────────
function LessonRow({ lesson, onChange, onRemove, disabled }) {
    return (
        <div className={styles.lessonRow}>
            <input
                type="text"
                className={styles.input}
                value={lesson.title}
                onChange={(e) => onChange({ ...lesson, title: e.target.value })}
                placeholder="عنوان جلسه *"
                disabled={disabled}
            />
            <div className={styles.lessonToggleWrap}>
                <input
                    type="checkbox"
                    checked={lesson.isFree}
                    onChange={(e) => onChange({ ...lesson, isFree: e.target.checked })}
                    disabled={disabled}
                    id={`l-free-${lesson._key}`}
                />
                <label htmlFor={`l-free-${lesson._key}`}>رایگان</label>
            </div>
            <input
                type="text"
                className={styles.input}
                value={lesson.videoUrl}
                onChange={(e) => onChange({ ...lesson, videoUrl: e.target.value })}
                placeholder="🎬 لینک ویدیو"
                dir="ltr"
                disabled={disabled}
            />
            <input
                type="text"
                className={styles.input}
                value={lesson.audioUrl}
                onChange={(e) => onChange({ ...lesson, audioUrl: e.target.value })}
                placeholder="🎵 لینک صوت"
                dir="ltr"
                disabled={disabled}
            />
            <input
                type="text"
                className={styles.input}
                value={lesson.duration}
                onChange={(e) => onChange({ ...lesson, duration: e.target.value })}
                placeholder="مدت زمان"
                disabled={disabled}
            />

            <button
                type="button"
                className={styles.btnRemoveLesson}
                onClick={onRemove}
                disabled={disabled}
            >
                🗑 حذف
            </button>
        </div>
    );
}

// ── ChapterCard sub-component ──────────────────────────────────────────────────
function ChapterCard({ chapter, index, onChange, onRemove, disabled }) {
    const [open, setOpen] = useState(chapter._open !== false);

    const updateLesson = (lessonIdx, updated) => {
        const newLessons = chapter.lessons.map((l, i) => (i === lessonIdx ? updated : l));
        onChange({ ...chapter, lessons: newLessons });
    };

    const removeLesson = (lessonIdx) => {
        onChange({ ...chapter, lessons: chapter.lessons.filter((_, i) => i !== lessonIdx) });
    };

    const addLesson = () => {
        onChange({ ...chapter, lessons: [...chapter.lessons, emptyLesson()] });
    };

    return (
        <div className={styles.chapterCard}>
            {/* Header */}
            <div className={styles.chapterHeader} onClick={() => setOpen((o) => !o)}>
                <span className={`${styles.chapterHeader__toggle} ${open ? styles['chapterHeader__toggle--open'] : ''}`}>
                    ▶
                </span>
                <span className={styles.chapterHeader__title}>
                    فصل {index + 1}: {chapter.title || '(بدون عنوان)'}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-primary)', opacity: 0.6, marginLeft: '0.5rem' }}>
                    {chapter.lessons?.length || 0} جلسه
                </span>
                <button
                    type="button"
                    className={styles.chapterHeader__remove}
                    onClick={(e) => { e.stopPropagation(); onRemove(); }}
                    disabled={disabled}
                >
                    حذف فصل
                </button>
            </div>

            {/* Body */}
            {open && (
                <div className={styles.chapterBody}>
                    {/* Chapter meta */}
                    <div className={styles.chapterMeta}>
                        <div className={styles.field}>
                            <label>عنوان فصل <span className={styles.required}>*</span></label>
                            <input
                                type="text"
                                className={styles.input}
                                value={chapter.title}
                                onChange={(e) => onChange({ ...chapter, title: e.target.value })}
                                placeholder="مثال: مقدمات React"
                                disabled={disabled}
                            />
                        </div>
                        <div className={styles.field}>
                            <label>قیمت فصل (تومان)</label>
                            <input
                                type="number"
                                min="0"
                                className={styles.input}
                                value={chapter.price ?? ''}
                                onChange={(e) => onChange({ ...chapter, price: e.target.value })}
                                placeholder="0"
                                dir="ltr"
                                disabled={disabled}
                            />
                        </div>
                        <div className={styles.field}>
                            <label>مدت زمان فصل</label>
                            <input
                                type="text"
                                className={styles.input}
                                value={chapter.duration}
                                onChange={(e) => onChange({ ...chapter, duration: e.target.value })}
                                placeholder="مثال: ۳ ساعت"
                                disabled={disabled}
                            />
                        </div>
                    </div>

                    {/* Lessons */}
                    <div className={styles.lessonsList}>
                        <p className={styles.lessonsTitle}>
                            جلسات فصل <span>({chapter.lessons?.length || 0} جلسه)</span>
                        </p>
                        {chapter.lessons?.length === 0 && (
                            <p style={{ fontSize: 'var(--font-sm)', color: 'var(--color-text-primary)', opacity: 0.6, margin: 0 }}>
                                هنوز جلسه‌ای اضافه نشده.
                            </p>
                        )}
                        {chapter.lessons?.map((lesson, lIdx) => (
                            <LessonRow
                                key={lesson._key ?? lIdx}
                                lesson={lesson}
                                onChange={(updated) => updateLesson(lIdx, updated)}
                                onRemove={() => removeLesson(lIdx)}
                                disabled={disabled}
                            />
                        ))}
                        <button
                            type="button"
                            className={styles.btnAddLesson}
                            onClick={addLesson}
                            disabled={disabled}
                        >
                            + افزودن جلسه
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── CourseForm ─────────────────────────────────────────────────────────────────
export default function CourseForm({ course = null }) {
    const router = useRouter();
    const { toasts, addToast } = useToast();
    const fileInputRef = useRef(null);
    const editorRef = useRef(null);
    const isEdit = !!course;

    const [isMounted, setIsMounted] = useState(false);
    useEffect(() => { setIsMounted(true); }, []);

    // ── Field state ──────────────────────────────────────────────────────────
    const [title, setTitle] = useState(course?.title || '');
    const [slug, setSlug] = useState(course?.slug || '');
    const [price, setPrice] = useState(course?.price ?? '');
    const [isFree, setIsFree] = useState(course?.isFree ?? false);
    const [isChaptered, setIsChaptered] = useState(course?.isChaptered ?? false);
    const [publishedAt, setPublishedAt] = useState(course?.publishedAt || null);
    const isPublished = !!publishedAt;
    const [teaserUrl, setTeaserUrl] = useState(course?.teaserUrl || '');
    const [description, setDescription] = useState(() => {
        // Strapi Blocks → extract text
        if (Array.isArray(course?.description)) {
            return course.description
                .map((block) => (block.children || []).map((c) => c.text || '').join(''))
                .filter(Boolean)
                .join('\n');
        }
        return course?.description || '';
    });
    const [content, setContent] = useState(course?.content || '');

    // Chapters
    const [chapters, setChapters] = useState(() =>
        (course?.chapters || []).map((ch) => ({
            ...ch,
            _key: ch.id ?? Date.now() + Math.random(),
            _open: false,
            price: ch.price ?? '',
            lessons: (ch.lessons || []).map((l) => ({
                ...l,
                _key: l.id ?? Date.now() + Math.random(),
            })),
        }))
    );

    // Curriculum (simple lessons without chapters)
    const [curriculum, setCurriculum] = useState(() =>
        (course?.curriculum || []).map((l) => ({
            ...l,
            _key: l.id ?? Date.now() + Math.random(),
        }))
    );

    // Media
    const [existingMedia, setExistingMedia] = useState(
        (course?.media || []).map((m) => ({
            id: m.id,
            documentId: m.documentId,
            url: m.url?.startsWith('http') ? m.url : `${STRAPI_URL}${m.url}`,
            name: m.name,
        }))
    );
    const [newFiles, setNewFiles] = useState([]);
    const [isDragging, setIsDragging] = useState(false);

    const [saving, setSaving] = useState(false);

    // ── Auto-slug ────────────────────────────────────────────────────────────
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
        const validFiles = Array.from(files).filter((f) => f.type.startsWith('image/') || f.type.startsWith('video/'));
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

    // ── Upload media ──────────────────────────────────────────────────────────
    async function uploadMedia(files) {
        if (!files.length) return [];
        const formData = new FormData();
        files.forEach(({ file }) => formData.append('files', file));
        const res = await fetch('/api/media', { method: 'POST', body: formData });
        if (!res.ok) throw new Error('آپلود رسانه ناموفق بود');
        const data = await res.json();
        return Array.isArray(data) ? data.map((f) => f.id) : [];
    }

    // ── Chapter helpers ───────────────────────────────────────────────────────
    const addChapter = () => setChapters((prev) => [...prev, emptyChapter()]);

    const updateChapter = (idx, updated) =>
        setChapters((prev) => prev.map((ch, i) => (i === idx ? updated : ch)));

    const removeChapter = (idx) =>
        setChapters((prev) => prev.filter((_, i) => i !== idx));

    // ── Curriculum helpers ────────────────────────────────────────────────────
    const addCurriculumLesson = () =>
        setCurriculum((prev) => [...prev, emptyLesson()]);

    const updateCurriculumLesson = (idx, updated) =>
        setCurriculum((prev) => prev.map((l, i) => (i === idx ? updated : l)));

    const removeCurriculumLesson = (idx) =>
        setCurriculum((prev) => prev.filter((_, i) => i !== idx));

    // ── Build clean payload ───────────────────────────────────────────────────
    function buildPayload(publish) {
        const currentContent = editorRef.current ? editorRef.current.getContent() : content;

        // description → Strapi Blocks format
        const descriptionBlocks = description.trim()
            ? description
                .split('\n')
                .filter((line) => line.trim() !== '')
                .map((line) => ({ type: 'paragraph', children: [{ type: 'text', text: line }] }))
            : [];

        // Clean chapters
        const cleanChapters = chapters
            .filter((ch) => ch.title?.trim())
            .map((ch) => ({
                title: ch.title.trim(),
                price: ch.price !== '' && ch.price != null ? Number(ch.price) : null,
                duration: ch.duration || null,
                lessons: (ch.lessons || [])
                    .filter((l) => l.title?.trim())
                    .map((l) => ({
                        title: l.title.trim(),
                        isFree: !!l.isFree,
                        videoUrl: l.videoUrl || null,
                        audioUrl: l.audioUrl || null,
                        duration: l.duration || null,
                    })),
            }));

        // Clean curriculum
        const cleanCurriculum = curriculum
            .filter((l) => l.title?.trim())
            .map((l) => ({
                title: l.title.trim(),
                isFree: !!l.isFree,
                videoUrl: l.videoUrl || null,
                audioUrl: l.audioUrl || null,
                duration: l.duration || null,
            }));

        return {
            title: title.trim(),
            slug: slug.trim(),
            description: descriptionBlocks,
            price: price !== '' ? Number(price) : null,
            isFree,
            isChaptered,
            teaserUrl: teaserUrl.trim() || null,
            content: currentContent.trim() || null,
            chapters: isChaptered ? cleanChapters : [],
            curriculum: !isChaptered ? cleanCurriculum : [],
            publishedAt: publish ? (publishedAt || new Date().toISOString()) : null,
        };
    }

    // ── Submit ────────────────────────────────────────────────────────────────
    async function handleSubmit(publish) {
        if (!title.trim()) { addToast('عنوان دوره الزامی است', 'error'); return; }
        if (!slug.trim()) { addToast('اسلاگ دوره الزامی است', 'error'); return; }

        setSaving(true);
        try {
            // Upload new media
            let uploadedIds = [];
            if (newFiles.length > 0) {
                addToast('در حال آپلود رسانه...', 'info');
                uploadedIds = await uploadMedia(newFiles);
            }

            const existingIds = existingMedia.map((m) => m.id).filter(Boolean);
            const allMediaIds = [...existingIds, ...uploadedIds];

            const payload = { ...buildPayload(publish), media: allMediaIds };

            const method = isEdit ? 'PUT' : 'POST';
            const endpoint = isEdit
                ? `/api/admin/courses/${course.documentId}`
                : '/api/admin/courses';

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
                    ? `دوره با موفقیت ${isEdit ? 'بروزرسانی و' : ''} منتشر شد`
                    : `پیش‌نویس با موفقیت ${isEdit ? 'بروزرسانی شد' : 'ذخیره شد'}`,
                'success'
            );

            router.refresh();
            setTimeout(() => router.push('/admin/courses'), 1500);
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
            const res = await fetch(`/api/admin/courses/${course.documentId}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('حذف ناموفق بود');
            addToast('دوره حذف شد', 'success');
            setTimeout(() => router.push('/admin/courses'), 1500);
        } catch (err) {
            addToast(err.message, 'error');
            setDeleting(false);
            setConfirmDelete(false);
        }
    }

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <>
            <div className={styles.formWrapper}>
                <form onSubmit={(e) => e.preventDefault()} noValidate>
                    <div className={styles.formGrid}>

                        {/* ── عنوان ─────────────────────────────────────── */}
                        <div className={styles.field}>
                            <label htmlFor="cf-title">
                                عنوان دوره <span className={styles.required}>*</span>
                            </label>
                            <input
                                id="cf-title"
                                type="text"
                                className={styles.input}
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="مثال: دوره کامل React"
                                disabled={saving}
                                required
                            />
                        </div>

                        {/* ── اسلاگ ────────────────────────────────────── */}
                        <div className={styles.field}>
                            <label htmlFor="cf-slug">
                                اسلاگ (Slug) <span className={styles.required}>*</span>
                            </label>
                            <input
                                id="cf-slug"
                                type="text"
                                className={styles.input}
                                value={slug}
                                onChange={(e) => setSlug(e.target.value)}
                                placeholder="course-slug"
                                dir="ltr"
                                disabled={saving}
                            />
                            <span className={styles.hint}>اسلاگ منحصربه‌فرد و به حروف لاتین یا فارسی کوچک.</span>
                        </div>

                        {/* ── قیمت ─────────────────────────────────────── */}
                        <div className={styles.field}>
                            <label htmlFor="cf-price">
                                قیمت (تومان) <span className={styles.required}>*</span>
                            </label>
                            <input
                                id="cf-price"
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

                        {/* ── لینک تیزر ───────────────────────────────── */}
                        <div className={styles.field}>
                            <label htmlFor="cf-teaser">لینک ویدیو تیزر</label>
                            <input
                                id="cf-teaser"
                                type="text"
                                className={styles.input}
                                value={teaserUrl}
                                onChange={(e) => setTeaserUrl(e.target.value)}
                                placeholder="https://..."
                                dir="ltr"
                                disabled={saving}
                            />
                        </div>

                        {/* ── رایگان / فصل‌بندی ────────────────────────── */}
                        <div className={styles.field}>
                            <label>تنظیمات دوره</label>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                <div className={styles.toggleRow}>
                                    <label className={styles.toggleLabel} htmlFor="cf-isFree">
                                        <input
                                            id="cf-isFree"
                                            type="checkbox"
                                            className={styles.toggleInput}
                                            checked={isFree}
                                            onChange={(e) => setIsFree(e.target.checked)}
                                            disabled={saving}
                                        />
                                        <span className={styles.toggleTrack} />
                                    </label>
                                    <span>دوره رایگان است</span>
                                </div>
                                <div className={styles.toggleRow}>
                                    <label className={styles.toggleLabel} htmlFor="cf-isChaptered">
                                        <input
                                            id="cf-isChaptered"
                                            type="checkbox"
                                            className={styles.toggleInput}
                                            checked={isChaptered}
                                            onChange={(e) => setIsChaptered(e.target.checked)}
                                            disabled={saving}
                                        />
                                        <span className={styles.toggleTrack} />
                                    </label>
                                    <span>دوره فصل‌بندی دارد (Chaptered)</span>
                                </div>
                            </div>
                        </div>

                        {/* ── توضیحات کوتاه ────────────────────────────── */}
                        <div className={`${styles.field} ${styles['field--full']}`}>
                            <label htmlFor="cf-desc">توضیحات (Rich Text)</label>
                            <textarea
                                id="cf-desc"
                                className={styles.textarea}
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="توضیح کلی دوره برای نمایش در صفحه دوره..."
                                disabled={saving}
                                rows={3}
                            />
                            <span className={styles.hint}>متن ساده یا چند پاراگراف. هر خط به یک پاراگراف تبدیل می‌شود.</span>
                        </div>

                        {/* ── محتوا با TinyMCE ──────────────────────────── */}
                        <div className={`${styles.field} ${styles['field--full']}`}>
                            <label>محتوای کامل دوره (ویرایشگر بصری)</label>
                            {isMounted ? (
                                <Editor
                                    apiKey={process.env.NEXT_PUBLIC_TINYMCE_API_KEY || 'no-api-key'}
                                    onInit={(_evt, editor) => (editorRef.current = editor)}
                                    initialValue={course?.content || content || ''}
                                    init={{
                                        height: 480,
                                        menubar: false,
                                        language: 'fa',
                                        directionality: 'rtl',
                                        plugins: [
                                            'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
                                            'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
                                            'insertdatetime', 'media', 'table', 'help', 'wordcount',
                                        ],
                                        toolbar:
                                            'undo redo | blocks | ' +
                                            'bold italic forecolor | alignright aligncenter alignleft alignjustify | ' +
                                            'bullist numlist outdent indent | ' +
                                            'table link image media | code preview fullscreen | removeformat',
                                        content_style:
                                            'body { font-family:tahoma,arial,sans-serif; font-size:14px; direction: rtl; text-align: right; }',
                                    }}
                                />
                            ) : (
                                <div style={{ height: 480, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-primary)' }}>
                                    در حال بارگذاری ویرایشگر...
                                </div>
                            )}
                            <span className={styles.hint}>
                                محتوای کامل دوره، معرفی مدرس، پیش‌نیازها و هر اطلاعات تکمیلی دیگر.
                            </span>
                        </div>

                        {/* ── آپلود رسانه ──────────────────────────────── */}
                        <div className={`${styles.field} ${styles['field--full']}`}>
                            <label>رسانه دوره (تصویر / ویدیو)</label>

                            {/* Preview grid */}
                            {(existingMedia.length > 0 || newFiles.length > 0) && (
                                <div className={styles.imagePreviewGrid}>
                                    {existingMedia.map((m) => (
                                        <div key={m.documentId} className={styles.imagePreviewItem}>
                                            <img src={m.url} alt={m.name} />
                                            <button
                                                type="button"
                                                className={styles.imagePreviewItem__remove}
                                                onClick={() =>
                                                    setExistingMedia((prev) =>
                                                        prev.filter((x) => x.documentId !== m.documentId)
                                                    )
                                                }
                                                disabled={saving}
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}
                                    {newFiles.map((f, i) => (
                                        <div key={i} className={styles.imagePreviewItem}>
                                            <img src={f.preview} alt="new" />
                                            <button
                                                type="button"
                                                className={styles.imagePreviewItem__remove}
                                                onClick={() => setNewFiles((prev) => prev.filter((_, j) => j !== i))}
                                                disabled={saving}
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Drop zone */}
                            <div
                                className={`${styles.imageUploadZone} ${isDragging ? styles['imageUploadZone--drag'] : ''}`}
                                onClick={() => fileInputRef.current?.click()}
                                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                onDragLeave={() => setIsDragging(false)}
                                onDrop={handleDrop}
                                role="button"
                                tabIndex={0}
                                aria-label="آپلود رسانه"
                            >
                                <span className={styles.uploadIcon}>🖼️</span>
                                <p>برای آپلود کلیک کنید یا فایل را اینجا بکشید</p>
                                <p style={{ opacity: 0.55, fontSize: '0.72rem' }}>تصویر یا ویدیو</p>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    multiple
                                    accept="image/*,video/*"
                                    onChange={handleFileChange}
                                    disabled={saving}
                                />
                            </div>
                        </div>

                        {/* ══════════════════════════════════════════════════════
                         * Chapters (isChaptered = true)
                         * ══════════════════════════════════════════════════════ */}
                        {isChaptered && (
                            <>
                                <div className={styles.sectionTitle}>📚 فصل‌های دوره</div>

                                <div className={styles.repeatableList}>
                                    {chapters.length === 0 && (
                                        <p style={{ fontSize: 'var(--font-sm)', color: 'var(--color-text-primary)', opacity: 0.6, margin: 0 }}>
                                            هنوز فصلی اضافه نشده. با دکمه زیر اولین فصل را بسازید.
                                        </p>
                                    )}
                                    {chapters.map((ch, idx) => (
                                        <ChapterCard
                                            key={ch._key ?? idx}
                                            chapter={ch}
                                            index={idx}
                                            onChange={(updated) => updateChapter(idx, updated)}
                                            onRemove={() => removeChapter(idx)}
                                            disabled={saving}
                                        />
                                    ))}

                                    <button
                                        type="button"
                                        className={styles.btnAddChapter}
                                        onClick={addChapter}
                                        disabled={saving}
                                    >
                                        + افزودن فصل جدید
                                    </button>
                                </div>
                            </>
                        )}

                        {/* ══════════════════════════════════════════════════════
                         * Curriculum (isChaptered = false)
                         * ══════════════════════════════════════════════════════ */}
                        {!isChaptered && (
                            <>
                                <div className={styles.sectionTitle}>📋 سرفصل‌های دوره (Curriculum)</div>

                                <div className={styles.repeatableList}>
                                    {curriculum.length === 0 && (
                                        <p style={{ fontSize: 'var(--font-sm)', color: 'var(--color-text-primary)', opacity: 0.6, margin: 0 }}>
                                            هنوز سرفصلی اضافه نشده.
                                        </p>
                                    )}
                                    <div className={styles.lessonsList}>
                                        {curriculum.map((lesson, idx) => (
                                            <LessonRow
                                                key={lesson._key ?? idx}
                                                lesson={lesson}
                                                onChange={(updated) => updateCurriculumLesson(idx, updated)}
                                                onRemove={() => removeCurriculumLesson(idx)}
                                                disabled={saving}
                                            />
                                        ))}
                                    </div>
                                    <button
                                        type="button"
                                        className={styles.btnAddLesson}
                                        onClick={addCurriculumLesson}
                                        disabled={saving}
                                    >
                                        + افزودن سرفصل
                                    </button>
                                </div>
                            </>
                        )}

                    </div>

                    {/* ── Form Actions ──────────────────────────────────── */}
                    <div className={styles.formActions}>
                        {isEdit && (
                            <button
                                type="button"
                                className={`${styles.btnPrimary} ${styles['btnPrimary--danger']}`}
                                onClick={() => setConfirmDelete(true)}
                                disabled={saving || deleting}
                            >
                                🗑 حذف دوره
                            </button>
                        )}

                        <button
                            type="button"
                            className={`${styles.btnPrimary} ${styles['btnPrimary--draft']}`}
                            onClick={() => handleSubmit(false)}
                            disabled={saving}
                        >
                            {saving ? <span className={styles.spinner} /> : '💾'} ذخیره پیش‌نویس
                        </button>

                        <button
                            type="button"
                            className={`${styles.btnPrimary} ${styles['btnPrimary--publish']}`}
                            onClick={() => handleSubmit(true)}
                            disabled={saving}
                        >
                            {saving ? <span className={styles.spinner} /> : '🚀'} انتشار
                        </button>
                    </div>
                </form>
            </div>

            {/* ── Delete Confirm ────────────────────────────────────────── */}
            {confirmDelete && (
                <div className={styles.confirmOverlay} onClick={() => !deleting && setConfirmDelete(false)}>
                    <div className={styles.confirmBox} onClick={(e) => e.stopPropagation()}>
                        <h3>حذف دوره</h3>
                        <p>
                            آیا از حذف <strong>«{course?.title}»</strong> اطمینان دارید؟
                            این عمل غیرقابل بازگشت است.
                        </p>
                        <div className={styles.confirmBox__buttons}>
                            <button
                                type="button"
                                onClick={() => setConfirmDelete(false)}
                                disabled={deleting}
                                style={{ padding: '0.6rem 1.5rem', borderRadius: 8, border: '1px solid rgba(0,0,0,0.2)', background: 'transparent', color: 'var(--color-text-primary)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'var(--font-sm)' }}
                            >
                                انصراف
                            </button>
                            <button
                                type="button"
                                onClick={handleDelete}
                                disabled={deleting}
                                style={{ padding: '0.6rem 1.5rem', borderRadius: 8, border: 'none', background: 'var(--color-error)', color: '#fff', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'var(--font-sm)', fontWeight: 'bold' }}
                            >
                                {deleting ? 'در حال حذف...' : 'بله، حذف کن'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Toast ────────────────────────────────────────────────── */}
            <div className={styles.toastContainer} aria-live="polite">
                {toasts.map((t) => (
                    <div key={t.id} className={`${styles.toast} ${styles[`toast--${t.type}`]}`} role="alert">
                        <span className={styles.toastIcon}>{TOAST_ICONS[t.type]}</span>
                        {t.message}
                    </div>
                ))}
            </div>
        </>
    );
}
