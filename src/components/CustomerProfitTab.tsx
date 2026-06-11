import React, { useState, useMemo, useEffect } from 'react';
import { 
  Users, 
  Calendar, 
  TrendingUp, 
  DollarSign, 
  Percent, 
  Trash2, 
  CheckCircle2, 
  Plus, 
  HelpCircle,
  PiggyBank,
  Receipt,
  Printer,
  CalendarDays,
  Coins,
  ArrowRightLeft,
  X,
  CreditCard,
  History
} from 'lucide-react';
import { Contact, LedgerEntry, InventoryItem, Product } from '../types';

interface ProfitRatio {
  id: string;
  percent: number;
  label: string;
}

export interface CommissionPayout {
  id: string;
  customerId: string;
  customerName: string;
  year: number;
  month?: number; // if undefined, custom period/range
  periodLabel: string; // e.g. "يناير 2026"
  amount: number;
  ratioPercent: number;
  calculationType: 'book_profit' | 'goods_total' | 'supplied_amount';
  payoutDate: string;
  paymentMethod: 'cash' | 'bank' | 'paper';
  notes: string;
  expenseId?: string; // Linked ID in standard GeneralExpenses state for audit
}

interface CustomerProfitTabProps {
  contacts: Contact[];
  ledgers: Record<string, LedgerEntry[]>;
  inventory: InventoryItem[];
  products: Product[];
  triggerToast: (msg: string, typ?: 'success' | 'err') => void;
  currencySymbol?: string;
  profitRatios: ProfitRatio[];
  onUpdateProfitRatios: (ratios: ProfitRatio[]) => void;
  commissionPayouts?: CommissionPayout[];
  onUpdateCommissionPayouts?: (payouts: CommissionPayout[]) => void;
  expenses?: any[];
  onUpdateExpenses?: (expenses: any[]) => void;
  currentUser?: any;
}

const ARABIC_MONTHS = [
  { value: 1, label: 'يناير (01)' },
  { value: 2, label: 'فبراير (02)' },
  { value: 3, label: 'مارس (03)' },
  { value: 4, label: 'أبريل (04)' },
  { value: 5, label: 'مايو (05)' },
  { value: 6, label: 'يونيو (06)' },
  { value: 7, label: 'يوليو (07)' },
  { value: 8, label: 'أغسطس (08)' },
  { value: 9, label: 'سبتمبر (09)' },
  { value: 10, label: 'أكتوبر (10)' },
  { value: 11, label: 'نوفمبر (11)' },
  { value: 12, label: 'ديسمبر (12)' }
];

