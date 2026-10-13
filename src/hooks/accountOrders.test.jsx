import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { Providers } from '@/app/providers';
import OrdersList from '@/components/profile/OrdersList';
import CourseCard from '@/components/cards/CourseCard/CourseCard';
import AddToCartButton from '@/components/ui/AddToCartButton/AddToCartButton';
import { useOrderNotifications } from '@/hooks/useOrderNotifications';
import CartSyncProvider from '@/components/providers/CartSyncProvider';
import { useOrdersStore } from '@/store/useOrdersStore';
import { useCartStore } from '@/store/useCartStore';
import { fetchClientOrders } from '@/lib/client/ordersClientApi';
import { fetchProfileCartData, updateProfileCartData } from '@/lib/client/profileClientApi';
let mockSession;
jest.mock('next-auth/react',()=>({useSession:()=>mockSession,SessionProvider:({children})=>children}));
jest.mock('@/lib/client/ordersClientApi',()=>({fetchClientOrders:jest.fn()}));
jest.mock('@/lib/client/profileClientApi',()=>({setProfileUser:jest.fn(),fetchProfileCartData:jest.fn(),updateProfileCartData:jest.fn().mockResolvedValue({})}));
jest.mock('@/store/useUserMessagesStore',()=>({useUserMessagesStore:Object.assign((selector)=>selector({messages:[],isLoading:false,hasFetched:true,fetchMessages:jest.fn()}),{getState:()=>({fetchMessages:jest.fn()})})}));
jest.mock('next/image',()=>({__esModule:true,default:()=>null}));
jest.mock('@/components/ui/DiscountCountdown/DiscountCountdown',()=>()=>null);
jest.mock('@/components/ui/GradientBorderCard/GradientBorderCard',()=>({children})=><div>{children}</div>);
const course={image:{url:'/course.png'},id:8,type:'course',slug:'course-one',title:'دوره آزمون',price:100};
const other={id:9,type:'course',slug:'course-two',title:'دوره دوم',price:100};
const paid=(id,item)=>({id,documentId:`order-${id}`,paymentStatus:'paid',items:[{...item,courseId:item.id}]});
const deferred=()=>{let resolve;const promise=new Promise(r=>{resolve=r});return {promise,resolve};};
const login=id=>{mockSession=id==null?{status:'unauthenticated',data:null}:{status:'authenticated',data:{user:{id,jwt:`token-${id}`}}};};
const App=()=> <Providers><OrdersList/><CourseCard course={course}/><CartSyncProvider/></Providers>;
beforeEach(()=>{
 jest.clearAllMocks();login(1);useOrdersStore.getState().setOrdersUser(null);
 useCartStore.setState({items:[],userId:null,hydratedUserId:null,processedOrders:{},appliedCoupon:null});
 fetchProfileCartData.mockResolvedValue({cartData:null});
});
test('خروج و ورود بدون بارگذاری مجدد نمایش و مالکیت را عوض می‌کند و سبد حساب دوم درست پاک می‌شود',async()=>{
 fetchClientOrders.mockResolvedValueOnce({data:[paid(11,course)]}).mockResolvedValueOnce({data:[paid(22,other)]});
 const view=render(<App/>);
 await waitFor(()=>expect(screen.getByText('سفارش #11')).toBeTruthy());expect(screen.getByText('مشاهده دوره')).toBeTruthy();
 act(()=>{login(null);view.rerender(<App/>);});expect(screen.queryByText('سفارش #11')).toBeNull();expect(screen.queryByText('مشاهده دوره')).toBeNull();
 fetchProfileCartData.mockResolvedValue({cartData:{state:{items:[course,other]}}});
 act(()=>{login(2);view.rerender(<App/>);});expect(screen.queryByText('سفارش #11')).toBeNull();
 await waitFor(()=>expect(screen.getByText('سفارش #22')).toBeTruthy());
 expect(screen.queryByText('مشاهده دوره')).toBeNull();await waitFor(()=>expect(useCartStore.getState().items).toEqual([course]));
 expect(fetchClientOrders).toHaveBeenCalledTimes(2);
});
test('پاسخ دیرهنگام سفارش و پروفایل حساب اول سبد یا نمایش حساب دوم را عوض نمی‌کند',async()=>{
 const orders=deferred(),profile=deferred();
 fetchClientOrders.mockReturnValueOnce(orders.promise).mockResolvedValueOnce({data:[]});
 fetchProfileCartData.mockReturnValueOnce(profile.promise).mockResolvedValueOnce({cartData:{state:{items:[course]}}});
 const view=render(<App/>);act(()=>{login(2);view.rerender(<App/>);});
 await waitFor(()=>expect(useCartStore.getState().hydratedUserId).toBe(2));
 await act(async()=>{orders.resolve({data:[paid(11,course)]});profile.resolve({cartData:{state:{items:[other]}}});});
 expect(screen.queryByText('سفارش #11')).toBeNull();expect(screen.queryByText('مشاهده دوره')).toBeNull();expect(useCartStore.getState().items).toEqual([course]);
});

function Notifications({ label }) { const { notifications }=useOrderNotifications(); return <span data-testid={label}>{notifications.map(n=>n.id).join(',')}</span>; }
test('اعلان سفارش و دکمهٔ سفارش معلق با تغییر مستقیم حساب، دادهٔ قبلی را نشان نمی‌دهند',async()=>{
 fetchClientOrders.mockResolvedValueOnce({data:[paid(11,course),{id:12,documentId:'pending-one',paymentMethod:'card_to_card',paymentStatus:'pending_payment',items:[course]}]}).mockResolvedValueOnce({data:[]});
 const Page=()=> <Providers><Notifications label="notifications"/><AddToCartButton course={course}/></Providers>;
 const view=render(<Page/>);await waitFor(()=>expect(screen.getByText('منتظر ارسال فیش')).toBeTruthy());
 expect(screen.getByTestId('notifications').textContent).toBe('order-11_confirmed');
 act(()=>{login(2);view.rerender(<Page/>);});
 expect(screen.queryByText('منتظر ارسال فیش')).toBeNull();expect(screen.getByTestId('notifications').textContent).toBe('');
 await waitFor(()=>expect(useOrdersStore.getState().hasFetched).toBe(true));
 expect(screen.getByRole('button',{name:'افزودن دوره آزمون به سبد خرید'})).toBeTruthy();
});

test('پس از حذف یکی از مشترکان، رفرش تب فقط برای حساب فعلی و یک بار انجام می‌شود',async()=>{
 fetchClientOrders.mockResolvedValue({data:[]});
 const Page=({first})=><Providers>{first && <Notifications label="first"/>}<Notifications label="second"/></Providers>;
 const view=render(<Page first/>);await waitFor(()=>expect(useOrdersStore.getState().hasFetched).toBe(true));
 act(()=>view.rerender(<Page first={false}/>));
 act(()=>{login(2);view.rerender(<Page first={false}/>);});
 await waitFor(()=>expect(useOrdersStore.getState()).toMatchObject({userId:'2',hasFetched:true}));
 const count=fetchClientOrders.mock.calls.length;
 const clock=jest.spyOn(Date,'now').mockReturnValue(Date.now()+120000);
 const visibility=jest.spyOn(document,'visibilityState','get').mockReturnValue('visible');
 try {
  await act(async()=>document.dispatchEvent(new Event('visibilitychange')));
  expect(fetchClientOrders).toHaveBeenCalledTimes(count+1);
  expect(useOrdersStore.getState().userId).toBe('2');
 } finally {clock.mockRestore();visibility.mockRestore();}
});
