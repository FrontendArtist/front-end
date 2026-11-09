import { getUsers, getUserDetails } from '../adminUsersApi';
import { adminFetch } from '../adminFetch';
import { getBatchBalancesWithByeMoney } from '@/lib/byeMoneyApi';

jest.mock('../adminFetch', () => ({ adminFetch: jest.fn() }));
jest.mock('@/lib/byeMoneyApi', () => ({ getBatchBalancesWithByeMoney: jest.fn() }));

const strapiUser = { id: 5, documentId: 'doc-5', username: 'u5', light: 999, giftBalance: 7, createdAt: '2026-01-01' };

beforeEach(() => {
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  adminFetch.mockImplementation(async (endpoint) => {
    if (endpoint.startsWith('/api/users/count')) return 1;
    if (endpoint.startsWith('/api/comments')) return { data: [] };
    if (endpoint.startsWith('/api/users/5')) return strapiUser;
    return [strapiUser];
  });
});

afterEach(() => jest.restoreAllMocks());

describe('adminUsersApi — موجودی فقط از بای‌مانی', () => {
  it.each([403, 500])('شکست batch-balances (%i) موجودی را نامشخص می‌کند، نه ۰ یا مقدار استرپی', async (status) => {
    getBatchBalancesWithByeMoney.mockResolvedValue({ success: false, status, error: 'x' });

    const { users } = await getUsers('jwt');

    expect(users[0].noorBalance).toBeNull();
    expect(users[0].giftBalance).toBeNull();
    expect(users[0].balanceUnavailable).toBe(true);
    expect(users[0]).not.toHaveProperty('light');
  });

  it('موفقیت batch-balances عدد بای‌مانی را برمی‌گرداند', async () => {
    getBatchBalancesWithByeMoney.mockResolvedValue({ success: true, balances: { 'doc-5': 40 }, giftBalances: { 'doc-5': 10 } });

    const { users } = await getUsers('jwt');

    expect(users[0]).toMatchObject({ noorBalance: 40, giftBalance: 10, balanceUnavailable: false });
  });

  it('جزئیات کاربر در شکست استعلام نامشخص است', async () => {
    getBatchBalancesWithByeMoney.mockResolvedValue({ success: false, status: 403 });

    const { user } = await getUserDetails(5, 'jwt');

    expect(user).toMatchObject({ noorBalance: null, giftBalance: null, balanceUnavailable: true });
    expect(user).not.toHaveProperty('light');
  });
});
