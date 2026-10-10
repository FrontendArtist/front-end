import { useEffect, useState } from 'react';

export default function usePaymentProcessing() {
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        // بازگشت از درگاه با حافظهٔ مرورگر، وضعیت انتظار قبلی را نیز بازیابی می‌کند.
        const handlePageShow = (event) => {
            if (event.persisted) setIsProcessing(false);
        };
        window.addEventListener('pageshow', handlePageShow);
        return () => window.removeEventListener('pageshow', handlePageShow);
    }, []);

    return [isProcessing, setIsProcessing];
}
