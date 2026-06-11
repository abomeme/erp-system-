/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// @ts-ignore
import ArabReshaper from 'arabic-persian-reshaper';

// Arabic Tafqit (Numbers to Arabic Words) banking utility for Sudanese Pounds (SDG)
export function tafqit(num: number, currencySymbol: string = "جنيه"): string {
  const integerPart = Math.floor(num);
  if (integerPart === 0) return `صفر ${currencySymbol}`;
  
  const units = ["", "واحد", "اثنان", "ثلاثة", "أربعة", "خمسة", "ستة", "سبعة", "ثمانية", "تسعة"];
  const tens = ["", "عشرة", "عشرون", "ثلاثون", "أربعون", "خمسون", "ستون", "سبعون", "ثمانون", "تسعون"];
  const hundreds = ["", "مائة", "مائتان", "ثلاثمائة", "أربعمائة", "خمسمائة", "ستمائة", "سبعمائة", "ثمانمائة", "تسعمائة"];
  
  function processThreeDigits(n: number): string {
    if (n === 0) return "";
    let res = "";
    const h = Math.floor(n / 100);
    const rem = n % 100;
    const t = Math.floor(rem / 10);
    const u = rem % 10;
    
    if (h > 0) {
      res += hundreds[h];
    }
    if (rem > 0) {
      if (h > 0) res += " و ";
      if (rem <= 9) {
        res += units[rem];
      } else if (rem >= 10 && rem <= 19) {
        if (rem === 10) res += "عشرة";
        else if (rem === 11) res += "أحد عشر";
        else if (rem === 12) res += "اثنا عشر";
        else res += units[u] + " عشر";
      } else {
        if (u > 0) {
          res += units[u] + " و " + tens[t];
        } else {
          res += tens[t];
        }
      }
    }
    return res;
  }
  
  const million = Math.floor(integerPart / 1000000) % 1000;
  const thousand = Math.floor(integerPart / 1000) % 1000;
  const underThousand = integerPart % 1000;
  
  const parts: string[] = [];
  
  if (million > 0) {
    if (million === 1) parts.push("مليون");
    else if (million === 2) parts.push("مليونان");
    else if (million >= 3 && million <= 10) parts.push(processThreeDigits(million) + " ملايين");
    else parts.push(processThreeDigits(million) + " مليون");
  }

  if (thousand > 0) {
    if (parts.length > 0) parts.push("و");
    if (thousand === 1) parts.push("ألف");
    else if (thousand === 2) parts.push("ألفان");
    else if (thousand >= 3 && thousand <= 10) parts.push(processThreeDigits(thousand) + " آلاف");
    else parts.push(processThreeDigits(thousand) + " ألف");
  }
  
  if (underThousand > 0) {
    if (parts.length > 0) parts.push("و");
    parts.push(processThreeDigits(underThousand));
  }
  
  const mainStr = parts.join(" ") + " " + currencySymbol;
  return "فقط " + mainStr + " لا غير";
}

// Generate real visual item structures for printing
export function generateMockItems(description: string, total: number) {
  const subtotal = total;
  return {
    subtotal,
    vat: 0,
    total,
    items: [
      {
        id: "itm-1",
        name: description || "توريد فواكه ومستلزمات تشغيل",
        qty: 1,
        unit: "دفعة",
        price: total,
        total: total
      }
    ]
  };
}

