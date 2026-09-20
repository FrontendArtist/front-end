/**
 * ByeMoney Courses Purchase & TopUp API Client
 * 
 * مدیریت درخواست‌های خرید دوره و ثبت درخواست شارژ (TopUp) از طریق سامانه مالی ByeMoney
 */

import { BYEMONEY_API_URL } from './byeMoneySync.js';

/**
 * خرید یک دوره تکی با واحد پولی نور
 * 
 * @param {object} params
 * @param {string} params.externalCourseId - شناسه یکتای دوره در سامانه (منحصراً documentId در استراپی)
 * @param {string} params.jwt - توکن احراز هویت کاربر در سشن
 * @returns {Promise<{
 *   success: boolean,
 *   data?: { purchaseId: string, externalCourseId: string, courseTitle: string, priceInNoor: number, status: 'NotificationSent'|'NotificationFailed'|string, purchasedAtUtc: string },
 *   error?: string,
 *   conflict?: boolean,
 *   insufficientBalance?: boolean,
 *   insufficientDetails?: { currentBalanceInNoor: number, priceInNoor: number, shortfallInNoor: number, shortfallInRial: number, shortfallInToman: number },
 *   unauthorized?: boolean,
 *   notFound?: boolean
 * }>}
 */
export async function purchaseCourseWithByeMoney({ externalCourseId, externalCourseIds, jwt }) {
  if (!jwt) {
    return {
      success: false,
      unauthorized: true,
      error: 'نشست کاربری نامعتبر است. لطفاً مجدداً وارد شوید.',
    };
  }

  // پشتیبانی همزمان از آرایه شناسه‌ها و شناسه تکی جهت سازگاری کامل به عقب
  let ids = [];
  if (Array.isArray(externalCourseIds)) {
    ids = externalCourseIds
      .map(id => (typeof id === 'string' ? id.trim() : String(id || '')))
      .filter(Boolean);
  } else if (externalCourseId && typeof externalCourseId === 'string' && externalCourseId.trim()) {
    ids = [externalCourseId.trim()];
  }

  if (ids.length === 0) {
    return {
      success: false,
      error: 'شناسه یکتای دوره‌ها (documentId) معتبر نیست.',
    };
  }

  const endpoint = `${BYEMONEY_API_URL}/api/courses/purchase`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({
        externalCourseIds: ids,
      }),
    });

    // 200 OK: خرید با موفقیت ثبت شد
    if (response.status === 200) {
      const data = await response.json();
      return {
        success: true,
        data, // شامل فیلد status با مقادیر "NotificationSent" یا "NotificationFailed"
      };
    }

    // 401: انقضای توکن نشست کاربری
    if (response.status === 401) {
      return {
        success: false,
        unauthorized: true,
        error: 'نشست کاربری شما منقضی شده است. لطفاً مجدداً وارد حساب کاربری خود شوید.',
      };
    }

    // استخراج بدنه خطای ساختاریافته از پاسخ سرور
    let errorJson = null;
    let errorsList = [];
    try {
      errorJson = await response.json();
      if (Array.isArray(errorJson.errors)) {
        errorsList = errorJson.errors
          .map(e => {
            if (typeof e === 'string') return e;
            if (typeof e === 'object' && e !== null) {
              return e.message || e.errorMessage || e.description || '';
            }
            return '';
          })
          .filter(Boolean);
      } else if (typeof errorJson.error === 'string') {
        errorsList = [errorJson.error];
      } else if (typeof errorJson.message === 'string') {
        errorsList = [errorJson.message];
      }
    } catch {
      const rawText = await response.text().catch(() => '');
      if (rawText) errorsList = [rawText];
    }

    const firstErrorMsg = errorsList[0] || '';

    // تابع کمکی برای یافتن شیء خطا بر اساس کد خطا از بدنه یا آرایه errors
    const findErrorObj = (code) => {
      if (!errorJson) return null;
      const targetCode = String(code).toUpperCase();
      if (String(errorJson.errorCode || errorJson.ErrorCode || '').toUpperCase() === targetCode) {
        return errorJson;
      }
      if (Array.isArray(errorJson.errors)) {
        const found = errorJson.errors.find(
          e => e && typeof e === 'object' && String(e.errorCode || e.ErrorCode || '').toUpperCase() === targetCode
        );
        if (found) return found;
      }
      if (errorJson.errors && typeof errorJson.errors === 'object' && !Array.isArray(errorJson.errors)) {
        if (String(errorJson.errors.errorCode || errorJson.errors.ErrorCode || '').toUpperCase() === targetCode) {
          return errorJson.errors;
        }
      }
      return null;
    };

    // 409 Conflict یا خطای مالکیت قبلی دوره
    const alreadyOwnedObj = findErrorObj('ALREADY_OWNED');
    const isAlreadyOwned =
      response.status === 409 ||
      Boolean(alreadyOwnedObj) ||
      errorsList.some(msg =>
        msg.includes('قبلاً این دوره') ||
        msg.includes('قبلاً این دوره آموزشی را خریداری کرده‌اید') ||
        msg.includes('شما قبلاً این دوره')
      );

    if (isAlreadyOwned) {
      return {
        success: false,
        conflict: true,
        error: alreadyOwnedObj?.message || firstErrorMsg || 'شما قبلاً این دوره آموزشی را خریداری کرده‌اید.',
      };
    }

    // 404 Not Found: دوره در سامانه یافت نشد
    if (response.status === 404) {
      return {
        success: false,
        notFound: true,
        error: firstErrorMsg || 'دوره مورد نظر در سامانه یافت نشد.',
      };
    }

    // بررسی خطای ساختاریافته کسری موجودی نور بر اساس قرارداد جدید بک‌اند ByeMoney
    // قرارداد: errorCode: INSUFFICIENT_NOOR_BALANCE همراه با ارقام مشخص کسری و قیمت
    const insufficientObj =
      findErrorObj('INSUFFICIENT_NOOR_BALANCE') ||
      (Array.isArray(errorJson?.errors)
        ? errorJson.errors.find(
            e =>
              e &&
              typeof e === 'object' &&
              (e.CurrentBalanceInNoor !== undefined ||
                e.currentBalanceInNoor !== undefined ||
                e.ShortfallInNoor !== undefined ||
                e.shortfallInNoor !== undefined)
          )
        : null) ||
      (errorJson?.CurrentBalanceInNoor !== undefined || errorJson?.ShortfallInNoor !== undefined ? errorJson : null);

    if (response.status === 400 && insufficientObj) {
      const currentBalanceInNoor = Number(
        insufficientObj.currentBalanceInNoor ??
        insufficientObj.CurrentBalanceInNoor ??
        errorJson?.currentBalanceInNoor ??
        errorJson?.CurrentBalanceInNoor ??
        0
      );
      const priceInNoor = Number(
        insufficientObj.priceInNoor ??
        insufficientObj.PriceInNoor ??
        errorJson?.priceInNoor ??
        errorJson?.PriceInNoor ??
        0
      );
      const shortfallInNoor = Number(
        insufficientObj.shortfallInNoor ??
        insufficientObj.ShortfallInNoor ??
        errorJson?.shortfallInNoor ??
        errorJson?.ShortfallInNoor ??
        0
      );
      const shortfallInRial = Number(
        insufficientObj.shortfallInRial ??
        insufficientObj.ShortfallInRial ??
        errorJson?.shortfallInRial ??
        errorJson?.ShortfallInRial ??
        0
      );

      const rawPendingItems =
        insufficientObj.pendingItems ??
        insufficientObj.PendingItems ??
        errorJson?.pendingItems ??
        errorJson?.PendingItems ??
        [];

      const pendingItems = Array.isArray(rawPendingItems) ? rawPendingItems : [];

      return {
        success: false,
        insufficientBalance: true,
        pendingItems,
        insufficientDetails: {
          currentBalanceInNoor,
          priceInNoor,
          shortfallInNoor,
          shortfallInRial,
          shortfallInToman: shortfallInRial ? Math.round(shortfallInRial / 10) : shortfallInNoor * 1000,
        },
        error:
          insufficientObj.message ||
          insufficientObj.errorMessage ||
          (errorJson.title && errorJson.title !== 'خطای اعتبارسنجی' ? errorJson.title : '') ||
          'موجودی کیف پول برای خرید این دوره‌ها کافی نیست.',
      };
    }

    // سایر خطاهای اعتبارسنجی یا سرور
    return {
      success: false,
      error: errorsList.join(' - ') || errorJson?.title || `خطا در پردازش درخواست خرید (کد خطا: ${response.status})`,
    };
  } catch (networkError) {
    console.error('[ByeMoney Purchase Error]:', networkError);
    return {
      success: false,
      error: 'خطا در برقراری ارتباط با سامانه پرداخت ByeMoney. لطفاً اتصال اینترنت خود را بررسی نمایید.',
    };
  }
}

