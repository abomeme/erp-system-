/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Users, 
  Warehouse, 
  DollarSign, 
  Scale, 
  Receipt, 
  Plus, 
  FileText, 
  Printer, 
  Eye, 
  Trash2, 
  Edit3,
  Settings, 
  Search, 
  ArrowLeftRight, 
  Smartphone, 
  CheckCircle,
  HelpCircle,
  X,
  Coins,
  FolderLock,
  Lock,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  BarChart4
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

// Types
import { 
  Contact, 
  LedgerEntry, 
  Product, 
  Region, 
  ProductType, 
  Grade, 
  Unit, 
  InventoryItem, 
  ProductPrice,
  TreasuryBankMovement,
  User,
  UserPermissions,
  SystemSettings,
  GeneralExpense,
  FinancialYear
} from './types';

// Modals & Panels
import PlusDraftModal from './components/PrintDocumentModal'; // just reference it
import PrintDocumentModal from './components/PrintDocumentModal';
import PayoutModal from './components/PayoutModal';
import InvoiceModal from './components/InvoiceModal';
import InventoryTab from './components/InventoryTab';
import BankTransfersTab from './components/BankTransfersTab';
import AllInvoicesTab from './components/AllInvoicesTab';
import BackupRestoreTab from './components/BackupRestoreTab';
import CategoriesAdminTab from './components/CategoriesAdminTab';
import DailyAuditTab from './components/DailyAuditTab';
import ExpensesTab from './components/ExpensesTab';
import CustomerProfitTab from './components/CustomerProfitTab';
import ProfitReportTab from './components/ProfitReportTab';
import QuickInvoicesTab from './components/QuickInvoicesTab';
import { BalanceSheetTab } from './components/BalanceSheetTab';

import { generateSQLBackup } from './utils/backupGenerator';

// Constants
import { 
  INITIAL_PRODUCTS, 
  INITIAL_REGIONS, 
  INITIAL_PRODUCT_TYPES, 
  INITIAL_GRADES, 
  INITIAL_UNITS, 
  INITIAL_VENDORS,
  INITIAL_CUSTOMERS,
  INITIAL_WORKERS,
  INITIAL_INVENTORY,
  INITIAL_PRICES, 
  INITIAL_INVOICES_SUPPLIERS, 
  INITIAL_INVOICES_CUSTOMERS, 
  INITIAL_INVOICES_WORKERS 
} from './data';

import { TRANSLATIONS, replaceOklchInString, withSafePDFStyles } from './utils';

const INITIAL_CONTACTS: Contact[] = [...INITIAL_VENDORS, ...INITIAL_CUSTOMERS, ...INITIAL_WORKERS];

export const ALL_SYSTEM_SCREENS: Record<string, string> = {
  quick_invoices: "بوابة الفواتير السريعة",
  balance_sheet: "الميزانية العمومية والمركز المالي 📊",
  supplier: "الموردون وتوريد الفاكهة",
  customer: "العملاء والتحصيل المالي",
  worker: "إدارة العمال",
  inventory: "المخازن وإدارة الأسعار",
  bank_transfers: "الخزينة والحساب البنكي",
  expenses: "شاشة المنصرفات",
  double_entry: "القيود المحاسبية اليدوية",
  all_invoices: "سجل الفواتير والطباعة الجماعية",
  customer_profit: "حساب أرباح العملاء والنسب",
  item_profit: "تحليل الأرباح والأصناف",
  daily_audit: "المطابقة والمحاسبة اليومية",
  backup: "النسخ الاحتياطي وحماية السندات",
  categories_admin: "إدارة الأصناف والصفات",
  users_permissions: "صلاحيات المستخدمين",
  system_settings: "إعدادات النظام والماليات",
};

export const hasTabAccess = (user: any, tab: string): boolean => {
  if (!user) return false;
  if (user.username === 'admin') return true;

  const perms = user.permissions;
  if (!perms) return false;

  // Let's check specific screen-level override
  if (typeof perms[tab] === 'boolean') {
    return perms[tab];
  }

  // Fallback map:
  switch (tab) {
    case 'quick_invoices':
    case 'all_invoices':
    case 'double_entry':
    case 'customer_profit':
    case 'item_profit':
      return !!perms.viewInvoices;
    case 'supplier':
    case 'customer':
    case 'worker':
      return !!perms.viewContacts;
    case 'inventory':
      return !!perms.viewInventory;
    case 'bank_transfers':
    case 'expenses':
    case 'daily_audit':
    case 'balance_sheet':
      return !!perms.viewTreasury;
    case 'backup':
      return !!perms.manageBackup;
    case 'categories_admin':
      return !!perms.viewPricing;
    case 'users_permissions':
    case 'system_settings':
      return !!perms.manageSettings;
    default:
      return false;
  }
};

