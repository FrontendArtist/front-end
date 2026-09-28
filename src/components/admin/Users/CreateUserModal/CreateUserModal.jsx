'use client';

/**
 * @file src/components/admin/Users/CreateUserModal/CreateUserModal.jsx
 * @description مودال افزودن کاربر جدید در پنل مدیریت
 */

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { UserPlus, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import styles from './CreateUserModal.module.scss';

export default function CreateUserModal({ onClose, onSuccess }) {
  const [mounted, setMounted] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // قفل اسکرول پس‌زمینه هنگام باز بودن مودال
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // بستن مودال با کلید Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !loading) {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [loading, onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const cleanPhone = phoneNumber.trim().replace(/\s+/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      setError('شماره موبایل الزامی و باید حداقل ۱۰ رقم باشد.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: cleanPhone,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          password: password.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'خطا در ثبت کاربر جدید.');
      }

      setSuccessMsg('کاربر جدید با موفقیت ایجاد شد.');

      if (onSuccess && data.user) {
        onSuccess(data.user);
      }

      setTimeout(() => {
        onClose?.();
      }, 800);

    } catch (err) {
      console.error('Create user error:', err);
      setError(err.message || 'خطای غیرمنتظره در سرور رخ داده است.');
    } finally {
      setLoading(false);
    }
  };

  if (!mounted || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className={styles.backdrop}
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose?.();
      }}
    >
      <div className={styles.modal} role="dialog" aria-modal="true">
        {/* سربرگ */}
        <header className={styles.header}>
          <div className={styles.header__titleWrap}>
            <div className={styles.header__icon}>
              <UserPlus size={20} />
            </div>
            <h2 className={styles.header__title}>افزودن کاربر جدید</h2>
          </div>
          <button
            type="button"
            className={styles.header__closeBtn}
            onClick={onClose}
            disabled={loading}
            aria-label="بستن"
          >
            <X size={18} />
          </button>
        </header>

        {/* فرم */}
        <form onSubmit={handleSubmit}>
          <div className={styles.body}>
            {/* پیام خطا */}
            {error && (
              <div className={`${styles.alertBox} ${styles['alertBox--error']}`}>
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {/* پیام موفقیت */}
            {successMsg && (
              <div className={`${styles.alertBox} ${styles['alertBox--success']}`}>
                <CheckCircle2 size={16} />
                <span>{successMsg}</span>
              </div>
            )}

            {/* شماره موبایل */}
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
                autoFocus
                disabled={loading}
              />
              <span className={styles.field__hint}>
                شناسه اصلی ورود و اتصال به کیف پول کاربر می‌باشد.
              </span>
            </div>

            {/* نام و نام خانوادگی */}
            <div className={styles.formRow}>
              <div className={styles.field}>
                <label className={styles.field__label}>نام</label>
                <input
                  type="text"
                  className={styles.input}
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="مثال: علی"
                  disabled={loading}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.field__label}>نام خانوادگی</label>
                <input
                  type="text"
                  className={styles.input}
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="مثال: رضایی"
                  disabled={loading}
                />
              </div>
            </div>

            {/* ایمیل */}
            <div className={styles.field}>
              <label className={styles.field__label}>ایمیل (اختیاری)</label>
              <input
                type="email"
                className={styles.input}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@mail.com"
                dir="ltr"
                disabled={loading}
              />
              <span className={styles.field__hint}>
                در صورت خالی بودن، ایمیل پیش‌فرض سامانه تخصیص می‌یابد.
              </span>
            </div>

            {/* کلمه عبور */}
            <div className={styles.field}>
              <label className={styles.field__label}>کلمه عبور (اختیاری)</label>
              <input
                type="password"
                className={styles.input}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="حداقل ۶ کاراکتر (یا بگذارید خالی بماند)"
                dir="ltr"
                disabled={loading}
              />
              <span className={styles.field__hint}>
                در صورت خالی گذاشتن، یک رمز عبور تصادفی امن تعیین می‌گردد.
              </span>
            </div>
          </div>

          {/* پاورقی دکمه‌ها */}
          <footer className={styles.footer}>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={onClose}
              disabled={loading}
            >
              انصراف
            </button>
            <button
              type="submit"
              className={styles.submitBtn}
              disabled={loading || !phoneNumber.trim()}
            >
              {loading ? 'در حال ثبت...' : (
                <>
                  <UserPlus size={16} />
                  ایجاد کاربر
                </>
              )}
            </button>
          </footer>
        </form>
      </div>
    </div>,
    document.body
  );
}
