/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Contact, LedgerEntry, Product, Region, ProductType, Grade, Unit, InventoryItem, ProductPrice } from './types';

// الفواكه والمنتجات من قاعدة البيانات alyamama / fruit_erp_system
export const INITIAL_PRODUCTS: Product[] = [
  { id: 'p-1', name: 'برتقال' },
  { id: 'p-2', name: 'خوخ' },
  { id: 'p-3', name: 'مشمش' },
  { id: 'p-4', name: 'منقة (صديقة)' },
  { id: 'p-5', name: 'تفاح أحمر' },
  { id: 'p-6', name: 'عنب' },
  { id: 'p-7', name: 'جوافة' },
  { id: 'p-8', name: 'منقة (قلب الثور)' },
  { id: 'p-9', name: 'أفوكادو' },
  { id: 'p-10', name: 'قشطة' }
];

export const INITIAL_REGIONS: Region[] = [
  { id: 'r-1', name: 'شمالية' },
  { id: 'r-2', name: 'كسلا' },
  { id: 'r-3', name: 'ايراني' },
  { id: 'r-4', name: 'جبل مرة' },
  { id: 'r-5', name: 'المنطقة المركزية' },
  { id: 'r-6', name: 'مصري' },
  { id: 'r-7', name: 'عام' }
];

export const INITIAL_PRODUCT_TYPES: ProductType[] = [
  { id: 't-1', name: 'شوايقة' },
  { id: 't-2', name: 'جعليين' },
  { id: 't-3', name: 'شندي' },
  { id: 't-4', name: 'جبل مرة' },
  { id: 't-5', name: 'عام' }
];

export const INITIAL_GRADES: Grade[] = [
  { id: 'g-1', name: 'نمرة أولى' },
  { id: 'g-2', name: 'نمرة ثانية' },
  { id: 'g-3', name: 'نمرة ثالثة' },
  { id: 'g-4', name: 'كشة' },
  { id: 'g-5', name: 'عام' }
];

export const INITIAL_UNITS: Unit[] = [
  { id: 'u-1', name: 'كرتونة' },
  { id: 'u-2', name: 'سبت' },
  { id: 'u-3', name: 'كيلو' },
  { id: 'u-4', name: 'حبة' },
  { id: 'u-5', name: 'طن' }
];

// الموردون والعملاء من قاعدة البيانات
export const INITIAL_VENDORS: Contact[] = [
  {
    id: 's-1',
    type: 'supplier',
    code: 'SUP-001',
    name: 'تاجر المانجو الجيلي',
    nameEn: 'Mango Trader Al-Geili',
    phone: '0901234567',
    email: 'mango@merchant.sd',
    lastActive: '2026-06-04',
    notes: 'تصدير وتوريد مانجو صديقة وقلب الثور درجة أولى وسلقينات'
  },
  {
    id: 's-2',
    type: 'supplier',
    code: 'SUP-002',
    name: 'تاجر التفاح الإيراني',
    nameEn: 'Apple Trader Iranian',
    phone: '0906987873',
    email: 'apple@merchant.sd',
    lastActive: '2026-05-22',
    notes: 'السوق الكبير - تفاح أحمر وأخضر مستورد وحفظ برادات'
  },
  {
    id: 's-3',
    type: 'supplier',
    code: 'SUP-003',
    name: 'شركة البرتقال الوطنية شندي',
    nameEn: 'National Orange Co Shendi',
    phone: '0912233445',
    email: 'info@orange-shendi.sd',
    lastActive: '2026-06-04',
    notes: 'الشركة الرئيسية لمزارع البرتقال بالولاية الشمالية شندي'
  },
  {
    id: 's-4',
    type: 'supplier',
    code: 'SUP-004',
    name: 'مورد عام للفاكهة الاستوائية',
    nameEn: 'General Tropical Fruit Supplier',
    phone: '0123456789',
    email: 'general@fruits.sd',
    lastActive: '2026-05-20',
    notes: 'توريد جوافة أفوكادو قشطة وتين بري مع الفروع الرئيسية'
  }
];

