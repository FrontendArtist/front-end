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
          shortfallInToman: shortfallInRial ? Math.round(shortfallInRial / 10) : 0,
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
 * @param {object} params
 * @param {number} params.amountInNoor - مقدار نور درخواستی برای شارژ
 * @param {object} [params.pendingItems] - اقلام در انتظار خرید
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
      
      // باطل‌سازی خودکار کش نرخ نمایشی جهت همگام‌سازی بعد از ثبت شارژ
      try {
        const { invalidateConversionRateCache } = await import('@/context/DisplayRateContext');
        invalidateConversionRateCache?.();
      } catch {}

      const respAmountRial = data.amountInRial ?? data.amountRial ?? (data.rialPerNoor ? Number(amountInNoor) * Number(data.rialPerNoor) : null);
      const respAmountToman = data.amountInToman ?? (respAmountRial ? Math.round(respAmountRial / 10) : null);

      return {
        success: true,
        data: {
          topUpRequestId: data.topUpRequestId || data.TopUpRequestId,
          clientReferenceId: data.clientReferenceId || data.ClientReferenceId,
          amountInNoor: Number(amountInNoor),
          amountInRial: respAmountRial,
          amountInToman: respAmountToman,
          rialPerNoor: data.rialPerNoor ?? data.RialPerNoor ?? null,
        },
      };
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
    console.error('[ByeMoney TopUp API Error]:', netErr);
    return {
      success: false,
      error: 'خطا در برقراری ارتباط با سامانه پرداخت ByeMoney. لطفاً اتصال اینترنت خود را بررسی نمایید.',
    };
  }
}

/**
 * دریافت موجودی واقعی کیف پول نور کاربر از سامانه ByeMoney
 * اندپوینت: GET /api/wallet/balance
 * 
 * @param {object} params
 * @param {string} params.jwt - توکن احراز هویت
 * @returns {Promise<{ success: boolean, balance: number, currency: string, error?: string, unauthorized?: boolean }>}
 */
export async function getWalletBalanceWithByeMoney({ jwt }) {
  if (!jwt) {
    return {
      success: false,
      unauthorized: true,
      balance: 0,
      currency: 'Noor',
      error: 'نشست کاربری نامعتبر است. لطفاً مجدداً وارد شوید.',
    };
  }

  const endpoint = `${BYEMONEY_API_URL}/api/wallet/balance`;

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${jwt}`,
      },
      cache: 'no-store',
    });

    if (response.status === 401) {
      return {
        success: false,
        unauthorized: true,
        balance: 0,
        currency: 'Noor',
        error: 'نشست کاربری منقضی شده است.',
      };
    }

    if (response.ok) {
      const data = await response.json();
      return {
        success: true,
        balance: Number(data.balance ?? 0),
        currency: data.currency || 'Noor',
      };
    }

    const errJson = await response.json().catch(() => ({}));
    return {
      success: false,
      balance: 0,
      currency: 'Noor',
      error: errJson.message || errJson.error || `خطا در دریافت موجودی (کد ${response.status})`,
    };
  } catch (err) {
    console.error('[ByeMoney Get Wallet Balance Error]:', err);
    return {
      success: false,
      balance: 0,
      currency: 'Noor',
      error: 'خطا در برقراری ارتباط با سامانه پرداخت ByeMoney.',
    };
  }
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

/**
 * دریافت مستقیم نرخ تبدیل ریال به نور از پایگاه داده سامانه ByeMoney (جدول SystemSettings)
 * اندپوینت: GET /api/settings/conversion-rate
 *
 * ⚠️ تضمین دقت مالی: هیچ نرخ پیش‌فرض یا حدسیاتی (Fallback) وجود ندارد.
 * نرخ منحصراً از دیتابیس سامانه مالی خوانده می‌شود.
 *
 * @param {object} [params]
 * @param {string} [params.jwt] - توکن احراز هویت اختیاری
 * @returns {Promise<{ success: boolean, rialPerNoor?: number, tomanPerNoor?: number, error?: string }>}
 */
export async function getConversionRateWithByeMoney({ jwt } = {}) {
  const endpoint = `${BYEMONEY_API_URL}/api/settings/conversion-rate`;
  try {
    const headers = {};
    if (jwt) headers['Authorization'] = `Bearer ${jwt}`;

    const response = await fetch(endpoint, {
      method: 'GET',
      headers,
      cache: 'no-store',
    });

    if (response.ok) {
      const data = await response.json().catch(() => ({}));
      const rialPerNoor = Number(data.rialPerNoor);
      const tomanPerNoor = Number(data.tomanPerNoor ?? (rialPerNoor ? rialPerNoor / 10 : 0));

      if (rialPerNoor > 0) {
        return {
          success: true,
          rialPerNoor,
          tomanPerNoor,
        };
      }
    }

    const errJson = await response.json().catch(() => ({}));
    return {
      success: false,
      error: errJson.error || errJson.message || `خطا در واکشی نرخ تبدیل از دیتابیس بای‌مانی (کد ${response.status})`,
    };
  } catch (err) {
    console.error('[ByeMoney getConversionRate error]:', err);
    return {
      success: false,
      error: 'خطا در ارتباط با سرور بای‌مانی جهت دریافت نرخ رسمی تبدیل.',
    };
  }
}

/**
 * دریافت متمرکز کلیه مجوزها و نقش‌های ادمین در سامانه ByeMoney
 * اندپوینت: GET /api/admin/topups/permissions (یا اندپوینت متمرکز پرمیژن‌ها در فاز ارتقا)
 * 
 * @param {object} params
 * @param {string} params.jwt - توکن احراز هویت ادمین
 * @returns {Promise<{ roles: string[], permissions: string[], isLoaded: boolean, error?: string }>}
 */
export async function getAdminCurrentUserPermissions({ jwt }) {
  if (!jwt) {
    return { roles: [], permissions: [], isLoaded: false, error: 'نشست کاربری نامعتبر است.' };
  }

  const endpoint = `${BYEMONEY_API_URL}/api/admin/topups/permissions`;

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${jwt}`,
      },
      cache: 'no-store',
    });

    if (response.ok) {
      const data = await response.json().catch(() => ({}));
      
      // اگر بک‌اند فرمت مدرن آرایه permissions را فرستاد
      if (Array.isArray(data.permissions)) {
        return {
          roles: Array.isArray(data.roles) ? data.roles : [],
          permissions: data.permissions,
          isLoaded: true,
        };
      }

      // در صورت دریافت فرمت قبلی TopUp permissions از ByeMoney:
      // فقط مجوز TopUp.Review در صورتی که فلگ canReviewTopUps یا canAssistTopUp باشد معتبر است
      const permissions = [];
      const canReview = data.canReviewTopUps ?? data.canAssistTopUp ?? false;
      if (canReview) {
        permissions.push('TopUp.Review');
      }

      return {
        roles: Array.isArray(data.roles) ? data.roles : [],
        permissions,
        isLoaded: true,
      };
    }

    return { roles: [], permissions: [], isLoaded: false, error: `خطا در دریافت مجوزها (وضعیت: ${response.status})` };
  } catch (err) {
    console.error('[ByeMoney getAdminCurrentUserPermissions error]:', err);
    return { roles: [], permissions: [], isLoaded: false, error: err.message };
  }
}

