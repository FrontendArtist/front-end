'use client';

/**
 * @file src/components/admin/TopBanner/TopBannerManager.jsx
 * @description کامپوننت پنل مدیریت نوار اعلان و تخفیف بالای هدر سایت
 */

import { useState, useRef } from 'react';
import { 
  Megaphone, 
  Sparkles, 
  Eye, 
  Save, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle, 
  Bold, 
  Tag, 
  Highlighter, 
  Palette,
  ArrowLeft,
  X
} from 'lucide-react';
import styles from './TopBannerManager.module.scss';
import bannerStyles from '@/components/layout/TopBanner/TopBanner.module.scss';

const THEMES = [
  { id: 'gold', label: 'طلایی سلطنتی (پیش‌فرض)', sample: 'linear-gradient(135deg, #78350f, #b45309, #d97706)' },
  { id: 'emerald', label: 'سبز زمردی معنوی', sample: 'linear-gradient(135deg, #022c22, #064e3b, #047857)' },
  { id: 'sunset', label: 'غروب بنفش و سرخابی', sample: 'linear-gradient(135deg, #4c0519, #831843, #c2410c)' },
  { id: 'purple', label: 'بنفش سلطنتی', sample: 'linear-gradient(135deg, #2e1065, #581c87, #7e22ce)' },
  { id: 'dark', label: 'تیره اقیانوسی لوکس', sample: 'linear-gradient(135deg, #091313, #0d2121, #153232)' },
];

