'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import ProfileSidebar from '@/components/profile/ProfileSidebar';
import styles from './profile.module.scss';

export default function ProfileLayout({ children }) {
    const { data: session, status } = useSession();
    const router = useRouter();

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/');
        }
    }, [status, router]);

    // Show loading state while checking authentication
    if (status === 'loading') {
        return (
            <div className={styles.loadingContainer}>
                <div className={styles.loader}>در حال بارگذاری...</div>
            </div>
        );
    }

    // Don't render anything if unauthenticated (will redirect)
    if (status === 'unauthenticated') {
        return null;
    }

    return (
        <div className={styles.profileLayout}>
            <div className={styles.container}>
                <ProfileSidebar />
                <main className={styles.content}>
                    {children}
                </main>
            </div>
        </div>
    );
}
