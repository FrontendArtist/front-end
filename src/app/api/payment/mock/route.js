import { createMockCallback, isSepMockEnabled, readMockToken } from '@/lib/sepMock';

const SCENARIOS = [
    ['success', 'پرداخت موفق'],
    ['cancel', 'انصراف از پرداخت'],
    ['verify_failed', 'خطا در تأیید بانک'],
    ['amount_mismatch', 'مغایرت مبلغ'],
];

function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    })[character]);
}

function page(title, content, status = 200) {
    return new Response(`<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(title)}</title>
        <style>body{font-family:Tahoma,sans-serif;max-width:700px;margin:48px auto;padding:0 20px;background:#f6f7f9;color:#17202a}
        main{background:white;padding:30px;border-radius:14px;box-shadow:0 4px 20px #0001}h1{font-size:24px}
        button{font:inherit;padding:12px 20px;margin:6px 0;border:0;border-radius:8px;background:#145a8d;color:white;cursor:pointer}
        .warning{background:#fff4d5;padding:12px;border-radius:8px}code{direction:ltr;display:inline-block;overflow-wrap:anywhere}</style>
        </head><body><main><h1>${escapeHtml(title)}</h1>${content}</main></body></html>`, {
        status,
        headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
    });
}

export async function POST(request) {
    if (!isSepMockEnabled()) return new Response(null, { status: 404 });

    const form = await request.formData();
    const token = form.get('MockToken') || form.get('Token');
    const payment = readMockToken(token);
    if (!payment || new URL(payment.redirectUrl).origin !== new URL(request.url).origin) {
        return page('درخواست نامعتبر', '<p>توکن منقضی شده یا آدرس callback با این سایت محلی یکسان نیست.</p>', 400);
    }

    const scenario = form.get('Scenario');
    if (!scenario) {
        const flow = payment.resNum.startsWith('TR-')
            ? '<p>مسیر: شارژ نور در بای‌مانی</p>'
            : '<p>مسیر: سفارش ریالی در استرپی؛ این پرداخت جدولی در بای‌مانی تغییر نمی‌دهد. برای تست بای‌مانی از <a href="/checkout/light?amount=10">صفحهٔ شارژ نور</a> و گزینهٔ پرداخت آنلاین شروع کنید.</p>';
        const choices = SCENARIOS.map(([value, label]) => `<form method="post" action="/api/payment/mock">
            <input type="hidden" name="MockToken" value="${escapeHtml(token)}">
            <button type="submit" name="Scenario" value="${value}">${label}</button></form>`).join('');
        return page('درگاه آزمایشی SEP', `<p class="warning">هیچ پولی جابه‌جا نمی‌شود. تا این مرحله فقط درخواست پرداخت ساخته شده است؛ اکنون داده‌های پایگاه‌داده را بررسی کنید.</p>
            ${flow}
            <p>شناسه: <code>${escapeHtml(payment.resNum)}</code></p>
            <p>مبلغ: ${escapeHtml(payment.amount.toLocaleString('fa-IR'))} ریال</p>${choices}`);
    }

    const callback = createMockCallback(token, scenario);
    if (!callback) return page('درخواست نامعتبر', '<p>سناریوی انتخاب‌شده معتبر نیست.</p>', 400);

    const inputs = Object.entries(callback.fields).map(([name, value]) =>
        `<input type="hidden" name="${name}" value="${escapeHtml(value)}">`).join('');
    return page('آمادهٔ ارسال callback', `<p class="warning">پاسخ بانک شبیه‌سازی شده است؛ هنوز callback به برنامه ارسال نشده است. قبل از ادامه، وضعیت سفارش را بررسی کنید.</p>
        <p>شناسه: <code>${escapeHtml(payment.resNum)}</code></p>
        <p>RefNum: <code>${escapeHtml(callback.fields.RefNum || '—')}</code></p>
        <form method="post" action="${escapeHtml(callback.redirectUrl)}">${inputs}
        <button type="submit">ارسال callback به برنامه</button></form>`);
}