export default function TopBannerManager({ initialBanner = null }) {
  const [isActive, setIsActive] = useState(Boolean(initialBanner?.isActive));
  const [text, setText] = useState(initialBanner?.text || '');
  const [buttonText, setButtonText] = useState(initialBanner?.buttonText || '');
  const [buttonLink, setButtonLink] = useState(initialBanner?.buttonLink || '');
  const [badgeText, setBadgeText] = useState(initialBanner?.badgeText || '');
  const [theme, setTheme] = useState(initialBanner?.theme || 'gold');
  const [canDismiss, setCanDismiss] = useState(initialBanner?.canDismiss !== false);

  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null); // { type: 'success'|'error', text: '' }

  const textareaRef = useRef(null);

  // درج تگ در موقعیت مکان‌نما یا دور متن انتخاب‌شده
  const insertTag = (prefix, suffix = '') => {
    const el = textareaRef.current;
    if (!el) return;

    const start = el.selectionStart;
    const end = el.selectionEnd;
    const currentVal = text;

    const selectedText = currentVal.substring(start, end);
    const replacement = prefix + (selectedText || 'متن') + suffix;

    const newText = currentVal.substring(0, start) + replacement + currentVal.substring(end);
    setText(newText);

    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + prefix.length, start + prefix.length + (selectedText || 'متن').length);
    }, 10);
  };

  // درج مستقیم ایموجی
  const insertEmoji = (emoji) => {
    const el = textareaRef.current;
    if (!el) return;

    const start = el.selectionStart;
    const end = el.selectionEnd;
    const currentVal = text;

    const newText = currentVal.substring(0, start) + emoji + currentVal.substring(end);
    setText(newText);

    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + emoji.length, start + emoji.length);
    }, 10);
  };

  // بازنشانی به داده تستی ۵۰٪ تخفیف
  const handleResetToTest = () => {
    setIsActive(true);
    setText('🔥 جشنواره ویژه! <strong>۵۰٪ تخفیف</strong> روی تمامی محصولات و دوره‌ها با کد: <span style="background: rgba(255,255,255,0.25); padding: 2px 8px; border-radius: 6px; font-weight: bold; border: 1px dashed #ffd166; letter-spacing: 1px;">OFF50</span>');
    setButtonText('مشاهده محصولات');
    setButtonLink('/products');
    setBadgeText('تخفیف شگفت‌انگیز');
    setTheme('gold');
    setCanDismiss(true);

    setToast({
      type: 'success',
      text: 'داده‌های تستی ۵۰٪ تخفیف در فرم بارگذاری شد. برای اعمال روی سایت دکمه ذخیره را بزنید.',
    });
  };

  // ذخیره تنظیمات
  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setToast(null);

    try {
      const res = await fetch('/api/admin/top-banner', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isActive,
          text,
          buttonText,
          buttonLink,
          badgeText,
          theme,
          canDismiss,
        }),
      });

      const json = await res.json();

      if (res.ok && json.success) {
        setToast({
          type: 'success',
          text: 'تنظیمات نوار اعلان با موفقیت ذخیره شد و روی سایت اعمال گردید.',
        });
      } else {
        setToast({
          type: 'error',
          text: json.error || 'خطا در ذخیره اطلاعات نوار اعلان.',
        });
      }
    } catch (err) {
      setToast({
        type: 'error',
        text: 'خطای ارتباط با سرور در هنگام ذخیره تنظیمات.',
      });
    } finally {
      setSaving(false);
    }
  };

  const previewThemeClass = bannerStyles[`theme_${theme}`] || bannerStyles.theme_gold;

  return (
    <div className={styles.manager}>
      {/* ── Header ── */}
      <header className={styles.header}>
        <div className={styles.titleArea}>
          <div className={styles.iconWrapper}>
            <Megaphone size={24} />
          </div>
          <div>
            <h1 className={styles.title}>مدیریت نوار اعلان و تخفیف بالای هدر</h1>
            <p className={styles.subtitle}>
              پیکربندی متن، کدهای تخفیف، استایل و دکمه نوار اعلان سراسری سایت
            </p>
          </div>
        </div>

        {/* Status Pill */}
        <div className={`${styles.statusPill} ${isActive ? styles.active : styles.inactive}`}>
          <span className={styles.dot} />
          <span>{isActive ? 'فعال و در حال نمایش' : 'غیرفعال (مخفی)'}</span>
        </div>
      </header>

      {/* ── Live Preview Card ── */}
      <section className={styles.previewCard}>
        <div className={styles.previewHeader}>
          <span>
            <Eye size={16} />
            پیش‌نمایش زنده در سایت
          </span>
          <small>{isActive ? 'نمایش در بالای هدر تمامی صفحات' : 'توجه: نوار در حال حاضر غیرفعال است'}</small>
        </div>

        <div className={styles.previewContainer}>
          <div className={`${bannerStyles.bannerWrapper} ${previewThemeClass}`}>
            <div className={bannerStyles.banner}>
              <div className={bannerStyles.container}>
                {badgeText && (
                  <span className={bannerStyles.badge}>
                    <Sparkles size={13} />
                    <span>{badgeText}</span>
                  </span>
                )}

                <div
                  className={bannerStyles.text}
                  dangerouslySetInnerHTML={{ __html: text || '<span style="opacity: 0.5;">متن اعلان خالی است...</span>' }}
                />

                {buttonText && (
                  <span className={bannerStyles.actionBtn}>
                    <span>{buttonText}</span>
                    <ArrowLeft size={14} />
                  </span>
                )}
              </div>

              {canDismiss && (
                <button type="button" className={bannerStyles.closeBtn} aria-label="بستن">
                  <X size={15} />
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Form ── */}
      <form onSubmit={handleSave}>
        {/* Card 1: وضعیت فعال‌سازی */}
        <div className={styles.card}>
          <div className={styles.switchRow}>
            <div className={styles.switchLabel}>
              <strong>وضعیت نمایش نوار در سایت</strong>
              <small>با روشن کردن این گزینه، نوار در بالای هدر تمام صفحات برای کاربران نمایش داده می‌شود.</small>
            </div>
            <label className={styles.toggle}>
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              <span className={styles.slider} />
            </label>
          </div>
        </div>

        {/* Card 2: متن اعلان و ابزارهای استایل‌دهی */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>
            <Tag size={18} />
            متن اعلان (پشتیبانی از تگ و استایل HTML)
          </h2>

          {/* Quick Insert Toolbar */}
          <div className={styles.toolbar}>
            <button
              type="button"
              className={styles.toolBtn}
              onClick={() => insertTag('<strong>', '</strong>')}
              title="متن ضخیم و پررنگ"
            >
              <Bold size={13} />
              بولد
            </button>

            <button
              type="button"
              className={styles.toolBtn}
              onClick={() => insertTag('<span style="background: rgba(255,255,255,0.25); padding: 2px 8px; border-radius: 6px; font-weight: bold; border: 1px dashed #ffd166; letter-spacing: 1px;">', '</span>')}
              title="کادر برجسته ویژه کد تخفیف"
            >
              <Tag size={13} />
              باکس کد تخفیف
            </button>

            <button
              type="button"
              className={styles.toolBtn}
              onClick={() => insertTag('<mark style="background: rgba(255,255,255,0.3); padding: 1px 6px; border-radius: 4px;">', '</mark>')}
              title="هایلایت متن"
            >
              <Highlighter size={13} />
              هایلایت
            </button>

            <div className={styles.toolDivider} />

            <button
              type="button"
              className={styles.toolBtn}
              onClick={() => insertTag('<span style="color: #ffd166;">', '</span>')}
              title="رنگ طلایی"
            >
              <Palette size={13} />
              طلایی
            </button>

            <button
              type="button"
              className={styles.toolBtn}
              onClick={() => insertTag('<span style="color: #6ee7b7;">', '</span>')}
              title="رنگ سبز زمردی"
            >
              سبز
            </button>

            <button
              type="button"
              className={styles.toolBtn}
              onClick={() => insertTag('<span style="color: #f472b6;">', '</span>')}
              title="رنگ صورتی"
            >
              صورتی
            </button>

            <div className={styles.toolDivider} />

            {/* Quick Emojis */}
            {['🔥', '🎁', '⚡', '⭐', '🏷️', '⏳'].map((emoji) => (
              <button
                key={emoji}
                type="button"
                className={styles.toolBtn}
                onClick={() => insertEmoji(emoji)}
              >
                {emoji}
              </button>
            ))}
          </div>

          <div className={styles.formGroup}>
            <textarea
              ref={textareaRef}
              className={styles.textarea}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="متن اعلان، تخفیف، تگ‌ها و استایل‌های دلخواه را اینجا بنویسید..."
              required={isActive}
            />
          </div>
        </div>

        {/* Card 3: دکمه و لینک اقدام */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>
            <ArrowLeft size={18} />
            دکمه و پیوند اقدام (Call to Action)
          </h2>

          <div className={styles.grid2}>
            <div className={styles.formGroup}>
              <label>متن دکمه (اختیاری):</label>
              <input
                type="text"
                className={styles.input}
                value={buttonText}
                onChange={(e) => setButtonText(e.target.value)}
                placeholder="مثلاً: مشاهده محصولات"
              />
            </div>

            <div className={styles.formGroup}>
              <label>لینک مقصد دکمه (اختیاری):</label>
              <input
                type="text"
                className={styles.input}
                value={buttonLink}
                onChange={(e) => setButtonLink(e.target.value)}
                placeholder="مثلاً: /products یا https://..."
                dir="ltr"
              />
            </div>
          </div>
        </div>

        {/* Card 4: نشان و قالب رنگی */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>
            <Sparkles size={18} />
            نشان و تم ظاهری
          </h2>

          <div className={styles.formGroup}>
            <label>متن برچسب یا نشان ویژه (اختیاری):</label>
            <input
              type="text"
              className={styles.input}
              value={badgeText}
              onChange={(e) => setBadgeText(e.target.value)}
              placeholder="مثلاً: تخفیف ویژه یا پیشنهاد شگفت‌انگیز"
            />
          </div>

          <div className={styles.formGroup}>
            <label>انتخاب تم رنگی و گرادینت نوار:</label>
            <div className={styles.themeGrid}>
              {THEMES.map((t) => (
                <div
                  key={t.id}
                  className={`${styles.themeOption} ${theme === t.id ? styles.selected : ''}`}
                  onClick={() => setTheme(t.id)}
                >
                  <div className={styles.themeSample} style={{ background: t.sample }} />
                  <span className={styles.themeLabel}>{t.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.switchRow} style={{ marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1rem' }}>
            <div className={styles.switchLabel}>
              <strong>امکان بستن نوار توسط کاربر</strong>
              <small>نمایش دکمه ضربدر جهت بستن موقت نوار در سشن جاری کاربر</small>
            </div>
            <label className={styles.toggle}>
              <input
                type="checkbox"
                checked={canDismiss}
                onChange={(e) => setCanDismiss(e.target.checked)}
              />
              <span className={styles.slider} />
            </label>
          </div>
        </div>

        {/* Toast Notification */}
        {toast && (
          <div className={`${styles.toast} ${styles[toast.type]}`}>
            {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span>{toast.text}</span>
          </div>
        )}

        {/* Actions Bar */}
        <div className={styles.actionsBar}>
          <button
            type="submit"
            className={styles.saveBtn}
            disabled={saving}
          >
            <Save size={18} />
            <span>{saving ? 'در حال ذخیره‌سازی...' : 'ذخیره و انتشار تغییرات'}</span>
          </button>

          <button
            type="button"
            className={styles.resetBtn}
            onClick={handleResetToTest}
          >
            <RotateCcw size={16} />
            <span>بارگذاری نمونه تستی ۵۰٪ تخفیف</span>
          </button>
        </div>
      </form>
    </div>
  );
}