// Translations structure
export const TRANSLATIONS = {
  ar: {
    systemTitle: "نظام اليمامة المالي وإدارة المخازن والأسعار",
    vLabel: "لوحة تخطيط موارد المؤسسة الموحدة للفاكهة SDG",
    reportDate: "تاريخ كشف الحساب",
    printBtn: "تحميل كشف الحساب PDF",
    searchLabel: "البحث واختيار حساب مالي",
    vendorCodeLabel: "كود الموضع المرجعي",
    lastTransLabel: "آخر حركة مدونة",
    statsTotalInvoiced: "إجمالي قيمة الديون والمستحقات",
    statsTotalPaid: "إجمالي المبالغ والمسحوبات المسددة",
    statsRemaining: "الرصيد المتبقي المعلق",
    statsCount: "عدد العمليات والحركات",
    statsUnit: "عملية",
    currency: "جنيه سوداني",
    analyticalTitle: "تفاصيل السجل المالي والتحليلي التفصيلي",
    periodLabel: "إصدار 2026",
    thDate: "التاريخ",
    thInvoiceNum: "رقم المرجع",
    thDetails: "البيان / التفاصيل التشغيلية للمستند",
    thTotal: "القيمة الإجمالية",
    thPaid: "المبلغ المدفوع",
    thRemaining: "المتبقي / الحالة",
    userField: "المسؤول المالي: إبراهيم داؤود",
    branchField: "الفرع الرئيسي للمنظومة",
    allSAR: "المبالغ بالجنيه السوداني (SDG)",
    searchPlaceholder: "ابحث بالرقم، التفاصيل، أو المبالغ...",
    filterStatus: "تصفية حسب الحالة",
    filterAll: "كافة المعاملات المالية",
    filterPaid: "المسواة تماماً",
    filterPartial: "متبقي ذو سداد جزئي",
    filterUnpaid: "معلقة وبدون سداد بالكامل",
    addInvoiceBtn: "إدراج مستحق / فاتورة",
    registerVendorBtn: "تسجيل حساب جديد",
    saveVendor: "حفظ وتحديد الحساب",
    saveInvoice: "ترحيل المستحقات للدفاتر",
    cancel: "إلغاء وتراجع",
    editInvoiceTitle: "تحديث مستند الحساب الجاري",
    addInvoiceTitle: "تسجيل مستحق مالي جديد",
    invoiceDate: "التاريخ الفعلي",
    invoiceCode: "رقم المرجع / الفاتورة",
    invoiceDesc: "البيان وتجهيز خدمات البناء والعمل",
    invoiceTotalVal: "القيمة الإجمالية شامل اللوجستيات (جنيه)",
    invoicePaidVal: "المسدد الفعلي المباشر (جنيه)",
    actions: "الإجراءات المتاحة",
    confirmDelete: "هل تريد حذف هذا القيد المالي نهائياً من كشوفات الحساب؟",
    paymentProgress: "التغطية والوفاء المالي للمستند",
    outstandingAmount: "الالتزامات المعلقة",
    vendorNameAr: "الاسم الكامل بالعربية",
    vendorNameEn: "الاسم الكامل بالإنجليزية",
    vendorCodeInput: "رقم التعريف المالي الفريد",
    vendorNotesInput: "ملاحظات الدفع ومكان العمل والعهد والمشاريع",
    noInvoicesFound: "لم يتم العثور على أي قيود تطابق شروط التصفية والبحث الحالية.",
    exportCsv: "تصدير كشف حساب CSV",
    successAlert: "تم تسجيل وتحديث البيانات وحفظ السجل المالي محلياً.",
    errorValidation: "يرجى ملء جميع الحقول بمستندات قيم صحيحة للترحيل.",
    resetDataBtn: "استعادة تهيئة البيانات المصنعية الافتراضية",
    
    // Tab labels
    tabSuppliers: "الموردون وشركات التوريد",
    tabCustomers: "عملاء مستخلصات المبيعات",
    tabWorkers: "العمال وموظفو العهد والتشغيل",
    
    // Payout modules
    payoutTitle: "تسجيل حركة سداد مالي / قبض عاجل",
    payoutAmount: "القيمة المالية للسند (جنيه سوداني)",
    payoutMethod: "طريقة الصرف والموازنة المالية",
    payoutRef: "رقم الشيك أو المرجع البنكي",
    payoutDesc: "بيان وتفاصيل الدفعة المالية الموجهة",
    payoutBtn: "صرف / تحصيل دفعة حساب",
    
    methodCash: "نقداً مع الخزينة العامة",
    methodBank: "حوالة بنكية / شيك مصرفي",
    
    voucherTitle: "مستند سند مالي ضريبي معتمد",
    voucherPayee: "دفعنا لخدمة المكرم / استلمنا من:",
    voucherWordAmount: "المبلغ كتابة وتفقيطاً:",
    voucherFor: "وذلك لقاء المعاملة والوفاء لـ:",
    voucherSignatures: "مسؤولو التوقيعات والاعتمادات الرسمية للخزانة",
    stampText: "الختم المعتمد",
    accountant: "المحاسب المالي",
    manager: "المدير العام",
    receiver: "المستلم المسؤول",
    printVoucherBtn: "طباعة مستند السند",
    printInvoiceBtn: "طباعة الفاتورة الضريبية"
  },
  en: {
    systemTitle: "Alyamama Financial & Inventory System",
    vLabel: "Unified ERP Ledger Panel SDG",
    reportDate: "Statement Date",
    printBtn: "Download PDF Statement",
    searchLabel: "Search or Select Account Registry",
    vendorCodeLabel: "Registry Reference Code",
    lastTransLabel: "Last Movement Logged",
    statsTotalInvoiced: "Total Outstanding Liability / Dues",
    statsTotalPaid: "Total Paid / Settled Amounts",
    statsRemaining: "Completely Outstanding Balance",
    statsCount: "Account Transactions Log",
    statsUnit: "records",
    currency: "SDG",
    analyticalTitle: "Analytical Statement and Detail Ledger",
    periodLabel: "Edition 2026",
    thDate: "Date",
    thInvoiceNum: "Reference ID",
    thDetails: "Payment & Operation Statement / Description",
    thTotal: "Total Amount",
    thPaid: "Paid Volume",
    thRemaining: "Liability / State",
    userField: "Finance Head: Ibrahim Dawood",
    branchField: "Work HQ: Khartoum Main",
    allSAR: "All amounts are presented in Sudanese Pound (SDG)",
    searchPlaceholder: "Search by number, details or prices...",
    filterStatus: "Filter by Settlement Status",
    filterAll: "All Accounts Entries",
    filterPaid: "Fully Settled & Reconciled",
    filterPartial: "Partially Cleared Balances",
    filterUnpaid: "Completely Unsettled & Pending",
    addInvoiceBtn: "Add Due Balance / Invoice",
    registerVendorBtn: "Register New Ledger Account",
    saveVendor: "Register & Select Account",
    saveInvoice: "Post Entry to System Books",
    cancel: "Discard & Dismiss",
    editInvoiceTitle: "Modify Selected Financial Statement",
    addInvoiceTitle: "Record New Account Dues",
    invoiceDate: "Value Date",
    invoiceCode: "Invoice Reference Number",
    invoiceDesc: "Material Details & Work Descriptions",
    invoiceTotalVal: "Gross Value Inclusive (SDG)",
    invoicePaidVal: "Direct Settled Amount (SDG)",
    actions: "Operational Actions",
    confirmDelete: "Are you sure you want to permanently delete this account record?",
    paymentProgress: "Reconciliation Coverage",
    outstandingAmount: "Outstanding Liabilities",
    vendorNameAr: "Arabic Display Name",
    vendorNameEn: "English Display Name",
    vendorCodeInput: "Unique Ledger Account Code ID",
    vendorNotesInput: "Primary projects reference, payout delays or details",
    noInvoicesFound: "No entries match your current search bounds or filter parameters.",
    exportCsv: "Export Ledger Sheet to CSV",
    successAlert: "Accounts registry database has been successfully updated.",
    errorValidation: "Please specify legitimate amounts and description values to post.",
    resetDataBtn: "Restore Factory Reference Seeds",
    
    // Tab labels
    tabSuppliers: "Suppliers & Logistics Vendors",
    tabCustomers: "Sales & Client Reclamations",
    tabWorkers: "Workers Salaries & Advances",
    
    // Payout modules
    payoutTitle: "Record Settlement Payout / Receipt Voucher",
    payoutAmount: "Transaction Payout Amount (SDG)",
    payoutMethod: "Payment Channels & Balance Box",
    payoutRef: "Cheque Ref or External Transfer ID",
    payoutDesc: "Voucher payout allocations description",
    payoutBtn: "Post Payment / Receipt",
    
    methodCash: "Cash Box General Vault",
    methodBank: "Bank Wire / Certified Cheque",
    
    voucherTitle: "Certified Tax Transaction Voucher",
    voucherPayee: "Paid to Supplier / Collected from:",
    voucherWordAmount: "Written spelled sum:",
    voucherFor: "Being settlement payment of:",
    voucherSignatures: "Official Vault Verification & Signatories",
    stampText: "Company Stamp",
    accountant: "Accountant",
    manager: "General Manager",
    receiver: "Payee Receipt Signature",
    printVoucherBtn: "Print Payment Sheet",
    printInvoiceBtn: "Print Electronic Invoice"
  }
} as const;

