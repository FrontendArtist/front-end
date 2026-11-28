import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ClosedParcelRefundControl from '../ClosedParcelRefundControl';
import { PermissionsProvider } from '@/context/PermissionsContext';
import { ADMIN_PERMISSIONS } from '@/config/adminPermissions';
import {
    REFUND_GENERIC_MESSAGE,
    REFUND_SUCCESS_MESSAGE,
    REFUND_UNKNOWN_MESSAGE,
} from '@/lib/closedParcelRefund';

const PID = '22222222-2222-2222-2222-222222222222';
const REASON = 'علت برگشت';
const CONFIRM = 'کل ماندهٔ پرداخت‌شدهٔ این قلم به کیف نور خریدار برمی‌گردد و این کار قابل بازگشت نیست. کرایهٔ ارسال و کوپن برنمی‌گردد.';

const http = (status, body, { failJson = false } = {}) => ({
    ok: status >= 200 && status < 300,
    status,
    json: failJson ? async () => { throw new Error('bad'); } : async () => body,
});

function renderRefund({ permissions = [ADMIN_PERMISSIONS.NOOR_INJECT], isLoaded = true, ...props } = {}) {
    const onReload = props.onReload || jest.fn(async () => true);
    const onRecorded = props.onRecorded || jest.fn(async () => {});
    const view = render(
        <PermissionsProvider initialPermissions={permissions} isLoaded={isLoaded}>
            <ClosedParcelRefundControl
                purchaseId={PID}
                status="NotRefunded"
                onReload={onReload}
                onRecorded={onRecorded}
                {...props}
            />
        </PermissionsProvider>,
    );
    return { ...view, onReload, onRecorded };
}

function fillForm() {
    fireEvent.click(screen.getByTestId('closed-parcel-refund-open'));
    fireEvent.change(screen.getByTestId('closed-parcel-refund-reason'), { target: { value: REASON } });
    fireEvent.click(screen.getByTestId('closed-parcel-refund-confirm'));
}

function sentReason(call = 0) {
    return JSON.parse(global.fetch.mock.calls[call][1].body);
}

beforeEach(() => {
    global.fetch = jest.fn();
});

describe('ClosedParcelRefundControl — نمایش', () => {
    test('برگشت ثبت نشده نشان و دکمه دارد و تأیید صریح لازم است', () => {
        renderRefund();
        expect(screen.getByTestId('closed-parcel-refund-badge')).toHaveTextContent('برگشت ثبت نشده');
        expect(screen.getByTestId('closed-parcel-refund-open')).toBeInTheDocument();
        fireEvent.click(screen.getByTestId('closed-parcel-refund-open'));
        expect(screen.getByRole('checkbox', { name: CONFIRM })).toBeInTheDocument();
        expect(screen.getByTestId('closed-parcel-refund-submit')).toBeDisabled();
        fireEvent.change(screen.getByTestId('closed-parcel-refund-reason'), { target: { value: '   ' } });
        fireEvent.click(screen.getByTestId('closed-parcel-refund-confirm'));
        expect(screen.getByTestId('closed-parcel-refund-submit')).toBeDisabled();
    });

    test('بدون Noor.Inject دکمه نیست و نشان هست', () => {
        renderRefund({ permissions: [] });
        expect(screen.getByTestId('closed-parcel-refund-badge')).toHaveTextContent('برگشت ثبت نشده');
        expect(screen.queryByTestId('closed-parcel-refund-open')).not.toBeInTheDocument();
    });

    test('برگشت‌شده مبلغ و زمان و علت را نشان می‌دهد و دکمه ندارد', () => {
        renderRefund({
            status: 'Refunded',
            amountInNoor: 70,
            refundedAtUtc: '2026-11-26T10:00:00Z',
            reason: 'علت ادمین',
        });
        expect(screen.getByTestId('closed-parcel-refund-badge')).toHaveTextContent('برگشت‌شده');
        expect(screen.getByTestId('closed-parcel-refund-details')).toHaveTextContent('۷۰');
        expect(screen.getByTestId('closed-parcel-refund-details')).toHaveTextContent('علت ادمین');
        expect(screen.queryByTestId('closed-parcel-refund-open')).not.toBeInTheDocument();
    });

    test('پیگیری دستی فقط نشان است', () => {
        renderRefund({ status: 'ManualReview' });
        expect(screen.getByTestId('closed-parcel-refund-badge')).toHaveTextContent('پیگیری دستی');
        expect(screen.queryByTestId('closed-parcel-refund-open')).not.toBeInTheDocument();
        expect(screen.queryByTestId('closed-parcel-refund-details')).not.toBeInTheDocument();
    });

    test('None چیزی نشان نمی‌دهد', () => {
        renderRefund({ status: 'None' });
        expect(screen.queryByTestId('closed-parcel-refund')).not.toBeInTheDocument();
    });
});

