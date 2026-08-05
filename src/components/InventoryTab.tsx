/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Database, 
  Tag, 
  Search, 
  Plus, 
  Edit3, 
  Trash2, 
  CheckCircle, 
  RefreshCw, 
  TrendingUp, 
  Barcode,
  X,
  AlertTriangle,
  RotateCcw,
  FileWarning
} from 'lucide-react';
import { 
  Product, 
  Region, 
  ProductType, 
  Grade, 
  Unit, 
  InventoryItem, 
  ProductPrice,
  User
} from '../types';
import { formatQty } from '../utils';

export interface DamagedItem {
  id: string;
  inventoryItemId: string;
  productId: string;
  productName: string;
  regionName: string;
  typeName: string;
  gradeName: string;
  unitName: string;
  qty: number;
  buyPrice: number;
  date: string;
  reason: string;
  accountantName?: string;
}

interface InventoryTabProps {
  products: Product[];
  regions: Region[];
  productTypes: ProductType[];
  grades: Grade[];
  units: Unit[];
  inventory: InventoryItem[];
  prices: ProductPrice[];
  isRtl: boolean;
  onUpdateInventory: (updated: InventoryItem[]) => void;
  onUpdatePrices: (updated: ProductPrice[]) => void;
  triggerToast: (msg: string, typ?: 'success' | 'err') => void;
  currentUser?: User | null;
}