// Convert OKLCH color space coordinates to sRGB string for html2canvas compatibility
export function oklchToRgb(L: number, C: number, H: number, A: number = 1): string {
  // H is in degrees, convert to radians
  const hRad = (H * Math.PI) / 180;
  const a_coord = C * Math.cos(hRad);
  const b_coord = C * Math.sin(hRad);

  return oklabToRgb(L, a_coord, b_coord, A);
}

// Convert OKLAB color space coordinates to sRGB string
export function oklabToRgb(L: number, a_coord: number, b_coord: number, A: number = 1): string {
  const l_ = L + 0.3963377774 * a_coord + 0.2158037573 * b_coord;
  const m_ = L - 0.1055613458 * a_coord - 0.0638541728 * b_coord;
  const s_ = L - 0.0894841775 * a_coord - 1.2914855414 * b_coord;

  const l = Math.max(0, l_ * l_ * l_);
  const m = Math.max(0, m_ * m_ * m_);
  const s = Math.max(0, s_ * s_ * s_);

  let r = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  let g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  let b = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;

  const gamma = (c: number) => {
    if (c <= 0.0031308) {
      return 12.92 * c;
    } else {
      return 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
    }
  };

  const r255 = Math.min(255, Math.max(0, Math.round(gamma(r) * 255)));
  const g255 = Math.min(255, Math.max(0, Math.round(gamma(g) * 255)));
  const b255 = Math.min(255, Math.max(0, Math.round(gamma(b) * 255)));

  if (A === 1) {
    return `rgb(${r255}, ${g255}, ${b255})`;
  } else {
    return `rgba(${r255}, ${g255}, ${b255}, ${A})`;
  }
}

