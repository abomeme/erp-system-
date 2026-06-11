import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  Calendar, 
  DollarSign, 
  Percent, 
  Search, 
  ArrowUpDown, 
  FileText, 
  X, 
  AlertCircle,
  HelpCircle,
  BarChart4,
  Layers,
  Printer,
  ShoppingBag,
  ArrowUpRight,
  Calculator,
  Grid,
  Clock
} from 'lucide-react';
import { Contact, LedgerEntry, InventoryItem, Product, GeneralExpense } from '../types';

interface ProfitReportTabProps {
  contacts: Contact[];
  ledgers: Record<string, LedgerEntry[]>;
  inventory: InventoryItem[];
  products: Product[];
  expenses: GeneralExpense[];
  triggerToast: (msg: string, typ?: 'success' | 'err') => void;
  currencySymbol?: string;
}

interface ProductAggr {
  key: string;       // Unique identifier
  productName: string;
  productId: string;
  typeName: string;
  gradeName: string;
  unitName: string;
  regionName: string;
  qtySold: number;
  totalSales: number;
  totalCost: number;
  profit: number;
  avgSellPrice: number;
}

interface TimeProfitGroup {
  period: string; // The Date (YYYY-MM-DD), Month (YYYY-MM), or Year (YYYY)
  sales: number;
  cost: number;
  grossProfit: number;
  expenses: number;
  netProfit: number;
}

