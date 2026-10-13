import { useOrdersStore, selectAccountOrders } from './useOrdersStore';
import { fetchClientOrders } from '@/lib/client/ordersClientApi';
jest.mock('@/lib/client/ordersClientApi', () => ({ fetchClientOrders: jest.fn() }));
const deferred = () => { let resolve, reject; const promise = new Promise((a,b) => { resolve=a; reject=b; }); return { promise, resolve, reject }; };
beforeEach(() => { jest.clearAllMocks(); useOrdersStore.getState().setOrdersUser(null); });
test('حافظه و درخواست مشترک فقط متعلق به همان نشست هستند', async () => {
    const a = deferred(), b = deferred();
    fetchClientOrders.mockReturnValueOnce(a.promise).mockReturnValueOnce(b.promise);
    useOrdersStore.getState().setOrdersUser(1);
    const old = useOrdersStore.getState().fetchOrders();
    useOrdersStore.getState().setOrdersUser(2);
    const current = useOrdersStore.getState().fetchOrders();
    a.resolve({ data: [{ id: 11 }] });
    expect(await old).toEqual([]);
    expect(useOrdersStore.getState().isLoading).toBe(true);
    const shared = useOrdersStore.getState().fetchOrders(true);
    expect(fetchClientOrders).toHaveBeenCalledTimes(2);
    b.resolve({ data: [{ id: 22 }] });
    expect(await current).toEqual([{ id: 22 }]);
    expect(await shared).toEqual([{ id: 22 }]);
    expect(selectAccountOrders(useOrdersStore.getState(), 1)).toEqual([]);
    await useOrdersStore.getState().fetchOrders();
    expect(fetchClientOrders).toHaveBeenCalledTimes(2);
});
test.each(['resolve','reject'])('پاسخ یا خطای دیرهنگام حساب اول پس از پاسخ دوم بی‌اثر است: %s', async (method) => {
    const a = deferred(); fetchClientOrders.mockReturnValueOnce(a.promise).mockResolvedValueOnce({ data: [{ id: 22 }] });
    useOrdersStore.getState().setOrdersUser(1); const old = useOrdersStore.getState().fetchOrders();
    useOrdersStore.getState().setOrdersUser(2); await useOrdersStore.getState().fetchOrders();
    a[method](method === 'reject' ? new Error('خطای حساب قبلی') : { data: [{ id: 11 }] }); await old;
    expect(useOrdersStore.getState()).toMatchObject({ orders: [{ id: 22 }], error: null, hasFetched: true, isLoading: false });
});
test('خروج و ورود دوباره به همان حساب پاسخ نشست قدیمی را زنده نمی‌کند', async () => {
    const a=deferred(); fetchClientOrders.mockReturnValueOnce(a.promise).mockResolvedValueOnce({ data: [] });
    useOrdersStore.getState().setOrdersUser(1); const old=useOrdersStore.getState().fetchOrders();
    useOrdersStore.getState().setOrdersUser(null);
    await useOrdersStore.getState().fetchOrders(); expect(fetchClientOrders).toHaveBeenCalledTimes(1);
    useOrdersStore.getState().setOrdersUser(1); await useOrdersStore.getState().fetchOrders();
    a.resolve({ data: [{ id: 11 }] }); await old; expect(useOrdersStore.getState().orders).toEqual([]);
});