export const INITIAL_CUSTOMERS: Contact[] = [
  {
    id: 'c-1',
    type: 'customer',
    code: 'CUST-001',
    name: 'محمد احمد للمبيعات الجملة',
    nameEn: 'Muhammad Ahmad Wholesale',
    phone: '0922887711',
    email: 'm.ahmed@customer.sd',
    lastActive: '2026-06-04',
    notes: 'وكيل توزيع معتمد مجمع وود البشير والمغتربين'
  },
  {
    id: 'c-2',
    type: 'customer',
    code: 'CUST-002',
    name: 'إبراهيم تاجر السوق الشعبي',
    nameEn: 'Ibrahim Al-Shaabi Merchant',
    phone: '0911554422',
    email: 'ibrahim@customer.sd',
    lastActive: '2026-06-04',
    notes: 'محل بيع قطاعي ومخازن فرعية ببحري'
  },
  {
    id: 'c-3',
    type: 'customer',
    code: 'CUST-003',
    name: 'داؤود لخدمات التجزئة والفنادق',
    nameEn: 'Dawood Retail & Hotel Services',
    phone: '0955663322',
    lastActive: '2026-06-04',
    notes: 'فواتير خاصة وعقود سداد نصف شهري'
  },
  {
    id: 'c-4',
    type: 'customer',
    code: 'CUST-004',
    name: 'زبون نقدي عام',
    nameEn: 'General Cash Walkin Customer',
    phone: '0000000000',
    lastActive: '2026-06-04',
    notes: 'حساب التسجيل المباشر بدون قيود ائتمان'
  }
];

export const INITIAL_WORKERS: Contact[] = [
  {
    id: 'w-1',
    type: 'worker',
    code: 'WRK-001',
    name: 'محمد احمد الهادي - مشرف الصيانة والمخازن',
    nameEn: 'Muhammad Ahmed Al-Hadi - Store Supervisor',
    phone: '090809987',
    lastActive: '2026-06-04',
    notes: 'الراتب الأساسي الشهري المدون 700,000 جنيه سوداني',
    salary: 700000
  },
  {
    id: 'w-2',
    type: 'worker',
    code: 'WRK-002',
    name: 'محمد الهادي منصور - سائق ومسؤول النقل الجغرافي',
    nameEn: 'Muhammad Mansour - Logistical Driver',
    phone: '090405050',
    lastActive: '2026-06-04',
    notes: 'الراتب الأساسي الشهري المدون 500,000 جنيه سوداني مع عمولات نقل',
    salary: 500000
  }
];

// سلع المتجر الافتراضية بالمخازن
export const INITIAL_INVENTORY: InventoryItem[] = [
  {
    id: 'inv-1',
    productId: 'p-1',
    productName: 'برتقال',
    regionName: 'شمالية',
    typeName: 'شوايقة',
    gradeName: 'نمرة أولى',
    unitName: 'كرتونة',
    qty: 1092,
    buyPrice: 7000,
    sellPrice: 10000
  },
  {
    id: 'inv-2',
    productId: 'p-1',
    productName: 'برتقال',
    regionName: 'شمالية',
    typeName: 'جعليين',
    gradeName: 'نمرة ثالثة',
    unitName: 'كرتونة',
    qty: 1199,
    buyPrice: 5000,
    sellPrice: 8000
  },
  {
    id: 'inv-3',
    productId: 'p-5',
    productName: 'تفاح أحمر',
    regionName: 'ايراني',
    typeName: 'عام',
    gradeName: 'نمرة أولى',
    unitName: 'سبت',
    qty: 997,
    buyPrice: 3000,
    sellPrice: 5000
  },
  {
    id: 'inv-4',
    productId: 'p-7',
    productName: 'جوافة',
    regionName: 'كسلا',
    typeName: 'عام',
    gradeName: 'نمرة ثانية',
    unitName: 'سبت',
    qty: 200,
    buyPrice: 4000,
    sellPrice: 6000
  }
];

