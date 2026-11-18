'use client';

/**
 * @file src/components/admin/SalekGuide/SalekGuideManager.jsx
 * @description کامپوننت پنل مدیریت مسکات تعاملی راهنمای سالک
 */

import { useState } from 'react';
import Link from 'next/link';
import {
  Compass,
  Sparkles,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  X,
  ExternalLink
} from 'lucide-react';
import styles from './SalekGuideManager.module.scss';

const DEFAULT_GUIDE = {
  isActive: true,
  message: 'آیا نقشه راه سالک رو دیدی؟',
  subText: 'مسیر گام‌به‌گام دوره‌ها و خودشناسی در طرح الهی',
  buttonText: 'مشاهده نقشه راه',
  buttonLink: '/roadmap',
};

export default function SalekGuideManager({ initialGuide = null }) {
  const [isActive, setIsActive] = useState(
    initialGuide?.isActive !== undefined ? Boolean(initialGuide.isActive) : true
  );
  const [message, setMessage] = useState(initialGuide?.message || DEFAULT_GUIDE.message);
  const [subText, setSubText] = useState(
    initialGuide?.subText !== undefined ? initialGuide.subText : DEFAULT_GUIDE.subText
  );
  const [buttonText, setButtonText] = useState(initialGuide?.buttonText || DEFAULT_GUIDE.buttonText);
  const [buttonLink, setButtonLink] = useState(initialGuide?.buttonLink || DEFAULT_GUIDE.buttonLink);

  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null); // { type: 'success'|'error', text: '' }

  // بازنشانی به داده‌های پیش‌فرض
  const handleResetToDefault = () => {
    setIsActive(true);
    setMessage(DEFAULT_GUIDE.message);
    setSubText(DEFAULT_GUIDE.subText);
    setButtonText(DEFAULT_GUIDE.buttonText);
    setButtonLink(DEFAULT_GUIDE.buttonLink);
    showToast('success', 'فرم به مقادیر پیش‌فرض نقشه راه بازنشانی شد.');
  };

  const showToast = (type, text) => {
    setToast({ type, text });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // ارسال به API جهت ذخیره در Strapi
  const handleSave = async () => {
    if (isActive && (!message || !message.trim())) {
      showToast('error', 'متن پیام داخل بالن گفت‌وگو الزامی است.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/admin/salek-guide', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isActive,
          message: message.trim(),
          subText: subText ? subText.trim() : '',
          buttonText: buttonText ? buttonText.trim() : '',
          buttonLink: buttonLink ? buttonLink.trim() : '',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'خطا در ذخیره‌سازی تنظیمات');
      }

      showToast('success', 'تنظیمات راهنمای سالک با موفقیت در بک‌اند ذخیره شد.');
    } catch (err) {
      showToast('error', err.message || 'خطا در ارتباط با سرور');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.manager}>
      {/* پیام بازخورد (Toast) */}
      {toast && (
        <div className={`${styles.toast} ${styles[toast.type]}`}>
          {toast.type === 'success' ? (
            <CheckCircle2 size={18} />
          ) : (
            <AlertCircle size={18} />
          )}
          <span>{toast.text}</span>
        </div>
      )}

      {/* سربرگ */}
      <header className={styles.header}>
        <div className={styles.titleArea}>
          <div className={styles.iconWrapper}>
            <Compass size={24} />
          </div>
          <div>
            <h1 className={styles.title}>مدیریت راهنمای سالک (مسکات تعاملی)</h1>
            <p className={styles.subtitle}>
              شخصی‌سازی متن، دکمه و لینک هدایت‌کننده کاراکتر هوشمند سالک در گوشه صفحه سایت
            </p>
          </div>
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.resetBtn}
            onClick={handleResetToDefault}
            disabled={saving}
          >
            <RotateCcw size={16} />
            <span>بازنشانی پیش‌فرض</span>
          </button>

          <button
            type="button"
            className={styles.saveBtn}
            onClick={handleSave}
            disabled={saving}
          >
            <Save size={16} />
            <span>{saving ? 'در حال ذخیره...' : 'ذخیره تغییرات'}</span>
          </button>
        </div>
      </header>

      {/* پیش‌نمایش زنده */}
      <section className={styles.previewCard}>
        <div className={styles.cardHeader}>
          <div className={styles.cardTitle}>
            <Sparkles size={16} />
            <span>پیش‌نمایش زنده کاراکتر و بالن پیام</span>
          </div>
          <span className={`${styles.statusBadge} ${isActive ? styles.badgeActive : styles.badgeInactive}`}>
            {isActive ? 'فعال در سایت' : 'غیرفعال (مخفی)'}
          </span>
        </div>

        <div className={styles.previewCanvas}>
          <div className={styles.mockBrowser}>
            <div className={styles.mascotDisplay}>
              {/* بالن پیام */}
              <div className={styles.previewBubble}>
                <div className={styles.bubbleHeader}>
                  <div className={styles.badge}>
                    <Compass size={13} />
                    <span>راهنمای سالک</span>
                  </div>
                  <span className={styles.closeMock}><X size={14} /></span>
                </div>

                <div className={styles.bubbleBody}>
                  <h4 className={styles.previewMsg}>{message || 'آیا نقشه راه سالک رو دیدی؟'}</h4>
                  {subText && <p className={styles.previewSub}>{subText}</p>}
                </div>

                <div className={styles.bubbleFooter}>
                  <div className={styles.previewBtn}>
                    <span>{buttonText || 'مشاهده نقشه راه'}</span>
                    <ArrowLeft size={15} />
                  </div>
                </div>

                <div className={styles.bubbleTail} />
              </div>

              {/* کاراکتر باز w2 */}
              <div className={styles.previewMascot}>
                <img
                  src="/images/w2.webp"
                  alt="پیش‌نمایش سالک"
                  className={styles.mascotImg}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* فرم تنظیمات */}
      <div className={styles.formGrid}>
        {/* کارت تنظیمات وضعیت و پیام */}
        <section className={styles.formCard}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>محتوای پیام بالن</h2>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.switchLabel}>
              <span className={styles.labelText}>نمایش کاراکتر در سایت (isActive)</span>
              <div className={styles.switchWrapper}>
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className={styles.switchInput}
                />
                <span className={styles.switchSlider} />
              </div>
            </label>
            <p className={styles.hint}>
              در صورت غیرفعال کردن، مسکات برای کاربران سایت نمایش داده نمی‌شود.
            </p>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>
              متن داخل بالن گفت‌وگو (message) <span className={styles.required}>*</span>
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="مثال: آیا نقشه راه سالک رو دیدی؟"
              className={styles.textarea}
              rows={3}
            />
            <p className={styles.hint}>پرسش یا پیام اصلی که سالک با کاربر در میان می‌گذارد.</p>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>توضیحات فرعی زیر متن (subText - اختیاری)</label>
            <input
              type="text"
              value={subText}
              onChange={(e) => setSubText(e.target.value)}
              placeholder="مثال: مسیر گام‌به‌گام دوره‌ها و خودشناسی در طرح الهی"
              className={styles.input}
            />
          </div>
        </section>

        {/* کارت دکمه و لینک مقصد */}
        <section className={styles.formCard}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>تنظیمات دکمه و لینک مقصد</h2>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>متن روی دکمه (buttonText)</label>
            <input
              type="text"
              value={buttonText}
              onChange={(e) => setButtonText(e.target.value)}
              placeholder="مثال: مشاهده نقشه راه"
              className={styles.input}
            />
            <p className={styles.hint}>عنوانی که روی دکمه اقدام نمایش داده می‌شود.</p>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>آدرس مقصد دکمه (buttonLink)</label>
            <div className={styles.inputWithIcon}>
              <input
                type="text"
                value={buttonLink}
                onChange={(e) => setButtonLink(e.target.value)}
                placeholder="مثال: /roadmap یا https://..."
                className={styles.input}
                dir="ltr"
              />
              <ExternalLink size={16} className={styles.inputIcon} />
            </div>
            <p className={styles.hint}>
              مسیر داخلی سایت (مانند <code>/roadmap</code> یا <code>/courses</code>) یا آدرس کامل اینترنتی.
            </p>
          </div>

          <div className={styles.infoNotice}>
            <Compass size={18} />
            <div>
              <strong>توجه به تجربه کاربری:</strong>
              <p>
                تصاویر کاراکتر به صورت ثابت از <code>w1.webp</code> (حالت سرک‌کشیدن) و <code>w2.webp</code> (حالت باز) استفاده می‌کنند و زمان‌بندی‌ها (۲.۵ ثانیه ورود اولیه، ۷ ثانیه نمایش خودکار و ۵ ثانیه بسته‌شدن بعد از لمس) به صورت هوشمند برای بالاترین بازدهی بهینه‌سازی شده‌اند.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