/**
 * ایجاد درخواست افزایش اعتبار کارت‌به‌کارت (TopUp Request) در سامانه ByeMoney
 * با پیوست مشخصات دوره معلق جهت تکمیل خودکار خرید پس از تایید واریز
 * 
 * ⚠️ وابسته به تسک مجزای بک‌اند: POST /api/topup/requests
 * در صورت عدم سیم‌کشی اندپوینت، پاسخ شبیه‌سازی‌شده (Mock) بازگردانده می‌شود.
 * 
 * @param {object} params
 * @param {number} params.amountInNoor - مقدار نور درخواستی برای شارژ
 * @param {object} [params.pendingPurchaseItem] - آیتم دوره در انتظار خرید
 * @param {string} params.jwt - توکن احراز هویت
 * @returns {Promise<{ success: boolean, data?: object, isMocked?: boolean, error?: string, unauthorized?: boolean }>}
 */
export async function createTopUpRequestWithByeMoney({ amountInNoor, pendingItems, jwt }) {
  if (!jwt) {
    return {
      success: false,
      unauthorized: true,
      error: 'نشست کاربری نامعتبر است. لطفاً مجدداً وارد شوید.',
    };
  }

  const endpoint = `${BYEMONEY_API_URL}/api/topup/requests`;
  const conversionRate = 10000; // 1 نور = 10,000 ریال (1,000 تومان)
  const resolvedPendingItems = Array.isArray(pendingItems) ? pendingItems : [];

  const requestBody = {
    amount: Number(amountInNoor),
    paymentMethod: 2, // PaymentMethod.CardToCard = 2
    pendingItems: resolvedPendingItems,
  };

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (response.ok) {
      const data = await response.json();
      return {
        success: true,
        data: {
          topUpRequestId: data.topUpRequestId || data.TopUpRequestId,
          clientReferenceId: data.clientReferenceId || data.ClientReferenceId,
          amountInNoor: Number(amountInNoor),
          amountInRial: Number(amountInNoor) * conversionRate,
          amountInToman: (Number(amountInNoor) * conversionRate) / 10,
        },
      };
    }

    // فال‌بک شبیه‌سازی در صورت در دسترس نبودن موقت اندپوینت بک‌اند
    if (response.status === 404 || response.status === 501) {
      console.warn(
        `[ByeMoney TopUp API]: اندپوینت POST /api/topup/requests کد ${response.status} بازگرداند. ارائه پاسخ شبیه‌سازی‌شده (Mock).`
      );
      return getMockTopUpResponse({ amountInNoor, pendingItems: resolvedPendingItems });
    }

    const errJson = await response.json().catch(() => ({}));
    let topUpErrMsg = '';
    if (Array.isArray(errJson.errors)) {
      topUpErrMsg = errJson.errors
        .map(e => (typeof e === 'object' && e ? (e.message || e.errorMessage || e.description || '') : e))
        .filter(Boolean)
        .join(' - ');
    }
    return {
      success: false,
      error: topUpErrMsg || errJson.message || errJson.error || (errJson.title !== 'خطای اعتبارسنجی' ? errJson.title : '') || `خطا در ثبت درخواست شارژ (کد ${response.status})`,
    };
  } catch (netErr) {
    console.warn(
      '[ByeMoney TopUp API]: عدم امکان ارتباط با POST /api/topup/requests. ارائه پاسخ شبیه‌سازی‌شده (Mock).',
      netErr
    );
    return getMockTopUpResponse({ amountInNoor, pendingItems: resolvedPendingItems });
  }
}