// أسعار البيع الجاهزة للاصناف الموجودة
export const INITIAL_PRICES: ProductPrice[] = [
  {
    id: 'pr-1',
    productId: 'p-1',
    productName: 'برتقال',
    regionName: 'شمالية',
    typeName: 'شوايقة',
    gradeName: 'نمرة أولى',
    priceRetail: 10000,
    priceWholesale: 8000,
    priceSpecial: 7500,
    priceOffer: 7000
  },
  {
    id: 'pr-2',
    productId: 'p-5',
    productName: 'تفاح أحمر',
    regionName: 'ايراني',
    typeName: 'عام',
    gradeName: 'نمرة أولى',
    priceRetail: 5000,
    priceWholesale: 4200,
    priceSpecial: 4000,
    priceOffer: 3800
  },
  {
    id: 'pr-3',
    productId: 'p-7',
    productName: 'جوافة',
    regionName: 'كسلا',
    typeName: 'عام',
    gradeName: 'نمرة ثانية',
    priceRetail: 6000,
    priceWholesale: 5200,
    priceSpecial: 5000,
    priceOffer: 4500
  }
];

// كشوفات حساب المشتريات الافتراضية للموردين (مستخلصة من الجداول dump)
export const INITIAL_INVOICES_SUPPLIERS: Record<string, LedgerEntry[]> = {
  's-1': [
    {
      id: 'l-s1-1',
      type: 'invoice',
      date: '2026-05-20',
      number: 'PUR-IN-001',
      description: 'فاتورة توريد مانجو صديقة وموز نمرة واحد',
      total: 420000.00,
      paid: 0.00,
      items: [
        {
          id: 'p-itm-1',
          productId: 'p-4',
          productName: 'منقة (صديقة)',
          regionName: 'كسلا',
          typeName: 'عام',
          gradeName: 'نمرة أولى',
          unitName: 'سبت',
          qty: 60,
          price: 7000,
          total: 420000
        }
      ]
    },
    {
      id: 'l-s1-2',
      type: 'payment',
      date: '2026-05-22',
      number: 'PAY-OUT-101',
      description: 'سند صرف نقدي لتسديد جزء حساب المانجو',
      total: 180000.00,
      paid: 180000.00,
      paymentMethod: 'cash',
      paymentRef: 'CASH-S1-A'
    }
  ],
  's-2': [
    {
      id: 'l-s2-1',
      type: 'invoice',
      date: '2026-05-22',
      number: 'PUR-IN-002',
      description: 'فاتورة توريد تفاح أحمر نخب ممتاز برادات',
      total: 1000000.00,
      paid: 400000.00,
      items: [
        {
          id: 'p-itm-2',
          productId: 'p-5',
          productName: 'تفاح أحمر',
          regionName: 'ايراني',
          typeName: 'عام',
          gradeName: 'نمرة أولى',
          unitName: 'كرتونة',
          qty: 100,
          price: 10000,
          total: 1000000
        }
      ]
    }
  ],
  's-3': [
    {
      id: 'l-s3-1',
      type: 'invoice',
      date: '2026-06-04',
      number: 'PUR-IN-301',
      description: 'توريد برتقال ولاية شمالية شندي نمرة أولى بالتفريغ الجاف',
      total: 630000.00,
      paid: 0.00,
      items: [
        {
          id: 'p-itm-3',
          productId: 'p-1',
          productName: 'برتقال',
          regionName: 'شمالية',
          typeName: 'شوايقة',
          gradeName: 'نمرة أولى',
          unitName: 'كرتونة',
          qty: 90,
          price: 7000,
          total: 630000
        }
      ]
    }
  ]
};