// Search and replace any "oklch(L C H)" or "oklab(L A B)" expressions with browser-safe rgb/rgba equivalents
export function replaceOklchInString(cssText: string): string {
  if (!cssText) return "";
  
  // 1. Process oklch values
  let processed = cssText.replace(/oklch\(([^)]+)\)/g, (match, p1) => {
    try {
      const parts = p1.trim().split(/[\s,]+/);
      let lStr = parts[0] || '0';
      let cStr = parts[1] || '0';
      let hStr = parts[2] || '0';
      let aStr = '1';

      const slashIndex = parts.indexOf('/');
      if (slashIndex !== -1 && parts[slashIndex + 1]) {
        aStr = parts[slashIndex + 1];
      } else {
        const combinedSlash = p1.indexOf('/');
        if (combinedSlash !== -1) {
          const rightOfSlash = p1.slice(combinedSlash + 1).trim();
          aStr = rightOfSlash.split(/[\s,]+/)[0] || '1';
          const leftOfSlash = p1.slice(0, combinedSlash).trim().split(/[\s,]+/);
          hStr = leftOfSlash[2] || hStr;
        }
      }

      let L = lStr.endsWith('%') ? parseFloat(lStr) / 100 : parseFloat(lStr);
      let C = parseFloat(cStr);
      let H = parseFloat(hStr);
      let A = aStr.endsWith('%') ? parseFloat(aStr) / 100 : parseFloat(aStr);

      if (isNaN(L)) L = 0;
      if (isNaN(C)) C = 0;
      if (isNaN(H)) H = 0;
      if (isNaN(A)) A = 1;

      return oklchToRgb(L, C, H, A);
    } catch (e) {
      return 'rgb(120, 120, 120)';
    }
  });

  // 2. Process oklab values
  processed = processed.replace(/oklab\(([^)]+)\)/g, (match, p1) => {
    try {
      const parts = p1.trim().split(/[\s,]+/);
      let lStr = parts[0] || '0';
      let aCoordStr = parts[1] || '0';
      let bCoordStr = parts[2] || '0';
      let aStr = '1';

      const slashIndex = parts.indexOf('/');
      if (slashIndex !== -1 && parts[slashIndex + 1]) {
        aStr = parts[slashIndex + 1];
      } else {
        const combinedSlash = p1.indexOf('/');
        if (combinedSlash !== -1) {
          const rightOfSlash = p1.slice(combinedSlash + 1).trim();
          aStr = rightOfSlash.split(/[\s,]+/)[0] || '1';
          const leftOfSlash = p1.slice(0, combinedSlash).trim().split(/[\s,]+/);
          bCoordStr = leftOfSlash[2] || bCoordStr;
        }
      }

      let L = lStr.endsWith('%') ? parseFloat(lStr) / 100 : parseFloat(lStr);
      let aCoord = parseFloat(aCoordStr);
      let bCoord = parseFloat(bCoordStr);
      let A = aStr.endsWith('%') ? parseFloat(aStr) / 100 : parseFloat(aStr);

      if (isNaN(L)) L = 0;
      if (isNaN(aCoord)) aCoord = 0;
      if (isNaN(bCoord)) bCoord = 0;
      if (isNaN(A)) A = 1;

      return oklabToRgb(L, aCoord, bCoord, A);
    } catch (e) {
      return 'rgb(120, 120, 120)';
    }
  });

  return processed;
}