/**
 * پاسخ شبیه‌سازی‌شده برای درخواست شارژ کارت‌به‌کارت
 */
function getMockTopUpResponse({ amountInNoor, pendingItems }) {
  const amountRial = Number(amountInNoor) * 10000;
  return {
    success: true,
    isMocked: true,
    data: {
      topUpRequestId: `mock-${Date.now()}`,
      clientReferenceId: `CR-${Math.floor(100000 + Math.random() * 900000)}`,
      amountInNoor: Number(amountInNoor),
      amountInRial: amountRial,
      amountInToman: Math.round(amountRial / 10),
      bankInfo: {
        bankName: 'بانک ملی ایران',
        cardNumber: '۶۰۳۷-۹۹۷۵-۱۲۳۴-۵۶۷۸',
        accountHolder: 'موسسه آموزشی خاک تا افلاک',
      },
      pendingItems: pendingItems || [],
      status: 'PendingPayment',
      createdAt: new Date().toISOString(),
    },
  };
}

/**
 * استعلام وضعیت دسترسی/خرید دوره در ByeMoney جهت بازاعتبارسنجی (Revalidation)
 * 
 * @param {object} params
 * @param {string} params.externalCourseId
 * @param {string} params.jwt
 * @returns {Promise<{ isEnrolled: boolean, status: string }>}
 */
