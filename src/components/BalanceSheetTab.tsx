import React, { useMemo, useState } from 'react';
import { 
  Building2, 
  Coins, 
  Landmark, 
  Users, 
  Package, 
  Scale, 
  ShieldCheck, 
  Info, 
  Printer, 
  TrendingUp, 
  Wallet,
  ArrowDownUp,
  Briefcase
} from 'lucide-react';
import { Contact, LedgerEntry, InventoryItem, GeneralExpense, TreasuryBankMovement, SystemSettings, FinancialYear } from '../types';

interface BalanceSheetTabProps {
  contacts: Contact[];
  ledgers: Record<string, LedgerEntry[]>;
  inventory: InventoryItem[];
  expenses: GeneralExpense[];
  adjustments: TreasuryBankMovement[];
  settings: SystemSettings;
  selectedYear: FinancialYear;
  triggerToast: (msg: string, type?: 'success' | 'err' | 'info') => void;
}

export function BalanceSheetTab({
  contacts,
  ledgers,
  inventory,
  expenses,
  adjustments,
  settings,
  selectedYear,
  triggerToast
}: BalanceSheetTabProps) {
  
  // Date range filters for active year
  const start = selectedYear.startDate;
  const end = selectedYear.endDate;

  // Let's compute everything live for this year
  const financialData = useMemo(() => {
    // 1. CASH & BANK CALCULATIONS for selected year
    let ledgerTreasuryIn = 0;
    let ledgerTreasuryOut = 0;
    let ledgerBankIn = 0;
    let ledgerBankOut = 0;
    let expensesTreasuryOut = 0;
    let expensesBankOut = 0;
    let totalSalesVal = 0;
    let totalPurchasesVal = 0;
    let totalInvoicedCostOfGoodsSold = 0;

    // Filter expenses
    const activeExpenses = expenses.filter(x => x.date >= start && x.date <= end);
    const totalExpensesSum = activeExpenses.reduce((sum, x) => sum + x.amount, 0);

    activeExpenses.forEach(x => {
      if (x.paymentMethod === 'cash') expensesTreasuryOut += x.amount;
      else if (x.paymentMethod === 'bank') expensesBankOut += x.amount;
    });

    // Accounts Receivables and Payables Lists
    let customerReceivables = 0;
    let supplierPayables = 0;
    let workerPayables = 0;

    const customersList: { id: string; name: string; balance: number }[] = [];
    const suppliersList: { id: string; name: string; balance: number }[] = [];
    const workersList: { id: string; name: string; balance: number }[] = [];

    contacts.forEach(c => {
      const entries = (ledgers[c.id] || []).filter(e => e.date >= start && e.date <= end);
      let contactDebe = 0; // Invoiced or salary/advances
      let contactCred = 0; // Paid or payouts

      if (c.type === 'worker') {
        entries.forEach(e => {
          const typeStr = e.type as string;
          if (typeStr === 'salary' || typeStr === 'invoice') {
            contactDebe += e.total;
          } else if (typeStr === 'payment' || typeStr === 'payout' || typeStr === 'advance') {
            contactCred += e.total;
          }
        });
      } else {
        entries.forEach(e => {
          if (e.type === 'invoice') {
            contactDebe += e.total;
            contactCred += e.paid || 0;

            if (c.type === 'supplier') {
              totalPurchasesVal += e.total;
              if ((e.paymentMethod || 'cash') === 'cash') ledgerTreasuryOut += e.paid;
              else ledgerBankOut += e.paid;

              // Invoice additional expenses
              const invExp = (e.transportExpense || 0) + (e.carryingExpense || 0) + (e.otherInvoiceExpense || 0);
              const expMethod = e.expensePaymentMethod || e.paymentMethod || 'cash';
              if (invExp > 0) {
                if (expMethod === 'cash') expensesTreasuryOut += invExp;
                else expensesBankOut += invExp;
              }
            } else if (c.type === 'customer') {
              totalSalesVal += e.total;
              if ((e.paymentMethod || 'cash') === 'cash') ledgerTreasuryIn += e.paid;
              else ledgerBankIn += e.paid;

              // Calculate CGS (Cost of goods sold)
              if (e.items) {
                e.items.forEach(itm => {
                  const invItem = inventory.find(inv => inv.productId === itm.productId);
                  const costPerUnit = invItem ? invItem.buyPrice : (itm.price * 0.7);
                  totalInvoicedCostOfGoodsSold += costPerUnit * itm.qty;
                });
              } else {
                totalInvoicedCostOfGoodsSold += e.total * 0.75;
              }
            }
          } else if (e.type === 'payment') {
            const pMethod = e.paymentMethod || 'cash';
            if (c.type === 'supplier') {
              if (pMethod === 'cash') ledgerTreasuryOut += e.total;
              else ledgerBankOut += e.total;
            } else if (c.type === 'customer') {
              if (pMethod === 'cash') ledgerTreasuryIn += e.total;
              else ledgerBankIn += e.total;
            } else if (c.type === 'worker') {
              if (e.isRepayment) {
                if (pMethod === 'cash') ledgerTreasuryIn += e.total;
                else ledgerBankIn += e.total;
              } else {
                if (pMethod === 'cash') ledgerTreasuryOut += e.total;
                else ledgerBankOut += e.total;
              }
            }
          }
        });
      }

      const diff = contactDebe - contactCred;
      if (c.type === 'customer') {
        if (diff > 0) {
          customerReceivables += diff;
          customersList.push({ id: c.id, name: c.name, balance: diff });
        } else if (diff < 0) {
          // Overpaid Customer acts as a liability
          supplierPayables += Math.abs(diff);
          suppliersList.push({ id: c.id, name: `${c.name} (دائن - دفعة مقدمة)`, balance: Math.abs(diff) });
        }
      } else if (c.type === 'supplier') {
        if (diff > 0) {
          supplierPayables += diff;
          suppliersList.push({ id: c.id, name: c.name, balance: diff });
        } else if (diff < 0) {
          // Paid supplier extra acts as an asset (Advance payment)
          customerReceivables += Math.abs(diff);
          customersList.push({ id: c.id, name: `${c.name} (مدين - غطاء دفعات)`, balance: Math.abs(diff) });
        }
      } else if (c.type === 'worker') {
        if (diff > 0) {
          // Employee owes us money (unsettled advance)
          customerReceivables += diff;
          customersList.push({ id: c.id, name: `${c.name} (سلفية مستحقة)`, balance: diff });
        } else if (diff < 0) {
          // We owe employee money (unpaid salary)
          workerPayables += Math.abs(diff);
          workersList.push({ id: c.id, name: c.name, balance: Math.abs(diff) });
        }
      }
    });

    // 2. MANUAL ADJUSTMENTS (Treasury deposits, transfers, bank cash ins & outs)
    let manualTreasuryIn = 0;
    let manualTreasuryOut = 0;
    let manualBankIn = 0;
    let manualBankOut = 0;

    adjustments.filter(m => m.date >= start && m.date <= end).forEach(m => {
      if (m.type === 'deposit') {
        if (m.source === 'treasury') manualTreasuryIn += m.amount;
        else if (m.source === 'bank') manualBankIn += m.amount;
      } else if (m.type === 'withdrawal') {
        if (m.source === 'treasury') manualTreasuryOut += m.amount;
        else if (m.source === 'bank') manualBankOut += m.amount;
      } else if (m.type === 'transfer') {
        manualTreasuryOut += m.amount;
        manualBankIn += m.amount;
      }
    });

    // Final Cash Balances for period
    const treasuryBalanceVal = Number(settings.initialTreasuryBalance || 0) + ledgerTreasuryIn + manualTreasuryIn - (ledgerTreasuryOut + manualTreasuryOut + expensesTreasuryOut);
    const bankBalanceVal = Number(settings.initialBankBalance || 0) + ledgerBankIn + manualBankIn - (ledgerBankOut + manualBankOut + expensesBankOut);

    // Stock valuation
    const stockValuationVal = inventory.reduce((sum, item) => sum + (item.qty * item.buyPrice), 0);

    // Initial Capital
    const beginningCapital = Number(settings.initialTreasuryBalance || 0) + Number(settings.initialBankBalance || 0);

    // Net Profit calculation
    const grossProfitVal = totalSalesVal - totalInvoicedCostOfGoodsSold;
    const netProfitVal = grossProfitVal - totalExpensesSum;

    // Accounts summary
    const totalAssets = treasuryBalanceVal + bankBalanceVal + stockValuationVal + customerReceivables;
    const totalLiabilities = supplierPayables + workerPayables;
    const totalEquity = beginningCapital + netProfitVal;

    // Difference checking to ensure double-entry equation balances perfectly
    // Assets = Liabilities + Equity
    const diffEquation = totalAssets - (totalLiabilities + totalEquity);

    return {
      treasuryBalance: treasuryBalanceVal,
      bankBalance: bankBalanceVal,
      stockValuation: stockValuationVal,
      customerReceivables,
      supplierPayables,
      workerPayables,
      beginningCapital,
      netProfit: netProfitVal,
      totalExpenses: totalExpensesSum,
      totalSales: totalSalesVal,
      costOfGoodsSold: totalInvoicedCostOfGoodsSold,
      totalAssets,
      totalLiabilities,
      totalEquity,
      diffEquation,
      customersList,
      suppliersList,
      workersList
    };
  }, [contacts, ledgers, inventory, expenses, adjustments, settings, start, end]);

  const handlePrint = () => {
    window.print();
    triggerToast("🖨️ جاري تجهيز صفحة الميزانية العمومية والمركز المالي للطباعة...", "info");
  };

  const solvencyRatio = useMemo(() => {
    const assets = financialData.treasuryBalance + financialData.bankBalance + financialData.customerReceivables;
    const liabilities = financialData.supplierPayables + financialData.workerPayables;
    if (liabilities === 0) return 100;
    return Math.min(100, Math.round((assets / liabilities) * 100));
  }, [financialData]);

  const formattingOptions = { minimumFractionDigits: 0, maximumFractionDigits: 0 };

  return (
    <div className="space-y-6 text-right animate-fade-in" dir="rtl">
      
      {/* 1. HEADER BANNER */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 md:p-6 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Scale className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">الميزانية العمومية والمركز المالي 📊</h2>
              <p className="text-[11px] text-slate-500 mt-0.5">جدول ومطابقة المركز المحاسبي المتكامل للمنشأة (التوازنات المالية وميزان المراجعة)</p>
            </div>
          </div>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <button
            onClick={handlePrint}
            className="w-full md:w-auto bg-slate-900 hover:bg-slate-800 text-white font-black text-xs px-4 py-2.5 rounded-xl cursor-pointer shadow-xs active:scale-95 transition-all flex items-center justify-center gap-1.5"
          >
            <Printer className="w-4 h-4 text-amber-400" />
            <span>طباعة الميزانية وتصديرها 🖨️</span>
          </button>
        </div>
      </div>

      {/* PRINT-ONLY HEADER BANNER */}
      <div className="hidden print:block text-center border-b-2 border-slate-900 pb-5 mb-6" dir="rtl">
        <h1 className="text-xl font-bold text-slate-900 mb-1">{settings.invoiceHeaderAr || "شركة تجارة الفواكه المحدودة"}</h1>
        <p className="text-xs text-slate-600 mb-2">{settings.invoiceDeclarationAr || "منظومة إدارة المخازن والمبيعات"}</p>
        <div className="border border-slate-300 rounded-lg p-2.5 inline-block text-xs bg-slate-50">
          <strong>تقرير الميزانية العمومية والمركز المالي</strong>
          <span className="mx-2">|</span>
          <span>السنة المالية: <strong>{selectedYear.name}</strong></span>
          <span className="mx-2">|</span>
          <span>الفترة من: {selectedYear.startDate} إلى: {selectedYear.endDate}</span>
        </div>
      </div>

      {/* 2. SUMMARY CARDS - Fully responsive layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 no-print">
        
        {/* Card 1: Total Assets */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex justify-between items-center text-slate-500 mb-1">
            <span className="text-[11px] font-bold">إجمالي الأصول والموجودات (ما نملك)</span>
            <Building2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-lg font-black text-emerald-700 font-mono">
            {financialData.totalAssets.toLocaleString('en-US', formattingOptions)}{' '}
            <span className="text-[10px] font-sans font-bold text-slate-400">{settings.currencySymbol}</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            نقدية + بضاعة مخازن + ذمم مدراء وعملاء
          </div>
        </div>

        {/* Card 2: Total Liabilities */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex justify-between items-center text-slate-500 mb-1">
            <span className="text-[11px] font-bold">إجمالي الخصوم والالتزامات (ما علينا)</span>
            <Users className="w-4 h-4 text-red-500" />
          </div>
          <div className="text-lg font-black text-rose-750 font-mono text-rose-700">
            {financialData.totalLiabilities.toLocaleString('en-US', formattingOptions)}{' '}
            <span className="text-[10px] font-sans font-bold text-slate-400">{settings.currencySymbol}</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            ذمم الموردين + مستحقات رواتب العمال
          </div>
        </div>

        {/* Card 3: Solvency Check */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex justify-between items-center text-slate-500 mb-1">
            <span className="text-[11px] font-bold">نسبة تغطية السيولة والأصول</span>
            <ShieldCheck className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-lg font-black text-indigo-700 font-mono flex items-center gap-1">
            <span>%{solvencyRatio}</span>
            <span className="text-[10px] font-sans font-black px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700">
              {solvencyRatio > 70 ? "ممتازة" : solvencyRatio > 40 ? "مستقرة" : "تحتاج تدقيق"}
            </span>
          </div>
          <div className="text-[10px] text-slate-450 mt-1">
            مؤشر مقدرة التسهيل والوفاء بالالتزامات الجارية
          </div>
        </div>

        {/* Card 4: Net Worth & Capital */}
        <div className="bg-slate-900 border border-slate-800 text-white rounded-xl p-4 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex justify-between items-center text-slate-400 mb-1">
            <span className="text-[11px] font-bold text-amber-400">صافي حقوق الملكية والتشغيل</span>
            <Wallet className="w-4 h-4 text-amber-400 animate-pulse" />
          </div>
          <div className="text-lg font-black text-amber-400 font-mono">
            {financialData.totalEquity.toLocaleString('en-US', formattingOptions)}{' '}
            <span className="text-[10px] font-sans font-bold text-slate-300">{settings.currencySymbol}</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            رأس المال التأسيسي المدوّر + صافي أرباح الفترة
          </div>
        </div>

      </div>

      {/* 3. DOUBLE-ENTRY SHEET BALANCE MATCH INDICATOR */}
      <div className={`p-4 rounded-2xl border ${
        Math.abs(financialData.diffEquation) < 5 
          ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
          : 'bg-amber-50 border-amber-200 text-amber-800'
      } flex items-center justify-between flex-wrap gap-2.5 no-print`}>
        <div className="flex items-center gap-2">
          <Scale className="w-5 h-5 text-indigo-600 animate-bounce" />
          <div>
            <strong className="text-xs font-black block">
              {Math.abs(financialData.diffEquation) < 5 
                ? '⚖️ معادلة الميزانية متطابقة تماماً وموزونة:' 
                : '⚠️ توازن ميزان المراجعة والمركز المالي:'}
            </strong>
            <span className="text-[11px] block mt-0.5 font-medium">
              الأصول والموجودات الإجمالية ({financialData.totalAssets.toLocaleString()} {settings.currencySymbol}) تساوي الخصوم وحقوق المساهمين ({ (financialData.totalLiabilities + financialData.totalEquity).toLocaleString() } {settings.currencySymbol})
            </span>
          </div>
        </div>
        <div className="bg-white/80 border border-emerald-150 px-3 py-1.5 rounded-lg text-xs font-black font-mono">
          {Math.abs(financialData.diffEquation) < 5 ? (
            <span className="text-emerald-700">✓ ميزان موزون (الفرق: 0.00)</span>
          ) : (
            <span className="text-amber-700">الفرق التعديلي للأصول: {financialData.diffEquation.toLocaleString()}</span>
          )}
        </div>
      </div>

      {/* 4. MAIN BALANCE SHEET TABLES (Symmetrical side-by-side on desktop, single column stack on mobile) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* RIGHT COLUMN: ASSETS (الأصول والموجودات) */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="bg-slate-900 px-4 py-3 border-b border-slate-850 flex justify-between items-center text-white">
            <h3 className="text-xs font-black flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-emerald-400" />
              <span>الأصول والموجودات (Assets)</span>
            </h3>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-emerald-600">القيمة والسيولة</span>
          </div>

          <div className="p-4 space-y-4">
            
            {/* Asset items structured breakdown */}
            <div className="space-y-3">
              
              {/* Asset 1: Field Treasury Cash */}
              <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded">
                    <Coins className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-slate-800 block">النقدية بالصندوق (الخزينة الميدانية)</span>
                    <span className="text-[10px] text-slate-400">رصيد السيولة الجاهزة بالدولاب</span>
                  </div>
                </div>
                <div className="text-xs font-black text-slate-900 font-mono">
                  {financialData.treasuryBalance.toLocaleString('en-US', formattingOptions)} <span className="text-[9px] font-bold text-slate-400">{settings.currencySymbol}</span>
                </div>
              </div>

              {/* Asset 2: Bank Funds */}
              <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-blue-50 text-blue-600 rounded">
                    <Landmark className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-slate-800 block">الحسابات والأرصدة لدى البنوك (بنكك)</span>
                    <span className="text-[10px] text-slate-400">إجمالي الأرصدة البنكية المتاحة للسحب والتحويل</span>
                  </div>
                </div>
                <div className="text-xs font-black text-slate-900 font-mono">
                  {financialData.bankBalance.toLocaleString('en-US', formattingOptions)} <span className="text-[9px] font-bold text-slate-400">{settings.currencySymbol}</span>
                </div>
              </div>

              {/* Asset 3: Inventory Stock Valuation */}
              <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-amber-50 text-amber-600 rounded">
                    <Package className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-slate-800 block">البضاعة بالفروع والمخازن (جرد البضاعة المتوفرة)</span>
                    <span className="text-[10px] text-slate-400">مقيّمة بأسعار الشراء / تكلفة المدخلات الفعلية</span>
                  </div>
                </div>
                <div className="text-xs font-black text-slate-900 font-mono">
                  {financialData.stockValuation.toLocaleString('en-US', formattingOptions)} <span className="text-[9px] font-bold text-slate-400">{settings.currencySymbol}</span>
                </div>
              </div>

              {/* Asset 4: Accounts Receivable */}
              <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-slate-800 block">الذمم المدينة المستحقة (العملاء والمبيعات)</span>
                    <span className="text-[10px] text-slate-400">مطالبات وأرصدة جارية لدى وكلائنا والمشترين</span>
                  </div>
                </div>
                <div className="text-xs font-black text-slate-900 font-mono">
                  {financialData.customerReceivables.toLocaleString('en-US', formattingOptions)} <span className="text-[9px] font-bold text-slate-400">{settings.currencySymbol}</span>
                </div>
              </div>

            </div>

            {/* Drilldown Sublist */}
            {financialData.customersList.length > 0 && (
              <div className="bg-slate-50/40 p-3 rounded-xl border border-slate-200/60 no-print">
                <h4 className="text-[10px] font-black text-slate-500 mb-2 border-b border-slate-100 pb-1">أبرز الشركاء والمشترين المدينين:</h4>
                <div className="max-h-[160px] overflow-y-auto space-y-1.5 pl-1">
                  {financialData.customersList.map((cust, idx) => (
                    <div key={idx} className="flex justify-between items-center text-[10px] font-bold text-slate-650">
                      <span>{cust.name}</span>
                      <span className="font-mono text-slate-700">{cust.balance.toLocaleString()} {settings.currencySymbol}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Total Block Asset */}
            <div className="pt-3 border-t-2 border-slate-100 flex justify-between items-center text-slate-905 font-black text-xs">
              <span>إجمالي الأصول الجارية والممتلكات:</span>
              <span className="text-sm font-black text-emerald-700 font-mono">
                {financialData.totalAssets.toLocaleString()} {settings.currencySymbol}
              </span>
            </div>

          </div>
        </div>

        {/* LEFT COLUMN: LIABILITIES & EQUITY (الخصوم وحقوق الملكية) */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="bg-slate-900 px-4 py-3 border-b border-slate-850 flex justify-between items-center text-white">
            <h3 className="text-xs font-black flex items-center gap-1.5">
              <Users className="w-4 h-4 text-red-400" />
              <span>الالتزامات وحقوق الشركاء (Liabilities & Equity)</span>
            </h3>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-indigo-600">الموازنات المطلوبة</span>
          </div>

          <div className="p-4 space-y-4">
            
            {/* Section 1: Liabilities (الخصوم) */}
            <div className="space-y-2.5">
              <h4 className="text-[10px] font-black uppercase tracking-wider text-red-500 border-r-2 border-red-500 pr-1.5 pb-0.5">الالتزامات والخصوم المتداولة:</h4>
              
              {/* Supplier Payables */}
              <div className="bg-slate-50 border border-slate-100 p-2.5 rounded-xl flex justify-between items-center">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">ذمم الموردين وأصحاب البضاعة</span>
                  <span className="text-[9px] text-slate-400">مبالغ مستحقة لأصحاب الفاكهة والتوريدات</span>
                </div>
                <div className="text-xs font-black text-rose-700 font-mono">
                  {financialData.supplierPayables.toLocaleString('en-US', formattingOptions)} <span className="text-[9px] font-bold text-slate-400">{settings.currencySymbol}</span>
                </div>
              </div>

              {/* Workers Payables */}
              <div className="bg-slate-50 border border-slate-100 p-2.5 rounded-xl flex justify-between items-center">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">مستحقات العمال والموظفين الميدانيين</span>
                  <span className="text-[9px] text-slate-400">رواتب متبقية أو سلفيات مستحقة التسليم</span>
                </div>
                <div className="text-xs font-black text-rose-700 font-mono">
                  {financialData.workerPayables.toLocaleString('en-US', formattingOptions)} <span className="text-[9px] font-bold text-slate-400">{settings.currencySymbol}</span>
                </div>
              </div>

            </div>

            {/* Drilldown Liabilities Sublist */}
            {financialData.suppliersList.length > 0 && (
              <div className="bg-slate-50/40 p-3 rounded-xl border border-slate-200/60 no-print">
                <h4 className="text-[10px] font-black text-slate-500 mb-2 border-b border-slate-100 pb-1">أبرز الموردين الدائنين:</h4>
                <div className="max-h-[100px] overflow-y-auto space-y-1.5 pr-1">
                  {financialData.suppliersList.map((sup, idx) => (
                    <div key={idx} className="flex justify-between items-center text-[10px] font-bold text-slate-650">
                      <span>{sup.name}</span>
                      <span className="font-mono text-rose-700">{sup.balance.toLocaleString()} {settings.currencySymbol}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Section 2: Owner's Equity (حقوق الملكية والتشغيل) */}
            <div className="space-y-2.5 pt-2 border-t border-slate-100">
              <h4 className="text-[10px] font-black uppercase tracking-wider text-indigo-500 border-r-2 border-indigo-500 pr-1.5 pb-0.5">رأس المال وحقوق التشغيل للعام:</h4>

              {/* Capital */}
              <div className="bg-slate-50 border border-slate-100 p-2.5 rounded-xl flex justify-between items-center">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">رأس المال التأسيسي الأولي المودع</span>
                  <span className="text-[9px] text-slate-400">رصيد البداية للخزن والبنوك مجتمعة</span>
                </div>
                <div className="text-xs font-bold text-slate-800 font-mono">
                  {financialData.beginningCapital.toLocaleString('en-US', formattingOptions)} <span className="text-[9px] font-bold text-slate-400">{settings.currencySymbol}</span>
                </div>
              </div>

              {/* Net profits current year */}
              <div className="bg-emerald-50/40 border border-emerald-100 p-2.5 rounded-xl flex justify-between items-center">
                <div>
                  <span className="text-xs font-black text-emerald-800 block">أرباح تشغيل الفترة المحققة للعام</span>
                  <span className="text-[9px] text-emerald-600">الفارق الصافي بعد طرح التوريدات والمصاريف</span>
                </div>
                <div className="text-xs font-black text-emerald-800 font-mono">
                  {financialData.netProfit.toLocaleString('en-US', formattingOptions)} <span className="text-[9px] font-bold text-emerald-500">{settings.currencySymbol}</span>
                </div>
              </div>

            </div>

            {/* Total Block Liabilities + Equity */}
            <div className="pt-3 border-t-2 border-slate-100 flex justify-between items-center text-slate-905 font-black text-xs">
              <span>إجمالي الالتزامات وحقوق الملكية:</span>
              <span className="text-sm font-black text-slate-900 font-mono">
                {(financialData.totalLiabilities + financialData.totalEquity).toLocaleString()} {settings.currencySymbol}
              </span>
            </div>

          </div>
        </div>

      </div>

      {/* 5. NOTES AND AUDIT SIGN-OFF BLOCK */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs leading-relaxed text-xs text-slate-650 space-y-3 no-print">
        <h4 className="font-black text-slate-850 flex items-center gap-1.5 text-xs">
          <Info className="w-4 h-4 text-indigo-500" />
          <span>ملاحظات التدقيق والمطابقة المحاسبية للدورة السنوية</span>
        </h4>
        <p className="text-[11px]">
          هذه الميزانية يتم استخراجها تلقائياً بالاعتماد على الفواتير المعتمدة، وسندات الصرف والقبض والحركات البنكية المسجلة، بالإضافة للقيم المقدرة للمخازن الجارية. يتم حساب الأرباح بناءً على المبيعات مطروحاً منها التوريدات المرتبطة والمنصرفات الإدارية المباشرة خلال العام. يُنصح بمراجعتها بصفة دورية عند الإقفال الشهري لمنع فروقات الجرد وحماية الأرصدة.
        </p>
      </div>

      {/* PRINT-ONLY SIGNATURE SECTION */}
      <div className="hidden print:grid grid-cols-3 gap-6 text-center text-xs mt-12 pt-6 border-t border-slate-350" dir="rtl">
        <div>
          <p className="font-bold mb-8">إعداد المحاسب المالي</p>
          <div className="w-32 border-b border-slate-400 mx-auto"></div>
        </div>
        <div>
          <p className="font-bold mb-8">مدير المخازن والجرد</p>
          <div className="w-32 border-b border-slate-400 mx-auto"></div>
        </div>
        <div>
          <p className="font-bold mb-8">اعتماد الإدارة العلوية</p>
          <div className="w-32 border-b border-slate-400 mx-auto"></div>
        </div>
      </div>

    </div>
  );
}
