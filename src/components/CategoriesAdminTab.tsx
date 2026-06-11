/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Tag, 
  MapPin, 
  Filter, 
  Award, 
  Scale, 
  Plus, 
  Trash2, 
  Edit3, 
  Save, 
  X,
  Search,
  Sparkles,
  Info
} from 'lucide-react';
import { 
  Product, 
  Region, 
  ProductType, 
  Grade, 
  Unit 
} from '../types';

interface CategoriesAdminTabProps {
  products: Product[];
  regions: Region[];
  productTypes: ProductType[];
  grades: Grade[];
  units: Unit[];
  onUpdateProducts: (updated: Product[]) => void;
  onUpdateRegions: (updated: Region[]) => void;
  onUpdateProductTypes: (updated: ProductType[]) => void;
  onUpdateGrades: (updated: Grade[]) => void;
  onUpdateUnits: (updated: Unit[]) => void;
  triggerToast: (msg: string, typ?: 'success' | 'err') => void;
}

type MetaType = 'products' | 'regions' | 'product_types' | 'grades' | 'units';

export default function CategoriesAdminTab({
  products,
  regions,
  productTypes,
  grades,
  units,
  onUpdateProducts,
  onUpdateRegions,
  onUpdateProductTypes,
  onUpdateGrades,
  onUpdateUnits,
  triggerToast
}: CategoriesAdminTabProps) {
  
  const [activeMetaTab, setActiveMetaTab] = useState<MetaType>('products');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Create state
  const [newItemName, setNewItemName] = useState<string>('');
  
  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>('');

  // Built-in Composer states
  const [previewPos1, setPreviewPos1] = useState<string>(products[0]?.name || 'برتقال');
  const [previewPos2, setPreviewPos2] = useState<string>(regions[0]?.name || 'شمالية');
  const [previewPos3, setPreviewPos3] = useState<string>(productTypes[0]?.name || 'شوايقة');
  const [previewPos4, setPreviewPos4] = useState<string>(grades[0]?.name || 'نمرة أولى');
  const [previewPos5, setPreviewPos5] = useState<string>(units[0]?.name || 'كرتونة');

  // Helpers to get list size
  const totalCounts = {
    products: products.length,
    regions: regions.length,
    product_types: productTypes.length,
    grades: grades.length,
    units: units.length,
  };

  // Generate ID helper
  const generateNewId = (prefix: string) => {
    return `${prefix}-${Date.now().toString().slice(-4)}`;
  };

  // Add Item
  const handleAddNewItem = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newItemName.trim();
    if (!cleanName) {
      triggerToast('يرجى كتابة اسم صحيح غير فارغ', 'err');
      return;
    }

    switch (activeMetaTab) {
      case 'products': {
        const exists = products.some(p => p.name === cleanName);
        if (exists) { triggerToast('هذا الصنف موجود بالفعل!', 'err'); return; }
        const newProduct = { id: generateNewId('p'), name: cleanName };
        onUpdateProducts([...products, newProduct]);
        setPreviewPos1(cleanName);
        triggerToast(`تمت إضافة الصنف "${cleanName}" بنجاح`);
        break;
      }
      case 'regions': {
        const exists = regions.some(r => r.name === cleanName);
        if (exists) { triggerToast('هذه المنطقة موجودة بالفعل!', 'err'); return; }
        const newRegion = { id: generateNewId('r'), name: cleanName };
        onUpdateRegions([...regions, newRegion]);
        setPreviewPos2(cleanName);
        triggerToast(`تمت إضافة المنطقة "${cleanName}" بنجاح`);
        break;
      }
      case 'product_types': {
        const exists = productTypes.some(t => t.name === cleanName);
        if (exists) { triggerToast('هذا التصنيف موجود بالفعل!', 'err'); return; }
        const newType = { id: generateNewId('t'), name: cleanName };
        onUpdateProductTypes([...productTypes, newType]);
        setPreviewPos3(cleanName);
        triggerToast(`تمت إضافة التصنيف "${cleanName}" بنجاح`);
        break;
      }
      case 'grades': {
        const exists = grades.some(g => g.name === cleanName);
        if (exists) { triggerToast('هذه الدرجة موجودة بالفعل!', 'err'); return; }
        const newGrade = { id: generateNewId('g'), name: cleanName };
        onUpdateGrades([...grades, newGrade]);
        setPreviewPos4(cleanName);
        triggerToast(`تمت إضافة الدرجة "${cleanName}" بنجاح`);
        break;
      }
      case 'units': {
        const exists = units.some(u => u.name === cleanName);
        if (exists) { triggerToast('هذه الوحدة موجودة بالفعل!', 'err'); return; }
        const newUnit = { id: generateNewId('u'), name: cleanName };
        onUpdateUnits([...units, newUnit]);
        setPreviewPos5(cleanName);
        triggerToast(`تمت إضافة الوحدة "${cleanName}" بنجاح`);
        break;
      }
    }
    setNewItemName('');
  };

  // Start Edit
  const handleStartEdit = (id: string, currentName: string) => {
    setEditingId(id);
    setEditingName(currentName);
  };

  // Save Edit
  const handleSaveEdit = (id: string) => {
    const cleanName = editingName.trim();
    if (!cleanName) {
      triggerToast('الاسم لا يمكن أن يكون فارغاً', 'err');
      return;
    }

    switch (activeMetaTab) {
      case 'products':
        onUpdateProducts(products.map(p => p.id === id ? { ...p, name: cleanName } : p));
        break;
      case 'regions':
        onUpdateRegions(regions.map(r => r.id === id ? { ...r, name: cleanName } : r));
        break;
      case 'product_types':
        onUpdateProductTypes(productTypes.map(t => t.id === id ? { ...t, name: cleanName } : t));
        break;
      case 'grades':
        onUpdateGrades(grades.map(g => g.id === id ? { ...g, name: cleanName } : g));
        break;
      case 'units':
        onUpdateUnits(units.map(u => u.id === id ? { ...u, name: cleanName } : u));
        break;
    }

    triggerToast('تم التعديل وحفظ البيانات الجديدة بنجاح');
    setEditingId(null);
    setEditingName('');
  };

  // Delete Item
  const handleDeleteItem = (id: string, name: string) => {
    const confirmed = window.confirm(`هل أنت متأكد من حذف "${name}" نهائياً من قائمة البيانات الأساسية؟`);
    if (!confirmed) return;

    switch (activeMetaTab) {
      case 'products':
        if (products.length <= 1) { triggerToast('لا يمكن حذف آخر صنف متبقي في النظام!', 'err'); return; }
        onUpdateProducts(products.filter(p => p.id !== id));
        break;
      case 'regions':
        if (regions.length <= 1) { triggerToast('لا يمكن حذف آخر منطقة متبقية في النظام!', 'err'); return; }
        onUpdateRegions(regions.filter(r => r.id !== id));
        break;
      case 'product_types':
        if (productTypes.length <= 1) { triggerToast('لا يمكن حذف آخر تصنيف متبقي في النظام!', 'err'); return; }
        onUpdateProductTypes(productTypes.filter(t => t.id !== id));
        break;
      case 'grades':
        if (grades.length <= 1) { triggerToast('لا يمكن حذف آخر درجة جودة متبقية في النظام!', 'err'); return; }
        onUpdateGrades(grades.filter(g => g.id !== id));
        break;
      case 'units':
        if (units.length <= 1) { triggerToast('لا يمكن حذف آخر وحدة قياس متبقية في النظام!', 'err'); return; }
        onUpdateUnits(units.filter(u => u.id !== id));
        break;
    }

    triggerToast(`تم حذف "${name}" بنجاح من النظام.`);
  };

  // Get current active array
  const getCurrentArray = () => {
    switch (activeMetaTab) {
      case 'products': return products;
      case 'regions': return regions;
      case 'product_types': return productTypes;
      case 'grades': return grades;
      case 'units': return units;
      default: return [];
    }
  };

  const getActiveTabTitle = () => {
    switch (activeMetaTab) {
      case 'products': return 'الأصناف الرئيسية (الفواكه)';
      case 'regions': return 'المناطق الجغرافية (المنشأ)';
      case 'product_types': return 'التصنيفات والأنواع';
      case 'grades': return 'درجات جودة الفاكهة';
      case 'units': return 'وحدات القياس والتغليف';
    }
  };

  const currentList = getCurrentArray().filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6" dir="rtl">
      
      {/* HEADER SECTION */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl" />
        <div className="absolute bottom-0 left-12 w-48 h-48 bg-teal-500/5 rounded-full blur-3xl animate-pulse" />
        
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5Packed font-black">
              <span className="bg-amber-400 text-slate-950 text-[10px] px-2 py-0.5 rounded font-mono">قاعدة البيانات</span>
              <span className="text-slate-400 text-xs">/ إدارة الصفات والهياكل المكملة</span>
            </div>
            <h1 className="text-xl md:text-2xl font-black text-white leading-tight">
              إدارة هيكلة ومسميات الفواكه والمنتجات المكتملة
            </h1>
            <p className="text-xs text-slate-300 mt-2 max-w-3xl leading-relaxed">
              هذه اللوحة مخصصة للتحكم الدقيق في كافة جزئيات الاسم المتكامل للفاكهة المودعة في المخازن أو المباعة في الفواتير. 
              يتكون مسمى السلعة تلقائياً في حسابات كشوف اليمامة من دمج هذه العناصر الخمسة: 
              <strong className="text-amber-400 font-bold mx-1">الصنف + المنطقة + التصنيف + الدرجة + وحدة القياس</strong> لضمان حوسبة وطباعة مهنية خالية من الأخطاء.
            </p>
          </div>
        </div>
      </div>

      {/* METADATA CONFIGURATION GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* RIGHT SIDEBAR: NAVIGATION TABS AND ADD BOX */}
        <div className="lg:col-span-4 space-y-5">
          
          {/* TABS SELECTOR */}
          <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-sm space-y-1">
            <h3 className="font-black text-xs text-slate-800 pr-1 pb-2">فئات التسمية المتكاملة</h3>
            
            <button
              onClick={() => { setActiveMetaTab('products'); setSearchQuery(''); }}
              className={`w-full text-right px-3.5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-between transition-all ${
                activeMetaTab === 'products'
                  ? 'bg-slate-900 text-amber-400 shadow-sm font-black'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <Tag className={`w-4 h-4 ${activeMetaTab === 'products' ? 'text-amber-400' : 'text-blue-500'}`} />
                <span>1. الأصناف الرئيسية (الفاكهة)</span>
              </div>
              <span className="text-[10px] bg-slate-100 text-slate-600 font-mono px-1.5 py-0.5 rounded-md">
                {totalCounts.products}
              </span>
            </button>

            <button
              onClick={() => { setActiveMetaTab('regions'); setSearchQuery(''); }}
              className={`w-full text-right px-3.5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-between transition-all ${
                activeMetaTab === 'regions'
                  ? 'bg-slate-900 text-amber-400 shadow-sm font-black'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <MapPin className={`w-4 h-4 ${activeMetaTab === 'regions' ? 'text-amber-400' : 'text-emerald-500'}`} />
                <span>2. منشأ الفاكهة (المناطق الجغرافية)</span>
              </div>
              <span className="text-[10px] bg-slate-100 text-slate-600 font-mono px-1.5 py-0.5 rounded-md">
                {totalCounts.regions}
              </span>
            </button>

            <button
              onClick={() => { setActiveMetaTab('product_types'); setSearchQuery(''); }}
              className={`w-full text-right px-3.5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-between transition-all ${
                activeMetaTab === 'product_types'
                  ? 'bg-slate-900 text-amber-400 shadow-sm font-black'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <Filter className={`w-4 h-4 ${activeMetaTab === 'product_types' ? 'text-amber-400' : 'text-purple-500'}`} />
                <span>3. تصنيفات الفاكهة (التوعية)</span>
              </div>
              <span className="text-[10px] bg-slate-100 text-slate-600 font-mono px-1.5 py-0.5 rounded-md">
                {totalCounts.product_types}
              </span>
            </button>

            <button
              onClick={() => { setActiveMetaTab('grades'); setSearchQuery(''); }}
              className={`w-full text-right px-3.5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-between transition-all ${
                activeMetaTab === 'grades'
                  ? 'bg-slate-900 text-amber-400 shadow-sm font-black'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <Award className={`w-4 h-4 ${activeMetaTab === 'grades' ? 'text-amber-400' : 'text-orange-500'}`} />
                <span>4. درجات الجودة النوعية</span>
              </div>
              <span className="text-[10px] bg-slate-100 text-slate-600 font-mono px-1.5 py-0.5 rounded-md">
                {totalCounts.grades}
              </span>
            </button>

            <button
              onClick={() => { setActiveMetaTab('units'); setSearchQuery(''); }}
              className={`w-full text-right px-3.5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-between transition-all ${
                activeMetaTab === 'units'
                  ? 'bg-slate-900 text-amber-400 shadow-sm font-black'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <Scale className={`w-4 h-4 ${activeMetaTab === 'units' ? 'text-amber-400' : 'text-rose-500'}`} />
                <span>5. وحدات القياس والتعبئة</span>
              </div>
              <span className="text-[10px] bg-slate-100 text-slate-600 font-mono px-1.5 py-0.5 rounded-md">
                {totalCounts.units}
              </span>
            </button>

          </div>

          {/* ADD BOX CONTAINER */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <Plus className="w-4.5 h-4.5 text-slate-800" />
              <h4 className="font-black text-xs text-slate-800">إضافة عنصر جديد</h4>
            </div>

            <form onSubmit={handleAddNewItem} className="space-y-3.5">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">
                  الاسم المطلوب إضافته إلى قائمة {getActiveTabTitle()}
                </label>
                <input
                  type="text"
                  required
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder={`مثال: جديد...`}
                  className="w-full text-xs font-bold border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-hidden focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-slate-900 hover:bg-slate-850 text-white font-black text-xs py-2.5 rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-all"
              >
                <Plus className="w-4 h-4 text-amber-400" />
                <span>تأكيد الإضافة السريعة</span>
              </button>
            </form>
          </div>

        </div>

        {/* LEFT SIDEBAR: ITEMS LIST AND COMPOSER PREVIEW */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* ACTIVE MANAGEMENT PANEL */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            
            {/* PANEL TITLE AND SEARCH INPUT */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h2 className="font-black text-sm text-slate-900">{getActiveTabTitle()}</h2>
                <p className="text-[10px] text-slate-400 mt-0.5">تعديل التسميات أو تصفيتها أو حذفها من قائمة الاختيارات بالفواتير</p>
              </div>
              
              {/* MINI SEARCH BAR */}
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="بحث سريع عن الاسم..."
                  className="w-full text-[11px] font-bold border border-slate-200 rounded-xl pr-9 pl-3.5 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                />
              </div>
            </div>

            {/* ERROR / EMPTY STATE */}
            {currentList.length === 0 ? (
              <div className="py-12 text-center text-slate-400 font-bold text-xs space-y-1 bg-slate-50/50 rounded-xl border border-dashed border-slate-250">
                <Info className="w-8 h-8 text-slate-300 mx-auto" />
                <p>لم يتم العثور على أي قيم تطابق البحث لـ "{searchQuery}"</p>
              </div>
            ) : (
              /* THE LIST VIEW */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[380px] overflow-y-auto pr-1 pad-scroll scrollbar-thin">
                {currentList.map((item) => {
                  const isEditing = editingId === item.id;
                  
                  return (
                    <div 
                      key={item.id} 
                      className={`flex items-center justify-between p-3 border rounded-xl transition-all ${
                        isEditing 
                          ? 'border-amber-400 bg-amber-50/20' 
                          : 'border-slate-150 hover:bg-slate-50/60'
                      }`}
                    >
                      {isEditing ? (
                        /* INLINE EDIT MODE */
                        <div className="flex items-center gap-1.5 w-full">
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-black text-slate-900 w-full focus:outline-hidden focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
                            autoFocus
                          />
                          <button
                            onClick={() => handleSaveEdit(item.id)}
                            className="p-1.5 hover:bg-amber-100 text-emerald-600 rounded-md cursor-pointer shrink-0"
                            title="حفظ"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="p-1.5 hover:bg-slate-100 text-rose-500 rounded-md cursor-pointer shrink-0"
                            title="إلغاء الأمر"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        /* STANDARD DISPLAY MODE */
                        <>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-black">
                              {item.id}
                            </span>
                            <span className="text-xs font-bold text-slate-800">{item.name}</span>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleStartEdit(item.id, item.name)}
                              className="p-1.5 hover:bg-slate-100 text-blue-500 rounded-md cursor-pointer"
                              title="تعديل هذا الاسم"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteItem(item.id, item.name)}
                              className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-md cursor-pointer"
                              title="حذف هذا الاسم"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* DYNAMIC COMBINED NAME COMPOSER PREVIEW */}
          <div className="bg-gradient-to-br from-amber-500/10 via-amber-200/5 to-transparent border border-amber-200 rounded-2xl p-5 shadow-xs space-y-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 bg-amber-400 text-slate-900 font-mono text-[9px] font-black px-3 py-1 rounded-br-2xl">
              محاكي دمج الأسماء المتطابق
            </div>

            <div className="flex items-center gap-2 border-b border-amber-200/60 pb-2">
              <Sparkles className="w-4.5 h-4.5 text-amber-600" />
              <h4 className="font-black text-xs text-amber-950">محاكي مصفوفات المسميات (الاسم المكتمل المستنتج)</h4>
            </div>

            <p className="text-[11px] text-slate-600 leading-relaxed pr-1">
              اختر قيمة واحدة من كل مصفوفة لتشاهد كيف يقوم نظام <strong>اليمامة</strong> تلقائياً بإنشاء طبقة تآلف فريدة لكل صنف، مما يضمن كفاءة التسجيل ومنع تعارض القيود الحسابية بالتصنيع والاستلام:
            </p>

            {/* SELECTION MATRIX GRAPH */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2">
              <div>
                <label className="block text-[9px] font-black text-slate-500 mb-1">الصنف الرئيسي</label>
                <select 
                  value={previewPos1} 
                  onChange={(e) => setPreviewPos1(e.target.value)}
                  className="bg-white border border-slate-250 rounded-lg text-xs font-bold px-2 py-1.5 w-full text-slate-800"
                >
                  {products.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[9px] font-black text-slate-500 mb-1">المصدر/المنشأ</label>
                <select 
                  value={previewPos2} 
                  onChange={(e) => setPreviewPos2(e.target.value)}
                  className="bg-white border border-slate-250 rounded-lg text-xs font-bold px-2 py-1.5 w-full text-slate-800"
                >
                  {regions.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[9px] font-black text-slate-500 mb-1">التصنيف/النوع</label>
                <select 
                  value={previewPos3} 
                  onChange={(e) => setPreviewPos3(e.target.value)}
                  className="bg-white border border-slate-250 rounded-lg text-xs font-bold px-2 py-1.5 w-full text-slate-800"
                >
                  {productTypes.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[9px] font-black text-slate-500 mb-1">درجة الجودة</label>
                <select 
                  value={previewPos4} 
                  onChange={(e) => setPreviewPos4(e.target.value)}
                  className="bg-white border border-slate-250 rounded-lg text-xs font-bold px-2 py-1.5 w-full text-slate-800"
                >
                  {grades.map(g => <option key={g.id} value={g.name}>{g.name}</option>)}
                </select>
              </div>

              <div className="col-span-2 sm:col-span-1">
                <label className="block text-[9px] font-black text-slate-500 mb-1">الوحدة</label>
                <select 
                  value={previewPos5} 
                  onChange={(e) => setPreviewPos5(e.target.value)}
                  className="bg-white border border-slate-250 rounded-lg text-xs font-bold px-2 py-1.5 w-full text-slate-800"
                >
                  {units.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                </select>
              </div>
            </div>

            {/* PREVIEW DISPLAY CARD */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col items-center justify-center text-center mt-4">
              <span className="text-[9px] bg-amber-400 font-mono text-slate-950 px-2 py-0.5 rounded-full font-black uppercase mb-2">
                الاسم المكتمل المسجل بالفاتورة والاستلام
              </span>
              <div className="text-sm md:text-base font-black text-white hover:text-amber-300 transition-colors py-1">
                {previewPos1} {previewPos2} {previewPos3} {previewPos4} ({previewPos5})
              </div>
              <p className="text-[10px] text-slate-400 mt-1 max-w-lg">
                يصاغ هذا المعرف ليكون فريداً وشاملاً في كافة مطبوعات السندات وقيود الموردين والعملاء المحليين.
              </p>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