export async function checkCoursePurchaseStatusWithByeMoney({ externalCourseId, jwt }) {
  if (!jwt || !externalCourseId) {
    return { isEnrolled: false, status: 'unknown' };
  }

  const endpoint = `${BYEMONEY_API_URL}/api/courses/${encodeURIComponent(externalCourseId)}/status`;

  try {
    const res = await fetch(endpoint, {
      headers: {
        Authorization: `Bearer ${jwt}`,
      },
      cache: 'no-store',
    });

    if (res.ok) {
      const data = await res.json();
      return {
        isEnrolled: Boolean(data.isEnrolled || data.hasAccess || data.status === 'Completed'),
        status: data.status || (data.isEnrolled ? 'Completed' : 'Pending'),
      };
    }

    return { isEnrolled: false, status: 'unconfirmed' };
  } catch {
    return { isEnrolled: false, status: 'unconfirmed' };
  }
}

/**
 * استعلام وضعیت دسترسی/خرید چند دوره در ByeMoney جهت بازاعتبارسنجی سبد
 * 
 * @param {object} params
 * @param {string[]} params.externalCourseIds
 * @param {string} params.jwt
 * @returns {Promise<{ allEnrolled: boolean, enrolledIds: string[], status: string }>}
 */
export async function checkCoursesPurchaseStatusWithByeMoney({ externalCourseIds, jwt }) {
  if (!jwt || !Array.isArray(externalCourseIds) || externalCourseIds.length === 0) {
    return { allEnrolled: false, enrolledIds: [], status: 'unknown' };
  }

  try {
    const results = await Promise.all(
      externalCourseIds.map(async (id) => {
        const res = await checkCoursePurchaseStatusWithByeMoney({ externalCourseId: id, jwt });
        return { id, isEnrolled: Boolean(res.isEnrolled), status: res.status };
      })
    );

    const enrolledIds = results.filter(r => r.isEnrolled).map(r => r.id);
    const allEnrolled = enrolledIds.length === externalCourseIds.length;

    return {
      allEnrolled,
      enrolledIds,
      status: allEnrolled ? 'Completed' : (enrolledIds.length > 0 ? 'PartiallyCompleted' : 'Pending'),
    };
  } catch (err) {
    console.warn('[ByeMoney checkCoursesPurchaseStatus error]:', err);
    return { allEnrolled: false, enrolledIds: [], status: 'unconfirmed' };
  }
}

