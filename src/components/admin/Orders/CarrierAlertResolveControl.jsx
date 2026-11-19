'use client';

/**
 * تعیین‌تکلیف هشدار خسارت/مفقودی مرسوله.
 * همان فرم مشترک برگشتی است، فقط به مسیر carrier-alert/resolve می‌رود.
 */

import CarrierReturnResolveControl from './CarrierReturnResolveControl';

export default function CarrierAlertResolveControl(props) {
    return <CarrierReturnResolveControl {...props} mode="alert" />;
}
