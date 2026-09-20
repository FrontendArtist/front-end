/**
 * ─────────────────────────────────────────────────────────────────────────────
 * SEP (Saman Electronic Payment) Gateway Integration Service
 * ماژول ارتباط با وب‌سرویس‌های رسمی پرداخت الکترونیک سامان (سپ)
 * نگارش مستند: 3.6
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const SEP_TERMINAL_ID = process.env.SEP_TERMINAL_ID || '15785408';
export const SEP_TOKEN_URL = process.env.SEP_TOKEN_URL || 'https://sep.shaparak.ir/onlinepg/onlinepg';
export const SEP_GATEWAY_ACTION_URL = 'https://sep.shaparak.ir/OnlinePG/OnlinePG';
export const SEP_VERIFY_URL = process.env.SEP_VERIFY_URL || 'https://sep.shaparak.ir/verifyTxnRandomSessionkey/ipg/VerifyTransaction';
export const SEP_REVERSE_URL = 'https://sep.shaparak.ir/verifyTxnRandomSessionkey/ipg/ReverseTransaction';

/**
 * جدول ترجمه وضعیت‌های بازگشتی از درگاه سپ (پارامتر State)
 */
export const SEP_STATE_MESSAGES = {
    'OK': 'پرداخت با موفقیت انجام شد.',
    'CanceledByUser': 'پرداخت توسط کاربر لغو شد.',
    'Failed': 'پرداخت با خطا مواجه شد و انجام نگرفت.',
    'SessionIsNull': 'کاربر در بازه زمانی تعیین‌شده پاسخی ارسال نکرده و سشن منقضی شده است.',
    'InvalidParameters': 'پارامترهای ارسالی به درگاه پرداخت نامعتبر است.',
    'MerchantIpAddressIsInvalid': 'آدرس آی‌پی سرور پذیرنده در سامانه سپ ثبت نشده است.',
    'TokenNotFound': 'توکن پرداخت ارسال‌شده یافت نشد یا منقضی گردیده است.',
    'TokenRequired': 'برای این شماره ترمینال فقط تراکنش‌های توکنی قابل پرداخت هستند.',
    'TerminalNotFound': 'شماره ترمینال ارسال‌شده در سامانه سپ یافت نشد.',
    'MultisettlePolicyErrors': 'محدودیت‌های مدل چند حسابی رعایت نشده است.',
};

/**
 * جدول خطاهای وب‌سرویس تایید (Verify) و اصلاحیه (Reverse)
 */
export const SEP_VERIFY_ERROR_MESSAGES = {
    '-2': 'تراکنش در سامانه بانک یافت نشد.',
    '-6': 'بیش از ۳۰ دقیقه از زمان اجرای تراکنش گذشته و منقضی شده است.',
    '2': 'درخواست تایید تکراری می‌باشد (تراکنش قبلاً با موفقیت وریفای شده است).',
    '5': 'تراکنش برگشت خورده (Reverse) شده است.',
    '-104': 'ترمینال ارسالی در وضعیت غیرفعال می‌باشد.',
    '-105': 'ترمینال ارسالی در سیستم سپ موجود نمی‌باشد.',
    '-106': 'آدرس آی‌پی درخواست‌دهنده غیرمجاز است (آی‌پی سرور در لیست سپ ثبت نیست).',
};

/**
 * دریافت پیام خطای متنی از روی کد یا وضعیت
 */
export function getSepErrorMessage(codeOrState) {
    if (!codeOrState) return 'خطای نامشخص در درگاه پرداخت سامان';
    const str = String(codeOrState).trim();
    if (SEP_STATE_MESSAGES[str]) return SEP_STATE_MESSAGES[str];
    if (SEP_VERIFY_ERROR_MESSAGES[str]) return SEP_VERIFY_ERROR_MESSAGES[str];
    return `خطای درگاه پرداخت سامان (${str})`;
}

/**
 * مرحله اول: دریافت توکن پرداخت از سپ (Token Request)
 * 
 * @param {Object} params
 * @param {number} params.amount - مبلغ به ریال (دقت شود ریال است نه تومان)
 * @param {string} params.resNum - شناسه فاکتور یکتا (حداکثر ۵۰ کاراکتر)
 * @param {string} params.redirectUrl - آدرس بازگشت (کال‌بک POST شاپرک)
 * @param {string} [params.cellNumber] - شماره موبایل مشتری جهت واکشی کارت‌های ذخیره‌شده
 * @returns {Promise<{ success: boolean, token?: string, gatewayUrl?: string, errorCode?: string, errorDesc?: string }>}
 */
