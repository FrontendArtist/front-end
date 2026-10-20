import { getAdminCoursePurchaseReceipt, getCoursePurchaseReceipt } from '../byeMoneyApi';

jest.mock('../byeMoneySync.js', () => ({ BYEMONEY_API_URL: 'https://byemoney.test' }));

const originalFetch = global.fetch;
beforeEach(() => { global.fetch = jest.fn(); });
afterAll(() => { global.fetch = originalFetch; });

test.each([
  ['admin', getAdminCoursePurchaseReceipt],
  ['me', getCoursePurchaseReceipt],
])('%s receipt uses its own route and preserves the receipt snapshot', async (scope, readReceipt) => {
  const data = { purchaseId: 'purchase-one', finalAmountInNoor: 25, cartSummary: null };
  fetch.mockResolvedValue({ status: 200, json: async () => data });
  const controller = new AbortController();
  await expect(readReceipt({ jwt: 'session-token', purchaseId: 'purchase/one', signal: controller.signal }))
    .resolves.toEqual({ success: true, data });
  expect(fetch).toHaveBeenCalledWith(`https://byemoney.test/api/${scope}/course-purchases/purchase%2Fone`, {
    method: 'GET', headers: { Authorization: 'Bearer session-token', 'Content-Type': 'application/json' },
    cache: 'no-store', signal: controller.signal,
  });
});

test.each([
  [401, 'unauthorized'],
  [403, 'forbidden'],
  [404, 'notFound'],
])('admin receipt reports %s without falling back to the personal route', async (status, flag) => {
  fetch.mockResolvedValue({ status });
  await expect(getAdminCoursePurchaseReceipt({ jwt: 'jwt', purchaseId: 'purchase-one' }))
    .resolves.toMatchObject({ success: false, [flag]: true });
  expect(fetch).toHaveBeenCalledTimes(1);
});

test('personal receipt preserves the ownership rejection', async () => {
  fetch.mockResolvedValue({ status: 404 });
  await expect(getCoursePurchaseReceipt({ jwt: 'other-user', purchaseId: 'purchase-one' }))
    .resolves.toMatchObject({ success: false, notFound: true });
  expect(fetch).toHaveBeenCalledTimes(1);
});

test('admin receipt requires a token and purchase identifier before sending a request', async () => {
  for (const params of [undefined, { jwt: 'jwt' }, { purchaseId: 'purchase-one' }]) {
    await expect(getAdminCoursePurchaseReceipt(params)).resolves.toMatchObject({ success: false });
  }
  expect(fetch).not.toHaveBeenCalled();
});

test('admin receipt propagates cancellation', async () => {
  const error = new DOMException('Canceled', 'AbortError');
  fetch.mockRejectedValue(error);
  await expect(getAdminCoursePurchaseReceipt({ jwt: 'jwt', purchaseId: 'purchase-one' })).rejects.toBe(error);
});