/**
 * Run an asynchronous task where all style tags, document styleSheets, and adoptedStyleSheets
 * in the parent document have oklch and oklab colors translated to rgb / rgba temporarily.
 * Optionally shapes Arabic cursive script to prevent fragmented/disconnected rendering of RTL texts in pdf canvases.
 * After the task completes (successfully or with error), the original style and DOM text states are restored.
 */
export async function withSafePDFStyles<T>(task: () => Promise<T>, targetElement?: HTMLElement | null): Promise<T> {
  const stylesBackup = Array.from(document.querySelectorAll('style')).map((styleEl) => {
    return {
      el: styleEl,
      originalText: styleEl.textContent || '',
    };
  });

  // 1. Text-based backup and direct replacement for `<style>` tags
  stylesBackup.forEach((item) => {
    if (item.el.textContent) {
      item.el.textContent = replaceOklchInString(item.el.textContent);
    }
  });

  // Track live CSSOM properties we mutate in-place for fast restoration
  interface CSSOMModification {
    style: CSSStyleDeclaration;
    property: string;
    originalValue: string;
  }
  const cssomModifications: CSSOMModification[] = [];

  function traverseRule(rule: CSSRule) {
    // If the rule has a style declaration (like a CSSStyleRule or CSSKeyframeRule)
    if ('style' in rule) {
      const styleRule = rule as any;
      const styleObj = styleRule.style as CSSStyleDeclaration;
      if (styleObj) {
        // Iterate through properties manually
        for (let i = 0; i < styleObj.length; i++) {
          const prop = styleObj[i];
          const val = styleObj.getPropertyValue(prop);
          if (val && (val.includes('oklch') || val.includes('oklab'))) {
            cssomModifications.push({
              style: styleObj,
              property: prop,
              originalValue: val,
            });
            const newVal = replaceOklchInString(val);
            styleObj.setProperty(prop, newVal, styleObj.getPropertyPriority(prop));
          }
        }
      }
    }

    // Recursively handle rules within media queries, supports, document blocks, keyframes, etc.
    if ('cssRules' in rule) {
      const groupRule = rule as any;
      try {
        const subRules = groupRule.cssRules;
        if (subRules) {
          for (let i = 0; i < subRules.length; i++) {
            traverseRule(subRules[i]);
          }
        }
      } catch (e) {
        // Safe bypass for cross-origin or restricted rule lists
      }
    }
  }

  // 2. Traversal on all accessible document stylesheets (including CSSOM constructed / link stylesheets)
  try {
    const sheets = Array.from(document.styleSheets);
    sheets.forEach((sheet) => {
      try {
        const rules = sheet.cssRules || sheet.rules;
        if (rules) {
          for (let i = 0; i < rules.length; i++) {
            traverseRule(rules[i]);
          }
        }
      } catch (e) {
        // Safe bypass for cross-origin styleSheets that throw on rule access
      }
    });
  } catch (err) {
    console.warn("Could not traverse some document styleSheets: ", err);
  }

  // 3. Traversal on adopted style sheets if supported by browser/framework
  try {
    const doc = document as any;
    if (doc.adoptedStyleSheets && Array.isArray(doc.adoptedStyleSheets)) {
      doc.adoptedStyleSheets.forEach((sheet: any) => {
        try {
          const rules = sheet.cssRules || sheet.rules;
          if (rules) {
            for (let i = 0; i < rules.length; i++) {
              traverseRule(rules[i]);
            }
          }
        } catch (e) {
          // Bypass security boundaries
        }
      });
    }
  } catch (err) {
    // Ignore adoptedStyleSheets support issues
  }

  // 4. Temporary hijack of window.getComputedStyle to translate oklch / oklab on-the-fly when read by html2canvas
  const originalGetComputedStyle = window.getComputedStyle;
  try {
    window.getComputedStyle = function(el: Element, pseudoElt?: string | null): CSSStyleDeclaration {
      const styleObj = originalGetComputedStyle.call(this, el, pseudoElt);
      try {
        return new Proxy(styleObj, {
          get(target, prop, receiver) {
            if (prop === 'getPropertyValue') {
              return function(propertyName: string) {
                const val = target.getPropertyValue(propertyName);
                if (typeof val === 'string' && (val.includes('oklch') || val.includes('oklab'))) {
                  return replaceOklchInString(val);
                }
                return val;
              };
            }
            const value = Reflect.get(target, prop);
            if (typeof value === 'string' && (value.includes('oklch') || value.includes('oklab'))) {
              return replaceOklchInString(value);
            }
            if (typeof value === 'function') {
              return value.bind(target);
            }
            return value;
          }
        });
      } catch (e) {
        return styleObj;
      }
    };
  } catch (err) {
    console.warn("Failed to patch getComputedStyle: ", err);
  }

  // 5. Temporary shaping of Arabic cursive texts on targeted targetElement to prevent html2canvas disconnection bugs
  const elementTextChanges = new Map<Node, string>();
  
  function convertArabicSafe(text: string): string {
    try {
      let reshaper: any = ArabReshaper;
      if (reshaper && reshaper.default) {
        reshaper = reshaper.default;
      }
      if (reshaper && typeof reshaper.convertArabic === 'function') {
        return reshaper.convertArabic(text);
      }
    } catch (e) {
      console.warn("Error inside ArabReshaper context:", e);
    }
    return text;
  }

  function traverseAndShape(node: Node) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const tagName = (node as Element).tagName.toUpperCase();
      if (tagName === 'SCRIPT' || tagName === 'STYLE') {
        return;
      }
    }
    if (node.nodeType === Node.TEXT_NODE) {
      const val = node.nodeValue || '';
      if (/[\u0600-\u06FF]/.test(val)) {
        elementTextChanges.set(node, val);
        node.nodeValue = convertArabicSafe(val);
      }
    } else {
      const childs = Array.from(node.childNodes);
      childs.forEach((child) => traverseAndShape(child));
    }
  }

  const spacingInjections: HTMLElement[] = [];
  if (targetElement) {
    try {
      // Retrieve and zero-out any word/letter-spacing which tears Arabic cursive ligatures apart in canvas engines
      const allSub = Array.from(targetElement.querySelectorAll('*'));
      allSub.push(targetElement);
      allSub.forEach((el) => {
        const hEl = el as HTMLElement;
        if (hEl && hEl.style) {
          const computed = window.getComputedStyle(hEl);
          const ls = computed.letterSpacing;
          if (ls && ls !== 'normal' && ls !== '0px') {
            hEl.setAttribute('data-orig-letter-spacing', hEl.style.letterSpacing || 'normal');
            hEl.style.setProperty('letter-spacing', '0px', 'important');
            spacingInjections.push(hEl);
          }
        }
      });

      traverseAndShape(targetElement);
    } catch (err) {
      console.warn("Failed to temporarily reshape element Arabic nodes or override spacing:", err);
    }
  }

  try {
    return await task();
  } finally {
    // Restore window.getComputedStyle
    window.getComputedStyle = originalGetComputedStyle;

    // A. Restore original `<style>` element text
    stylesBackup.forEach((item) => {
      item.el.textContent = item.originalText;
    });

    // B. Reapply original property values on live CSSOM objects
    cssomModifications.forEach((mod) => {
      try {
        mod.style.setProperty(mod.property, mod.originalValue);
      } catch (err) {
        // Fallback or silent recovery if the rule was disposed or immutable
      }
    });

    // C. Restore original un-shaped Arabic characters
    elementTextChanges.forEach((originalVal, node) => {
      try {
        node.nodeValue = originalVal;
      } catch (err) {
        // Safe silence
      }
    });

    // D. Restore original letter-spacing properties
    spacingInjections.forEach((hEl) => {
      try {
        const orig = hEl.getAttribute('data-orig-letter-spacing');
        if (orig && orig !== 'normal') {
          hEl.style.setProperty('letter-spacing', orig);
        } else {
          hEl.style.removeProperty('letter-spacing');
        }
        hEl.removeAttribute('data-orig-letter-spacing');
      } catch (err) {
        // Safe silence
      }
    });
  }
}