/**
 * بررسی مجوز مالی ادمین در سامانه ByeMoney جهت ثبت شارژ کارت‌به‌کارت
 * اندپوینت: GET /api/admin/topups/permissions
 * 
 * @param {object} params
 * @param {string} params.jwt - توکن احراز هویت ادمین
 * @returns {Promise<{ hasPermission: boolean, canReviewTopUps?: boolean, error?: string }>}
 */
export async function checkAdminTopUpPermissionWithByeMoney({ jwt }) {
  const result = await getAdminCurrentUserPermissions({ jwt });
  const hasPermission = result.permissions.includes('TopUp.Review');
  return {
    hasPermission,
    canReviewTopUps: hasPermission,
    error: result.error,
  };
}

/**
 * ثبت شارژ کارت‌به‌کارت ادمین به‌نیابت از کاربر ناتوان در سامانه ByeMoney
 * اندپوینت: POST /api/admin/topups/assisted
 * 
 * @param {object} params
 * @param {string} params.beneficiaryExternalUserId - شناسه پایدار کاربر ذینفع در استرپی (documentId یا id)
 * @param {number} params.amountRial - مبلغ تراکنش به ریال
 * @param {File|Blob} params.receipt - تصویر فیش واریزی (اجباری)
 * @param {string} [params.externalTransactionId] - شناسه/کد پیگیری تراکنش خارجی (اختیاری)
 * @param {string} [params.idempotencyKey] - شناسه یکتا جهت جلوگیری از تراکنش تکراری (اختیاری)
 * @param {string} params.jwt - توکن احراز هویت ادمین
 * @returns {Promise<{ success: boolean, data?: { topUpRequestId: string, clientReferenceId: string, amountNoor: number, rialPerNoor: number }, error?: string, status?: number }>}
 */
