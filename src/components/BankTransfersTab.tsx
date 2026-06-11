/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  ArrowDownLeft, 
  ArrowUpRight, 
  Search, 
  Plus, 
  Coins, 
  Building2, 
  Printer, 
  Calendar,
  Layers,
  CheckCircle,
  FileText,
  Trash2,
  Calculator,
  ArrowLeftRight,
  CreditCard,
  ShieldAlert,
  X
} from 'lucide-react';
import { Contact, LedgerEntry, TreasuryBankMovement } from '../types';

interface BankTransfersTabProps {
  contacts: Contact[];
  ledgers: Record<string, LedgerEntry[]>;
  onAddPayment: (contactId: string, amount: number, date: string, method: 'cash' | 'bank', reference: string, description: string) => void;
  triggerToast: (msg: string, typ?: 'success' | 'err') => void;
  adjustments: TreasuryBankMovement[];
  onUpdateAdjustments: (movements: TreasuryBankMovement[]) => void;
  settings?: any;
  expenses?: any[];
}

interface UnifiedTx {
  id: string; // original entry id or adjustment combined id
  type: 'ledger' | 'adjustment';
  date: string;
  number: string;
  description: string;
  accountName: string;
  accountType?: 'supplier' | 'customer' | 'worker';
  method: 'cash' | 'bank';
  inflow: number;
  outflow: number;
  rawType?: 'deposit' | 'withdrawal' | 'transfer';
  rawObj?: TreasuryBankMovement;
}

