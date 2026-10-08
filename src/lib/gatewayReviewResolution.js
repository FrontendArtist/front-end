export function validateGatewayReviewResolution(payload) {
    const e = payload?.evidence;
    const outcomes = ['PAID_AND_CONFIRMED', 'NO_MATCHING_DEPOSIT', 'REVERSED_REJECTED', 'MANUAL_REFUND'];
    if (!outcomes.includes(payload?.outcomeCode)) return 'نتیجه رسیدگی را انتخاب کنید.';
    if (!e?.operationId || !Number.isInteger(e.expectedRevision) || e.expectedRevision < 1 ||
        !/^\d{4}-\d{2}-\d{2}$/.test(e.checkedReportDate || '') || ![true, false].includes(e.matchingDepositFound))
        return 'تاریخ گزارش بررسی‌شده و نتیجه جست‌وجوی واریزی را مشخص کنید.';
    if (e.matchingDepositFound && (!e.depositReference?.trim() || !e.depositDate ||
        !Number.isSafeInteger(e.depositAmountRial) || e.depositAmountRial <= 0))
        return 'شناسه واریز، تاریخ و مبلغ ریالی درج‌شده در گزارش را کامل کنید.';
    if (payload.outcomeCode === 'NO_MATCHING_DEPOSIT' && e.matchingDepositFound !== false)
        return 'برای این نتیجه باید مشخص شود که واریز منطبق پیدا نشده است.';
    if (payload.outcomeCode === 'PAID_AND_CONFIRMED' && (e.matchingDepositFound !== true || !payload.resolutionFinancialReferenceId))
        return 'بستن با نتیجه شارژ موفق به واریز منطبق و تأیید معتبر شارژ نیاز دارد.';
    if (payload.outcomeCode === 'REVERSED_REJECTED' && !payload.resolutionFinancialReferenceId)
        return 'برگشت موفق باید قبلاً در سرویس مالی ثبت شده باشد.';
    if (payload.outcomeCode === 'MANUAL_REFUND' && !e.manualRefundReference?.trim())
        return 'مرجع بازپرداخت دستی را وارد کنید.';
    if ((e.note?.length || 0) > 2000 || (e.depositReference?.length || 0) > 100 || (e.manualRefundReference?.length || 0) > 100)
        return 'طول یادداشت یا شناسه واردشده بیش از حد مجاز است.';
    return null;
}
