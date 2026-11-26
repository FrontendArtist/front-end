'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({ error, reset }) {
  useEffect(() => {
    console.error('[AppErrorBoundary]', error);
  }, [error]);

  return (
    <main
      dir="rtl"
      style={{
        minHeight: '60vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1rem',
      }}
    >
      <div
        style={{
          maxWidth: '480px',
          width: '100%',
          textAlign: 'center',
          padding: '2rem',
          borderRadius: '16px',
          border: '1px solid rgba(0, 0, 0, 0.1)',
          backgroundColor: '#ffffff',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.06)',
        }}
      >
        <h1 style={{ fontSize: '1.35rem', fontWeight: 700, marginBottom: '0.75rem', color: '#1f2937' }}>
          مشکلی در بارگذاری این بخش رخ داد
        </h1>
        <p style={{ fontSize: '0.95rem', lineHeight: 1.7, color: '#4b5563', marginBottom: '1.5rem' }}>
          متأسفانه هنگام پردازش درخواست شما خطایی پیش آمد. لطفاً دوباره تلاش کنید یا به صفحه اصلی بازگردید.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              padding: '0.65rem 1.25rem',
              borderRadius: '10px',
              border: 'none',
              backgroundColor: '#0f766e',
              color: '#ffffff',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            تلاش مجدد
          </button>
          <Link
            href="/"
            style={{
              padding: '0.65rem 1.25rem',
              borderRadius: '10px',
              border: '1px solid #d1d5db',
              color: '#1f2937',
              textDecoration: 'none',
              fontWeight: 600,
            }}
          >
            صفحه اصلی
          </Link>
        </div>
      </div>
    </main>
  );
}