export default function App() {
  const isRtl = true; // Hardcoded default Arabic 
  const t = TRANSLATIONS.ar; 

  // --- CORE STATE PERSISTED VIA LOCALSTORAGE ---
  const [contacts, setContacts] = useState<Contact[]>(() => {
    const saved = localStorage.getItem('erp_contacts');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (err) {
        console.error("Failed to parse erp_contacts:", err);
      }
    }
    return INITIAL_CONTACTS;
  });

  const [ledgers, setLedgers] = useState<Record<string, LedgerEntry[]>>(() => {
    const saved = localStorage.getItem('erp_ledgers');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (err) {
        console.error("Failed to parse erp_ledgers:", err);
      }
    }
    
    // Stitch our initial data structures together
    const merged: Record<string, LedgerEntry[]> = {};
    Object.keys(INITIAL_INVOICES_SUPPLIERS).forEach(k => { merged[k] = INITIAL_INVOICES_SUPPLIERS[k]; });
    Object.keys(INITIAL_INVOICES_CUSTOMERS).forEach(k => { merged[k] = INITIAL_INVOICES_CUSTOMERS[k]; });
    Object.keys(INITIAL_INVOICES_WORKERS).forEach(k => { merged[k] = INITIAL_INVOICES_WORKERS[k]; });
    return merged;
  });

  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('erp_products');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (err) {
        console.error("Failed to parse erp_products:", err);
      }
    }
    return INITIAL_PRODUCTS;
  });

  const [regions, setRegions] = useState<Region[]>(() => {
    const saved = localStorage.getItem('erp_regions');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (err) {
        console.error("Failed to parse erp_regions:", err);
      }
    }
    return INITIAL_REGIONS;
  });

  const [productTypes, setProductTypes] = useState<ProductType[]>(() => {
    const saved = localStorage.getItem('erp_product_types');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (err) {
        console.error("Failed to parse erp_product_types:", err);
      }
    }
    return INITIAL_PRODUCT_TYPES;
  });

  const [grades, setGrades] = useState<Grade[]>(() => {
    const saved = localStorage.getItem('erp_grades');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (err) {
        console.error("Failed to parse erp_grades:", err);
      }
    }
    return INITIAL_GRADES;
  });

  const [units, setUnits] = useState<Unit[]>(() => {
    const saved = localStorage.getItem('erp_units');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (err) {
        console.error("Failed to parse erp_units:", err);
      }
    }
    return INITIAL_UNITS;
  });

  const [inventory, setInventory] = useState<InventoryItem[]>(() => {
    const saved = localStorage.getItem('erp_inventory');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (err) {
        console.error("Failed to parse erp_inventory:", err);
      }
    }
    return INITIAL_INVENTORY;
  });

  const [prices, setPrices] = useState<ProductPrice[]>(() => {
    const saved = localStorage.getItem('erp_prices');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (err) {
        console.error("Failed to parse erp_prices:", err);
      }
    }
    return INITIAL_PRICES;
  });

  const [adjustments, setAdjustments] = useState<TreasuryBankMovement[]>(() => {
    const saved = localStorage.getItem('erp_adjustments');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (err) {
        console.error("Failed to parse erp_adjustments:", err);
      }
    }
    return [];
  });

  const [expenses, setExpenses] = useState<GeneralExpense[]>(() => {
    const saved = localStorage.getItem('erp_expenses');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (err) {
        console.error("Failed to parse erp_expenses:", err);
      }
    }
    return [];
  });

  const [profitRatios, setProfitRatios] = useState<{ id: string; percent: number; label: string }[]>(() => {
    const saved = localStorage.getItem('erp_profit_ratios');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (err) {
        console.error("Failed to parse erp_profit_ratios:", err);
      }
    }
    return [
      { id: '1', percent: 10, label: 'نسبة 10%' },
      { id: '2', percent: 20, label: 'نسبة 20%' },
      { id: '3', percent: 30, label: 'نسبة 30%' },
      { id: '4', percent: 40, label: 'نسبة 40%' },
      { id: '5', percent: 50, label: 'نسبة 50%' },
      { id: '6', percent: 80, label: 'نسبة 80%' },
      { id: '7', percent: 100, label: 'نسبة 100%' }
    ];
  });

  const [commissionPayouts, setCommissionPayouts] = useState<any[]>(() => {
    const saved = localStorage.getItem('erp_commission_payouts');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (err) {
        console.error("Failed to parse erp_commission_payouts:", err);
      }
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('erp_profit_ratios', JSON.stringify(profitRatios));
  }, [profitRatios]);

  useEffect(() => {
    localStorage.setItem('erp_commission_payouts', JSON.stringify(commissionPayouts));
  }, [commissionPayouts]);


  // --- UI CONTROL STATES ---
  const [activeTab, setActiveTab] = useState<'quick_invoices' | 'balance_sheet' | 'supplier' | 'customer' | 'worker' | 'inventory' | 'bank_transfers' | 'expenses' | 'all_invoices' | 'daily_audit' | 'backup' | 'categories_admin' | 'users_permissions' | 'system_settings' | 'double_entry' | 'customer_profit' | 'item_profit'>('quick_invoices');

  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [editUserFullName, setEditUserFullName] = useState<string>('');
  const [editUserUsername, setEditUserUsername] = useState<string>('');
  const [editUserPassword, setEditUserPassword] = useState<string>('');
  const [showAllWorkersPDFModal, setShowAllWorkersPDFModal] = useState<boolean>(false);

  const TAB_PERMISSIONS: Record<string, keyof UserPermissions> = {
    quick_invoices: 'viewInvoices',
    balance_sheet: 'viewTreasury',
    supplier: 'viewContacts',
    customer: 'viewContacts',
    worker: 'viewContacts',
    inventory: 'viewInventory',
    bank_transfers: 'viewTreasury',
    all_invoices: 'viewInvoices',
    daily_audit: 'viewTreasury',
    backup: 'manageBackup',
    categories_admin: 'viewPricing',
    users_permissions: 'manageSettings',
    system_settings: 'manageSettings',
    double_entry: 'viewInvoices',
    customer_profit: 'viewInvoices',
    item_profit: 'viewInvoices',
  };

  const handleTabClick = (tab: typeof activeTab) => {
    if (!hasTabAccess(currentUser, tab)) {
      triggerToast("🔒 تم حجب الوصول: لا تمتلك الصلاحية المطلوبة لفتح هذه الشاشة بقرار من الإدارة.", "err");
      return;
    }
    setActiveTab(tab);
  };

  const handleSystemUpdate = async () => {
    setIsUpdatingSystem(true);
    setUpdateSystemStdout(null);
    setUpdateSystemError(null);
    triggerToast("🔄 جاري إطلاق وتحديث النظام (جاري تشغيل ملف update_system)...", "success");
    
    try {
      const res = await fetch('/api/system-update');
      const data = await res.json();
      
      if (res.status === 200 && data.status === 'success') {
        setUpdateSystemStdout(data.stdout || "تمت جميع مراحل الترقية والدعم لمستودع Github بنجاح!");
        triggerToast("✨ تم تحديث وترقية المنظومة بالكامل بنجاح!", "success");
      } else {
        setUpdateSystemError(data.message || data.error || "حدث خطأ غير متوقع أثناء تشغيل السكربت.");
        triggerToast("⚠️ فشل تحديث النظام! يرجى فحص موجه الأوامر والأرصدة.", "err");
      }
    } catch (err: any) {
      setUpdateSystemError(err.message || "فشل الاتصال بالخادم المحلي لتشغيل الاسكربت.");
      triggerToast("❌ خطأ في الاتصال بخادم التحديث!", "err");
    } finally {
      setIsUpdatingSystem(false);
    }
  };
  const [activeContactId, setActiveContactId] = useState<string>('');
  const [contactSearchQuery, setContactSearchQuery] = useState<string>('');
  const [transactionSearchQuery, setTransactionSearchQuery] = useState<string>('');
  const [contactDebtFilter, setContactDebtFilter] = useState<'all' | 'has_debt' | 'balanced'>('all');

  const [isUpdatingSystem, setIsUpdatingSystem] = useState<boolean>(false);
  const [updateSystemStdout, setUpdateSystemStdout] = useState<string | null>(null);
  const [updateSystemError, setUpdateSystemError] = useState<string | null>(null);

  const [settings, setSettings] = useState<SystemSettings>(() => {
    const saved = localStorage.getItem('erp_settings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (err) {
        console.error("Failed to parse erp_settings:", err);
      }
    }
    return {
      invoiceHeaderAr: "الشركة الدولية لتجارة الفاكهة والتوريد العام",
      invoiceHeaderEn: "International Company for Fruit Trading",
      invoiceDeclarationAr: "المركز الرئيسي لإدارة الحسابات العامة ومطابقة الحسابات",
      currencySymbol: "عملة محددة",
      initialTreasuryBalance: 25000000,
      initialBankBalance: 15000000
    };
  });

  useEffect(() => {
    localStorage.setItem('erp_settings', JSON.stringify(settings));
  }, [settings]);

  // --- FINANCIAL YEARS & FISCAL YEARS ARCHIVES ---
  const [financialYears, setFinancialYears] = useState<FinancialYear[]>(() => {
    const saved = localStorage.getItem('erp_financial_years');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.length > 0) return parsed;
      } catch (err) {
        console.error("Failed to parse erp_financial_years:", err);
      }
    }
    return [
      {
        id: 'fy-2026',
        name: 'العام المالي 2026',
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        isOpen: true
      }
    ];
  });

  const [activeYearId, setActiveYearId] = useState<string>(() => {
    const saved = localStorage.getItem('erp_active_year_id');
    if (saved) return saved;
    return 'fy-2026';
  });

  useEffect(() => {
    localStorage.setItem('erp_financial_years', JSON.stringify(financialYears));
  }, [financialYears]);

  useEffect(() => {
    localStorage.setItem('erp_active_year_id', activeYearId);
  }, [activeYearId]);

  const selectedYear = useMemo(() => {
    return financialYears.find(y => y.id === activeYearId) || financialYears[0] || {
      id: 'fy-2026',
      name: 'العام المالي 2026',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      isOpen: true
    };
  }, [financialYears, activeYearId]);

  const filteredLedgers = useMemo(() => {
    if (!selectedYear) return ledgers;
    const result: Record<string, LedgerEntry[]> = {};
    Object.keys(ledgers).forEach(k => {
      result[k] = (ledgers[k] || []).filter(e => {
        return e.date >= selectedYear.startDate && e.date <= selectedYear.endDate;
      });
    });
    return result;
  }, [ledgers, selectedYear]);

  const filteredExpenses = useMemo(() => {
    if (!selectedYear) return expenses;
    return expenses.filter(x => x.date >= selectedYear.startDate && x.date <= selectedYear.endDate);
  }, [expenses, selectedYear]);

  const filteredAdjustments = useMemo(() => {
    if (!selectedYear) return adjustments;
    return adjustments.filter(m => m.date >= selectedYear.startDate && m.date <= selectedYear.endDate);
  }, [adjustments, selectedYear]);

  const [newYearName, setNewYearName] = useState<string>('');
  const [newYearStart, setNewYearStart] = useState<string>('');
  const [newYearEnd, setNewYearEnd] = useState<string>('');

  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('erp_users');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (err) {
        console.error("Failed to parse erp_users:", err);
      }
    }
    return [
      {
        id: 'u-1',
        username: 'admin',
        password: '123',
        fullName: 'المدير العام',
        isActive: true,
        roleAr: 'المدير العام',
        permissions: {
          viewTreasury: true,
          viewInventory: true,
          viewContacts: true,
          viewPricing: true,
          viewInvoices: true,
          manageBackup: true,
          manageSettings: true
        }
      },
      {
        id: 'u-2',
        username: 'ibrahim',
        password: '123',
        fullName: 'إبراهيم داؤود (المحاسب المالي الرئيسي)',
        isActive: true,
        roleAr: 'محاسب مالي رئيسي',
        permissions: {
          viewTreasury: true,
          viewInventory: true,
          viewContacts: true,
          viewPricing: true,
          viewInvoices: true,
          manageBackup: true,
          manageSettings: false
        }
      },
      {
        id: 'u-3',
        username: 'cashier',
        password: '123',
        fullName: 'مساعد الخزنة (محاسب صندوق)',
        isActive: true,
        roleAr: 'محاسب صندوق',
        permissions: {
          viewTreasury: true,
          viewInventory: true,
          viewContacts: true,
          viewPricing: false,
          viewInvoices: true,
          manageBackup: false,
          manageSettings: false
        }
      }
    ];
  });

  useEffect(() => {
    localStorage.setItem('erp_users', JSON.stringify(users));
  }, [users]);

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = sessionStorage.getItem('erp_current_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (err) {
        console.error("Failed to parse erp_current_user:", err);
      }
    }
    return null;
  });

  useEffect(() => {
    if (currentUser) {
      sessionStorage.setItem('erp_current_user', JSON.stringify(currentUser));
    } else {
      sessionStorage.removeItem('erp_current_user');
    }
  }, [currentUser]);

  // Modals Visibility
  const [showPayoutModal, setShowPayoutModal] = useState<boolean>(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState<boolean>(false);
  const [showAddContactModal, setShowAddContactModal] = useState<boolean>(false);
  
  // Document Viewer Modal State
  const [selectedDocument, setSelectedDocument] = useState<LedgerEntry | null>(null);

  // Fiscal Year Snapshot Printable Preview Modal State
  const [previewYearSnapshot, setPreviewYearSnapshot] = useState<FinancialYear | null>(null);

  // Invoice Edit Mode State
  const [editingInvoice, setEditingInvoice] = useState<LedgerEntry | null>(null);
  const [editingInvoiceContactId, setEditingInvoiceContactId] = useState<string>('');

  // New Contact Temporary Form
  const [newContactName, setNewContactName] = useState<string>('');
  const [newContactPhone, setNewContactPhone] = useState<string>('');
  const [newContactSalary, setNewContactSalary] = useState<string>('');
  const [newContactHireDate, setNewContactHireDate] = useState<string>('');

  // Edit Contact Temporary Form
  const [showEditContactModal, setShowEditContactModal] = useState<boolean>(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [editContactName, setEditContactName] = useState<string>('');
  const [editContactPhone, setEditContactPhone] = useState<string>('');
  const [editContactSalary, setEditContactSalary] = useState<string>('');
  const [editContactHireDate, setEditContactHireDate] = useState<string>('');

  // Worker fast transaction state
  const [workerAdvanceAmount, setWorkerAdvanceAmount] = useState<string>('');
  const [workerRepayAmount, setWorkerRepayAmount] = useState<string>('');
  const [workerRepayDescription, setWorkerRepayDescription] = useState<string>('');
  const [workerSalaryMonth, setWorkerSalaryMonth] = useState<string>('');
  const [workerSalaryAmount, setWorkerSalaryAmount] = useState<string>('');

  // Toast notifications for reactive feedback
  const [toastMessage, setToastMessage] = useState<string>('');
  const [toastType, setToastType] = useState<'success' | 'err'>('success');
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('saved');

  const triggerToast = (msg: string, typ: 'success' | 'err' = 'success') => {
    setToastMessage(msg);
    setToastType(typ);
    setTimeout(() => { setToastMessage(''); }, 3000);
  };

  // --- SAVE SYNC HOOKS ---
  useEffect(() => { localStorage.setItem('erp_contacts', JSON.stringify(contacts)); }, [contacts]);
  useEffect(() => { localStorage.setItem('erp_ledgers', JSON.stringify(ledgers)); }, [ledgers]);
  useEffect(() => { localStorage.setItem('erp_products', JSON.stringify(products)); }, [products]);
  useEffect(() => { localStorage.setItem('erp_regions', JSON.stringify(regions)); }, [regions]);
  useEffect(() => { localStorage.setItem('erp_product_types', JSON.stringify(productTypes)); }, [productTypes]);
  useEffect(() => { localStorage.setItem('erp_grades', JSON.stringify(grades)); }, [grades]);
  useEffect(() => { localStorage.setItem('erp_units', JSON.stringify(units)); }, [units]);
  useEffect(() => { localStorage.setItem('erp_inventory', JSON.stringify(inventory)); }, [inventory]);
  useEffect(() => { localStorage.setItem('erp_prices', JSON.stringify(prices)); }, [prices]);
  useEffect(() => { localStorage.setItem('erp_adjustments', JSON.stringify(adjustments)); }, [adjustments]);
  useEffect(() => { localStorage.setItem('erp_expenses', JSON.stringify(expenses)); }, [expenses]);

  // --- AUTOMATIC SERVER-SIDE/XAMPP DATABASE SAVE HOOK ---
  useEffect(() => {
    let isMounted = true;
    
    const delayTimer = setTimeout(() => {
      if (!isMounted) return;

      const performAutoSync = async () => {
        setAutoSaveStatus('saving');
        
        const backupPayload = {
          contacts,
          ledgers,
          products,
          regions,
          productTypes,
          grades,
          units,
          inventory,
          prices,
          adjustments,
          expenses
        };

        const isPort3000 = window.location.port === '3000' || window.location.hostname.includes('run.app') || window.location.hostname.includes('aistudio');
        const url = isPort3000 
          ? `http://localhost/olad-dawood/db_sync_bridge.php?action=sync_up`
          : `./db_sync_bridge.php?action=sync_up`;

        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3500);

          const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(backupPayload),
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          const responseText = await response.text();
          
          if (responseText.includes('<?php') || responseText.includes('<html') || responseText.includes('<!DOCTYPE')) {
            if (isMounted) setAutoSaveStatus('saved');
            return;
          }

          let jsonResult: any = null;
          try {
            jsonResult = JSON.parse(responseText);
          } catch (e) {
            if (isMounted) setAutoSaveStatus('error');
            return;
          }

          if (jsonResult && jsonResult.status === 'success') {
            if (isMounted) setAutoSaveStatus('saved');
          } else {
            if (isMounted) setAutoSaveStatus('error');
          }
        } catch (err) {
          if (isMounted) setAutoSaveStatus('error');
        }
      };

      performAutoSync();
    }, 1500);

    return () => {
      isMounted = false;
      clearTimeout(delayTimer);
    };
  }, [contacts, ledgers, products, regions, productTypes, grades, units, inventory, prices, adjustments, expenses]);

  // Keep a ref to the latest state of all data to avoid restarting timers on every state change
  const latestBackupDataRef = useRef({
    contacts,
    ledgers,
    products,
    regions,
    productTypes,
    grades,
    units,
    inventory,
    prices
  });

  useEffect(() => {
    latestBackupDataRef.current = {
      contacts,
      ledgers,
      products,
      regions,
      productTypes,
      grades,
      units,
      inventory,
      prices
    };
  }, [contacts, ledgers, products, regions, productTypes, grades, units, inventory, prices]);

  // --- AUTOMATIC 6-HOUR BACKUP SCHEDULER ---
  useEffect(() => {
    const checkAndTriggerBackup = () => {
      try {
        const lastBackupStr = localStorage.getItem('erp_last_auto_backup');
        const now = Date.now();
        const sixHoursMs = 6 * 60 * 60 * 1000; // 6 hours in milliseconds

        if (!lastBackupStr || (now - parseInt(lastBackupStr, 10)) >= sixHoursMs) {
          const data = latestBackupDataRef.current;
          
          // Generate full XAMPP MySQL compatible SQL layout
          const sqlContent = generateSQLBackup({
            contacts: data.contacts,
            ledgers: data.ledgers,
            products: data.products,
            regions: data.regions,
            productTypes: data.productTypes,
            grades: data.grades,
            units: data.units,
            inventory: data.inventory,
            prices: data.prices
          });

          // Trigger automatic browser download
          const blob = new Blob([sqlContent], { type: 'text/plain' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          const stamp = new Date().toISOString().replace(/T/, '_').replace(/:/g, '-').slice(0, 19);
          
          link.href = url;
          // Prompt points it to downloads automatically via default browser behaviors
          link.download = `Olad_Dawood_AutoBackup_${stamp}.sql`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);

          // Update timestamp of last backup
          localStorage.setItem('erp_last_auto_backup', now.toString());
          
          // Provide elegant feedback toast
          triggerToast("🔄 تم بنجاح تصدير وحفظ نسخة احتياطية تلقائية دورية (كل 6 ساعات) لقاعدة البيانات في التنزيلات!", "success");
        }
      } catch (err) {
        console.error("Auto-backup failed:", err);
      }
    };

    // Run first check 5 seconds after application loads to prevent initial locking or UI visual freezes
    const initialTimeout = setTimeout(checkAndTriggerBackup, 5000);

    // Check again every 10 minutes to verify if 6 hours have elapsed while application remains active in background
    const interval = setInterval(checkAndTriggerBackup, 10 * 60 * 1000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, []);


  // Autofill Active Contact ID dynamically when switching tab of contacts
  useEffect(() => {
    if (activeTab === 'supplier' || activeTab === 'customer' || activeTab === 'worker') {
      const candidates = contacts.filter(c => c.type === activeTab);
      const exists = candidates.some(c => c.id === activeContactId);
      if (!exists) {
        if (candidates.length > 0) {
          setActiveContactId(candidates[0].id);
        } else {
          setActiveContactId('');
        }
      }
    }
  }, [activeTab, contacts, activeContactId]);

  // --- FINANCIAL CALCS PREPARED SCIENTIFICALLY ---
  const activeContactsList = useMemo(() => {
    if (activeTab !== 'supplier' && activeTab !== 'customer' && activeTab !== 'worker') return [];
    return contacts.filter(c => {
      const isType = c.type === activeTab;
      const matchesSearch = c.name.toLowerCase().includes(contactSearchQuery.toLowerCase()) || 
                            c.code.toLowerCase().includes(contactSearchQuery.toLowerCase());
      if (!isType || !matchesSearch) return false;

      // Filter by customer madyoniya status
      if (activeTab === 'customer' && contactDebtFilter !== 'all') {
        const entries = ledgers[c.id] || [];
        let invoices = 0;
        let paid = 0;
        entries.forEach(e => {
          if (e.type === 'invoice') {
            invoices += e.total;
            paid += e.paid;
          } else if (e.type === 'payment') {
            if (e.isRepayment) {
              paid -= e.total;
            } else {
              paid += e.total;
            }
          }
        });
        const outstanding = invoices - paid;
        if (contactDebtFilter === 'has_debt') {
          return outstanding > 1; // has unpaid debt
        }
        if (contactDebtFilter === 'balanced') {
          return outstanding <= 1; // paid or even
        }
      }
      return true;
    });
  }, [contacts, activeTab, contactSearchQuery, contactDebtFilter, ledgers]);

  const activeContact = useMemo(() => {
    return contacts.find(c => c.id === activeContactId) || null;
  }, [contacts, activeContactId]);

  const activeContactLedger = useMemo(() => {
    if (!activeContactId) return [];
    const entries = ledgers[activeContactId] || [];
    return entries.filter(e => 
      e.description.toLowerCase().includes(transactionSearchQuery.toLowerCase()) ||
      e.number.toLowerCase().includes(transactionSearchQuery.toLowerCase())
    ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [ledgers, activeContactId, transactionSearchQuery]);

  // Global totals computed for active profile
  const contactStats = useMemo(() => {
    if (!activeContactId) return { totalInvoices: 0, totalPaid: 0, outstanding: 0, workerBalanceType: 'balanced' };
    const entries = ledgers[activeContactId] || [];
    const activeC = contacts.find(c => c.id === activeContactId);
    let invoices = 0;
    let paid = 0;

    entries.forEach(e => {
      if (e.type === 'invoice') {
        invoices += e.total;
        paid += e.paid;
      } else if (e.type === 'payment') {
        if (e.isRepayment) {
          paid -= e.total;
        } else {
          paid += e.total;
        }
      }
    });

    if (activeC && activeC.type === 'worker') {
      const isBalanceWeOweHim = invoices > paid;
      const isBalanceHeOwesUs = paid > invoices;
      return {
        totalInvoices: invoices,
        totalPaid: paid,
        outstanding: Math.abs(invoices - paid),
        workerBalanceType: isBalanceWeOweHim ? 'we_owe_him' : (isBalanceHeOwesUs ? 'he_owes_us' : 'balanced')
      };
    }

    return {
      totalInvoices: invoices,
      totalPaid: paid,
      outstanding: Math.max(0, invoices - paid),
      workerBalanceType: 'balanced'
    };
  }, [ledgers, activeContactId, contacts]);

  // Overall Global Statistics for Header Cards
  const globalDashboardStats = useMemo(() => {
    let totalPurchases = 0; // Suppliers total invoices
    let totalSales = 0;     // Customers total invoices
    
    let ledgerTreasuryIn = 0;  // Cash inflows from ledgers
    let ledgerTreasuryOut = 0; // Cash outflows from ledgers
    let ledgerBankIn = 0;      // Bank inflows from ledgers
    let ledgerBankOut = 0;     // Bank outflows from ledgers

    // Deducted general expenses
    let expensesTreasuryOut = 0;
    let expensesBankOut = 0;

    filteredExpenses.forEach(x => {
      if (x.paymentMethod === 'cash') {
        expensesTreasuryOut += x.amount;
      } else if (x.paymentMethod === 'bank') {
        expensesBankOut += x.amount;
      }
    });

    Object.keys(filteredLedgers).forEach(contactId => {
      const contactObj = contacts.find(c => c.id === contactId);
      if (!contactObj) return;

      const entries = filteredLedgers[contactId] || [];
      entries.forEach(e => {
        const pMethod = e.paymentMethod || 'cash'; // default to cash if not provided
        if (contactObj.type === 'supplier') {
          if (e.type === 'invoice') {
            totalPurchases += e.total;
            if (pMethod === 'cash') {
              ledgerTreasuryOut += e.paid;
            } else if (pMethod === 'bank') {
              ledgerBankOut += e.paid;
            }

            // Supplier purchase invoice level inline expenses (Freight, carrying/porters, etc.)
            const invExp = (e.transportExpense || 0) + (e.carryingExpense || 0) + (e.otherInvoiceExpense || 0);
            const expMethod = e.expensePaymentMethod || pMethod;
            if (invExp > 0) {
              if (expMethod === 'cash') {
                expensesTreasuryOut += invExp;
              } else if (expMethod === 'bank') {
                expensesBankOut += invExp;
              }
            }
          } else if (e.type === 'payment') {
            if (pMethod === 'cash') {
              ledgerTreasuryOut += e.total;
            } else if (pMethod === 'bank') {
              ledgerBankOut += e.total;
            }
          }
        } else if (contactObj.type === 'customer') {
          if (e.type === 'invoice') {
            totalSales += e.total;
            if (pMethod === 'cash') {
              ledgerTreasuryIn += e.paid;
            } else if (pMethod === 'bank') {
              ledgerBankIn += e.paid;
            }
          } else if (e.type === 'payment') {
            if (pMethod === 'cash') {
              ledgerTreasuryIn += e.total;
            } else if (pMethod === 'bank') {
              ledgerBankIn += e.total;
            }
          }
        } else if (contactObj.type === 'worker') {
          // Worker allocations count as expense outflows
          if (e.type === 'invoice') {
            totalPurchases += e.total; // general logistics
            if (pMethod === 'cash') {
              ledgerTreasuryOut += e.paid;
            } else if (pMethod === 'bank') {
              ledgerBankOut += e.paid;
            }
          } else if (e.type === 'payment') {
            if (e.isRepayment) {
              if (pMethod === 'cash') {
                ledgerTreasuryIn += e.total;
              } else if (pMethod === 'bank') {
                ledgerBankIn += e.total;
              }
            } else {
              if (pMethod === 'cash') {
                ledgerTreasuryOut += e.total;
              } else if (pMethod === 'bank') {
                ledgerBankOut += e.total;
              }
            }
          }
        }
      });
    });

    // Compute manual adjustments
    let manualTreasuryIn = 0;
    let manualTreasuryOut = 0;
    let manualBankIn = 0;
    let manualBankOut = 0;

    filteredAdjustments.forEach(m => {
      if (m.type === 'deposit') {
        if (m.source === 'treasury') {
          manualTreasuryIn += m.amount;
        } else if (m.source === 'bank') {
          manualBankIn += m.amount;
        }
      } else if (m.type === 'withdrawal') {
        if (m.source === 'treasury') {
          manualTreasuryOut += m.amount;
        } else if (m.source === 'bank') {
          manualBankOut += m.amount;
        }
      } else if (m.type === 'transfer') {
        // Transfer from Treasury to Bank
        manualTreasuryOut += m.amount;
        manualBankIn += m.amount;
      }
    });

    const treasuryBalance = Number(settings.initialTreasuryBalance || 0) + ledgerTreasuryIn + manualTreasuryIn - (ledgerTreasuryOut + manualTreasuryOut + expensesTreasuryOut);
    const bankBalance = Number(settings.initialBankBalance || 0) + ledgerBankIn + manualBankIn - (ledgerBankOut + manualBankOut + expensesBankOut);
    const netLiquidWealth = treasuryBalance + bankBalance;

    return {
      totalPurchases,
      totalSales,
      treasuryBalance,
      bankBalance,
      netLiquidWealth
    };
  }, [filteredLedgers, contacts, filteredAdjustments, settings, filteredExpenses]);


  // Helper to simulate system treasury and bank balances for validation
  const simulateBalances = (
    testLedgers = ledgers,
    testAdjustments = adjustments,
    testExpenses = expenses
  ) => {
    let ledgerTreasuryIn = 0;
    let ledgerTreasuryOut = 0;
    let ledgerBankIn = 0;
    let ledgerBankOut = 0;
    let expensesTreasuryOut = 0;
    let expensesBankOut = 0;

    testExpenses.forEach(x => {
      if (x.paymentMethod === 'cash') expensesTreasuryOut += x.amount;
      else if (x.paymentMethod === 'bank') expensesBankOut += x.amount;
    });

    Object.keys(testLedgers).forEach(contactId => {
      const contactObj = contacts.find(c => c.id === contactId);
      if (!contactObj) return;

      const entries = testLedgers[contactId] || [];
      entries.forEach(e => {
        const pMethod = e.paymentMethod || 'cash';
        if (contactObj.type === 'supplier') {
          if (e.type === 'invoice') {
            if (pMethod === 'cash') ledgerTreasuryOut += e.paid;
            else if (pMethod === 'bank') ledgerBankOut += e.paid;

            const invExp = (e.transportExpense || 0) + (e.carryingExpense || 0) + (e.otherInvoiceExpense || 0);
            const expMethod = e.expensePaymentMethod || pMethod;
            if (invExp > 0) {
              if (expMethod === 'cash') expensesTreasuryOut += invExp;
              else if (expMethod === 'bank') expensesBankOut += invExp;
            }
          } else if (e.type === 'payment') {
            if (pMethod === 'cash') ledgerTreasuryOut += e.total;
            else if (pMethod === 'bank') ledgerBankOut += e.total;
          }
        } else if (contactObj.type === 'customer') {
          if (e.type === 'invoice') {
            if (pMethod === 'cash') ledgerTreasuryIn += e.paid;
            else if (pMethod === 'bank') ledgerBankIn += e.paid;
          } else if (e.type === 'payment') {
            if (pMethod === 'cash') ledgerTreasuryIn += e.total;
            else if (pMethod === 'bank') ledgerBankIn += e.total;
          }
        } else if (contactObj.type === 'worker') {
          if (e.type === 'invoice') {
            if (pMethod === 'cash') ledgerTreasuryOut += e.paid;
            else if (pMethod === 'bank') ledgerBankOut += e.paid;
          } else if (e.type === 'payment') {
            if (e.isRepayment) {
              if (pMethod === 'cash') ledgerTreasuryIn += e.total;
              else if (pMethod === 'bank') ledgerBankIn += e.total;
            } else {
              if (pMethod === 'cash') ledgerTreasuryOut += e.total;
              else if (pMethod === 'bank') ledgerBankOut += e.total;
            }
          }
        }
      });
    });

    let manualTreasuryIn = 0;
    let manualTreasuryOut = 0;
    let manualBankIn = 0;
    let manualBankOut = 0;

    testAdjustments.forEach(m => {
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

    const treasuryBalance = Number(settings.initialTreasuryBalance || 0) + ledgerTreasuryIn + manualTreasuryIn - (ledgerTreasuryOut + manualTreasuryOut + expensesTreasuryOut);
    const bankBalance = Number(settings.initialBankBalance || 0) + ledgerBankIn + manualBankIn - (ledgerBankOut + manualBankOut + expensesBankOut);

    return { treasuryBalance, bankBalance };
  };


  const getYearSnapshot = (yearObj: FinancialYear) => {
    const start = yearObj.startDate;
    const end = yearObj.endDate;

    let totalPurchases = 0;
    let totalSales = 0;
    let ledgerTreasuryIn = 0;
    let ledgerTreasuryOut = 0;
    let ledgerBankIn = 0;
    let ledgerBankOut = 0;
    let expensesTreasuryOut = 0;
    let expensesBankOut = 0;
    let totalInvoicedCostOfGoodsSold = 0;

    const yearExpenses = expenses.filter(x => x.date >= start && x.date <= end);
    const expensesAmount = yearExpenses.reduce((sum, x) => sum + x.amount, 0);
    yearExpenses.forEach(x => {
      if (x.paymentMethod === 'cash') expensesTreasuryOut += x.amount;
      else if (x.paymentMethod === 'bank') expensesBankOut += x.amount;
    });

    let outstandingDebts = 0;
    let outstandingSupplierCredits = 0;

    contacts.forEach(c => {
      const entries = (ledgers[c.id] || []).filter(e => e.date >= start && e.date <= end);
      let contactInvoices = 0;
      let contactPaid = 0;

      if (c.type === 'worker') {
        entries.forEach(e => {
          if (e.type === 'salary' || e.type === 'invoice') {
            contactInvoices += e.total;
          } else if (e.type === 'payment' || e.type === 'payout' || e.type === 'advance') {
            contactPaid += e.total;
          }
        });
      } else {
        entries.forEach(e => {
          if (e.type === 'invoice') {
            contactInvoices += e.total;
            contactPaid += e.paid || 0;
            
            if (c.type === 'supplier') {
              totalPurchases += e.total;
              if ((e.paymentMethod || 'cash') === 'cash') ledgerTreasuryOut += e.paid;
              else ledgerBankOut += e.paid;

              const invExp = (e.transportExpense || 0) + (e.carryingExpense || 0) + (e.otherInvoiceExpense || 0);
              const expMethod = e.expensePaymentMethod || e.paymentMethod || 'cash';
              if (invExp > 0) {
                if (expMethod === 'cash') expensesTreasuryOut += invExp;
                else expensesBankOut += invExp;
              }
            } else if (c.type === 'customer') {
              totalSales += e.total;
              if ((e.paymentMethod || 'cash') === 'cash') ledgerTreasuryIn += e.paid;
              else ledgerBankIn += e.paid;

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

      const diff = contactInvoices - contactPaid;
      if (c.type === 'customer' && diff > 0) {
        outstandingDebts += diff;
      } else if (c.type === 'supplier' && diff > 0) {
        outstandingSupplierCredits += diff;
      }
    });

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

    const activeTreasury = Number(settings.initialTreasuryBalance || 0) + ledgerTreasuryIn + manualTreasuryIn - (ledgerTreasuryOut + manualTreasuryOut + expensesTreasuryOut);
    const activeBank = Number(settings.initialBankBalance || 0) + ledgerBankIn + manualBankIn - (ledgerBankOut + manualBankOut + expensesBankOut);

    const stockValuation = inventory.reduce((sum, item) => sum + (item.qty * item.buyPrice), 0);
    const grossProfit = totalSales - totalInvoicedCostOfGoodsSold;
    const netProfit = grossProfit - expensesAmount;

    return {
      totalSales,
      totalPurchases,
      expensesAmount,
      outstandingDebts,
      outstandingSupplierCredits,
      treasuryBalance: activeTreasury,
      bankBalance: activeBank,
      stockValuation,
      netProfit,
      costOfGoodsSold: totalInvoicedCostOfGoodsSold
    };
  };


  // --- HANDLERS FOR SAVING DOCUMENTS & LEDGERS ---
  const handleSaveInvoice = (data: {
    id?: string;
    contactId: string;
    date: string;
    number: string;
    description: string;
    total: number;
    paid: number;
    items: any[];
    paymentMethod?: 'cash' | 'bank';
    transportExpense?: number;
    carryingExpense?: number;
    otherInvoiceExpense?: number;
    expensePaymentMethod?: 'cash' | 'bank';
    discount?: number;
  }) => {
    if (selectedYear) {
      if (data.date < selectedYear.startDate || data.date > selectedYear.endDate) {
        alert(`⚠️ خطأ في القيد: تاريخ الفاتورة (${data.date}) لا يقع ضمن نطاق السنة المالية النشطة (${selectedYear.name}: من ${selectedYear.startDate} إلى ${selectedYear.endDate}).\n\nيرجى تعديل تاريخ الفاتورة أو تغيير العام المالي النشط من الإعدادات.`);
        return;
      }
    }

    let updatedInventory = [...inventory];
    let updatedLedgers = { ...ledgers };

    // 1. REVERT ORIGINAL STATE IF EDITING
    if (data.id) {
      let foundOldContactId = '';
      let foundOldEntry: LedgerEntry | undefined;

      for (const [cId, rawEntries] of Object.entries(ledgers)) {
        const entries = rawEntries as LedgerEntry[];
        const match = entries.find(e => e.id === data.id);
        if (match) {
          foundOldContactId = cId;
          foundOldEntry = match;
          break;
        }
      }

      if (foundOldEntry && foundOldContactId) {
        const oldContactObj = contacts.find(c => c.id === foundOldContactId);
        if (foundOldEntry.items && foundOldEntry.items.length > 0) {
          foundOldEntry.items.forEach(itm => {
            const idx = updatedInventory.findIndex(i => 
              i.productId === itm.productId && 
              i.regionName === itm.regionName && 
              i.typeName === itm.typeName && 
              i.gradeName === itm.gradeName && 
              i.unitName === itm.unitName
            );
            if (idx >= 0) {
              if (oldContactObj?.type === 'supplier') {
                updatedInventory[idx] = {
                  ...updatedInventory[idx],
                  qty: Math.max(0, updatedInventory[idx].qty - itm.qty)
                };
              } else if (oldContactObj?.type === 'customer') {
                updatedInventory[idx] = {
                  ...updatedInventory[idx],
                  qty: updatedInventory[idx].qty + itm.qty
                };
              }
            }
          });
        }
        // Remove old entry
        updatedLedgers[foundOldContactId] = (updatedLedgers[foundOldContactId] || []).filter(e => e.id !== data.id);
      }
    }

    // 2. CREATE NEW OR PRESERVE ENTRY ID
    const entryId = data.id || `ent-${Date.now()}`;
    const newEntry: LedgerEntry = {
      id: entryId,
      type: 'invoice',
      date: data.date,
      number: data.number,
      description: data.description,
      total: data.total,
      paid: data.paid,
      items: data.items,
      paymentMethod: data.paid > 0 ? (data.paymentMethod || 'cash') : undefined,
      accountantName: currentUser ? currentUser.fullName : "المحاسب العام",
      transportExpense: data.transportExpense,
      carryingExpense: data.carryingExpense,
      otherInvoiceExpense: data.otherInvoiceExpense,
      expensePaymentMethod: data.expensePaymentMethod,
      discount: data.discount
    };

    // 3. SAVE ENTRY TO LEDGERS
    const profileLedger = updatedLedgers[data.contactId] || [];
    updatedLedgers[data.contactId] = [...profileLedger, newEntry];

    // Validate if treasury or bank balance would go below 0 after this change
    const { treasuryBalance: simT, bankBalance: simB } = simulateBalances(updatedLedgers, adjustments, expenses);
    if (simT < 0 || simB < 0) {
      triggerToast("⚠️ عذراً: المبلغ المطلوب لعملية الشراء أو المصروفات المصاحبة أكبر من الرصيد المتوفر بالخزنة أو البنك!", "err");
      alert(`⚠️ لا يمكن إتمام العملية: المبلغ المطلوب أكبر من الرصيد المتوفر بالخزنة أو البنك.\n\nالرصيد المتوقع بعد هذه المعاملة سيكون:\n- الخزنة الميدانية: ${simT.toLocaleString()} ج.س\n- البنك: ${simB.toLocaleString()} ج.س\n\nيرجى تعديل دفعة الفاتورة أو المصروفات لتناسب رصيد الخزائن المتاح.`);
      return;
    }

    setLedgers(updatedLedgers);

    // 4. APPLY NEW INVENTORY MODIFICATIONS
    const targetContactObj = contacts.find(c => c.id === data.contactId);
    const isSupplierNew = targetContactObj ? targetContactObj.type === 'supplier' : activeTab === 'supplier';

    // Calculate dynamic pro-rated expenses per item unit
    const invoiceExpenses = (data.transportExpense || 0) + (data.carryingExpense || 0) + (data.otherInvoiceExpense || 0);
    const invoiceTotalQty = data.items.reduce((sum, item) => sum + (item.qty || 0), 0);
    const additionalCostUnit = invoiceTotalQty > 0 ? (invoiceExpenses / invoiceTotalQty) : 0;

    data.items.forEach(itm => {
      const idx = updatedInventory.findIndex(inv => 
        inv.productId === itm.productId &&
        inv.regionName === itm.regionName &&
        inv.typeName === itm.typeName &&
        inv.gradeName === itm.gradeName &&
        inv.unitName === itm.unitName
      );

      if (isSupplierNew) {
        // PURCHASE -> INWARD (Adds Stock)
        const landedCost = itm.price + additionalCostUnit;
        if (idx >= 0) {
          updatedInventory[idx] = {
            ...updatedInventory[idx],
            qty: updatedInventory[idx].qty + itm.qty,
            buyPrice: Math.round(landedCost),
            sellPrice: Math.round(landedCost * 1.3)
          };
        } else {
          updatedInventory.push({
            id: `inv-${Date.now()}-${Math.floor(Math.random()*9999)}`,
            productId: itm.productId,
            productName: itm.productName,
            regionName: itm.regionName,
            typeName: itm.typeName,
            gradeName: itm.gradeName,
            unitName: itm.unitName,
            qty: itm.qty,
            buyPrice: Math.round(landedCost),
            sellPrice: Math.round(landedCost * 1.3)
          });
        }
      } else {
        // SALE -> OUTWARD (Deducts Stock)
        if (idx >= 0) {
          updatedInventory[idx] = {
            ...updatedInventory[idx],
            qty: Math.max(0, updatedInventory[idx].qty - itm.qty)
          };
        }
      }
    });

    setInventory(updatedInventory);
    setShowInvoiceModal(false);
    setEditingInvoice(null);
    setEditingInvoiceContactId('');

    if (data.id) {
      triggerToast("تم تعديل الفاتورة وتحديث المخازن والذمم المحاسبية بنجاح!", "success");
    } else {
      triggerToast("تم تعميد ترحيل الفاتورة وتجليس الذمم وصرف المخزون بنجاح!", "success");
    }
  };

  const handleSavePayout = (data: {
    amount: number;
    date: string;
    method: 'cash' | 'bank';
    reference: string;
    description: string;
  }) => {
    if (!activeContactId) return;

    if (selectedYear) {
      if (data.date < selectedYear.startDate || data.date > selectedYear.endDate) {
        alert(`⚠️ خطأ في السند: تاريخ السند المالي (${data.date}) لا يقع ضمن نطاق السنة المالية النشطة (${selectedYear.name}: من ${selectedYear.startDate} إلى ${selectedYear.endDate}).\n\nيرجى تعديل تاريخ السند أو تغيير العام المالي النشط من الإعدادات.`);
        return;
      }
    }

    // Create Payment Voucher log entry
    const newEntry: LedgerEntry = {
      id: `ent-${Date.now()}`,
      type: 'payment',
      date: data.date,
      number: `VOU-${data.method.toUpperCase().slice(0,2)}-${Math.floor(100 + Math.random()*899)}`,
      description: data.description,
      total: data.amount,
      paid: data.amount,
      paymentMethod: data.method,
      paymentRef: data.reference,
      accountantName: currentUser ? currentUser.fullName : "المحاسب العام"
    };

    const profileLedger = ledgers[activeContactId] || [];
    const nextLedgers = {
      ...ledgers,
      [activeContactId]: [...profileLedger, newEntry]
    };

    // Validate balances
    const { treasuryBalance: simT, bankBalance: simB } = simulateBalances(nextLedgers, adjustments, expenses);
    if (simT < 0 || simB < 0) {
      triggerToast("⚠️ عذراً: رصيد الخزنة أو البنك لا يقبل السحب لعدم كفاية السيولة!", "err");
      alert(`⚠️ لا يمكن إتمام عملية السحب:\nالمبلغ المطلوب (${data.amount.toLocaleString()} ج.س) أكبر من المتوفر في الرصيد المالي الحالي لـ [${data.method === 'cash' ? 'الخزنة' : 'البنك'}].`);
      return;
    }

    setLedgers(nextLedgers);
    setShowPayoutModal(false);
    triggerToast("تم تسجيل الدفعة النقدية وتقييد السند بالخزينة المالية");
  };

  const handleZeroOutContact = (contactId: string) => {
    const contactObj = contacts.find(c => c.id === contactId);
    if (!contactObj) return;

    const wipeChoice = window.confirm(
      `⚠️ تصفير حساب وبدء من جديد لـ [ ${contactObj.name} ]:\n\n` +
      `- اضغط (موافق / OK) لمسح كافة الفواتير والسندات السابقة تماماً لهذا الشريك من النظام للبدء معه من الصفر (مسح شامل نهائي).\n\n` +
      `- اضغط (إلغاء / Cancel) لإبقاء السجلات السابقة وتوليد قيد مالي تسووي تلقائي لتصفير الفارق الجاري حالياً.`
    );

    if (wipeChoice) {
      const nextLedgers = {
        ...ledgers,
        [contactId]: []
      };
      setLedgers(nextLedgers);
      triggerToast(`🧹 تم مسح وتفريغ السجل المحاسبي لـ "${contactObj.name}" بالكامل وبدء صفحة جديدة فرشة!`, "success");
      return;
    }

    // Calculate outstanding
    const entries = ledgers[contactId] || [];
    let invoices = 0;
    let paid = 0;

    entries.forEach(e => {
      if (e.type === 'invoice') {
        invoices += e.total;
        paid += e.paid;
      } else if (e.type === 'payment') {
        if (e.isRepayment) {
          paid -= e.total;
        } else {
          paid += e.total;
        }
      }
    });

    const diff = invoices - paid; // positive means invoices > paid, negative means paid > invoices
    if (diff === 0) {
      alert("⚠️ الحساب مسوّى بالفعل ورصيده خالٍ من أي فوارق مالية مستحقة.");
      return;
    }

    const absDiff = Math.abs(diff);
    let title = "";
    let desc = "";

    if (contactObj.type === 'customer') {
      if (diff > 0) {
        // Customer owes us money
        title = `تصفير حساب العميل "${contactObj.name}" (تحصيل/تسوية بقيمة ${absDiff.toLocaleString()} ج.س)`;
        desc = `تسوية تحصيل رصيد متبقي مستحق لتصفير حساب العميل بالكامل وإغلاق الفارق الجاري`;
      } else {
        // Customer paid extra/overpaid
        title = `تصفير حساب العميل "${contactObj.name}" (رد متبقي/تسوية بقيمة ${absDiff.toLocaleString()} ج.س)`;
        desc = `تسوية قيد عكسي/رد رصيد إضافي زائد لتصفير حساب العميل`;
      }
    } else if (contactObj.type === 'supplier') {
      if (diff > 0) {
        // We owe supplier money
        title = `تصفير حساب المورد "${contactObj.name}" (سداد/تسوية بقيمة ${absDiff.toLocaleString()} ج.س)`;
        desc = `سداد تسوية رصيد معلق دائن للمورد لتصفير حسابه الجاري وتصفية المستحقات`;
      } else {
        // Supplier overpaid us or returned goods
        title = `تصفير حساب المورد "${contactObj.name}" (تحصيل/تسوية بقيمة ${absDiff.toLocaleString()} ج.س)`;
        desc = `قيد تسوية عكسي لتصفير رصيد المورد المدين الزائد`;
      }
    } else if (contactObj.type === 'worker') {
      if (diff > 0) {
        // We owe worker money (salary due)
        title = `تصفير حساب العامل "${contactObj.name}" (صرف مستحقات بقيمة ${absDiff.toLocaleString()} ج.س)`;
        desc = `صرف تسوية مستحقات رواتب متبقية لتصفية وتصفير حساب العامل بالكامل`;
      } else {
        // Worker owes us money (took advance)
        title = `تصفير حساب العامل "${contactObj.name}" (إثبات عمل/تسوية بقيمة ${absDiff.toLocaleString()} ج.س)`;
        desc = `تسوية إثبات عمل/إنتاج مقابل سلفيات قديمة لتصفير رصيد العامل بالكامل`;
      }
    }

    if (window.confirm(`⚠️ هل أنت متأكد من ${title}؟\nسيتم إصدار قيد مالي تسووي ليتوازن الحساب الجاري المتبقي تماماً ويصبح الرصيد صفراً.`)) {
      // Determine what ledger entry type to make
      let newEntry: LedgerEntry;

      if (contactObj.type === 'customer') {
        if (diff > 0) {
          // Customer owes us → Register a sub-payment voucher to offset (raises paid)
          newEntry = {
            id: `ent-${Date.now()}`,
            type: 'payment',
            date: new Date().toISOString().split('T')[0],
            number: `ADJ-CUS-${Math.floor(100 + Math.random()*899)}`,
            description: desc,
            total: absDiff,
            paid: absDiff,
            paymentMethod: 'cash',
            paymentRef: 'تسوية تلقائية لتصفير رصيد عميل',
            accountantName: currentUser ? currentUser.fullName : "المحاسب العام"
          };
        } else {
          // We owe customer → Register a sub-invoice (obligation) to raise invoices count to equal paid
          newEntry = {
            id: `ent-${Date.now()}`,
            type: 'invoice',
            date: new Date().toISOString().split('T')[0],
            number: `ADJ-CUS-R-${Math.floor(100 + Math.random()*899)}`,
            description: desc,
            total: absDiff,
            paid: 0,
            paymentMethod: 'cash',
            accountantName: currentUser ? currentUser.fullName : "المحاسب العام"
          };
        }
      } else if (contactObj.type === 'supplier') {
        if (diff > 0) {
          // We owe supplier → Register a sub-payment (raises paid)
          newEntry = {
            id: `ent-${Date.now()}`,
            type: 'payment',
            date: new Date().toISOString().split('T')[0],
            number: `ADJ-SUP-${Math.floor(100 + Math.random()*899)}`,
            description: desc,
            total: absDiff,
            paid: absDiff,
            paymentMethod: 'cash',
            paymentRef: 'تسوية تلقائية لتصفير رصيد مورد',
            accountantName: currentUser ? currentUser.fullName : "المحاسب العام"
          };
        } else {
          // Supplier owes us → Register a sub-invoice (raises invoice amount)
          newEntry = {
            id: `ent-${Date.now()}`,
            type: 'invoice',
            date: new Date().toISOString().split('T')[0],
            number: `ADJ-SUP-R-${Math.floor(100 + Math.random()*899)}`,
            description: desc,
            total: absDiff,
            paid: 0,
            paymentMethod: 'cash',
            accountantName: currentUser ? currentUser.fullName : "المحاسب العام"
          };
        }
      } else {
        // worker
        if (diff > 0) {
          // We owe worker → Register a payment to pay off wages (raises paid)
          newEntry = {
            id: `ent-${Date.now()}`,
            type: 'payment',
            date: new Date().toISOString().split('T')[0],
            number: `ADJ-WRK-${Math.floor(100 + Math.random()*899)}`,
            description: desc,
            total: absDiff,
            paid: absDiff,
            paymentMethod: 'cash',
            paymentRef: 'تسوية تلقائية وتصفير رصيد عامل',
            accountantName: currentUser ? currentUser.fullName : "المحاسب العام"
          };
        } else {
          // Worker owes us (advances) → Register invoice entry of equivalent work entitlement to raise invoices count
          newEntry = {
            id: `ent-${Date.now()}`,
            type: 'invoice',
            date: new Date().toISOString().split('T')[0],
            number: `ADJ-WRK-R-${Math.floor(100 + Math.random()*899)}`,
            description: desc,
            total: absDiff,
            paid: 0,
            paymentMethod: 'cash',
            accountantName: currentUser ? currentUser.fullName : "المحاسب العام"
          };
        }
      }

      let nextLedgers = {
        ...ledgers,
        [contactId]: [...entries, newEntry]
      };

      // Validate cash balance if paying cash
      if (newEntry.type === 'payment' && newEntry.paymentMethod === 'cash') {
        const { treasuryBalance: simT } = simulateBalances(nextLedgers, adjustments, expenses);
        if (simT < 0) {
          // If cash isn't enough, switch to 'other' paper adjustment so it goes through without error
          newEntry.paymentMethod = 'other' as any;
          newEntry.paymentRef = 'تسوية ورقية إدارية (خصم/بند تسويات)';
          newEntry.description += ' (تسوية ورقية بسبب نقص سيولة الخزينة)';
          nextLedgers = {
            ...ledgers,
            [contactId]: [...entries, newEntry]
          };
        }
      }

      setLedgers(nextLedgers);
      triggerToast(`تم تصفير حساب "${contactObj.name}" تماماً وتسجيل قيد التسوية المالي بنجاح!`, "success");
    }
  };

  const handleAddWorkerAdvance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeContactId) return;
    const amt = parseFloat(workerAdvanceAmount);
    if (isNaN(amt) || amt <= 0) {
      alert("يرجى إدخال مبلغ صحيح للسلفية");
      return;
    }

    const newEntry: LedgerEntry = {
      id: `ent-${Date.now()}`,
      type: 'payment',
      date: new Date().toISOString().split('T')[0],
      number: `ADV-${Math.floor(1000 + Math.random()*8999)}`,
      description: "صرف سلفية مالية للعامل",
      total: amt,
      paid: amt,
      paymentMethod: 'cash',
      paymentRef: 'صندوق نقدي',
      accountantName: currentUser ? currentUser.fullName : "المحاسب العام"
    };

    const profileLedger = ledgers[activeContactId] || [];
    const nextLedgers = {
      ...ledgers,
      [activeContactId]: [...profileLedger, newEntry]
    };

    // Validate balances
    const { treasuryBalance: simT } = simulateBalances(nextLedgers, adjustments, expenses);
    if (simT < 0) {
      triggerToast("⚠️ عذراً: رصيد الخزنة لا يقبل صرف السلف لعدم كفاية السيولة النقدية مسبقاً!", "err");
      alert(`⚠️ لا يمكن إتمام العملية: ميزانية السلفية المالية المطلوب صرفها (${amt.toLocaleString()} ج.س) أكبر من المتوفر في الخزنة.`);
      return;
    }

    setLedgers(nextLedgers);
    setWorkerAdvanceAmount('');
    triggerToast("تم صرف وقيد السلفية للعامل بنجاح واحتسابها بالحصيلة");
  };

  const handleAddWorkerRepay = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeContactId) return;
    const amt = parseFloat(workerRepayAmount);
    if (isNaN(amt) || amt <= 0) {
      alert("يرجى إدخال مبلغ صحيح للسداد");
      return;
    }

    const newEntry: LedgerEntry = {
      id: `ent-${Date.now()}`,
      type: 'payment',
      date: new Date().toISOString().split('T')[0],
      number: `REPAY-${Math.floor(1000 + Math.random()*8999)}`,
      description: workerRepayDescription.trim() || "سداد سلفية من العامل (إيداع خزينة)",
      total: amt,
      paid: amt,
      paymentMethod: 'cash',
      paymentRef: 'صندوق نقدي',
      isRepayment: true,
      accountantName: currentUser ? currentUser.fullName : "المحاسب العام"
    };

    const profileLedger = ledgers[activeContactId] || [];
    setLedgers({
      ...ledgers,
      [activeContactId]: [...profileLedger, newEntry]
    });

    setWorkerRepayAmount('');
    setWorkerRepayDescription('');
    triggerToast("تم إثبات سداد السلفية وإيداع المبلغ بالخزينة بنجاح");
  };

  const handleDisburseWorkerSalaryMonth = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeContactId) return;
    const activeC = contacts.find(c => c.id === activeContactId);
    if (!activeC) return;
    const monthStr = workerSalaryMonth.trim();
    if (!monthStr) {
      alert("يرجى تحديد الشهر لراتب الصرف");
      return;
    }
    const definedSalary = activeC.salary || 0;
    const manualAmt = parseFloat(workerSalaryAmount);
    let finalAmount = !isNaN(manualAmt) && manualAmt > 0 ? manualAmt : definedSalary;

    if (finalAmount <= 0) {
      alert("يرجى إدخال قيمة صحيحة لمرتب الشهر أو إثبات راتب أساسي للعامل");
      return;
    }

    // Checking Hire Date restrictions
    if (activeC.hireDate) {
      const parseSalaryMonth = (mStr: string) => {
        const matchIso = mStr.match(/^(\d{4})-(\d{1,2})$/);
        if (matchIso) {
          return { year: parseInt(matchIso[1]), month: parseInt(matchIso[2]) };
        }

        const yearMatch = mStr.match(/\d{4}/);
        const year = yearMatch ? parseInt(yearMatch[0]) : new Date().getFullYear();

        let month = new Date().getMonth() + 1; // default
        const AR_MONTHS: Record<string, number> = {
          'يناير': 1, 'فبراير': 2, 'مارس': 3, 'أبريل': 4, 'ابريل': 4, 'مايو': 5, 
          'يونيو': 6, 'يونية': 6, 'يوليو': 7, 'يولية': 7, 'أغسطس': 8, 'اغسطس': 8, 
          'سبتمبر': 9, 'أكتوبر': 10, 'نوفمبر': 11, 'ديسمبر': 12, '1': 1, '2': 2, 
          '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, '11': 11, '12': 12
        };

        for (const mName of Object.keys(AR_MONTHS)) {
          if (mStr.includes(mName)) {
            month = AR_MONTHS[mName];
            break;
          }
        }
        return { year, month };
      };

      const sDate = parseSalaryMonth(monthStr);
      const hDateParts = activeC.hireDate.split('-');
      const hYear = parseInt(hDateParts[0]);
      const hMonth = parseInt(hDateParts[1]);
      const hDay = hDateParts[2] ? parseInt(hDateParts[2]) : 1;

      if (sDate.year < hYear || (sDate.year === hYear && sDate.month < hMonth)) {
        alert(`⚠️ لا يمكن صرف راتب لشهر سابق لتاريخ تعيين الموظف (${hYear}-${hMonth.toString().padStart(2, '0')}-${hDay.toString().padStart(2, '0')})`);
        return;
      }

      if (sDate.year === hYear && sDate.month === hMonth) {
        if (hDay > 1) {
          const daysInMonth = 30; // standard commercial month
          const activeDays = Math.max(1, daysInMonth - hDay + 1);
          const factor = activeDays / daysInMonth;
          const proRataAmount = Math.round(finalAmount * factor);
          
          const confirmChoice = window.confirm(`💡 العامل تم تعيينه في منتصف الشهر المختار (${activeC.hireDate}) ويتبقى له ${activeDays} يوماً عمل.\nهل ترغب باحتساب المرتب بشكل تناسبي (نسبي بقيمة ${proRataAmount.toLocaleString()} جنيه بدلاً من ${finalAmount.toLocaleString()})؟`);
          if (confirmChoice) {
            finalAmount = proRataAmount;
          }
        }
      }
    }

    // Proving Entitlement (invoice)
    const entId = `ent-${Date.now()}`;
    const entEntry: LedgerEntry = {
      id: entId,
      type: 'invoice',
      date: new Date().toISOString().split('T')[0],
      number: `SAL-ENT-${Math.floor(1000 + Math.random()*8999)}`,
      description: `استحقاق مرتب شهر: ${monthStr}`,
      total: finalAmount,
      paid: 0,
      paymentMethod: 'cash',
      accountantName: currentUser ? currentUser.fullName : "المحاسب العام"
    };

    // Paying Out (payment)
    const payEntry: LedgerEntry = {
      id: `ent-${Date.now()+1}`,
      type: 'payment',
      date: new Date().toISOString().split('T')[0],
      number: `SAL-PAY-${Math.floor(1000 + Math.random()*8999)}`,
      description: `صرف مرتب شهر: ${monthStr}`,
      total: finalAmount,
      paid: finalAmount,
      paymentMethod: 'cash',
      paymentRef: 'حساب المرتبات',
      accountantName: currentUser ? currentUser.fullName : "المحاسب العام"
    };

    const profileLedger = ledgers[activeContactId] || [];
    setLedgers({
      ...ledgers,
      [activeContactId]: [...profileLedger, entEntry, payEntry]
    });

    setWorkerSalaryMonth('');
    setWorkerSalaryAmount('');
    triggerToast(`تم إثبات وصرف مرتب شهر ${monthStr} بنجاح بقيمة ${finalAmount.toLocaleString()} جنيه سوداني`);
  };

  const handleAddContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContactName.trim()) return;

    const newCode = `${activeTab === 'supplier' ? 'VEN' : activeTab === 'customer' ? 'CUS' : 'WRK'}-${contacts.length + 101}`;
    const parsedSalary = newContactSalary ? parseFloat(newContactSalary) : undefined;
    
    const newContactObj: Contact = {
      id: `con-${Date.now()}`,
      type: activeTab as any,
      name: newContactName,
      nameEn: newContactName,
      code: newCode,
      phone: newContactPhone,
      salary: (activeTab === 'worker' && parsedSalary && !isNaN(parsedSalary)) ? parsedSalary : undefined,
      hireDate: activeTab === 'worker' ? (newContactHireDate || new Date().toISOString().split('T')[0]) : undefined,
      lastActive: new Date().toISOString().split('T')[0],
      notes: 'تمت إضافته كحساب مالي جديد وبدء قيود السجلات'
    };

    setContacts([...contacts, newContactObj]);
    setLedgers({
      ...ledgers,
      [newContactObj.id]: []
    });

    setNewContactName('');
    setNewContactPhone('');
    setNewContactSalary('');
    setNewContactHireDate('');
    setShowAddContactModal(false);
    setActiveContactId(newContactObj.id);
    triggerToast("تم تسجيل العضو الجديد وافتتاح سجل الأستاذ بنجاح!");
  };

  const handleDeleteLedgerEntry = (entryId: string) => {
    if (!activeContactId) return;
    if (window.confirm("هل تريد بالتأكيد حذف هذا القيد المالي والتراجع عن المعاملة؟ (سيؤثر على توازن الدفاتر)")) {
      const records = ledgers[activeContactId] || [];
      setLedgers({
        ...ledgers,
        [activeContactId]: records.filter(r => r.id !== entryId)
      });
      triggerToast("تم مسح القيد المالي المحاسبي بنجاح");
    }
  };

  const handleDeleteLedgerInvoice = (entryId: string, contactId: string) => {
    const contactObj = contacts.find(c => c.id === contactId);
    const contactName = contactObj ? contactObj.name : "الشريك";
    
    if (window.confirm(`⚠️ تحذير: هل أنت متأكد من رغبتك في حذف هذه الفاتورة نهائياً لمصلحة "${contactName}"؟ سيتم تصفير أثرها المالي وإعدادات المخزون.`)) {
      const records = ledgers[contactId] || [];
      const entryToDelete = records.find(r => r.id === entryId);
      
      if (entryToDelete && entryToDelete.items && entryToDelete.items.length > 0) {
        let updatedInventory = [...inventory];
        entryToDelete.items.forEach(itm => {
          const idx = updatedInventory.findIndex(i => 
            i.productId === itm.productId && 
            i.regionName === itm.regionName && 
            i.typeName === itm.typeName && 
            i.gradeName === itm.gradeName && 
            i.unitName === itm.unitName
          );
          if (idx >= 0) {
            if (contactObj?.type === 'supplier') {
              updatedInventory[idx] = {
                ...updatedInventory[idx],
                qty: Math.max(0, updatedInventory[idx].qty - itm.qty)
              };
            } else if (contactObj?.type === 'customer') {
              updatedInventory[idx] = {
                ...updatedInventory[idx],
                qty: updatedInventory[idx].qty + itm.qty
              };
            }
          }
        });
        setInventory(updatedInventory);
      }

      setLedgers({
        ...ledgers,
        [contactId]: records.filter(r => r.id !== entryId)
      });
      
      triggerToast("تم حذف الفاتورة وإلغاء أثرها المالي والمخزني بنجاح", "success");
    }
  };

  const handleDeleteContact = (contactId: string, name: string) => {
    if (window.confirm(`هل أنت متأكد من حذف الحساب "${name}" بالكامل؟ سيتم مسح الحساب وملفاته المالية كلياً من الجهاز.`)) {
      setContacts(contacts.filter(c => c.id !== contactId));
      
      // Delete their ledger records
      const updatedLedgers = { ...ledgers };
      delete updatedLedgers[contactId];
      setLedgers(updatedLedgers);
      
      // Select another contact if active got deleted
      if (activeContactId === contactId) {
        setActiveContactId('');
      }
      triggerToast(`تم حذف الحساب المالي "${name}" بنجاح.`);
    }
  };

  const handleTriggerEditContact = (c: Contact) => {
    setEditingContact(c);
    setEditContactName(c.name);
    setEditContactPhone(c.phone || '');
    setEditContactSalary(c.salary ? c.salary.toString() : '');
    setEditContactHireDate(c.hireDate || new Date().toISOString().split('T')[0]);
    setShowEditContactModal(true);
  };

  const handleUpdateContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingContact || !editContactName.trim()) return;

    const updatedSalary = editContactSalary ? parseFloat(editContactSalary) : undefined;

    setContacts(contacts.map(c => {
      if (c.id === editingContact.id) {
        return {
          ...c,
          name: editContactName,
          nameEn: editContactName,
          phone: editContactPhone,
          salary: (updatedSalary !== undefined && !isNaN(updatedSalary)) ? updatedSalary : undefined,
          hireDate: c.type === 'worker' ? (editContactHireDate || new Date().toISOString().split('T')[0]) : undefined
        };
      }
      return c;
    }));

    setShowEditContactModal(false);
    setEditingContact(null);
    triggerToast(`تم تعديل بيانات الشريك "${editContactName}" بنجاح!`, "success");
  };

  const handleAddDirectBankPayment = (
    contactId: string,
    amount: number,
    date: string,
    method: 'cash' | 'bank',
    reference: string,
    description: string
  ) => {
    const newEntry: LedgerEntry = {
      id: `ent-${Date.now()}`,
      type: 'payment',
      date: date,
      number: `VOU-BK-${Math.floor(100 + Math.random() * 899)}`,
      description: description,
      total: amount,
      paid: amount,
      paymentMethod: method,
      paymentRef: reference
    };

    const profileLedger = ledgers[contactId] || [];
    const nextLedgers = {
      ...ledgers,
      [contactId]: [...profileLedger, newEntry]
    };

    // Validate balances
    const { treasuryBalance: simT, bankBalance: simB } = simulateBalances(nextLedgers, adjustments, expenses);
    if (simT < 0 || simB < 0) {
      triggerToast("⚠️ عذراً: رصيد الخزنة أو البنك لا يقبل هذه الدفعة لعدم كفاية السيولة النقدية مسبقاً!", "err");
      alert(`⚠️ لا يمكن إتمام قيد الدفعة المباشرة: المبلغ المطلوب أكبر من الرصيد المتوفر بالخزنة أو البنك.`);
      return;
    }

    setLedgers(nextLedgers);
  };

  const handleUpdateExpenses = (nextExpenses: GeneralExpense[]) => {
    // Validate balances
    const { treasuryBalance: simT, bankBalance: simB } = simulateBalances(ledgers, adjustments, nextExpenses);
    if (simT < 0 || simB < 0) {
      triggerToast("⚠️ عذراً: رصيد الخزنة أو البنك لا يقبل هذه المصاريف لعدم كفاية الرصيد المتوفر!", "err");
      alert(`⚠️ لا يمكن إتمام عملية القيد/الحذف: المبلغ المطلوب أكبر من الرصيد المتوفر بالخزنة أو البنك.`);
      return;
    }
    setExpenses(nextExpenses);
  };

  const handleRestoreAllData = (data: {
    contacts: Contact[];
    ledgers: Record<string, LedgerEntry[]>;
    products: Product[];
    regions: Region[];
    productTypes: ProductType[];
    grades: Grade[];
    units: Unit[];
    inventory: InventoryItem[];
    prices: ProductPrice[];
  }) => {
    setContacts(data.contacts);
    setLedgers(data.ledgers);
    setProducts(data.products);
    setRegions(data.regions);
    setProductTypes(data.productTypes);
    setGrades(data.grades);
    setUnits(data.units);
    setInventory(data.inventory);
    setPrices(data.prices);
  };

  const handleFactoryReset = () => {
    // تصفير وتفريغ جميع الجداول والبيانات وبطاقات التعريف والاعتمادات تماماً
    setContacts([]);
    setLedgers({});
    setProducts([]);
    setRegions([]);
    setProductTypes([]);
    setGrades([]);
    setUnits([]);
    setInventory([]);
    setPrices([]);
    setAdjustments([]);
    setExpenses([]);
    
    // تصفير إعدادات النظام للقيم الأساسية مع أرصدة صفرية تماما للبدء من الصفر
    const clearedSettings: SystemSettings = {
      invoiceHeaderAr: "الشركة الدولية لتجارة الفاكهة والتوريد العام",
      invoiceHeaderEn: "International Company for Fruit Trading",
      invoiceDeclarationAr: "المركز الرئيسي لإدارة الحسابات العامة ومطابقة الحسابات",
      currencySymbol: "ج.س",
      initialTreasuryBalance: 0,
      initialBankBalance: 0
    };
    setSettings(clearedSettings);

    const defaultUsers: User[] = [
      {
        id: 'u-1',
        username: 'admin',
        password: '123',
        fullName: 'المدير العام',
        isActive: true,
        permissions: {
          viewTreasury: true,
          viewInventory: true,
          viewContacts: true,
          viewPricing: true,
          viewInvoices: true,
          manageBackup: true,
          manageSettings: true
        }
      },
      {
        id: 'u-2',
        username: 'ibrahim',
        password: '123',
        fullName: 'إبراهيم داؤود (المحاسب المالي الرئيسي)',
        isActive: true,
        permissions: {
          viewTreasury: true,
          viewInventory: true,
          viewContacts: true,
          viewPricing: true,
          viewInvoices: true,
          manageBackup: true,
          manageSettings: false
        }
      },
      {
        id: 'u-3',
        username: 'cashier',
        password: '123',
        fullName: 'مساعد الخزنة (محاسب صندوق)',
        isActive: true,
        permissions: {
          viewTreasury: true,
          viewInventory: true,
          viewContacts: true,
          viewPricing: false,
          viewInvoices: true,
          manageBackup: false,
          manageSettings: false
        }
      }
    ];
    setUsers(defaultUsers);

    // كتابة المجموعات الفارغة مباشرة في التخزين الذاتي لقاعدة البيانات المحلية
    localStorage.setItem('erp_contacts', JSON.stringify([]));
    localStorage.setItem('erp_ledgers', JSON.stringify({}));
    localStorage.setItem('erp_products', JSON.stringify([]));
    localStorage.setItem('erp_regions', JSON.stringify([]));
    localStorage.setItem('erp_product_types', JSON.stringify([]));
    localStorage.setItem('erp_grades', JSON.stringify([]));
    localStorage.setItem('erp_units', JSON.stringify([]));
    localStorage.setItem('erp_inventory', JSON.stringify([]));
    localStorage.setItem('erp_prices', JSON.stringify([]));
    localStorage.setItem('erp_adjustments', JSON.stringify([]));
    localStorage.setItem('erp_expenses', JSON.stringify([]));
    localStorage.setItem('erp_settings', JSON.stringify(clearedSettings));
    localStorage.setItem('erp_users', JSON.stringify(defaultUsers));
  };

  // --- LEDGER STATEMENTS PDF DOWNLOAD CLIENT ENGINE ---
  const handleDownloadLedgerPDF = async () => {
    const element = document.getElementById('ledger-statement-area');
    if (!element) return;
    try {
      const scaleVal = 2; // High resolution
      const canvas = await withSafePDFStyles(() => html2canvas(element, {
        scale: scaleVal,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        ignoreElements: (el) => el.classList.contains('no-print'),
        onclone: (clonedDoc) => {
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

      pdf.save(`Statement_${activeContact?.name || 'Account'}.pdf`);
      triggerToast("تم تحميل كشف الحساب بنجاح وهو جاهز للمراجعة والطباعة");
    } catch (err) {
      console.error("Failed to generate ledger PDF statement: ", err);
      // Fallback
      window.print();
    }
  };

  // If not logged-in, show the login panel first
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 selection:bg-orange-650 selection:text-white" dir="rtl">
        {toastMessage && (
          <div className="fixed top-5 left-5 z-[51] bg-slate-900 text-white rounded-lg border border-slate-700 p-3.5 shadow-lg font-bold text-xs">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span>{toastMessage}</span>
            </div>
          </div>
        )}

        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 md:p-8 space-y-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-655/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-655/10 rounded-full blur-3xl"></div>

          <div className="text-center space-y-2 relative">
            <div className="w-16 h-16 bg-slate-800 border border-slate-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner">
              <FolderLock className="w-8 h-8 text-orange-500 animate-pulse" />
            </div>
            <h1 className="text-xl font-black text-white">{settings.invoiceHeaderAr || "منظومة إدارية ومحاسبية متكاملة"}</h1>
            <p className="text-xs text-slate-400 font-medium">تسجيل الدخول لتفويض الوصول للدفاتر والمستندات</p>
          </div>

          <form onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const username = (form.elements.namedItem('username') as HTMLInputElement).value.trim();
            const password = (form.elements.namedItem('password') as HTMLInputElement).value;

            const matchedUser = users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);
            if (matchedUser) {
              if (!matchedUser.isActive) {
                triggerToast("⚠️ هذا المستخدم غير نشط حالياً، يرجى مراجعة المدير", "err");
                return;
              }
              setCurrentUser(matchedUser);
              triggerToast(`👋 أهلاً بك يا ${matchedUser.fullName}، تم الدخول بنجاح!`, "success");
            } else {
              triggerToast("❌ اسم المستخدم أو كلمة المرور غير صحيحة", "err");
            }
          }} className="space-y-4 relative">
            <div>
              <label className="block text-[10px] uppercase font-black tracking-wider text-slate-400 mb-1.5">حساب المحاسب المفوض</label>
              <select 
                name="username" 
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3.5 py-2.5 text-xs font-bold focus:outline-none focus:border-orange-500 transition-colors cursor-pointer"
              >
                {users.map(u => (
                  <option key={u.id} value={u.username}>{u.fullName} ({u.roleAr})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-black tracking-wider text-slate-400 mb-1.5">كلمة المرور السرية</label>
              <input 
                type="password" 
                name="password" 
                required 
                placeholder="أدخل كلمة المرور المعتمدة" 
                className="w-full bg-slate-800 border border-slate-700 text-white placeholder-slate-500 rounded-xl px-3.5 py-2.5 text-xs font-bold focus:outline-none focus:border-orange-550 focus:border-orange-500 transition-colors"
              />
            </div>

            <button 
              type="submit" 
              className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs py-3 rounded-xl shadow-lg hover:shadow-orange-700/20 cursor-pointer active:scale-95 transition-transform"
            >
              دخول آمن للوحة العمل المحاسبية
            </button>
          </form>

          <div className="text-center text-[10px] text-slate-500 mt-4 leading-normal select-none">
            <span>كلمة المرور الافتراضية لكافة الحسابات هي: <strong className="text-slate-400 font-bold">123</strong></span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 antialiased selection:bg-slate-900 selection:text-amber-300 pb-16">
      
      {/* Toast Alert Drawer */}
      {toastMessage && (
        <div className="fixed top-5 left-5 z-[51] bg-slate-900 text-white rounded-lg border border-slate-700 p-3.5 shadow-25 animate-bounce font-bold text-xs select-none">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* --- MASTER HEADER AND SYSTEM TITLE --- */}
      <header className="bg-slate-900 text-white shadow-md no-print select-none shrink-0" dir="rtl">
        <div className="w-full max-w-7xl mx-auto px-4 py-4 flex flex-col md:flex-row justify-between items-center gap-3">
          
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded bg-amber-500 text-slate-900 font-extrabold flex items-center justify-center text-lg italic shadow">
              {currentUser?.fullName?.[0] || 'M'}
            </div>
            <div>
              <h1 className="text-sm md:text-base font-black tracking-tight flex items-center gap-1.5 leading-none">
                <span>{settings.invoiceHeaderAr || "منظومة الحسابات والمخازن المتكاملة"}</span>
                <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.5 rounded font-mono font-black scale-90">
                  {settings.currencySymbol || "ج.س"}
                </span>
              </h1>
              <p className="text-[10px] text-slate-300 font-bold mt-1">
                {settings.invoiceDeclarationAr || "اللوحة المحاسبية الموحدة لجميع الفروع وتصدير كشوف الذمم المالية والعهد والترحيل المباشر"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {currentUser && (
              <div className="bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-1.5 flex items-center gap-2 text-xs font-bold text-slate-200 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>المستخدم: {currentUser.fullName}</span>
                <span className="text-[10px] text-slate-400 font-mono">({currentUser.username})</span>
                <button 
                  onClick={() => {
                    setCurrentUser(null);
                    triggerToast("🔒 تم تسجيل الخروج بنجاح وتأمين الدفاتر", "success");
                  }} 
                  className="mr-2 text-rose-400 hover:text-rose-300 transition-colors font-black underline cursor-pointer text-[10px]"
                >
                  خروج
                </button>
              </div>
            )}
            <div className="text-left md:text-right hidden sm:flex items-center gap-2">
              {autoSaveStatus === 'saving' && (
                <span className="text-[10px] bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded font-bold border border-amber-500/25 animate-pulse shrink-0">
                  🔄 جاري الحفظ تلقائياً...
                </span>
              )}
              {autoSaveStatus === 'saved' && (
                <span className="text-[10px] bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded font-bold border border-emerald-500/25 shrink-0">
                  ✓ تم المزامنة والحفظ التلقائي
                </span>
              )}
              {autoSaveStatus === 'error' && (
                <span className="text-[10px] bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded font-bold border border-rose-500/25 shrink-0">
                  💾 حفظ محلي آمن (XAMPP غير متصل)
                </span>
              )}
              <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono font-black border border-slate-700">
                PORT COMPATIBLE | SECURE SESSIONS
              </span>
            </div>
          </div>

        </div>
      </header>

      {/* --- FINANCIAL STATISTICS BENTO GRID --- */}
      <section className="w-full max-w-7xl mx-auto px-4 mt-6 no-print" dir="rtl">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5">
          
          {/* Card 1: Purchases */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4 relative overflow-hidden flex flex-col justify-between h-[96px]">
            <div className="flex justify-between items-center text-slate-450">
              <span className="text-[10px] font-black uppercase tracking-wide text-slate-500">إجمالي فاتورة الواردات (المشتريات)</span>
              <Warehouse className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-base md:text-lg font-black text-blue-900 font-mono tracking-tight">
              {globalDashboardStats.totalPurchases.toLocaleString('en-US', { minimumFractionDigits: 2 })} <span className="text-[10px] font-sans font-bold text-slate-400">ج.س</span>
            </div>
          </div>

          {/* Card 2: Sales */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4 relative overflow-hidden flex flex-col justify-between h-[96px]">
            <div className="flex justify-between items-center text-slate-450">
              <span className="text-[10px] font-black uppercase tracking-wide text-slate-500">أصل مبيعات العملاء (الصادرات)</span>
              <ArrowLeftRight className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-base md:text-lg font-black text-emerald-700 font-mono tracking-tight">
              {globalDashboardStats.totalSales.toLocaleString('en-US', { minimumFractionDigits: 2 })} <span className="text-[10px] font-sans font-bold text-slate-400">ج.س</span>
            </div>
          </div>

          {/* Card 3: Cash Inflow - Now Treasury Balance */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4 relative overflow-hidden flex flex-col justify-between h-[96px]">
            <div className="flex justify-between items-center text-slate-450">
              <span className="text-[10px] font-black uppercase tracking-wide text-slate-500">رصيد الخزينة الميدانية (النقدية)</span>
              <Receipt className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-base md:text-lg font-black text-emerald-600 font-mono tracking-tight">
              {globalDashboardStats.treasuryBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })} <span className="text-[10px] font-sans font-bold text-slate-400">ج.س</span>
            </div>
          </div>

          {/* Card 4: Cash Outflow - Now Bank Balance */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4 relative overflow-hidden flex flex-col justify-between h-[96px]">
            <div className="flex justify-between items-center text-slate-450">
              <span className="text-[10px] font-black uppercase tracking-wide text-slate-500 font-bold">رصيد الحساب البنكي (بنكك)</span>
              <Coins className="w-4 h-4 text-orange-500" />
            </div>
            <div className="text-base md:text-lg font-black font-mono tracking-tight text-orange-650 text-orange-650 text-orange-600">
              {globalDashboardStats.bankBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })} <span className="text-[10px] font-sans font-bold text-slate-400">ج.س</span>
            </div>
          </div>

          {/* Card 5: Net Wealth - Total Liquidity */}
          <div className="bg-slate-900 text-white rounded-xl shadow-xs p-4 relative overflow-hidden flex flex-col justify-between h-[96px]">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black uppercase tracking-wide text-amber-450 text-amber-400">صافي السيولة الإجمالية (خزينة + بنك)</span>
              <Scale className="w-4 h-4 text-amber-400 animate-pulse" />
            </div>
            <div className="text-base md:text-lg font-black text-amber-400 font-mono tracking-tight">
              {globalDashboardStats.netLiquidWealth.toLocaleString('en-US', { minimumFractionDigits: 2 })} <span className="text-[10px] font-sans font-bold text-slate-300">ج.س</span>
            </div>
          </div>

        </div>
      </section>

      {/* --- MAIN TABS NAV BAR NAVIGATION --- */}
      <section className="w-full max-w-7xl mx-auto px-4 mt-6 no-print" dir="rtl">
        {/* Mobile Dropdown Control for Superb Responsiveness */}
        <div className="lg:hidden w-full mb-3">
          <label className="block text-[11px] font-bold text-slate-500 mb-1">الذهاب السريع إلى الشاشة:</label>
          <select 
            value={activeTab} 
            onChange={(e) => handleTabClick(e.target.value as any)}
            className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-3 text-xs font-black text-slate-800 focus:outline-none shadow-xs"
          >
            {Object.keys(ALL_SYSTEM_SCREENS).map(key => {
              if (hasTabAccess(currentUser, key)) {
                return <option key={key} value={key}>{ALL_SYSTEM_SCREENS[key]}</option>;
              }
              return null;
            })}
          </select>
        </div>

        <div className="flex overflow-x-auto whitespace-nowrap border-b-2 border-slate-200 select-none gap-1 bg-slate-100/60 p-1 rounded-t-xl scrollbar-thin">
          
          {hasTabAccess(currentUser, 'quick_invoices') && (
            <button
              onClick={() => handleTabClick('quick_invoices')}
              className={`px-4 py-2.5 rounded-lg text-xs font-black cursor-pointer flex items-center gap-1.5 transition-all ${
                activeTab === 'quick_invoices' 
                  ? 'bg-slate-900 text-amber-400 shadow-md font-black scale-[1.03]' 
                  : 'text-slate-700 bg-white hover:text-slate-950 hover:bg-slate-50 border border-slate-200/50'
              }`}
            >
              <FileText className="w-4 h-4 text-emerald-500 animate-pulse" />
              <span className="font-extrabold text-[11px]">بوابة الفواتير السريعة (مشتريات/مبيعات) ⭐</span>
            </button>
          )}

          {hasTabAccess(currentUser, 'balance_sheet') && (
            <button
              onClick={() => handleTabClick('balance_sheet')}
              className={`px-4 py-2.5 rounded-lg text-xs font-black cursor-pointer flex items-center gap-1.5 transition-all ${
                activeTab === 'balance_sheet' 
                  ? 'bg-indigo-900 text-amber-300 shadow-md font-black scale-[1.03]' 
                  : 'text-slate-700 bg-white hover:text-slate-950 hover:bg-slate-50 border border-slate-200/50'
              }`}
            >
              <Scale className="w-4 h-4 text-indigo-500" />
              <span className="font-extrabold text-[11px]">الميزانية العمومية والمركز المالي 📊</span>
            </button>
          )}

          {hasTabAccess(currentUser, 'supplier') && (
            <button
              onClick={() => handleTabClick('supplier')}
              className={`px-4 py-2.5 rounded-lg font-bold text-xs cursor-pointer flex items-center gap-1.5 transition-all ${
                activeTab === 'supplier' 
                  ? 'bg-slate-900 text-amber-400 shadow-xs font-black' 
                  : 'text-slate-600 hover:text-slate-950 hover:bg-slate-50'
              }`}
            >
              <Users className="w-4 h-4 text-blue-600" />
              <span>الموردون وتوريد الفاكهة</span>
            </button>
          )}

          {hasTabAccess(currentUser, 'customer') && (
            <button
              onClick={() => handleTabClick('customer')}
              className={`px-4 py-2.5 rounded-lg font-bold text-xs cursor-pointer flex items-center gap-1.5 transition-all ${
                activeTab === 'customer' 
                  ? 'bg-slate-900 text-amber-400 shadow-xs font-black' 
                  : 'text-slate-600 hover:text-slate-950 hover:bg-slate-50'
              }`}
            >
              <Users className="w-4 h-4 text-emerald-600" />
              <span>العملاء والتحصيل المالي</span>
            </button>
          )}

          {hasTabAccess(currentUser, 'worker') && (
            <button
              onClick={() => handleTabClick('worker')}
              className={`px-4 py-2.5 rounded-lg font-bold text-xs cursor-pointer flex items-center gap-1.5 transition-all ${
                activeTab === 'worker' 
                  ? 'bg-slate-900 text-amber-400 shadow-xs font-black' 
                  : 'text-slate-600 hover:text-slate-950 hover:bg-slate-50'
              }`}
            >
              <Users className="w-4 h-4 text-purple-600" />
              <span>إدارة العمال</span>
            </button>
          )}

          {hasTabAccess(currentUser, 'inventory') && (
            <button
              onClick={() => handleTabClick('inventory')}
              className={`px-4 py-2.5 rounded-lg font-bold text-xs cursor-pointer flex items-center gap-1.5 transition-all ${
                activeTab === 'inventory' 
                  ? 'bg-slate-900 text-amber-400 shadow-xs font-black' 
                  : 'text-slate-600 hover:text-slate-950 hover:bg-slate-50'
              }`}
            >
              <Warehouse className="w-4 h-4 text-amber-500" />
              <span>المخازن وإدارة الأسعار</span>
            </button>
          )}

          {hasTabAccess(currentUser, 'bank_transfers') && (
            <button
              onClick={() => handleTabClick('bank_transfers')}
              className={`px-4 py-2.5 rounded-lg font-bold text-xs cursor-pointer flex items-center gap-1.5 transition-all ${
                activeTab === 'bank_transfers' 
                  ? 'bg-slate-900 text-amber-400 shadow-xs font-black' 
                  : 'text-slate-600 hover:text-slate-950 hover:bg-slate-50'
              }`}
            >
              <Coins className="w-4 h-4 text-orange-500 animate-pulse" />
              <span>الخزينة والحساب البنكي</span>
            </button>
          )}

          {hasTabAccess(currentUser, 'expenses') && (
            <button
              onClick={() => handleTabClick('expenses')}
              className={`px-4 py-2.5 rounded-lg font-bold text-xs cursor-pointer flex items-center gap-1.5 transition-all ${
                activeTab === 'expenses' 
                  ? 'bg-slate-900 text-amber-400 shadow-xs font-black' 
                  : 'text-slate-600 hover:text-slate-950 hover:bg-slate-50'
              }`}
            >
              <Coins className="w-4 h-4 text-rose-500" />
              <span>شاشة المنصرفات</span>
            </button>
          )}

          {hasTabAccess(currentUser, 'all_invoices') && (
            <button
              onClick={() => handleTabClick('all_invoices')}
              className={`px-4 py-2.5 rounded-lg font-bold text-xs cursor-pointer flex items-center gap-1.5 transition-all ${
                activeTab === 'all_invoices' 
                  ? 'bg-slate-900 text-amber-400 shadow-xs font-black' 
                  : 'text-slate-600 hover:text-slate-950 hover:bg-slate-50'
              }`}
            >
              <FileText className="w-4 h-4 text-teal-600" />
              <span>سجل الفواتير والطباعة الجماعية</span>
            </button>
          )}

          {hasTabAccess(currentUser, 'customer_profit') && (
            <button
              onClick={() => handleTabClick('customer_profit')}
              className={`px-4 py-2.5 rounded-lg font-bold text-xs cursor-pointer flex items-center gap-1.5 transition-all ${
                activeTab === 'customer_profit' 
                  ? 'bg-slate-900 text-amber-400 shadow-xs font-black' 
                  : 'text-slate-600 hover:text-slate-950 hover:bg-slate-50'
              }`}
            >
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              <span>حساب أرباح العملاء والنسب</span>
            </button>
          )}

          {hasTabAccess(currentUser, 'item_profit') && (
            <button
              onClick={() => handleTabClick('item_profit')}
              className={`px-4 py-2.5 rounded-lg font-bold text-xs cursor-pointer flex items-center gap-1.5 transition-all ${
                activeTab === 'item_profit' 
                  ? 'bg-slate-900 text-amber-400 shadow-xs font-black' 
                  : 'text-slate-600 hover:text-slate-950 hover:bg-slate-50'
              }`}
            >
              <BarChart4 className="w-4 h-4 text-emerald-500" />
              <span>تحليل الأرباح والأصناف (باليوم والشهر والسنة)</span>
            </button>
          )}

          {hasTabAccess(currentUser, 'daily_audit') && (
            <button
              onClick={() => handleTabClick('daily_audit')}
              className={`px-4 py-2.5 rounded-lg font-bold text-xs cursor-pointer flex items-center gap-1.5 transition-all ${
                activeTab === 'daily_audit' 
                  ? 'bg-slate-900 text-amber-400 shadow-xs font-black' 
                  : 'text-slate-600 hover:text-slate-950 hover:bg-slate-50'
              }`}
            >
              <Scale className="w-4 h-4 text-amber-500" />
              <span>المطابقة والمحاسبة اليومية</span>
            </button>
          )}

          {hasTabAccess(currentUser, 'backup') && (
            <button
              onClick={() => handleTabClick('backup')}
              className={`px-4 py-2.5 rounded-lg font-bold text-xs cursor-pointer flex items-center gap-1.5 transition-all ${
                activeTab === 'backup' 
                  ? 'bg-slate-900 text-amber-400 shadow-xs font-black' 
                  : 'text-slate-600 hover:text-slate-950 hover:bg-slate-50'
              }`}
            >
              <FolderLock className="w-4 h-4 text-rose-500" />
              <span>النسخ الاحتياطي وحماية السندات</span>
            </button>
          )}

          {hasTabAccess(currentUser, 'categories_admin') && (
            <button
              onClick={() => handleTabClick('categories_admin')}
              className={`px-4 py-2.5 rounded-lg font-bold text-xs cursor-pointer flex items-center gap-1.5 transition-all ${
                activeTab === 'categories_admin' 
                  ? 'bg-slate-900 text-amber-400 shadow-xs font-black' 
                  : 'text-slate-600 hover:text-slate-950 hover:bg-slate-50'
              }`}
            >
              <Settings className="w-4 h-4 text-amber-500" />
              <span>إدارة الأصناف والصفات</span>
            </button>
          )}

          {hasTabAccess(currentUser, 'users_permissions') && (
            <button
              onClick={() => handleTabClick('users_permissions')}
              className={`px-4 py-2.5 rounded-lg font-bold text-xs cursor-pointer flex items-center gap-1.5 transition-all ${
                activeTab === 'users_permissions' 
                  ? 'bg-slate-900 text-amber-400 shadow-xs font-black' 
                  : 'text-slate-600 hover:text-slate-950 hover:bg-slate-50'
              }`}
            >
              <ShieldAlert className="w-4 h-4 text-rose-500" />
              <span className="text-rose-700 font-extrabold">صلاحيات المستخدمين</span>
            </button>
          )}

          {hasTabAccess(currentUser, 'system_settings') && (
            <button
              onClick={() => handleTabClick('system_settings')}
              className={`px-4 py-2.5 rounded-lg font-bold text-xs cursor-pointer flex items-center gap-1.5 transition-all ${
                activeTab === 'system_settings' 
                  ? 'bg-slate-900 text-amber-400 shadow-xs font-black' 
                  : 'text-slate-600 hover:text-slate-950 hover:bg-slate-50'
              }`}
            >
              <Settings className="w-4 h-4 text-slate-600" />
              <span className="text-slate-700 font-extrabold">إعدادات النظام والماليات</span>
            </button>
          )}

        </div>
      </section>

      {/* --- CONDITIONAL VIEWPORTS RENDERED BASED ON CHOICE --- */}
      <main className="w-full max-w-7xl mx-auto px-4 mt-5" dir="rtl">
        
        {activeTab === 'balance_sheet' && (
          <BalanceSheetTab
            contacts={contacts}
            ledgers={ledgers}
            inventory={inventory}
            expenses={expenses}
            adjustments={adjustments}
            settings={settings}
            selectedYear={selectedYear}
            triggerToast={triggerToast}
          />
        )}

        {activeTab === 'quick_invoices' && (
          <QuickInvoicesTab
            contacts={contacts}
            ledgers={filteredLedgers}
            products={products}
            triggerToast={triggerToast}
            currencySymbol={settings.currencySymbol}
            onOpenInvoiceModal={(contactId, invoiceType) => {
              setActiveContactId(contactId);
              setEditingInvoice(null);
              setEditingInvoiceContactId('');
              // Force opening of Invoice Generation dialog
              setShowInvoiceModal(true);
            }}
            onViewInvoice={(entry, contact) => {
              setSelectedDocument(entry);
              setActiveContactId(contact.id);
            }}
          />
        )}

        {activeTab === 'inventory' && (
          /* INVENTORY & PRICING MANAGER COMPONENT LINKED */
          <InventoryTab 
            products={products}
            regions={regions}
            productTypes={productTypes}
            grades={grades}
            units={units}
            inventory={inventory}
            prices={prices}
            isRtl={isRtl}
            onUpdateInventory={setInventory}
            onUpdatePrices={setPrices}
            triggerToast={triggerToast}
            currentUser={currentUser}
          />
        )}

        {activeTab === 'bank_transfers' && (
          <BankTransfersTab
            contacts={contacts}
            ledgers={filteredLedgers}
            onAddPayment={handleAddDirectBankPayment}
            triggerToast={triggerToast}
            adjustments={filteredAdjustments}
            onUpdateAdjustments={setAdjustments}
            settings={settings}
            expenses={filteredExpenses}
          />
        )}

        {activeTab === 'expenses' && (
          <ExpensesTab 
            expenses={filteredExpenses}
            onUpdateExpenses={handleUpdateExpenses}
            contacts={contacts}
            ledgers={filteredLedgers}
            triggerToast={triggerToast}
            currentUser={currentUser}
            settings={settings}
          />
        )}

        {activeTab === 'customer_profit' && (
          <CustomerProfitTab
            contacts={contacts}
            ledgers={filteredLedgers}
            inventory={inventory}
            products={products}
            triggerToast={triggerToast}
            currencySymbol={settings.currencySymbol}
            profitRatios={profitRatios}
            onUpdateProfitRatios={setProfitRatios}
            commissionPayouts={commissionPayouts}
            onUpdateCommissionPayouts={setCommissionPayouts}
            expenses={filteredExpenses}
            onUpdateExpenses={handleUpdateExpenses}
            currentUser={currentUser}
          />
        )}

        {activeTab === 'item_profit' && (
          <ProfitReportTab
            contacts={contacts}
            ledgers={filteredLedgers}
            inventory={inventory}
            products={products}
            expenses={filteredExpenses}
            triggerToast={triggerToast}
            currencySymbol={settings.currencySymbol}
          />
        )}

        {activeTab === 'all_invoices' && (
          <AllInvoicesTab
            contacts={contacts}
            ledgers={filteredLedgers}
            products={products}
            triggerToast={triggerToast}
            onViewInvoice={(entry, contact) => {
              setSelectedDocument(entry);
              setActiveContactId(contact.id);
            }}
            onDeleteInvoice={handleDeleteLedgerInvoice}
            onEditInvoice={(entry, contact) => {
              setActiveContactId(contact.id);
              setActiveTab(contact.type);
              setEditingInvoice(entry);
              setEditingInvoiceContactId(contact.id);
              setShowInvoiceModal(true);
            }}
          />
        )}

        {activeTab === 'daily_audit' && (
          <DailyAuditTab
            contacts={contacts}
            ledgers={filteredLedgers}
            products={products}
            adjustments={filteredAdjustments}
            triggerToast={triggerToast}
            onViewInvoice={(entry, contact) => {
              setSelectedDocument(entry);
              setActiveContactId(contact.id);
            }}
            currentUser={currentUser}
          />
        )}

        {activeTab === 'backup' && (
          <BackupRestoreTab
            contacts={contacts}
            ledgers={ledgers}
            products={products}
            regions={regions}
            productTypes={productTypes}
            grades={grades}
            units={units}
            inventory={inventory}
            prices={prices}
            onRestoreAllData={handleRestoreAllData}
            onFactoryReset={handleFactoryReset}
            triggerToast={triggerToast}
          />
        )}

        {activeTab === 'categories_admin' && (
          <CategoriesAdminTab
            products={products}
            regions={regions}
            productTypes={productTypes}
            grades={grades}
            units={units}
            onUpdateProducts={setProducts}
            onUpdateRegions={setRegions}
            onUpdateProductTypes={setProductTypes}
            onUpdateGrades={setGrades}
            onUpdateUnits={setUnits}
            triggerToast={triggerToast}
          />
        )}

        {activeTab === 'users_permissions' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 space-y-6 shadow-xs animate-fade-in text-right" dir="rtl">
            <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <h2 className="text-lg font-black text-slate-900">إدارة صلاحيات المستخدمين والمحاسبين الميدانيين</h2>
                <p className="text-xs text-slate-500 mt-1">تحديد الأذونات الأمنية والتحكم في رؤية الخزنة والمخازن والفواتير لمنتسبي الشركة</p>
              </div>
              <span className="text-[10px] bg-red-100 text-red-800 font-extrabold px-3 py-1.5 rounded-lg border border-red-200">
                ⚠️ صلاحيات إدارية رفيعة المستوى
              </span>
            </div>

            {/* List and Grid of Users */}
            <div className="space-y-4">
              <h3 className="text-xs font-black text-slate-450 uppercase tracking-wider mb-2 border-r-4 border-rose-500 pr-2 pb-0.5">سجل المحاسبين المعتمدين وصلاحياتهم</h3>
              <div className="border border-slate-200 rounded-xl overflow-x-auto">
                <table className="w-full text-xs text-right border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                      <th className="p-3 text-center w-[50px]">الحالة</th>
                      <th className="p-3">الاسم الكامل للمحاسب</th>
                      <th className="p-3">اسم المستخدم</th>
                      <th className="p-3">كلمة المرور 🔑</th>
                      <th className="p-3 text-center w-[285px]">إدارة وصلاحيات الشاشات 🛡️</th>
                      <th className="p-3 text-center w-[220px]">الإجراءات والمحاسبة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {users.map(u => {
                      const isEditing = editingUserId === u.id;
                      return (
                        <React.Fragment key={u.id}>
                          <tr className="hover:bg-slate-50/50">
                            {/* Indicator active */}
                            <td className="p-3 text-center">
                              <span className={`inline-block w-2.5 h-2.5 rounded-full ${u.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></span>
                            </td>

                            {/* Accountant Full Name */}
                            <td className="p-3 font-extrabold text-slate-900">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={editUserFullName}
                                  onChange={(e) => setEditUserFullName(e.target.value)}
                                  className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 font-bold text-slate-900 outline-none focus:ring-1 focus:ring-blue-500 text-xs text-right"
                                />
                              ) : (
                                u.fullName
                              )}
                            </td>

                            {/* Accountant Username */}
                            <td className="p-3 font-mono font-bold text-slate-500">
                              {isEditing ? (
                                <input
                                  type="text"
                                  disabled={u.username === 'admin'}
                                  value={editUserUsername}
                                  onChange={(e) => setEditUserUsername(e.target.value)}
                                  className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 font-mono font-bold disabled:opacity-50 text-slate-600 outline-none focus:ring-1 focus:ring-blue-500 text-xs text-left"
                                />
                              ) : (
                                u.username
                              )}
                            </td>

                            {/* Accountant Visible Password */}
                            <td className="p-3 font-mono font-bold text-rose-600">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={editUserPassword}
                                  onChange={(e) => setEditUserPassword(e.target.value)}
                                  className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 font-mono font-bold text-rose-600 outline-none focus:ring-1 focus:ring-blue-500 text-xs text-left"
                                />
                              ) : (
                                <span className="bg-rose-50 border border-rose-100 text-rose-700 px-2.5 py-1 rounded-md text-[11px] select-all font-black inline-block">
                                  {u.password}
                                </span>
                              )}
                            </td>
                            
                            {/* Screen permissions trigger button */}
                            <td className="p-3 text-center">
                              <button
                                type="button"
                                onClick={() => setExpandedUserId(expandedUserId === u.id ? null : u.id)}
                                className={`px-3 py-1.5 rounded-lg text-[10px] md:text-xs font-black cursor-pointer flex items-center gap-1.5 mx-auto transition-all ${
                                  expandedUserId === u.id 
                                    ? 'bg-rose-600 text-white shadow-xs' 
                                    : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                                }`}
                              >
                                <ShieldCheck className="w-3.5 h-3.5" />
                                <span>شاشات النظام ({Object.keys(ALL_SYSTEM_SCREENS).filter(key => hasTabAccess(u, key)).length} من 16) ⚙️</span>
                              </button>
                            </td>

                            {/* INLINE EDITING ACTIONS AND BUTTONS */}
                            <td className="p-3 text-center flex flex-wrap justify-center gap-1.5 min-w-[200px]">
                              {isEditing ? (
                                <>
                                  <button
                                    onClick={() => {
                                      if (!editUserFullName.trim() || !editUserUsername.trim() || !editUserPassword.trim()) {
                                        triggerToast("❌ يرجى تعبئة كافة حقول المحاسب بصورة صحيحة", "err");
                                        return;
                                      }
                                      const uLower = editUserUsername.trim().toLowerCase();
                                      if (uLower !== u.username && users.some(userItem => userItem.username === uLower)) {
                                        triggerToast("❌ اسم المستخدم هذا مستخدم بالفعل من جانب مستخدم آخر", "err");
                                        return;
                                      }

                                      const updated = users.map(userItem => {
                                        if (userItem.id === u.id) {
                                          return {
                                            ...userItem,
                                            fullName: editUserFullName.trim(),
                                            username: uLower,
                                            password: editUserPassword.trim()
                                          };
                                        }
                                        return userItem;
                                      });
                                      setUsers(updated);
                                      localStorage.setItem('erp_users', JSON.stringify(updated));
                                      setEditingUserId(null);
                                      triggerToast(`💾 تم حفظ تعديلات المحاسب ${editUserFullName} بنجاح`, "success");
                                    }}
                                    className="px-2 py-1 rounded text-[10px] font-black cursor-pointer bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
                                  >
                                    حفظ 💾
                                  </button>
                                  <button
                                    onClick={() => setEditingUserId(null)}
                                    className="px-2 py-1 rounded text-[10px] font-black cursor-pointer bg-slate-200 hover:bg-slate-300 text-slate-800"
                                  >
                                    إلغاء ❌
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => {
                                      setEditingUserId(u.id);
                                      setEditUserFullName(u.fullName);
                                      setEditUserUsername(u.username);
                                      setEditUserPassword(u.password);
                                    }}
                                    className="px-2 py-1 rounded text-[10px] font-black cursor-pointer bg-amber-500 hover:bg-amber-600 text-slate-950 font-black"
                                  >
                                    تعديل ⚙️
                                  </button>
                                  <button
                                    disabled={u.username === 'admin'}
                                    onClick={() => {
                                      if (window.confirm(`⚠️ هل أنت متأكد من حذف حساب المحاسب "${u.fullName}" نهائياً من النظام ومسح صلاحياته الاستخدامية؟`)) {
                                        const updated = users.filter(userItem => userItem.id !== u.id);
                                        setUsers(updated);
                                        localStorage.setItem('erp_users', JSON.stringify(updated));
                                        triggerToast("🗑️ تم حذف حساب المحاسب الميداني بنجاح من الدليل الإلكتروني.", "success");
                                      }
                                    }}
                                    className="px-2 py-1 rounded text-[10px] font-black cursor-pointer bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-40"
                                  >
                                    حذف 🗑️
                                  </button>
                                  <button
                                    disabled={u.username === 'admin'}
                                    onClick={() => {
                                      const updated = users.map(userItem => {
                                        if (userItem.id === u.id) {
                                          return { ...userItem, isActive: !userItem.isActive };
                                        }
                                        return userItem;
                                      });
                                      setUsers(updated);
                                      localStorage.setItem('erp_users', JSON.stringify(updated));
                                      triggerToast(`⚙️ تم تغيير حالة المحاسب ${u.fullName}`, "success");
                                    }}
                                    className={`px-2 py-1 rounded text-[10px] font-black cursor-pointer transition-colors ${u.isActive ? 'bg-amber-100 hover:bg-amber-200 text-amber-850' : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-850'} disabled:opacity-50`}
                                  >
                                    {u.isActive ? "تعطيل" : "تنشيط"}
                                  </button>
                                </>
                              )}
                            </td>
                          </tr>

                          {/* Expandable detailed grid for all 16 system screens checkboxes */}
                          {expandedUserId === u.id && (
                            <tr className="bg-slate-50/50">
                              <td colSpan={6} className="p-4 bg-slate-50/80 border-b border-slate-200">
                                <div className="text-right space-y-4">
                                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-200 pb-2.5">
                                    <div className="flex items-center gap-2">
                                      <ShieldAlert className="w-4.5 h-4.5 text-rose-600 animate-pulse" />
                                      <span className="font-extrabold text-[12px] text-slate-800">
                                        تخصيص صلاحيات الوصول لشاشات النظام المالي للمحاسب: <span className="text-blue-700 font-black">{u.fullName}</span>
                                      </span>
                                    </div>
                                    {u.username !== 'admin' && (
                                      <div className="flex gap-2">
                                        <button 
                                          type="button"
                                          onClick={() => {
                                            const allGranted = Object.keys(ALL_SYSTEM_SCREENS).reduce((acc, screen) => {
                                              acc[screen] = true;
                                              return acc;
                                            }, {} as Record<string, boolean>);
                                            const updated = users.map(userItem => {
                                              if (userItem.id === u.id) {
                                                return {
                                                  ...userItem,
                                                  permissions: { ...userItem.permissions, ...allGranted }
                                                };
                                              }
                                              return userItem;
                                            });
                                            setUsers(updated);
                                            localStorage.setItem('erp_users', JSON.stringify(updated));
                                            triggerToast(`⚙️ تم منح جميع الصلاحيات للمحاسب ${u.fullName}`, "success");
                                          }}
                                          className="text-[10px] bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg px-2.5 py-1.5 font-bold transition-colors"
                                        >
                                          منح كافة الشاشات ✅
                                        </button>
                                        <button 
                                          type="button"
                                          onClick={() => {
                                            const allRevoked = Object.keys(ALL_SYSTEM_SCREENS).reduce((acc, screen) => {
                                              acc[screen] = false;
                                              return acc;
                                            }, {} as Record<string, boolean>);
                                            const updated = users.map(userItem => {
                                              if (userItem.id === u.id) {
                                                return {
                                                  ...userItem,
                                                  permissions: { ...userItem.permissions, ...allRevoked }
                                                };
                                              }
                                              return userItem;
                                            });
                                            setUsers(updated);
                                            localStorage.setItem('erp_users', JSON.stringify(updated));
                                            triggerToast(`⚙️ تم حجب جميع الشاشات عن المحاسب ${u.fullName}`, "err");
                                          }}
                                          className="text-[10px] bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg px-2.5 py-1.5 font-bold transition-colors"
                                        >
                                          حظر كافة الشاشات ❌
                                        </button>
                                      </div>
                                    )}
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                    {Object.entries(ALL_SYSTEM_SCREENS).map(([screenKey, screenName]) => {
                                      const hasAccess = hasTabAccess(u, screenKey);
                                      return (
                                        <label 
                                          key={screenKey} 
                                          className={`flex items-center gap-2.5 p-3 rounded-xl border transition-all cursor-pointer text-xs select-none ${
                                            hasAccess 
                                              ? 'bg-emerald-50/50 border-emerald-200 text-slate-900 shadow-2xs font-extrabold' 
                                              : 'bg-white border-slate-200 text-slate-450 hover:bg-slate-50/50'
                                          }`}
                                        >
                                          <input
                                            type="checkbox"
                                            checked={hasAccess}
                                            disabled={u.username === 'admin'}
                                            onChange={(e) => {
                                              const updated = users.map(userItem => {
                                                if (userItem.id === u.id) {
                                                  return {
                                                    ...userItem,
                                                    permissions: { 
                                                      ...userItem.permissions, 
                                                      [screenKey]: e.target.checked 
                                                    }
                                                  };
                                                }
                                                return userItem;
                                              });
                                              setUsers(updated);
                                              localStorage.setItem('erp_users', JSON.stringify(updated));
                                              triggerToast(`⚙️ تم تحديث صلاحية دخول شاشة (${screenName}) للمحاسب ${u.fullName}`, "success");
                                            }}
                                            className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600 disabled:opacity-50"
                                          />
                                          <span>{screenName}</span>
                                        </label>
                                      );
                                    })}
                                  </div>
                                  
                                  {u.username === 'admin' && (
                                    <p className="text-[10px] text-amber-600 font-bold select-none">
                                      💡 حساب المدير العام يمتلك دائماً كافة الصلاحيات بصورة كاملة وغير قابلة للتعديل لحماية النظام من الإغلاق غير المقصود.
                                    </p>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Form to Add New Accountant */}
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-5 mt-6 space-y-4">
              <h3 className="text-xs font-black text-slate-800 flex items-center gap-1.5 border-b border-slate-200 pb-2.5">
                <Plus className="w-4 h-4 text-blue-600" />
                <span>إضافة محاسب مالي / مخازن جديد في الشركة</span>
              </h3>

              <form onSubmit={(e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const fn = (form.elements.namedItem('fullName') as HTMLInputElement).value.trim();
                const un = (form.elements.namedItem('username') as HTMLInputElement).value.trim().toLowerCase();
                const pw = (form.elements.namedItem('password') as HTMLInputElement).value;

                if (users.some(usr => usr.username === un)) {
                  triggerToast("❌ اسم المستخدم هذا موجود مسجلاً مسبقاً، يرجى كتابة اسم غير تكراري", "err");
                  return;
                }

                const newUser: User = {
                  id: `user-${Date.now()}`,
                  username: un,
                  password: pw,
                  fullName: fn,
                  isActive: true,
                  permissions: {
                    viewTreasury: true,
                    viewInventory: true,
                    viewContacts: true,
                    viewPricing: true,
                    viewInvoices: true,
                    manageBackup: false,
                    manageSettings: false,
                  }
                };

                const updatedUsers = [...users, newUser];
                setUsers(updatedUsers);
                localStorage.setItem('erp_users', JSON.stringify(updatedUsers));
                triggerToast(`🎉 تم تسجيل المحاسب ${fn} وإعطائه الأذونات القياسية بنجاح!`, "success");
                form.reset();
              }} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-slate-700 mb-1">الاسم الكامل للمحاسب</label>
                  <input 
                    type="text" 
                    name="fullName" 
                    required 
                    placeholder="مثال: عبدالرحمن أحمد محمد"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-slate-400 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-700 mb-1">اسم المستخدم للدخول</label>
                  <input 
                    type="text" 
                    name="username" 
                    required 
                    placeholder="مثال: abdo"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-slate-400 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-700 mb-1">كلمة المرور للدخول</label>
                  <input 
                    type="text" 
                    name="password" 
                    required 
                    defaultValue="123"
                    placeholder="مثال: 123"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-slate-400 transition-colors font-mono"
                  />
                </div>
                <div className="md:col-span-4">
                  <button 
                    type="submit" 
                    className="w-full bg-slate-900 border border-slate-800 text-amber-450 text-white hover:bg-slate-800 text-xs font-black py-2.5 rounded-xl shadow cursor-pointer active:scale-95 transition-transform"
                  >
                    تفويض وتسجيل المحاسب فوراً في المنظومة
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {activeTab === 'system_settings' && (
          <div className="space-y-6 animate-fade-in text-right" dir="rtl">
            
            {/* CARD 1: Standard Settings */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 space-y-6 shadow-xs">
              <div className="border-b border-slate-100 pb-4 flex justify-between items-center sm:flex-row flex-col gap-2">
                <div>
                  <h2 className="text-sm font-black text-slate-900">إعدادات النظام والترويسات والعملة الافتراضية</h2>
                  <p className="text-[11px] text-slate-500 mt-0.5">تعديل ترويسات ومطبوعات الفواتير الموحدة وضبط رؤوس أموال الخزائن والبنوك بشكل مباشر</p>
                </div>
                <div className="bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-bold text-amber-800">
                  <Settings className="w-4 h-4 text-amber-600 animate-spin" />
                  <span>الإعدادات العامة</span>
                </div>
              </div>

              <form onSubmit={(e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const headerAr = (form.elements.namedItem('invoiceHeaderAr') as HTMLInputElement).value;
                const headerEn = (form.elements.namedItem('invoiceHeaderEn') as HTMLInputElement).value;
                const descAr = (form.elements.namedItem('invoiceDeclarationAr') as HTMLInputElement).value;
                const symbol = (form.elements.namedItem('currencySymbol') as HTMLInputElement).value;
                const initTreasury = parseFloat((form.elements.namedItem('initialTreasuryBalance') as HTMLInputElement).value) || 0;
                const initBank = parseFloat((form.elements.namedItem('initialBankBalance') as HTMLInputElement).value) || 0;

                const updatedSettings: SystemSettings = {
                  invoiceHeaderAr: headerAr,
                  invoiceHeaderEn: headerEn,
                  invoiceDeclarationAr: descAr,
                  currencySymbol: symbol,
                  initialTreasuryBalance: initTreasury,
                  initialBankBalance: initBank,
                };

                setSettings(updatedSettings);
                localStorage.setItem('erp_settings', JSON.stringify(updatedSettings));
                triggerToast("💾 تم حفظ الإعدادات ورأس المال الجديد بنجاح في المنظومة", "success");
              }} className="space-y-6">
                
                {/* Part 1: Invoice Header customizer */}
                <div>
                  <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-3 border-r-4 border-emerald-500 pr-2 pb-0.5">تدرج ترويسة ومطبوعات الدفتر</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-black text-slate-700 mb-1">اسم المنشأة / الترويسة الرئيسية (بالعربي)</label>
                      <input 
                        type="text" 
                        name="invoiceHeaderAr" 
                        defaultValue={settings.invoiceHeaderAr} 
                        required
                        placeholder="مثال: أولاد داؤود لتجارة المواد الغذائية"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-slate-400 focus:bg-white transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-black text-slate-700 mb-1">اسم المنشأة باللغة الإنجليزية (يظهر على المطبوعات)</label>
                      <input 
                        type="text" 
                        name="invoiceHeaderEn" 
                        defaultValue={settings.invoiceHeaderEn} 
                        placeholder="Example: Al-Dawoud Fruits Trading Co."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-850 focus:outline-none focus:border-slate-400 focus:bg-white transition-colors text-left"
                        dir="ltr"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-black text-slate-700 mb-1">بيان النشاط / الإعلان الفرعي للترويسة</label>
                      <input 
                        type="text" 
                        name="invoiceDeclarationAr" 
                        defaultValue={settings.invoiceDeclarationAr} 
                        required
                        placeholder="مثال: استيراد وتأمين جميع الخضروات والفواكه الطازجة للتوريدات"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-slate-400 focus:bg-white transition-colors"
                      />
                    </div>
                  </div>
                </div>

                {/* Part 2: Currency configurator */}
                <div>
                  <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-3 border-r-4 border-amber-500 pr-2 pb-0.5">الرمزية النقدية (العملة الافتراضية)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-black text-slate-700 mb-1">رمز العملة (مثال: جنيه سوداني، SDG، ج.س، ريال)</label>
                      <input 
                        type="text" 
                        name="currencySymbol" 
                        defaultValue={settings.currencySymbol} 
                        required
                        placeholder="مثال: جنيه سوداني"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-slate-400 focus:bg-white transition-colors"
                      />
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-[10px] text-slate-500 font-bold self-end leading-relaxed">
                      تنبيه: سيتم عكس رمز العملة المدخل هنا في جميع الجريدات والميزانيات وصناديق الحساب وعمليات التفقيط اللغوية المطبوعة تلقائياً.
                    </div>
                  </div>
                </div>

                {/* Part 3: Initial Balances */}
                <div>
                  <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-3 border-r-4 border-blue-500 pr-2 pb-0.5">رؤوس الأموال التأسيسية المتاحة (رصيد البداية)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-black text-slate-700 mb-1">رأس المال الابتدائي المتوفر في الخزنة الميدانية</label>
                      <input 
                        type="number" 
                        name="initialTreasuryBalance" 
                        defaultValue={settings.initialTreasuryBalance} 
                        required
                        placeholder="مثال: 500000"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-slate-400 focus:bg-white transition-colors font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-black text-slate-700 mb-1">رأس المال الابتدائي المتوفر في الحساب البنكي (بنكك)</label>
                      <input 
                        type="number" 
                        name="initialBankBalance" 
                        defaultValue={settings.initialBankBalance} 
                        required
                        placeholder="مثال: 1200000"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-805 text-slate-800 focus:outline-none focus:border-slate-400 focus:bg-white transition-colors font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button 
                    type="submit" 
                    className="w-full bg-slate-900 border border-slate-800 text-white hover:bg-slate-800 text-xs font-black py-3 rounded-xl shadow cursor-pointer active:scale-95 transition-all text-center flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle className="w-4 h-4 text-amber-400" />
                    <span>تثبيت رأس المال التأسيسي الجديد وترويسات المطبوعات</span>
                  </button>
                </div>

              </form>
            </div>

            {/* CARD 2: FISCAL YEARS CONFIGURATION FOR RUNNING MULTIPLE CYCLES */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 space-y-6 shadow-xs">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                  <FolderLock className="w-5 h-5 text-indigo-500" />
                  <span>إدارة السنوات المالية وإقفال الحسابات السنوية</span>
                </h2>
                <p className="text-[11px] text-slate-500 mt-1">
                  يمكنك تحديد فترات القيود السنوية وإنشاء دفاتر منفصلة لكل عام مالي للتحكم الكامل في جرد مخازن التبريد وتدوير الأرصدة.
                </p>
              </div>

              {/* Add New FY form */}
              <div className="bg-slate-50 border border-slate-200/60 p-5 rounded-2xl space-y-4">
                <h3 className="text-xs font-black text-slate-850 flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-emerald-500" />
                  <span>فتح عام مالي جديد والبدء الجردي</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-black text-slate-600 mb-1">اسم العام المالي</label>
                    <input 
                      type="text" 
                      placeholder="العام المالي 2027" 
                      value={newYearName}
                      onChange={(e) => setNewYearName(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-600 mb-1">تاريخ بداية الدفتر</label>
                    <input 
                      type="date" 
                      value={newYearStart}
                      onChange={(e) => setNewYearStart(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none font-mono text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-600 mb-1">تاريخ نهاية الدفتر</label>
                    <input 
                      type="date" 
                      value={newYearEnd}
                      onChange={(e) => setNewYearEnd(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none font-mono text-center"
                    />
                  </div>
                </div>
                <div className="flex justify-end pt-1">
                  <button 
                    onClick={() => {
                      if (!newYearName.trim() || !newYearStart || !newYearEnd) {
                        alert("⚠️ يرجى تعبئة كافة حقول العام المالي الجديد (الاسم، تاريخ البدء، وتاريخ الانتهاء).");
                        return;
                      }
                      if (newYearStart >= newYearEnd) {
                        alert("⚠️ تاريخ بداية العام المالي يجب أن يكون أسبق من تاريخ الإغلاق السنوي.");
                        return;
                      }

                      // Check conflict
                      if (financialYears.some(y => y.name === newYearName.trim())) {
                        alert("⚠️ هذا الاسم مستخدم لعام مالي آخر بالفعل.");
                        return;
                      }

                      const newFy: FinancialYear = {
                        id: `fy-${Date.now()}`,
                        name: newYearName.trim(),
                        startDate: newYearStart,
                        endDate: newYearEnd,
                        isOpen: true
                      };

                      const nextYears = [...financialYears, newFy];
                      setFinancialYears(nextYears);
                      setActiveYearId(newFy.id);
                      setNewYearName('');
                      setNewYearStart('');
                      setNewYearEnd('');
                      triggerToast(`🎉 تم فتح العام المالي الجديد "${newFy.name}" بنجاح وتنشيطه كنطاق مفعل.`, "success");
                    }}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs px-4 py-2.5 rounded-xl cursor-pointer shadow-xs active:scale-95 transition-all"
                  >
                    + فتح دورة العام وتفعيلها
                  </button>
                </div>
              </div>

              {/* Existing FY grid */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-right border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-white font-bold border border-slate-800">
                      <th className="p-2.5">العام المالي</th>
                      <th className="p-2.5">تاريخ البدء</th>
                      <th className="p-2.5">تاريخ الإغلاق</th>
                      <th className="p-2.5 text-center">حالة الدفتر</th>
                      <th className="p-2.5 text-center">التحكم والعمل الجاري</th>
                    </tr>
                  </thead>
                  <tbody>
                    {financialYears.map((item) => {
                      const isActive = item.id === activeYearId;
                      return (
                        <tr key={item.id} className={`border border-slate-100 ${isActive ? 'bg-indigo-50/50 font-black' : 'hover:bg-slate-50'}`}>
                          <td className="p-2.5 font-extrabold text-slate-900">{item.name}</td>
                          <td className="p-2.5 font-mono text-slate-600">{item.startDate}</td>
                          <td className="p-2.5 font-mono text-slate-600">{item.endDate}</td>
                          <td className="p-2.5 text-center">
                            {item.isOpen ? (
                              <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded text-[10px] font-bold">🟢 مفتوح يقبل معاملات</span>
                            ) : (
                              <span className="bg-rose-100 text-rose-800 border border-rose-200 px-2 py-0.5 rounded text-[10px] font-bold">🔴 مغلق مؤرشف</span>
                            )}
                          </td>
                          <td className="p-2.5 flex items-center justify-center gap-1.5 flex-wrap">
                            {isActive ? (
                              <span className="text-indigo-600 font-extrabold text-[10px]">👈 نشط حالياً</span>
                            ) : (
                              <button 
                                onClick={() => {
                                  setActiveYearId(item.id);
                                  triggerToast(`👀 تم التبديل واستعراض كشوف الجرد والدفاتر لعام "${item.name}"`);
                                }}
                                className="bg-white border border-indigo-200 hover:bg-indigo-50 text-indigo-700 px-2 py-1 rounded text-[10px] cursor-pointer font-bold shadow-2xs"
                              >
                                استعراض وتفعيل
                              </button>
                            )}

                            <button
                              onClick={() => {
                                const nextState = !item.isOpen;
                                if (confirm(`هل أنت متأكد من رغبتك في ${nextState ? 'إعادة فتح' : 'قفل لتجميد'} قيود المعاملات للعام [${item.name}]؟`)) {
                                  setFinancialYears(financialYears.map(y => {
                                    if (y.id === item.id) return { ...y, isOpen: nextState };
                                    return y;
                                  }));
                                  triggerToast(`تم تحديث حالة الدفتر بنجاح`);
                                }
                              }}
                              className={`px-2 py-1 rounded text-[10px] font-bold cursor-pointer border ${item.isOpen ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'}`}
                            >
                              {item.isOpen ? '🔒 قفل' : '🔓 فتح'}
                            </button>

                            {financialYears.length > 1 && (
                              <button
                                onClick={() => {
                                  if (isActive) {
                                    alert("⚠️ لا يمكن حذف العام النشط حالياً، يرجى تفعيل عام آخر أولاً.");
                                    return;
                                  }
                                  if (confirm(`⚠️ تحذير: هل أنت متأكد تماماً من رغبتك في حذف السنة المالية [${item.name}] بالكامل؟ لن يتم مسح الحركات التابعة، ولكن سيتم إزالة هذا النطاق السنوي من الفلترة.`)) {
                                    setFinancialYears(financialYears.filter(y => y.id !== item.id));
                                    triggerToast("تم حذف النطاق السنوي من النظام", "err");
                                  }
                                }}
                                className="bg-red-50 border border-red-200 text-red-700 hover:bg-red-100 px-2 py-1 rounded text-[10px] font-bold cursor-pointer"
                              >
                                🗑️ حذف
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

            {/* CARD 3: REAL-TIME INVENTORY AUDIT & INTERACTIVE BALANCE SHEET GENERATOR FOR SELECTED FY */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 space-y-6 shadow-xs">
              
              <div className="border-b border-slate-100 pb-4 flex justify-between items-center flex-wrap gap-2">
                <div>
                  <h2 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                    <BarChart4 className="w-5 h-5 text-emerald-500" />
                    <span>ميزانية وجرد وختام العام المالي النشط: [ {selectedYear?.name} ]</span>
                  </h2>
                  <p className="text-[11px] text-slate-500 mt-1">
                    يعرض هذا الجدول الميزانية التشغيلية الختامية وجرد العام بناءً على التواريخ المفلترة الحالية وتكلفة المدخلات.
                  </p>
                </div>
                <button
                  onClick={() => setPreviewYearSnapshot(selectedYear)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs px-3.5 py-2.5 rounded-xl shadow cursor-pointer active:scale-95 transition-all flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" />
                  <span>طباعة تقرير الجرد والميزانية 🖨️</span>
                </button>
              </div>

              {/* Snapshot Dashboard stats representation */}
              {(() => {
                const snap = getYearSnapshot(selectedYear);
                return (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      
                      <div className="bg-slate-55 p-3.5 border border-slate-100 rounded-xl space-y-1">
                        <span className="text-[10px] font-black text-slate-500 block">إجمالي مبيعات وخدمات العام</span>
                        <div className="text-sm font-black text-slate-900 font-mono">
                          {snap.totalSales.toLocaleString()} <span className="text-[9px] font-bold text-slate-400">{settings.currencySymbol}</span>
                        </div>
                      </div>

                      <div className="bg-slate-55 p-3.5 border border-slate-100 rounded-xl space-y-1">
                        <span className="text-[10px] font-black text-slate-500 block">تكلفة السلع والمخزون المبيع</span>
                        <div className="text-sm font-black text-slate-800 font-mono">
                          {snap.costOfGoodsSold.toLocaleString()} <span className="text-[9px] font-bold text-slate-400">{settings.currencySymbol}</span>
                        </div>
                      </div>

                      <div className="bg-slate-55 p-3.5 border border-slate-100 rounded-xl space-y-1">
                        <span className="text-[10px] font-black text-slate-500 block">المنصرف والمصاريف العمومية</span>
                        <div className="text-sm font-black text-red-650 font-mono">
                          {snap.expensesAmount.toLocaleString()} <span className="text-[9px] font-bold text-slate-400">{settings.currencySymbol}</span>
                        </div>
                      </div>

                      <div className="bg-emerald-50/40 p-3.5 border border-emerald-100 rounded-xl space-y-1">
                        <span className="text-[10px] font-black text-emerald-700 block">صافي أرباح الفترة المحققة</span>
                        <div className="text-sm font-black text-emerald-800 font-mono">
                          {snap.netProfit.toLocaleString()} <span className="text-[9px] font-bold text-emerald-500">{settings.currencySymbol}</span>
                        </div>
                      </div>

                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
                      
                      <div className="bg-slate-50 border border-slate-200/55 p-3 rounded-lg text-center">
                        <span className="text-[9px] font-black text-slate-500 block">ديون العملاء المتبقية بذمتهم</span>
                        <span className="text-xs font-black text-slate-800 font-mono block mt-1">{snap.outstandingDebts.toLocaleString()} {settings.currencySymbol}</span>
                      </div>

                      <div className="bg-slate-50 border border-slate-200/55 p-3 rounded-lg text-center">
                        <span className="text-[9px] font-black text-slate-500 block">مستحقات الموردين بذمة المنشأة</span>
                        <span className="text-xs font-black text-slate-850 font-mono block mt-1">{snap.outstandingSupplierCredits.toLocaleString()} {settings.currencySymbol}</span>
                      </div>

                      <div className="bg-slate-50 border border-slate-200/55 p-3 rounded-lg text-center">
                        <span className="text-[9px] font-black text-slate-500 block">القيمة التقييمية للمخزون الحالي</span>
                        <span className="text-xs font-black text-indigo-700 font-mono block mt-1">{snap.stockValuation.toLocaleString()} {settings.currencySymbol}</span>
                      </div>

                      <div className="bg-slate-50 border border-slate-200/55 p-3 rounded-lg text-center">
                        <span className="text-[9px] font-black text-slate-500 block">رصيد الصندوق الميداني الفعلي</span>
                        <span className="text-xs font-black text-emerald-700 font-mono block mt-1">{snap.treasuryBalance.toLocaleString()} {settings.currencySymbol}</span>
                      </div>

                      <div className="bg-slate-50 border border-slate-200/55 p-3 rounded-lg text-center">
                        <span className="text-[9px] font-black text-slate-500 block">رصيد الحساب البنكي المتاح</span>
                        <span className="text-xs font-black text-blue-700 font-mono block mt-1">{snap.bankBalance.toLocaleString()} {settings.currencySymbol}</span>
                      </div>

                    </div>

                    {/* Step of annual closure explanation */}
                    <div className="bg-indigo-50/45 border border-indigo-100 p-4 rounded-xl leading-relaxed text-[11px] text-slate-650 font-medium">
                      <strong className="text-indigo-900 font-black block mb-1">💡 فكرة ختام العام والانتقال السلس:</strong>
                      عند نهاية السنة المحاسبية، يمكنك طباعة كشف الميزانية وجرد العام المتكامل من الزر بالأعلى، والتبديل لقفل العام الحالي بشكل آمن لحماية قيوده المالية من أي تعديل مستقبلي. ولمواصلة العمل في نشاطك التجاري بكل مرونة، ما عليك سوى إنشاء وتفعيل عام مالي جديد وتتوجه القيود والفواتير للعام الجديد تلقائياً مع الحفاظ الصارم على السجلات السابقة دون أي فقدان أو اختلاط بالبيانات السنوية السابقة!
                    </div>

                  </div>
                );
              })()}

            </div>

            {/* CARD 3: AUTOMATED SYSTEM UPDATES FROM GITHUB */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 space-y-6 shadow-xs mt-6">
              <div className="border-b border-slate-100 pb-4 flex justify-between items-center sm:flex-row flex-col gap-2">
                <div>
                  <h2 className="text-sm font-black text-slate-900 flex items-center gap-1.5 text-right">
                    <ArrowLeftRight className="w-5 h-5 text-indigo-500" />
                    <span>تحديث وترقية النظام التلقائي من مستودع Github 🔄</span>
                  </h2>
                  <p className="text-[11px] text-slate-500 mt-1 text-right">
                    جلب كافة التحديثات والملفات الجديدة من المستودع السحابي، تثبيت الحزم التابعة (npm install) وإعادة بناء نسخة التوزيع (build) في لحظة واحدة.
                  </p>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                  <span>متصل بالمستودع السحابي</span>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200/80 p-5 rounded-2xl space-y-4 text-right">
                <div className="text-xs text-slate-700 space-y-1.5 leading-relaxed">
                  <p>عند النقر على الزر بالأسفل، سيقوم النظام بالعمليات التالية للتحديث الفوري:</p>
                  <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-650 mr-2">
                    <li>تنفيذ أمر <code className="bg-slate-200/80 px-1 rounded font-mono text-[10px]">git pull</code> لجلب كافة التعديلات البرمجية الجديدة من المستودع صامتاً.</li>
                    <li>تشغيل ملف التحديث التلقائي المطور <code className="bg-slate-200/80 px-1 rounded font-mono text-[10px]">update_system.bat</code> (أو السكربت المخصص للأجهزة والمخدمات) لترقية وحل التبعيات.</li>
                    <li>تشغيل معالج تثبيت الحزم الجديدة وتنفيذ <code className="bg-slate-250 px-1 rounded font-mono text-[10px]">npm install</code> تلقائياً بدون تدخل يدوي.</li>
                    <li>إعادة بناء ملفات التشغيل والـ Build بالكامل <code className="bg-slate-200/80 px-1 rounded font-mono text-[10px]">npm run build</code> لضمان استقرار التطبيق والسرعة الفائقة للأرصدة والمبيعات.</li>
                  </ul>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    onClick={handleSystemUpdate}
                    disabled={isUpdatingSystem}
                    type="button"
                    className={`flex-1 flex items-center justify-center gap-2 text-xs font-black py-3 rounded-xl cursor-pointer shadow transition-all ${
                      isUpdatingSystem 
                        ? 'bg-slate-400 text-white cursor-not-allowed' 
                        : 'bg-indigo-900 hover:bg-slate-800 text-amber-300'
                    }`}
                  >
                    {isUpdatingSystem ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                        <span>جاري جلب التحديثات وبناء وترقية النظام... (قد يستغرق 30-40 ثانية)</span>
                      </>
                    ) : (
                      <>
                        <span>تحديث وترقية النظام الفورية وتشغيل ملف .bat التلقائي 🚀</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Display Logs */}
                {updateSystemStdout && (
                  <div className="space-y-1 mt-3">
                    <label className="block text-[10px] font-black text-slate-500 mr-1 text-right">سجل الترقية الناجح (Console Logs):</label>
                    <pre dir="ltr" className="bg-slate-900 text-emerald-400 p-4 rounded-xl text-[10px] font-mono leading-relaxed overflow-x-auto max-h-[180px] text-left">
                      {updateSystemStdout}
                    </pre>
                  </div>
                )}

                {updateSystemError && (
                  <div className="space-y-1 mt-3">
                    <label className="block text-[10px] font-black text-rose-500 mr-1 text-right">سجل الأخطاء الفني والبيئي (Error Logs):</label>
                    <pre dir="ltr" className="bg-rose-950 text-rose-250 p-4 rounded-xl text-[10px] font-mono leading-relaxed overflow-x-auto text-rose-200 text-left">
                      {updateSystemError}
                    </pre>
                  </div>
                )}

              </div>
            </div>

          </div>
        )}

        {(activeTab === 'supplier' || activeTab === 'customer' || activeTab === 'worker') && (
          /* SPLIT FINANCIAL ACCOUNTS REGISTER PANEL (SUPPLIER/CUSTOMER/WORKER) */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            
            {/* COLUMN 1: Profiles Index list column */}
            <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden no-print">
              
              <div className="p-3 bg-slate-900 border-b border-slate-800 flex justify-between items-center text-white shrink-0 select-none">
                <span className="font-extrabold text-[11px] tracking-wide text-amber-400">
                  {activeTab === 'supplier' ? "سجل الموردين المعتمدين" : activeTab === 'customer' ? "حسابات عملاء المبيعات" : "عمال الحسابات الميدانية"}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      const originalTitle = document.title;
                      document.title = activeTab === 'customer' ? "قائمة_أرصدة_العملاء" : activeTab === 'supplier' ? "قائمة_أرصدة_الموردين" : "قائمة_أرصدة_العمال";
                      window.print();
                      document.title = originalTitle;
                    }}
                    className="bg-slate-800 hover:bg-slate-700 text-amber-500 hover:text-amber-400 border border-slate-750 px-2 py-1 rounded text-[10px] font-black flex items-center gap-0.5 cursor-pointer shadow-xs transition-colors"
                    title="طباعة تقرير كامل بالأرصدة والمبالغ المدفوعة والمتبقية"
                  >
                    <Printer className="w-3 h-3 text-amber-400" />
                    <span>طباعة الأرصدة 🖨️</span>
                  </button>
                  <button
                    onClick={() => setShowAddContactModal(true)}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded text-[10px] font-black flex items-center gap-0.5 cursor-pointer shadow-xs active:scale-95 shrink-0"
                  >
                    <Plus className="w-3 h-3" />
                    <span>إضافة جديد</span>
                  </button>
                </div>
              </div>

              {/* Profile lookup search bar */}
              <div className="p-2 border-b border-slate-100 relative bg-slate-50/50">
                <span className="absolute inset-y-0 right-3.5 flex items-center text-slate-400">
                  <Search className="w-3.5 h-3.5" />
                </span>
                <input 
                  type="text"
                  value={contactSearchQuery}
                  onChange={(e) => setContactSearchQuery(e.target.value)}
                  placeholder="ابحث بالاسم أو رمز التعريف..."
                  className="w-full bg-white border border-slate-300 rounded-lg pr-8 pl-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-slate-400"
                />
              </div>

              {/* Debt / Balanced status Filter for Customers */}
              {activeTab === 'customer' && (
                <div className="p-2 bg-slate-50/50 border-b border-slate-200 flex gap-1 justify-between text-[10px] font-black select-none">
                  <button
                    onClick={() => setContactDebtFilter('all')}
                    className={`flex-1 py-1 rounded cursor-pointer text-center transition-all ${
                      contactDebtFilter === 'all' 
                        ? 'bg-slate-900 text-white' 
                        : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-250'
                    }`}
                  >
                    الكل
                  </button>
                  <button
                    onClick={() => setContactDebtFilter('has_debt')}
                    className={`flex-1 py-1 rounded cursor-pointer text-center transition-all ${
                      contactDebtFilter === 'has_debt' 
                        ? 'bg-rose-600 text-white' 
                        : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-250'
                    }`}
                  >
                    عليهم متبقي
                  </button>
                  <button
                    onClick={() => setContactDebtFilter('balanced')}
                    className={`flex-1 py-1 rounded cursor-pointer text-center transition-all ${
                      contactDebtFilter === 'balanced' 
                        ? 'bg-emerald-600 text-white' 
                        : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-250'
                    }`}
                  >
                    متوازن (صفر)
                  </button>
                </div>
              )}

              {/* Scrolling List index */}
              <div className="divide-y divide-slate-100 max-h-[460px] overflow-y-auto">
                {activeContactsList.length > 0 ? (
                  activeContactsList.map(c => {
                    const isSelected = c.id === activeContactId;
                    return (
                      <div
                        key={c.id}
                        onClick={() => setActiveContactId(c.id)}
                        className={`p-3.5 flex justify-between items-center transition-colors cursor-pointer select-none border-r-4 ${
                          isSelected 
                            ? 'bg-blue-50/55 border-slate-900 font-extrabold text-[#0f172a]' 
                            : 'border-transparent text-slate-600 hover:bg-slate-50/40'
                        }`}
                      >
                        <div>
                          <div className="font-bold text-xs">{c.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">رمز المحاسبة: {c.code}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          {c.phone && (
                            <span className="text-[10px] bg-slate-100 text-slate-500 font-mono px-1.5 py-0.5 rounded font-bold">{c.phone}</span>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTriggerEditContact(c);
                            }}
                            className="text-slate-400 hover:text-blue-600 p-1"
                            title="تعديل بيانات العضو"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteContact(c.id, c.name);
                            }}
                            className="text-slate-400 hover:text-red-600 p-1"
                            title="حذف هذا الحساب نهائياً"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-8 text-center text-slate-400 text-xs">لا يوجد نتائج تطابق البحث حالياً.</div>
                )}
              </div>

            </div>

            {/* COLUMN 2: Ledger Account Statements Sheets detailing balances */}
            <div className="lg:col-span-8 space-y-4">
              {activeContact ? (
                <>
                  {/* Account detail overview card */}
                  <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-xs p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 text-white no-print select-none">
                    <div>
                      <span className="text-[9px] bg-amber-400 text-[#0f172a] font-black px-2 py-0.5 rounded">كشف الحساب الرسمي</span>
                      <h2 className="text-base font-black mt-1">{activeContact.name}</h2>
                      <p className="text-[10px] text-slate-300 mt-1 font-mono font-bold">معرف الحصيلة: {activeContact.code} | هاتف الشريك المالي: {activeContact.phone || "---"}</p>
                    </div>

                    <div className="flex gap-2 w-full md:w-auto mt-2 md:mt-0 justify-end flex-wrap">
                      <button
                        onClick={handleDownloadLedgerPDF}
                        className="bg-emerald-600 hover:bg-emerald-555 text-white px-3 py-2 rounded-lg font-black text-xs flex items-center gap-1 cursor-pointer shadow-md transition-colors"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>تحميل كشف الحساب PDF</span>
                      </button>

                      <button
                        onClick={() => {
                          const originalTitle = document.title;
                          document.title = `كشف_حساب_${activeContact.name}`;
                          window.print();
                          document.title = originalTitle;
                        }}
                        className="bg-slate-800 hover:bg-slate-755 text-white px-3 py-2 rounded-lg font-black text-xs flex items-center gap-1 cursor-pointer shadow-md border border-slate-700 transition-colors"
                        title="طباعة كشف الحساب الجاري فوراً"
                      >
                        <Printer className="w-3.5 h-3.5 text-blue-400" />
                        <span>طباعة كشف الحساب 🖨️</span>
                      </button>

                      {activeTab !== 'worker' && (
                        <button
                          onClick={() => {
                            setEditingInvoice(null);
                            setEditingInvoiceContactId('');
                            setShowInvoiceModal(true);
                          }}
                          className={`px-3.5 py-2 rounded-lg text-xs font-black flex items-center gap-1 cursor-pointer shadow-md text-white ${
                            activeContact.type === 'supplier' ? 'bg-blue-600 hover:bg-blue-500' : 'bg-emerald-650 hover:bg-emerald-500'
                          }`}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>{activeContact.type === 'supplier' ? "فاتورة شراء جديدة" : "فاتورة مبيعات جديدة"}</span>
                        </button>
                      )}

                      {activeContact.type !== 'worker' && (
                        <button
                          onClick={() => setShowPayoutModal(true)}
                          className="bg-amber-500 hover:bg-amber-400 text-[#0f172a] font-black px-3.5 py-2 rounded-lg text-xs flex items-center gap-1 cursor-pointer shadow-md"
                        >
                          <ArrowLeftRight className="w-3.5 h-3.5" />
                          <span>{activeContact.type === 'customer' ? "تحصيل مبلغ مالى" : "سداد وسند مالي"}</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleZeroOutContact(activeContact.id)}
                        className="bg-rose-600 hover:bg-rose-500 text-white font-black px-3.5 py-2 rounded-lg text-xs flex items-center gap-1 cursor-pointer shadow-md active:scale-95 transition-all"
                        title={
                          activeContact.type === 'supplier' 
                            ? "تصفير حساب المورد بالكامل وتسوية الذمم المعلقة" 
                            : activeContact.type === 'customer' 
                            ? "تصفير حساب العميل بالكامل وتسجيل تسوية الفارق" 
                            : "تصفير حساب العامل بالكامل وتسوية الفوارق والسلف"
                        }
                      >
                        <CheckCircle className="w-3.5 h-3.5 text-white" />
                        <span>
                          {activeContact.type === 'supplier' 
                            ? "تصفير حساب المورد" 
                            : activeContact.type === 'customer' 
                            ? "تصفير حساب العميل" 
                            : "تصفير حساب العامل"}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Profile Balances panel sheet */}
                  {activeContact.type === 'worker' ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 no-print select-none">
                      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4">
                        <div className="text-[10px] text-slate-500 font-extrabold mb-1">الراتب الأساسي الثابت للموظف</div>
                        <div className="font-mono text-base md:text-lg font-black text-emerald-650">
                          {activeContact.salary ? activeContact.salary.toLocaleString('en-US') : "غير محدد"} جنيه / شهرياً
                        </div>
                      </div>

                      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4">
                        <div className="text-[10px] text-slate-500 font-extrabold mb-1">إجمالي المرتبات والمستحقات المثبتة</div>
                        <div className="font-mono text-base md:text-lg font-black text-slate-900">
                          {contactStats.totalInvoices.toLocaleString('en-US', { minimumFractionDigits: 2 })} جنيه
                        </div>
                      </div>

                      <div className={`${
                        contactStats.workerBalanceType === 'we_owe_him' 
                          ? 'border-red-300 bg-red-50/20 text-red-700' 
                          : contactStats.workerBalanceType === 'he_owes_us'
                          ? 'border-emerald-300 bg-emerald-50/20 text-emerald-700'
                          : 'border-slate-200 bg-slate-50/50 text-slate-500'
                      } rounded-xl shadow-xs border p-4`}>
                        <div className="text-[10px] font-extrabold flex items-center gap-1 mb-1">
                          <Scale className="w-3.5 h-3.5" />
                          <span>
                            {contactStats.workerBalanceType === 'we_owe_him' 
                              ? 'حالة المتأخرات: (العامل عايز مننا فلوس)' 
                              : contactStats.workerBalanceType === 'he_owes_us'
                              ? 'حالة الذمة: (نحن عايزين منه فلوس)'
                              : 'الحساب متوازن وصفر'}
                          </span>
                        </div>
                        <div className="font-mono text-base md:text-lg font-black">
                          {contactStats.outstanding.toLocaleString('en-US', { minimumFractionDigits: 2 })} جنيه سوداني
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3.5 no-print select-none">
                      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-3">
                        <div className="text-[10px] text-slate-400 font-bold">إجمالي المطالبات والفواتير</div>
                        <div className="font-mono text-sm md:text-base font-black text-slate-900 mt-1">
                          {contactStats.totalInvoices.toLocaleString('en-US', { minimumFractionDigits: 2 })} جنيه سوداني
                        </div>
                      </div>

                      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-3">
                        <div className="text-[10px] text-slate-400 font-bold">إجمالي المدفوعات والمسوى فعلياً</div>
                        <div className="font-mono text-sm md:text-base font-black text-emerald-650 mt-1">
                          {contactStats.totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })} جنيه سوداني
                        </div>
                      </div>

                      <div className="bg-white rounded-xl shadow-xs border border-rose-200 p-3 col-span-2 md:col-span-1 bg-red-50/10">
                        <div className="text-[10px] text-[#0f172a] font-extrabold flex items-center gap-1">
                          <Scale className="w-3.5 h-3.5 text-rose-600" />
                          <span>حق ذمة الحساب المتبقي المعلق</span>
                        </div>
                        <div className="font-mono text-base md:text-lg font-black text-rose-600 mt-1">
                          {contactStats.outstanding.toLocaleString('en-US', { minimumFractionDigits: 2 })} جنيه سوداني
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ACCOUNT LEDGER TABLE AND PDF GENERATOR PREVIEW */}
                  <div id="ledger-statement-area" className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden p-6 text-slate-800">
                    
                    {/* Embedded Hidden Statement Header for clean PDF Canvas capturing */}
                    <div className="pb-5 border-b border-slate-300 flex justify-between items-center mb-4">
                      <div className="text-right">
                        <h3 className="text-sm font-black text-slate-800">كشف حساب الدفاتر المحاسبية الموحدة - {settings.invoiceHeaderAr || "الفرع المالي الرئيسي"}</h3>
                        <p className="text-[10px] text-slate-400 font-bold mt-0.5">الحساب المالي: <span className="font-bold text-slate-800 underline">{activeContact.name}</span> ({activeContact.code})</p>
                      </div>
                      <div className="text-left flex flex-col items-end shrink-0 select-none">
                        <span className="text-[9px] bg-slate-900 text-amber-400 px-2 py-0.5 rounded font-mono font-bold">AL-YAMAMA ERP</span>
                        <span className="text-[8px] text-slate-400 font-mono mt-1">تاريخ استخراج الكشف: {new Date().toISOString().split('T')[0]}</span>
                      </div>
                    </div>

                    {/* Filter bar of entries */}
                    <div className="flex bg-slate-50 border border-slate-200 p-2 rounded-lg items-center text-xs justify-between gap-2 mb-4 no-print shrink-0 select-none">
                      <div className="flex items-center gap-2 flex-1 max-w-sm relative">
                        <Search className="w-3.5 h-3.5 absolute right-2.5 text-slate-400" />
                        <input 
                          type="text"
                          value={transactionSearchQuery}
                          onChange={(e) => setTransactionSearchQuery(e.target.value)}
                          placeholder="ابحث عن فاتورة أو دفعة محددة بالبيان..."
                          className="w-full bg-white border border-slate-300 rounded pr-7 pl-2.5 py-1 text-xs"
                        />
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 font-mono">العملة الرسمية للكشف: الجنيه السوداني (SDG)</span>
                    </div>

                    {activeContact.type === 'worker' && (
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4 select-none no-print">
                        <h4 className="font-extrabold text-xs text-slate-850 mb-3 flex items-center gap-1.5 border-b border-slate-200 pb-2">
                          <Scale className="w-4 h-4 text-emerald-650" />
                          <span>بوابة العمليات السريعة لرواتب وسلفيات العمال</span>
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                          {/* 1. السلفية */}
                          <form onSubmit={handleAddWorkerAdvance} className="space-y-1.5 bg-white p-3 rounded-lg border border-slate-200">
                            <label className="block text-[10px] font-black text-slate-500">تقديم سلفية جديدة للعامل (خصم)</label>
                            <div className="flex gap-1.5">
                              <input
                                type="number"
                                required
                                min="1"
                                value={workerAdvanceAmount}
                                onChange={(e) => setWorkerAdvanceAmount(e.target.value)}
                                placeholder="المبلغ بالجنيه"
                                className="w-full bg-slate-50 border border-slate-250 rounded px-2.5 py-1 text-xs font-bold"
                              />
                              <button
                                type="submit"
                                className="bg-red-600 hover:bg-red-700 text-white font-black text-[11px] px-3 py-1 rounded shrink-0 cursor-pointer"
                              >
                                صرف سلفية
                              </button>
                            </div>
                          </form>

                          {/* 2. سداد سلفية */}
                          <form onSubmit={handleAddWorkerRepay} className="space-y-2 bg-white p-3 rounded-lg border border-slate-200">
                            <label className="block text-[10px] font-black text-slate-500">سداد سلفية</label>
                            <div className="flex gap-1.5">
                              <input
                                type="number"
                                required
                                min="1"
                                value={workerRepayAmount}
                                onChange={(e) => setWorkerRepayAmount(e.target.value)}
                                placeholder="المبلغ بالجنيه"
                                className="w-full bg-slate-50 border border-slate-250 rounded px-2.5 py-1 text-xs font-bold"
                              />
                              <button
                                type="submit"
                                className="bg-emerald-650 hover:bg-emerald-700 text-white font-black text-[11px] px-3 py-1 rounded shrink-0 cursor-pointer"
                              >
                                سداد سلفية
                              </button>
                            </div>
                            <div>
                              <input
                                type="text"
                                value={workerRepayDescription}
                                onChange={(e) => setWorkerRepayDescription(e.target.value)}
                                placeholder="البيان (مثال: سداد سلفية، إيداع أمانة)"
                                className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-[11px] focus:outline-none focus:border-emerald-650 font-semibold"
                              />
                            </div>
                          </form>

                          {/* 3. صرف مرتب شهر كذا */}
                          <form onSubmit={handleDisburseWorkerSalaryMonth} className="space-y-1.5 bg-white p-3 rounded-lg border border-slate-200 col-span-1">
                            <label className="block text-[10px] font-black text-slate-500">صرف وإعتماد راتب شهر كذا</label>
                            <div className="flex gap-1.5 flex-wrap md:flex-nowrap">
                              <input
                                type="text"
                                required
                                value={workerSalaryMonth}
                                onChange={(e) => setWorkerSalaryMonth(e.target.value)}
                                placeholder="مثال: يناير 2026"
                                className="w-full min-w-[70px] bg-slate-50 border border-slate-250 rounded px-2 py-1 text-xs font-bold"
                              />
                              <input
                                type="number"
                                value={workerSalaryAmount}
                                onChange={(e) => setWorkerSalaryAmount(e.target.value)}
                                placeholder="اختياري (تعديل القيمة)"
                                className="w-full min-w-[70px] bg-slate-50 border border-slate-250 rounded px-2 py-1 text-xs font-bold"
                                title="إذا تركت فارغة سيتم صرف الراتب الثابت الافتراضي للعامل"
                              />
                              <button
                                type="submit"
                                className="bg-blue-600 hover:bg-blue-700 text-white font-black text-[11px] px-3 py-1 rounded shrink-0 cursor-pointer"
                              >
                                صرف مرتب
                              </button>
                            </div>
                          </form>
                        </div>
                      </div>
                    )}

                    {/* Table list of transactions */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs md:text-sm text-right border-collapse">
                        <thead>
                          <tr className="bg-slate-100 text-slate-700 font-extrabold border-b border-slate-350 text-[11px] md:text-xs">
                            <th className="p-2 text-center w-[100px]">تاريخ المرجع</th>
                            <th className="p-2 text-center w-[110px]">رمز مرجعي بالملف</th>
                            <th className="p-2">بيان المعالجة المحاسبية</th>
                            <th className="p-2 text-center w-[110px]">القيمة الكلية</th>
                            <th className="p-2 text-center w-[110px]">المسدد الفعلي</th>
                            <th className="p-2 text-center w-[110px]">متبقي ذمة البند</th>
                            <th className="p-2 text-center w-[90px] no-print">الإجراءات</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-bold">
                          {activeContactLedger.length > 0 ? (
                            activeContactLedger.map(entry => {
                              const remain = entry.total - entry.paid;
                              return (
                                <tr key={entry.id} className="hover:bg-slate-50/50 text-[11px] md:text-xs">
                                  <td className="p-2.5 text-center font-mono text-slate-500">{entry.date}</td>
                                  <td className="p-2.5 text-center font-mono">
                                    <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[10px] font-semibold border border-slate-200">
                                      {entry.number}
                                    </span>
                                  </td>
                                  <td className="p-2.5 text-slate-800 text-[11px] font-bold">
                                    {entry.description}
                                    {entry.paymentMethod && (
                                      <span className="text-[9px] bg-amber-50 text-amber-800 px-1 rounded inline-block mr-1 font-bold">
                                        {entry.paymentMethod === 'cash' ? "نقدي" : "تحويل بَنكك"}
                                      </span>
                                    )}
                                  </td>
                                  <td className="p-2.5 text-center font-mono text-slate-900">
                                    {entry.total.toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.س
                                  </td>
                                  <td className="p-2.5 text-center font-mono text-emerald-650">
                                    {entry.paid.toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.س
                                  </td>
                                  <td className={`p-2.5 text-center font-mono ${remain > 0 ? 'text-red-650' : 'text-slate-400'}`}>
                                    {remain.toLocaleString('en-US', { minimumFractionDigits: 2 })} ج.س
                                  </td>
                                  <td className="p-2.5 text-center no-print">
                                    <div className="flex items-center justify-center gap-1.5">
                                      <button
                                        onClick={() => setSelectedDocument(entry)}
                                        className="text-slate-500 hover:text-slate-900 font-bold p-1 cursor-pointer transition-colors"
                                        title="معاينة وطباعة الفاتورة التفصيلية"
                                      >
                                        <Eye className="w-4 h-4" />
                                      </button>
                                      {entry.type === 'invoice' && (
                                        <button
                                          onClick={() => {
                                            setEditingInvoice(entry);
                                            setEditingInvoiceContactId(activeContact.id);
                                            setShowInvoiceModal(true);
                                          }}
                                          className="text-stone-300 hover:text-amber-600 p-1 cursor-pointer transition-colors"
                                          title="تعديل الفاتورة"
                                        >
                                          <Edit3 className="w-4 h-4 text-stone-400 hover:text-amber-500" />
                                        </button>
                                      )}
                                      <button
                                        onClick={() => {
                                          if (entry.type === 'invoice') {
                                            handleDeleteLedgerInvoice(entry.id, activeContact.id);
                                          } else {
                                            handleDeleteLedgerEntry(entry.id);
                                          }
                                        }}
                                        className="text-stone-300 hover:text-red-600 p-1 cursor-pointer transition-colors"
                                        title={entry.type === 'invoice' ? "حذف الفاتورة نهائياً" : "حذف القيد المالي"}
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td colSpan={7} className="py-12 text-center text-slate-400">
                                لا يوجد قيود مالية تابعة للشريك أو لا تطابق البحث.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Grand totals spelled footer in Sudanese Pounds */}
                    <div className="mt-8 pt-4 border-t border-slate-350 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                      <div>
                        <p className="text-[10px] text-slate-450">مجموع مستحقات ومطالبات الحساب المالي كتابتاً بالحروف السودانية:</p>
                        <p className="text-xs font-black underline text-rose-700 mt-1">كشف ذمم مستوفى بخصوم نهائية لأولاد داؤود لجميع العمليات.</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-slate-400">صافي المديونية المتبقية:</p>
                        <p className="text-base font-black text-rose-650 font-mono mt-0.5">{contactStats.outstanding.toLocaleString('en-US', { minimumFractionDigits: 2 })} جنيه سوداني</p>
                      </div>
                    </div>

                  </div>

                  {/* OFFLINE PORTABILITY GUIDE */}
                  <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4 no-print select-none">
                    <details className="cursor-pointer group">
                      <summary className="font-extrabold text-[#0f172a] text-xs flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-blue-900">
                          <Settings className="w-4 h-4" />
                          <span>دليل التثبيت ونقل الأنظمة لأي لابتوب أو حاسوب آخر (Portability manual)</span>
                        </span>
                        <span className="text-slate-400 font-bold group-open:rotate-180 transition-transform">▼</span>
                      </summary>
                      <div className="mt-3 text-[11px] text-slate-600 leading-relaxed space-y-2 cursor-default border-t border-slate-100 pt-3">
                        <p>هذا البرنامج معد بموجب حزم تشغيل فائقة الخفة وبدون أي متطلبات خوادم معقدة. لنقل البرنامج بالكامل لأي كمبيوتر آخر وتشغيله بدون نت، اتبع أبسط الخطوات التالية:</p>
                        <ol className="list-decimal list-inside space-y-1 pr-1 font-bold text-slate-700">
                          <li>انسخ كامل مجلد هذا المشروع المالي لقرص فلاش ميموري (USB).</li>
                          <li>قم بنسخ وتثبيت برنامج <strong className="text-slate-900 font-black">XAMPP</strong> أو بيئة <strong className="text-slate-900 font-black">Node.js</strong> على اللابتوب المستهدف.</li>
                          <li>قم بإنشاء ملف نصي بسيط باسم <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-xs">start.bat</code> في المجلد الرئيسي واكتب به الكود التالي:</li>
                        </ol>
                        <pre className="bg-slate-950 text-emerald-450 p-2.5 rounded font-mono text-[10px] text-emerald-400 text-left overflow-x-auto select-all">
                          cd /d "%~dp0"{"\n"}
                          npm install && npm run dev
                        </pre>
                        <p>عند النقر المزدوج على ملف <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-xs">start.bat</code> سيقوم النظام بالإقلاع والعمل فوراً عبر المتصفح على العنوان المحلي <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-xs">http://localhost:3000</code> بكل سهولة ودون تدمير أو فقدان لأي ممتلكات وجداول ومبيعات!</p>
                      </div>
                    </details>
                  </div>

                </>
              ) : (
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm no-print">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-105 pb-4 mb-4 select-none">
                    <div>
                      <h3 className="font-extrabold text-[#0f172a] text-sm font-sans">
                        {activeTab === 'customer' 
                          ? 'كشف تلخيص أرصدة ومبيعات كافة العملاء الكلية' 
                          : activeTab === 'worker' 
                          ? 'كشف تلخيص حسابات وعمولات كافة العمال الميدانيين' 
                          : 'كشف تلخيص أرصدة ومشتريات كافة الموردين'}
                      </h3>
                      <p className="text-[10px] text-slate-400 font-semibold mt-1">
                        استعراض تفصيلي لـ جميع الحسابات المسجلة: مبالغ الفواتير الكلية، المسددات الفعلية، والمتبقي للذمة بدون اختيار فردي.
                      </p>
                    </div>
                    <div>
                      <button
                        onClick={() => window.print()}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-[10px] font-black flex items-center gap-1 cursor-pointer transition-all"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>طباعة هذا التقرير التلخيصي</span>
                      </button>
                    </div>
                  </div>

                  {/* Summary Table Grid */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-[#0f172a] font-black select-none">
                          <th className="p-3 text-right">كود الحساب</th>
                          <th className="p-3 text-right">الاسم الكامل للشريك</th>
                          <th className="p-3 text-center">
                            {activeTab === 'customer' 
                              ? 'إجمالي الفواتير (مبيعات)' 
                              : activeTab === 'worker' 
                              ? 'إجمالي مستحقات العمل كمرتبات' 
                              : 'إجمالي الفواتير (مشتريات)'}
                          </th>
                          <th className="p-3 text-center">المبلغ المسدد</th>
                          <th className="p-3 text-center">المبلغ المتبقي</th>
                          <th className="p-3 text-center">عرض كشف حسابي</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-semibold text-slate-600">
                        {contacts
                          .filter(c => c.type === activeTab)
                          .map(c => {
                            // Calculates exact values for this contact
                            const entries = ledgers[c.id] || [];
                            let totalInvoices = 0;
                            let totalPaid = 0;
                            entries.forEach(e => {
                              if (e.type === 'invoice') {
                                totalInvoices += e.total;
                                totalPaid += e.paid;
                              } else if (e.type === 'payment') {
                                if (e.isRepayment) {
                                  totalPaid -= e.total;
                                } else {
                                  totalPaid += e.total;
                                }
                              }
                            });
                            const remaining = totalInvoices - totalPaid;

                            return (
                              <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="p-3 font-mono text-slate-400">{c.code}</td>
                                <td className="p-3 font-black text-slate-950 text-right">{c.name}</td>
                                <td className="p-3 text-center font-mono text-slate-800">
                                  {totalInvoices.toLocaleString()} {settings.currencySymbol || 'ج.س'}
                                </td>
                                <td className="p-3 text-center font-mono text-emerald-600">
                                  {totalPaid.toLocaleString()} {settings.currencySymbol || 'ج.س'}
                                </td>
                                <td className={`p-3 text-center font-mono font-black ${
                                  remaining > 1 
                                    ? 'text-rose-600' 
                                    : remaining < -1 
                                    ? 'text-blue-600' 
                                    : 'text-slate-400'
                                }`}>
                                  {Math.abs(remaining).toLocaleString()} {settings.currencySymbol || 'ج.س'}
                                  {remaining > 1 && (
                                    <span className="text-[9px] text-rose-500 font-bold block">
                                      {activeTab === 'worker' ? 'مستحق له (دائن)' : 'متبقي مطلوب سداده'}
                                    </span>
                                  )}
                                  {remaining < -1 && (
                                    <span className="text-[9px] text-blue-500 font-semibold block">له فائض رصيد</span>
                                  )}
                                  {Math.abs(remaining) <= 1 && (
                                    <span className="text-[8px] text-slate-400 font-bold block">حساب مُصَفّى ✓</span>
                                  )}
                                </td>
                                <td className="p-3 text-center">
                                  <button
                                    onClick={() => setActiveContactId(c.id)}
                                    className="bg-slate-900 hover:bg-[#0f172a]/90 text-white font-black text-[10px] px-2.5 py-1 rounded transition-all shadow-2xs cursor-pointer active:scale-95"
                                  >
                                    معاينة التفاصيل 🔍
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-center gap-2 text-stone-400 text-xs font-bold select-none">
                    <Users className="w-4 h-4 text-stone-300" />
                    <span>إجمالي المسجلين في هذا القطاع: {contacts.filter(c => c.type === activeTab).length} حساب محاسبي معتمد.</span>
                  </div>
                </div>
              )}
            </div>

          </div>
        )}

      </main>

      {/* --- CORE SYSTEM MODAL POPUPS INTEGRATED --- */}
      
      {/* 1. Print Detailed Document / Invoice / Voucher Viewer */}
      {selectedDocument && activeContact && (
        <PrintDocumentModal 
          entry={selectedDocument}
          contact={activeContact}
          products={products}
          settings={settings}
          onClose={() => setSelectedDocument(null)}
          triggerToast={triggerToast}
        />
      )}

      {/* 2. Payout / Collection Register Cash Voucher Form */}
      {showPayoutModal && activeContact && (
        <PayoutModal 
          contact={activeContact}
          outstandingBalance={contactStats.outstanding}
          isRtl={isRtl}
          onClose={() => setShowPayoutModal(false)}
          onSave={handleSavePayout}
        />
      )}

      {/* 3. Multi-Row Inward and Outward Dynamic Invoice Generator */}
      {showInvoiceModal && activeContact && (
        <InvoiceModal 
          activeTab={activeTab === 'all_invoices' || activeTab === 'quick_invoices' ? (activeContact.type) : (activeTab as any)}
          contacts={contacts.filter(c => c.type === (activeTab === 'all_invoices' || activeTab === 'quick_invoices' ? activeContact.type : activeTab))}
          activeContactId={activeContactId}
          products={products}
          regions={regions}
          productTypes={productTypes}
          grades={grades}
          units={units}
          inventory={inventory}
          prices={prices}
          isRtl={isRtl}
          onClose={() => {
            setShowInvoiceModal(false);
            setEditingInvoice(null);
            setEditingInvoiceContactId('');
          }}
          onSave={handleSaveInvoice}
          treasuryBalance={globalDashboardStats.treasuryBalance}
          bankBalance={globalDashboardStats.bankBalance}
          editingInvoice={editingInvoice}
          editingInvoiceContactId={editingInvoiceContactId}
        />
      )}

      {/* 4. Add New Financier Contact Profile Registration Form */}
      {showAddContactModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in no-print">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-md overflow-hidden transform scale-100 transition-transform">
            <div className="bg-slate-900 text-white p-4 flex justify-between items-center select-none border-b border-slate-800">
              <h3 className="font-bold text-sm tracking-tight flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-blue-400" />
                <span>ترحيل وإدراج شريك أعمال جديد</span>
              </h3>
              <button 
                type="button"
                onClick={() => setShowAddContactModal(false)} 
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddContact} className="p-4 space-y-3.5 text-xs md:text-sm" dir="rtl">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">اسم الشريك التجاري الهادف الكامل *</label>
                <input 
                  type="text"
                  required
                  value={newContactName}
                  onChange={(e) => setNewContactName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 font-bold"
                  placeholder="مثال: شركة النيلين لاستيراد المانجو والشحنات..."
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">الهاتف المعتمد أو رقم التواصل (اختياري)</label>
                <input 
                  type="text"
                  value={newContactPhone}
                  onChange={(e) => setNewContactPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 outline-none focus:bg-white font-mono"
                  placeholder="+249 9X XXX XXXX"
                />
              </div>

              <div className="pt-2.5 border-t border-slate-200 flex justify-end gap-2 text-xs">
                <button 
                  type="button" 
                  onClick={() => setShowAddContactModal(false)}
                  className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded font-semibold cursor-pointer"
                >
                  إلغاء تماماً
                </button>
                <button 
                  type="submit" 
                  className="bg-blue-650 bg-blue-600 text-white px-4 py-1.5 rounded font-black shadow-sm cursor-pointer"
                >
                  إبرام الحساب والدفتر
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Edit Existing Financier Contact Profile Registration Form */}
      {showEditContactModal && editingContact && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in no-print">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-md overflow-hidden transform scale-100 transition-transform">
            <div className="bg-slate-900 text-white p-4 flex justify-between items-center select-none border-b border-slate-800">
              <h3 className="font-bold text-sm tracking-tight flex items-center gap-1.5">
                <Edit3 className="w-4 h-4 text-blue-400" />
                <span>تعديل بيانات الحساب المالي</span>
              </h3>
              <button 
                type="button"
                onClick={() => { setShowEditContactModal(false); setEditingContact(null); }} 
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateContact} className="p-4 space-y-3.5 text-xs md:text-sm" dir="rtl">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">اسم الشريك التجاري / العامل الكامل *</label>
                <input 
                  type="text"
                  required
                  value={editContactName}
                  onChange={(e) => setEditContactName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">الهاتف المعتمد أو رقم التواصل (اختياري)</label>
                <input 
                  type="text"
                  value={editContactPhone}
                  onChange={(e) => setEditContactPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 outline-none focus:bg-white font-mono"
                  placeholder="+249 9X XXX XXXX"
                />
              </div>

              {editingContact.type === 'worker' && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">الراتب الأساسي الشهري (جنيه سوداني)</label>
                  <input 
                    type="number"
                    value={editContactSalary}
                    onChange={(e) => setEditContactSalary(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 outline-none focus:bg-white font-mono font-bold text-emerald-700 text-right"
                    placeholder="700,000"
                  />
                </div>
              )}

              <div className="pt-2.5 border-t border-slate-200 flex justify-end gap-2 text-xs">
                <button 
                  type="button" 
                  onClick={() => { setShowEditContactModal(false); setEditingContact(null); }}
                  className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded font-semibold cursor-pointer"
                >
                  إلغاء
                </button>
                <button 
                  type="submit" 
                  className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded font-black shadow-sm cursor-pointer"
                >
                  حفظ التعديلات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. HIDDEN PRINTABLE ALL PARTNERS BALANCES REPORT */}
      <div className="hidden print:block p-8 bg-white text-slate-900 w-full" dir="rtl" id="printable-partners-balances-report">
        <div className="pb-5 border-b-2 border-slate-900 flex justify-between items-center mb-6">
          <div className="text-right">
            <h2 className="text-sm font-black text-slate-950">
              تقرير وتفصيل أرصدة الشركاء الحسابية الإجمالية - {activeTab === 'customer' ? "حسابات عملاء المبيعات" : activeTab === 'supplier' ? "سجل الموردين المعتمدين" : "العمال والموظفين الميدانيين"}
            </h2>
            <p className="text-[10px] text-slate-500 font-bold mt-1">
              شركة أولاد داؤود للفواكه ومخازن للتبريد | أصل إلكتروني معتمد بالدفاتر
            </p>
          </div>
          <div className="text-left font-mono font-bold text-[10px] flex flex-col items-end">
            <div>تاريخ الاستخراج: {new Date().toLocaleDateString('ar-SD')}</div>
            <div className="text-[8px] text-slate-400">نظام اليمامة المحاسبي المتكامل</div>
          </div>
        </div>

        <table className="w-full text-xs text-right border-collapse border border-slate-300">
          <thead>
            <tr className="bg-slate-100 border-b-2 border-slate-300 text-slate-800 font-extrabold text-[10px]">
              <th className="p-2 border-l border-slate-300 text-center w-[40px]">م</th>
              <th className="p-2 border-l border-slate-300">رمز الحساب</th>
              <th className="p-2 border-l border-slate-300">اسم الشريك المالي</th>
              <th className="p-2 border-l border-slate-300">رقم الهاتف</th>
              <th className="p-2 border-l border-slate-300 text-center">إجمالي المعاملات</th>
              <th className="p-2 border-l border-slate-300 text-center">المدفوع الفعلي</th>
              <th className="p-2 text-center">صافي الرصيد المتبقي</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {contacts.filter(c => c.type === activeTab).map((c, index) => {
              // Calculate stats for each contact
              const entries = ledgers[c.id] || [];
              let totalInvoiced = 0;
              let totalPaid = 0;
              
              if (c.type === 'worker') {
                entries.forEach(entry => {
                  if (entry.type === 'salary' || entry.type === 'invoice') {
                    totalInvoiced += entry.total;
                  } else if (entry.type === 'payment' || entry.type === 'payout' || entry.type === 'advance') {
                    totalPaid += entry.total;
                  }
                });
              } else {
                entries.forEach(entry => {
                  if (entry.type === 'invoice') {
                    totalInvoiced += entry.total;
                    totalPaid += entry.paid || 0;
                  } else if (entry.type === 'payment' || entry.type === 'payout') {
                    totalPaid += entry.total;
                  }
                });
              }

              const outstanding = Math.max(0, totalInvoiced - totalPaid);

              return (
                <tr key={c.id} className="hover:bg-slate-50 text-[11px]">
                  <td className="p-2 border-l border-slate-200 text-center font-bold font-mono text-slate-500">{index + 1}</td>
                  <td className="p-2 border-l border-slate-200 font-mono text-slate-600">{c.code}</td>
                  <td className="p-2 border-l border-slate-200 font-extrabold text-slate-900">{c.name}</td>
                  <td className="p-2 border-l border-slate-200 font-mono text-slate-550">{c.phone || "---"}</td>
                  <td className="p-2 border-l border-slate-200 text-center font-mono">{totalInvoiced.toLocaleString()} ج.س</td>
                  <td className="p-2 border-l border-slate-200 text-center font-mono text-emerald-700">{totalPaid.toLocaleString()} ج.س</td>
                  <td className={`p-2 text-center font-mono font-black ${outstanding > 0 ? 'text-rose-650' : 'text-slate-400'}`}>
                    {outstanding > 0 ? `${outstanding.toLocaleString()} ج.س` : 'خالص'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Aggregate summary */}
        <div className="mt-8 border-t-2 border-slate-400 pt-4 flex justify-between items-center text-[10px] font-black">
          <div>
            <span>إجمالي عدد الحسابات المقيدة: </span>
            <span className="font-mono text-xs">{contacts.filter(c => c.type === activeTab).length}</span>
          </div>
          <div className="flex gap-6">
            <div>
              <span>مجموع المطالبات: </span>
              <span className="font-mono text-xs text-slate-950">
                {contacts.filter(c => c.type === activeTab).reduce((sum, c) => {
                  const entries = ledgers[c.id] || [];
                  let total = 0;
                  entries.forEach(e => {
                    if (c.type === 'worker') {
                      if (e.type === 'salary' || e.type === 'invoice') total += e.total;
                    } else {
                      if (e.type === 'invoice') total += e.total;
                    }
                  });
                  return sum + total;
                }, 0).toLocaleString()} ج.س
              </span>
            </div>
            <div>
              <span>مجموع المدفوعات: </span>
              <span className="font-mono text-xs text-emerald-700">
                {contacts.filter(c => c.type === activeTab).reduce((sum, c) => {
                  const entries = ledgers[c.id] || [];
                  let total = 0;
                  entries.forEach(e => {
                    if (c.type === 'worker') {
                      if (e.type === 'payment' || e.type === 'payout' || e.type === 'advance') total += e.total;
                    } else {
                      if (e.type === 'invoice') {
                        total += e.paid || 0;
                      } else if (e.type === 'payment' || e.type === 'payout') {
                        total += e.total;
                      }
                    }
                  });
                  return sum + total;
                }, 0).toLocaleString()} ج.s
              </span>
            </div>
            <div>
              <span>صافي الذمم المعلقة: </span>
              <span className="font-mono text-xs text-rose-600">
                {contacts.filter(c => c.type === activeTab).reduce((sum, c) => {
                  const entries = ledgers[c.id] || [];
                  let totalInvoiced = 0;
                  let totalPaid = 0;
                  entries.forEach(e => {
                    if (c.type === 'worker') {
                      if (e.type === 'salary' || e.type === 'invoice') totalInvoiced += e.total;
                      else if (e.type === 'payment' || e.type === 'payout' || e.type === 'advance') totalPaid += e.total;
                    } else {
                      if (e.type === 'invoice') {
                        totalInvoiced += e.total;
                        totalPaid += e.paid || 0;
                      } else if (e.type === 'payment' || e.type === 'payout') {
                        totalPaid += e.total;
                      }
                    }
                  });
                  return sum + Math.max(0, totalInvoiced - totalPaid);
                }, 0).toLocaleString()} ج.س
              </span>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