export async function requestSepToken({ amount, resNum, redirectUrl, cellNumber }) {
    if (!amount || amount <= 0) {
        throw new Error('مبلغ تراکنش نامعتبر است.');
    }
    if (!resNum) {
        throw new Error('شناسه فاکتور (ResNum) الزامی است.');
    }
    if (!redirectUrl) {
        throw new Error('آدرس بازگشت (RedirectUrl) الزامی است.');
    }

    const payload = {
        Action: 'Token',
        TerminalId: SEP_TERMINAL_ID,
        Amount: Math.round(Number(amount)),
        ResNum: String(resNum),
        RedirectUrl: redirectUrl,
    };

    if (cellNumber) {
        // حذف صفرهای اضافی یا فرمت‌بندی اگر نیاز باشد، سپ معمولاً 0912... یا 912... می‌پذیرد
        const cleanPhone = String(cellNumber).trim();
        if (/^09\d{9}$/.test(cleanPhone) || /^9\d{9}$/.test(cleanPhone)) {
            payload.CellNumber = cleanPhone;
        }
    }

    try {
        const response = await fetch(SEP_TOKEN_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify(payload),
            cache: 'no-store',
        });

        if (!response.ok) {
            const statusText = response.statusText;
            const errBody = await response.text().catch(() => '');
            console.error('[SEP Token HTTP Error]:', response.status, statusText, errBody);
            return {
                success: false,
                errorCode: String(response.status),
                errorDesc: `خطا در ارتباط با سرور بانک (${response.status})`,
            };
        }

        const data = await response.json();

        // سپ در صورت موفقیت: { status: 1, token: "..." }
        // در صورت خطا: { status: -1, errorCode: "...", errorDesc: "..." }
        if (Number(data.status) === 1 && data.token) {
            return {
                success: true,
                token: data.token,
                gatewayUrl: SEP_GATEWAY_ACTION_URL,
            };
        }

        const errorCode = String(data.errorCode || data.status || '');
        const errorDesc = data.errorDesc || getSepErrorMessage(errorCode);
        console.warn('[SEP Token Request Rejected]:', { errorCode, errorDesc, data });

        return {
            success: false,
            errorCode,
            errorDesc,
        };
    } catch (err) {
        console.error('[SEP Token Exception]:', err);
        return {
            success: false,
            errorCode: 'NETWORK_ERROR',
            errorDesc: 'عدم برقراری ارتباط با وب‌سرویس بانک سامان',
        };
    }
}

/**
 * مرحله دوم: تایید نهایی تراکنش (Verify Transaction)
 * 
 * ⚠️ نکته حیاتی: خریدار تا حداکثر ۳۰ دقیقه پس از انجام تراکنش فرصت دارد Verify شود،
 * در غیر این صورت مبلغ خودکار به حساب خریدار برگشت می‌خورد.
 * 
 * @param {Object} params
 * @param {string} params.refNum - رسید دیجیتالی سپ
 * @param {string|number} [params.terminalNumber] - شماره ترمینال
 * @returns {Promise<{ success: boolean, resultCode: number, resultDescription: string, transactionDetail?: Object, rawData: Object }>}
 */
export async function verifySepTransaction({ refNum, terminalNumber }) {
    if (!refNum) {
        throw new Error('شماره رسید دیجیتالی (RefNum) جهت تایید تراکنش الزامی است.');
    }

    const payload = {
        RefNum: String(refNum),
        TerminalNumber: Number(terminalNumber || SEP_TERMINAL_ID),
    };

    try {
        const response = await fetch(SEP_VERIFY_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify(payload),
            cache: 'no-store',
        });

        if (!response.ok) {
            const errText = await response.text().catch(() => '');
            console.error('[SEP Verify HTTP Error]:', response.status, errText);
            return {
                success: false,
                resultCode: response.status,
                resultDescription: `خطا در ارتباط با سرور تایید تراکنش (${response.status})`,
                rawData: {},
            };
        }

        const data = await response.json();
        const resultCode = Number(data.ResultCode);
        const isSuccess = data.Success === true && resultCode === 0;

        return {
            success: isSuccess,
            resultCode,
            resultDescription: data.ResultDescription || getSepErrorMessage(resultCode),
            transactionDetail: data.TransactionDetail || null,
            rawData: data,
        };
    } catch (err) {
        console.error('[SEP Verify Exception]:', err);
        return {
            success: false,
            resultCode: -999,
            resultDescription: 'خطای سیستمی در فراخوانی وب‌سرویس تایید تراکنش سامان',
            rawData: {},
        };
    }
}

/**
 * مرحله اختیاری/اضطراری: اصلاحیه یا برگشت تراکنش (Reverse Transaction)
 * در صورتی که بعد از کسر وجه و وریفای، خطای دیتابیس رخ دهد یا مبلغ نامطابق باشد،
 * تا ۵۰ دقیقه پس از تراکنش می‌توان این متد را فراخوانی کرد تا پول به حساب مشتری برگردد.
 * 
 * @param {Object} params
 * @param {string} params.refNum - رسید دیجیتالی سپ
 * @param {string|number} [params.terminalNumber] - شماره ترمینال
 */
export async function reverseSepTransaction({ refNum, terminalNumber }) {
    if (!refNum) return { success: false, message: 'RefNum الزامی است.' };

    const payload = {
        RefNum: String(refNum),
        TerminalNumber: Number(terminalNumber || SEP_TERMINAL_ID),
    };

    try {
        const response = await fetch(SEP_REVERSE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify(payload),
            cache: 'no-store',
        });

        const data = await response.json().catch(() => ({}));
        const resultCode = Number(data.ResultCode);
        return {
            success: data.Success === true || resultCode === 0,
            resultCode,
            resultDescription: data.ResultDescription,
            rawData: data,
        };
    } catch (err) {
        console.error('[SEP Reverse Exception]:', err);
        return {
            success: false,
            resultCode: -999,
            resultDescription: 'خطای سیستمی در ریورس تراکنش',
        };
    }
}
