'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Home } from 'lucide-react';
import styles from './not-found.module.scss';

export default function NotFound() {
  const router = useRouter();

  const handleGoBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/');
    }
  };

  return (
    <main className={styles.container}>
      <div className={styles.wrapper}>
        <div className={styles.imageCard}>
          <Image
            src="/images/error404.webp"
            alt="خطای 404 - صفحه مورد نظر یافت نشد"
            width={650}
            height={450}
            priority
            className={styles.image}
          />
        </div>

        <div className={styles.buttonGroup}>
          <button
            type="button"
            onClick={handleGoBack}
            className={styles.backButton}
          >
            <ArrowRight size={20} />
            <span>بازگشت به صفحه قبل</span>
          </button>

          <Link href="/" className={styles.homeButton}>
            <Home size={20} />
            <span>صفحه اصلی</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