/**
 * تأیید فیش واریزی و درخواست شارژ (TopUp) در پنل مدیریت ByeMoney
 * اندپوینت: POST /api/admin/topups/{id:guid}/confirm
 * 
 * @param {object} params
 * @param {string} params.topUpId - شناسه یکتای درخواست شارژ (GUID)
 * @param {string} [params.jwt] - توکن احراز هویت ادمین
 * @returns {Promise<{ success: boolean, data?: any, error?: string, status?: number }>}
 */
export async function confirmTopUpWithByeMoney({ topUpId, confirmedAmount, externalTransactionId, jwt }) {
  if (!topUpId || typeof topUpId !== 'string' || !topUpId.trim()) {
    return { success: false, error: 'شناسه تاپ‌آپ (GUID) نامعتبر است.' };
  }

  const cleanId = topUpId.trim();
  const endpoint = `${BYEMONEY_API_URL}/api/admin/topups/${encodeURIComponent(cleanId)}/confirm`;

  const requestBody = {
    externalTransactionId: externalTransactionId || `TRX-${Date.now()}`,
    confirmedAmount: Number(confirmedAmount || 0),
  };

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
      },
      body: JSON.stringify(requestBody),
    });

    if (response.ok) {
      const data = await response.json().catch(() => ({}));
      return { success: true, data };
    }

    const errJson = await response.json().catch(() => ({}));
    const errText =
      errJson.message ||
      errJson.error ||
      (Array.isArray(errJson.errors) ? errJson.errors.join(' - ') : '') ||
      `خطای سرور بای‌مانی (کد ${response.status})`;

    return { success: false, error: errText, status: response.status };
  } catch (err) {
    console.error('[ByeMoney Confirm TopUp Error]:', err);
    return { success: false, error: 'خطا در برقراری ارتباط با سرور بای‌مانی.' };
  }
}

/**
 * رد فیش واریزی و درخواست شارژ (TopUp) در پنل مدیریت ByeMoney
 * اندپوینت: POST /api/admin/topups/{id:guid}/reject
 * 
 * @param {object} params
 * @param {string} params.topUpId - شناسه یکتای درخواست شارژ (GUID)
 * @param {string} [params.reason] - علت رد فیش/واریز
 * @param {string} [params.jwt] - توکن احراز هویت ادمین
 * @returns {Promise<{ success: boolean, data?: any, error?: string, status?: number }>}
 */
export async function rejectTopUpWithByeMoney({ topUpId, reason, jwt }) {
  if (!topUpId || typeof topUpId !== 'string' || !topUpId.trim()) {
    return { success: false, error: 'شناسه تاپ‌آپ (GUID) نامعتبر است.' };
  }

  const cleanId = topUpId.trim();
  const endpoint = `${BYEMONEY_API_URL}/api/admin/topups/${encodeURIComponent(cleanId)}/reject`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
      },
      body: JSON.stringify({
        reason: reason || '',
        rejectionReason: reason || '',
      }),
    });

    if (response.ok) {
      const data = await response.json().catch(() => ({}));
      return { success: true, data };
    }

    const errJson = await response.json().catch(() => ({}));
    const errText =
      errJson.message ||
      errJson.error ||
      (Array.isArray(errJson.errors) ? errJson.errors.join(' - ') : '') ||
      `خطای سرور بای‌مانی (کد ${response.status})`;

    return { success: false, error: errText, status: response.status };
  } catch (err) {
    console.error('[ByeMoney Reject TopUp Error]:', err);
    return { success: false, error: 'خطا در برقراری ارتباط با سرور بای‌مانی.' };
  }
}