export default function CustomerProfitTab({
  contacts,
  ledgers,
  inventory,
  products,
  triggerToast,
  currencySymbol = 'ج.س',
  profitRatios,
  onUpdateProfitRatios,
  commissionPayouts = [],
  onUpdateCommissionPayouts = () => {},
  expenses = [],
  onUpdateExpenses = () => {},
  currentUser
}: CustomerProfitTabProps) {
  
  // Choose customer
  const customerList = useMemo(() => contacts.filter(c => c.type === 'customer'), [contacts]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(() => {
    return customerList[0]?.id || '';
  });

  const [clientSearch, setClientSearch] = useState<string>('');
  const [activeYear, setActiveYear] = useState<number>(() => new Date().getFullYear());
  const [calculationBase, setCalculationBase] = useState<'book_profit' | 'goods_total' | 'supplied_amount'>('book_profit');
  
  // Custom monthly ratios overrides state
  const [monthlyRatioOverrides, setMonthlyRatioOverrides] = useState<Record<number, number>>({});
  const [globalRatioPercent, setGlobalRatioPercent] = useState<number>(30); // Default to 30%

  // Payment popup state
  const [payoutForm, setPayoutForm] = useState<{
    show: boolean;
    month?: number;
    year: number;
    amount: number;
    periodLabel: string;
    ratioUsed: number;
    paymentMethod: 'cash' | 'bank' | 'paper';
    notes: string;
  } | null>(null);

  // Filter dropdown customers list
  const filteredCustomers = useMemo(() => {
    if (!clientSearch.trim()) return customerList;
    return customerList.filter(c => 
      c.name.toLowerCase().includes(clientSearch.toLowerCase()) || 
      (c.phone && c.phone.includes(clientSearch)) ||
      c.code.toLowerCase().includes(clientSearch.toLowerCase())
    );
  }, [customerList, clientSearch]);

  const selectedCustomer = useMemo(() => {
    return customerList.find(c => c.id === selectedCustomerId) || null;
  }, [customerList, selectedCustomerId]);

  // Sync candidate customer
  useEffect(() => {
    if (selectedCustomerId === '' && customerList.length > 0) {
      setSelectedCustomerId(customerList[0].id);
    }
  }, [customerList, selectedCustomerId]);

  // Landed Cost calculator standard
  const getLandedCost = (
    productId: string,
    typeName: string,
    gradeName: string,
    unitName: string,
    regionName: string,
    fallbackBasePrice: number
  ) => {
    let latestPurchaseCost: number | null = null;
    let latestPurchaseDate = "";

    Object.entries(ledgers).forEach(([contactId, entries]) => {
      const contactObj = contacts.find(c => c.id === contactId);
      if (!contactObj || contactObj.type !== 'supplier') return;

      entries.forEach(entry => {
        if (entry.type !== 'invoice') return;
        if (!entry.items) return;

        const matchedItem = entry.items.find(itm => 
          itm.productId === productId &&
          itm.typeName === typeName &&
          itm.gradeName === gradeName &&
          itm.unitName === unitName &&
          itm.regionName === regionName
        );

        if (matchedItem) {
          const totalExpenses = (entry.transportExpense || 0) + (entry.carryingExpense || 0) + (entry.otherInvoiceExpense || 0);
          const totalQty = entry.items.reduce((sum, item) => sum + (item.qty || 0), 0);
          const additionalCostPerUnit = totalQty > 0 ? (totalExpenses / totalQty) : 0;
          const landedCost = matchedItem.price + additionalCostPerUnit;

          if (!latestPurchaseDate || entry.date > latestPurchaseDate) {
            latestPurchaseDate = entry.date;
            latestPurchaseCost = landedCost;
          }
        }
      });
    });

    if (latestPurchaseCost !== null) {
      return Math.round(latestPurchaseCost);
    }

    const matchedStock = inventory.find(stock => 
      stock.productId === productId &&
      stock.regionName === regionName &&
      stock.typeName === typeName &&
      stock.gradeName === gradeName &&
      stock.unitName === unitName
    );

    if (matchedStock && matchedStock.buyPrice > 0) {
      return matchedStock.buyPrice;
    }

    return Math.round(fallbackBasePrice / 1.30);
  };

  // Compute stats per month dynamically
  const getMonthStats = (month: number) => {
    if (!selectedCustomerId) {
      return {
        totalGoodsAmount: 0,
        totalCostAmount: 0,
        bookProfit: 0,
        actualPaymentsFromLedger: 0,
        invoicesCount: 0
      };
    }

    const yearStr = activeYear.toString();
    const monthStr = String(month).padStart(2, '0');
    const prefix = `${yearStr}-${monthStr}`;

    const customerEntries = ledgers[selectedCustomerId] || [];
    const monthlyEntries = customerEntries.filter(e => e.date && e.date.startsWith(prefix));

    let totalGoodsAmount = 0;
    let totalCostAmount = 0;
    let actualPaymentsFromLedger = 0;
    let invoicesCount = 0;

    monthlyEntries.forEach(entry => {
      if (entry.type === 'invoice') {
        invoicesCount++;
        totalGoodsAmount += entry.total;
        actualPaymentsFromLedger += (entry.paid || 0);

        if (entry.items && entry.items.length > 0) {
          entry.items.forEach(itm => {
            const unitCost = getLandedCost(
              itm.productId,
              itm.typeName,
              itm.gradeName,
              itm.unitName,
              itm.regionName,
              itm.price
            );
            totalCostAmount += (itm.qty * unitCost);
          });
        } else {
          totalCostAmount += Math.round(entry.total * 0.75);
        }
      } else if (entry.type === 'payment') {
        actualPaymentsFromLedger += entry.total;
      }
    });

    const bookProfit = totalGoodsAmount - totalCostAmount;

    return {
      totalGoodsAmount,
      totalCostAmount,
      bookProfit,
      actualPaymentsFromLedger,
      invoicesCount
    };
  };

  // Full calendar year totals
  const annualTotals = useMemo(() => {
    let sales = 0;
    let costs = 0;
    let paid = 0;

    ARABIC_MONTHS.forEach(month => {
      const ms = getMonthStats(month.value);
      sales += ms.totalGoodsAmount;
      costs += ms.totalCostAmount;
      paid += ms.actualPaymentsFromLedger;
    });

    return {
      sales,
      costs,
      profits: sales - costs,
      paid
    };
  }, [selectedCustomerId, activeYear, ledgers, inventory]);

  // Open the payout dialog for any specific month
  const handleOpenPayout = (monthValue: number, monthLabel: string, calculatedAmount: number, ratioUsed: number) => {
    if (calculatedAmount <= 0) {
      alert("⚠️ لا يوجد مبلغ أرباح أو مسحوبات محتسبة مستحقة للصرف في هذا الشهر.");
      return;
    }

    setPayoutForm({
      show: true,
      month: monthValue,
      year: activeYear,
      amount: Math.round(calculatedAmount),
      periodLabel: `${monthLabel} ${activeYear}`,
      ratioUsed: ratioUsed,
      paymentMethod: 'cash',
      notes: `صرف عمولة وأرباح العميل شهر ${monthLabel} بنسبة ${ratioUsed}%`
    });
  };

  // Submit Payout to standard ledgers and general expenses state
  const handleSubmitPayout = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payoutForm || !selectedCustomer) return;

    const amt = payoutForm.amount;
    if (isNaN(amt) || amt <= 0) {
      alert("يرجى إدخال مبلغ سداد صحيح");
      return;
    }

    let linkedExpId: string | undefined = undefined;

    // Deduct from Treasury system registers directly if Cash or Bank matches
    if (payoutForm.paymentMethod === 'cash' || payoutForm.paymentMethod === 'bank') {
      linkedExpId = `exp-payout-${Date.now()}`;
      
      const newExpense = {
        id: linkedExpId,
        date: new Date().toISOString().split('T')[0],
        category: 'صرف عمولات وأرباح عملاء',
        amount: amt,
        paymentMethod: payoutForm.paymentMethod,
        description: `تصفية عمولات العميل: ${selectedCustomer.name} - ${payoutForm.periodLabel} (${payoutForm.notes})`,
        accountantName: currentUser ? currentUser.fullName : "المحاسب العام"
      };

      const nextExpenses = [...expenses, newExpense];
      onUpdateExpenses(nextExpenses);
    }

    const newPayout: CommissionPayout = {
      id: `payout-${Date.now()}`,
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.name,
      year: payoutForm.year,
      month: payoutForm.month,
      periodLabel: payoutForm.periodLabel,
      amount: amt,
      ratioPercent: payoutForm.ratioUsed,
      calculationType: calculationBase,
      payoutDate: new Date().toISOString().split('T')[0],
      paymentMethod: payoutForm.paymentMethod,
      notes: payoutForm.notes,
      expenseId: linkedExpId
    };

    onUpdateCommissionPayouts([newPayout, ...commissionPayouts]);
    setPayoutForm(null);
    triggerToast(`💵 تم سداد وقيد نسبة العميل لـ ${payoutForm.periodLabel} بنجاح!`, 'success');
  };

  // Delete/Rollback past payout
  const handleDeletePayout = (payoutId: string) => {
    const target = commissionPayouts.find(p => p.id === payoutId);
    if (!target) return;

    if (window.confirm(`هل أنت متأكد من إلغاء قيد الصرف بقيمة (${target.amount.toLocaleString()} ج.س) لشهر ${target.periodLabel}؟`)) {
      if (target.expenseId) {
        const nextExpenses = expenses.filter(e => e.id !== target.expenseId);
        onUpdateExpenses(nextExpenses);
      }

      const nextPayouts = commissionPayouts.filter(p => p.id !== payoutId);
      onUpdateCommissionPayouts(nextPayouts);
      triggerToast('↺ تم إلغاء الصرف بنجاح وإعادة الموازنة.');
    }
  };

  // Active client payout history
  const activeCustomerPayouts = useMemo(() => {
    return commissionPayouts.filter(p => p.customerId === selectedCustomerId);
  }, [commissionPayouts, selectedCustomerId]);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 mt-6 mb-12" dir="rtl" id="simplified_profit_tab">
      
      {/* Dynamic Header */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 md:p-6 shadow-xl border border-slate-800 relative overflow-hidden mb-6">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="p-1.5 bg-amber-500/20 text-amber-400 rounded-lg">
                <TrendingUp className="w-5 h-5" />
              </span>
              <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">
                بوابة حساب ومحاسبة عملاء النسب والأرباح
              </h2>
            </div>
            <p className="text-slate-300 text-xs md:text-sm font-semibold">
              إدارة تصفية الأرباح الشهرية بالتفصيل وبحرية تامة. اختر العميل وسنة المحاسبة لاستعراض الشهور وصرف المخصصات يدويًا مع التتبع المستمر.
            </p>
          </div>
          <div className="text-left font-mono text-slate-400 text-xs">
            <span>تاريخ اليوم: {new Date().toLocaleDateString('ar-SD')}</span>
          </div>
        </div>
      </div>

      {/* Primary Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

        {/* Column 1: Selector for client & control methods */}
        <div className="lg:col-span-1 space-y-5">
          
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <h3 className="font-black text-slate-800 text-xs uppercase tracking-wider mb-3 flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <Users className="w-4 h-4 text-blue-600" />
              <span>تحديد عميل المبيعات</span>
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-black text-slate-400 mb-1">تصفية القائمة:</label>
                <input
                  type="text"
                  placeholder="ابحث باسم العميل..."
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  className="w-full text-xs font-black p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 mb-1">اختر العميل *</label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full text-xs font-black p-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 text-slate-850"
                >
                  <option value="">-- اختر العميل --</option>
                  {filteredCustomers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <h3 className="font-black text-slate-800 text-xs uppercase tracking-wider mb-3 flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <Calendar className="w-4 h-4 text-purple-600" />
              <span>خيارات حساب المخصص</span>
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 mb-1">طريقة الحساب الأساسية للمستحقات:</label>
                <select
                  value={calculationBase}
                  onChange={(e) => setCalculationBase(e.target.value as any)}
                  className="w-full text-xs font-black p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none text-slate-700"
                >
                  <option value="book_profit">على صافي الربح الدفتري (مبيعات - تكلفة)</option>
                  <option value="goods_total">على إجمالي مبيعات البضاعة الصادرة للعميل</option>
                  <option value="supplied_amount">على إجمالي المبالغ المسددة والموردة فعلياً</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 mb-1">سنة المحاسبة وعرض السجلات:</label>
                <select
                  value={activeYear}
                  onChange={(e) => setActiveYear(parseInt(e.target.value))}
                  className="w-full text-xs font-black p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none text-slate-700"
                >
                  <option value={2024}>2024 (السجلات السابقة)</option>
                  <option value={2025}>2025 (السجلات الحالية)</option>
                  <option value={2026}>2026 (العام المالي الجديد)</option>
                  <option value={2027}>2027 (العام المالي المخطط)</option>
                </select>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-[10px] font-black text-slate-400">النسبة الافتراضية للشهور (%):</label>
                  <span className="text-[10px] bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded font-black">{globalRatioPercent}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={globalRatioPercent}
                  onChange={(e) => setGlobalRatioPercent(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-purple-600"
                />
                <span className="block text-[9px] text-slate-400 mt-1 font-semibold text-center">يمكنك أيضاً تغيير النسبة لكل شهر في الجدول مستقلًا.</span>
              </div>
            </div>
          </div>

        </div>

        {/* Column 2: Simplified 12-Month Table & interactive payouts */}
        <div className="lg:col-span-3 space-y-6">
          
          {selectedCustomer ? (
            <div className="space-y-6">

              {/* Annual stats strip */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl shadow-2xs">
                  <span className="block text-[9px] text-slate-450 font-black">إجمالي البضاعة والمسحوبات لعام {activeYear}</span>
                  <span className="text-base font-black text-slate-800 font-mono tracking-wide">
                    {annualTotals.sales.toLocaleString()} <span className="text-[10px] text-slate-400 font-sans">{currencySymbol}</span>
                  </span>
                </div>
                <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl shadow-2xs">
                  <span className="block text-[9px] text-slate-450 font-black">صافي الأرباح الدفترية المحققة لعام {activeYear}</span>
                  <span className="text-base font-black text-emerald-600 font-mono tracking-wide">
                    {annualTotals.profits.toLocaleString()} <span className="text-[10px] text-slate-400 font-sans">{currencySymbol}</span>
                  </span>
                </div>
                <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl shadow-2xs">
                  <span className="block text-[9px] text-slate-450 font-black">إجمالي توريدات العميل المسددة لعام {activeYear}</span>
                  <span className="text-base font-black text-blue-600 font-mono tracking-wide">
                    {annualTotals.paid.toLocaleString()} <span className="text-[10px] text-slate-400 font-sans">{currencySymbol}</span>
                  </span>
                </div>
              </div>

              {/* MAIN CALENDAR TABLE OF ARMEN & SALARIES */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                
                <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
                  <div className="flex items-center gap-1.5">
                    <CalendarDays className="w-5 h-5 text-amber-400" />
                    <div>
                      <h3 className="font-extrabold text-xs">جدول شهور السنة لتصفية نسب العميل: <span className="text-amber-300 font-black select-all">{selectedCustomer.name}</span></h3>
                      <p className="text-[10px] text-slate-350">طريقة الاحتساب الحالية: {calculationBase === 'book_profit' ? 'الربح الدفتري' : calculationBase === 'goods_total' ? 'سعر مبيعات البضاعة' : 'المبلغ المورد فعليًا'}</p>
                    </div>
                  </div>
                </div>

                {/* table element */}
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[#0f172a] font-bold select-none">
                        <th className="p-3 text-right">الشهر</th>
                        <th className="p-3 text-center">إجمالي المسحوبات (المبيعات)</th>
                        <th className="p-3 text-center">صافي أرباح البضاعة</th>
                        <th className="p-3 text-center">تحصيلات العميل المسددة</th>
                        <th className="p-3 text-center">النسبة المحتسبة</th>
                        <th className="p-3 text-center">المبلغ المستحق</th>
                        <th className="p-3 text-center">حالة السداد والعملية</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                      {ARABIC_MONTHS.map(month => {
                        const ms = getMonthStats(month.value);
                        
                        // Pick the active ratio: check if there's a custom override, otherwise fallback to globalRatioPercent
                        const rowRatio = monthlyRatioOverrides[month.value] !== undefined 
                          ? monthlyRatioOverrides[month.value] 
                          : globalRatioPercent;

                        // Calculate commission base value
                        let basisValue = 0;
                        if (calculationBase === 'book_profit') basisValue = ms.bookProfit;
                        else if (calculationBase === 'goods_total') basisValue = ms.totalGoodsAmount;
                        else if (calculationBase === 'supplied_amount') basisValue = ms.actualPaymentsFromLedger;

                        const calculatedPayout = Math.max(0, (basisValue * rowRatio) / 100);

                        // Is already paid?
                        const matchingPayout = commissionPayouts.find(p => 
                          p.customerId === selectedCustomerId &&
                          p.year === activeYear &&
                          p.month === month.value
                        );

                        return (
                          <tr key={month.value} className={`hover:bg-slate-50/50 transition-colors ${matchingPayout ? 'bg-emerald-50/20' : ''}`}>
                            <td className="p-3 font-black text-slate-800 text-right">{month.label}</td>
                            
                            <td className="p-3 text-center font-mono">
                              {ms.totalGoodsAmount > 0 ? (
                                <span>{ms.totalGoodsAmount.toLocaleString()} {currencySymbol}</span>
                              ) : (
                                <span className="text-slate-350">---</span>
                              )}
                            </td>
                            
                            <td className="p-3 text-center font-mono text-emerald-700">
                              {ms.bookProfit > 0 ? (
                                <span>{ms.bookProfit.toLocaleString()} {currencySymbol}</span>
                              ) : (
                                <span className="text-slate-350">---</span>
                              )}
                            </td>

                            <td className="p-3 text-center font-mono text-blue-700">
                              {ms.actualPaymentsFromLedger > 0 ? (
                                <span>{ms.actualPaymentsFromLedger.toLocaleString()} {currencySymbol}</span>
                              ) : (
                                <span className="text-slate-350">---</span>
                              )}
                            </td>

                            <td className="p-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  disabled={!!matchingPayout}
                                  value={rowRatio}
                                  onChange={(e) => {
                                    const val = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                                    setMonthlyRatioOverrides(prev => ({
                                      ...prev,
                                      [month.value]: val
                                    }));
                                  }}
                                  className="w-11 font-black p-1 text-center bg-white border border-slate-205 rounded outline-none focus:border-purple-500 disabled:bg-slate-100 disabled:text-slate-400"
                                />
                                <span className="text-[10px] font-bold text-slate-400">%</span>
                              </div>
                            </td>

                            <td className="p-3 text-center font-black text-purple-700 font-mono">
                              {calculatedPayout > 0 ? (
                                <span>{Math.round(calculatedPayout).toLocaleString()} {currencySymbol}</span>
                              ) : (
                                <span className="text-slate-350">---</span>
                              )}
                            </td>

                            <td className="p-3 text-center">
                              {matchingPayout ? (
                                <div className="flex items-center justify-center gap-2">
                                  <span className="bg-emerald-100 text-emerald-800 font-black px-2.5 py-1 rounded text-[10px] inline-flex items-center gap-1 select-none">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>تم صرف مستحقاته ({matchingPayout.amount.toLocaleString()})</span>
                                  </span>
                                  <button
                                    onClick={() => handleDeletePayout(matchingPayout.id)}
                                    className="text-slate-400 hover:text-red-650 p-1 cursor-pointer"
                                    title="حذف هذا الدفع وإلغاء قيد التسوية"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  disabled={calculatedPayout <= 0}
                                  onClick={() => handleOpenPayout(month.value, month.label, calculatedPayout, rowRatio)}
                                  className={`px-3 py-1 rounded-md text-[10px] font-black cursor-pointer shadow-2xs active:scale-95 transition-all w-full max-w-[130px] ${
                                    calculatedPayout > 0 
                                      ? 'bg-amber-500 hover:bg-amber-400 text-slate-900 border border-amber-550' 
                                      : 'bg-slate-100 text-slate-350 cursor-not-allowed border border-slate-200'
                                  }`}
                                >
                                  💳 صرف المخصص للعميل
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

              </div>

              {/* ARCHIVES / RECENT PAYMENTS FOR ACTIVE CUSTOMER */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs" id="history_actives_payouts">
                <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider mb-3 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                  <History className="w-4 h-4 text-slate-500" />
                  <span>السجل التاريخي لعمليات صرف نسب وأرباح العميل</span>
                </h3>

                {activeCustomerPayouts.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-[11px] font-semibold text-slate-600">
                      <thead>
                        <tr className="bg-slate-50 text-slate-700 font-black border-b border-slate-105">
                          <th className="p-2">تاريخ الصرف</th>
                          <th className="p-2">مخصصة لشهر</th>
                          <th className="p-2">النسبة (%)</th>
                          <th className="p-2">طريقة الدفع وقنوات السداد</th>
                          <th className="p-2">المبلغ المالي المصروف</th>
                          <th className="p-2 text-center">إلغاء قيد الصرف</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {activeCustomerPayouts.map(p => (
                          <tr key={p.id} className="hover:bg-slate-55/40">
                            <td className="p-2 font-mono">{p.payoutDate}</td>
                            <td className="p-2 text-slate-900 font-bold">{p.periodLabel}</td>
                            <td className="p-2 font-mono text-purple-700">{p.ratioPercent}%</td>
                            <td className="p-2">
                              <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-black">
                                {p.paymentMethod === 'cash' ? 'خزينة الصندوق النقدي' : p.paymentMethod === 'bank' ? 'حوالة بنكية بنكك' : 'تسوية مستندات ورقية'}
                              </span>
                            </td>
                            <td className="p-2 font-black text-slate-900 font-mono">{p.amount.toLocaleString()} {currencySymbol}</td>
                            <td className="p-2 text-center">
                              <button
                                onClick={() => handleDeletePayout(p.id)}
                                className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
                                title="تراجع وإرجاع المبلغ"
                              >
                                <Trash2 className="w-3.5 h-3.5 inline-block" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-4 text-center text-slate-400 text-[11px]">لا يوجد أي سحوبات أو معاملات سداد نسب تاريخية لهذا العميل خلال العام الحالي.</div>
                )}
              </div>

            </div>
          ) : (
            <div className="bg-white border-2 border-dashed border-slate-200 rounded-xl p-16 text-center text-slate-400 font-extrabold shadow-2xs">
              يرجى اختيار العميل من القائمة الجانبية لاستعراض مستحقاته ونسبه لشهور السنة وجدول سداد أرباحه بالتفصيل.
            </div>
          )}

        </div>

      </div>

      {/* PAYOUT POPUP OVERLAY ACTION */}
      {payoutForm && selectedCustomer && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-55 p-4 select-none">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
              <div className="flex items-center gap-1.5">
                <PiggyBank className="w-5 h-5 text-amber-500" />
                <span className="font-extrabold text-xs">إيصال سداد وصرف نسبة وأرباح العميل</span>
              </div>
              <button
                type="button"
                onClick={() => setPayoutForm(null)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitPayout} className="p-5 space-y-4 text-right">
              <div>
                <label className="block text-[10px] font-black text-slate-400">اسم العميل:</label>
                <span className="text-xs font-black text-slate-900 block mt-0.5">{selectedCustomer.name} ({selectedCustomer.code})</span>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div>
                  <label className="block text-[10px] font-black text-slate-400">للشهرة المحددة:</label>
                  <span className="text-xs font-black text-purple-800 block mt-0.5">{payoutForm.periodLabel}</span>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-450">المستحق المحتسب ({payoutForm.ratioUsed}%):</label>
                  <span className="text-xs font-black text-emerald-700 font-mono block mt-0.5">{payoutForm.amount.toLocaleString()} {currencySymbol}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">المبلغ المراد صرفه الفعلي بقيد السند *</label>
                <input
                  type="number"
                  required
                  value={payoutForm.amount}
                  onChange={(e) => setPayoutForm({ ...payoutForm, amount: parseInt(e.target.value) || 0 })}
                  className="w-full text-base font-black font-mono p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">طريقة السداد / الخزانة المستهدفة:</label>
                <select
                  value={payoutForm.paymentMethod}
                  onChange={(e) => setPayoutForm({ ...payoutForm, paymentMethod: e.target.value as any })}
                  className="w-full text-xs font-black p-2 bg-white border border-slate-300 rounded-md focus:outline-none"
                >
                  <option value="cash">نقداً من الصندوق المالي (الخزينة العامة)</option>
                  <option value="bank">حوالة بنكية من بنكك (سحب من رصيد البنك)</option>
                  <option value="paper">خصم/تسوية ورقية فقط (بدون حركة سيولة مالية بالخزنة)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">ملاحظات وبيان الصرف:</label>
                <textarea
                  value={payoutForm.notes}
                  onChange={(e) => setPayoutForm({ ...payoutForm, notes: e.target.value })}
                  placeholder="مثال: صرف مستحقات شهر كذا كاملة بموافقة الطرفين..."
                  rows={2}
                  className="w-full text-xs font-semibold p-2 bg-white border border-slate-300 rounded-lg text-slate-700 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button
                  type="submit"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-550 text-white font-black text-xs py-2.5 rounded-lg cursor-pointer transition-all shadow-md active:scale-95"
                >
                  صرف وقيد السند 💵
                </button>
                <button
                  type="button"
                  onClick={() => setPayoutForm(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-xs py-2.5 rounded-lg cursor-pointer transition-all"
                >
                  إلغاء
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
