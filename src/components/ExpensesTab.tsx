/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Coins, 
  Plus, 
  Trash2, 
  Printer, 
  Search, 
  Layers, 
  Calendar,
  FileText,
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingDown,
  Tag,
  Briefcase
} from 'lucide-react';
import { GeneralExpense, Contact, LedgerEntry } from '../types';

interface ExpensesTabProps {
  expenses: GeneralExpense[];
  onUpdateExpenses: (updated: GeneralExpense[]) => void;
  contacts: Contact[];
  ledgers: Record<string, LedgerEntry[]>;
  triggerToast: (msg: string, typ?: 'success' | 'err') => void;
  currentUser: any;
  settings?: any;
}

// Fixed standard operational expense categories list
const EXPENSE_CATEGORIES = [
  'ترحيل وشحنات بضائع عامة',
  'عمال شحن وتفريغ (عتالة هامة)',
  'كهرباء مزارع ومياه تشغيل',
  'إيجار مزارع ومستودعات تخزين',
  'ضيافة وخدمات إدارية ومكتبيات',
  'مرتبات وعمالة مؤقتة ومقاولات',
  'معدات زراعية وصيانة مزارع ومضخات',
  'منصرفات تسويق وتعبئة وتغليف',
  'أخرى ومصروفات نثرية متنوعة'
];

