/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  Printer, 
  Calendar, 
  Coins, 
  TrendingUp, 
  ArrowDownLeft, 
  ArrowUpRight,
  Calculator,
  Eye,
  Building2,
  Users,
  CheckCircle,
  HelpCircle,
  Clock,
  Download
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Contact, LedgerEntry, Product, TreasuryBankMovement } from '../types';
import { replaceOklchInString, withSafePDFStyles } from '../utils';

interface DailyAuditTabProps {
  contacts: Contact[];
  ledgers: Record<string, LedgerEntry[]>;
  products: Product[];
  adjustments: TreasuryBankMovement[];
  triggerToast: (msg: string, typ?: 'success' | 'err') => void;
  onViewInvoice: (entry: LedgerEntry, contact: Contact) => void;
  currentUser?: any;
}

export default function DailyAuditTab({
  contacts,
  ledgers,
  products,
  adjustments,
  triggerToast,
  onViewInvoice,
  currentUser
}: DailyAuditTabProps) {
  // Current designated date for the audit - Default to modern date '2026-06-05'
  const [auditDate, setAuditDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  // State for daily audit interactive confirmation
  const [actualCashInput, setActualCashInput] = useState<string>('');
  const [actualBankInput, setActualBankInput] = useState<string>('');
  const [auditNotes, setAuditNotes] = useState<string>('');

  const [confirmations, setConfirmations] = useState<{
    id: string;
    date: string;
    timestamp: string;
    accountant: string;
    actualCash: number;
    systemCash: number;
    actualBank: number;
    systemBank: number;
    isMatched: boolean;
    notes: string;
  }[]>(() => {
    try {
      const stored = localStorage.getItem('erp_daily_confirmations');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const currentConfirmation = useMemo(() => {
    return confirmations.find(c => c.date === auditDate);
  }, [confirmations, auditDate]);

  React.useEffect(() => {
    if (currentConfirmation) {
      setActualCashInput(currentConfirmation.actualCash.toString());
      setActualBankInput(currentConfirmation.actualBank.toString());
      setAuditNotes(currentConfirmation.notes || '');
    } else {
      setActualCashInput('');
      setActualBankInput('');
      setAuditNotes('');
    }
  }, [currentConfirmation, auditDate]);

  // Helper method to resolve item product names
  const getProductDesignation = (id: string) => {
    const prod = products.find(p => p.id === id);
    return prod ? prod.name : 'منتج غير معروف';
  };

  // Compile all entities that belong to the chosen date
  const auditData = useMemo(() => {
    let salesCount = 0;
    let salesTotal = 0;
    let salesCashPaid = 0;
    let salesBankPaid = 0;
    let salesRemain = 0;

    let purchaseCount = 0;
    let purchaseTotal = 0;
    let purchaseCashPaid = 0;
    let purchaseBankPaid = 0;
    let purchaseRemain = 0;

    const dailySalesInvoices: { contact: Contact; entry: LedgerEntry }[] = [];
    const dailyPurchaseInvoices: { contact: Contact; entry: LedgerEntry }[] = [];

    // Look through all ledgers for invoices matching target date
    Object.keys(ledgers).forEach(contactId => {
      const contactObj = contacts.find(c => c.id === contactId);
      if (!contactObj) return;

      const entries = ledgers[contactId] || [];
      entries.forEach(entry => {
        // Match chosen target date
        if (entry.date === auditDate && entry.type === 'invoice') {
          const method = entry.paymentMethod || 'cash';
          const paidAmt = entry.paid || 0;
          const remainAmt = Math.max(0, entry.total - paidAmt);

          if (contactObj.type === 'customer') {
            salesCount++;
            salesTotal += entry.total;
            if (method === 'cash') {
              salesCashPaid += paidAmt;
            } else {
              salesBankPaid += paidAmt;
            }
            salesRemain += remainAmt;
            dailySalesInvoices.push({ contact: contactObj, entry });
          } else if (contactObj.type === 'supplier' || contactObj.type === 'worker') {
            purchaseCount++;
            purchaseTotal += entry.total;
            if (method === 'cash') {
              purchaseCashPaid += paidAmt;
            } else {
              purchaseBankPaid += paidAmt;
            }
            purchaseRemain += remainAmt;
            dailyPurchaseInvoices.push({ contact: contactObj, entry });
          }
        }
      });
    });

    // Compile Direct payment and adjustment entries that happened today to give a full physical cash/bank closing sheet!
    let ledgerPaymentsCashIn = 0;
    let ledgerPaymentsBankIn = 0;
    let ledgerPaymentsCashOut = 0;
    let ledgerPaymentsBankOut = 0;

    Object.keys(ledgers).forEach(contactId => {
      const contactObj = contacts.find(c => c.id === contactId);
      if (!contactObj) return;

      const entries = ledgers[contactId] || [];
      entries.forEach(entry => {
        if (entry.date === auditDate && entry.type === 'payment') {
          const method = entry.paymentMethod || 'cash';
          if (contactObj.type === 'customer') {
            if (method === 'cash') ledgerPaymentsCashIn += entry.total;
            else ledgerPaymentsBankIn += entry.total;
          } else {
            if (method === 'cash') ledgerPaymentsCashOut += entry.total;
            else ledgerPaymentsBankOut += entry.total;
          }
        }
      });
    });

    // Manual Adjustments under the selected Audit Date
    let adjCashIn = 0;
    let adjCashOut = 0;
    let adjBankIn = 0;
    let adjBankOut = 0;

    adjustments.forEach(m => {
      if (m.date === auditDate) {
        if (m.type === 'deposit') {
          if (m.source === 'treasury') adjCashIn += m.amount;
          else adjBankIn += m.amount;
        } else if (m.type === 'withdrawal') {
          if (m.source === 'treasury') adjCashOut += m.amount;
          else adjBankOut += m.amount;
        } else if (m.type === 'transfer') {
          adjCashOut += m.amount;
          adjBankIn += m.amount;
        }
      }
    });

    // Total physical checkout for the day
    const totalCashInflow = salesCashPaid + ledgerPaymentsCashIn + adjCashIn;
    const totalCashOutflow = purchaseCashPaid + ledgerPaymentsCashOut + adjCashOut;
    const netCashFlow = totalCashInflow - totalCashOutflow;

    const totalBankInflow = salesBankPaid + ledgerPaymentsBankIn + adjBankIn;
    const totalBankOutflow = purchaseBankPaid + ledgerPaymentsBankOut + adjBankOut;
    const netBankFlow = totalBankInflow - totalBankOutflow;

    return {
      salesCount,
      salesTotal,
      salesCashPaid,
      salesBankPaid,
      salesRemain,
      dailySalesInvoices,

      purchaseCount,
      purchaseTotal,
      purchaseCashPaid,
      purchaseBankPaid,
      purchaseRemain,
      dailyPurchaseInvoices,

      financials: {
        totalCashInflow,
        totalCashOutflow,
        netCashFlow,
        totalBankInflow,
        totalBankOutflow,
        netBankFlow
      }
    };
  }, [ledgers, contacts, adjustments, auditDate]);

  const handleConfirmAudit = () => {
    const cashVal = parseFloat(actualCashInput);
    const bankVal = parseFloat(actualBankInput);

    if (isNaN(cashVal) || isNaN(bankVal)) {
      triggerToast("❌ يرجى إدخال المبالغ الفعلية بالخزينة والبنك بصورة صحيحة للمتابعة", "err");
      return;
    }

    const systemCash = auditData.financials.netCashFlow;
    const systemBank = auditData.financials.netBankFlow;

    // Check matching
    const isMatched = (cashVal === systemCash) && (bankVal === systemBank);
    const accountantName = currentUser ? currentUser.fullName : "المحاسب الميداني";

    const newConf = {
      id: 'conf_' + Date.now(),
      date: auditDate,
      timestamp: new Date().toLocaleString('ar-EG'),
      accountant: accountantName,
      actualCash: cashVal,
      systemCash: systemCash,
      actualBank: bankVal,
      systemBank: systemBank,
      isMatched: isMatched,
      notes: auditNotes.trim()
    };

    const filtered = confirmations.filter(c => c.date !== auditDate);
    const updated = [...filtered, newConf];

    setConfirmations(updated);
    localStorage.setItem('erp_daily_confirmations', JSON.stringify(updated));

    if (isMatched) {
      triggerToast(`✅ تم تأكيد مطابقة اليومية بنجاح! جميع الحسابات مطابقة للنظام ودورة المبيعات والمشتريات.`, "success");
    } else {
      triggerToast(`⚠️ تم تأكيد مطابقة اليومية بنجاح مع تسجيل فروقات حسابية (عجز/زيادة).`, "success");
    }
  };

  const handleRevokeAudit = (id: string) => {
    if (window.confirm("⚠️ هل أنت متأكد من رغبتك في إلغاء اعتماد المطابقة لهذا اليوم وإعادة تشغيل الإدخال؟")) {
      const updated = confirmations.filter(c => c.id !== id);
      setConfirmations(updated);
      localStorage.setItem('erp_daily_confirmations', JSON.stringify(updated));
      triggerToast("🔓 تم إلغاء اعتماد المطابقة اليومية بنجاح.", "success");
    }
  };

  const handlePrintAudit = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    const element = document.getElementById('daily-audit-report-area');
    if (!element) return;
    try {
      triggerToast("جاري تجميع تقرير المطابقة اليومية وتحميله كملف PDF مالي...", "success");
      
      const scaleVal = 2; // High resolution
      const canvas = await withSafePDFStyles(() => html2canvas(element, {
        scale: scaleVal,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        onclone: (clonedDoc) => {
          // Force make all elements styled as 'only-print' visible inside cloned version
          clonedDoc.querySelectorAll('.only-print').forEach((el: any) => {
            el.style.display = 'block';
          });
          // Hide all edit/view action buttons or search boxes containing 'no-print'
          clonedDoc.querySelectorAll('.no-print').forEach((el: any) => {
            el.style.display = 'none';
          });
          // Replace oklch in all <style> elements
          clonedDoc.querySelectorAll('style').forEach((styleEl) => {
            if (styleEl.textContent) {
              styleEl.textContent = replaceOklchInString(styleEl.textContent);
            }
          });
          // Replace oklch in inline styles
          clonedDoc.querySelectorAll('[style]').forEach((el: any) => {
            if (el.style && el.style.cssText) {
              el.style.cssText = replaceOklchInString(el.style.cssText);
            }
          });
        }
      }), element);

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210; // A4 Width in mm
      const pageHeight = 297; // A4 Height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`Daily_Audit_Report_${auditDate}.pdf`);
      triggerToast("تم تحميل الملف بنجاح!");
    } catch (err) {
      console.error("Failed to generate Daily Audit PDF: ", err);
      triggerToast("حدث خطأ أثناء تصدير PDF، سيتم فتح نافذة الطباعة بدلاً من ذلك", "err");
      window.print();
    }
  };

  const userEnteredCash = parseFloat(actualCashInput) || 0;
  const userEnteredBank = parseFloat(actualBankInput) || 0;
  
  const cashDiff = userEnteredCash - auditData.financials.netCashFlow;
  const bankDiff = userEnteredBank - auditData.financials.netBankFlow;

  const isMatchedFull = (actualCashInput !== '' && actualBankInput !== '' && Math.abs(cashDiff) < 0.01 && Math.abs(bankDiff) < 0.01);

  return (
    <div className="space-y-6" dir="rtl">
      
      {/* HEADER SECTION */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
        <div className="space-y-1">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Calculator className="w-5 h-5 text-amber-500" />
            <span>المطابقة والتدقيق المحاسبي اليومي</span>
          </h2>
          <p className="text-xs text-slate-400 font-bold select-none">شاشة الاستعلام اليومي عن تفاصيل الفواتير المحققة وتصنيف المبالغ النقدية والبنكية للمطابقة الفورية.</p>
        </div>

        {/* Date Selector and Print report */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700">
            <Calendar className="w-4 h-4 text-amber-400" />
            <input
              type="date"
              value={auditDate}
              onChange={(e) => setAuditDate(e.target.value)}
              className="bg-transparent border-none text-white text-xs font-mono font-bold outline-none focus:ring-0 cursor-pointer"
            />
          </div>
          <button
            onClick={handleDownloadPDF}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
            title="تحميل التقرير بصيغة PDF فورياً"
          >
            <Download className="w-4 h-4" />
            <span>تحميل تقرير اليوم (PDF)</span>
          </button>
          <button
            onClick={handleDownloadPDF}
            className="bg-slate-800 border border-slate-700 text-white hover:bg-slate-700 font-black px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
            title="تحميل مستند التقفيل بصيغة PDF فورياً"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>تحميل مستند التقفيل (PDF)</span>
          </button>
        </div>
      </div>

      <div id="daily-audit-report-area" className="space-y-6 bg-white p-6 rounded-2xl">
        {/* PRINT-ONLY HEADER (Hidden in normal UI) */}
        <div className="only-print text-center space-y-3 pb-6 border-b-2 border-slate-350 bg-slate-50 p-4 rounded-xl mb-6">
        <h1 className="text-2xl font-black">اولاد داؤود للفواكه</h1>
        <h2 className="text-xl font-bold text-slate-800">تقرير المطابقة والتقفيل المحاسبي اليومي</h2>
        <div className="flex justify-center gap-8 text-xs font-mono">
          <span>التاريخ المحاسبي: {auditDate}</span>
          <span>تاريخ الطباعة: {new Date().toLocaleString('en-US')}</span>
        </div>
      </div>

      {/* SECTION 1: INVOICES CUMULATIVE BOARD */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Sales Daily Stats Panel */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h3 className="font-black text-sm text-emerald-800 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
              <span>إحصائيات المبيعات اليومية (فواتير بيع)</span>
            </h3>
            <span className="bg-emerald-50 text-emerald-800 text-[10px] md:text-xs font-black px-2.5 py-1 rounded-full">
              {auditData.salesCount} فاتورة بيع اليوم
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-emerald-50/40 p-3.5 rounded-xl border border-emerald-50">
              <span className="block text-[9px] font-bold text-slate-500">إجمالي كمية فواتير المبيعات</span>
              <span className="text-xl font-black font-mono text-emerald-700 mt-1 block">
                {auditData.salesTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
              <span className="text-[9px] font-bold text-slate-400 font-sans block mt-0.5">جنيه سوداني</span>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
              <span className="block text-[9px] font-bold text-slate-500">المبلغ والمحصل في الخزينة المعمورة (نقداً)</span>
              <span className="text-base font-black font-mono text-slate-900 mt-1 block">
                {auditData.salesCashPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })} <span className="text-[10px] font-sans">ج.س</span>
              </span>
              <span className="text-[8px] font-black text-emerald-650 text-slate-500">💵 كاش اليوم</span>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
              <span className="block text-[9px] font-bold text-slate-500">المبلغ والمستلم بالبنك (بنكك)</span>
              <span className="text-base font-black font-mono text-slate-900 mt-1 block">
                {auditData.salesBankPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })} <span className="text-[10px] font-sans">ج.س</span>
              </span>
              <span className="text-[8px] font-black text-indigo-650 text-slate-500">🏦 تحويل بنكك اليوم</span>
            </div>

            <div className="bg-red-50/50 p-3.5 rounded-xl border border-red-50">
              <span className="block text-[9px] font-bold text-red-500">متبقي آجل ذمم على العملاء</span>
              <span className="text-base font-black font-mono text-red-600 mt-1 block">
                {auditData.salesRemain.toLocaleString('en-US', { minimumFractionDigits: 2 })} <span className="text-[10px] font-sans">ج.س</span>
              </span>
              <span className="text-[8px] font-black text-red-500">⚠️ مستبقاة للتحصيل لاحقاً</span>
            </div>
          </div>
        </div>

        {/* Purchase Daily Stats Panel */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h3 className="font-black text-sm text-sky-800 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-sky-600" />
              <span>إحصائيات المشتريات اليومية (فواتير شراء)</span>
            </h3>
            <span className="bg-sky-50 text-sky-800 text-[10px] md:text-xs font-black px-2.5 py-1 rounded-full">
              {auditData.purchaseCount} فاتورة شراء اليوم
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-sky-50/40 p-3.5 rounded-xl border border-sky-50">
              <span className="block text-[9px] font-bold text-slate-500">إجمالي كمية فواتير المشتريات والعمال</span>
              <span className="text-xl font-black font-mono text-sky-700 mt-1 block">
                {auditData.purchaseTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
              <span className="text-[9px] font-bold text-slate-400 font-sans block mt-0.5">جنيه سوداني</span>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
              <span className="block text-[9px] font-bold text-slate-500">المبلغ والمدفوع فوراً (نقداً)</span>
              <span className="text-base font-black font-mono text-slate-900 mt-1 block">
                {auditData.purchaseCashPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })} <span className="text-[10px] font-sans">ج.س</span>
              </span>
              <span className="text-[8px] font-black text-slate-500">💵 دفوع كاش</span>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
              <span className="block text-[9px] font-bold text-slate-500">المبلغ والمحمول عبر البنك (بنكك)</span>
              <span className="text-base font-black font-mono text-slate-900 mt-1 block">
                {auditData.purchaseBankPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })} <span className="text-[10px] font-sans">ج.س</span>
              </span>
              <span className="text-[8px] font-black text-slate-500">🏦 دفع بنكي خارجي</span>
            </div>

            <div className="bg-amber-50/60 p-3.5 rounded-xl border border-amber-100">
              <span className="block text-[9px] font-bold text-amber-800">مستحقات آجلة للموردين طرفنا</span>
              <span className="text-base font-black font-mono text-amber-700 mt-1 block">
                {auditData.purchaseRemain.toLocaleString('en-US', { minimumFractionDigits: 2 })} <span className="text-[10px] font-sans">ج.س</span>
              </span>
              <span className="text-[8px] font-black text-amber-600">⚖️ رصيد ذمم أجل</span>
            </div>
          </div>
        </div>

      </div>

      {/* SECTION 2: PHYSICAL DAILY FUNDS FLOW RECONCILIATION */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <h3 className="font-extrabold text-xs md:text-sm text-slate-950 flex items-center gap-2">
          <Coins className="w-5 h-5 text-indigo-600" />
          <span>ملخص تدفق السيولة النقدية والبنكية وقفل اليومية الفعلي</span>
        </h3>
        
        <p className="text-[11px] text-slate-550 text-slate-500 leading-relaxed font-semibold">
          يعتمد المحاسب أو الموظف اليوم معايير التدفقات التالية، التي تضم فواتير اليوم الإضافية المسددة، فضلاً عن حركات قبض الشركاء المباشرة وسندات الإيداع والسحب اليدوية لتسوية الموقف المالي.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Cash Vault Rec */}
          <div className="bg-white border border-slate-250 border-emerald-100 p-4 rounded-xl flex flex-col justify-between">
            <span className="text-[10px] font-black text-emerald-800 uppercase block select-none">💵 الصندوق النقدي (الخزينة الميدانية)</span>
            <div className="space-y-1.5 mt-3 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>مقبوضات واردة لليوم (+):</span>
                <strong className="font-mono text-emerald-600">
                  {auditData.financials.totalCashInflow.toLocaleString()} ج.س
                </strong>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>مدفوعات خارجة لليوم (-):</span>
                <strong className="font-mono text-red-500">
                  {auditData.financials.totalCashOutflow.toLocaleString()} ج.س
                </strong>
              </div>
              <div className="flex justify-between font-black text-slate-900 border-t border-slate-100 pt-2 text-sm">
                <span>صافي حركة نقدية:</span>
                <span className={`font-mono ${auditData.financials.netCashFlow >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                  {auditData.financials.netCashFlow >= 0 ? '+' : ''} {auditData.financials.netCashFlow.toLocaleString()} ج.س
                </span>
              </div>
            </div>
          </div>

          {/* Bank Account Rec */}
          <div className="bg-white border border-slate-250 border-blue-100 p-4 rounded-xl flex flex-col justify-between">
            <span className="text-[10px] font-black text-blue-850 text-blue-800 uppercase block select-none">🏦 حساب بنكك الائتماني</span>
            <div className="space-y-1.5 mt-3 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>مقبوضات بنكية لليوم (+):</span>
                <strong className="font-mono text-emerald-600">
                  {auditData.financials.totalBankInflow.toLocaleString()} ج.س
                </strong>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>تحويلات صادرة بنكية (-):</span>
                <strong className="font-mono text-red-500">
                  {auditData.financials.totalBankOutflow.toLocaleString()} ج.س
                </strong>
              </div>
              <div className="flex justify-between font-black text-slate-900 border-t border-slate-100 pt-2 text-sm">
                <span>صافي حركة بنكية:</span>
                <span className={`font-mono ${auditData.financials.netBankFlow >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
                  {auditData.financials.netBankFlow >= 0 ? '+' : ''} {auditData.financials.netBankFlow.toLocaleString()} ج.س
                </span>
              </div>
            </div>
          </div>

          {/* Combined check */}
          <div className="bg-emerald-950 text-white p-4 rounded-xl flex flex-col justify-between">
            <span className="text-[10px] font-black text-amber-400 uppercase block select-none">🎯 موازنة توازن الدورة الدفترية لليوم</span>
            <div className="space-y-1 mt-3">
              <div className="text-[10px] text-emerald-300">مجموع التدفق الإيجابي الوارد:</div>
              <div className="text-sm font-mono font-bold">
                {(auditData.financials.totalCashInflow + auditData.financials.totalBankInflow).toLocaleString()} ج.س
              </div>
              <div className="text-[10px] text-emerald-300 mt-1">مجموع التدفق الصادر المدفوع:</div>
              <div className="text-sm font-mono font-bold">
                {(auditData.financials.totalCashOutflow + auditData.financials.totalBankOutflow).toLocaleString()} ج.س
              </div>
              <div className="border-t border-emerald-800 pt-1.5 mt-2 flex justify-between items-center">
                <span className="text-[11px] font-bold text-amber-400">إجمالي صافي غلة اليوم:</span>
                <span className="text-sm font-mono font-black text-amber-300">
                  {(auditData.financials.netCashFlow + auditData.financials.netBankFlow).toLocaleString()} ج.س
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* SECTION 2.5: INTERACTIVE DAILY AUDIT AND RECONCILIATION */}
      <div className="bg-white border-2 border-indigo-100 rounded-2xl p-6 shadow-xs space-y-6 no-print">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-indigo-50 pb-4">
          <div className="space-y-1">
            <h3 className="font-indigo-950 font-extrabold text-sm md:text-base flex items-center gap-2">
              <CheckCircle className="w-5.5 h-5.5 text-indigo-600" />
              <span>مراجعة وتأكيد المطابقة اليومية (جرد اليومية الفعلي)</span>
            </h3>
            <p className="text-xs text-slate-550 text-slate-500 font-bold select-none">
              مقارنة الجرد الفعلي للصندوق والبنك بحركة المبيعات والمشتريات والدفعيات لإصدار اعتماد التقفيل اليومي.
            </p>
          </div>
          {currentConfirmation && (
            <span className="bg-emerald-105 bg-emerald-100 text-emerald-800 text-xs font-black px-3.5 py-1.5 rounded-full flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-emerald-600 animate-pulse" />
              <span>معتمد اليوم بواسطة: {currentConfirmation.accountant}</span>
            </span>
          )}
        </div>

        {currentConfirmation ? (
          <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2 text-emerald-800 font-black text-xs md:text-sm">
              <CheckCircle className="w-5 h-5" />
              <span>تم إقفال واعتماد مطابقة حسابات يوم {auditDate} بنجاح!</span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs font-bold pt-1">
              <div className="bg-white p-3.5 rounded-lg border border-emerald-50 text-slate-700">
                <span className="text-slate-400 block mb-1">المبلغ الفعلي المعتمد بالخزنة:</span>
                <span className="font-mono text-base text-slate-900 font-black">{currentConfirmation.actualCash.toLocaleString()} ج.س</span>
              </div>
              <div className="bg-white p-3.5 rounded-lg border border-emerald-50 text-slate-700">
                <span className="text-slate-400 block mb-1">المبلغ الفعلي المعتمد بالبنك:</span>
                <span className="font-mono text-base text-slate-900 font-black">{currentConfirmation.actualBank.toLocaleString()} ج.س</span>
              </div>
              <div className="bg-white p-3.5 rounded-lg border border-emerald-50 text-slate-700">
                <span className="text-slate-400 block mb-1">حالة التطابق مع المبيعات والمشتريات:</span>
                <span className={`block text-xs font-black mt-1 ${currentConfirmation.isMatched ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {currentConfirmation.isMatched ? '✅ متطابقة بنسبة 100%' : '⚠️ غير متطابقة (تم تدوير الفرق)'}
                </span>
              </div>
            </div>

            {currentConfirmation.notes && (
              <div className="bg-white p-3 rounded-lg border border-slate-200 text-xs">
                <span className="text-slate-400 block mb-1">الملاحظات والتبرير المحاسبي المسجل:</span>
                <p className="text-slate-700 font-medium leading-relaxed font-mono">{currentConfirmation.notes}</p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => handleRevokeAudit(currentConfirmation.id)}
                className="bg-rose-50 hover:bg-rose-100 text-rose-700 font-black text-[10px] md:text-xs px-4 py-2 rounded-xl transition-colors cursor-pointer border border-rose-200"
              >
                🔐 إلغاء اعتماد المطابقة الحالية لإعادة المطابقة اليومية
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Actual Cash Input */}
              <div className="space-y-2">
                <label className="block text-slate-800 font-extrabold text-xs">
                  💵 المبلغ الفعلي الموجود بالخزنة (كاش الخزينة) <span className="text-rose-550 text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    placeholder="أدخل مبلغ الجرد الفعلي كاش بالخزنة"
                    value={actualCashInput}
                    onChange={(e) => setActualCashInput(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 font-mono text-slate-900 font-black text-sm outline-none focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-left"
                  />
                  <span className="absolute left-3 top-2.5 font-bold text-[10px] text-slate-450">ج.س</span>
                </div>
                
                {/* Difference indicator */}
                {actualCashInput !== '' && (
                  <div className={`p-2 rounded-lg text-xs font-bold leading-none ${
                    Math.abs(cashDiff) < 0.01 
                      ? 'bg-emerald-50 text-emerald-800' 
                      : cashDiff > 0 
                      ? 'bg-blue-50 text-blue-800' 
                      : 'bg-rose-50 text-rose-800'
                  }`}>
                    {Math.abs(cashDiff) < 0.01 ? (
                      <span>✅ متطابقة مع صافي تدفق الخزينة بالدفتر تماماً!</span>
                    ) : cashDiff > 0 ? (
                      <span>📈 يوجد فائض وزيادة بالخزينة عن الدفتر بـ +{cashDiff.toLocaleString()} ج.س</span>
                    ) : (
                      <span>⚠️ يوجد عجز ونقصان بالخزينة عن الدفتر بـ -{Math.abs(cashDiff).toLocaleString()} ج.س</span>
                    )}
                  </div>
                )}
              </div>

              {/* Actual Bank Input */}
              <div className="space-y-2">
                <label className="block text-slate-800 font-extrabold text-xs">
                  🏦 رصيد الحساب المالي البنكي الفعلي (بنكك) <span className="text-rose-550 text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    placeholder="أدخل الرصيد المالي الحالي بحساب بنكك"
                    value={actualBankInput}
                    onChange={(e) => setActualBankInput(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 font-mono text-slate-900 font-black text-sm outline-none focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-left"
                  />
                  <span className="absolute left-3 top-2.5 font-bold text-[10px] text-slate-450">ج.س</span>
                </div>

                {/* Difference indicator */}
                {actualBankInput !== '' && (
                  <div className={`p-2 rounded-lg text-xs font-bold leading-none ${
                    Math.abs(bankDiff) < 0.01 
                      ? 'bg-emerald-50 text-emerald-800' 
                      : bankDiff > 0 
                      ? 'bg-blue-50 text-blue-800' 
                      : 'bg-rose-50 text-rose-800'
                  }`}>
                    {Math.abs(bankDiff) < 0.01 ? (
                      <span>✅ متطابقة مع الرصيد الدفتري للبنك تماماً!</span>
                    ) : bankDiff > 0 ? (
                      <span>📈 يوجد فائض وزيادة بحساب البنك عن الدفتر بـ +{bankDiff.toLocaleString()} ج.س</span>
                    ) : (
                      <span>⚠️ يوجد عجز ونقصان بحساب البنك عن الدفتر بـ -{Math.abs(bankDiff).toLocaleString()} ج.س</span>
                    )}
                  </div>
                )}
              </div>

            </div>

            {/* Reconciliation Statement of Sales and Purchases */}
            <div className="p-4 bg-slate-50 border border-slate-150 rounded-xl space-y-3 font-semibold">
              <span className="text-xs font-extrabold text-slate-800 block">📊 التحليل الفوري للمطابقة مع حركة المبيعات والمشتريات لليوم:</span>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold">
                <div className="space-y-1">
                  <div className="flex justify-between text-slate-600">
                    <span>مبيعات نقداً (💵):</span>
                    <strong className="font-mono text-slate-900">{auditData.salesCashPaid.toLocaleString()} ج.س</strong>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>مبيعات بنكك (🏦):</span>
                    <strong className="font-mono text-slate-900">{auditData.salesBankPaid.toLocaleString()} ج.س</strong>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-slate-600">
                    <span>مشتريات وعمال كاش (💵):</span>
                    <strong className="font-mono text-slate-900">{auditData.purchaseCashPaid.toLocaleString()} ج.س</strong>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>مشتريات وعمال بنكك (🏦):</span>
                    <strong className="font-mono text-slate-900">{auditData.purchaseBankPaid.toLocaleString()} ج.س</strong>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                <span className="text-xs font-extrabold text-slate-700">حالة المطابقة الإجمالية لليوم:</span>
                
                {actualCashInput !== '' && actualBankInput !== '' ? (
                  isMatchedFull ? (
                    <span className="bg-emerald-100 text-emerald-800 font-black px-3 py-1 rounded-lg text-[11px] md:text-xs flex items-center gap-1.5 animate-pulse">
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                      <span>نعم، تطابقت المبالغ والسيولة تماماً بالخزنة والبنك مع المبيعات والمشتريات اليوم! ✅</span>
                    </span>
                  ) : (
                    <span className="bg-rose-105 bg-rose-100 text-rose-800 font-black px-3 py-1 rounded-lg text-[11px] md:text-xs flex items-center gap-1.5">
                      <HelpCircle className="w-4 h-4 text-rose-650 text-rose-600" />
                      <span>لا، المبالغ غير متطابقة مع حركة المبيعات والمشتريات والقيود اليومية (فروقات كاش: {cashDiff.toLocaleString()} ج.س / بنك: {bankDiff.toLocaleString()} ج.س) ❌</span>
                    </span>
                  )
                ) : (
                  <span className="bg-slate-200 text-slate-600 font-black px-3 py-1 rounded-lg text-xs">
                    ⏳ بانتظار كتابة قيم الجرد الفعلي بالخزنة وحساب البنك...
                  </span>
                )}
              </div>
            </div>

            {/* Audit Justification Notes */}
            <div className="space-y-2">
              <label className="block text-slate-800 font-extrabold text-xs">
                ✍️ ملاحظات تبرير الفروقات المحاسبية أو تعليقات أخرى (اختياري)
              </label>
              <textarea
                placeholder="اكتب أي ملاحظات أو تبريرات للفروق الحسابية إن وجدت هنا لتُسجل في محضر المطابقة اليومية والتقفيل..."
                value={auditNotes}
                onChange={(e) => setAuditNotes(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 outline-none focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono min-h-[60px]"
              />
            </div>

            {/* Confirm buttons */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleConfirmAudit}
                className="bg-indigo-650 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs px-5 py-3 rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
              >
                <CheckCircle className="w-4.5 h-4.5" />
                <span>💾 تأكيد واعتماد المطابقة اليومية وحفظ السجل</span>
              </button>
            </div>
          </div>
        )}

        {/* Audit Confirmations History */}
        {confirmations.length > 0 && (
          <div className="border-t border-slate-100 pt-4 space-y-3">
            <span className="text-xs font-extrabold text-slate-850 block">📜 سجل اعتمادات المطابقة واليومية السابقة:</span>
            
            <div className="overflow-x-auto">
              <table className="w-full text-right text-[11px] font-bold text-slate-700">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 select-none text-[10px]">
                    <th className="p-2 text-center">التاريخ المحاسبي</th>
                    <th className="p-2">تاريخ المطابقة والتقفيل</th>
                    <th className="p-2">المحاسب المسؤول</th>
                    <th className="p-2 text-center">صندوق كاش (فعلي / دفتري)</th>
                    <th className="p-2 text-center">صندوق بنكي (فعلي / دفتري)</th>
                    <th className="p-2 text-center">حالة النتيجة</th>
                    <th className="p-2 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {confirmations.map(c => (
                    <tr key={c.id} className="hover:bg-slate-50/40">
                      <td className="p-2 text-center text-slate-900 font-extrabold">{c.date}</td>
                      <td className="p-2 text-slate-500 font-sans">{c.timestamp}</td>
                      <td className="p-2 text-slate-900 font-sans">{c.accountant}</td>
                      <td className="p-2 text-center">
                        <span className="text-slate-800">{c.actualCash.toLocaleString()}</span> / <span className="text-slate-400">{c.systemCash.toLocaleString()}</span>
                      </td>
                      <td className="p-2 text-center">
                        <span className="text-slate-800">{c.actualBank.toLocaleString()}</span> / <span className="text-slate-400">{c.systemBank.toLocaleString()}</span>
                      </td>
                      <td className="p-2 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                          c.isMatched ? 'bg-emerald-50 text-emerald-850 text-emerald-800' : 'bg-amber-100 text-amber-850 text-amber-800'
                        }`}>
                          {c.isMatched ? '✅ كاش متطابق تماماً' : '⚠️ عجز / فروقات مسجلة'}
                        </span>
                      </td>
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRevokeAudit(c.id)}
                          className="text-[10px] text-rose-600 hover:underline hover:text-rose-700 font-black cursor-pointer"
                        >
                          إلغاء 🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 3: DAILY SALES INVOICES LISTS DETAILS */}
      <div className="space-y-4">
        
        {/* Daily Sales Invoices Header */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <div className="bg-emerald-800 text-white p-3.5 flex justify-between items-center select-none font-bold">
            <h4 className="text-xs md:text-sm font-black flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-350" />
              <span>قائمة فواتير البيع المحققة لليوم ({auditDate})</span>
            </h4>
            <span className="text-[11px]">جمعت مبالغ وقدرها {auditData.salesTotal.toLocaleString()} ج.س</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right text-slate-800 font-bold">
              <thead>
                <tr className="bg-slate-100 text-slate-600 border-b border-slate-205 text-[10px] md:text-xs select-none">
                  <th className="p-3 text-center">رقم الفاتورة</th>
                  <th className="p-3">اسم الزبون</th>
                  <th className="p-3">البيان والملخص والأصناف والموزونة</th>
                  <th className="p-3 text-center">نوع صندوق السداد</th>
                  <th className="p-3 text-center">المبلغ الكلي للمستند</th>
                  <th className="p-3 text-center text-emerald-700">المحصل الفعلي</th>
                  <th className="p-3 text-center text-red-600">المتبقي الذمة الآجلة</th>
                  <th className="p-3 text-center no-print">تفاصيل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditData.dailySalesInvoices.length > 0 ? (
                  auditData.dailySalesInvoices.map(({ contact, entry }) => {
                    const remain = Math.max(0, entry.total - entry.paid);
                    const method = entry.paymentMethod || 'cash';
                    return (
                      <tr key={entry.id} className="hover:bg-slate-50/40 text-[11px] md:text-xs">
                        <td className="p-3 text-center font-mono text-slate-900 font-extrabold">{entry.number}</td>
                        <td className="p-3 text-slate-950 font-extrabold">{contact.name}</td>
                        <td className="p-3 font-medium text-slate-600 max-w-sm">
                          {entry.description || ''}
                          {entry.items && entry.items.length > 0 && (
                            <div className="text-[9px] text-slate-400 mt-1 block">
                              المحتوى: {entry.items.map((it: any) => `${getProductDesignation(it.productId)} (${it.weight} كجم)`).join(' - ')}
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                            entry.paid === 0 ? 'bg-slate-100 text-slate-500' : method === 'cash' ? 'bg-emerald-50 text-emerald-800' : 'bg-blue-50 text-blue-800'
                          }`}>
                            {entry.paid === 0 ? '👈 آجل بالكامل' : method === 'cash' ? '💵 خزينة نقداً' : '🏦 تحويل بنكي'}
                          </span>
                        </td>
                        <td className="p-3 text-center font-mono font-extrabold text-[12px]">{entry.total.toLocaleString()}</td>
                        <td className="p-3 text-center font-mono text-emerald-600 font-extrabold text-[12px]">{entry.paid.toLocaleString()}</td>
                        <td className="p-3 text-center font-mono text-red-600 text-[12px]">{remain.toLocaleString()}</td>
                        <td className="p-3 text-center no-print">
                          <button
                            onClick={() => onViewInvoice(entry, contact)}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 p-1 rounded inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="p-10 text-center text-slate-400 font-bold">
                      لا يوجد فواتير مبيعات مسجلة في هذا اليوم المحدد حتى الآن.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Daily Purchase Invoices Header */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <div className="bg-sky-800 text-white p-3.5 flex justify-between items-center select-none font-bold">
            <h4 className="text-xs md:text-sm font-black flex items-center gap-2">
              <FileText className="w-5 h-5 text-sky-300" />
              <span>قائمة فواتير الشراء والتوريد المحققة لليوم ({auditDate})</span>
            </h4>
            <span className="text-[11px]">تكلفت مبالغ وقدرها {auditData.purchaseTotal.toLocaleString()} ج.س</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right text-slate-800 font-bold">
              <thead>
                <tr className="bg-slate-100 text-slate-600 border-b border-slate-205 text-[10px] md:text-xs select-none">
                  <th className="p-3 text-center">رقم الفاتورة</th>
                  <th className="p-3">اسم المورد/الطرف</th>
                  <th className="p-3">بيان السلعة الموردة والمندوب</th>
                  <th className="p-3 text-center">صندوق مخرج الدفع</th>
                  <th className="p-3 text-center">المبلغ الكلي للمستند</th>
                  <th className="p-3 text-center text-emerald-700">المسدد فورا للوديعة</th>
                  <th className="p-3 text-center text-red-650 text-red-600">المتبقي له ذمة آجلة</th>
                  <th className="p-3 text-center no-print">تفاصيل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditData.dailyPurchaseInvoices.length > 0 ? (
                  auditData.dailyPurchaseInvoices.map(({ contact, entry }) => {
                    const remain = Math.max(0, entry.total - entry.paid);
                    const method = entry.paymentMethod || 'cash';
                    return (
                      <tr key={entry.id} className="hover:bg-slate-50/40 text-[11px] md:text-xs">
                        <td className="p-3 text-center font-mono text-slate-900 font-extrabold">{entry.number}</td>
                        <td className="p-3 text-slate-950 font-extrabold">{contact.name}</td>
                        <td className="p-3 font-medium text-slate-600 max-w-sm">
                          {entry.description || ''}
                          {entry.items && entry.items.length > 0 && (
                            <div className="text-[9px] text-slate-400 mt-1 block">
                              الصفات: {entry.items.map((it: any) => `${getProductDesignation(it.productId)} (${it.weight} كجم)`).join(' - ')}
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                            entry.paid === 0 ? 'bg-slate-100 text-slate-500' : method === 'cash' ? 'bg-emerald-50 text-emerald-800' : 'bg-blue-50 text-blue-800'
                          }`}>
                            {entry.paid === 0 ? '👈 متبقي آجل' : method === 'cash' ? '💵 تسوية نقدا' : '🏦 تحويل بنكي'}
                          </span>
                        </td>
                        <td className="p-3 text-center font-mono font-extrabold text-[12px]">{entry.total.toLocaleString()}</td>
                        <td className="p-3 text-center font-mono text-emerald-600 font-extrabold text-[12px]">{entry.paid.toLocaleString()}</td>
                        <td className="p-3 text-center font-mono text-red-600 text-[12px]">{remain.toLocaleString()}</td>
                        <td className="p-3 text-center no-print">
                          <button
                            onClick={() => onViewInvoice(entry, contact)}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 p-1 rounded inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="p-10 text-center text-slate-400 font-bold">
                      لا يوجد فواتير شراء أو عمال وتوريد مسجلة في هذا اليوم المحدد حتى الآن.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* AUDIT BOTTOM SIGN-OFF STAMP (PRINT ONLY) */}
      <div className="only-print mt-12 pt-6 border-t border-dashed border-slate-400 grid grid-cols-2 text-center text-xs font-bold gap-6">
        <div className="space-y-12">
          <span>توقيع الموظف المناوب المختص:</span>
          <div className="text-slate-400">......................................................</div>
        </div>
        <div className="space-y-12">
          <span>اعتماد رئيس الحسابات والمدير المالي:</span>
          <div className="text-slate-400">......................................................</div>
        </div>
      </div>

      </div>

    </div>
  );
}