export default function BankTransfersTab({
  contacts,
  ledgers,
  onAddPayment,
  triggerToast,
  adjustments,
  onUpdateAdjustments,
  settings,
  expenses = []
}: BankTransfersTabProps) {
  // Search state
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Filter: 'all' | 'cash' | 'bank'
  const [currentFilter, setCurrentFilter] = useState<'all' | 'cash' | 'bank'>('all');

  // Daily Bank Transfers Operations Calculator State (Local Storage persistent)
  const [calcOpNumber, setCalcOpNumber] = useState<string>('');
  const [calcAmount, setCalcAmount] = useState<string>('');
  const [calcList, setCalcList] = useState<{ id: string; opNumber: string; amount: number }[]>(() => {
    const saved = localStorage.getItem('erp_bank_calc_list');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (err) {
        console.error("Failed to parse erp_bank_calc_list:", err);
      }
    }
    return [];
  });

  const saveCalcList = (newList: typeof calcList) => {
    setCalcList(newList);
    localStorage.setItem('erp_bank_calc_list', JSON.stringify(newList));
  };

  const handleAddCalcItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!calcAmount) {
      triggerToast("يرجى تدوين مبلغ العملية الحظي للإضافة", "err");
      return;
    }
    const val = parseFloat(calcAmount);
    if (isNaN(val) || val <= 0) {
      triggerToast("يرجى إدخال قيمة للمبلغ بصورة صحيحة", "err");
      return;
    }

    const trimmedOpNo = calcOpNumber.trim();
    if (trimmedOpNo) {
      const isDuplicate = calcList.some(item => item.opNumber.trim() === trimmedOpNo);
      if (isDuplicate) {
        // Show alert/warning but do not return. The operation continues and is added.
        triggerToast(`⚠️ تنبيه: رقم العملية (${trimmedOpNo}) مكرر ومسجل مسبقاً! تم الإضافة بنجاح مع التكرار.`, "err");
      }
    }

    const opNo = trimmedOpNo || `TRX-${Math.floor(100000 + Math.random() * 900000)}`;
    const newItem = {
      id: `calc-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      opNumber: opNo,
      amount: val
    };

    const updated = [...calcList, newItem];
    saveCalcList(updated);
    setCalcOpNumber('');
    setCalcAmount('');
    triggerToast("تم تدوين القيد للجامع اليومي الحظي");
  };

  const handleDeleteCalcItem = (id: string) => {
    const updated = calcList.filter(item => item.id !== id);
    saveCalcList(updated);
  };

  const handleClearCalcList = () => {
    saveCalcList([]);
    triggerToast("تمت تصفية مسح كافة بيانات وجدول الحاسبة اليومية");
  };

  const calcTotalAmount = useMemo(() => {
    return calcList.reduce((sum, item) => sum + item.amount, 0);
  }, [calcList]);

  // Modals Visibility
  const [showDirectPaymentModal, setShowDirectPaymentModal] = useState<boolean>(false);
  const [showAdjustmentModal, setShowAdjustmentModal] = useState<boolean>(false);
  const [showTransferModal, setShowTransferModal] = useState<boolean>(false);
  
  // Document Printable Slip State
  const [selectedSlip, setSelectedSlip] = useState<{
    id: string;
    type: 'deposit' | 'withdrawal' | 'transfer';
    source: 'treasury' | 'bank';
    destination?: 'treasury' | 'bank';
    amount: number;
    date: string;
    refNumber: string;
    description: string;
  } | null>(null);

  // States for Direct Payment Modal (Partners payments)
  const [selectedContactId, setSelectedContactId] = useState<string>('');
  const [transferAmount, setTransferAmount] = useState<string>('');
  const [transferDate, setTransferDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [transferRef, setTransferRef] = useState<string>('');
  const [transferDesc, setTransferDesc] = useState<string>('');
  const [transferDirection, setTransferDirection] = useState<'inflow' | 'outflow'>('inflow');
  const [directPaymentMethod, setDirectPaymentMethod] = useState<'cash' | 'bank'>('bank');

  // States for Adjustment Modals (Deposits and Withdrawals)
  const [adjType, setAdjType] = useState<'deposit' | 'withdrawal'>('deposit');
  const [adjSource, setAdjSource] = useState<'treasury' | 'bank'>('treasury');
  const [adjAmount, setAdjAmount] = useState<string>('');
  const [adjDate, setAdjDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [adjRef, setAdjRef] = useState<string>('');
  const [adjDesc, setAdjDesc] = useState<string>('');

  // States for Inter-fund Transfer Modal (Treasury -> Bank)
  const [transAmount, setTransAmount] = useState<string>('');
  const [transDate, setTransDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [transRef, setTransRef] = useState<string>('');
  const [transDesc, setTransDesc] = useState<string>('');

  // Auto compile current dynamic balances
  const balances = useMemo(() => {
    let ledgerTreasuryIn = 0;
    let ledgerTreasuryOut = 0;
    let ledgerBankIn = 0;
    let ledgerBankOut = 0;

    let expensesTreasuryOut = 0;
    let expensesBankOut = 0;

    expenses.forEach(x => {
      if (x.paymentMethod === 'cash') expensesTreasuryOut += x.amount;
      else if (x.paymentMethod === 'bank') expensesBankOut += x.amount;
    });

    Object.keys(ledgers).forEach(contactId => {
      const contactObj = contacts.find(c => c.id === contactId);
      if (!contactObj) return;

      const entries = ledgers[contactId] || [];
      entries.forEach(e => {
        const method = e.paymentMethod || 'cash';
        if (contactObj.type === 'supplier') {
          if (e.type === 'invoice') {
            if (method === 'cash') ledgerTreasuryOut += e.paid;
            else if (method === 'bank') ledgerBankOut += e.paid;

            const invExp = (e.transportExpense || 0) + (e.carryingExpense || 0) + (e.otherInvoiceExpense || 0);
            const expMethod = e.expensePaymentMethod || method;
            if (invExp > 0) {
              if (expMethod === 'cash') expensesTreasuryOut += invExp;
              else if (expMethod === 'bank') expensesBankOut += invExp;
            }
          } else if (e.type === 'payment') {
            if (method === 'cash') ledgerTreasuryOut += e.total;
            else if (method === 'bank') ledgerBankOut += e.total;
          }
        } else if (contactObj.type === 'customer') {
          if (e.type === 'invoice') {
            if (method === 'cash') ledgerTreasuryIn += e.paid;
            else if (method === 'bank') ledgerBankIn += e.paid;
          } else if (e.type === 'payment') {
            if (method === 'cash') ledgerTreasuryIn += e.total;
            else if (method === 'bank') ledgerBankIn += e.total;
          }
        } else if (contactObj.type === 'worker') {
          if (e.type === 'invoice') {
            if (method === 'cash') ledgerTreasuryOut += e.paid;
            else if (method === 'bank') ledgerBankOut += e.paid;
          } else if (e.type === 'payment') {
            if (method === 'cash') ledgerTreasuryOut += e.total;
            else if (method === 'bank') ledgerBankOut += e.total;
          }
        }
      });
    });

    let manualTreasuryIn = 0;
    let manualTreasuryOut = 0;
    let manualBankIn = 0;
    let manualBankOut = 0;

    adjustments.forEach(m => {
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

    const treasuryBalance = Number(settings?.initialTreasuryBalance || 0) + ledgerTreasuryIn + manualTreasuryIn - (ledgerTreasuryOut + manualTreasuryOut + expensesTreasuryOut);
    const bankBalance = Number(settings?.initialBankBalance || 0) + ledgerBankIn + manualBankIn - (ledgerBankOut + manualBankOut + expensesBankOut);

    return {
      treasury: treasuryBalance,
      bank: bankBalance,
      total: treasuryBalance + bankBalance
    };
  }, [ledgers, contacts, adjustments, expenses, settings]);

  // Combine actions to unified table list
  const compiledTransactions = useMemo(() => {
    const list: UnifiedTx[] = [];

    // 1. Ledger Entries
    Object.keys(ledgers).forEach(contactId => {
      const contactObj = contacts.find(c => c.id === contactId);
      if (!contactObj) return;

      const entries = ledgers[contactId] || [];
      entries.forEach(e => {
        const method = e.paymentMethod || 'cash';
        let inflow = 0;
        let outflow = 0;

        if (contactObj.type === 'customer') {
          if (e.type === 'invoice') inflow = e.paid;
          else if (e.type === 'payment') inflow = e.total;
        } else if (contactObj.type === 'supplier' || contactObj.type === 'worker') {
          if (e.type === 'invoice') outflow = e.paid;
          else if (e.type === 'payment') outflow = e.total;
        }

        if (inflow > 0 || outflow > 0) {
          list.push({
            id: e.id,
            type: 'ledger',
            date: e.date,
            number: e.number,
            description: e.description,
            accountName: contactObj.name,
            accountType: contactObj.type,
            method,
            inflow,
            outflow
          });
        }
      });
    });

    // 2. Adjustments and Transfers
    adjustments.forEach(m => {
      if (m.type === 'deposit') {
        list.push({
          id: m.id,
          type: 'adjustment',
          date: m.date,
          number: m.refNumber,
          description: m.description,
          accountName: m.source === 'treasury' ? '👈 إيداع يدوي بالخزينة' : '👈 إيداع يدوي بالبنك',
          method: m.source === 'treasury' ? 'cash' : 'bank',
          inflow: m.amount,
          outflow: 0,
          rawType: 'deposit',
          rawObj: m
        });
      } else if (m.type === 'withdrawal') {
        list.push({
          id: m.id,
          type: 'adjustment',
          date: m.date,
          number: m.refNumber,
          description: m.description,
          accountName: m.source === 'treasury' ? '👉 سحب يدوي من الخزينة' : '👉 سحب يدوي من البنك',
          method: m.source === 'treasury' ? 'cash' : 'bank',
          inflow: 0,
          outflow: m.amount,
          rawType: 'withdrawal',
          rawObj: m
        });
      } else if (m.type === 'transfer') {
        // Source Outflow
        list.push({
          id: `${m.id}-out`,
          type: 'adjustment',
          date: m.date,
          number: m.refNumber,
          description: `${m.description} (تحويل صادر البنك)`,
          accountName: '🔄 تحويل مالي للخارج',
          method: 'cash',
          inflow: 0,
          outflow: m.amount,
          rawType: 'transfer',
          rawObj: m
        });
        // Destination Inflow
        list.push({
          id: `${m.id}-in`,
          type: 'adjustment',
          date: m.date,
          number: m.refNumber,
          description: `${m.description} (تحويل وارد من الخزينة)`,
          accountName: '🔄 استلام تحويل بالبنك',
          method: 'bank',
          inflow: m.amount,
          outflow: 0,
          rawType: 'transfer',
          rawObj: m
        });
      }
    });

    return list;
  }, [ledgers, contacts, adjustments]);

  // Apply Search & Tab Filters
  const filteredTransactions = useMemo(() => {
    return compiledTransactions.filter(tx => {
      const matchesSearch = 
        tx.description.toLowerCase().includes(searchQuery.toLowerCase()) || 
        tx.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.accountName.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesFilter = 
        currentFilter === 'all' || 
        tx.method === currentFilter;

      return matchesSearch && matchesFilter;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [compiledTransactions, searchQuery, currentFilter]);

  // Handler For Direct Partner Payment
  const handleSaveDirectPayment = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(transferAmount);
    if (!selectedContactId || isNaN(parsedAmount) || parsedAmount <= 0) {
      triggerToast("يرجى ملء كافة الخانات الإجبارية وإعطاء مبلغ سليم من الصفر", "err");
      return;
    }
    
    const contactObj = contacts.find(c => c.id === selectedContactId);
    if (!contactObj) return;

    const currentAvailable = directPaymentMethod === 'cash' ? balances.treasury : balances.bank;
    if (parsedAmount > currentAvailable) {
      triggerToast("⚠️ عذراً: المبلغ المطلوب أكبر من الرصيد المتوفر بالخزنة أو البنك!", "err");
      alert(`⚠️ لا يمكن إتمام عملية السداد:\nالمبلغ المطلوب (${parsedAmount.toLocaleString()} ج.س) أكبر من المتوفر في [${directPaymentMethod === 'cash' ? 'الخزنة' : 'البنك'}] (${currentAvailable.toLocaleString()} ج.س).`);
      return;
    }

    // Use current API function to save
    onAddPayment(
      selectedContactId,
      parsedAmount,
      transferDate,
      directPaymentMethod,
      transferRef || `VOU-${Date.now().toString().slice(-4)}`,
      transferDesc || `قيد دفع مالي مباشر لصالح حساب الشريك ${contactObj.name}`
    );

    triggerToast("تم حفظ مستند الدفع المالي للشريك وتعديل الخزائن المعنية");
    setShowDirectPaymentModal(false);
    
    // Clear inputs
    setTransferAmount('');
    setTransferRef('');
    setTransferDesc('');
  };

  // Handler to Save Manual Adjustments (Deposit / Withdrawal)
  const handleSaveAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(adjAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      triggerToast("يرجى تدوين قدر المبلغ بصورة سليمة وصحيحة", "err");
      return;
    }

    if (adjType === 'withdrawal') {
      const currentAvailable = adjSource === 'treasury' ? balances.treasury : balances.bank;
      if (parsedAmount > currentAvailable) {
        triggerToast("⚠️ عذراً: المبلغ المطلوب أكبر من الرصيد المتوفر بالسحوبات!", "err");
        alert(`⚠️ لا يمكن إتمام عملية السحب المالي المباشر:\nالمبلغ المطلوب (${parsedAmount.toLocaleString()} ج.س) أكبر من الرصيد المتوفر في [${adjSource === 'treasury' ? 'الخزنة' : 'البنك'}] (${currentAvailable.toLocaleString()} ج.س).`);
        return;
      }
    }

    const newAdj: TreasuryBankMovement = {
      id: `adj-${Date.now()}-${Math.floor(Math.random()*1000)}`,
      type: adjType,
      source: adjSource,
      amount: parsedAmount,
      date: adjDate,
      refNumber: adjRef.trim() || `${adjType === 'deposit' ? 'DEP' : 'WTH'}-${Math.floor(10000 + Math.random() * 89999)}`,
      description: adjDesc.trim() || `${adjType === 'deposit' ? 'عملية إيداع يدوي تسوية' : 'عملية سحب يدوي تسوية'} للسيولة النقدية`
    };

    onUpdateAdjustments([...adjustments, newAdj]);
    triggerToast("تم تسجيل وحفظ سند التسوية اليدوية للخزائن");
    setShowAdjustmentModal(false);

    // Prompt user to print
    setSelectedSlip(newAdj);

    // Clear inputs
    setAdjAmount('');
    setAdjDesc('');
    setAdjRef('');
  };

  // Handler to Save Inter-fund Transfer (Treasury -> Bank)
  const handleSaveTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(transAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      triggerToast("يرجى مراجعة وتدوين مبلغ التحويل الداخلي", "err");
      return;
    }

    if (parsedAmount > balances.treasury) {
      triggerToast("⚠️ عذراً: المبلغ المطلوب للتحويل أكبر من الرصيد المتوفر بالخزنة الميدانية!", "err");
      alert(`⚠️ لا يمكن إتمام عملية التحويل المالي الداخلي:\nالمبلغ المطلوب للتحويل (${parsedAmount.toLocaleString()} ج.س) أكبر من الرصيد المتوفر بالخزنة الميدانية (${balances.treasury.toLocaleString()} ج.س).`);
      return;
    }

    const newTransfer: TreasuryBankMovement = {
      id: `tr-${Date.now()}-${Math.floor(Math.random()*1000)}`,
      type: 'transfer',
      source: 'treasury',
      destination: 'bank',
      amount: parsedAmount,
      date: transDate,
      refNumber: transRef.trim() || `TR-${Math.floor(10000 + Math.random() * 89999)}`,
      description: transDesc.trim() || `تحويل وتغذية من صندوق الخزينة الميدانية إلى الحساب البنكي`
    };

    onUpdateAdjustments([...adjustments, newTransfer]);
    triggerToast("تم إجراء وتسجيل عملية التحويل المالي الداخلي بنجاح");
    setShowTransferModal(false);

    // Promp user to print
    setSelectedSlip(newTransfer);

    // Clear inputs
    setTransAmount('');
    setTransRef('');
    setTransDesc('');
  };

  // Delete manual movements
  const handleDeleteAdjustment = (id: string) => {
    const cleanId = id.replace('-out', '').replace('-in', '');
    const updated = adjustments.filter(m => m.id !== cleanId);
    onUpdateAdjustments(updated);
    triggerToast("تم إلغاء وحذف سند الحركة وصفر تأثيره الرياضي بنجاح");
  };

  const tafqeetSudanese = (amt: number): string => {
    return `فقط وقدره ${amt.toLocaleString('en-US', { minimumFractionDigits: 2 })} جنيه سوداني لا غير`;
  };

  const handlePrintSlip = () => {
    window.print();
  };

  return (
    <div className="space-y-6" dir="rtl">
      
      {/* 1. Header Overview with balances cards */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
        <div className="space-y-1">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Layers className="w-5 h-5 text-amber-400" />
            <span>تسويات الخزينة العامة والحسابات البنكية (بنكك)</span>
          </h2>
          <p className="text-xs text-slate-350 text-slate-400 font-bold">إدارة شؤون الصناديق والسيولة النقدية والتحويلات البنكية لعمليات البيع والشراء والرواتب.</p>
        </div>
        
        {/* Dynamic Balance Badges */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-slate-800 border border-emerald-500/20 px-4 py-2.5 rounded-xl text-center min-w-[130px]">
            <span className="block text-[8px] text-zinc-400 font-black uppercase">💵 صندوق الخزينة الميدانية</span>
            <span className="text-sm font-black font-mono text-emerald-400">
              {balances.treasury.toLocaleString('en-US', { minimumFractionDigits: 2 })} <span className="text-[9px] font-sans">ج.س</span>
            </span>
          </div>

          <div className="bg-slate-800 border border-orange-500/20 px-4 py-2.5 rounded-xl text-center min-w-[130px]">
            <span className="block text-[8px] text-zinc-400 font-black uppercase">🏦 الحساب البنكي (بنكك)</span>
            <span className="text-sm font-black font-mono text-orange-400">
              {balances.bank.toLocaleString('en-US', { minimumFractionDigits: 2 })} <span className="text-[9px] font-sans">ج.س</span>
            </span>
          </div>

          <div className="bg-amber-500 text-slate-950 px-4 py-2.5 rounded-xl text-center min-w-[130px]">
            <span className="block text-[8px] font-black uppercase">💰 إجمالي رأس المال المحقق</span>
            <span className="text-sm font-black font-mono">
              {balances.total.toLocaleString('en-US', { minimumFractionDigits: 2 })} <span className="text-[9px] font-sans">ج.س</span>
            </span>
          </div>
        </div>
      </div>

      {/* 2. Action Controls Bar */}
      <div className="bg-white p-4 border border-slate-200 rounded-xl shadow-xs flex flex-wrap items-center justify-between gap-3 no-print">
        
        {/* Switch Filters for Cash or Bank view */}
        <div className="flex bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setCurrentFilter('all')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-all ${
              currentFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            كل الصناديق
          </button>
          <button
            onClick={() => setCurrentFilter('cash')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1 ${
              currentFilter === 'cash' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-500 hover:text-emerald-800'
            }`}
          >
            💵 الخزينة النقدية
          </button>
          <button
            onClick={() => setCurrentFilter('bank')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1 ${
              currentFilter === 'bank' ? 'bg-white text-blue-800 shadow-xs' : 'text-slate-500 hover:text-blue-800'
            }`}
          >
            🏦 التحويل البنكي
          </button>
        </div>

        {/* Adjustments Actions Trigger */}
        <div className="flex flex-wrap items-center gap-2">
          
          <button
            onClick={() => {
              setAdjType('deposit');
              setShowAdjustmentModal(true);
            }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-3.5 py-1.5 rounded-lg text-xs cursor-pointer flex items-center gap-1 shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>➕ إيداع يدوي بالسند</span>
          </button>

          <button
            onClick={() => {
              setAdjType('withdrawal');
              setShowAdjustmentModal(true);
            }}
            className="bg-amber-600 hover:bg-amber-700 text-white font-black px-3.5 py-1.5 rounded-lg text-xs cursor-pointer flex items-center gap-1 shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>➖ سحب سيولة يدوي</span>
          </button>

          <button
            onClick={() => setShowTransferModal(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-3.5 py-1.5 rounded-lg text-xs cursor-pointer flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span>🔄 تحويل من الخزينة للبنك</span>
          </button>

          <button
            onClick={() => setShowDirectPaymentModal(true)}
            className="bg-slate-900 hover:bg-slate-800 text-white font-black px-3.5 py-1.5 rounded-lg text-xs cursor-pointer flex items-center gap-1 transition-colors"
          >
            <FileText className="w-4 h-4 text-amber-400" />
            <span>📝 قيد دفع لشريك مالي</span>
          </button>
        </div>

      </div>

      {/* 3. Outer Splits layout section */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Main Movements Table Ledger */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            
            {/* Inner search query */}
            <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-3 bg-slate-50/50 no-print">
              <div className="relative w-full md:max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="البحث بالبيان، رقم السند، الشريك..."
                  className="w-full bg-white border border-slate-300 rounded-lg pr-9 pl-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-slate-400 font-bold"
                />
              </div>
              <span className="text-[10px] text-slate-500 font-sans font-bold select-none">
                مجموع الحركات المسجلة والمطابقة: {filteredTransactions.length} حركة محاسبية
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs md:text-sm text-right border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-extrabold border-b border-slate-300 select-none text-[10px] md:text-xs">
                    <th className="p-3 text-center">التاريخ</th>
                    <th className="p-3 text-center">نوع/رقم السند</th>
                    <th className="p-3">صاحب التعامل / نوع التسوية</th>
                    <th className="p-3">البيان وشرائح الوصف</th>
                    <th className="p-3 text-center">آلية الدفع</th>
                    <th className="p-3 text-center text-emerald-700">دائن (وارد +)</th>
                    <th className="p-3 text-center text-red-700">مدين (خارج -)</th>
                    <th className="p-3 text-center no-print">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-bold">
                  {filteredTransactions.length > 0 ? (
                    filteredTransactions.map(tx => (
                      <tr key={tx.id} className="hover:bg-slate-50/20 text-[11px] md:text-xs">
                        {/* Date */}
                        <td className="p-3 text-center font-mono text-slate-500 whitespace-nowrap">{tx.date}</td>
                        
                        {/* Voucher / Invoice Code */}
                        <td className="p-3 text-center font-mono">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black whitespace-nowrap border ${
                            tx.type === 'adjustment' 
                              ? 'bg-amber-50 text-amber-800 border-amber-200' 
                              : 'bg-slate-100 text-slate-800 border-slate-200'
                          }`}>
                            {tx.number}
                          </span>
                        </td>

                        {/* Owner Account / Adjustment description */}
                        <td className="p-3">
                          <div className="font-extrabold text-slate-900">{tx.accountName}</div>
                          {tx.accountType && (
                            <div className="text-[9px] text-slate-500 font-sans mt-0.5 font-bold">
                              {tx.accountType === 'customer' ? 'شريك عميل 👤' : tx.accountType === 'supplier' ? 'شريك مورد 🏭' : 'شريك عامل 👷'}
                            </div>
                          )}
                        </td>

                        {/* Statement description */}
                        <td className="p-3 text-slate-600 font-medium text-[11px] max-w-sm" title={tx.description}>
                          {tx.description}
                        </td>

                        {/* Payment method */}
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            tx.method === 'cash' ? 'bg-emerald-50 text-emerald-800' : 'bg-blue-50 text-blue-800'
                          }`}>
                            {tx.method === 'cash' ? '💵 خزينة نقداً' : '🏦 تحويل بنكي'}
                          </span>
                        </td>

                        {/* Inflow */}
                        <td className="p-3 text-center font-mono text-emerald-600 text-[12px] whitespace-nowrap">
                          {tx.inflow > 0 ? `+ ${tx.inflow.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '-'}
                        </td>

                        {/* Outflow */}
                        <td className="p-3 text-center font-mono text-red-650 text-red-650 text-red-600 text-[12px] whitespace-nowrap">
                          {tx.outflow > 0 ? `- ${tx.outflow.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '-'}
                        </td>

                        {/* Actions */}
                        <td className="p-3 text-center no-print whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            {tx.type === 'adjustment' && tx.rawObj && (
                              <button
                                onClick={() => setSelectedSlip(tx.rawObj)}
                                className="text-slate-800 hover:text-slate-950 bg-slate-100 p-1 rounded hover:bg-slate-200 cursor-pointer"
                                title="تحرير وطباعة سند التسوية"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>
                            )}
                            
                            {tx.type === 'adjustment' && (
                              <button
                                onClick={() => handleDeleteAdjustment(tx.id)}
                                className="text-zinc-300 hover:text-rose-600 p-1 rounded hover:bg-rose-50 cursor-pointer"
                                title="إلغاء وحذف حركة التسوية"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>

                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="py-20 text-center text-slate-400 font-bold">
                        لا حركات نقدية أو بنكية مسجلة حالياً مطابقة لمعايير التصفية.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

          </div>
        </div>

        {/* Right sidebar: Cumulative warning-safe calculator */}
        <div className="space-y-6 lg:col-span-1">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between h-fit space-y-4 no-print select-none">
            <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
              <h3 className="font-extrabold text-xs md:text-sm text-slate-900 flex items-center gap-2">
                <Calculator className="w-5 h-5 text-indigo-600" />
                <span>حاسبة التحويلات البنكية اليومية</span>
              </h3>
              {calcList.length > 0 && (
                <button 
                  onClick={handleClearCalcList}
                  className="text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 text-[10px] font-black px-2.5 py-1.5 rounded-lg cursor-pointer transition text-nowrap"
                >
                  مسح الشريط
                </button>
              )}
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed font-semibold">
              أداة تجميع وإجمالي حركة حوالات بنكك اليومية لمنع السهو والتكرار. أدخل رقم العملية والمبلغ للإضافة للجامع التراكمي.
            </p>

            <form onSubmit={handleAddCalcItem} className="grid grid-cols-1 gap-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-slate-505 font-bold mb-1">رقم العملية</label>
                  <input
                    type="text"
                    value={calcOpNumber}
                    onChange={(e) => setCalcOpNumber(e.target.value)}
                    placeholder="رقم مرجع بنكك"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-mono font-bold focus:bg-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-505 font-bold mb-1">المبلغ (SDG) *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={calcAmount}
                    onChange={(e) => setCalcAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-mono font-bold focus:bg-white outline-none"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-2 rounded-xl text-xs cursor-pointer transition-colors shadow-xs"
              >
                إضافة للعمليات المتراكمة (+)
              </button>
            </form>

            {calcList.length > 0 ? (
              <div className="border border-slate-205 rounded-xl bg-slate-50 overflow-hidden">
                <div className="max-h-[200px] overflow-y-auto divide-y divide-slate-200">
                  {calcList.map((item) => {
                    const isDup = calcList.filter(i => i.opNumber.trim() === item.opNumber.trim()).length > 1;
                    return (
                      <div key={item.id} className={`flex justify-between items-center p-2.5 text-[11px] hover:bg-white transition-colors ${isDup ? 'bg-rose-50/80 border-r-4 border-red-500' : ''}`}>
                        <div className="flex flex-col text-right">
                          <span className={`font-mono text-[9px] ${isDup ? 'text-red-500 font-bold' : 'text-slate-400'}`}>العملية {isDup && '⚠️ مكررة'}</span>
                          <strong className={`font-mono tracking-tight ${isDup ? 'text-red-700 font-extrabold' : 'text-slate-800'}`}>{item.opNumber}</strong>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`font-mono font-bold text-xs text-[11px] md:text-xs ${isDup ? 'text-red-700 font-black font-semibold' : 'text-slate-900'}`}>
                            {item.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteCalcItem(item.id)}
                            className="text-stone-300 hover:text-red-650 p-1 cursor-pointer animate-pulse"
                            title="إزالة القيد"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-stone-400 hover:text-red-650" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Accumulator Summary ribbon totals */}
                <div className="bg-slate-900 text-white p-3 flex justify-between items-center select-none">
                  <div className="flex flex-col text-right">
                    <span className="text-[9px] text-[#94a3b8] font-bold">إجمالي المطابق اليومي</span>
                    <span className="text-[10px] text-amber-400 font-bold">({calcList.length} عمليات مسجلة)</span>
                  </div>
                  <div className="font-mono text-xs md:text-sm font-black text-amber-400 tracking-tight">
                    {calcTotalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} <span className="text-[10px] font-sans font-bold text-slate-300">ج.س</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed border-slate-200 rounded-xl py-8 text-center text-xs text-slate-400 font-bold bg-slate-50/50">
                شريط الحساب فارغ حالياً.<br />أدخل عمليات الحوالات لتجميع الحساب الحظي.
              </div>
            )}
          </div>
        </div>

      </div>

      {/* --- MODAL A: Direct Payment to Partners --- */}
      {showDirectPaymentModal && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 no-print animate-fade-in" dir="rtl">
          <div className="bg-white rounded-2xl border border-slate-300 p-6 w-full max-w-lg shadow-2xl relative">
            <div className="border-b border-slate-100 pb-3 mb-4 flex justify-between items-center">
              <h3 className="font-black text-sm md:text-base text-slate-950 flex items-center gap-1.5">
                <FileText className="w-5 h-5 text-amber-500" />
                <span>📝 تسجيل مستند قيد مالي مباشر للشريك</span>
              </h3>
              <button onClick={() => setShowDirectPaymentModal(false)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDirectPayment} className="space-y-4">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                
                {/* Account Entity selector */}
                <div>
                  <label className="block text-[10px] font-black text-slate-500 mb-1">الشريك المالي (مورد/عميل/عامل) *</label>
                  <select
                    value={selectedContactId}
                    onChange={(e) => setSelectedContactId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-md px-2 py-1.5 text-xs font-bold"
                    required
                  >
                    <option value="">-- اختر الحساب المعني --</option>
                    {contacts.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.type === 'customer' ? 'عميل' : c.type === 'supplier' ? 'مورد' : 'عامل'})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-[10px] font-black text-slate-500 mb-1">المبلغ المالي (SDG) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-slate-50 border border-slate-300 rounded-md p-2 text-xs font-mono font-bold"
                  />
                </div>

                {/* Date */}
                <div>
                  <label className="block text-[10px] font-black text-slate-500 mb-1">تاريخ المعاملة المعنية *</label>
                  <input
                    type="date"
                    required
                    value={transferDate}
                    onChange={(e) => setTransferDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-md p-2 text-xs font-mono font-bold"
                  />
                </div>

                {/* Reference Number */}
                <div>
                  <label className="block text-[10px] font-black text-slate-500 mb-1">رقم المرجع (بنكك / سند الخزينة)</label>
                  <input
                    type="text"
                    value={transferRef}
                    onChange={(e) => setTransferRef(e.target.value)}
                    placeholder="مثال: TRX-88339"
                    className="w-full bg-slate-50 border border-slate-300 rounded-md p-2 text-xs font-mono font-bold"
                  />
                </div>

                {/* Direction */}
                <div>
                  <label className="block text-[10px] font-black text-slate-500 mb-1">نوع تدفق القيد المالي *</label>
                  <select
                    value={transferDirection}
                    onChange={(e) => setTransferDirection(e.target.value as 'inflow' | 'outflow')}
                    className="w-full bg-slate-50 border border-slate-300 rounded-md px-2 py-1.5 text-xs font-bold"
                    required
                  >
                    <option value="inflow">📥 وارد (استلام وتحصيل نقدية)</option>
                    <option value="outflow">📤 صادر (دفع ومستحق للطرف)</option>
                  </select>
                </div>

                {/* Fund Account method */}
                <div>
                  <label className="block text-[10px] font-black text-slate-500 mb-1">صندوق الدفع أو الاستلام الفعلي *</label>
                  <select
                    value={directPaymentMethod}
                    onChange={(e) => setDirectPaymentMethod(e.target.value as 'cash' | 'bank')}
                    className="w-full bg-emerald-50 border border-emerald-200 text-emerald-950 px-2 py-1.5 rounded-md text-xs font-black"
                    required
                  >
                    <option value="cash">💵 الخزينة الميدانية النقدي</option>
                    <option value="bank">🏦 الحساب البنكي (بنكك)</option>
                  </select>
                </div>

              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 mb-1">البيان والشرح التوضيحي *</label>
                <input
                  type="text"
                  required
                  value={transferDesc}
                  onChange={(e) => setTransferDesc(e.target.value)}
                  placeholder="مثال: سداد جزء متبقي مالي من فاتورة مشتريات..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-md p-2 text-xs font-bold"
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-3 mt-4">
                <button
                  type="button"
                  onClick={() => setShowDirectPaymentModal(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2 rounded-lg text-xs"
                >
                  إلغاء الخروج
                </button>
                <button
                  type="submit"
                  className="bg-slate-900 hover:bg-slate-800 text-white font-black px-5 py-2 rounded-lg text-xs cursor-pointer shadow-xs"
                >
                  تأكيد وحفظ القيد
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* --- MODAL B: Manual Balance Adjustment (Deposited / Withdrawn Slip) --- */}
      {showAdjustmentModal && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 no-print animate-fade-in" dir="rtl">
          <div className="bg-white rounded-2xl border border-slate-300 p-6 w-full max-w-md shadow-2xl relative">
            <div className="border-b border-slate-100 pb-3 mb-4 flex justify-between items-center bg-slate-50 -m-6 p-6 rounded-t-2xl">
              <h3 className="font-extrabold text-xs md:text-sm text-slate-950 flex items-center gap-1.5">
                <Coins className="w-5 h-5 text-amber-500" />
                <span>
                  {adjType === 'deposit' ? '➕ تحرير سند إيداع يدوي تسوية' : '➖ تحرير سند سحب يدوي تسوية'}
                </span>
              </h3>
              <button onClick={() => setShowAdjustmentModal(false)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAdjustment} className="space-y-4">
              
              <div className="grid grid-cols-1 gap-3.5">
                
                {/* Select Account cash vs bank */}
                <div>
                  <label className="block text-[10px] font-black text-slate-500 mb-1">مكان القيد الأساسي (صندوق الخزينة الفعلي) *</label>
                  <select
                    value={adjSource}
                    onChange={(e) => setAdjSource(e.target.value as 'treasury' | 'bank')}
                    className="w-full bg-slate-50 border border-slate-300 rounded-md px-2.5 py-1.5 text-xs font-bold"
                    required
                  >
                    <option value="treasury">💵 صندوق الخزينة الميدانية النقدي</option>
                    <option value="bank">🏦 الحساب البنكي (بنكك)</option>
                  </select>
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-[10px] font-black text-slate-500 mb-1">المبلغ المالي ج.س (SDG) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={adjAmount}
                    onChange={(e) => setAdjAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-slate-50 border border-slate-305 border-slate-300 rounded-md p-2 text-xs font-mono font-black text-emerald-600"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {/* Date */}
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 mb-1">تاريخ السند *</label>
                    <input
                      type="date"
                      required
                      value={adjDate}
                      onChange={(e) => setAdjDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-md p-2 text-xs font-mono font-semibold"
                    />
                  </div>

                  {/* Manual reference code */}
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 mb-1">رقم السند الدفتري</label>
                    <input
                      type="text"
                      value={adjRef}
                      onChange={(e) => setAdjRef(e.target.value)}
                      placeholder="توليد تلقائي"
                      className="w-full bg-slate-50 border border-slate-300 rounded-md p-2 text-xs font-mono font-bold"
                    />
                  </div>
                </div>

                {/* Statement Description */}
                <div>
                  <label className="block text-[10px] font-black text-slate-500 mb-1">البيان وسبب تدوين السند المالي *</label>
                  <textarea
                    required
                    value={adjDesc}
                    onChange={(e) => setAdjDesc(e.target.value)}
                    placeholder="مثال: تزويد السيولة النقدية بمبلغ خارجي لتسوية رواتب عمال..."
                    rows={2}
                    className="w-full bg-slate-50 border border-slate-300 rounded-md p-2 text-xs font-bold outline-none focus:bg-white focus:border-slate-500"
                  />
                </div>

              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-3 mt-4">
                <button
                  type="button"
                  onClick={() => setShowAdjustmentModal(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-705 text-slate-700 font-bold px-4 py-2 rounded-lg text-xs"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="bg-slate-900 hover:bg-slate-800 text-white font-black px-5 py-2 rounded-lg text-xs cursor-pointer shadow-xs"
                >
                  حفظ السند وطباعته
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* --- MODAL C: Inter-fund Transfer (Treasury -> Bank) --- */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 no-print animate-fade-in" dir="rtl">
          <div className="bg-white rounded-2xl border border-slate-300 p-6 w-full max-w-md shadow-2xl relative">
            <div className="border-b border-slate-105 pb-3 mb-4 flex justify-between items-center -m-6 p-6 rounded-t-2xl bg-indigo-50 border-b border-indigo-150">
              <h3 className="font-extrabold text-xs md:text-sm text-indigo-950 flex items-center gap-1.5">
                <ArrowLeftRight className="w-5 h-5 text-indigo-600" />
                <span>🔄 إجراء تحويل مالي من الخزينة للبنك</span>
              </h3>
              <button onClick={() => setShowTransferModal(false)} className="text-stone-400 hover:text-stone-600 p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTransfer} className="space-y-4">
              
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs leading-relaxed space-y-1">
                <div className="flex justify-between font-bold">
                  <span className="text-slate-500">سقف السيولة بالخزينة:</span>
                  <span className="text-emerald-700 font-mono font-black">{balances.treasury.toLocaleString()} ج.س</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span className="text-zinc-500">الوجهة المحجوزة:</span>
                  <span className="text-blue-800">🏦 حساب البنك الحالي (بنكك)</span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3.5">
                {/* Amount */}
                <div>
                  <label className="block text-[10px] font-black text-slate-500 mb-1 font-bold">المبلغ المراد تحويله (SDG) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={transAmount}
                    onChange={(e) => setTransAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-slate-50 border border-slate-300 rounded-md p-2 text-xs font-mono font-black text-indigo-700 focus:bg-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {/* Date */}
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 mb-1">تاريخ التحويل الداخلي *</label>
                    <input
                      type="date"
                      required
                      value={transDate}
                      onChange={(e) => setTransDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-md p-2 text-xs font-mono font-bold"
                    />
                  </div>

                  {/* Reference code */}
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 mb-1">رقم سند التحويل المالي</label>
                    <input
                      type="text"
                      value={transRef}
                      onChange={(e) => setTransRef(e.target.value)}
                      placeholder="توليد تلقائي"
                      className="w-full bg-slate-50 border border-slate-300 rounded-md p-2 text-xs font-mono font-bold"
                    />
                  </div>
                </div>

                {/* Statement explanation */}
                <div>
                  <label className="block text-[10px] font-black text-slate-500 mb-1">بيان السند / غرض التحويل *</label>
                  <input
                    type="text"
                    required
                    value={transDesc}
                    onChange={(e) => setTransDesc(e.target.value)}
                    placeholder="مثال: إيداع نقدي بالبنك لتصفية شيك أو حوالة..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-md p-2 text-xs font-bold"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-3 mt-4">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2 rounded-lg text-xs"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-5 py-2 rounded-lg text-xs cursor-pointer shadow-xs"
                >
                  تنفيذ التحويل المالي
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* --- PRINTER READY OVERLAY TAB DOCUMENT SLIP (سند مالي مدعوم بالختم) --- */}
      {selectedSlip && (
        <div className="fixed inset-0 bg-slate-950/70 flex items-center justify-center z-[100] p-4 font-sans select-none overflow-y-auto print:absolute print:inset-0 print:bg-white print:p-0 print:z-0 print:overflow-visible">
          
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl relative p-8 print:p-0 print:shadow-none print:border-none print:w-full print:max-w-none no-print-modal-wrapper animate-fade-in border border-slate-200">
            
            {/* Float dismiss panel at top - no print */}
            <div className="absolute left-4 top-4 flex items-center gap-2 no-print">
              <button
                onClick={handlePrintSlip}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-4 py-2 rounded-lg text-xs cursor-pointer flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <Printer className="w-4 h-4" />
                <span>طابعة السند المباشر (Ctrl+P)</span>
              </button>
              <button
                onClick={() => setSelectedSlip(null)}
                className="bg-slate-900 hover:bg-slate-850 text-white px-3 py-2 rounded-lg text-xs cursor-pointer"
              >
                إغلاق المستند
              </button>
            </div>

            {/* Print Area begins */}
            <div className="printable-slip space-y-8 text-slate-900 border-3 border-double border-slate-900 p-6 md:p-8 rounded-2xl print:border-3 print:m-0 print:p-8 relative">
              
              {/* Decorative side margins for classic slip feeling */}
              <div className="absolute right-0 top-0 bottom-0 w-2.5 bg-slate-900/10 rounded-r-2xl print:bg-slate-800/10" />

              {/* Upper Banner / Header */}
              <div className="flex justify-between items-start border-b-2 border-slate-900 pb-5">
                <div className="space-y-1 text-right" dir="rtl">
                  <h3 className="text-lg md:text-xl font-black text-slate-900 tracking-tight">{settings?.invoiceHeaderAr || "شركة تجارية للتوريد العام"}</h3>
                  <p className="text-[10px] md:text-xs text-slate-600 font-bold whitespace-nowrap">{settings?.invoiceDeclarationAr || "المركز المالي للإنتاج والتسويق والدعم اللوجستي"}</p>
                  <p className="text-[9px] text-slate-500 font-mono font-bold">معتمد وموثق محاسبياً بشكل عام</p>
                </div>
                
                <div className="text-left font-mono text-[9px] md:text-[10px] space-y-1 font-extrabold text-slate-800 bg-slate-100 p-2.5 rounded-lg border border-slate-300">
                  <div>التاريخ: {selectedSlip.date}</div>
                  <div>المستند: {selectedSlip.refNumber}</div>
                  <div>الصندوق: {selectedSlip.source === 'treasury' ? 'صندوق الخزينة نقداً' : 'الحساب البنكي (بنكك)'}</div>
                </div>
              </div>

              {/* Sub Title of movement */}
              <div className="text-center my-4">
                <span className="border-2 border-slate-900 px-6 py-2 text-sm md:text-base font-black text-slate-900 rounded-lg tracking-wide uppercase bg-slate-50 select-text">
                  {selectedSlip.type === 'deposit' 
                    ? "سند إيداع مالي واسترجاع سيولة" 
                    : selectedSlip.type === 'withdrawal' 
                    ? "سند سحب مالي وتصفية عهدة" 
                    : "سند تحويل مالي داخلي معتمد"}
                </span>
              </div>

              {/* Voucher Main Metadata Body table */}
              <div className="space-y-5 text-xs md:text-sm font-bold leading-loose select-text">
                
                <div className="flex items-center gap-2 border-b border-dashed border-slate-300 pb-1.5">
                  <span className="text-slate-500 whitespace-nowrap">مبلغ وقدره المقبوض/المدفوع:</span>
                  <span className="font-mono text-base md:text-lg font-black text-slate-950 underline decoration-double">
                    {selectedSlip.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} SDG
                  </span>
                </div>

                <div className="flex items-center gap-2 border-b border-dashed border-slate-300 pb-1.5">
                  <span className="text-slate-500 whitespace-nowrap">المبلغ كتابة وتفقيطاً:</span>
                  <span className="text-slate-900 underline font-black">
                    {tafqeetSudanese(selectedSlip.amount)}
                  </span>
                </div>

                <div className="flex items-start gap-2 border-b border-dashed border-slate-300 pb-1.5">
                  <span className="text-slate-500 whitespace-nowrap">البيان والتفصيل المحاسبي:</span>
                  <span className="text-slate-900 font-black">
                    {selectedSlip.description}
                  </span>
                </div>

                <div className="flex items-center gap-2 border-b border-dashed border-slate-300 pb-1.5">
                  <span className="text-slate-500 whitespace-nowrap">تفاصيل الصناديق المتأثرة:</span>
                  <span className="text-slate-900 font-extrabold flex items-center gap-1.5">
                    <span>نقلاً من:</span>
                    <span className="bg-slate-100 px-2 py-0.5 rounded text-xs">
                      {selectedSlip.source === 'treasury' ? "💵 صندوق الخزينة الميدانية" : "🏦 الحساب البنكي (بنكك)"}
                    </span>
                    {selectedSlip.type === 'transfer' && (
                      <>
                        <span>إلى وجهة:</span>
                        <span className="bg-indigo-100 text-indigo-900 px-2 py-0.5 rounded text-xs ">
                          {selectedSlip.destination === 'bank' ? "🏦 الحساب البنكي (بنكك)" : "💵 صندوق الخزينة"}
                        </span>
                      </>
                    )}
                  </span>
                </div>

              </div>

              {/* Footer Stamp & Signatures section */}
              <div className="grid grid-cols-3 gap-6 pt-12 text-center text-[10px] md:text-xs">
                
                <div className="space-y-8 font-black">
                  <span className="block text-slate-500">معد السند والتسجيل</span>
                  <span className="block border-b border-slate-400 w-28 mx-auto mt-4" />
                  <span className="block text-[10px] text-slate-400">توقيع المحاسب المالي</span>
                </div>

                <div className="space-y-8 font-black">
                  <span className="block text-slate-500">الفرع المعتمد والتدقيق</span>
                  <span className="block border-b border-slate-400 w-28 mx-auto mt-4" />
                  <span className="block text-[10px] text-slate-400">توقيع المراجع الميداني</span>
                </div>

                {/* Approved official stamp container */}
                <div className="relative flex flex-col items-center justify-center border-2 border-dashed border-red-400/30 rounded-xl p-2 bg-red-50/20">
                  <div className="font-extrabold text-[10px] text-red-650 text-red-655 text-red-600 border-2 border-red-600 rounded px-2.5 py-1 rotate-3 select-none">
                    {settings?.invoiceHeaderAr || "المنظومة المحاسبية"}
                    <div className="text-[8px] font-sans font-black">معتمد - APPROVED</div>
                    <div className="text-[7px] font-bold">المكتب المالي الرئيسي الموحد</div>
                  </div>
                </div>

              </div>

            </div>
          </div>

        </div>
      )}

    </div>
  );
}