export default function ExpensesTab({
  expenses,
  onUpdateExpenses,
  contacts,
  ledgers,
  triggerToast,
  currentUser,
  settings
}: ExpensesTabProps) {
  // Add direct states
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [amountInput, setAmountInput] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank'>('cash');
  const [description, setDescription] = useState<string>('');
  
  // Search and Filters
  const [filterSearch, setFilterSearch] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterMethod, setFilterMethod] = useState<string>('all');

  // Compute invoice direct logistics expenses
  const invoiceLogisticsExpenses = useMemo(() => {
    const list: Array<{
      id: string;
      invoiceNumber: string;
      supplierName: string;
      date: string;
      category: 'ترحيل' | 'عتالة' | 'منصرفات أخرى';
      amount: number;
      paymentMethod: 'cash' | 'bank';
      description: string;
    }> = [];

    Object.keys(ledgers).forEach(cid => {
      const contactObj = contacts.find(c => c.id === cid);
      if (!contactObj || contactObj.type !== 'supplier') return;

      const entries = ledgers[cid] || [];
      entries.forEach(e => {
        if (e.type === 'invoice') {
          const method = e.expensePaymentMethod || e.paymentMethod || 'cash';
          
          if (e.transportExpense && e.transportExpense > 0) {
            list.push({
              id: `${e.id}-trans`,
              invoiceNumber: e.number,
              supplierName: contactObj.name,
              date: e.date,
              category: 'ترحيل',
              amount: e.transportExpense,
              paymentMethod: method,
              description: `ترحيل شحنة مرافقة للفاتورة رقم ${e.number}`
            });
          }
          if (e.carryingExpense && e.carryingExpense > 0) {
            list.push({
              id: `${e.id}-carry`,
              invoiceNumber: e.number,
              supplierName: contactObj.name,
              date: e.date,
              category: 'عتالة',
              amount: e.carryingExpense,
              paymentMethod: method,
              description: `عتالة وتفريغ لشحنة الفاتورة رقم ${e.number}`
            });
          }
          if (e.otherInvoiceExpense && e.otherInvoiceExpense > 0) {
            list.push({
              id: `${e.id}-other`,
              invoiceNumber: e.number,
              supplierName: contactObj.name,
              date: e.date,
              category: 'منصرفات أخرى',
              amount: e.otherInvoiceExpense,
              paymentMethod: method,
              description: `منصرفات منتجات تابعة للفاتورة رقم ${e.number}`
            });
          }
        }
      });
    });

    return list;
  }, [ledgers, contacts]);

  // Combine both general expenses + invoice direct expenses for display
  const combinedExpenses = useMemo(() => {
    const arr: Array<{
      id: string;
      isInvoiceDirect: boolean;
      date: string;
      category: string;
      amount: number;
      paymentMethod: 'cash' | 'bank';
      description: string;
      invoiceNumber?: string;
      supplierName?: string;
      accountantName?: string;
    }> = [];

    // General Expenses
    expenses.forEach(x => {
      arr.push({
        id: x.id,
        isInvoiceDirect: false,
        date: x.date,
        category: x.category,
        amount: x.amount,
        paymentMethod: x.paymentMethod,
        description: x.description,
        invoiceNumber: x.invoiceNumber,
        accountantName: x.accountantName || 'المحاسب المسؤول'
      });
    });

    // Invoice Direct Expenses
    invoiceLogisticsExpenses.forEach(i => {
      arr.push({
        id: i.id,
        isInvoiceDirect: true,
        date: i.date,
        category: `لوجستيات فاتورة (${i.category})`,
        amount: i.amount,
        paymentMethod: i.paymentMethod,
        description: `${i.description} (شريك المورد: ${i.supplierName})`,
        invoiceNumber: i.invoiceNumber,
        supplierName: i.supplierName,
        accountantName: 'النظام اللوجستي'
      });
    });

    // Sort by date descending
    return arr.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenses, invoiceLogisticsExpenses]);

  // Apply Search & Filters
  const filteredCombined = useMemo(() => {
    return combinedExpenses.filter(item => {
      // Search term
      const searchMatch = 
        item.description.includes(filterSearch) || 
        item.category.includes(filterSearch) || 
        (item.invoiceNumber && item.invoiceNumber.includes(filterSearch)) ||
        (item.supplierName && item.supplierName.includes(filterSearch));

      // Category filter
      let catMatch = true;
      if (filterCategory !== 'all') {
        catMatch = item.category.includes(filterCategory);
      }

      // Method filter
      let methodMatch = true;
      if (filterMethod !== 'all') {
        methodMatch = item.paymentMethod === filterMethod;
      }

      return searchMatch && catMatch && methodMatch;
    });
  }, [combinedExpenses, filterSearch, filterCategory, filterMethod]);

  // Statistics Computations
  const stats = useMemo(() => {
    let totalGeneral = 0;
    let totalLogistics = 0;
    let totalCash = 0;
    let totalBank = 0;

    combinedExpenses.forEach(item => {
      if (item.isInvoiceDirect) {
        totalLogistics += item.amount;
      } else {
        totalGeneral += item.amount;
      }

      if (item.paymentMethod === 'cash') {
        totalCash += item.amount;
      } else {
        totalBank += item.amount;
      }
    });

    return {
      totalGeneral,
      totalLogistics,
      grandTotal: totalGeneral + totalLogistics,
      totalCash,
      totalBank
    };
  }, [combinedExpenses]);

  // Form Submit Handler for New General Expense
  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amountInput);
    if (isNaN(amt) || amt <= 0) {
      triggerToast("❌ يرجى إدخال مبلغ سليم أكبر من الصفر للمنصرفات", "err");
      return;
    }

    if (!description.trim()) {
      triggerToast("❌ يرجى تعبئة تفاصيل وبيان المنصرف بدقة", "err");
      return;
    }

    const newExpense: GeneralExpense = {
      id: `exp-${Date.now()}`,
      date,
      category,
      amount: amt,
      paymentMethod,
      description: description.trim(),
      accountantName: currentUser ? currentUser.fullName : "المحاسب العام"
    };

    onUpdateExpenses([...expenses, newExpense]);
    setAmountInput('');
    setDescription('');
    triggerToast("🎉 تم قيد وتبويب المنصرف الإداري بنجاح وتحديث أرصدة الصرف!");
  };

  // Delete General Expense Handler
  const handleDeleteExpense = (id: string, name: string) => {
    const isDirect = id.includes('-trans') || id.includes('-carry') || id.includes('-other');
    if (isDirect) {
      triggerToast("⚠️ لا يمكن حذف منصرف داخل الفاتورة من هنا، الرجاء تعديل الفاتورة الأصلية لحذف منصرفاتها", "err");
      return;
    }

    if (confirm(`هل أنت متأكد من رغبتك في حذف منصرف [${name}] نهائياً؟ ستتم إعادة الأرصدة التلقائية.`)) {
      const next = expenses.filter(x => x.id !== id);
      onUpdateExpenses(next);
      triggerToast("🗑️ تم إلغاء وحذف المنصرف بنجاح وتحديث الأرصدة المالية بنشاط.");
    }
  };

  // Printing Expenses Report
  const handlePrintExpenses = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-fade-in text-right font-sans" dir="rtl">
      
      {/* 1. Header Banner */}
      <div className="bg-slate-950 text-white rounded-2xl p-6 relative overflow-hidden select-none border border-slate-800 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
        <div className="z-10 space-y-1">
          <span className="text-[10px] bg-rose-500 text-white px-2 py-0.5 rounded-full font-black animate-pulse">
            الدورة المحاسبية العامة
          </span>
          <h2 className="text-xl font-black flex items-center gap-2">
            <Coins className="w-6 h-6 text-rose-500" />
            <span>شاشة قيد وضبط المنصرفات التشغيلية واللوجستية</span>
          </h2>
          <p className="text-xs text-slate-300 max-w-2xl">
            هذه الشاشة الموحدة تخدم ضبط المصروفات الإدارية، إيجار المزارع، أجور العمالة المؤقتة، وتكاليف النقل (الترحيل) أو التفريغ للسيارات، بشكل يخصم من الخزينة فورياً بمطابقة سلسة.
          </p>
        </div>
        <button
          onClick={handlePrintExpenses}
          className="bg-slate-800 hover:bg-slate-700 hover:scale-[1.02] border border-slate-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl cursor-pointer flex items-center gap-1.5 shadow-md transition-all self-end md:self-auto shrink-0 select-none font-mono"
        >
          <Printer className="w-4 h-4 text-rose-400" />
          <span>طباعة كشف حركات المنصرفات</span>
        </button>
      </div>

      {/* 2. Top Statistics Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* Total Overall Expenses */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between h-[96px] shadow-xs">
          <div className="flex justify-between items-center text-slate-500 text-[10px] font-bold">
            <span>إجمالي كافة منصرفات التشغيل</span>
            <TrendingDown className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-lg font-black font-mono tracking-tight text-slate-900">
            {stats.grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })} <span className="text-[10px] font-sans font-bold text-slate-400">ج.س</span>
          </div>
        </div>

        {/* General Expenses */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between h-[96px] shadow-xs">
          <div className="flex justify-between items-center text-slate-500 text-[10px] font-bold">
            <span>منصرفات تشغيلية إدارية مسجلة</span>
            <Tag className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-lg font-black font-mono tracking-tight text-blue-600">
            {stats.totalGeneral.toLocaleString('en-US', { minimumFractionDigits: 2 })} <span className="text-[10px] font-sans font-bold text-slate-400">ج.س</span>
          </div>
        </div>

        {/* Direct Invoice Expenses */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between h-[96px] shadow-xs">
          <div className="flex justify-between items-center text-slate-500 text-[10px] font-bold">
            <span>منصرفات فواتير شراء (ترحيل/عتالة)</span>
            <Briefcase className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-lg font-black font-mono tracking-tight text-amber-650 text-amber-650 text-amber-600">
            {stats.totalLogistics.toLocaleString('en-US', { minimumFractionDigits: 2 })} <span className="text-[10px] font-sans font-bold text-slate-400">ج.س</span>
          </div>
        </div>

        {/* Paid from Cash */}
        <div className="bg-emerald-50/40 border border-emerald-100 rounded-xl p-4 flex flex-col justify-between h-[96px] shadow-xs">
          <div className="flex justify-between items-center text-emerald-900 text-[10px] font-bold">
            <span>مجموع الصرف النقدي (مخصوم الصندوق)</span>
            <ArrowDownLeft className="w-4 h-4 text-emerald-650" />
          </div>
          <div className="text-lg font-black font-mono tracking-tight text-emerald-700">
            {stats.totalCash.toLocaleString('en-US', { minimumFractionDigits: 2 })} <span className="text-[10px] font-sans font-bold text-slate-400">ج.س</span>
          </div>
        </div>

        {/* Paid from Bank */}
        <div className="bg-sky-50/40 border border-sky-100 rounded-xl p-4 flex flex-col justify-between h-[96px] shadow-xs">
          <div className="flex justify-between items-center text-sky-900 text-[10px] font-bold">
            <span>مجموع مخروج الحسابات (بنكك)</span>
            <ArrowUpRight className="w-4 h-4 text-sky-650" />
          </div>
          <div className="text-lg font-black font-mono tracking-tight text-sky-700">
            {stats.totalBank.toLocaleString('en-US', { minimumFractionDigits: 2 })} <span className="text-[10px] font-sans font-bold text-slate-400">ج.س</span>
          </div>
        </div>

      </div>

      {/* 3. Main Split Screen Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* Form: Add New Expense */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm no-print">
          <h3 className="text-xs font-black text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-3 select-none">
            <Plus className="w-4 h-4 text-rose-500" />
            <span>تسجيل قيد منصرف إداري أو تشغيلي جديد</span>
          </h3>

          <form onSubmit={handleAddExpense} className="space-y-4 text-xs md:text-sm">
            {/* Value Date */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1">تاريخ المعاملة والمنصرف *</label>
              <input 
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 font-semibold font-mono text-xs"
              />
            </div>

            {/* Category selection list */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1">مجموعة وبيان المصروف الإداري *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded px-2 text-xs py-1.5 font-bold"
                required
              >
                {EXPENSE_CATEGORIES.map((cat, idx) => (
                  <option key={idx} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Cash/Amount */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1">المبلغ المطلوب صرفه بالأرقام * (ج.س)</label>
              <input 
                type="number"
                step="0.01"
                required
                placeholder="0.00"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 font-black text-rose-600 font-mono text-xs"
              />
            </div>

            {/* Fund payment source */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1">مصدر الخصم والصندوق *</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as 'cash' | 'bank')}
                className="w-full bg-emerald-50 border border-emerald-200 text-emerald-950 font-black rounded px-2 text-xs py-1.5"
                required
              >
                <option value="cash">💵 الخزينة النقدية وصندوق النقدية</option>
                <option value="bank">🏦 الحساب البنكي الرئيسي (تطبيق بنكك)</option>
              </select>
            </div>

            {/* Description detailed statement */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1">أصل بيان وتفاصيل المنصرف بدقة *</label>
              <textarea
                required
                rows={3}
                placeholder="يرجى كتابة التفاصيل بالتفصيل (مثل: دفع فاتورة كهرباء مكتب سوق الفاكهة الرئيسي لشهر مايو...)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs font-semibold outline-none focus:bg-white text-slate-800"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-slate-900 border border-slate-800 hover:bg-slate-800 text-amber-400 font-black px-4 py-2 text-xs text-center rounded-xl cursor-pointer shadow-md transition-all pt-2.5"
            >
              🚀 قيد وتمرير المصروف فوراً بالصناديق
            </button>
          </form>
        </div>

        {/* List of expenses combined logs */}
        <div className="lg:col-span-8 space-y-4">
          
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-3 select-none no-print">
              <div>
                <h3 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-blue-600" />
                  <span>تاريخ وسجل المصروفات المدمج والمفصل</span>
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">يعرض كافة فئات المنصرفات النثرية المنفردة، بجانب مصروفات الفواتير المندرجة لوجستياً.</p>
              </div>

              <div className="text-[9px] font-black text-slate-500 bg-slate-100 px-2 py-1 rounded">
                إجمالي المعروض: {filteredCombined.length} حركة تبويب
              </div>
            </div>

            {/* Search Filters Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 no-print">
              {/* Text Search */}
              <div className="relative">
                <input 
                  type="text"
                  placeholder="ابحث بالبيان أو رقم الفاتورة..."
                  value={filterSearch}
                  onChange={(e) => setFilterSearch(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 pr-8 text-xs font-semibold outline-none focus:bg-white focus:border-slate-300 text-slate-800"
                />
                <Search className="w-4 h-4 text-slate-400 absolute right-2.5 top-2" />
              </div>

              {/* Group Category filter */}
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold"
              >
                <option value="all">كل فئات المصاريف والمنصرفات</option>
                {EXPENSE_CATEGORIES.map((cat, idx) => (
                  <option key={idx} value={cat}>{cat}</option>
                ))}
                <option value="لوجستيات فاتورة">لوجستيات الفواتير المباشرة (ترحيل/عتالة)</option>
              </select>

              {/* Payment Method filter */}
              <select
                value={filterMethod}
                onChange={(e) => setFilterMethod(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold"
              >
                <option value="all">كل قنوات التمويل (كاش أو بنك)</option>
                <option value="cash">💵 الخزينة النقدية فقط</option>
                <option value="bank">🏦 الحساب البنكي بنكك فقط</option>
              </select>
            </div>

            {/* Expenses Table */}
            <div className="border border-slate-200 rounded-xl overflow-x-auto shadow-xs">
              <table className="w-full text-xs text-right border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white select-none text-[10px] font-black uppercase tracking-wider">
                    <th className="p-3">تاريخ القيد</th>
                    <th className="p-3">فئة وتبويب المصروف</th>
                    <th className="p-3">التفاصيل والبيان المالي</th>
                    <th className="p-3 text-center">أصل المدفوع بالخزينة</th>
                    <th className="p-3 text-center">مصدر الصرف</th>
                    <th className="p-3 text-center">المحاسب المسؤول</th>
                    <th className="p-3 text-center no-print">إجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150">
                  {filteredCombined.length > 0 ? (
                    filteredCombined.map((itm) => {
                      return (
                        <tr 
                          key={itm.id} 
                          className={`hover:bg-slate-50/60 leading-relaxed font-semibold transition-colors ${
                            itm.isInvoiceDirect ? 'bg-amber-50/15' : ''
                          }`}
                        >
                          <td className="p-3 whitespace-nowrap font-mono font-bold text-slate-500">
                            {itm.date}
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black ${
                              itm.isInvoiceDirect 
                                ? 'bg-amber-100 text-amber-950 border border-amber-200' 
                                : 'bg-slate-100 text-slate-800'
                            }`}>
                              {itm.category}
                            </span>
                          </td>
                          <td className="p-3 max-w-[240px] break-words text-slate-700 text-[11px]">
                            <p>{itm.description}</p>
                            {itm.invoiceNumber && (
                              <p className="text-[9px] text-blue-600 font-mono font-bold mt-0.5">
                                [مربوط لوجستياً بفاتورة المشتريات: {itm.invoiceNumber}]
                              </p>
                            )}
                          </td>
                          <td className="p-3 whitespace-nowrap text-center font-mono font-extrabold text-rose-600 text-xs text-center">
                            {(itm.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-3 whitespace-nowrap text-center">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black ${
                              itm.paymentMethod === 'cash' 
                                ? 'bg-emerald-100 text-emerald-805 text-emerald-800' 
                                : 'bg-sky-100 text-sky-850 text-sky-800'
                            }`}>
                              {itm.paymentMethod === 'cash' ? "💵 صندوق نقدي" : "🏦 بنكك"}
                            </span>
                          </td>
                          <td className="p-3 whitespace-nowrap text-center text-slate-400 text-[10px]">
                            {itm.accountantName}
                          </td>
                          <td className="p-3 whitespace-nowrap text-center no-print">
                            {itm.isInvoiceDirect ? (
                              <span 
                                title="هذا المصروف مدمج داخل الفاتورة، يرجى حذفه داخل الفاتورة الأصلية إذا رغبت"
                                className="text-[10px] text-slate-300 font-black cursor-not-allowed select-none"
                              >
                                لوجستي تلقائي
                              </span>
                            ) : (
                              <button
                                onClick={() => handleDeleteExpense(itm.id, itm.description)}
                                className="text-slate-400 hover:text-red-650 hover:bg-red-50 p-1.5 rounded-md hover:scale-105 transition-all text-red-600"
                                title="مسح المصروف"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400 text-xs">لا توجد حركات منصرفات تناسب البيانات المدخلة حالياً.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* General Policy Warm Alert */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-start gap-2.5 text-slate-500 text-[11px] select-none no-print">
              <AlertTriangle className="w-4 h-4 text-emerald-650 shrink-0 mt-0.5" />
              <div>
                <p className="font-extrabold text-slate-800">قواعد وإرشادات التوثيق المتزن للشركة</p>
                <p className="leading-relaxed mt-0.5">
                  جميع المنصرفات المسجلة هنا تنعكس مباشرة في لوائح صندوق الخزينة أو تسويات الحسابات البنكية بشكل لحظي. في حال اكتشاف خطأ بالصرف التلقائي الملحق بالفاتورة، يتطلب ضبط حقول "الترحيل" أو "العتالة" ببيانات الفواتير لتصحيح القيود الدفترية اللوجستية تلقائياً.
                </p>
              </div>
            </div>

          </div>

          {/* Print Letterhead layout displayed only when printing */}
          <div className="only-print mt-8 text-xs border border-slate-350 p-6 rounded-lg text-slate-800 hidden">
            <div className="text-center space-y-2 border-b border-slate-200 pb-4 mb-4 select-none">
              <h1 className="text-base font-black uppercase tracking-tight">{settings?.invoiceHeaderAr || "شركة مزارع الإنتاج الزراعي والحيواني المتكاملة"}</h1>
              <p className="text-[10px] text-slate-500 font-mono font-bold">تقرير تفصيلي بكافة مصروفات وتكلفة البضائع التشغيلية والمشتريات</p>
            </div>
            <div className="grid grid-cols-2 gap-4 my-4 font-mono select-none">
              <p>تاريخ استباط التقرير: {new Date().toISOString().split('T')[0]}</p>
              <p className="text-left">نوع التقرير: المنصرفات المدمجة الموحدة</p>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
