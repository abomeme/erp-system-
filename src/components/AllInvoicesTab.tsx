/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  Search, 
  Printer, 
  Eye, 
  Calendar, 
  TrendingUp, 
  ArrowDownLeft, 
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  CheckCircle,
  Clock,
  Trash2,
  Pencil
} from 'lucide-react';
import { Contact, LedgerEntry, Product } from '../types';
import { tafqit } from '../utils';

interface AllInvoicesTabProps {
  contacts: Contact[];
  ledgers: Record<string, LedgerEntry[]>;
  products: Product[];
  triggerToast: (msg: string, typ?: 'success' | 'err') => void;
  onViewInvoice: (entry: LedgerEntry, contact: Contact) => void;
  onDeleteInvoice?: (entryId: string, contactId: string) => void;
  onEditInvoice?: (entry: LedgerEntry, contact: Contact) => void;
}

interface FlattenedInvoice {
  contact: Contact;
  entry: LedgerEntry;
  remain: number;
}

export default function AllInvoicesTab({
  contacts,
  ledgers,
  products,
  triggerToast,
  onViewInvoice,
  onDeleteInvoice,
  onEditInvoice
}: AllInvoicesTabProps) {
  // Search and filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'purchase' | 'sales'>('all');
  const [contactFilter, setContactFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  // Local expand state for items
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(null);

  // Compile all invoices from across all ledgers
  const allInvoices: FlattenedInvoice[] = useMemo(() => {
    const list: FlattenedInvoice[] = [];

    Object.keys(ledgers).forEach(contactId => {
      const contactObj = contacts.find(c => c.id === contactId);
      if (!contactObj) return;

      const entries = ledgers[contactId] || [];
      entries.forEach(entry => {
        if (entry.type === 'invoice') {
          list.push({
            contact: contactObj,
            entry,
            remain: Math.max(0, entry.total - entry.paid)
          });
        }
      });
    });

    // Sort by date descending, then invoice number
    return list.sort((a, b) => new Date(b.entry.date).getTime() - new Date(a.entry.date).getTime());
  }, [ledgers, contacts]);

  // Unique list of contacts who have invoices (for the filter dropdown)
  const contactsWithInvoices = useMemo(() => {
    const ids = new Set<string>();
    const res: Contact[] = [];
    allInvoices.forEach(inv => {
      if (!ids.has(inv.contact.id)) {
        ids.add(inv.contact.id);
        res.push(inv.contact);
      }
    });
    return res;
  }, [allInvoices]);

  // Compute stats of invoices
  const invoicesStats = useMemo(() => {
    let totalValue = 0;
    let totalPaid = 0;
    let purchaseTotal = 0;
    let salesTotal = 0;

    allInvoices.forEach(inv => {
      totalValue += inv.entry.total;
      totalPaid += inv.entry.paid;
      if (inv.contact.type === 'supplier') {
        purchaseTotal += inv.entry.total;
      } else if (inv.contact.type === 'customer') {
        salesTotal += inv.entry.total;
      }
    });

    return {
      totalValue,
      totalPaid,
      totalOutstanding: totalValue - totalPaid,
      purchaseTotal,
      salesTotal,
      count: allInvoices.length
    };
  }, [allInvoices]);

  // Apply filters on invoices list
  const filteredInvoices = useMemo(() => {
    return allInvoices.filter(inv => {
      // 1. Query Term Search
      const term = searchQuery.toLowerCase();
      const matchesSearch = 
        inv.entry.number.toLowerCase().includes(term) ||
        inv.contact.name.toLowerCase().includes(term) ||
        (inv.entry.description && inv.entry.description.toLowerCase().includes(term));

      // 2. Invoice Type Filter
      let matchesType = true;
      if (typeFilter === 'purchase') {
        matchesType = inv.contact.type === 'supplier';
      } else if (typeFilter === 'sales') {
        matchesType = inv.contact.type === 'customer';
      }

      // 3. Contact Filter
      const matchesContact = contactFilter === 'all' || inv.contact.id === contactFilter;

      // 4. Date Range Filters
      let matchesDate = true;
      if (dateFrom) {
        matchesDate = matchesDate && new Date(inv.entry.date) >= new Date(dateFrom);
      }
      if (dateTo) {
        matchesDate = matchesDate && new Date(inv.entry.date) <= new Date(dateTo);
      }

      return matchesSearch && matchesType && matchesContact && matchesDate;
    });
  }, [allInvoices, searchQuery, typeFilter, contactFilter, dateFrom, dateTo]);

  const toggleExpandInvoice = (id: string) => {
    if (expandedInvoiceId === id) {
      setExpandedInvoiceId(null);
    } else {
      setExpandedInvoiceId(id);
    }
  };

  const handlePrintAllDetailed = () => {
    if (filteredInvoices.length === 0) {
      triggerToast("لا توجد فواتير مطابقة للطباعة حالياً", "err");
      return;
    }
    triggerToast("تم تحضير صفحة فواتير المبيعات والمخازن التفصيلية للطباعة المباشرة");
    setTimeout(() => {
      window.print();
    }, 150);
  };

  return (
    <div className="space-y-6" dir="rtl">
      
      {/* 1. Header with direct click printing trigger */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm select-none no-print">
        <div>
          <span className="bg-blue-600 text-white font-extrabold text-[10px] px-2 py-0.5 rounded uppercase tracking-wide">التقارير التفصيلية المجمعة</span>
          <h2 className="text-lg font-black mt-1 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-400" />
            <span>سجل الفواتير والأصناف والطباعة الحسابية الميدانية</span>
          </h2>
          <p className="text-xs text-slate-350 mt-1">تتبع كافة فواتير الشراء والبيع وعرض الأصناف المباعة، مع زر لطباعة الفواتير دفعة واحدة</p>
        </div>

        <button
          onClick={handlePrintAllDetailed}
          className="bg-emerald-600 hover:bg-emerald-550 text-white font-black px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 cursor-pointer shadow-md shadow-emerald-950/20 active:scale-95 transition-transform shrink-0"
        >
          <Printer className="w-4 h-4 text-emerald-100" />
          <span>طباعة الفواتير المصفّاة بالتفصيل ({filteredInvoices.length} فاتورة)</span>
        </button>
      </div>

      {/* 2. Bento Stats cards of overall invoices */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 select-none no-print">
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
          <div className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-blue-500" />
            <span>العدد الكلي للفواتير الصادرة</span>
          </div>
          <div className="text-base md:text-lg font-mono font-black text-blue-900 mt-1">
            {invoicesStats.count} <span className="text-[10px] font-sans font-bold text-slate-400">فاتورة</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
          <div className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5 text-blue-600" />
            <span>إجمالي فواتير الوارد (مشتريات الفاكهة)</span>
          </div>
          <div className="text-base md:text-lg font-mono font-black text-slate-950 mt-1">
            {invoicesStats.purchaseTotal.toLocaleString('en-US', { maximumFractionDigits: 0 })} <span className="text-[10px] font-sans font-bold text-slate-400">ج.س</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
          <div className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
            <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />
            <span>إجمالي فواتير الصادر (المبيعات)</span>
          </div>
          <div className="text-base md:text-lg font-mono font-black text-emerald-700 mt-1">
            {invoicesStats.salesTotal.toLocaleString('en-US', { maximumFractionDigits: 0 })} <span className="text-[10px] font-sans font-bold text-slate-400">ج.س</span>
          </div>
        </div>

        <div className="bg-rose-50/10 border border-rose-150 rounded-xl p-3.5 shadow-xs">
          <div className="text-[10px] font-black text-rose-900 flex items-center gap-1">
            <SlidersHorizontal className="w-3.5 h-3.5 text-rose-600" />
            <span>مجموع ذمم الفواتير المتبقية غير المسواة</span>
          </div>
          <div className="text-base md:text-lg font-mono font-black text-rose-600 mt-1">
            {invoicesStats.totalOutstanding.toLocaleString('en-US', { maximumFractionDigits: 0 })} <span className="text-[10px] font-sans font-bold text-rose-400 text-rose-400/80">ج.س</span>
          </div>
        </div>
      </div>

      {/* 3. Search and Filters Pane */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4.5 space-y-4 no-print shadow-xs">
        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-extrabold select-none">
          <SlidersHorizontal className="w-4 h-4 text-slate-400" />
          <span>مرشحات وخيارات البحث والفرز المحاسبي للفواتير</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5">
          {/* Text Search */}
          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-slate-400">البحث المطابق بالفهرس</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="رقم الفاتورة، تدوين، ملاحظة..."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg pr-7 pl-2.5 py-1.5 text-xs font-bold outline-none focus:bg-white focus:border-slate-400"
              />
            </div>
          </div>

          {/* Type Filter */}
          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-slate-400">تصنيف المستند</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 py-1.5 text-xs font-extrabold focus:bg-white outline-none"
            >
              <option value="all">كافة أنواع الفواتير</option>
              <option value="purchase">واردات المشتريات (موردين)</option>
              <option value="sales">صادرات المبيعات (عملاء)</option>
            </select>
          </div>

          {/* Contact Filter */}
          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-slate-400">الطرف الشريك المعني بالفاتورة</label>
            <select
              value={contactFilter}
              onChange={(e) => setContactFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 py-1.5 text-xs font-extrabold focus:bg-white outline-none"
            >
              <option value="all">كل الحسابات المالية بالتساوي</option>
              {contactsWithInvoices.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.type === 'supplier' ? 'مورد' : 'عميل'})
                </option>
              ))}
            </select>
          </div>

          {/* Date Range - From */}
          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-slate-400">تاريخ البداية</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 py-1.5 text-xs font-bold focus:bg-white outline-none"
            />
          </div>

          {/* Date Range - To */}
          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-slate-400">تاريخ النهاية</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 py-1.5 text-xs font-bold focus:bg-white outline-none"
            />
          </div>
        </div>
      </div>

      {/* 4. Scrollable screen list view of filtered invoices */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs no-print">
        <div className="overflow-x-auto">
          <table className="w-full text-xs md:text-sm text-right border-collapse">
            <thead>
              <tr className="bg-slate-150 text-slate-700 font-extrabold border-b border-slate-300 text-[10px] md:text-xs select-none">
                <th className="p-3 text-center w-[40px]">الرقم</th>
                <th className="p-3 text-center w-[100px]">تاريخ التسجيل</th>
                <th className="p-3 text-center w-[120px]">الرقم المرجعي</th>
                <th className="p-3">الطرف الشريك المالي</th>
                <th className="p-3 text-center w-[100px]">النوع</th>
                <th className="p-3 text-center w-[90px]">الأصناف</th>
                <th className="p-3 text-center w-[110px]">القيمة الكلية</th>
                <th className="p-3 text-center w-[110px]">المسدد منها</th>
                <th className="p-3 text-center w-[110px]">المتبقي معلق</th>
                <th className="p-3 text-center w-[100px]">عمليات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150 font-bold">
              {filteredInvoices.length > 0 ? (
                filteredInvoices.map((inv, index) => {
                  const isExpanded = expandedInvoiceId === inv.entry.id;
                  const itemLength = inv.entry.items ? inv.entry.items.length : 0;
                  return (
                    <React.Fragment key={inv.entry.id}>
                      <tr className={`hover:bg-slate-50/50 text-[11px] md:text-xs transition-colors ${isExpanded ? 'bg-blue-50/20' : ''}`}>
                        <td className="p-3 text-center text-slate-400 font-mono">{index + 1}</td>
                        <td className="p-3 text-center text-slate-500 font-mono">{inv.entry.date}</td>
                        <td className="p-3 text-center font-mono">
                          <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-black border border-slate-200">
                            {inv.entry.number}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="font-extrabold text-slate-900">{inv.contact.name}</div>
                          <div className="text-[9px] text-slate-400 font-mono mt-0.5">رمز الدفاتر: {inv.contact.code}</div>
                        </td>
                        <td className="p-3 text-center">
                          {inv.contact.type === 'supplier' ? (
                            <span className="bg-blue-550 bg-blue-50 text-blue-900 px-2 py-0.5 rounded-full text-[9px] font-black border border-blue-100">ف. شراء وارد</span>
                          ) : (
                            <span className="bg-emerald-50 text-emerald-900 px-2 py-0.5 rounded-full text-[9px] font-black border border-emerald-100">ف. بيع صادر</span>
                          )}
                        </td>
                        <td className="p-3 text-center font-mono">
                          <button
                            onClick={() => toggleExpandInvoice(inv.entry.id)}
                            className="bg-slate-50 hover:bg-slate-100 px-2 py-0.5 rounded font-black text-rose-700 text-[10px] border border-slate-150 inline-flex items-center gap-1 cursor-pointer transition-all"
                          >
                            <span>{itemLength} أصناف</span>
                            {isExpanded ? <ChevronUp className="w-3 h-3 text-rose-500" /> : <ChevronDown className="w-3 h-3 text-rose-500" />}
                          </button>
                        </td>
                        <td className="p-3 text-center font-mono text-slate-900 text-xs md:text-sm">
                          {inv.entry.total.toLocaleString('en-US', { minimumFractionDigits: 1 })}
                        </td>
                        <td className="p-3 text-center font-mono text-emerald-700 text-xs md:text-sm">
                          {inv.entry.paid.toLocaleString('en-US', { minimumFractionDigits: 1 })}
                        </td>
                        <td className={`p-3 text-center font-mono text-xs md:text-sm ${inv.remain > 0 ? 'text-red-650' : 'text-slate-400'}`}>
                          {inv.remain.toLocaleString('en-US', { minimumFractionDigits: 1 })}
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => onViewInvoice(inv.entry, inv.contact)}
                              className="text-slate-550 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 p-1 px-2 border border-slate-200 rounded font-black text-[10px] inline-flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>معاينة</span>
                            </button>
                            {onEditInvoice && (
                              <button
                                onClick={() => onEditInvoice(inv.entry, inv.contact)}
                                className="text-amber-650 hover:text-white hover:bg-amber-600 bg-amber-50 hover:border-amber-600 p-1 px-2 border border-amber-200 rounded font-black text-[10px] inline-flex items-center gap-1 cursor-pointer transition-colors"
                                title="تعديل الفاتورة"
                              >
                                <Pencil className="w-3.5 h-3.5 text-amber-550 hover:text-white" />
                                <span>تعديل</span>
                              </button>
                            )}
                            {onDeleteInvoice && (
                              <button
                                onClick={() => onDeleteInvoice(inv.entry.id, inv.contact.id)}
                                className="text-red-650 hover:text-white hover:bg-red-600 bg-red-50 hover:border-red-600 p-1 px-2 border border-red-200 rounded font-black text-[10px] inline-flex items-center gap-1 cursor-pointer transition-colors"
                                title="حذف الفاتورة"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-red-500 hover:text-white" />
                                <span>حذف</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Expandable itemized row */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={10} className="bg-slate-50/50 p-4 border-t border-b border-slate-150">
                            <div className="max-w-4xl mx-auto rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
                              <div className="bg-slate-900 text-white p-2.5 px-4 text-xs font-bold select-none">
                                تفاصيل البنود والكميات الموردة والمصروفة للفاتورة: <span className="font-mono text-amber-300 font-black">{inv.entry.number}</span>
                              </div>
                              <table className="w-full text-xs text-right border-collapse">
                                <thead>
                                  <tr className="bg-slate-100 text-slate-600 font-extrabold border-b border-slate-200 text-[10px] md:text-xs">
                                    <th className="p-2 text-center w-[40px]">الرقم</th>
                                    <th className="p-2">الصنف والمنشأ</th>
                                    <th className="p-2 text-center">التصنيف</th>
                                    <th className="p-2 text-center">الدرجة</th>
                                    <th className="p-2 text-center">الوحدة</th>
                                    <th className="p-2 text-center">الكمية</th>
                                    <th className="p-2 text-center">سعر الوحدة</th>
                                    <th className="p-2 text-center">القيمة الإجمالية</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                                  {inv.entry.items && inv.entry.items.length > 0 ? (
                                    inv.entry.items.map((itm, idx) => (
                                      <tr key={itm.id} className="hover:bg-slate-50/30">
                                        <td className="p-2 text-center font-mono text-slate-400">{idx + 1}</td>
                                        <td className="p-2 font-bold text-slate-900">{itm.productName} ({itm.regionName})</td>
                                        <td className="p-2 text-center">{itm.typeName}</td>
                                        <td className="p-2 text-center">{itm.gradeName}</td>
                                        <td className="p-2 text-center font-bold">{itm.unitName}</td>
                                        <td className="p-2 text-center font-mono text-slate-900 font-black">{itm.qty}</td>
                                        <td className="p-2 text-center font-mono">{itm.price.toLocaleString('en-US')} ج.س</td>
                                        <td className="p-2 text-center font-mono font-black text-slate-900">{itm.total.toLocaleString('en-US')} ج.س</td>
                                      </tr>
                                    ))
                                  ) : (
                                    <tr>
                                      <td className="p-2 text-center font-mono text-slate-400">1</td>
                                      <td className="p-2 font-bold text-slate-900">{inv.entry.description}</td>
                                      <td className="p-2 text-center">عام</td>
                                      <td className="p-2 text-center">عام</td>
                                      <td className="p-2 text-center">دفعة ميعاد</td>
                                      <td className="p-2 text-center font-mono">1</td>
                                      <td className="p-2 text-center font-mono">{inv.entry.total.toLocaleString('en-US')} ج.س</td>
                                      <td className="p-2 text-center font-mono font-black text-slate-900">{inv.entry.total.toLocaleString('en-US')} ج.س</td>
                                    </tr>
                                  )}
                                </tbody>
                                {inv.entry.discount && inv.entry.discount > 0 ? (
                                  <tfoot className="bg-slate-50 border-t border-slate-200 text-[10px] md:text-xs">
                                    <tr className="text-slate-600">
                                      <td colSpan={7} className="p-2.5 text-left font-bold border-l border-slate-200">إجمالي قيمة السلع قبل الخصم:</td>
                                      <td className="p-2.5 text-center font-mono font-black text-slate-800">
                                        {(inv.entry.items && inv.entry.items.length > 0 
                                          ? inv.entry.items.reduce((sum, itm) => sum + itm.total, 0)
                                          : (inv.entry.total + (inv.entry.discount || 0))
                                        ).toLocaleString('en-US')} ج.س
                                      </td>
                                    </tr>
                                    <tr className="text-rose-600 bg-rose-50/20">
                                      <td colSpan={7} className="p-2.5 text-left font-bold border-l border-slate-200">الخصم الممنوح من إجمالي الفاتورة:</td>
                                      <td className="p-2.5 text-center font-mono font-black text-rose-700">
                                        -{inv.entry.discount.toLocaleString('en-US')} ج.س
                                      </td>
                                    </tr>
                                    <tr className="text-[#0f172a] bg-slate-100 font-extrabold text-xs">
                                      <td colSpan={7} className="p-2.5 text-left border-l border-slate-200">صافي القيمة المستحقة النهائية:</td>
                                      <td className="p-2.5 text-center font-mono font-black text-rose-600">
                                        {inv.entry.total.toLocaleString('en-US')} ج.س
                                      </td>
                                    </tr>
                                  </tfoot>
                                ) : null}
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={10} className="py-20 text-center text-slate-400 font-bold">
                    لا توجد فواتير أصناف مسجلة في النظام تطابق شروط التصفية الحالية.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. DUST / HIDDEN BULK PRINTABLE LAYOUT DESIGNED FOR A4 PRINTERS SPACING */}
      {/* This renders only when the printer is loaded ("print:block hidden") */}
      <div className="hidden print:block space-y-16 p-0 m-0 bg-white text-slate-900" dir="rtl">
        {filteredInvoices.map((inv, idx) => {
          const words = tafqit(inv.entry.total);
          return (
            <div 
              key={inv.entry.id} 
              className="page-break print:break-after-page break-after-page text-xs md:text-sm bg-white p-4"
              style={{ pageBreakAfter: 'always', breakAfter: 'page' }}
            >
              {/* Header Box */}
              <div className="pb-4 border-b-2 border-slate-900 flex justify-between items-center bg-white">
                <div className="text-right bg-white">
                  <h3 className="text-sm font-black text-slate-900">أولاد داؤود للفواكه</h3>
                  <p className="text-[9px] text-slate-500 font-bold leading-normal mt-0.5">
                    استيراد وتصدير وتجارة جميع أنواع الفواكه والخضروات الفاخرة ومخازن للتبريد<br />
                    أصل إلكتروني معتمد بالدفاتر العامة | هاتف: +249 90 000 0000
                  </p>
                </div>
                <div className="text-left flex flex-col items-end shrink-0 select-none">
                  <span className="text-[8px] bg-slate-900 text-amber-400 font-black px-1.5 py-0.5 rounded mt-1 font-mono">
                    فاتورة معتمدة APPROVED
                  </span>
                </div>
              </div>

              {/* Title Area */}
              <div className="py-4 text-center">
                <span className="text-sm font-black border-b-2 border-slate-900 pb-0.5 px-3 inline-block">
                  {inv.contact.type === 'supplier' ? "فـاتـورة مـشـتـريـات الـمـخـزن الـواردة" : "فـاتـورة مـبـيـعـات الـعـمـلاء الـصـادورة"}
                </span>
                <p className="text-[9px] font-bold text-slate-400 mt-1 font-mono">
                  رقم المرجع: {inv.entry.number} | التاريخ: {inv.entry.date} | فاتورة رقم {idx + 1} من أصل {filteredInvoices.length} فواتير
                </p>
              </div>

              {/* Client meta detail */}
              <div className="bg-slate-50 border border-slate-200 rounded p-2 text-[10px] grid grid-cols-2 gap-2 mb-4">
                <div>
                  <h4 className="font-extrabold text-[#0f172a] mb-0.5">بيانات الطرف المالي:</h4>
                  <p className="font-bold text-slate-800 text-xs">
                    {inv.contact.name}
                  </p>
                  <p className="text-[9px] text-slate-500 mt-0.5 font-mono">
                    كود الحساب: {inv.contact.code} {inv.contact.phone ? ` | الهاتف: ${inv.contact.phone}` : ''}
                  </p>
                </div>
                <div className="text-left flex flex-col justify-end">
                  <p className="text-[9px] text-slate-500">
                    حالة القيد الدفتري: <strong className="text-emerald-700 font-bold">{inv.entry.total === inv.entry.paid ? "مسدد بالكامل" : "متبقي رصيد معلق"}</strong>
                  </p>
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full text-[10px] text-right border-collapse border border-slate-200">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 font-black border-b border-slate-300">
                    <th className="p-1.5 text-center border-l border-slate-200 w-[30px]">م</th>
                    <th className="p-1.5 border-l border-slate-200">الأصناف والمنشأ</th>
                    <th className="p-1.5 text-center border-l border-slate-200 w-[60px]">الدرجة</th>
                    <th className="p-1.5 text-center border-l border-slate-200 w-[60px]">التصنيف</th>
                    <th className="p-1.5 text-center border-l border-slate-200 w-[50px]">الوحدة</th>
                    <th className="p-1.5 text-center border-l border-slate-200 w-[50px]">الكمية</th>
                    <th className="p-1.5 text-center border-l border-slate-200 w-[80px]">السعر</th>
                    <th className="p-1.5 text-center w-[80px]">الإجمالي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {inv.entry.items && inv.entry.items.length > 0 ? (
                    inv.entry.items.map((itm, idx) => (
                      <tr key={itm.id} className="hover:bg-slate-50">
                        <td className="p-1.5 text-center font-bold text-slate-400 font-mono border-l border-slate-200">{idx + 1}</td>
                        <td className="p-1.5 font-bold text-slate-800 border-l border-slate-200">{itm.productName} ({itm.regionName})</td>
                        <td className="p-1.5 text-center text-slate-650 border-l border-slate-200">{itm.gradeName}</td>
                        <td className="p-1.5 text-center text-slate-650 border-l border-slate-200">{itm.typeName}</td>
                        <td className="p-1.5 text-center text-slate-900 border-l border-slate-200">{itm.unitName}</td>
                        <td className="p-1.5 text-center font-bold font-mono border-l border-slate-200">{itm.qty}</td>
                        <td className="p-1.5 text-center font-mono border-l border-slate-200">{itm.price.toLocaleString('en-US')} SDG</td>
                        <td className="p-1.5 text-center font-bold font-mono text-slate-900">{itm.total.toLocaleString('en-US')} SDG</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="p-1.5 text-center font-bold text-slate-400 font-mono border-l border-slate-200">1</td>
                      <td className="p-1.5 font-bold text-slate-800 border-l border-slate-200">{inv.entry.description}</td>
                      <td className="p-1.5 text-center border-l border-slate-200">عام</td>
                      <td className="p-1.5 text-center border-l border-slate-200">عام</td>
                      <td className="p-1.5 text-center border-l border-slate-200">دفعة</td>
                      <td className="p-1.5 text-center font-bold border-l border-slate-200">1</td>
                      <td className="p-1.5 text-center font-mono border-l border-slate-200">{inv.entry.total.toLocaleString('en-US')} SDG</td>
                      <td className="p-1.5 text-center font-black font-mono text-slate-900">{inv.entry.total.toLocaleString('en-US')} SDG</td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Total Summary Footer */}
              <div className="flex justify-between items-start pt-3 border-t border-slate-300 mt-2 gap-4">
                <div className="text-[8px] text-slate-400 max-w-sm">
                  تفقيط مالي آمن: <strong className="text-slate-850 underline block">{words}</strong>
                </div>
                <div className="w-56 text-[9px] space-y-0.5 font-bold text-slate-700">
                  <div className="flex justify-between">
                    <span>{inv.entry.discount ? "الإجمالي قبل الخصم:" : "مجموع الأصناف:"}</span>
                    <span className="font-mono text-slate-900">
                      {(inv.entry.items && inv.entry.items.length > 0 
                        ? inv.entry.items.reduce((sum, item) => sum + item.total, 0)
                        : (inv.entry.total + (inv.entry.discount || 0))
                      ).toLocaleString()} SDG
                    </span>
                  </div>
                  {inv.entry.discount ? (
                    <div className="flex justify-between text-rose-600 font-bold">
                      <span>الخصم الممنوح:</span>
                      <span className="font-mono">-{inv.entry.discount.toLocaleString()} SDG</span>
                    </div>
                  ) : null}
                  <div className="flex justify-between text-emerald-800">
                    <span>المسدد الفعلي:</span>
                    <span className="font-mono">-{inv.entry.paid.toLocaleString()} SDG</span>
                  </div>
                  <div className="flex justify-between text-rose-650 border-t border-slate-400 pt-0.5 font-black">
                    <span>صافي المتبقي المدرج بالذمة:</span>
                    <span className="font-mono">{(inv.entry.total - inv.entry.paid).toLocaleString()} SDG</span>
                  </div>
                </div>
              </div>

              {/* Removed signatures as requested */}
              <div className="mt-4"></div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