export async function createAdminAssistedTopUpWithByeMoney({
  beneficiaryExternalUserId,
  amountRial,
  receipt,
  externalTransactionId,
  idempotencyKey,
  jwt,
}) {
  if (!jwt) {
    return { success: false, error: 'نشست کاربری نامعتبر است. لطفاً مجدداً وارد شوید.' };
  }

  if (!beneficiaryExternalUserId) {
    return { success: false, error: 'شناسه کاربر ذینفع نامعتبر است.' };
  }

  const numericAmount = Number(amountRial);
  if (!numericAmount || numericAmount <= 0) {
    return { success: false, error: 'مبلغ ریالی وارد شده نامعتبر است.' };
  }

  if (!receipt) {
    return { success: false, error: 'آپلود تصویر رسید/فیش واریزی الزامی است.' };
  }

  const key = idempotencyKey || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `idemp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`);
  const endpoint = `${BYEMONEY_API_URL}/api/admin/topups/assisted`;

  const formData = new FormData();
  formData.append('beneficiaryExternalUserId', String(beneficiaryExternalUserId));
  formData.append('amountRial', String(numericAmount));
  formData.append('receipt', receipt);
  if (externalTransactionId && typeof externalTransactionId === 'string' && externalTransactionId.trim()) {
    formData.append('externalTransactionId', externalTransactionId.trim());
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${jwt}`,
        'Idempotency-Key': key,
      },
      body: formData,
    });

    if (response.ok) {
      const data = await response.json().catch(() => ({}));
      try {
        const { invalidateConversionRateCache } = await import('@/context/DisplayRateContext');
        invalidateConversionRateCache?.();
      } catch {}

      return {
        success: true,
        data: {
          topUpRequestId: data.topUpRequestId || data.TopUpRequestId,
          clientReferenceId: data.clientReferenceId || data.ClientReferenceId,
          amountNoor: Number(data.amountNoor ?? data.AmountNoor ?? 0),
          rialPerNoor: Number(data.rialPerNoor ?? data.RialPerNoor ?? 0),
        },
      };
    }

    if (response.status === 403) {
      return {
        success: false,
        status: 403,
        error: 'شما مجوز مالی لازم جهت ثبت شارژ برای کاربر را در سامانه مالی بای‌مانی ندارید.',
      };
    }

    const errJson = await response.json().catch(() => ({}));
    let errMsg = '';
    if (errJson.error) errMsg = errJson.error;
    else if (errJson.message) errMsg = errJson.message;
    else if (Array.isArray(errJson.errors)) errMsg = errJson.errors.join(' - ');

    return {
      success: false,
      status: response.status,
      error: errMsg || `خطا در پردازش شارژ کارت‌به‌کارت (کد خطا: ${response.status})`,
    };
  } catch (err) {
    console.error('[ByeMoney createAdminAssistedTopUp Error]:', err);
    return {
      success: false,
      error: 'خطا در برقراری ارتباط مستقیم با سامانه بای‌مانی. لطفاً اتصال اینترنت خود را بررسی کنید.',
    };
  }
}

/**
 * استعلام دسته‌جمعی موجودی کیف‌پول کاربران از سامانه ByeMoney (مخصوص ادمین)
 * اندپوینت: POST /api/admin/wallets/batch-balances
 * 
 * @param {object} params
 * @param {string[]} params.userIds - آرایه‌ای از شناسه‌های یکتای کاربران (documentId یا id)
 * @param {string} params.jwt - توکن احراز هویت ادمین
 * @returns {Promise<{ success: boolean, balances: Record<string, number>, error?: string, status?: number }>}
 */
export async function getBatchBalancesWithByeMoney({ userIds, jwt }) {
  if (!jwt) {
    return {
      success: false,
      balances: {},
      error: 'نشست کاربری نامعتبر است. لطفاً مجدداً وارد شوید.',
    };
  }

  const cleanUserIds = Array.isArray(userIds)
    ? userIds.map(id => (typeof id === 'string' ? id.trim() : String(id || ''))).filter(Boolean)
    : [];

  if (cleanUserIds.length === 0) {
    return {
      success: true,
      balances: {},
    };
  }

  // طبق اعتبارسنجی سامانه ByeMoney، حداکثر ۵۰۰ شناسه در هر درخواست مجاز است
  const distinctIds = Array.from(new Set(cleanUserIds)).slice(0, 500);
  const endpoint = `${BYEMONEY_API_URL}/api/admin/wallets/batch-balances`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({
        userIds: distinctIds,
      }),
      cache: 'no-store',
    });

    if (response.ok) {
      const data = await response.json().catch(() => ({}));
      const rawBalances = data.balances || data.Balances || {};
      const normalizedBalances = {};

      for (const [key, value] of Object.entries(rawBalances)) {
        normalizedBalances[key] = Number(value ?? 0);
      }

      return {
        success: true,
        balances: normalizedBalances,
      };
    }

    if (response.status === 401 || response.status === 403) {
      return {
        success: false,
        status: response.status,
        balances: {},
        error: response.status === 401
          ? 'نشست کاربری شما منقضی شده است.'
          : 'شما دسترسی لازم برای استعلام دسته‌جمعی موجودی کاربران را ندارید.',
      };
    }

    const errJson = await response.json().catch(() => ({}));
    let errMsg = '';
    if (errJson.error) errMsg = errJson.error;
    else if (errJson.message) errMsg = errJson.message;
    else if (Array.isArray(errJson.errors)) errMsg = errJson.errors.join(' - ');

    return {
      success: false,
      status: response.status,
      balances: {},
      error: errMsg || `خطا در دریافت موجودی دسته‌جمعی کاربران (کد خطا: ${response.status})`,
    };
  } catch (err) {
    console.error('[ByeMoney getBatchBalances Error]:', err);
    return {
      success: false,
      balances: {},
      error: 'خطا در برقراری ارتباط با سامانه بای‌مانی.',
    };
  }
}

/**
 * خرید دوره‌های آموزشی به‌نیابت از کاربر توسط ادمین با کسر از موجودی نور کاربر در سامانه ByeMoney
 * اندپوینت: POST /api/admin/courses/purchase
 *
 * @param {object} params
 * @param {string} params.beneficiaryExternalUserId - شناسه پایدار کاربر ذینفع در استراپی (documentId یا id)
 * @param {string[]} params.externalCourseIds - شناسه‌های پایدار دوره‌ها در استراپی (documentId)
 * @param {string} params.jwt - توکن احراز هویت ادمین
 * @returns {Promise<{
 *   success: boolean,
 *   data?: { transactionId: string, totalPriceInNoor: number, items: Array<{ purchaseId: string, externalCourseId: string, courseTitle: string, priceInNoor: number, status: string }>, purchasedAtUtc: string },
 *   error?: string,
 *   conflict?: boolean,
 *   insufficientBalance?: boolean,
 *   unauthorized?: boolean,
 *   notFound?: boolean
 * }>}
 */
export async function purchaseCoursesAsAdminWithByeMoney({ beneficiaryExternalUserId, externalCourseIds, isFree = false, freeReason = null, jwt }) {
  if (!jwt) {
    return {
      success: false,
      unauthorized: true,
      error: 'نشست کاربری نامعتبر است. لطفاً مجدداً وارد شوید.',
    };
  }

  if (!beneficiaryExternalUserId) {
    return {
      success: false,
      error: 'شناسه کاربر ذینفع معتبر نیست.',
    };
  }

  let ids = [];
  if (Array.isArray(externalCourseIds)) {
    ids = externalCourseIds
      .map(id => (typeof id === 'string' ? id.trim() : String(id || '')))
      .filter(Boolean);
  }

  if (ids.length === 0) {
    return {
      success: false,
      error: 'شناسه دوره‌های انتخابی (documentId) مشخص نشده است.',
    };
  }

  // حذف شناسه‌های تکراری جهت انطباق با قوانین یکتایی سبد در سامانه مالی ByeMoney
  const distinctIds = Array.from(new Set(ids));
  const endpoint = `${BYEMONEY_API_URL}/api/admin/courses/purchase`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({
        beneficiaryExternalUserId: String(beneficiaryExternalUserId).trim(),
        externalCourseIds: distinctIds,
        isFree: Boolean(isFree),
        freeReason: freeReason ? String(freeReason).trim() : null,
      }),
    });

    if (response.status === 200) {
      const data = await response.json();
      return {
        success: true,
        data,
      };
    }

    if (response.status === 401) {
      return {
        success: false,
        unauthorized: true,
        error: 'نشست کاربری شما منقضی شده است. لطفاً مجدداً وارد شوید.',
      };
    }

    if (response.status === 403) {
      return {
        success: false,
        error: 'شما دسترسی مدیریت مالی لازم جهت خرید دوره به‌نیابت از کاربر را ندارید.',
      };
    }

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

    if (response.status === 409) {
      return {
        success: false,
        conflict: true,
        error: firstErrorMsg || 'این کاربر قبلاً این دوره آموزشی را خریداری کرده است.',
      };
    }

    if (response.status === 404) {
      return {
        success: false,
        notFound: true,
        error: firstErrorMsg || 'دوره یا کاربر مورد نظر در سامانه مالی ByeMoney یافت نشد.',
      };
    }

    const isInsufficient =
      firstErrorMsg.includes('موجودی') ||
      firstErrorMsg.includes('INSUFFICIENT') ||
      firstErrorMsg.includes('کافی نیست');

    return {
      success: false,
      insufficientBalance: isInsufficient,
      error: errorsList.join(' - ') || errorJson?.title || `خطا در کسر موجودی نور از سامانه ByeMoney (کد خطا: ${response.status})`,
    };
  } catch (netErr) {
    console.error('[ByeMoney Admin Purchase Error]:', netErr);
    return {
      success: false,
      error: 'خطا در برقراری ارتباط با سامانه پرداخت ByeMoney.',
    };
  }
}

