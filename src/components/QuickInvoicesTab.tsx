import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  Plus, 
  ShoppingCart, 
  TrendingUp, 
  Users, 
  ArrowLeftRight, 
  Printer, 
  Search,
  Eye,
  CheckCircle2,
  Lock
} from 'lucide-react';
import { Contact, LedgerEntry, Product } from '../types';

interface QuickInvoicesTabProps {
  contacts: Contact[];
  ledgers: Record<string, LedgerEntry[]>;
  products: Product[];
  triggerToast: (msg: string, typ?: 'success' | 'err') => void;
  currencySymbol?: string;
  onOpenInvoiceModal: (contactId: string, invoiceType: 'supplier' | 'customer', initialDate?: string) => void;
  onViewInvoice: (entry: LedgerEntry, contact: Contact) => void;
}

export default function QuickInvoicesTab({
  contacts,
  ledgers,
  products,
  triggerToast,
  currencySymbol = 'ج.س',
  onOpenInvoiceModal,
  onViewInvoice
}: QuickInvoicesTabProps) {
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [salesInvoiceDate, setSalesInvoiceDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [purchaseInvoiceDate, setPurchaseInvoiceDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Extract suppliers and customers lists
  const suppliers = useMemo(() => contacts.filter(c => c.type === 'supplier'), [contacts]);
  const customers = useMemo(() => contacts.filter(c => c.type === 'customer'), [contacts]);

  // Combine all invoices for recent invoices table
  const allInvoices = useMemo(() => {
    const list: { entry: LedgerEntry; contact: Contact }[] = [];
    Object.entries(ledgers).forEach(([contactId, entries]) => {
      const contact = contacts.find(c => c.id === contactId);
      if (!contact) return;
      entries.forEach(entry => {
        if (entry.type === 'invoice') {
          list.push({ entry, contact });
        }
      });
    });
    // Sort buy date descending
    return list.sort((a, b) => b.entry.date.localeCompare(a.entry.date));
  }, [ledgers, contacts]);

  // Filtered invoices supporting search term and custom date ranges
  const filteredInvoices = useMemo(() => {
    let list = allInvoices;

    if (filterStartDate) {
      list = list.filter(item => item.entry.date >= filterStartDate);
    }
    if (filterEndDate) {
      list = list.filter(item => item.entry.date <= filterEndDate);
    }

    if (!searchTerm.trim()) return list.slice(0, 30);
    const term = searchTerm.toLowerCase();
    return list.filter(item => 
      item.contact.name.toLowerCase().includes(term) ||
      item.entry.number.toLowerCase().includes(term) ||
      item.entry.date.includes(term)
    ).slice(0, 50);
  }, [allInvoices, searchTerm, filterStartDate, filterEndDate]);

  const handleCreateSalesInvoice = () => {
    if (!selectedCustomerId) {
      triggerToast('⚠️ يرجى اختيار العميل المستهدف أولاً من القائمة', 'err');
      return;
    }
    onOpenInvoiceModal(selectedCustomerId, 'customer', salesInvoiceDate);
  };

  const handleCreatePurchaseInvoice = () => {
    if (!selectedSupplierId) {
      triggerToast('⚠️ يرجى اختيار المورد المستهدف أولاً من القائمة', 'err');
      return;
    }
    onOpenInvoiceModal(selectedSupplierId, 'supplier', purchaseInvoiceDate);
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 mt-6 mb-12" dir="rtl" id="quick_invoices_tab">
      
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 text-white rounded-2xl p-5 md:p-6 shadow-xl border border-slate-800 relative overflow-hidden mb-6">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="p-1.5 bg-blue-500/20 text-blue-400 rounded-lg">
                <FileText className="w-5 h-5" />
              </span>
              <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">
                بوابة الفواتير السريعة وعمليات المحاسب
              </h2>
            </div>
            <p className="text-slate-300 text-xs md:text-sm font-semibold">
              الشاشة الفورية للمحاسب لإصدار فواتير الشراء والبيع المباشرة ومراجعة الحركة اليومية للواردات والصادرات دون عناء الانتقال.
            </p>
          </div>
          <div className="text-left font-mono text-slate-400 text-xs">
            <span>تاريخ اليوم: {new Date().toLocaleDateString('ar-SD', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>
        </div>
      </div>

      {/* Grid of Creators */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        
        {/* Sales Invoice (Customers) */}
        <div className="bg-white border-2 border-emerald-100 rounded-2xl p-5 md:p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="absolute top-0 left-0 bg-emerald-50 text-emerald-600 px-4 py-1.5 rounded-bl-xl font-black text-[10px] tracking-wider uppercase select-none">
            إيردات وصادرة / عملاء
          </div>
          
          <div className="flex items-center gap-2.5 mb-4">
            <span className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl">
              <ShoppingCart className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base font-black text-slate-900">إصدار فاتورة مبيعات جديدة</h3>
              <p className="text-[11px] text-slate-400 font-semibold mt-0.5">بيع وتسليم بضاعة فاكهة لعميل خصماً من مخزون الأصناف</p>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-black text-slate-700 mb-1.5">اختر العميل المشتري *</label>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full text-xs font-black p-3 bg-slate-50 border border-slate-250 rounded-xl focus:outline-none focus:border-emerald-500 focus:bg-white text-slate-850"
              >
                <option value="">-- اختر من قائمة العملاء المسجلين --</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code}) {c.phone ? ` - ${c.phone}` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Date input placed after Customer selector */}
            <div>
              <label className="block text-xs font-black text-slate-700 mb-1.5">تاريخ الفاتورة الجديدة *</label>
              <input
                type="date"
                required
                value={salesInvoiceDate}
                onChange={(e) => setSalesInvoiceDate(e.target.value)}
                className="w-full text-xs font-bold p-3 bg-slate-50 border border-slate-250 rounded-xl focus:outline-none focus:border-emerald-500 focus:bg-white text-slate-850 font-mono"
              />
            </div>

            <button
              onClick={handleCreateSalesInvoice}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs py-3 rounded-xl shadow-lg shadow-emerald-600/10 cursor-pointer active:scale-95 transition-all flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>إنشاء فاتورة مبيعات جديدة 🟢</span>
            </button>
          </div>
        </div>

        {/* Purchase Invoice (Suppliers) */}
        <div className="bg-white border-2 border-blue-100 rounded-2xl p-5 md:p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="absolute top-0 left-0 bg-blue-50 text-blue-600 px-4 py-1.5 rounded-bl-xl font-black text-[10px] tracking-wider uppercase select-none">
            مشتريات وواردة / موردين
          </div>

          <div className="flex items-center gap-2.5 mb-4">
            <span className="p-2.5 bg-blue-100 text-blue-700 rounded-xl">
              <TrendingUp className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base font-black text-slate-900">إصدار فاتورة مشتريات جديدة</h3>
              <p className="text-[11px] text-slate-400 font-semibold mt-0.5">استلام توريدات فاكهة مع حساب مصروف الترحيل والوزن لتوليد التكلفة</p>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-black text-slate-700 mb-1.5">اختر المورد الشاحن *</label>
              <select
                value={selectedSupplierId}
                onChange={(e) => setSelectedSupplierId(e.target.value)}
                className="w-full text-xs font-black p-3 bg-slate-50 border border-slate-250 rounded-xl focus:outline-none focus:border-blue-500 focus:bg-white text-slate-850"
              >
                <option value="">-- اختر من قائمة الموردين المسجلين --</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code}) {s.phone ? ` - ${s.phone}` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Date input placed after Supplier selection */}
            <div>
              <label className="block text-xs font-black text-slate-700 mb-1.5">تاريخ الفاتورة الجديدة *</label>
              <input
                type="date"
                required
                value={purchaseInvoiceDate}
                onChange={(e) => setPurchaseInvoiceDate(e.target.value)}
                className="w-full text-xs font-bold p-3 bg-slate-50 border border-slate-250 rounded-xl focus:outline-none focus:border-blue-500 focus:bg-white text-slate-850 font-mono"
              />
            </div>

            <button
              onClick={handleCreatePurchaseInvoice}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black text-xs py-3 rounded-xl shadow-lg shadow-blue-600/10 cursor-pointer active:scale-95 transition-all flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>إنشاء فاتورة مشتريات جديدة 🔵</span>
            </button>
          </div>
        </div>

      </div>

      {/* Bottom recent list */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-4 select-none">
          <div className="flex items-center gap-2">
            <span className="p-1 text-slate-500">
              <FileText className="w-4.5 h-4.5 text-slate-700" />
            </span>
            <div>
              <h3 className="font-extrabold text-slate-900 text-xs md:text-sm">آخر الفواتير الصادرة والمثبتة حديثاً</h3>
              <p className="text-[10px] text-slate-400 font-semibold">استعراض سريع للتحقق أو المعاينة والطباعة الفورية للفاتورة</p>
            </div>
          </div>

          {/* Search and Date-Range Filters */}
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Search bar inside */}
            <div className="relative w-full md:w-64">
              <Search className="w-4 h-4 absolute top-1/2 right-3 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="ابحث برقم الفاتورة أو اسم الشريك..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full text-xs font-black pr-9 pl-3 py-2 bg-slate-50 border border-slate-250 rounded-xl focus:outline-none focus:border-blue-500 focus:bg-white text-slate-800"
              />
            </div>

            {/* Start Date */}
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-black text-slate-500 whitespace-nowrap">من:</span>
              <input
                type="date"
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
                className="text-xs font-bold p-2 bg-slate-50 border border-slate-250 rounded-xl focus:outline-none focus:border-blue-500 text-slate-800 font-mono"
              />
            </div>

            {/* End Date */}
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-black text-slate-500 whitespace-nowrap">إلى:</span>
              <input
                type="date"
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
                className="text-xs font-bold p-2 bg-slate-50 border border-slate-250 rounded-xl focus:outline-none focus:border-blue-500 text-slate-800 font-mono"
              />
            </div>

            {/* Clear filters trigger */}
            {(filterStartDate || filterEndDate || searchTerm) && (
              <button
                onClick={() => {
                  setFilterStartDate('');
                  setFilterEndDate('');
                  setSearchTerm('');
                }}
                className="text-xs text-rose-600 hover:text-rose-700 font-black cursor-pointer underline"
              >
                تحديث التصفية 🔄
              </button>
            )}
          </div>
        </div>

        {filteredInvoices.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                  <th className="p-3">رقم الفاتورة</th>
                  <th className="p-3">تاريخ الإصدار</th>
                  <th className="p-3">الشريك المالي</th>
                  <th className="p-3 text-center">نوع الحركة</th>
                  <th className="p-3 text-center">إجمالي الفاتورة</th>
                  <th className="p-3 text-center">المبلغ المدفوع</th>
                  <th className="p-3 text-center">المتبقي للذمة</th>
                  <th className="p-3 text-center w-[120px]">التحكم والمعاينة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                {filteredInvoices.map(({ entry, contact }) => {
                  const outstanding = entry.total - (entry.paid || 0);
                  const isSupplier = contact.type === 'supplier';
                  return (
                    <tr key={entry.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-3 font-mono font-black text-slate-900">{entry.number}</td>
                      <td className="p-3 font-mono text-slate-600">{entry.date}</td>
                      <td className="p-3 text-right">
                        <div>
                          <span className="font-extrabold text-slate-900 block">{contact.name}</span>
                          <span className="text-[9px] text-slate-400 block font-mono">({contact.code})</span>
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                          isSupplier 
                            ? 'bg-blue-50 text-blue-700 border border-blue-100' 
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                        }`}>
                          {isSupplier ? 'شراء (واردة)' : 'بيع (صادرة)'}
                        </span>
                      </td>
                      <td className="p-3 text-center font-mono font-black">{entry.total.toLocaleString()} {currencySymbol}</td>
                      <td className="p-3 text-center font-mono text-emerald-600 font-bold">{entry.paid?.toLocaleString()} {currencySymbol}</td>
                      <td className={`p-3 text-center font-mono font-black ${outstanding > 1 ? 'text-rose-600' : 'text-slate-400'}`}>
                        {outstanding > 1 ? `${outstanding.toLocaleString()} ${currencySymbol}` : 'خالصة ✓'}
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => onViewInvoice(entry, contact)}
                          className="bg-slate-900 hover:bg-[#0f172a]/95 text-white font-black text-[10px] px-2.5 py-1.5 rounded-lg transition-all shadow-2xs cursor-pointer active:scale-95 flex items-center justify-center gap-1 mx-auto"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>عرض الفاتورة 🔍</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-slate-400 font-bold">لا توجد سجلات فواتير تطابق معايير البحث الحالية.</div>
        )}
      </div>

    </div>
  );
}
