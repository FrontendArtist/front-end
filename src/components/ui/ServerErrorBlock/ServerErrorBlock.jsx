'use client';

import React from 'react';
import styles from './ServerErrorBlock.module.scss';
import { useRouter } from 'next/navigation';

export default function ServerErrorBlock({ message = 'برقراری ارتباط با سرور امکان‌پذیر نیست.' }) {
    const router = useRouter();

    const handleRefresh = () => {
        // 1. Force reload the route segments (Server Components) from Next.js server
        router.refresh();
        // 2. Also hard-reload the browser tab just in case to clear any internal client state/fetch cache
        window.location.reload();
    };

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <div className={styles.iconWrapper}>
                    <svg
                        className={styles.icon}
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.5}
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                        />
                    </svg>
                </div>
                <h3 className={styles.title}>{message}</h3>
                <p className={styles.description}>
                    داده‌ها به دلیل اختلال موقت در ارتباط با سرور بارگذاری نشدند. <br />
                     لطفاً پس از دقایقی مجدداً تلاش کنید.
                </p>
                <button onClick={handleRefresh} className={styles.button}>
                    <svg
                        className={styles.buttonIcon}
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                        />
                    </svg>
                    تلاش مجدد
                </button>
            </div>
        </div>
    );
}
