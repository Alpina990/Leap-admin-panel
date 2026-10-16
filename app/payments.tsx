export type Order={id:string;learnerId:string|null;customerName?:string|null;source?:"app"|"crm";matchState?:"matched"|"unmatched"|"ignored";recordedInCrm?:boolean;sectionId:string|null;amountTiyin:string;currency:string;gateway:string;method:string;status:string;createdAt:string;paidAt:string|null;cancelledAt:string|null;externalId:string|null;includedInSales?:boolean|null;gatewayOrderId:string|null;gatewayPaymentId:string|null;canDelete?:boolean;manualTransactionId?:string|null;manualTransactionVersion?:number|null;receiptAvailable?:boolean};
export type Orders={items:Order[];total:number;limit:number;offset:number;hasMore:boolean};
export type Payment={order:Order;entitlement:{source:string;grantedAt:string;expiresAt:string|null;revokedAt:string|null;matchesPayment:boolean}|null};
export function money(order:Order){const amount=BigInt(order.amountTiyin);return `${(amount/BigInt(100)).toLocaleString('en-US')}.${String(amount%BigInt(100)).padStart(2,'0')} ${order.currency}`;}
export type Withdrawal={id:string;entryType:"withdrawal";amount:number;signedAmount:number;note:string|null;actor:string;createdAt:string};
export type Withdrawals={items:Withdrawal[];total:number;limit:number;offset:number;hasMore:boolean;withdrawnTotal:string};
export function withdrawalMoney(amount:number){return `${amount.toLocaleString('en-US')} so‘m`;}
export function withdrawalMoneyCompact(amount:number){
  if(amount>=1_000_000)return `${(amount/1_000_000).toFixed(1).replace(/\.0$/,"")}M so‘m`;
  if(amount>=1_000)return `${(amount/1_000).toFixed(1).replace(/\.0$/,"")}K so‘m`;
  return `${amount.toLocaleString('en-US')} so‘m`;
}
