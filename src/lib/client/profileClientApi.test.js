import { setProfileUser, fetchProfileCartData, updateProfileCartData, invalidateProfileCache } from './profileClientApi';
const deferred=()=>{let resolve;const promise=new Promise(r=>{resolve=r});return {promise,resolve};};
const response=data=>({ok:true,json:async()=>data});
beforeEach(()=>{setProfileUser(null);invalidateProfileCache();global.fetch=jest.fn();});
test('پاسخ پروفایل قبلی به درخواست حساب دوم متصل نمی‌شود و کش آن را تغییر نمی‌دهد',async()=>{
 const a=deferred(),b=deferred(); fetch.mockReturnValueOnce(a.promise).mockReturnValueOnce(b.promise);
 setProfileUser(1);const old=fetchProfileCartData(true,1);setProfileUser(2);const current=fetchProfileCartData(true,2);
 a.resolve(response({id:1}));expect(await old).toBeNull();const shared=fetchProfileCartData(true,2);expect(fetch).toHaveBeenCalledTimes(2);
 b.resolve(response({id:2}));expect(await current).toEqual({id:2});expect(await shared).toEqual({id:2});expect(await fetchProfileCartData(false,2)).toEqual({id:2});
});
test('پاسخ دیرهنگام ذخیرهٔ سبد قبلی وارد کش حساب جدید نمی‌شود',async()=>{
 const a=deferred(); fetch.mockReturnValueOnce(a.promise).mockResolvedValueOnce(response({id:2}));
 setProfileUser(1);const old=updateProfileCartData(null,1);setProfileUser(2);await fetchProfileCartData(false,2);
 a.resolve(response({id:1}));expect(await old).toBeNull();expect(await fetchProfileCartData(false,2)).toEqual({id:2});
 await updateProfileCartData(null,1);expect(fetch).toHaveBeenCalledTimes(2);
});
