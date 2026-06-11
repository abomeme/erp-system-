/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ContactType = 'supplier' | 'customer' | 'worker';

export interface InvoiceItem {
  id: string;
  productId: string;
  productName: string;
  regionName: string;
  typeName: string; // التصنيف/النوع
  gradeName: string; // الدرجة
  unitName: string;  // الوحدة
  qty: number;
  price: number;
  total: number;
  priceType?: 'retail' | 'wholesale' | 'special' | 'offer'; // نوع سعر البيع المختار
}

export interface LedgerEntry {
  id: string;
  type: 'invoice' | 'payment'; // invoice increases outstanding balance, payment settles/reduces it
  date: string;
  number: string; // e.g. INV-0112 or PAY-4912
  description: string;
  total: number; // gross amount
  paid: number; // for invoice: amount paid. For payment: equal to total
  paymentMethod?: 'cash' | 'bank'; // نقداً أو البنك
  paymentRef?: string; // Ref number or check number
  items?: InvoiceItem[]; // تفاصيل بنود الفاتورة إن وجدت
  accountantName?: string; // اسم المحاسب الذي قام بإصدار المستند
  isRepayment?: boolean; // هل هذا سداد لسلفية (في حسابات العمال)
  isAdvance?: boolean; // هل هذه سلفية منصرفة (في حسابات العمال)
  transportExpense?: number; // مبلغ الترحيل
  carryingExpense?: number; // مبلغ العتالة
  otherInvoiceExpense?: number; // منصرفات أخرى خاصة بالفاتورة
  expensePaymentMethod?: 'cash' | 'bank'; // طريقة دفع منصرفات الفاتورة
  discount?: number; // قيمة الخصم الممنوح من إجمالي الفاتورة
}

export interface Contact {
  id: string;
  type: ContactType;
  code: string; // e.g. SUP-99021, CUST-10492, WRK-5011
  name: string; // Display name
  nameEn: string; // English translation name
  phone?: string;
  email?: string;
  lastActive: string;
  notes: string;
  salary?: number; // الراتب الأساسي الشهري
  hireDate?: string; // تاريخ التعيين للعامل
}

// الكيانات المخصصة للفاكهة والمخازن والأسعار
export interface Product {
  id: string;
  name: string;
}

export interface Region {
  id: string;
  name: string;
}

export interface ProductType {
  id: string;
  name: string;
}

export interface Grade {
  id: string;
  name: string;
}

export interface Unit {
  id: string;
  name: string;
}

export interface InventoryItem {
  id: string;
  productId: string;
  productName: string;
  regionName: string;
  typeName: string;
  gradeName: string;
  unitName: string;
  qty: number;
  buyPrice: number;
  sellPrice: number;
}

export interface ProductPrice {
  id: string;
  productId: string;
  productName: string;
  regionName: string;
  typeName: string;
  gradeName: string;
  priceRetail: number;
  priceWholesale: number;
  priceSpecial: number;
  priceOffer: number;
}

export interface TreasuryBankMovement {
  id: string;
  type: 'deposit' | 'withdrawal' | 'transfer';
  source: 'treasury' | 'bank';
  destination?: 'treasury' | 'bank';
  amount: number;
  date: string;
  refNumber: string;
  description: string;
}

export interface UserPermissions {
  viewTreasury: boolean;
  viewInventory: boolean;
  viewContacts: boolean;
  viewPricing: boolean;
  viewInvoices: boolean;
  manageBackup: boolean;
  manageSettings: boolean;
  [key: string]: boolean | undefined;
}

export interface User {
  id: string;
  username: string;
  password?: string;
  fullName: string;
  isActive: boolean;
  roleAr?: string;
  permissions: UserPermissions;
}

export interface SystemSettings {
  invoiceHeaderAr: string;
  invoiceHeaderEn: string;
  invoiceDeclarationAr: string;
  currencySymbol: string;
  initialTreasuryBalance: number;
  initialBankBalance: number;
}

export interface GeneralExpense {
  id: string;
  date: string;
  category: string; // e.g. 'ترحيل', 'عتالة', 'كهرباء', 'إيجار', 'مرتب عمال مؤقت', 'صيانة', 'أخرى'
  amount: number;
  paymentMethod: 'cash' | 'bank'; // الخزينة بالصندوق أو البنك بنكك
  description: string;
  invoiceNumber?: string; // If linked to a purchase invoice
  accountantName?: string;
}

export interface FinancialYear {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isOpen: boolean;
  closedAt?: string;
  summarySnapshot?: {
    totalSales: number;
    totalPurchases: number;
    netProfit: number;
    expensesAmount: number;
    outstandingDebts: number;
    outstandingSupplierCredits: number;
  };
}


