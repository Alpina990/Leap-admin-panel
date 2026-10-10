import {formatAdminDateTime} from './admin-date-time.mjs';

// Source facts only: top-level revenue/count/series are already combined by API.
// Never add CRM figures to those totals in the browser.
export function salesDetails(summary){
 const sales=summary?.sales,sync=summary?.crmSync;
 const amount=value=>{const tiyin=BigInt(value);return `${(tiyin/100n).toLocaleString('en-US')}.${String(tiyin%100n).padStart(2,'0')} UZS`;};
 const n=value=>value.toLocaleString('en-US');
 return [
  ['App sotuvlari',sales?`${n(sales.appPaidOrders)} · ${amount(sales.appRevenueTiyin)}`:'Mavjud emas'],
  ['CRM sotuvlari',sales?`${n(sales.crmSales)} · ${amount(sales.crmRevenueTiyin)}`:'Mavjud emas'],
  ['CRM takrorlari',sales?`${n(sales.crmMirrored)} · qayta hisoblanmaydi`:'Mavjud emas'],
  ['CRM profil holati',sales?`${n(sales.crmMatched)} ulangan · ${n(sales.crmUnmatched)} ulanmagan`:'Mavjud emas'],
  ['CRM oxirgi sync',sync?.lastSuccessAt?formatAdminDateTime(sync.lastSuccessAt):sync?'Hali muvaffaqiyatli sync yo‘q':'Mavjud emas'],
  // Do not echo raw upstream error text, which may include integration details.
  ['CRM sync holati',!sync?'Mavjud emas':(sync.status==='error'||sync.lastError)?'Sync xatosi · qayta tekshirish kerak':sync.lastSuccessAt?'Oxirgi sync muvaffaqiyatli':'Hali tasdiqlanmagan'],
  ['CRM oxirgi natija',sync?`${n(sync.lastRunSalesCreated)} yangi · ${n(sync.lastRunUnmatched)} ulanmagan`:'Mavjud emas'],
 ];
}
export function salesEligibility(order){
 return order.includedInSales===true?'Hisoblangan':order.includedInSales===false?'Hisoblanmagan':'Mavjud emas';
}
export function transactionIdentity(order){
 const crm=order.source==='crm'||order.gateway==='CRM';
 return {learnerId:order.learnerId??null,label:order.learnerId?`ID ${order.learnerId}`:crm?'CRM · profil ulanmagan':'Profil mavjud emas',detail:crm?'CRM':order.source==='app'?'App':'—'};
}
