/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Calendar, ShoppingCart, Tag, Calculator } from 'lucide-react';
import { 
  Contact, 
  Product, 
  Region, 
  ProductType, 
  Grade, 
  Unit, 
  InventoryItem, 
  ProductPrice, 
  InvoiceItem, 
  LedgerEntry 
} from '../types';

interface InvoiceModalProps {
  activeTab: 'supplier' | 'customer' | 'worker';
  contacts: Contact[];          // suppliers or customers
  activeContactId: string;
  products: Product[];
  regions: Region[];
  productTypes: ProductType[];
  grades: Grade[];
  units: Unit[];
  inventory: InventoryItem[];   // fetched from stock
  prices: ProductPrice[];       // sell prices manager
  isRtl: boolean;
  onClose: () => void;
  onSave: (data: {
    id?: string;
    contactId: string;
    date: string;
    number: string;
    description: string;
    total: number;
    paid: number;
    items: any[];
    paymentMethod?: 'cash' | 'bank';
    transportExpense?: number;
    carryingExpense?: number;
    otherInvoiceExpense?: number;
    expensePaymentMethod?: 'cash' | 'bank';
    discount?: number;
  }) => void;
  treasuryBalance?: number;
  bankBalance?: number;
  editingInvoice?: LedgerEntry | null;
  editingInvoiceContactId?: string;
}

interface FormRow {
  id: string;
  // Common
  productId: string;
  regionName: string;
  typeName: string;
  gradeName: string;
  unitName: string;
  qty: number;
  price: number;
  // Sales specific
  inventoryItemId?: string; // which stock item is chosen
  priceType?: 'retail' | 'wholesale' | 'special' | 'offer';
}