// كشوفات حساب المبيعات الافتراضية للعملاء
export const INITIAL_INVOICES_CUSTOMERS: Record<string, LedgerEntry[]> = {
  'c-1': [
    {
      id: 'l-c1-1',
      type: 'invoice',
      date: '2026-05-20',
      number: 'SAL-INV-001',
      description: 'فاتورة مبيعات برتقال شمالية وكوكتيل فواكه',
      total: 2000000.00,
      paid: 2000000.00,
      items: [
        {
          id: 's-itm-1',
          productId: 'p-1',
          productName: 'برتقال',
          regionName: 'شمالية',
          typeName: 'شوايقة',
          gradeName: 'نمرة أولى',
          unitName: 'كرتونة',
          qty: 200,
          price: 10000,
          total: 2000000,
          priceType: 'retail'
        }
      ]
    },
    {
      id: 'l-c1-2',
      type: 'invoice',
      date: '2026-06-04',
      number: 'SAL-INV-002',
      description: 'فاتورة بيع عنب ومشمش جملة',
      total: 40700.00,
      paid: 42100.00,
      items: [
        {
          id: 's-itm-2',
          productId: 'p-1',
          productName: 'برتقال',
          regionName: 'شمالية',
          typeName: 'شوايقة',
          gradeName: 'نمرة أولى',
          unitName: 'كرتونة',
          qty: 2,
          price: 7000, // custom price
          total: 14000,
          priceType: 'offer'
        },
        {
          id: 's-itm-3',
          productId: 'p-7',
          productName: 'جوافة',
          regionName: 'كسلا',
          typeName: 'عام',
          gradeName: 'نمرة ثانية',
          unitName: 'سبت',
          qty: 4,
          price: 5000,
          total: 20000,
          priceType: 'special'
        }
      ]
    },
    {
      id: 'l-c1-3',
      type: 'payment',
      date: '2026-05-22',
      number: 'REC-IN-401',
      description: 'تحصيل نقدي دفعة مقدمة بنكك',
      total: 70000.00,
      paid: 70000.00,
      paymentMethod: 'bank',
      paymentRef: 'BKK-1049219'
    }
  ],
  'c-2': [
    {
      id: 'l-c2-1',
      type: 'invoice',
      date: '2026-06-04',
      number: 'SAL-INV-003',
      description: 'فاتورة بيع قطاعي تفاح ممتاز',
      total: 490000.00,
      paid: 490000.00,
      items: [
        {
          id: 's-itm-4',
          productId: 'p-1',
          productName: 'برتقال',
          regionName: 'شمالية',
          typeName: 'شوايقة',
          gradeName: 'نمرة أولى',
          unitName: 'كرتونة',
          qty: 70,
          price: 7000,
          total: 490000,
          priceType: 'retail'
        }
      ]
    }
  ]
};

// كشوفات العمال والعهد وموظفي التشغيل
export const INITIAL_INVOICES_WORKERS: Record<string, LedgerEntry[]> = {
  'w-1': [
    {
      id: 'l-w1-1',
      type: 'invoice',
      date: '2026-05-22',
      number: 'WRK-S01',
      description: 'مستحقات مرتب شهر مايو لمشرف المخازن',
      total: 700000.00,
      paid: 700000.00
    },
    {
      id: 'l-w1-2',
      type: 'invoice',
      date: '2026-05-22',
      number: 'WRK-D02',
      description: 'سلفة مالية مستلمة نقدا لتأهيل منصة التعبئة',
      total: 600000.00,
      paid: 0.00
    },
    {
      id: 'l-w1-3',
      type: 'payment',
      date: '2026-06-04',
      number: 'WRK-P03',
      description: 'قبض واسترجاع جزء من سلفة مشرف المخزن نقداً',
      total: 200000.00,
      paid: 200000.00,
      paymentMethod: 'cash',
      paymentRef: 'CASH-RET-11'
    }
  ],
  'w-2': [
    {
      id: 'l-w2-1',
      type: 'invoice',
      date: '2026-05-22',
      number: 'WRK-S02',
      description: 'مرجع مرتب السائق الشهري المستحق - مايو',
      total: 500000.00,
      paid: 500000.00
    },
    {
      id: 'l-w2-2',
      type: 'invoice',
      date: '2026-05-22',
      number: 'WRK-D03',
      description: 'سلفية عاجلة لتأجير شاحنة نقل مبردة',
      total: 600000.00,
      paid: 0.00
    }
  ]
};
