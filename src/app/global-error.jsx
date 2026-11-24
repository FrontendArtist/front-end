'use client';

import { useEffect } from 'react';

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    console.error('[GlobalErrorBoundary]', error);
  }, [error]);

  return (
    <html lang="fa" dir="rtl">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem',
          fontFamily: 'Tahoma, Arial, sans-serif',
          backgroundColor: '#f9fafb',
          color: '#111827',
        }}
      >
        <div
          style={{
            maxWidth: '480px',
            width: '100%',
            textAlign: 'center',
            padding: '2rem',
            borderRadius: '16px',
            backgroundColor: '#ffffff',
            border: '1px solid #e5e7eb',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.06)',
          }}
        >
          <h1 style={{ fontSize: '1.35rem', fontWeight: 700, marginBottom: '0.75rem' }}>
            خطای غیرمنتظره در برنامه
          </h1>
          <p style={{ fontSize: '0.95rem', lineHeight: 1.7, color: '#4b5563', marginBottom: '1.5rem' }}>
            متأسفانه مشکلی در اجرای صفحه رخ داده است. می‌توانید دوباره تلاش کنید یا به صفحه اصلی بروید.
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
            <a
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
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