export default function InvoiceModal({
  activeTab,
  contacts,
  activeContactId,
  products,
  regions,
  productTypes,
  grades,
  units,
  inventory,
  prices,
  isRtl,
  onClose,
  onSave,
  treasuryBalance = 0,
  bankBalance = 0,
  editingInvoice = null,
  editingInvoiceContactId = ''
}: InvoiceModalProps) {
  const isSupplier = activeTab === 'supplier';
  
  // Header details
  const [invoiceContactId, setInvoiceContactId] = useState<string>(() => {
    return editingInvoice ? (editingInvoiceContactId || activeContactId || '') : (activeContactId || (contacts[0]?.id || ''));
  });
  const [date, setDate] = useState<string>(() => {
    return editingInvoice ? editingInvoice.date : new Date().toISOString().split('T')[0];
  });
  const [number, setNumber] = useState<string>(() => {
    return editingInvoice ? editingInvoice.number : `${isSupplier ? 'PUR-INV' : 'SAL-INV'}-${Math.floor(1000 + Math.random() * 8999)}`;
  });
  const [description, setDescription] = useState<string>(() => {
    return editingInvoice ? editingInvoice.description : '';
  });
  const [amountPaid, setAmountPaid] = useState<string>(() => {
    return editingInvoice ? (editingInvoice.paid || 0).toString() : '0';
  });
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank'>(() => {
    return editingInvoice ? (editingInvoice.paymentMethod || 'cash') : 'cash';
  });
  const [discount, setDiscount] = useState<string>(() => {
    return editingInvoice ? (editingInvoice.discount || 0).toString() : '0';
  });

  // Supplier invoice specific expenses (ترحيل وعتالة وغيرها)
  const [transportExpense, setTransportExpense] = useState<string>(() => {
    return editingInvoice ? (editingInvoice.transportExpense || 0).toString() : '0';
  });
  const [carryingExpense, setCarryingExpense] = useState<string>(() => {
    return editingInvoice ? (editingInvoice.carryingExpense || 0).toString() : '0';
  });
  const [otherInvoiceExpense, setOtherInvoiceExpense] = useState<string>(() => {
    return editingInvoice ? (editingInvoice.otherInvoiceExpense || 0).toString() : '0';
  });
  const [expensePaymentMethod, setExpensePaymentMethod] = useState<'cash' | 'bank'>(() => {
    return editingInvoice ? (editingInvoice.expensePaymentMethod || 'cash') : 'cash';
  });

  // In-form helper calculator state
  const [showFormCalc, setShowFormCalc] = useState<boolean>(false);
  const [calcInput, setCalcInput] = useState<string>('');
  const [calcHistory, setCalcHistory] = useState<string>('');

  const handleCalcBtnPress = (val: string) => {
    if (val === 'C') {
      setCalcInput('');
      setCalcHistory('');
    } else if (val === '=') {
      try {
        if (!calcInput) return;
        const sanitized = calcInput.replace(/[^0-9+\-*/.]/g, '');
        const res = new Function(`return (${sanitized})`)();
        if (typeof res === 'number' && !isNaN(res)) {
          setCalcHistory(calcInput);
          setCalcInput(res.toString());
        } else {
          setCalcInput('Error');
        }
      } catch (err) {
        setCalcInput('Error');
      }
    } else if (val === 'Del') {
      setCalcInput(prev => prev.slice(0, -1));
    } else {
      setCalcInput(prev => {
        if (prev === 'Error') return val;
        return prev + val;
      });
    }
  };

  const handleApplyCalcToPaid = () => {
    const val = parseFloat(calcInput);
    if (!isNaN(val)) {
      setAmountPaid(val.toString());
    }
  };

  // Rows list
  const [rows, setRows] = useState<FormRow[]>(() => {
    if (editingInvoice) {
      return (editingInvoice.items || []).map(itm => {
        let inventoryItemId = '';
        if (!isSupplier) {
          const matchedStock = inventory.find(stock => 
            stock.productId === itm.productId &&
            stock.regionName === itm.regionName &&
            stock.typeName === itm.typeName &&
            stock.gradeName === itm.gradeName &&
            stock.unitName === itm.unitName
          );
          inventoryItemId = matchedStock ? matchedStock.id : '';
        }
        return {
          id: itm.id || `row-${Date.now()}-${Math.random()}`,
          productId: itm.productId,
          regionName: itm.regionName,
          typeName: itm.typeName,
          gradeName: itm.gradeName,
          unitName: itm.unitName,
          qty: itm.qty,
          price: itm.price,
          inventoryItemId,
          priceType: itm.priceType || 'retail'
        };
      });
    } else {
      if (isSupplier) {
        return [
          {
            id: `row-${Date.now()}-0`,
            productId: products[0]?.id || '',
            regionName: regions[0]?.name || '',
            typeName: productTypes[0]?.name || '',
            gradeName: grades[0]?.name || '',
            unitName: units[0]?.name || '',
            qty: 1,
            price: 0
          }
        ];
      } else {
        const stockItem = inventory[0];
        return [
          {
            id: `row-${Date.now()}-0`,
            productId: stockItem?.productId || '',
            regionName: stockItem?.regionName || '',
            typeName: stockItem?.typeName || '',
            gradeName: stockItem?.gradeName || '',
            unitName: stockItem?.unitName || '',
            qty: 1,
            price: stockItem?.sellPrice || 0,
            inventoryItemId: stockItem?.id || '',
            priceType: 'retail'
          }
        ];
      }
    }
  });

  // Initialize with correct text when opening
  useEffect(() => {
    if (!editingInvoice) {
      if (isSupplier) {
        setDescription('فاتورة شراء');
      } else {
        setDescription('فاتورة بيع وتصدير فواكه للعميل من مخزون اليمامة الفعال');
      }
    }
  }, [isSupplier, editingInvoice]);

  // Total invoice cost calculation
  const grandTotal = rows.reduce((sum, r) => sum + (r.qty * r.price), 0);

  // Add row
  const handleAddRow = () => {
    if (isSupplier) {
      setRows([
        ...rows,
        {
          id: `row-${Date.now()}-${rows.length}`,
          productId: products[0]?.id || '',
          regionName: regions[0]?.name || '',
          typeName: productTypes[0]?.name || '',
          gradeName: grades[0]?.name || '',
          unitName: units[0]?.name || '',
          qty: 1,
          price: 0
        }
      ]);
    } else {
      const stockItem = inventory[0];
      setRows([
        ...rows,
        {
          id: `row-${Date.now()}-${rows.length}`,
          productId: stockItem?.productId || '',
          regionName: stockItem?.regionName || '',
          typeName: stockItem?.typeName || '',
          gradeName: stockItem?.gradeName || '',
          unitName: stockItem?.unitName || '',
          qty: 1,
          price: stockItem?.sellPrice || 0,
          inventoryItemId: stockItem?.id || '',
          priceType: 'retail'
        }
      ]);
    }
  };

  const handleDeleteRow = (index: number) => {
    if (rows.length === 1) return; // keep at least one row
    setRows(rows.filter((_, i) => i !== index));
  };

  // Row update handlers
  const handleSupplierRowChange = (index: number, field: keyof FormRow, value: any) => {
    const updated = [...rows];
    updated[index] = { ...updated[index], [field]: value };
    setRows(updated);
  };

  // Sales dynamic pricing and stock mapping handler
  const handleSalesRowStockChange = (index: number, stockItemId: string) => {
    const stockItem = inventory.find(itm => itm.id === stockItemId);
    const updated = [...rows];
    if (stockItem) {
      const priceType = updated[index].priceType || 'retail';
      // Look up Price in Pricing Manager
      let sellPrice = stockItem.sellPrice;
      const priceEntry = prices.find(p => 
        p.productId === stockItem.productId && 
        p.regionName === stockItem.regionName && 
        p.typeName === stockItem.typeName && 
        p.gradeName === stockItem.gradeName
      );

      if (priceEntry) {
        if (priceType === 'retail') sellPrice = priceEntry.priceRetail;
        else if (priceType === 'wholesale') sellPrice = priceEntry.priceWholesale;
        else if (priceType === 'special') sellPrice = priceEntry.priceSpecial;
        else if (priceType === 'offer') sellPrice = priceEntry.priceOffer;
      }

      updated[index] = {
        ...updated[index],
        inventoryItemId: stockItemId,
        productId: stockItem.productId,
        regionName: stockItem.regionName,
        typeName: stockItem.typeName,
        gradeName: stockItem.gradeName,
        unitName: stockItem.unitName,
        price: sellPrice
      };
    }
    setRows(updated);
  };

  const handleSalesRowPriceTypeChange = (index: number, pType: 'retail' | 'wholesale' | 'special' | 'offer') => {
    const updated = [...rows];
    const currentRow = updated[index];
    
    // Look up Price in Pricing Manager using the productId/attributes in current row
    let priceScalar = currentRow.price;
    
    // Check if matching record in stock
    const stockItem = inventory.find(itm => itm.id === currentRow.inventoryItemId);
    if (stockItem) {
      priceScalar = stockItem.sellPrice; // fallback default
    }

    const priceEntry = prices.find(p => 
      p.productId === currentRow.productId && 
      p.regionName === currentRow.regionName && 
      p.typeName === currentRow.typeName && 
      p.gradeName === currentRow.gradeName
    );

    if (priceEntry) {
      if (pType === 'retail') priceScalar = priceEntry.priceRetail;
      else if (pType === 'wholesale') priceScalar = priceEntry.priceWholesale;
      else if (pType === 'special') priceScalar = priceEntry.priceSpecial;
      else if (pType === 'offer') priceScalar = priceEntry.priceOffer;
    }

    updated[index] = {
      ...currentRow,
      priceType: pType,
      price: priceScalar
    };

    setRows(updated);
  };

  const handleSalesRowQtyChange = (index: number, qtyVal: number) => {
    const updated = [...rows];
    updated[index] = { ...updated[index], qty: qtyVal };
    
    // Display warm warning if quantity requested exceeds stock on hand
    const stockItem = inventory.find(itm => itm.id === updated[index].inventoryItemId);
    if (stockItem && qtyVal > stockItem.qty) {
      // harmless warning but we let them purchase (just soft warning)
    }
    setRows(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const paidVal = isNaN(parseFloat(amountPaid)) ? 0 : parseFloat(amountPaid);
    
    if (!invoiceContactId || !date || !number.trim() || !description.trim() || grandTotal <= 0) {
      alert(isRtl ? "يرجى ملء جميع ترويسات الفاتورة والتأكد من إضافة أصناف بمبالغ صحيحة" : "Please fill in all details and add valid items.");
      return;
    }

    // 1. Balance check for Purchase Invoices (Suppliers)
    if (isSupplier) {
      const trans = parseFloat(transportExpense) || 0;
      const carr = parseFloat(carryingExpense) || 0;
      const oth = parseFloat(otherInvoiceExpense) || 0;
      const totalExpenses = trans + carr + oth;

      let cashRequired = 0;
      let bankRequired = 0;

      if (paidVal > 0) {
        if (paymentMethod === 'cash') cashRequired += paidVal;
        else if (paymentMethod === 'bank') bankRequired += paidVal;
      }

      if (totalExpenses > 0) {
        if (expensePaymentMethod === 'cash') cashRequired += totalExpenses;
        else if (expensePaymentMethod === 'bank') bankRequired += totalExpenses;
      }

      if (cashRequired > treasuryBalance) {
        alert(isRtl 
          ? "مبلغ الخزنة لا يكفي للشراء، يجب توريد مبلغ للخزنة لإتمام عملية الشراء." 
          : "The treasury cash balance is insufficient for this purchase. Please deposit cash to proceed."
        );
        return;
      }

      if (bankRequired > bankBalance) {
        alert(isRtl 
          ? "رصيد الحساب البنكي لا يكفي للشراء، يجب توريد مبلغ للبنك لإتمام عملية الشراء." 
          : "The bank account balance is insufficient for this purchase. Please deposit funds to proceed."
        );
        return;
      }
    }

    // 2. Quantity check for Sales Invoices (Customers) - Only for NEW invoices, skip on edit
    if (!isSupplier && !editingInvoice) {
      const qtyMap: Record<string, number> = {};
      rows.forEach(r => {
        if (r.inventoryItemId) {
          qtyMap[r.inventoryItemId] = (qtyMap[r.inventoryItemId] || 0) + r.qty;
        }
      });

      for (const itemId of Object.keys(qtyMap)) {
        const stockItem = inventory.find(itm => itm.id === itemId);
        if (stockItem && qtyMap[itemId] > stockItem.qty) {
          alert(isRtl 
            ? "العدد المطلوب غير متوفر" 
            : "Requested quantity is not available in stock"
          );
          return;
        }
      }
    }

    // Map rows to final InvoiceItem schemas
    const invoiceItems: InvoiceItem[] = rows.map(r => {
      const pObj = products.find(p => p.id === r.productId);
      return {
        id: `itm-${Date.now()}-${Math.floor(Math.random() * 9999)}`,
        productId: r.productId,
        productName: pObj?.name || 'فاكهة',
        regionName: r.regionName,
        typeName: r.typeName,
        gradeName: r.gradeName,
        unitName: r.unitName,
        qty: r.qty,
        price: r.price,
        total: r.qty * r.price,
        priceType: r.priceType
      };
    });

    const trans = isSupplier ? parseFloat(transportExpense) : 0;
    const carr = isSupplier ? parseFloat(carryingExpense) : 0;
    const oth = isSupplier ? parseFloat(otherInvoiceExpense) : 0;
    const discountVal = !isSupplier ? (parseFloat(discount) || 0) : 0;
    const netInvoiceTotal = Math.max(0, grandTotal - discountVal);

    onSave({
      id: editingInvoice?.id,
      contactId: invoiceContactId,
      date,
      number,
      description,
      total: netInvoiceTotal,
      discount: discountVal > 0 ? discountVal : undefined,
      paid: paidVal,
      items: invoiceItems,
      paymentMethod: paidVal === 0 ? undefined : paymentMethod,
      transportExpense: isNaN(trans) ? 0 : trans,
      carryingExpense: isNaN(carr) ? 0 : carr,
      otherInvoiceExpense: isNaN(oth) ? 0 : oth,
      expensePaymentMethod: isSupplier ? expensePaymentMethod : undefined
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto no-print">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-5xl overflow-hidden my-4 max-h-[92vh] flex flex-col transform scale-100 transition-transform">
        
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-4 flex justify-between items-center select-none border-b border-slate-800 shrink-0">
          <h3 className="font-bold text-sm tracking-tight flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-blue-400" />
            <span>
              {editingInvoice
                ? (isRtl ? `تـعـديـل فـاتـورة رقـم: ${editingInvoice.number}` : `Edit Invoice: ${editingInvoice.number}`)
                : isSupplier
                  ? (isRtl ? "إنـشـاء فـاتـورة مـشـتـريـات جـديـدة (توريد وارد)" : "Record Storage Buy Invoice") 
                  : (isRtl ? "إنـشـاء فـاتـورة مـبـيـعـات جـديـدة (توريد صادر)" : "Record Client Sale Invoice")
              }
            </span>
          </h3>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowFormCalc(!showFormCalc)}
              className="bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm animate-pulse"
              title="تفعيل الآلة الحاسبة الجانبية للمستند"
            >
              <Calculator className="w-4 h-4 text-amber-400" />
              <span>الآلة الحاسبة</span>
            </button>
            <button 
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors cursor-pointer p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Outer Split Container */}
        <div className="flex flex-col lg:flex-row flex-1 overflow-hidden" dir="rtl">
          
          {/* Modal Form scroll container */}
          <form onSubmit={handleSubmit} className="p-5 overflow-y-auto flex-1 space-y-4 text-xs md:text-sm">
          
          {/* Header metadata row */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            
            {/* Account Selector */}
            <div className="md:col-span-1">
              <label className="block text-[10px] font-bold text-slate-500 mb-1">
                {isSupplier ? (isRtl ? "المورد المالي *" : "Supplier *") : (isRtl ? "العميل المستلم *" : "Customer *")}
              </label>
              <select
                value={invoiceContactId}
                onChange={(e) => setInvoiceContactId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded px-2 text-xs py-1.5 font-bold"
                required
              >
                <option value="">{isRtl ? "-- اختر الحساب المالي --" : "-- Select --"}</option>
                {contacts.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Value Date */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1">{isRtl ? "تاريخ الفاتورة *" : "Invoice Date *"}</label>
              <input 
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs font-semibold font-mono"
              />
            </div>

            {/* Bill Number */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1">{isRtl ? "رقم الفاتورة المرجعي *" : "Referential Invoice Code *"}</label>
              <input 
                type="text"
                required
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-xs font-semibold font-mono text-slate-800"
              />
            </div>

            {/* Payout Cash */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1">
                {isSupplier ? (isRtl ? "المبلغ والمسدد فوراً *" : "Paid Out Now *") : (isRtl ? "المبلغ والمحصل فوراً *" : "Collected Now *")}
              </label>
              <input 
                type="number"
                step="0.01"
                required
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-xs font-bold font-mono text-emerald-600 focus:bg-white"
              />
            </div>

            {/* Payment Method Selector */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1">
                {isRtl ? "صندوق الدفع أو الاستلام *" : "Fund Account style *"}
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as 'cash' | 'bank')}
                className="w-full bg-emerald-50 border border-emerald-300 text-emerald-950 font-black rounded px-2 text-xs py-1 text-center font-bold"
                disabled={!(parseFloat(amountPaid) > 0)}
              >
                <option value="cash">
                  {isRtl ? `💵 الخزينة النقدية (المليئ: ${treasuryBalance.toLocaleString()} ج.س)` : `💵 Treasury Cash (Bal: ${treasuryBalance.toLocaleString()})`}
                </option>
                <option value="bank">
                  {isRtl ? `🏦 الحساب البنكي (بنكك) (المليئ: ${bankBalance.toLocaleString()} ج.س)` : `🏦 Bank Transfer (Bal: ${bankBalance.toLocaleString()})`}
                </option>
              </select>
            </div>

          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">{isRtl ? "بيان الفاتورة المجمع *" : "Main Invoice Headline Description *"}</label>
            <input 
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-xs outline-none focus:bg-white font-semibold text-slate-800"
              placeholder={isRtl ? "أصل بيان هذه الفاتورة..." : "Explain of current items lot..."}
            />
          </div>

          {isSupplier && (
            <div className="bg-amber-50/50 border border-amber-200/80 rounded-lg p-3 space-y-2 mt-2">
              <span className="text-[10px] bg-amber-200 text-amber-900 font-black px-2 py-0.5 rounded flex items-center gap-1.5 w-fit select-none">
                🚚 مصروفات الشحنة واللوجستيات المباشرة للشراء (تخصم تلقائياً من الخوارزم المالي)
              </span>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                {/* 1. الترحيل */}
                <div>
                  <label className="block text-[10px] font-black text-amber-900 mb-1">
                    تكلفة ترحيل البضائع (الترحيل)
                  </label>
                  <input 
                    type="number"
                    step="0.01"
                    value={transportExpense}
                    onChange={(e) => setTransportExpense(e.target.value)}
                    className="w-full bg-white border border-amber-300 rounded px-2.5 py-1 text-xs font-bold font-mono text-slate-800"
                    placeholder="0.00"
                  />
                </div>
                {/* 2. العتالة */}
                <div>
                  <label className="block text-[10px] font-black text-amber-900 mb-1">
                    تكلفة عمال الشحن والتفريغ (العتالة)
                  </label>
                  <input 
                    type="number"
                    step="0.01"
                    value={carryingExpense}
                    onChange={(e) => setCarryingExpense(e.target.value)}
                    className="w-full bg-white border border-amber-300 rounded px-2.5 py-1 text-xs font-bold font-mono text-slate-800"
                    placeholder="0.00"
                  />
                </div>
                {/* 3. مصروفات أخرى */}
                <div>
                  <label className="block text-[10px] font-black text-amber-900 mb-1">
                    منصرفات أخرى متعلقة بالمنتجات
                  </label>
                  <input 
                    type="number"
                    step="0.01"
                    value={otherInvoiceExpense}
                    onChange={(e) => setOtherInvoiceExpense(e.target.value)}
                    className="w-full bg-white border border-amber-300 rounded px-2.5 py-1 text-xs font-bold font-mono text-slate-800"
                    placeholder="0.00"
                  />
                </div>
                {/* 4. طريقة دفع مصروفات الشحنة */}
                <div>
                  <label className="block text-[10px] font-black text-amber-900 mb-1">
                    طريقة دفع منصرفات الفاتورة مسبقة
                  </label>
                  <select
                    value={expensePaymentMethod}
                    onChange={(e) => setExpensePaymentMethod(e.target.value as 'cash' | 'bank')}
                    className="w-full bg-white border border-amber-300 rounded px-2 text-xs py-1 text-slate-800 font-bold"
                  >
                    <option value="cash">
                      {isRtl ? `💵 الخزينة النقدية (المليئ: ${treasuryBalance.toLocaleString()} ج.س)` : `💵 Treasury Cash (Bal: ${treasuryBalance.toLocaleString()})`}
                    </option>
                    <option value="bank">
                      {isRtl ? `🏦 الحساب البنكي (بنكك) (المليئ: ${bankBalance.toLocaleString()} ج.س)` : `🏦 Bank Transfer (Bal: ${bankBalance.toLocaleString()})`}
                    </option>
                  </select>
                </div>
              </div>
            </div>
          )}

          <div className="border-t border-slate-200 my-4 pt-3">
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-extrabold text-slate-700 text-xs flex items-center gap-1">
                <ShoppingCart className="w-4 h-4 text-slate-500" />
                <span>{isRtl ? "بنود سلع ومشتملات الشحنة الفعالة" : "Fruiting Items Lot Details"}</span>
              </h4>
              <button
                type="button"
                onClick={handleAddRow}
                className="bg-blue-50 hover:bg-blue-105 border border-blue-200 text-blue-700 font-bold px-3 py-1.5 rounded text-xs flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isRtl ? "إضافة صنف للفاتورة" : "Add Item Row"}</span>
              </button>
            </div>

            {/* Dynamic Items Lot Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-right divide-y divide-slate-200 text-xs">
                <thead className="bg-slate-50 text-slate-600 font-extrabold">
                  {isSupplier ? (
                    <tr>
                      <th className="p-2.5">{isRtl ? "الصنف الفاكهة" : "Product"}</th>
                      <th className="p-2.5">{isRtl ? "المنطقة / المنشأ" : "Region"}</th>
                      <th className="p-2.5">{isRtl ? "التصنيف" : "Classification"}</th>
                      <th className="p-2.5">{isRtl ? "الدرجة" : "Grade"}</th>
                      <th className="p-2.5">{isRtl ? "الوحدة" : "Unit"}</th>
                      <th className="p-2.5 text-center w-[90px]">{isRtl ? "الكمية الواردة" : "Quantity"}</th>
                      <th className="p-2.5 text-center w-[110px]">{isRtl ? "سعر الشراء" : "Cost Rate"}</th>
                      <th className="p-2.5 text-center w-[110px]">{isRtl ? "الإجمالي" : "Amount"}</th>
                      <th className="p-2.5 text-center w-[50px]"></th>
                    </tr>
                  ) : (
                    <tr>
                      <th className="p-2.5 w-[45%]">{isRtl ? "اختر صنف وقطعة من المخزن" : "Pick Item Variety from Active Inventory"}</th>
                      <th className="p-2.5 text-center w-[110px]">{isRtl ? "فئة السعر" : "Price Type"}</th>
                      <th className="p-2.5 text-center w-[90px]">{isRtl ? "الكمية المطلوبة" : "Qty"}</th>
                      <th className="p-2.5 text-center w-[110px]">{isRtl ? "سعر البيع" : "Sell Rate"}</th>
                      <th className="p-2.5 text-center w-[110px]">{isRtl ? "إجمالي السلعة" : "Total Item"}</th>
                      <th className="p-2.5 text-center w-[50px]"></th>
                    </tr>
                  )}
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {rows.map((row, index) => {
                    const rowTotal = row.qty * row.price;
                    return isSupplier ? (
                      /* Supplier Invoice Row (Purchases inputs everything) */
                      <tr key={row.id}>
                        <td className="p-2">
                          <select
                            value={row.productId}
                            onChange={(e) => handleSupplierRowChange(index, 'productId', e.target.value)}
                            className="bg-slate-50 border border-slate-300 rounded px-1.5 py-1 text-xs font-bold"
                          >
                            {products.map(p => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                        </td>
                        <td className="p-2">
                          <select
                            value={row.regionName}
                            onChange={(e) => handleSupplierRowChange(index, 'regionName', e.target.value)}
                            className="bg-slate-50 border border-slate-300 rounded px-1.5 py-1 text-xs"
                          >
                            {regions.map(r => (
                              <option key={r.id} value={r.name}>{r.name}</option>
                            ))}
                          </select>
                        </td>
                        <td className="p-2">
                          <select
                            value={row.typeName}
                            onChange={(e) => handleSupplierRowChange(index, 'typeName', e.target.value)}
                            className="bg-slate-50 border border-slate-300 rounded px-1.5 py-1 text-xs"
                          >
                            {productTypes.map(t => (
                              <option key={t.id} value={t.name}>{t.name}</option>
                            ))}
                          </select>
                        </td>
                        <td className="p-2">
                          <select
                            value={row.gradeName}
                            onChange={(e) => handleSupplierRowChange(index, 'gradeName', e.target.value)}
                            className="bg-slate-50 border border-slate-300 rounded px-1.5 py-1 text-xs"
                          >
                            {grades.map(g => (
                              <option key={g.id} value={g.name}>{g.name}</option>
                            ))}
                          </select>
                        </td>
                        <td className="p-2">
                          <select
                            value={row.unitName}
                            onChange={(e) => handleSupplierRowChange(index, 'unitName', e.target.value)}
                            className="bg-slate-50 border border-slate-300 rounded px-1.5 py-1 text-xs"
                          >
                            {units.map(u => (
                              <option key={u.id} value={u.name}>{u.name}</option>
                            ))}
                          </select>
                        </td>
                        <td className="p-2 text-center">
                          <input
                            type="number"
                            min="1"
                            value={row.qty}
                            onChange={(e) => handleSupplierRowChange(index, 'qty', parseInt(e.target.value) || 1)}
                            className="w-full bg-slate-50 border border-slate-300 rounded px-1.5 py-1 text-xs font-mono text-center font-bold"
                          />
                        </td>
                        <td className="p-2 text-center">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={row.price}
                            onChange={(e) => handleSupplierRowChange(index, 'price', parseFloat(e.target.value) || 0)}
                            className="w-full bg-slate-50 border border-slate-300 rounded px-1.5 py-1 text-xs font-mono text-center font-bold text-slate-800"
                          />
                        </td>
                        <td className="p-2 text-center font-mono font-bold text-slate-900">
                          {rowTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteRow(index)}
                            className="text-stone-400 hover:text-red-600 p-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ) : (
                      /* Customer Invoice Row (Sales dropdown from inventory stock directly!) */
                      <tr key={row.id}>
                        <td className="p-2">
                          <select
                            value={row.inventoryItemId}
                            onChange={(e) => handleSalesRowStockChange(index, e.target.value)}
                            className="bg-slate-50 border border-slate-300 rounded px-1.5 py-1 text-xs font-bold w-full max-w-sm"
                          >
                            {inventory.map(item => (
                              <option key={item.id} value={item.id}>
                                {item.productName} ({item.regionName}) [{item.typeName} | {item.gradeName}] - المتاح بالرف: {item.qty} {item.unitName}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-2 text-center">
                          <select
                            value={row.priceType}
                            onChange={(e) => handleSalesRowPriceTypeChange(index, e.target.value as any)}
                            className="bg-slate-50 border border-slate-300 rounded px-1 py-1 text-[11px] font-bold text-blue-800"
                          >
                            <option value="retail">قطاعي</option>
                            <option value="wholesale">جملة</option>
                            <option value="special">سعر خاص</option>
                            <option value="offer">سعر عرض</option>
                          </select>
                        </td>
                        <td className="p-2 text-center">
                          <input
                            type="number"
                            min="1"
                            value={row.qty}
                            onChange={(e) => handleSalesRowQtyChange(index, parseInt(e.target.value) || 1)}
                            className="w-full bg-slate-50 border border-slate-300 rounded px-1.5 py-1 text-xs font-mono text-center font-bold"
                          />
                        </td>
                        <td className="p-2 text-center font-mono">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={row.price}
                            onChange={(e) => handleSupplierRowChange(index, 'price', parseFloat(e.target.value) || 0)}
                            className="w-full bg-slate-50 border border-slate-300 rounded px-1.5 py-1 text-xs font-mono text-center font-bold text-emerald-600"
                          />
                        </td>
                        <td className="p-2 text-center font-mono font-bold text-slate-900">
                          {rowTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteRow(index)}
                            className="text-stone-400 hover:text-red-600 p-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Calculations footer */}
          <div className="flex flex-col sm:flex-row justify-between items-end gap-4 pt-4 border-t border-slate-150">
            {/* Discount field specifically for customer sales invoices */}
            {!isSupplier ? (
              <div className="w-full sm:w-72 bg-rose-50/20 border border-rose-100 rounded-xl p-3 text-right space-y-1.5 shadow-2xs">
                <label className="block text-[11px] font-extrabold text-[#991b1b] flex items-center gap-1 select-none">
                  <Tag className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
                  <span>خصم مبلغ من إجمالي الفاتورة (Discount):</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                    className="w-full text-xs font-black p-2 pr-2.5 pl-8 bg-white border border-rose-200 rounded-lg focus:outline-none focus:border-rose-450 font-mono text-rose-700"
                    placeholder="0.00"
                  />
                  <span className="absolute left-2.5 top-2.5 font-bold text-[9px] text-rose-400 select-none">ج.س</span>
                </div>
                <p className="text-[10px] text-slate-400 font-medium leading-normal select-none">
                  سيتم خصم هذا المبلغ بالكامل من القيمة ليبقى الصافي مديونية العميل.
                </p>
              </div>
            ) : (
              <div />
            )}

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-right space-y-2 min-w-[280px] shadow-2xs">
              {!isSupplier && (parseFloat(discount) || 0) > 0 ? (
                <>
                  <div className="flex justify-between items-center text-[11px] font-extrabold text-slate-500">
                    <span>إجمالي المبيعات قبل الخصم:</span>
                    <span className="font-mono">{grandTotal.toLocaleString('en-US', { minimumFractionDigits: 1 })} ج.س</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px] font-extrabold text-rose-600">
                    <span>قيمة الخصم الممنوح:</span>
                    <span className="font-mono">-{((parseFloat(discount) || 0)).toLocaleString('en-US', { minimumFractionDigits: 1 })} ج.س</span>
                  </div>
                  <div className="border-t border-dashed border-slate-300 my-1"></div>
                </>
              ) : null}

              <div>
                <div className="text-[10px] text-slate-400 font-extrabold uppercase">
                  {!isSupplier && (parseFloat(discount) || 0) > 0 ? "صافي قيمة الفاتورة النهائي" : "إجمالي الفاتورة الصادر المعلق"}
                </div>
                <div className="text-[17px] md:text-xl font-black text-rose-600 font-mono tracking-tight flex items-baseline justify-end gap-1 mt-0.5">
                  <span>{(Math.max(0, grandTotal - (parseFloat(discount) || 0))).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  <span className="text-[10px] font-bold text-slate-500 font-sans">جنيه سوداني</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2 shrink-0">
            <button 
              type="button" 
              onClick={onClose}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-1.5 rounded font-semibold text-xs transition-colors cursor-pointer"
            >
              {isRtl ? "إلغاء تماماً" : "Cancel"}
            </button>
            <button 
              type="submit" 
              className={`text-white px-5 py-1.5 rounded font-black text-xs transition-colors shadow shadow-slate-200 cursor-pointer ${
                isSupplier ? 'bg-blue-600 hover:bg-blue-500' : 'bg-emerald-600 hover:bg-emerald-500'
              }`}
            >
              {isRtl ? "اعتماد وترحيل الفاتورة للدفاتر" : "Settle & Post Invoice"}
            </button>
          </div>
          </form>

          {/* Calculator Side panel */}
          {showFormCalc && (
            <div className="w-full lg:w-72 bg-slate-950 text-white p-5 border-t lg:border-t-0 lg:border-r border-slate-800 flex flex-col shrink-0 justify-between select-none font-sans" dir="rtl">
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                  <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                    <Calculator className="w-4 h-4" />
                    <span>الآلة الحاسبة المساعدة</span>
                  </span>
                  <button 
                    type="button"
                    onClick={() => setShowFormCalc(false)}
                    className="text-slate-400 hover:text-white text-xs font-bold"
                  >
                    إغلاق
                  </button>
                </div>

                {/* Calculator Screen Display */}
                <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 text-left font-mono">
                  <div className="text-[10px] text-slate-500 min-h-[16px] overflow-hidden truncate">
                    {calcHistory || ' '}
                  </div>
                  <div className="text-lg font-black text-white mt-1 break-all flex justify-end">
                    {calcInput || '0'}
                  </div>
                </div>

                {/* Grid buttons keypads */}
                <div className="grid grid-cols-4 gap-1.5 text-xs text-center font-mono">
                  {['7', '8', '9', '/', '4', '5', '6', '*', '1', '2', '3', '-', 'C', '0', '.', '+'].map((btn) => (
                    <button
                      key={btn}
                      type="button"
                      onClick={() => handleCalcBtnPress(btn)}
                      className="p-3 bg-slate-800 hover:bg-slate-700 active:bg-slate-650 text-white font-extrabold rounded-lg cursor-pointer transition-colors"
                    >
                      {btn}
                    </button>
                  ))}
                  
                  {/* Clear & Apply action buttons */}
                  <button
                    type="button"
                    onClick={() => handleCalcBtnPress('Del')}
                    className="p-3 bg-rose-900/60 hover:bg-rose-850 text-rose-200 font-extrabold rounded-lg cursor-pointer transition-colors"
                  >
                    حذف
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => handleCalcBtnPress('=')}
                    className="p-3 col-span-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-lg cursor-pointer transition-colors text-xs"
                  >
                    ناتج (=)
                  </button>
                </div>
              </div>

              {/* Quick Actions Integration */}
              <div className="pt-4 border-t border-slate-800 space-y-2 mt-4 font-sans">
                <button
                  type="button"
                  onClick={handleApplyCalcToPaid}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-lg cursor-pointer transition-colors flex items-center justify-center gap-1"
                  disabled={!calcInput || calcInput === 'Error'}
                >
                  <span>تضمين النتيجة في المسدد</span>
                </button>
                <p className="text-[10px] text-slate-400 text-center leading-normal">
                  اضغط على الزر لتعبئة حقل المبلغ المسدد بالفاتورة بقيمة الناتج مباشرة
                </p>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