export default function ProfitReportTab({
  contacts,
  ledgers,
  inventory,
  products,
  expenses,
  triggerToast,
  currencySymbol = 'ج.س'
}: ProfitReportTabProps) {

  // 1. Date filters (defaulting to current month)
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}-01`;
  });
  
  const [endDate, setEndDate] = useState<string>(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });

  // Search & Filter conditions
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedProductFilter, setSelectedProductFilter] = useState<string>('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('');
  const [selectedRegionFilter, setSelectedRegionFilter] = useState<string>('');
  
  // Grouping Mode: 'complex' or 'simple'
  const [groupingMode, setGroupingMode] = useState<'simple' | 'complex'>('complex');
  
  // Current active Sub-Tab
  const [subTab, setSubTab] = useState<'items' | 'daily' | 'monthly' | 'yearly'>('items');

  // Sort field and direction
  const [sortField, setSortField] = useState<keyof ProductAggr>('profit');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Sort field for time-based reports
  const [timeSortField, setTimeSortField] = useState<keyof TimeProfitGroup>('period');
  const [timeSortOrder, setTimeSortOrder] = useState<'asc' | 'desc'>('desc');

  // Quick preset ranges
  const applyDatePreset = (preset: 'today' | 'week' | 'month' | 'year' | 'all') => {
    const todayStr = new Date().toISOString().split('T')[0];
    if (preset === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'week') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      setStartDate(d.toISOString().split('T')[0]);
      setEndDate(todayStr);
    } else if (preset === 'month') {
      const d = new Date();
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      setStartDate(`${year}-${month}-01`);
      setEndDate(todayStr);
    } else if (preset === 'year') {
      const d = new Date();
      const year = d.getFullYear();
      setStartDate(`${year}-01-01`);
      setEndDate(todayStr);
    } else if (preset === 'all') {
      setStartDate('2025-01-01');
      setEndDate(todayStr);
    }
  };

  // 2. Extra unique Lists for filtering dropdowns
  const uniqueTypes = useMemo(() => {
    const set = new Set<string>();
    inventory.forEach(i => { if (i.typeName) set.add(i.typeName); });
    return Array.from(set).sort();
  }, [inventory]);

  const uniqueRegions = useMemo(() => {
    const set = new Set<string>();
    inventory.forEach(i => { if (i.regionName) set.add(i.regionName); });
    return Array.from(set).sort();
  }, [inventory]);

  // Handle SKU/Product Sort
  const handleSort = (field: keyof ProductAggr) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Handle Time-report Sort
  const handleTimeSort = (field: keyof TimeProfitGroup) => {
    if (timeSortField === field) {
      setTimeSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
    } else {
      setTimeSortField(field);
      setTimeSortOrder('desc');
    }
  };

  // 3. CORE PROFIT CALCULATION & INVENTORY MATCHING BY DATE
  const reportData = useMemo(() => {
    const rawSalesMap: Record<string, ProductAggr> = {};
    let totalSalesGross = 0;
    let totalSalesCost = 0;
    let invoicesCount = 0;

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
          if (!entry.items || entry.items.length === 0) return;

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

      const sameProductAverages = inventory.filter(s => s.productId === productId && s.buyPrice > 0);
      if (sameProductAverages.length > 0) {
        const totalBSum = sameProductAverages.reduce((sum, current) => sum + current.buyPrice, 0);
        return Math.round(totalBSum / sameProductAverages.length);
      }

      return Math.round(fallbackBasePrice / 1.30);
    };

    // Iterate customer ledger records
    Object.keys(ledgers).forEach(cId => {
      const contactObj = contacts.find(c => c.id === cId);
      if (!contactObj || contactObj.type !== 'customer') return;

      const entries = ledgers[cId] || [];
      entries.forEach(entry => {
        if (entry.type !== 'invoice') return;
        if (entry.date < startDate || entry.date > endDate) return;
        
        invoicesCount++;

        // Process invoice details
        if (entry.items && entry.items.length > 0) {
          entry.items.forEach(itm => {
            const prodId = itm.productId;
            const pName = itm.productName || 'غير معروف';
            const rName = itm.regionName || '';
            const tName = itm.typeName || '';
            const gName = itm.gradeName || '';
            const uName = itm.unitName || '';

            const aggrKey = groupingMode === 'simple' 
              ? `${prodId}` 
              : `${prodId}_${tName}_${gName}_${uName}_${rName}`;

            const calculatedBuyPrice = getLandedCost(
              itm.productId,
              itm.typeName,
              itm.gradeName,
              itm.unitName,
              itm.regionName,
              itm.price
            );

            const itemSaleTotal = itm.total;
            const itemCostTotal = itm.qty * calculatedBuyPrice;

            totalSalesGross += itemSaleTotal;
            totalSalesCost += itemCostTotal;

            if (!rawSalesMap[aggrKey]) {
              rawSalesMap[aggrKey] = {
                key: aggrKey,
                productName: pName,
                productId: prodId,
                typeName: tName,
                gradeName: gName,
                unitName: uName,
                regionName: rName,
                qtySold: 0,
                totalSales: 0,
                totalCost: 0,
                profit: 0,
                avgSellPrice: 0
              };
            }

            rawSalesMap[aggrKey].qtySold += itm.qty;
            rawSalesMap[aggrKey].totalSales += itemSaleTotal;
            rawSalesMap[aggrKey].totalCost += itemCostTotal;
            rawSalesMap[aggrKey].profit += (itemSaleTotal - itemCostTotal);
          });
        }
      });
    });

    // Finalize Averages
    const initialList = Object.values(rawSalesMap).map(item => {
      item.avgSellPrice = item.qtySold > 0 ? Math.round(item.totalSales / item.qtySold) : 0;
      return item;
    });

    // Filter
    const filteredList = initialList.filter(item => {
      const matchesSearch = searchQuery.trim() === '' || 
        item.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.typeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.gradeName.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesProduct = selectedProductFilter === '' || item.productId === selectedProductFilter;
      const matchesType = selectedTypeFilter === '' || item.typeName === selectedTypeFilter;
      const matchesRegion = selectedRegionFilter === '' || item.regionName === selectedRegionFilter;

      return matchesSearch && matchesProduct && matchesType && matchesRegion;
    });

    // Apply Sorting
    const sortedList = [...filteredList].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortOrder === 'desc' ? bVal.localeCompare(aVal) : aVal.localeCompare(bVal);
      } else {
        const numA = (aVal as number) || 0;
        const numB = (bVal as number) || 0;
        return sortOrder === 'desc' ? numB - numA : numA - numB;
      }
    });

    // General Expenses in range
    let totalGeneralExpenses = 0;
    expenses.forEach(x => {
      if (x.date >= startDate && x.date <= endDate) {
        totalGeneralExpenses += x.amount;
      }
    });

    const totalFilteredSales = filteredList.reduce((sum, item) => sum + item.totalSales, 0);
    const totalFilteredCost = filteredList.reduce((sum, item) => sum + item.totalCost, 0);
    const totalFilteredProfit = filteredList.reduce((sum, item) => sum + item.profit, 0);

    return {
      itemsList: sortedList,
      totalSalesGross,
      totalSalesCost,
      totalGeneralExpenses,
      invoicesCount,
      totalFilteredSales,
      totalFilteredCost,
      totalFilteredProfit
    };
  }, [ledgers, contacts, inventory, expenses, startDate, endDate, groupingMode, searchQuery, selectedProductFilter, selectedTypeFilter, selectedRegionFilter, sortField, sortOrder]);


  // 4. TEMPORAL (DAILY, MONTHLY, YEARLY) PROFIT AGGREGATIONS
  const temporalProfitData = useMemo(() => {
    const dailyMap: Record<string, { sales: number; cost: number; expenses: number }> = {};
    const monthlyMap: Record<string, { sales: number; cost: number; expenses: number }> = {};
    const yearlyMap: Record<string, { sales: number; cost: number; expenses: number }> = {};

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
          if (!entry.items || entry.items.length === 0) return;

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

      const sameProductAverages = inventory.filter(s => s.productId === productId && s.buyPrice > 0);
      if (sameProductAverages.length > 0) {
        const totalBSum = sameProductAverages.reduce((sum, current) => sum + current.buyPrice, 0);
        return Math.round(totalBSum / sameProductAverages.length);
      }

      return Math.round(fallbackBasePrice / 1.30);
    };

    // Gather Sales Invoice data per Date
    Object.keys(ledgers).forEach(cId => {
      const contactObj = contacts.find(c => c.id === cId);
      if (!contactObj || contactObj.type !== 'customer') return;

      const entries = ledgers[cId] || [];
      entries.forEach(entry => {
        if (entry.type !== 'invoice') return;
        if (entry.date < startDate || entry.date > endDate) return;

        const dateStr = entry.date; // YYYY-MM-DD
        if (!dateStr) return;

        const monthStr = dateStr.slice(0, 7); // YYYY-MM
        const yearStr = dateStr.slice(0, 4); // YYYY

        if (!dailyMap[dateStr]) dailyMap[dateStr] = { sales: 0, cost: 0, expenses: 0 };
        if (!monthlyMap[monthStr]) monthlyMap[monthStr] = { sales: 0, cost: 0, expenses: 0 };
        if (!yearlyMap[yearStr]) yearlyMap[yearStr] = { sales: 0, cost: 0, expenses: 0 };

        if (entry.items && entry.items.length > 0) {
          entry.items.forEach(itm => {
            const calculatedBuyPrice = getLandedCost(
              itm.productId,
              itm.typeName,
              itm.gradeName,
              itm.unitName,
              itm.regionName,
              itm.price
            );

            const itemSaleTotal = itm.total;
            const itemCostTotal = itm.qty * calculatedBuyPrice;

            // Daily increment
            dailyMap[dateStr].sales += itemSaleTotal;
            dailyMap[dateStr].cost += itemCostTotal;

            // Monthly increment
            monthlyMap[monthStr].sales += itemSaleTotal;
            monthlyMap[monthStr].cost += itemCostTotal;

            // Yearly increment
            yearlyMap[yearStr].sales += itemSaleTotal;
            yearlyMap[yearStr].cost += itemCostTotal;
          });
        }
      });
    });

    // Gather Expenses per Date
    expenses.forEach(x => {
      const dateStr = x.date;
      if (!dateStr || dateStr < startDate || dateStr > endDate) return;

      const monthStr = dateStr.slice(0, 7);
      const yearStr = dateStr.slice(0, 4);

      if (!dailyMap[dateStr]) dailyMap[dateStr] = { sales: 0, cost: 0, expenses: 0 };
      if (!monthlyMap[monthStr]) monthlyMap[monthStr] = { sales: 0, cost: 0, expenses: 0 };
      if (!yearlyMap[yearStr]) yearlyMap[yearStr] = { sales: 0, cost: 0, expenses: 0 };

      dailyMap[dateStr].expenses += x.amount;
      monthlyMap[monthStr].expenses += x.amount;
      yearlyMap[yearStr].expenses += x.amount;
    });

    // Helper to sort time groupings
    const makeSortedList = (mapObj: Record<string, { sales: number; cost: number; expenses: number }>) => {
      const list = Object.keys(mapObj).map(period => {
        const item = mapObj[period];
        const gp = item.sales - item.cost;
        return {
          period,
          sales: item.sales,
          cost: item.cost,
          grossProfit: gp,
          expenses: item.expenses,
          netProfit: gp - item.expenses
        };
      });

      return list.sort((a, b) => {
        const aVal = a[timeSortField];
        const bVal = b[timeSortField];
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return timeSortOrder === 'desc' ? bVal.localeCompare(aVal) : aVal.localeCompare(bVal);
        } else {
          const numA = (aVal as number) || 0;
          const numB = (bVal as number) || 0;
          return timeSortOrder === 'desc' ? numB - numA : numA - numB;
        }
      });
    };

    return {
      dailyList: makeSortedList(dailyMap),
      monthlyList: makeSortedList(monthlyMap),
      yearlyList: makeSortedList(yearlyMap)
    };
  }, [ledgers, contacts, inventory, expenses, startDate, endDate, timeSortField, timeSortOrder]);


  // Overall financial calculations
  const grossProfitAll = reportData.totalSalesGross - reportData.totalSalesCost;
  const netProfitAll = grossProfitAll - reportData.totalGeneralExpenses;

  // Best Performing Items for side visuals (Top 5 by gross profit)
  const topProfitMakers = useMemo(() => {
    return [...reportData.itemsList]
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 5);
  }, [reportData.itemsList]);

  // Reset Filters
  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedProductFilter('');
    setSelectedTypeFilter('');
    setSelectedRegionFilter('');
    setGroupingMode('complex');
    setSortField('profit');
    setSortOrder('desc');
    triggerToast('🧹 تم تصفية وتهيئة جميع خيارات البحث للوضع الافتراضي.');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 mt-6 mb-12" dir="rtl" id="profit_report_tab_container">
      
      {/* HEADER SECTION */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 md:p-6 shadow-xl border border-slate-850 relative overflow-hidden mb-6 no-print">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-24 -mt-24"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -ml-24 -mb-24"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg">
                <BarChart4 className="w-5 h-5" />
              </span>
              <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">
                شاشة تحليلات الأرباح الشاملة وربحية الأصناف والزمن
              </h2>
            </div>
            <p className="text-stone-350 text-xs md:text-sm font-medium">
              نظام ذكي متكامل لاحتساب الأرباح الإجمالية والصافية على مستوى الأصناف مع عرض تحليلي لأرباح اليوم، الشهر، والسنة.
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="bg-slate-800 hover:bg-slate-700 text-stone-200 border border-slate-700 hover:text-white px-3.5 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="طباعة تقرير الأرباح الحالي"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span>طباعة التقرير</span>
            </button>
          </div>
        </div>
      </div>

      {/* PRINT-ONLY HEADER */}
      <div className="only-print bg-white text-slate-900 p-4 border-2 border-slate-900 rounded-xl mb-6 text-center text-xs">
        <h2 className="text-lg font-black text-slate-900">بوابة الحوكمة والتحليل المالي لليامامة</h2>
        <h3 className="text-md font-black text-slate-700 mt-1">تقرير أرباح الأصناف والمبيعات</h3>
        <p className="text-xs text-slate-500 mt-1">
          الفترة القياسية المشمولة بالتقرير: من <b>{startDate}</b> إلى <b>{endDate}</b>
        </p>
        <p className="text-[10px] text-slate-400 mt-0.5">تاريخ الطباعة المعتمد: {new Date().toLocaleDateString('ar-SD')} - {new Date().toLocaleTimeString('ar-SD')}</p>
      </div>

      {/* FINANCIAL STATS SUMMARY (BENTO GRID Style) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 mb-6" id="profit_bento_stats">
        
        {/* Total Sales */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-xl pointer-events-none"></div>
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[11px] font-black uppercase text-slate-500">مجموع الإيرادات</span>
            <ShoppingBag className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-2.5">
            <div className="text-lg md:text-xl font-black text-blue-900 font-mono tracking-tight text-right">
              {reportData.totalSalesGross.toLocaleString()} <span className="text-[10px] font-sans text-slate-400 font-bold">{currencySymbol}</span>
            </div>
            <p className="text-[9px] text-slate-400 font-bold mt-1 text-right">
              مجموع مبيعات الفواتير الصادرة
            </p>
          </div>
        </div>

        {/* Cost of Sold Goods */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-xl pointer-events-none"></div>
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[11px] font-black uppercase text-amber-600">تكلفة شراء البضائع</span>
            <Calculator className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2.5">
            <div className="text-lg md:text-xl font-black text-amber-900 font-mono tracking-tight text-right">
              {reportData.totalSalesCost.toLocaleString()} <span className="text-[10px] font-sans text-slate-400 font-bold">{currencySymbol}</span>
            </div>
            <p className="text-[9px] text-amber-500 font-bold mt-1 text-right">
              محسوبة على سعر الشراء الفعلي
            </p>
          </div>
        </div>

        {/* Total Gross Profit */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl pointer-events-none"></div>
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[11px] font-black uppercase text-indigo-650 text-indigo-650">الربح الإجمالي الدفتري</span>
            <TrendingUp className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="mt-2.5">
            <div className="text-lg md:text-xl font-black text-indigo-950 font-mono tracking-tight text-indigo-700 text-right">
              {grossProfitAll.toLocaleString()} <span className="text-[10px] font-sans text-slate-400 font-bold">{currencySymbol}</span>
            </div>
            <p className="text-[9px] text-indigo-600 font-bold mt-1 text-right">
              نسبة هامش {reportData.totalSalesCost ? Math.round((grossProfitAll / reportData.totalSalesCost) * 100) : 0}% من التكلفة
            </p>
          </div>
        </div>

        {/* General Operating Expenses */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-xl pointer-events-none"></div>
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[11px] font-black uppercase text-rose-505 text-rose-600">المنصرفات والعموميات</span>
            <AlertCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="mt-2.5">
            <div className="text-lg md:text-xl font-black text-rose-900 font-mono tracking-tight text-right">
              {reportData.totalGeneralExpenses.toLocaleString()} <span className="text-[10px] font-sans text-slate-400 font-bold">{currencySymbol}</span>
            </div>
            <p className="text-[9px] text-rose-500 font-semibold mt-1 text-right">
              خلال الفترة المحددة بالتقويم
            </p>
          </div>
        </div>

        {/* Total Net Profit */}
        <div className="bg-slate-900 text-white rounded-xl border border-slate-800 p-4 shadow-sm relative overflow-hidden flex flex-col justify-between col-span-1">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl pointer-events-none"></div>
          <div className="flex justify-between items-center">
            <span className="text-[11px] font-black uppercase text-amber-400">صافي الأرباح الصافي</span>
            <ArrowUpRight className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2.5">
            <div className={`text-lg md:text-xl font-black font-mono tracking-tight text-right ${netProfitAll >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {netProfitAll.toLocaleString()} <span className="text-[10px] font-sans text-slate-400 font-normal">{currencySymbol}</span>
            </div>
            <p className="text-[9px] text-stone-300 font-semibold mt-1 text-right">
              صافي الربح = الإجمالي - المصروفات
            </p>
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* --- RIGHT COLUMN: SEARCH & ADVANCED CONTROLS (Hide on print) --- */}
        <div className="lg:col-span-1 space-y-6 no-print">
          
          {/* Calendar & Range filter */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <h3 className="font-black text-slate-800 text-xs tracking-wide uppercase mb-3.5 flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span>فترة الربحية المستهدفة</span>
            </h3>

            <div className="space-y-3.5">
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-500">تاريخ البداية (من):</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full text-xs font-black p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-500">تاريخ النهاية (إلى):</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full text-xs font-black p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Range quick selections */}
              <div className="grid grid-cols-3 gap-1 pt-1 border-t border-slate-100 mt-2">
                <button
                  type="button"
                  onClick={() => applyDatePreset('today')}
                  className="bg-slate-50 hover:bg-slate-200 hover:text-slate-900 border border-slate-150 text-slate-600 text-[10px] font-black py-1.5 px-1 rounded-md transition-all cursor-pointer text-center"
                >
                  اليوم
                </button>
                <button
                  type="button"
                  onClick={() => applyDatePreset('week')}
                  className="bg-slate-50 hover:bg-slate-200 hover:text-slate-900 border border-slate-150 text-slate-600 text-[10px] font-black py-1.5 px-1 rounded-md transition-all cursor-pointer text-center"
                >
                  ٧ أيام
                </button>
                <button
                  type="button"
                  onClick={() => applyDatePreset('month')}
                  className="bg-slate-50 hover:bg-slate-200 hover:text-slate-900 border border-slate-150 text-slate-600 text-[10px] font-black py-1.5 px-1 rounded-md transition-all cursor-pointer text-center"
                >
                  هذا الشهر
                </button>
                <button
                  type="button"
                  onClick={() => applyDatePreset('year')}
                  className="bg-slate-50 hover:bg-slate-200 hover:text-slate-900 border border-slate-150 text-slate-600 text-[10px] font-black py-1.5 px-1 rounded-md transition-all cursor-pointer text-center"
                >
                  هذا العام
                </button>
                <button
                  type="button"
                  onClick={() => applyDatePreset('all')}
                  className="col-span-2 bg-slate-100 hover:bg-slate-200 text-stone-700 text-[10px] font-black py-1.5 px-1 rounded-md transition-all cursor-pointer text-center"
                >
                  كامل السجلات
                </button>
              </div>
            </div>
          </div>

          {/* Filtering parameters (Only visible and useful for Items Sub Tab) */}
          {subTab === 'items' && (
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <h3 className="font-black text-slate-800 text-xs tracking-wide uppercase mb-3.5 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                <Layers className="w-4 h-4 text-purple-600" />
                <span>تصفية الفئات والأصناف</span>
              </h3>

              <div className="space-y-3.5">
                
                {/* Search text */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-500">ابحث باسم الـمـنـتـج:</label>
                  <div className="relative">
                    <span className="absolute right-2.5 top-2.5 text-slate-400">
                      <Search className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      placeholder="تفاح، برتقال، موز..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full text-xs font-black pr-8 pl-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                {/* Fruit Category Selection */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-500">الفاكهة الأساسية:</label>
                  <select
                    value={selectedProductFilter}
                    onChange={(e) => setSelectedProductFilter(e.target.value)}
                    className="w-full text-xs font-black p-2 bg-white border border-slate-200 rounded-lg focus:outline-none hover:border-slate-350 cursor-pointer"
                  >
                    <option value="">-- جميع الفواكه --</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id} className="font-bold">
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Sub-Type (التصنيف/النوع) Category Selection */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-500">الـصـنـف المرجعي:</label>
                  <select
                    value={selectedTypeFilter}
                    onChange={(e) => setSelectedTypeFilter(e.target.value)}
                    className="w-full text-xs font-black p-2 bg-white border border-slate-200 rounded-lg focus:outline-none hover:border-slate-350 cursor-pointer"
                  >
                    <option value="">-- كافية الأصناف الفرعية --</option>
                    {uniqueTypes.map(t => (
                      <option key={t} value={t} className="font-bold">{t}</option>
                    ))}
                  </select>
                </div>

                {/* Region Selection */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-500">مصدر المخزن/المنطقة:</label>
                  <select
                    value={selectedRegionFilter}
                    onChange={(e) => setSelectedRegionFilter(e.target.value)}
                    className="w-full text-xs font-black p-2 bg-white border border-slate-200 rounded-lg focus:outline-none hover:border-slate-350 cursor-pointer"
                  >
                    <option value="">-- جميع المناطق --</option>
                    {uniqueRegions.map(r => (
                      <option key={r} value={r} className="font-bold">{r}</option>
                    ))}
                  </select>
                </div>

                {/* Toggle Simple View / Complex configurations */}
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <span className="block text-[11px] font-bold text-slate-500">وضع تجميع الصنف:</span>
                  <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-0.5 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setGroupingMode('simple')}
                      className={`text-[10px] py-1.5 px-2 rounded-md font-black cursor-pointer transition-all ${
                        groupingMode === 'simple' ? 'bg-white shadow-xs text-blue-800 font-bold' : 'text-slate-600'
                      }`}
                    >
                      صنف رئيسي
                    </button>
                    <button
                      type="button"
                      onClick={() => setGroupingMode('complex')}
                      className={`text-[10px] py-1.5 px-2 rounded-md font-black cursor-pointer transition-all ${
                        groupingMode === 'complex' ? 'bg-white shadow-xs text-blue-800 font-bold' : 'text-slate-600'
                      }`}
                    >
                      صنف تفصيلي
                    </button>
                  </div>
                </div>

                {/* Clear filters Button */}
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-black py-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <X className="w-4 h-4 text-rose-500" />
                  <span>إعادة ضبط الفلاتر</span>
                </button>

              </div>
            </div>
          )}

          {/* Top 5 Products Bar Chart visual card */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <h3 className="font-black text-slate-800 text-xs tracking-wide uppercase mb-3 flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              <span>أعلى ٥ مبيعات مدرة للأرباح</span>
            </h3>

            <div className="space-y-4 pt-1">
              {topProfitMakers.length > 0 ? (
                topProfitMakers.map((item, index) => {
                  const maxProfitVal = topProfitMakers[0]?.profit || 1;
                  const ratioPercent = Math.max(5, Math.min(100, Math.round((item.profit / maxProfitVal) * 100)));
                  return (
                    <div key={item.key} className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-black text-slate-800 max-w-[170px] truncate block text-right">
                          #{index + 1} {item.productName} 
                          {groupingMode === 'complex' && <span className="text-[10px] text-slate-400 font-medium"> ({item.typeName})</span>}
                        </span>
                        <span className="font-mono text-emerald-600 font-bold block text-left">+{item.profit.toLocaleString()} {currencySymbol}</span>
                      </div>
                      
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-emerald-500 h-full rounded-full transition-all duration-505" 
                          style={{ width: `${ratioPercent}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-[9px] text-slate-400">
                        <span>الكمية: {item.qtySold.toLocaleString()} {item.unitName || 'وحدة'}</span>
                        <span>عائد {item.totalCost ? Math.round((item.profit / item.totalCost) * 100) : 0}% ROI</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-stone-400 text-center py-4">لا تتوفر مبيعات فاكهة لتمثيلها بالنظام حالياً.</p>
              )}
            </div>
          </div>

        </div>

        {/* --- LEFT COLUMN: DATA TABLE AND GRAPHICAL BREAKDOWN --- */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* Tabs Navigator at the Top of Table Panel */}
          <div className="bg-white p-1 rounded-xl border border-slate-250 shadow-xs flex flex-wrap gap-1 no-print">
            <button
              onClick={() => setSubTab('items')}
              className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                subTab === 'items' 
                  ? 'bg-slate-900 text-white font-black shadow' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Grid className="w-4 h-4 text-emerald-500" />
              <span>الأرباح بالأصناف والمنتجات</span>
            </button>

            <button
              onClick={() => setSubTab('daily')}
              className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                subTab === 'daily' 
                  ? 'bg-slate-900 text-white font-black shadow' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Clock className="w-4 h-4 text-blue-500" />
              <span>الأرباح باليوم</span>
            </button>

            <button
              onClick={() => setSubTab('monthly')}
              className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                subTab === 'monthly' 
                  ? 'bg-slate-900 text-white font-black shadow' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Calendar className="w-4 h-4 text-indigo-500" />
              <span>الأرباح بالشهر</span>
            </button>

            <button
              onClick={() => setSubTab('yearly')}
              className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                subTab === 'yearly' 
                  ? 'bg-slate-900 text-white font-black shadow' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <TrendingUp className="w-4 h-4 text-amber-500" />
              <span>الأرباح بالسنة</span>
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm relative overflow-hidden">
            
            {/* Header depending on Active Tab */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-2 border-b border-slate-150 no-print">
              <div>
                <h3 className="font-black text-slate-800 text-sm tracking-tight flex items-center gap-2">
                  <Grid className="w-4 h-4 text-slate-600" />
                  <span>
                    {subTab === 'items' && "جدول مبيعات وأكلاف وأرباح الأصناف المصفاة دفترياً"}
                    {subTab === 'daily' && "بيان حصر المبيعات الإجمالية والأرباح باليوم"}
                    {subTab === 'monthly' && "بيان الأرباح والإرادات ملقّمة ومجمّعة بالشهر"}
                    {subTab === 'yearly' && "الملخص الختامي لصافي الأرباح التراكمية بالسنة"}
                  </span>
                </h3>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                  تتأثر هذه البيانات بنطاق التقويم المختار وتحديثات فواتير ومصروفات اليامامة.
                </p>
              </div>

              <div className="bg-blue-50 text-blue-900 border border-blue-200 text-[10px] px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 font-bold">
                <AlertCircle className="w-3.5 h-3.5 text-blue-600" />
                <span>
                  {subTab === 'items' && `إجمالي سجلات المعروض: ${reportData.itemsList.length}`}
                  {subTab === 'daily' && `إجمالي الأيام المبيوعة: ${temporalProfitData.dailyList.length}`}
                  {subTab === 'monthly' && `إجمالي تجمعات الأشهر: ${temporalProfitData.monthlyList.length}`}
                  {subTab === 'yearly' && `إجمالي تجمعات السنوات: ${temporalProfitData.yearlyList.length}`}
                </span>
              </div>
            </div>

            {/* Print-only status display indicating printed mode */}
            <div className="only-print text-right text-xs bg-slate-100 p-2 rounded-lg mb-4">
              ✨ طريقة عرض الحصيلة الحالية للطباعة: 
              <b>
                {subTab === 'items' && " جدول الأرباح التفصيلي حسب الأصناف والمنتجات"}
                {subTab === 'daily' && " تقرير الأرباح اليومي الشامل لمبيعات ومصروفات اليوم"}
                {subTab === 'monthly' && " التقرير الشهري التراكمي للإيرادات وصوافي الربح شهرياً"}
                {subTab === 'yearly' && " التقرير السنوي التاريخي لصافي الأرباح"}
              </b>
            </div>

            {/* TAB-1: ITEMS PROFIT TABLE */}
            {subTab === 'items' && (
              <div className="overflow-x-auto w-full">
                <table className="w-full text-right border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-[11px] text-slate-600 font-bold border-b-2 border-slate-200">
                      <th className="p-3 text-right">الصنف والمنتج المستهدف</th>
                      <th className="p-3 text-center cursor-pointer hover:bg-slate-100" onClick={() => handleSort('qtySold')}>
                        <div className="flex items-center justify-center gap-1">
                          <span>الكمية المباعة</span>
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        </div>
                      </th>
                      <th className="p-3 text-center cursor-pointer hover:bg-slate-100" onClick={() => handleSort('avgSellPrice')}>
                        <div className="flex items-center justify-center gap-1">
                          <span>متوسط م ب</span>
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        </div>
                      </th>
                      <th className="p-3 text-center cursor-pointer hover:bg-slate-100" onClick={() => handleSort('totalSales')}>
                        <div className="flex items-center justify-center gap-1">
                          <span>إجمالي المبيعات</span>
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        </div>
                      </th>
                      <th className="p-3 text-center cursor-pointer hover:bg-slate-100" onClick={() => handleSort('totalCost')}>
                        <div className="flex items-center justify-center gap-1">
                          <span>تكلفة التوريد</span>
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        </div>
                      </th>
                      <th className="p-3 text-center cursor-pointer hover:bg-slate-100 bg-emerald-50/50" onClick={() => handleSort('profit')}>
                        <div className="flex items-center justify-center gap-1">
                          <span>صافي أرباح الصنف</span>
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        </div>
                      </th>
                      <th className="p-3 text-center">عائد الربح %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.itemsList.map(item => {
                      const roi = item.totalCost > 0 ? Math.round((item.profit / item.totalCost) * 100) : 0;
                      return (
                        <tr key={item.key} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                          <td className="p-3">
                            <div className="font-black text-slate-800 text-xs">{item.productName}</div>
                            {groupingMode === 'complex' ? (
                              <div className="text-[10px] text-slate-400 font-medium flex flex-wrap gap-1 mt-0.5" dir="rtl">
                                <span className="bg-slate-100 px-1 rounded">{item.typeName}</span>
                                <span className="bg-slate-100 px-1 rounded">درجة: {item.gradeName}</span>
                                <span className="bg-sky-50 text-sky-700 px-1 rounded">{item.regionName}</span>
                              </div>
                            ) : (
                              <div className="text-[10px] text-slate-400 font-semibold italic">صنف إجمالي مجمع</div>
                            )}
                          </td>
                          <td className="p-3 text-center font-mono font-bold text-slate-700">
                            {item.qtySold.toLocaleString()} <span className="text-[10px] text-slate-400 font-sans">{item.unitName || 'وحدات'}</span>
                          </td>
                          <td className="p-3 text-center font-mono text-slate-600">
                            {item.avgSellPrice.toLocaleString()} {currencySymbol}/و
                          </td>
                          <td className="p-3 text-center font-mono font-bold text-blue-900">
                            {item.totalSales.toLocaleString()}
                          </td>
                          <td className="p-3 text-center font-mono text-amber-700">
                            {item.totalCost.toLocaleString()}
                          </td>
                          <td className="p-3 text-center font-mono font-black bg-emerald-50/40 text-emerald-700">
                            {item.profit >= 0 ? `+${item.profit.toLocaleString()}` : `${item.profit.toLocaleString()}`}
                          </td>
                          <td className="p-3 text-center">
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-black ${
                              roi >= 30 ? 'bg-emerald-100 text-emerald-800' : roi >= 15 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                            }`}>
                              {roi}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                    {reportData.itemsList.length === 0 && (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-stone-400 font-semibold bg-slate-50/50">
                          <HelpCircle className="w-10 h-10 text-stone-300 mx-auto mb-2" />
                          <h4 className="text-stone-500 font-black">لا يوجد أصناف أو مبيعات فاكهة تطابق الفلترة المحددة</h4>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB-2: DAILY PROFITS */}
            {subTab === 'daily' && (
              <div className="overflow-x-auto w-full">
                <table className="w-full text-right border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-[11px] text-slate-600 font-bold border-b-2 border-slate-200">
                      <th className="p-3 text-right cursor-pointer hover:bg-slate-100" onClick={() => handleTimeSort('period')}>
                        <div className="flex items-center justify-start gap-1">
                          <span>التاريخ واليوم المالي</span>
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        </div>
                      </th>
                      <th className="p-3 text-center cursor-pointer hover:bg-slate-100" onClick={() => handleTimeSort('sales')}>
                        <div className="flex items-center justify-center gap-1">
                          <span>إيرادات المبيعات</span>
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        </div>
                      </th>
                      <th className="p-3 text-center cursor-pointer hover:bg-slate-100" onClick={() => handleTimeSort('cost')}>
                        <div className="flex items-center justify-center gap-1">
                          <span>تكلفة شراء البضائع</span>
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        </div>
                      </th>
                      <th className="p-3 text-center cursor-pointer hover:bg-slate-100" onClick={() => handleTimeSort('grossProfit')}>
                        <div className="flex items-center justify-center gap-1">
                          <span>الأرباح الإجمالية</span>
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        </div>
                      </th>
                      <th className="p-3 text-center cursor-pointer hover:bg-slate-100" onClick={() => handleTimeSort('expenses')}>
                        <div className="flex items-center justify-center gap-1">
                          <span>مصروفات اليوم</span>
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        </div>
                      </th>
                      <th className="p-3 text-center cursor-pointer hover:bg-slate-100 bg-emerald-50/50" onClick={() => handleTimeSort('netProfit')}>
                        <div className="flex items-center justify-center gap-1">
                          <span>صافي ربح اليوم المالي</span>
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        </div>
                      </th>
                      <th className="p-3 text-center">عائد الربح %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {temporalProfitData.dailyList.map(item => {
                      const roi = item.cost > 0 ? Math.round((item.grossProfit / item.cost) * 100) : 0;
                      return (
                        <tr key={item.period} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                          <td className="p-3 font-black text-slate-800 font-mono">
                            {item.period}
                          </td>
                          <td className="p-3 text-center font-mono text-blue-900 font-bold">
                            {item.sales.toLocaleString()}
                          </td>
                          <td className="p-3 text-center font-mono text-amber-700">
                            {item.cost.toLocaleString()}
                          </td>
                          <td className="p-3 text-center font-mono text-slate-700">
                            {item.grossProfit.toLocaleString()}
                          </td>
                          <td className="p-3 text-center font-mono text-rose-700">
                            {item.expenses.toLocaleString()}
                          </td>
                          <td className={`p-3 text-center font-mono font-black bg-emerald-50/40 ${item.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                            {item.netProfit >= 0 ? `+${item.netProfit.toLocaleString()}` : item.netProfit.toLocaleString()}
                          </td>
                          <td className="p-3 text-center">
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-black ${
                              roi >= 30 ? 'bg-emerald-100 text-emerald-800' : roi >= 15 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                            }`}>
                              {roi}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                    {temporalProfitData.dailyList.length === 0 && (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-stone-400 font-semibold bg-slate-50/50">
                          <HelpCircle className="w-10 h-10 text-stone-300 mx-auto mb-2" />
                          <h4 className="text-stone-500 font-black">لا توجد حركات مبيعات أو مصروفات مسجلة بالأيام لهذه الفترة المحددة</h4>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB-3: MONTHLY PROFITS */}
            {subTab === 'monthly' && (
              <div className="overflow-x-auto w-full">
                <table className="w-full text-right border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-[11px] text-slate-600 font-bold border-b-2 border-slate-200">
                      <th className="p-3 text-right cursor-pointer hover:bg-slate-100" onClick={() => handleTimeSort('period')}>
                        <div className="flex items-center justify-start gap-1">
                          <span>الشهر المستهدف</span>
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        </div>
                      </th>
                      <th className="p-3 text-center cursor-pointer hover:bg-slate-100" onClick={() => handleTimeSort('sales')}>
                        <div className="flex items-center justify-center gap-1">
                          <span>مبيعات الشهر الكلية</span>
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        </div>
                      </th>
                      <th className="p-3 text-center cursor-pointer hover:bg-slate-100" onClick={() => handleTimeSort('cost')}>
                        <div className="flex items-center justify-center gap-1">
                          <span>تكلفة البضائع الكلية</span>
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        </div>
                      </th>
                      <th className="p-3 text-center cursor-pointer hover:bg-slate-100" onClick={() => handleTimeSort('grossProfit')}>
                        <div className="flex items-center justify-center gap-1">
                          <span>الربح الإجمالي الدفتري</span>
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        </div>
                      </th>
                      <th className="p-3 text-center cursor-pointer hover:bg-slate-100" onClick={() => handleTimeSort('expenses')}>
                        <div className="flex items-center justify-center gap-1">
                          <span>إجمالي مصروفات الشهر</span>
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        </div>
                      </th>
                      <th className="p-3 text-center cursor-pointer hover:bg-slate-100 bg-emerald-50/50" onClick={() => handleTimeSort('netProfit')}>
                        <div className="flex items-center justify-center gap-1">
                          <span>صافي الأرباح لشهر</span>
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        </div>
                      </th>
                      <th className="p-3 text-center">عائد الاستثمار %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {temporalProfitData.monthlyList.map(item => {
                      const roi = item.cost > 0 ? Math.round((item.grossProfit / item.cost) * 100) : 0;
                      return (
                        <tr key={item.period} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                          <td className="p-3 font-black text-slate-900 font-mono">
                            {item.period}
                          </td>
                          <td className="p-3 text-center font-mono text-blue-900 font-bold">
                            {item.sales.toLocaleString()}
                          </td>
                          <td className="p-3 text-center font-mono text-amber-700">
                            {item.cost.toLocaleString()}
                          </td>
                          <td className="p-3 text-center font-mono text-slate-700">
                            {item.grossProfit.toLocaleString()}
                          </td>
                          <td className="p-3 text-center font-mono text-rose-700">
                            {item.expenses.toLocaleString()}
                          </td>
                          <td className={`p-3 text-center font-mono font-black bg-emerald-50/40 ${item.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                            {item.netProfit >= 0 ? `+${item.netProfit.toLocaleString()}` : item.netProfit.toLocaleString()}
                          </td>
                          <td className="p-3 text-center">
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-black ${
                              roi >= 30 ? 'bg-emerald-100 text-emerald-800' : roi >= 15 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                            }`}>
                              {roi}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                    {temporalProfitData.monthlyList.length === 0 && (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-stone-400 font-semibold bg-slate-50/50">
                          <HelpCircle className="w-10 h-10 text-stone-300 mx-auto mb-2" />
                          <h4 className="text-stone-500 font-black">لا توجد حركات مبيعات شهرية حالياً بالنظام</h4>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB-4: YEARLY PROFITS */}
            {subTab === 'yearly' && (
              <div className="overflow-x-auto w-full">
                <table className="w-full text-right border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-[11px] text-slate-600 font-bold border-b-2 border-slate-200">
                      <th className="p-3 text-right cursor-pointer hover:bg-slate-100" onClick={() => handleTimeSort('period')}>
                        <div className="flex items-center justify-start gap-1">
                          <span>العام المالي المعتمد</span>
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        </div>
                      </th>
                      <th className="p-3 text-center cursor-pointer hover:bg-slate-100" onClick={() => handleTimeSort('sales')}>
                        <div className="flex items-center justify-center gap-1">
                          <span>المبيعات السنوية</span>
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        </div>
                      </th>
                      <th className="p-3 text-center cursor-pointer hover:bg-slate-100" onClick={() => handleTimeSort('cost')}>
                        <div className="flex items-center justify-center gap-1">
                          <span>قيمة الأكلاف السنوية</span>
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        </div>
                      </th>
                      <th className="p-3 text-center cursor-pointer hover:bg-slate-100" onClick={() => handleTimeSort('grossProfit')}>
                        <div className="flex items-center justify-center gap-1">
                          <span>الربح السنوي الإجمالي</span>
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        </div>
                      </th>
                      <th className="p-3 text-center cursor-pointer hover:bg-slate-100" onClick={() => handleTimeSort('expenses')}>
                        <div className="flex items-center justify-center gap-1">
                          <span>المصروفات السنوية المسجلة</span>
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        </div>
                      </th>
                      <th className="p-3 text-center cursor-pointer hover:bg-slate-100 bg-emerald-50/50" onClick={() => handleTimeSort('netProfit')}>
                        <div className="flex items-center justify-center gap-1">
                          <span>صافي أرباح العام</span>
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        </div>
                      </th>
                      <th className="p-3 text-center">عائد الأرباح %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {temporalProfitData.yearlyList.map(item => {
                      const roi = item.cost > 0 ? Math.round((item.grossProfit / item.cost) * 100) : 0;
                      return (
                        <tr key={item.period} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                          <td className="p-3 font-black text-slate-900 font-mono">
                            السنة المالية {item.period}
                          </td>
                          <td className="p-3 text-center font-mono text-blue-900 font-bold">
                            {item.sales.toLocaleString()}
                          </td>
                          <td className="p-3 text-center font-mono text-amber-700">
                            {item.cost.toLocaleString()}
                          </td>
                          <td className="p-3 text-center font-mono text-slate-700">
                            {item.grossProfit.toLocaleString()}
                          </td>
                          <td className="p-3 text-center font-mono text-rose-700">
                            {item.expenses.toLocaleString()}
                          </td>
                          <td className={`p-3 text-center font-mono font-black bg-emerald-50/40 ${item.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                            {item.netProfit >= 0 ? `+${item.netProfit.toLocaleString()}` : item.netProfit.toLocaleString()}
                          </td>
                          <td className="p-3 text-center">
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-black ${
                              roi >= 30 ? 'bg-emerald-100 text-emerald-800' : roi >= 15 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                            }`}>
                              {roi}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                    {temporalProfitData.yearlyList.length === 0 && (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-stone-400 font-semibold bg-slate-50/50">
                          <HelpCircle className="w-10 h-10 text-stone-300 mx-auto mb-2" />
                          <h4 className="text-stone-500 font-black">لا تتوفر حركات سنوية بالنظام</h4>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Signature & Print Footer for all tables */}
            <div className="only-print mt-12 grid grid-cols-2 gap-4 text-center text-xs font-semibold pt-6 border-t border-dashed border-stone-350">
              <div>
                <p className="text-stone-500">توقيع المحاسب المالي المالي المعتمد:</p>
                <div className="h-16"></div>
                <p className="font-bold underline">......................................</p>
              </div>
              <div>
                <p className="text-stone-500">اعتماد إدارة اليامامة للفاكهة والتوريد:</p>
                <div className="h-16"></div>
                <p className="font-bold underline">......................................</p>
              </div>
            </div>

          </div>

          {/* Quick FAQ info & user assistant cards */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 no-print">
            <h4 className="font-black text-xs text-slate-800 mb-2 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-slate-500" />
              <span>دليل معايير احتساب الأرباح بقسم المالية لليامامة:</span>
            </h4>
            <ul className="text-[11px] text-stone-600 space-y-2 leading-relaxed list-disc list-inside">
              <li>
                <b>الربح الإجمالي (Gross Profit):</b> يحسب من خلال طرح (تكلفة شراء بضائع الفاتورة المباعة) من (مجموع مبيعات الفواتير الصادرة للعميل).
              </li>
              <li>
                <b>سعر تكلفة المنتجات:</b> يتم الحصول عليه تلقائياً من خزان التسعير والتخزين الحالي للدرجة والنوع المقيدين. في حال عدم وجود سعر شراء مسبق يتم الرجوع لمتوسط الشراء لنفس الثمرة أو احتساب هامش شراء قياسي لمطابقة الجودة.
              </li>
              <li>
                <b>المنصرفات والعموميات العامة:</b> يتم جلف كافة المصاريف الجبرية (الإيجار، المرتبات الميدانية، الكهرباء وعوامل الصيانة) وعرض مكمن الربح الصافي لك ليكون حكيماً.
              </li>
            </ul>
          </div>

        </div>

      </div>

    </div>
  );
}
