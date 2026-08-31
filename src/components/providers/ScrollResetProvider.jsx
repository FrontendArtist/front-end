'use client';

import { useEffect, Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

function ScrollResetHandler() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Reset viewport scroll positions (especially horizontal in RTL) on every route change
    window.scrollTo({ left: 0, top: 0, behavior: 'instant' });
    if (document.documentElement) {
      document.documentElement.scrollLeft = 0;
    }
    if (document.body) {
      document.body.scrollLeft = 0;
    }
  }, [pathname, searchParams]);

  return null;
}

export default function ScrollResetProvider() {
  return (
    <Suspense fallback={null}>
      <ScrollResetHandler />
    </Suspense>
  );
}