export default function InventoryTab({
  products,
  regions,
  productTypes,
  grades,
  units,
  inventory,
  prices,
  isRtl,
  onUpdateInventory,
  onUpdatePrices,
  triggerToast,
  currentUser
}: InventoryTabProps) {
  // Tri-pane view selector
  const [pane, setPane] = useState<'stock' | 'p_manager' | 'damaged'>('stock');

  // Search parameters
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals state
  const [showStockModal, setShowStockModal] = useState<boolean>(false);
  const [showPriceModal, setShowPriceModal] = useState<boolean>(false);
  const [showDamagedModal, setShowDamagedModal] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  // Damaged state
  const [damagedItems, setDamagedItems] = useState<DamagedItem[]>(() => {
    const saved = localStorage.getItem('erp_damaged_items');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse erp_damaged_items:", e);
      }
    }
    return [];
  });

  React.useEffect(() => {
    localStorage.setItem('erp_damaged_items', JSON.stringify(damagedItems));
  }, [damagedItems]);

  // Damaged Form state
  const [damagedInventoryId, setDamagedInventoryId] = useState<string>('');
  const [damagedQty, setDamagedQty] = useState<string>('1');
  const [damagedReason, setDamagedReason] = useState<string>('تلف طبيعي ورطوبة');
  const [damagedDate, setDamagedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Stock Form state
  const [stockProductId, setStockProductId] = useState<string>(products[0]?.id || '');
  const [stockRegion, setStockRegion] = useState<string>(regions[0]?.name || '');
  const [stockType, setStockType] = useState<string>(productTypes[0]?.name || '');
  const [stockGrade, setStockGrade] = useState<string>(grades[0]?.name || '');
  const [stockUnit, setStockUnit] = useState<string>(units[0]?.name || '');
  const [stockQty, setStockQty] = useState<string>('1');
  const [stockBuyPrice, setStockBuyPrice] = useState<string>('0');
  const [stockSellPrice, setStockSellPrice] = useState<string>('0');

  // Price Form State
  const [priceProductId, setPriceProductId] = useState<string>(products[0]?.id || '');
  const [priceRegion, setPriceRegion] = useState<string>(regions[0]?.name || '');
  const [priceType, setPriceType] = useState<string>(productTypes[0]?.name || '');
  const [priceGrade, setPriceGrade] = useState<string>(grades[0]?.name || '');
  const [pRetail, setPRetail] = useState<string>('');
  const [pWholesale, setPWholesale] = useState<string>('');
  const [pSpecial, setPSpecial] = useState<string>('');
  const [pOffer, setPOffer] = useState<string>('');

  // Filtered lists
  const filteredInventory = inventory.filter(itm => {
    const term = searchQuery.toLowerCase();
    return (
      itm.productName.toLowerCase().includes(term) ||
      itm.regionName.toLowerCase().includes(term) ||
      itm.typeName.toLowerCase().includes(term)
    );
  });

  const filteredPrices = prices.filter(pr => {
    const term = searchQuery.toLowerCase();
    return (
      pr.productName.toLowerCase().includes(term) ||
      pr.regionName.toLowerCase().includes(term) ||
      pr.typeName.toLowerCase().includes(term)
    );
  });

  const filteredDamaged = damagedItems.filter(itm => {
    const term = searchQuery.toLowerCase();
    return (
      itm.productName.toLowerCase().includes(term) ||
      itm.regionName.toLowerCase().includes(term) ||
      itm.typeName.toLowerCase().includes(term) ||
      itm.reason.toLowerCase().includes(term)
    );
  });

  const handleSaveDamaged = (e: React.FormEvent) => {
    e.preventDefault();
    const qtyNum = parseFloat(damagedQty);

    if (isNaN(qtyNum) || qtyNum <= 0) {
      triggerToast("يرجى إدخال كمية تالفة صحيحة أكبر من الصفر", "err");
      return;
    }

    const selectedInvItem = inventory.find(itm => itm.id === damagedInventoryId);
    if (!selectedInvItem) {
      triggerToast("يرجى اختيار صنف صحيح من القائمة", "err");
      return;
    }

    if (qtyNum > selectedInvItem.qty) {
      triggerToast(`الكمية التالفة المدخلة (${qtyNum}) أكبر من الكمية المتاحة بالرف حالياً (${selectedInvItem.qty})`, "err");
      return;
    }

    // 1. Deduct directly from the inventory
    const updatedInventory = inventory.map(itm => {
      if (itm.id === selectedInvItem.id) {
        return {
          ...itm,
          qty: itm.qty - qtyNum
        };
      }
      return itm;
    });

    // 2. Add to damagedItems list
    const newDamaged: DamagedItem = {
      id: `dam-${Date.now()}`,
      inventoryItemId: selectedInvItem.id,
      productId: selectedInvItem.productId,
      productName: selectedInvItem.productName,
      regionName: selectedInvItem.regionName,
      typeName: selectedInvItem.typeName,
      gradeName: selectedInvItem.gradeName,
      unitName: selectedInvItem.unitName,
      qty: qtyNum,
      buyPrice: selectedInvItem.buyPrice,
      date: damagedDate || new Date().toISOString().split('T')[0],
      reason: damagedReason.trim() || 'تلف طبيعي ورطوبة',
      accountantName: currentUser?.fullName || 'المحاسب الميرزا'
    };

    setDamagedItems([newDamaged, ...damagedItems]);
    onUpdateInventory(updatedInventory);
    setShowDamagedModal(false);
    triggerToast(`⚠️ تم خصم (${qtyNum} ${selectedInvItem.unitName}) تالف من الصنف ${selectedInvItem.productName} بنجاح`, "success");
  };

  const handleRevertDamaged = (dam: DamagedItem) => {
    if (window.confirm("هل أنت متأكد من إلغاء قيد هذا التالف وإعادة الكمية إلى رصيد المخزن الفعال؟")) {
      const updatedInventory = [...inventory];
      const idx = updatedInventory.findIndex(itm => itm.id === dam.inventoryItemId);

      if (idx >= 0) {
        updatedInventory[idx] = {
          ...updatedInventory[idx],
          qty: updatedInventory[idx].qty + dam.qty
        };
      } else {
        // Find by exact combo characteristics if the specific row id isn't there
        const comboIdx = updatedInventory.findIndex(itm => 
          itm.productId === dam.productId &&
          itm.regionName === dam.regionName &&
          itm.typeName === dam.typeName &&
          itm.gradeName === dam.gradeName &&
          itm.unitName === dam.unitName
        );

        if (comboIdx >= 0) {
          updatedInventory[comboIdx] = {
            ...updatedInventory[comboIdx],
            qty: updatedInventory[comboIdx].qty + dam.qty
          };
        } else {
          // recreate the inventory item if completely deleted
          updatedInventory.push({
            id: dam.inventoryItemId,
            productId: dam.productId,
            productName: dam.productName,
            regionName: dam.regionName,
            typeName: dam.typeName,
            gradeName: dam.gradeName,
            unitName: dam.unitName,
            qty: dam.qty,
            buyPrice: dam.buyPrice,
            sellPrice: dam.buyPrice * 1.3
          });
        }
      }

      setDamagedItems(damagedItems.filter(d => d.id !== dam.id));
      onUpdateInventory(updatedInventory);
      triggerToast(`🔄 تم إلغاء قيد التالف واسترجاع المعاينة للمخزن بنجاح`, "success");
    }
  };

  const handleTriggerEditStock = (itm: InventoryItem) => {
    setEditingItem(itm);
    setStockProductId(itm.productId);
    setStockRegion(itm.regionName);
    setStockType(itm.typeName);
    setStockGrade(itm.gradeName);
    setStockUnit(itm.unitName);
    setStockQty(itm.qty.toString());
    setStockBuyPrice(itm.buyPrice.toString());
    setStockSellPrice(itm.sellPrice.toString());
    setShowStockModal(true);
  };

  const handleSaveStock = (e: React.FormEvent) => {
    e.preventDefault();
    const qtyNum = parseFloat(stockQty);
    const buyNum = parseFloat(stockBuyPrice);
    const sellNum = parseFloat(stockSellPrice);

    if (isNaN(qtyNum) || isNaN(buyNum) || isNaN(sellNum) || qtyNum < 0) {
      alert("يرجى إدخال قيم صحيحة للمخزون");
      return;
    }

    const pObj = products.find(p => p.id === stockProductId);
    const pName = pObj?.name || 'فاكهة';

    let updated = [...inventory];

    if (editingItem) {
      updated = updated.map(itm => {
        if (itm.id === editingItem.id) {
          return {
            ...itm,
            productId: stockProductId,
            productName: pName,
            regionName: stockRegion,
            typeName: stockType,
            gradeName: stockGrade,
            unitName: stockUnit,
            qty: qtyNum,
            buyPrice: buyNum,
            sellPrice: sellNum
          };
        }
        return itm;
      });
      setEditingItem(null);
    } else {
      // Check if combo already exists
      const existingIndex = inventory.findIndex(itm => 
        itm.productId === stockProductId &&
        itm.regionName === stockRegion &&
        itm.typeName === stockType &&
        itm.gradeName === stockGrade &&
        itm.unitName === stockUnit
      );

      if (existingIndex >= 0) {
        updated[existingIndex] = {
          ...updated[existingIndex],
          qty: updated[existingIndex].qty + qtyNum,
          buyPrice: buyNum,
          sellPrice: sellNum
        };
      } else {
        updated.push({
          id: `inv-${Date.now()}`,
          productId: stockProductId,
          productName: pName,
          regionName: stockRegion,
          typeName: stockType,
          gradeName: stockGrade,
          unitName: stockUnit,
          qty: qtyNum,
          buyPrice: buyNum,
          sellPrice: sellNum
        });
      }
    }

    onUpdateInventory(updated);
    setShowStockModal(false);
    triggerToast("تم تحديث وجرد المخزون بنجاح واحتساب البنود");
  };

  const handleSavePrice = (e: React.FormEvent) => {
    e.preventDefault();
    const retVal = parseFloat(pRetail);
    const whoVal = parseFloat(pWholesale);
    const speVal = parseFloat(pSpecial);
    const offVal = parseFloat(pOffer);

    if (isNaN(retVal) || isNaN(whoVal) || isNaN(speVal) || isNaN(offVal)) {
      alert("يرجى ملء كافة خانات الأسعار بقيم صحيحة");
      return;
    }

    const pObj = products.find(p => p.id === priceProductId);
    const pName = pObj?.name || 'فاكهة';

    const existingIndex = prices.findIndex(p => 
      p.productId === priceProductId &&
      p.regionName === priceRegion &&
      p.typeName === priceType &&
      p.gradeName === priceGrade
    );

    let updated = [...prices];
    const newPrice: ProductPrice = {
      id: existingIndex >= 0 ? updated[existingIndex].id : `pr-${Date.now()}`,
      productId: priceProductId,
      productName: pName,
      regionName: priceRegion,
      typeName: priceType,
      gradeName: priceGrade,
      priceRetail: retVal,
      priceWholesale: whoVal,
      priceSpecial: speVal,
      priceOffer: offVal
    };

    if (existingIndex >= 0) {
      updated[existingIndex] = newPrice;
    } else {
      updated.push(newPrice);
    }

    onUpdatePrices(updated);
    setShowPriceModal(false);
    triggerToast("تم تدوين وتعميد أسعار المبيعات الخاصة بالصنف");
  };

  const handleDeleteInventory = (id: string) => {
    if (window.confirm("هل تريد حذف هذا البند من الدفاتر نهائياً لتصفير الرف المالي؟")) {
      onUpdateInventory(inventory.filter(itm => itm.id !== id));
      triggerToast("تم تصفير وحذف الصنف");
    }
  };

  const handleDeletePrice = (id: string) => {
    if (window.confirm("هل تريد حذف خطة الأسعار هذه للصنف؟")) {
      onUpdatePrices(prices.filter(p => p.id !== id));
      triggerToast("تم حذف باقة تسعير الصنف");
    }
  };

  const handleLoadStockItemToPrice = (itm: InventoryItem) => {
    setPriceProductId(itm.productId);
    setPriceRegion(itm.regionName);
    setPriceType(itm.typeName);
    setPriceGrade(itm.gradeName);
    
    // Autofill initial fallbacks
    setPRetail(itm.sellPrice.toString());
    setPWholesale(Math.round(itm.sellPrice * 0.85).toString());
    setPSpecial(Math.round(itm.sellPrice * 0.82).toString());
    setPOffer(Math.round(itm.sellPrice * 0.78).toString());
    
    setShowPriceModal(true);
  };

  return (
    <div className="flex flex-col gap-4 animate-fade-in" dir={isRtl ? 'rtl' : 'ltr'}>
      
      {/* Tab Switcher and Actions Pane */}
      <div className="bg-slate-900 text-white rounded-xl shadow-xs p-3 flex flex-col md:flex-row justify-between items-center gap-3">
        
        <div className="flex bg-slate-800 p-0.5 rounded-lg border border-slate-700 select-none w-full md:w-auto">
          <button
            onClick={() => { setPane('stock'); setSearchQuery(''); }}
            className={`flex-1 md:flex-none px-4 py-1.5 rounded-md font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer ${
              pane === 'stock' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-300 hover:text-white'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>إرسالية المستودع والرف الفعال (Live Stock)</span>
          </button>
          
          <button
            onClick={() => { setPane('p_manager'); setSearchQuery(''); }}
            className={`flex-1 md:flex-none px-4 py-1.5 rounded-md font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer ${
              pane === 'p_manager' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-300 hover:text-white'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>مدير أسعار المعاملات (جملة - قطاعي - خاص)</span>
          </button>

          <button
            onClick={() => { setPane('damaged'); setSearchQuery(''); }}
            className={`flex-1 md:flex-none px-4 py-1.5 rounded-md font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer ${
              pane === 'damaged' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-300 hover:text-white'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>إدارة التالف والهلاك (Damaged Stock)</span>
          </button>
        </div>

        {/* Global actions */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          {/* Active Search */}
          <div className="relative w-full max-w-[200px]">
            <span className="absolute inset-y-0 right-2 flex items-center text-slate-400">
              <Search className="w-3.5 h-3.5" />
            </span>
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث بالاسم أو المنشأ..."
              className="bg-slate-800 text-slate-100 placeholder-slate-400 border border-slate-700 rounded-md pr-7 pl-3 py-1 text-xs outline-none w-full focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {pane === 'stock' && (
            <button
              onClick={() => {
                setStockProductId(products[0]?.id || '');
                setStockQty('100');
                setStockBuyPrice('5000');
                setStockSellPrice('7000');
                setShowStockModal(true);
              }}
              className="bg-blue-600 hover:bg-blue-500 font-bold text-xs px-3 py-1.5 rounded-md flex items-center gap-1 flex-shrink-0 cursor-pointer text-white shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>جرد مخزون جديد (توريد مباشر)</span>
            </button>
          )}

          {pane === 'p_manager' && (
            <button
              onClick={() => {
                setPriceProductId(products[0]?.id || '');
                setPRetail('9000');
                setPWholesale('8000');
                setPSpecial('7500');
                setPOffer('7000');
                setShowPriceModal(true);
              }}
              className="bg-emerald-600 hover:bg-emerald-500 font-bold text-xs px-3 py-1.5 rounded-md flex items-center gap-1 flex-shrink-0 cursor-pointer text-white shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إدراج حزمة مبيعات جديدة</span>
            </button>
          )}

          {pane === 'damaged' && (
            <button
              onClick={() => {
                if (inventory.length > 0) {
                  setDamagedInventoryId(inventory[0].id);
                } else {
                  setDamagedInventoryId('');
                }
                setDamagedQty('1');
                setDamagedReason('تلف طبيعي ورطوبة');
                setDamagedDate(new Date().toISOString().split('T')[0]);
                setShowDamagedModal(true);
              }}
              className="bg-rose-600 hover:bg-rose-500 font-bold text-xs px-3 py-1.5 rounded-md flex items-center gap-1 flex-shrink-0 cursor-pointer text-white shadow-sm"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>تسجيل تالف جديد</span>
            </button>
          )}
        </div>

      </div>

      {pane === 'stock' && (
        /* PANE 1: ACTIVE LIVE STOCK */
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
          <div className="overflow-auto max-h-[500px]">
            <table className="w-full text-xs md:text-sm text-right border-collapse select-none">
              <thead className="bg-slate-100 text-slate-600 font-extrabold sticky top-0 border-b border-slate-200 z-10">
                <tr>
                  <th className="p-3 text-center w-[120px]">كود جرد الصنف</th>
                  <th className="p-3">اسم الفاكهة كلياً</th>
                  <th className="p-3 text-center w-[100px]">المنشأ / المنطقة</th>
                  <th className="p-3 text-center w-[100px]">التصنيف والنوع</th>
                  <th className="p-3 text-center w-[100px]">الدرجة ريف</th>
                  <th className="p-3 text-center w-[90px]">الوحدة</th>
                  <th className="p-3 text-center w-[110px]">الكمية الحالية بالرف</th>
                  <th className="p-3 text-center w-[110px]">سعر الشراء (تاريخي)</th>
                  <th className="p-3 text-center w-[110px]">سعر البيع (قطاعي افتراضي)</th>
                  <th className="p-3 text-center w-[130px] no-print">الإجراء السريع</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-bold">
                {filteredInventory.length > 0 ? (
                  filteredInventory.map(itm => (
                    <tr key={itm.id} className="hover:bg-slate-50/50">
                      <td className="p-3 text-center text-slate-400 font-mono text-xs">#{itm.id.slice(-6).toUpperCase()}</td>
                      <td className="p-3 text-slate-900 font-black">{itm.productName}</td>
                      <td className="p-3 text-center text-blue-700 bg-blue-50/25">{itm.regionName}</td>
                      <td className="p-3 text-center text-slate-600">{itm.typeName}</td>
                      <td className="p-3 text-center text-amber-700 bg-amber-50/25">{itm.gradeName}</td>
                      <td className="p-3 text-center text-slate-500">{itm.unitName}</td>
                      <td className={`p-3 text-center font-mono font-black text-xs ${itm.qty <= 50 ? 'text-red-600 bg-red-50/30' : 'text-slate-900'}`}>
                        {formatQty(itm.qty)}
                      </td>
                      <td className="p-3 text-center font-mono text-xs text-slate-500">
                        {itm.buyPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })} جنيه
                      </td>
                      <td className="p-3 text-center font-mono text-xs text-emerald-650">
                        {itm.sellPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })} جنيه
                      </td>
                      <td className="p-3 text-center no-print">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleLoadStockItemToPrice(itm)}
                            className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 px-2 py-1 text-[10px] rounded flex items-center gap-0.5 cursor-pointer font-black"
                            title="تحديد سياسات وباقات أسعار (جملة - قطاعي)"
                          >
                            <Tag className="w-3 h-3" />
                            <span>سعر الآن</span>
                          </button>
                          <button
                            onClick={() => handleTriggerEditStock(itm)}
                            className="bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 p-1 rounded cursor-pointer"
                            title="تعديل بند جرد المخزن"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteInventory(itm.id)}
                            className="text-stone-400 hover:text-red-700 p-1 cursor-pointer"
                            title="حذف البند تماماً"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-400">
                      لا يوجد أي أصناف فاكهة مدونة بالمخزن حالياً أو لا تطابق بحثك.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {pane === 'p_manager' && (
        /* PANE 2: SALES PRICE MANAGER */
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
          <div className="overflow-auto max-h-[500px]">
            <table className="w-full text-xs md:text-sm text-right border-collapse select-none">
              <thead className="bg-slate-100 text-slate-600 font-extrabold sticky top-0 border-b border-slate-200 z-10">
                <tr>
                  <th className="p-3">اسم الفاكهة والنوع</th>
                  <th className="p-3 text-center w-[120px]">المنطقة / المنشأ</th>
                  <th className="p-3 text-center w-[120px]">التصنيف</th>
                  <th className="p-3 text-center w-[120px]">الدرجة</th>
                  <th className="p-3 text-center w-[120px] text-blue-700 bg-blue-50/50">سعر قطاعى (Retail)</th>
                  <th className="p-3 text-center w-[120px] text-emerald-700 bg-emerald-50/50">سعر جملة (Wholesale)</th>
                  <th className="p-3 text-center w-[120px] text-purple-700 bg-purple-50/50">سعر خاص (Special)</th>
                  <th className="p-3 text-center w-[120px] text-amber-700 bg-amber-50/50">سعر عرض (Offer)</th>
                  <th className="p-3 text-center w-[100px] no-print">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-bold">
                {filteredPrices.length > 0 ? (
                  filteredPrices.map(pr => (
                    <tr key={pr.id} className="hover:bg-slate-50/55">
                      <td className="p-3 text-slate-900 font-black">{pr.productName}</td>
                      <td className="p-3 text-center text-blue-700 bg-blue-50/15">{pr.regionName}</td>
                      <td className="p-3 text-center text-slate-600">{pr.typeName}</td>
                      <td className="p-3 text-center text-amber-700 bg-amber-50/15">{pr.gradeName}</td>
                      
                      {/* Pricing Scales */}
                      <td className="p-3 text-center font-mono text-slate-800 bg-blue-50/10">
                        {pr.priceRetail.toLocaleString('en-US', { minimumFractionDigits: 2 })} جنيه
                      </td>
                      <td className="p-3 text-center font-mono text-emerald-650 bg-emerald-50/10">
                        {pr.priceWholesale.toLocaleString('en-US', { minimumFractionDigits: 2 })} جنيه
                      </td>
                      <td className="p-3 text-center font-mono text-purple-700 bg-purple-50/10">
                        {pr.priceSpecial.toLocaleString('en-US', { minimumFractionDigits: 2 })} جنيه
                      </td>
                      <td className="p-3 text-center font-mono text-amber-600 bg-amber-50/10">
                        {pr.priceOffer.toLocaleString('en-US', { minimumFractionDigits: 2 })} جنيه
                      </td>

                      <td className="p-3 text-center no-print">
                        <button
                          onClick={() => handleDeletePrice(pr.id)}
                          className="text-stone-400 hover:text-red-700 p-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      لا توجد لوائح تسعير مدمجة للأصناف حالياً. يمكنك ترحيل باقة جديدة أو النقر على "سعر الآن" بجانب بند المخزن.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {pane === 'damaged' && (
        /* PANE 3: DAMAGED ITEMS MANAGER */
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden text-right" dir="rtl">
          {/* Top Info Stat Widgets for Loss Summary */}
          <div className="bg-rose-50 border-b border-rose-100 p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-rose-500 text-white rounded-lg">
                <FileWarning className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-rose-900">سجل التالف العام للفاكهة</h4>
                <p className="text-[11px] text-rose-700/80 font-bold mt-0.5">البنود التي تعرضت للتلف، العفن أو أضرار النقل وتم خصمها مباشرة من رفوف المستودع الفعالة.</p>
              </div>
            </div>
            
            {/* Dynamic Stat count */}
            <div className="flex gap-4 self-stretch md:self-auto justify-between md:justify-end">
              <div className="bg-white px-4 py-2 rounded-lg border border-rose-200 text-center select-none">
                <div className="text-[10px] text-slate-400 font-bold">إجمالي كميات الهلاك</div>
                <div className="text-sm font-black font-mono text-rose-600 mt-0.5">
                  {filteredDamaged.reduce((acc, curr) => acc + curr.qty, 0).toLocaleString('en-US')}
                </div>
              </div>
              <div className="bg-white px-4 py-2 rounded-lg border border-rose-200 text-center select-none">
                <div className="text-[10px] text-slate-400 font-bold">خسائر التكلفة المقدرة</div>
                <div className="text-sm font-black font-mono text-red-600 mt-0.5">
                  {filteredDamaged.reduce((acc, curr) => acc + (curr.qty * curr.buyPrice), 0).toLocaleString('en-US', { minimumFractionDigits: 1 })} جنيه
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-auto max-h-[500px]">
            <table className="w-full text-xs md:text-sm text-right border-collapse select-none">
              <thead className="bg-slate-100 text-slate-600 font-extrabold sticky top-0 border-b border-slate-200 z-10">
                <tr>
                  <th className="p-3 text-center w-[120px]">كود الهلاك</th>
                  <th className="p-3">اسم الصنف التالف</th>
                  <th className="p-3 text-center w-[110px]">المنشأ / المنطقة</th>
                  <th className="p-3 text-center w-[110px]">التصنيف والنوع</th>
                  <th className="p-3 text-center w-[100px]">الدرجة</th>
                  <th className="p-3 text-center w-[110px]">الكمية التالفة</th>
                  <th className="p-3 text-center w-[110px]">تكلفة الوحدة (تاريخي)</th>
                  <th className="p-3 text-center w-[120px] text-red-700 bg-red-50/30">إجمالي قيمة التلف</th>
                  <th className="p-3 text-center w-[100px]">التاريخ</th>
                  <th className="p-3 text-center">وسم وتفصيل السبب</th>
                  <th className="p-3 text-center w-[110px]">المسجل</th>
                  <th className="p-3 text-center w-[110px] no-print">الإجراء السريع</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-bold">
                {filteredDamaged.length > 0 ? (
                  filteredDamaged.map(dam => (
                     <tr key={dam.id} className="hover:bg-slate-50/50">
                       <td className="p-3 text-center text-slate-400 font-mono text-xs">#DM-{dam.id.slice(-6).toUpperCase()}</td>
                       <td className="p-3 text-slate-900 font-black">{dam.productName}</td>
                       <td className="p-3 text-center text-blue-700 bg-blue-50/25">{dam.regionName}</td>
                       <td className="p-3 text-center text-slate-600">{dam.typeName}</td>
                       <td className="p-3 text-center text-amber-500 bg-amber-50/25">{dam.gradeName}</td>
                       <td className="p-3 text-center text-rose-600 font-mono font-black">
                         - {dam.qty.toLocaleString('en-US')} {dam.unitName}
                       </td>
                       <td className="p-3 text-center font-mono text-xs text-slate-500">
                         {dam.buyPrice.toLocaleString('en-US', { minimumFractionDigits: 1 })} جنيه
                       </td>
                       <td className="p-3 text-center font-mono text-xs text-red-600 bg-red-50/15">
                         {(dam.qty * dam.buyPrice).toLocaleString('en-US', { minimumFractionDigits: 1 })} جنيه
                       </td>
                       <td className="p-3 text-center font-mono text-slate-500 text-xs">{dam.date}</td>
                       <td className="p-3 text-center text-slate-700 max-w-[150px] truncate" title={dam.reason}>
                         {dam.reason}
                       </td>
                       <td className="p-3 text-center text-slate-500 text-[11px] truncate" title={dam.accountantName}>
                         {dam.accountantName || 'المحاسب الميرزا'}
                       </td>
                       <td className="p-3 text-center no-print">
                         <button
                           onClick={() => handleRevertDamaged(dam)}
                           className="bg-slate-100 hover:bg-rose-100 text-rose-700 border border-slate-300 hover:border-rose-300 px-2 py-1 text-[10px] rounded flex items-center justify-center gap-1 cursor-pointer font-black mx-auto transition-colors"
                           title="إلغاء قيد هذا التالف وإرجاع البضاعة للرف الفعال"
                         >
                           <RotateCcw className="w-3 h-3" />
                           <span>تراجع وإرجاع</span>
                         </button>
                       </td>
                     </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={12} className="py-12 text-center text-slate-400">
                      لا توجد سحوبات تالف أو هلاك مسجلة حالياً تطابق بحثك.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-MODAL A: INVENTORY MANUAL STORAGE ENTRY */}
      {showStockModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in no-print">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-md overflow-hidden transform scale-100 transition-transform">
            <div className="bg-slate-900 text-white p-4 flex justify-between items-center select-none border-b border-slate-800">
              <h3 className="font-bold text-sm tracking-tight flex items-center gap-2">
                <Database className="w-4 h-4 text-blue-400" />
                <span>{editingItem ? 'تعديل جرد صنف المخزن برقم تسلسلي' : 'إدراج جرد كميات وتوريد يدوي للمخزن'}</span>
              </h3>
              <button onClick={() => { setShowStockModal(false); setEditingItem(null); }} className="text-slate-400 hover:text-white transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveStock} className="p-4 space-y-3.5 text-xs md:text-sm">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">صنف الفاكهة *</label>
                  <select value={stockProductId} onChange={(e) => setStockProductId(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 font-bold">
                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">المنطقة والمنشأ *</label>
                  <select value={stockRegion} onChange={(e) => setStockRegion(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 font-bold">
                    {regions.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">النوع *</label>
                  <select value={stockType} onChange={(e) => setStockType(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded px-1.5 py-1.5">
                    {productTypes.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">الدرجة *</label>
                  <select value={stockGrade} onChange={(e) => setStockGrade(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded px-1.5 py-1.5">
                    {grades.map(g => <option key={g.id} value={g.name}>{g.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">الوحدة *</label>
                  <select value={stockUnit} onChange={(e) => setStockUnit(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded px-1.5 py-1.5">
                    {units.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">الكمية المدخلة *</label>
                  <input type="number" step="any" min="0.001" required value={stockQty} onChange={(e) => setStockQty(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-center font-bold font-mono" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">سعر الشراء (تاريخي) *</label>
                  <input type="number" required value={stockBuyPrice} onChange={(e) => setStockBuyPrice(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-center font-bold font-mono" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">البيع الافتراضي *</label>
                  <input type="number" required value={stockSellPrice} onChange={(e) => setStockSellPrice(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-center font-bold font-mono" />
                </div>
              </div>

              <div className="pt-2.5 border-t border-slate-200 flex justify-end gap-2 text-xs">
                <button type="button" onClick={() => setShowStockModal(false)} className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded font-semibold cursor-pointer">إلغاء</button>
                <button type="submit" className="bg-blue-600 text-white px-4 py-1.5 rounded font-black cursor-pointer shadow-sm">توريد المخزون والرف</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUB-MODAL B: SALES PRICE BINDING MATRIX */}
      {showPriceModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in no-print">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-md overflow-hidden transform scale-100 transition-transform">
            <div className="bg-slate-900 text-white p-4 flex justify-between items-center select-none border-b border-slate-800">
              <h3 className="font-bold text-sm tracking-tight flex items-center gap-2">
                <Tag className="w-4 h-4 text-emerald-400" />
                <span>تسعير صنف ومعاملة للمبيعات</span>
              </h3>
              <button onClick={() => setShowPriceModal(false)} className="text-slate-400 hover:text-white transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSavePrice} className="p-4 space-y-3.5 text-xs md:text-sm">
              <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg select-none leading-relaxed text-slate-600">
                <p><strong>الصنف ومحددات القيمة:</strong></p>
                <p className="mt-0.5">
                  {products.find(p => p.id === priceProductId)?.name || 'فاكهة'} ({priceRegion}) — {priceType} | {priceGrade}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">البيع القطاعى *</label>
                  <input type="number" required value={pRetail} onChange={(e) => setPRetail(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 font-bold font-mono text-center text-blue-700" placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">البيع الجملة *</label>
                  <input type="number" required value={pWholesale} onChange={(e) => setPWholesale(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 font-bold font-mono text-center text-emerald-650" placeholder="0.00" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">السعر الخاص *</label>
                  <input type="number" required value={pSpecial} onChange={(e) => setPSpecial(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 font-bold font-mono text-center text-purple-700" placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">سعر العرض / الترويج *</label>
                  <input type="number" required value={pOffer} onChange={(e) => setPOffer(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 font-bold font-mono text-center text-amber-700" placeholder="0.00" />
                </div>
              </div>

              <div className="pt-2.5 border-t border-slate-200 flex justify-end gap-2 text-xs">
                <button type="button" onClick={() => setShowPriceModal(false)} className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded font-semibold cursor-pointer">إلغاء</button>
                <button type="submit" className="bg-emerald-600 text-white px-4 py-1.5 rounded font-black cursor-pointer shadow-sm">تثبيت باقات الأسعار للمبيعات</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUB-MODAL C: DAMAGED ITEM LOGGING */}
      {showDamagedModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in no-print" dir="rtl">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-md overflow-hidden transform scale-100 transition-transform">
            <div className="bg-slate-900 text-white p-4 flex justify-between items-center select-none border-b border-slate-800">
              <h3 className="font-bold text-sm tracking-tight flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-500 animate-pulse" />
                <span>تسجيل وإثبات تالف مباشر من المخزن</span>
              </h3>
              <button onClick={() => setShowDamagedModal(false)} className="text-slate-400 hover:text-white transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {inventory.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-xs font-bold space-y-3">
                <FileWarning className="w-12 h-12 text-amber-500 mx-auto" />
                <p>المخزن فارغ تماماً حالياً! لا يمكن تحديد بند تالف لخصمه.</p>
                <button type="button" onClick={() => setShowDamagedModal(false)} className="bg-slate-100 text-slate-700 px-4 py-1.5 rounded text-xs font-bold">إغلاق النافذة</button>
              </div>
            ) : (
              <form onSubmit={handleSaveDamaged} className="p-4 space-y-4 text-xs md:text-sm text-right">
                <div className="bg-amber-50 border border-amber-200 p-2.5 rounded text-amber-900 text-[11px] leading-relaxed select-none">
                  💡 تذكير: سيتم خصم الكمية التي تحددها فوراً من رصيد الرف الفعال للصنف المحدد وحساب خسائر تكلفة الهلاك.
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">اختر البند والمخزون المتاح بالرف *</label>
                  <select 
                    value={damagedInventoryId} 
                    onChange={(e) => {
                      setDamagedInventoryId(e.target.value);
                      const matching = inventory.find(itm => itm.id === e.target.value);
                      if (matching && parseInt(damagedQty) > matching.qty) {
                        setDamagedQty(matching.qty.toString());
                      }
                    }} 
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-2 font-bold focus:ring-1 focus:ring-rose-500 focus:outline-none text-slate-800"
                  >
                    {inventory.map(itm => (
                      <option key={itm.id} value={itm.id}>
                        {itm.productName} ({itm.regionName}) [{itm.typeName} - {itm.gradeName}] — المتاح بالرف ({itm.qty} {itm.unitName})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">الكمية التالفة *</label>
                    <input 
                      type="number" 
                      required 
                      min="1"
                      value={damagedQty} 
                      onChange={(e) => setDamagedQty(e.target.value)} 
                      className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-center font-black font-mono text-rose-600 text-sm" 
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">تاريخ الهلاك *</label>
                    <input 
                      type="date" 
                      required 
                      value={damagedDate} 
                      onChange={(e) => setDamagedDate(e.target.value)} 
                      className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-center font-bold font-mono text-slate-700" 
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">سبب التلف وملاحظات المعاينة *</label>
                  <select 
                    value={damagedReason} 
                    onChange={(e) => setDamagedReason(e.target.value)} 
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1.5 mb-2 focus:ring-1 focus:ring-rose-500 font-bold"
                  >
                    <option value="تلف طبيعي ورطوبة">تلف طبيعي ورطوبة</option>
                    <option value="عفن وفساد تخزين">عفن وفساد تخزين</option>
                    <option value="أضرار شحن وتفريغ">أضرار شحن وتفريغ</option>
                    <option value="هرس وضغط الصناديق">هرس وضغط الصناديق</option>
                    <option value="فساد بسبب الحرارة العالية">فساد بسبب الحرارة العالية</option>
                    <option value="منتهية الصلاحية / تالف رفوف">منتهية الصلاحية / تالف رفوف</option>
                    <option value="أخرى / تفصيل يدوي">ملاحظة وتفصيل مخصص...</option>
                  </select>
                  
                  {damagedReason === 'أخرى / تفصيل يدوي' && (
                    <input 
                      type="text" 
                      placeholder="اكتب سبب هلاك البضاعة بالتفصيل هنا واضغط حفظ..." 
                      className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-800"
                      onChange={(e) => {
                        // Store typed value locally under active input
                      }}
                      onBlur={(e) => {
                        if (e.target.value.trim()) {
                          setDamagedReason(e.target.value.trim());
                        }
                      }}
                    />
                  )}
                </div>

                <div className="pt-2.5 border-t border-slate-200 flex justify-end gap-2 text-xs">
                  <button type="button" onClick={() => setShowDamagedModal(false)} className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded font-semibold cursor-pointer">إلغاء</button>
                  <button type="submit" className="bg-rose-600 text-white px-4 py-1.5 rounded font-black cursor-pointer shadow-sm hover:bg-rose-500">تثبيت وخصم من المستودع</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