describe('ClosedParcelRefundControl — ثبت', () => {
    test('هنگام ارسال دکمه غیرفعال است و فقط یک درخواست می‌رود', async () => {
        let resolveFetch;
        global.fetch.mockImplementation(() => new Promise((resolve) => { resolveFetch = resolve; }));
        renderRefund();
        fillForm();
        const form = screen.getByTestId('closed-parcel-refund-form');
        fireEvent.submit(form);
        fireEvent.submit(form);
        await waitFor(() => expect(screen.getByTestId('closed-parcel-refund-submit')).toBeDisabled());
        expect(global.fetch).toHaveBeenCalledTimes(1);
        resolveFetch(http(200, { success: true, data: { totalRefundInNoor: 5, reason: REASON, createdAtUtc: '2026-11-26T10:00:00Z' } }));
        await screen.findByText(REFUND_SUCCESS_MESSAGE);
    });

    test.each([
        ['قطع شبکه', () => Promise.reject(new Error('offline'))],
        ['پایان مهلت', () => Promise.reject(Object.assign(new Error('timeout'), { name: 'AbortError' }))],
        ['۵۰۰', () => Promise.resolve(http(500, { success: false }))],
        ['۵۰۳', () => Promise.resolve(http(503, { success: false, error: 'down' }))],
        ['پاسخ ناخوانا', () => Promise.resolve(http(200, null, { failJson: true }))],
    ])('%s فرم و علت و operationId را نگه می‌دارد', async (_name, responder) => {
        global.fetch.mockImplementation(responder);
        renderRefund();
        fillForm();
        fireEvent.submit(screen.getByTestId('closed-parcel-refund-form'));
        expect(await screen.findByTestId('closed-parcel-refund-notice')).toHaveTextContent(REFUND_UNKNOWN_MESSAGE);
        expect(screen.getByTestId('closed-parcel-refund-reason')).toHaveValue(REASON);
        expect(screen.getByTestId('closed-parcel-refund-form')).toBeInTheDocument();
        const firstId = sentReason(0).operationId;
        await waitFor(() => expect(screen.getByTestId('closed-parcel-refund-submit')).toBeEnabled());

        global.fetch.mockResolvedValue(http(200, { success: true, data: { totalRefundInNoor: 1 } }));
        fireEvent.submit(screen.getByTestId('closed-parcel-refund-form'));
        await screen.findByText(REFUND_SUCCESS_MESSAGE);
        expect(sentReason(1).operationId).toBe(firstId);
        expect(sentReason(1).reason).toBe(REASON);
    });

    test('پس از ۴۰۹ شناسه دور ریخته می‌شود و پیام بعد از تغییر وضعیت می‌ماند', async () => {
        const onReload = jest.fn(async () => true);
        global.fetch.mockResolvedValue(http(409, { success: false, code: 'CLOSED_PARCEL_REFUND_CONFLICT' }));
        const { rerender } = renderRefund({ onReload });
        fillForm();
        fireEvent.submit(screen.getByTestId('closed-parcel-refund-form'));
        expect(await screen.findByTestId('closed-parcel-refund-notice')).toHaveTextContent(
            'ثبت برگشت با درخواست دیگری تداخل داشت. وضعیت قلم را ببینید و در صورت نیاز دوباره ثبت کنید.',
        );
        expect(onReload).toHaveBeenCalled();
        const firstId = sentReason(0).operationId;
        await waitFor(() => expect(screen.getByTestId('closed-parcel-refund-submit')).toBeEnabled());

        global.fetch.mockResolvedValue(http(409, { success: false, code: 'CLOSED_PARCEL_REFUND_CONFLICT' }));
        fireEvent.submit(screen.getByTestId('closed-parcel-refund-form'));
        await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
        expect(sentReason(1).operationId).not.toBe(firstId);
        await waitFor(() => expect(screen.getByTestId('closed-parcel-refund-submit')).toBeEnabled());

        rerender(
            <PermissionsProvider initialPermissions={[ADMIN_PERMISSIONS.NOOR_INJECT]} isLoaded>
                <ClosedParcelRefundControl purchaseId={PID} status="ManualReview" onReload={onReload} />
            </PermissionsProvider>,
        );
        expect(screen.getByTestId('closed-parcel-refund-notice')).toHaveTextContent('تداخل داشت');
        expect(screen.getByTestId('closed-parcel-refund-badge')).toHaveTextContent('پیگیری دستی');
        expect(screen.queryByTestId('closed-parcel-refund-form')).not.toBeInTheDocument();
        expect(screen.queryByTestId('closed-parcel-refund-open')).not.toBeInTheDocument();
    });

    test('پیام MANUAL_REVIEW اختصاصی است', async () => {
        global.fetch.mockResolvedValue(http(409, { success: false, code: 'CLOSED_PARCEL_REFUND_MANUAL_REVIEW' }));
        renderRefund();
        fillForm();
        fireEvent.submit(screen.getByTestId('closed-parcel-refund-form'));
        expect(await screen.findByTestId('closed-parcel-refund-notice')).toHaveTextContent(
            'سهم پرداخت این قلم ثبت نشده است؛ برگشت از این بخش ممکن نیست و باید دستی پیگیری شود.',
        );
    });

    test('کد ناشناخته و ۴۰۴ بدون کد پیام عمومی دارند و ۴۰۴ شناسه را دور نمی‌ریزد', async () => {
        const onReload = jest.fn(async () => true);
        global.fetch
            .mockResolvedValueOnce(http(404, { success: false }))
            .mockResolvedValueOnce(http(409, { success: false, code: 'NOT_A_REAL_CODE' }));
        renderRefund({ onReload });
        fillForm();
        fireEvent.submit(screen.getByTestId('closed-parcel-refund-form'));
        expect(await screen.findByTestId('closed-parcel-refund-notice')).toHaveTextContent(REFUND_GENERIC_MESSAGE);
        expect(onReload).not.toHaveBeenCalled();
        const firstId = sentReason(0).operationId;
        await waitFor(() => expect(screen.getByTestId('closed-parcel-refund-submit')).toBeEnabled());

        fireEvent.submit(screen.getByTestId('closed-parcel-refund-form'));
        await waitFor(() => expect(screen.getByTestId('closed-parcel-refund-submit')).toBeEnabled());
        expect(global.fetch).toHaveBeenCalledTimes(2);
        expect(sentReason(1).operationId).toBe(firstId);
        expect(screen.getByTestId('closed-parcel-refund-notice')).toHaveTextContent(REFUND_GENERIC_MESSAGE);
        expect(onReload).toHaveBeenCalledTimes(1);
    });

    test('موفقیت با شکست بازخوانی اعلام می‌شود و ارسال دوباره ممکن نیست', async () => {
        const onReload = jest.fn(async () => false);
        const onRecorded = jest.fn(async () => {});
        global.fetch.mockResolvedValue(http(200, {
            success: true,
            data: { totalRefundInNoor: 18, reason: REASON, createdAtUtc: '2026-11-26T12:00:00Z' },
        }));
        const { rerender } = renderRefund({ onReload, onRecorded });
        fillForm();
        fireEvent.submit(screen.getByTestId('closed-parcel-refund-form'));
        expect(await screen.findByText(REFUND_SUCCESS_MESSAGE)).toBeInTheDocument();
        await waitFor(() => expect(onRecorded).toHaveBeenCalledWith(18));
        expect(screen.queryByTestId('closed-parcel-refund-open')).not.toBeInTheDocument();
        expect(screen.queryByTestId('closed-parcel-refund-submit')).not.toBeInTheDocument();

        rerender(
            <PermissionsProvider initialPermissions={[ADMIN_PERMISSIONS.NOOR_INJECT]} isLoaded>
                <ClosedParcelRefundControl
                    purchaseId={PID}
                    status="NotRefunded"
                    onReload={onReload}
                    onRecorded={onRecorded}
                />
            </PermissionsProvider>,
        );
        expect(screen.getByText(REFUND_SUCCESS_MESSAGE)).toBeInTheDocument();
        expect(screen.queryByTestId('closed-parcel-refund-open')).not.toBeInTheDocument();
        expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    test('پیام موفقیت پس از بازخوانی و عوض شدن نشان می‌ماند', async () => {
        const onReload = jest.fn(async () => true);
        global.fetch.mockResolvedValue(http(200, {
            success: true,
            data: { totalRefundInNoor: 18, reason: REASON, createdAtUtc: '2026-11-26T12:00:00Z' },
        }));
        const { rerender } = renderRefund({ onReload });
        fillForm();
        fireEvent.submit(screen.getByTestId('closed-parcel-refund-form'));
        await screen.findByText(REFUND_SUCCESS_MESSAGE);
        rerender(
            <PermissionsProvider initialPermissions={[ADMIN_PERMISSIONS.NOOR_INJECT]} isLoaded>
                <ClosedParcelRefundControl
                    purchaseId={PID}
                    status="Refunded"
                    amountInNoor={18}
                    refundedAtUtc="2026-11-26T12:00:00Z"
                    reason={REASON}
                    onReload={onReload}
                />
            </PermissionsProvider>,
        );
        expect(screen.getByText(REFUND_SUCCESS_MESSAGE)).toBeInTheDocument();
        expect(screen.getByTestId('closed-parcel-refund-badge')).toHaveTextContent('برگشت‌شده');
        expect(screen.queryByTestId('closed-parcel-refund-open')).not.toBeInTheDocument();
    });
});
