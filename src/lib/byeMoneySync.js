/**
 * ByeMoney Background Sync Service
 * 
 * سرویس همگام‌سازی کاربر در پس‌زمینه با سرور ByeMoney.
 * این سرویس به صورت Fire-and-Forget بدون مسدود کردن چرخه ورود یا تجربه کاربری اجرا می‌شود.
 */

const rawBaseUrl =
  process.env.NEXT_PUBLIC_BYEMONEY_API_URL ||
  process.env.NEXT_PUBLIC_BYEMONEY_URL ||
  'http://localhost:5000';

export const BYEMONEY_API_URL = rawBaseUrl
  .trim()
  .replace(/\/+$/, '')
  .replace(/\/api\/?$/, '');

// گارد حافظه‌ای (In-Memory Guard) برای جلوگیری از درخواست‌های تکراری در طول نشست و جابجایی بین صفحات
const syncedTokens = new Set();
const syncingTokens = new Set();
const failedTokens = new Set();
// وعدهٔ سینک در حال اجرا؛ تا درخواست‌های وابسته (مثل موجودی) پیش از ساخته‌شدن کاربر در ByeMoney نروند
const syncPromises = new Map();

/**
 * ارسال درخواست به اندپوینت سینک ByeMoney با مد CORS صریح
 * @param {string} jwt 
 */
async function sendSyncRequest(jwt) {
  const endpoint = `${BYEMONEY_API_URL}/api/auth/sync`;
  const response = await fetch(endpoint, {
    method: 'POST',
    mode: 'cors',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${jwt}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Sync request failed with status: ${response.status}`);
  }

  return response;
}

/**
 * همگام‌سازی پس‌زمینه کاربر با ByeMoney
 * کاملاً غیرمسدودکننده (Fire-and-Forget) با ۱ بار Retry در صورت خطا
 * @param {string} jwt 
 */
export function syncByeMoneyUser(jwt) {
  if (!jwt || typeof jwt !== 'string') return Promise.resolve();

  // گارد: اگر قبلاً سینک شده یا در تلاش مجدد شکست خورده، اجرا نمی‌شود؛ اگر در حال سینک است، همان را برمی‌گرداند
  if (syncingTokens.has(jwt)) return syncPromises.get(jwt);
  if (syncedTokens.has(jwt) || failedTokens.has(jwt)) return Promise.resolve();

  syncingTokens.add(jwt);

  const promise = (async () => {
    try {
      await sendSyncRequest(jwt);
      syncedTokens.add(jwt);
    } catch (firstError) {
      console.warn('[ByeMoney Sync] First sync attempt failed, retrying in 4s...', firstError.message || firstError);

      // وقفه ۴ ثانیه‌ای قبل از تلاش مجدد یک‌باره
      await new Promise((resolve) => setTimeout(resolve, 4000));

      try {
        await sendSyncRequest(jwt);
        syncedTokens.add(jwt);
      } catch (retryError) {
        console.warn('[ByeMoney Sync] Retry attempt failed. Giving up for this session.', retryError.message || retryError);
        failedTokens.add(jwt);
      }
    } finally {
      syncingTokens.delete(jwt);
      syncPromises.delete(jwt);
    }
  })().catch((unexpectedError) => {
    console.warn('[ByeMoney Sync] Unexpected error during sync:', unexpectedError);
  });

  syncPromises.set(jwt, promise);
  return promise;
}
