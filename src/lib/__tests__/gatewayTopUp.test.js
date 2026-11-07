/** @jest-environment node */
jest.mock('@/lib/byeMoneySync', () => ({ BYEMONEY_API_URL: 'http://byemoney.test' }));
jest.mock('@/lib/api', () => ({ STRAPI_API_URL: 'http://strapi.test' }));

import { deliverGatewayOutcome, getTopUpConfirmation } from '@/lib/gatewayTopUp';

const VALID = 'x'.repeat(40);
const ENV_NAMES = ['FRONTEND_TO_BYEMONEY_SERVICE_KEY', 'STRAPI_TO_BYEMONEY_SERVICE_KEY', 'BYEMONEY_SERVICE_KEY', 'STRAPI_API_TOKEN'];
const saved = {};

beforeEach(() => {
  ENV_NAMES.forEach((n) => { saved[n] = process.env[n]; delete process.env[n]; });
  process.env.STRAPI_API_TOKEN = 'strapi-token';
  global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });
});
afterEach(() => {
  ENV_NAMES.forEach((n) => { if (saved[n] === undefined) delete process.env[n]; else process.env[n] = saved[n]; });
});

describe('X-Service-Key بای‌مانی', () => {
  it('کلید FRONTEND_TO_BYEMONEY_SERVICE_KEY را در هدر X-Service-Key می‌فرستد', async () => {
    process.env.FRONTEND_TO_BYEMONEY_SERVICE_KEY = VALID;
    await getTopUpConfirmation('res-1');
    expect(global.fetch.mock.calls[0][1].headers['X-Service-Key']).toBe(VALID);
  });

  it.each(['STRAPI_TO_BYEMONEY_SERVICE_KEY', 'BYEMONEY_SERVICE_KEY'])('فال‌بک %s وجود ندارد', async (legacy) => {
    process.env[legacy] = VALID;
    await expect(getTopUpConfirmation('res-1')).rejects.toThrow('FRONTEND_TO_BYEMONEY_SERVICE_KEY');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('بدون متغیر، خطای روشن بدون افشای مقدار می‌دهد و درخواست نمی‌فرستد', async () => {
    const recorded = { eventId: 'e1', result: { a: 1 } };
    const error = await deliverGatewayOutcome(recorded).catch((e) => e);
    expect(error.message).toContain('FRONTEND_TO_BYEMONEY_SERVICE_KEY');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('کلید کوتاه رد می‌شود و مقدارش در پیام نمی‌آید', async () => {
    process.env.FRONTEND_TO_BYEMONEY_SERVICE_KEY = 'short-secret';
    const error = await getTopUpConfirmation('res-1').catch((e) => e);
    expect(error.message).not.toContain('short-secret');
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
