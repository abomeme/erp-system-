/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, Printer, Download, Eye, Check } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Contact, LedgerEntry, Product, SystemSettings } from '../types';
import { tafqit, replaceOklchInString, withSafePDFStyles } from '../utils';

interface PrintDocumentModalProps {
  entry: LedgerEntry;
  contact: Contact;
  products: Product[];
  settings: SystemSettings;
  onClose: () => void;
  triggerToast?: (msg: string, typ?: 'success' | 'err') => void;
}

export default function PrintDocumentModal({ entry, contact, products, settings, onClose, triggerToast }: PrintDocumentModalProps) {
  const isInvoice = entry.type === 'invoice';
  
  // Real-time Tafqit calculations
  const totalAmount = entry.total;
  const words = tafqit(totalAmount, settings.currencySymbol || "جنيه");

  const grossItemsTotal = entry.items && entry.items.length > 0
    ? entry.items.reduce((sum, itm) => sum + itm.total, 0)
    : (entry.total + (entry.discount || 0));

  // High-Resolution Client-side Canvas-to-PDF compiler
  const handleDownloadPDF = async () => {
    const element = document.getElementById('printable-accounting-sheet');
    if (!element) return;
    try {
      if (triggerToast) {
        triggerToast("جاري معالجة وتجميع الفاتورة بصيغة PDF...");
      }
      // Temporarily override styles for absolute print rendering
      const scaleVal = 2; // For crisp typography resolution
      const canvas = await withSafePDFStyles(() => html2canvas(element, {
        scale: scaleVal,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
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
      
      pdf.save(`Voucher_${entry.number}_${contact.code}.pdf`);
      
      if (triggerToast) {
        triggerToast("تم تحميل وتنزيل الفاتورة بنجاح كملف PDF مالي معتمد");
      }
    } catch (err) {
      console.error("Failed to compile Arabic PDF flyer: ", err);
      if (triggerToast) {
        triggerToast("حدث خطأ أثناء تصدير PDF، سيتم فتح نافذة الطباعة الافتراضية", "err");
      }
      // Fallback
      window.print();
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div id="print-modal-container" className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto animate-fade-in no-print">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-3xl overflow-hidden my-6">
        
        {/* Modal Action Header */}
        <div className="bg-slate-900 text-white p-3 px-4 flex justify-between items-center border-b border-slate-800 no-print select-none">
          <span className="text-xs font-bold tracking-wide text-amber-400">
            {isInvoice ? "عرض الفاتورة المعتمدة" : "أصل إيصال السند المالي"}
          </span>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleDownloadPDF}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-1.5 rounded font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow active:scale-95 transition-transform"
            >
              <Download className="w-3.5 h-3.5" />
              <span>تحميل كملف PDF</span>
            </button>
            <button 
              onClick={handlePrint}
              className="bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-1.5 rounded font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow active:scale-95 transition-transform"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة مستند</span>
            </button>
            <button 
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors cursor-pointer p-1 rounded-full hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Paper Container rendered as beautiful RTL A4 sheet */}
        <div 
          id="printable-accounting-sheet" 
          className="p-8 md:p-12 print-container text-slate-900 bg-white font-sans text-xs md:text-sm leading-normal flex flex-col w-full"
          dir="rtl"
        >
         {/* Official Header */}
          <div className="pb-6 border-b-2 border-slate-900 flex justify-between items-start">
            <div className="text-right">
              <h1 className="text-xl md:text-2xl font-black text-slate-950">
                {settings.invoiceHeaderAr || "الشركة الوطنية للتوريد"}
              </h1>
              <p className="text-[11px] text-slate-500 font-bold leading-normal mt-1">
                {settings.invoiceDeclarationAr || "سند معالجة حسابات مستقلة معتمد"}
              </p>
            </div>
            <div className="text-left flex flex-col items-end">
              {settings.invoiceHeaderEn ? (
                <div className="text-right flex flex-col items-end">
                  <span className="text-xs font-black text-slate-700 font-mono uppercase tracking-tight block mb-1">
                    {settings.invoiceHeaderEn}
                  </span>
                  <span className="text-[9px] bg-slate-900 text-amber-400 font-extrabold px-3 py-1 rounded font-mono uppercase">
                    معتمد Certified
                  </span>
                </div>
              ) : (
                <span className="text-[9px] bg-slate-900 text-amber-400 font-extrabold px-3 py-1 rounded font-mono uppercase">
                  مستند معتمد CERTIFIED
                </span>
              )}
            </div>
          </div>

          {/* Title Area */}
          <div className="py-6 text-center select-none">
            <span className="text-base md:text-lg font-black border-b-4 border-slate-900 pb-1 px-4 inline-block">
              {isInvoice 
                ? (contact.type === 'supplier' ? "فـاتـورة مـشـتـريـات الـمـخـزن" : "فـاتـورة مـبـيـعـات الـعـمـلاء")
                : (contact.type === 'customer' ? "سـنـد قـبـض مـالـي (Receipt Voucher)" : "سـنـد صـرف مـالـي (Payment Voucher)")
              }
            </span>
            <p className="text-[10px] font-bold text-slate-500 mt-2 font-mono">
              رقم المرجع: {entry.number} | تاريخ التقييد: {entry.date}
            </p>
          </div>

          {/* Client & Vendor metadata */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
            <div>
              <h4 className="font-extrabold text-[#0f172a] text-xs mb-1">بيانات الطرف المالي:</h4>
              <p className="font-bold text-slate-800 text-sm">
                {contact.name}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5 font-mono font-bold">
                كود الحساب: {contact.code} 
                {contact.phone ? ` | الهاتف: ${contact.phone}` : ''}
              </p>
            </div>
            <div className="text-right md:text-left flex flex-col justify-end">
              <p className="text-[10px] text-slate-500">
                منظومة المعالجة المالية: الخزينة العامة المركزية<br />
                حالة القيد الدفتري: <strong className="text-emerald-700 font-bold">{entry.type === 'payment' ? "مستلم ومسوى" : (entry.total === entry.paid ? "مسدد بالكامل" : "متبقي رصيد معلق")}</strong>
              </p>
            </div>
          </div>

          {/* Line items (ONLY for Invoices containing list of items) */}
          {isInvoice ? (
            <div className="space-y-6 flex-1">
              <table className="w-full text-[11px] text-right border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-extrabold border-b-2 border-slate-400">
                    <th className="p-2 text-center w-[40px]">الرقم</th>
                    <th className="p-2">الصنف والمنشأ</th>
                    <th className="p-2 text-center w-[80px]">الدرجة</th>
                    <th className="p-2 text-center w-[80px]">التصنيف</th>
                    <th className="p-2 text-center w-[60px]">الوحدة</th>
                    <th className="p-2 text-center w-[60px]">الكمية</th>
                    <th className="p-2 text-center w-[100px]">سعر الوحدة</th>
                    <th className="p-2 text-center w-[100px]">الإجمالي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {entry.items && entry.items.length > 0 ? (
                    entry.items.map((itm, index) => (
                      <tr key={itm.id} className="hover:bg-slate-50">
                        <td className="p-2 font-bold text-slate-400 text-center font-mono">{index + 1}</td>
                        <td className="p-2 font-bold text-slate-800">
                          {itm.productName} ({itm.regionName})
                        </td>
                        <td className="p-2 text-center font-medium text-slate-600">{itm.gradeName || 'عام'}</td>
                        <td className="p-2 text-center font-medium text-slate-600">{itm.typeName || 'عام'}</td>
                        <td className="p-2 text-center font-bold text-slate-600">{itm.unitName}</td>
                        <td className="p-2 text-center font-mono font-bold">{itm.qty}</td>
                        <td className="p-2 text-center font-mono">{itm.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                        <td className="p-2 text-center font-bold font-mono text-slate-900">{itm.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="p-2 font-bold text-slate-400 text-center font-mono">1</td>
                      <td className="p-2 font-bold text-slate-800">{entry.description}</td>
                      <td className="p-2 text-center font-medium text-slate-600">عام</td>
                      <td className="p-2 text-center font-medium text-slate-600">عام</td>
                      <td className="p-2 text-center font-bold text-slate-600">دفعة</td>
                      <td className="p-2 text-center font-mono font-bold">1</td>
                      <td className="p-2 text-center font-mono">{entry.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                      <td className="p-2 text-center font-bold font-mono text-slate-900">{entry.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Total Calcs */}
              <div className="flex flex-col md:flex-row justify-end items-start gap-4 pt-4 border-t border-slate-200">
                

                <div className="w-full md:w-80 space-y-1 text-[11px] text-slate-700">
                  <div className="flex justify-between items-center pb-1">
                    <span>{entry.discount ? "الإجمالي قبل الخصم:" : "إجمالي بنود السلع:"}</span>
                    <span className="font-mono font-bold text-slate-800">{grossItemsTotal.toLocaleString('en-US', { minimumFractionDigits: 1 })} {settings.currencySymbol || "جنيه"}</span>
                  </div>
                  {entry.discount ? (
                    <div className="flex justify-between items-center pb-1 text-rose-600 font-bold">
                      <span>الخصم الممنوح:</span>
                      <span className="font-mono">-{entry.discount.toLocaleString('en-US', { minimumFractionDigits: 1 })} {settings.currencySymbol || "جنيه"}</span>
                    </div>
                  ) : null}
                  <div className="flex justify-between items-center pb-1">
                    <span>المسدد الفعلي المدفوع:</span>
                    <span className="font-mono font-bold text-emerald-650">-{entry.paid.toLocaleString('en-US', { minimumFractionDigits: 1 })} {settings.currencySymbol || "جنيه"}</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-slate-900 pt-1 text-xs text-[#0f172a] font-bold">
                    <span>المتبقي في رصيد الطرف المالي:</span>
                    <span className="font-mono font-black text-rose-600">{(entry.total - entry.paid).toLocaleString('en-US', { minimumFractionDigits: 1 })} {settings.currencySymbol || "جنيه"}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* SAND / VOUCHER ONLY LAYOUT */
            <div className="space-y-4 flex-1 text-slate-800">
              <div className="space-y-3 pb-4">
                <div className="flex items-center gap-2 border-b border-dashed border-slate-200 pb-2.5">
                  <span className="font-extrabold text-slate-900 min-w-[130px]">استلمنا من / دفعنا لـ:</span>
                  <span className="font-bold text-slate-800 border-b border-slate-400 pb-0.5 flex-1 pr-1 text-sm">
                    {contact.name}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 border-b border-dashed border-slate-200 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-slate-900 min-w-[130px]">المبلغ بالأرقام:</span>
                    <span className="font-mono font-black text-xs bg-slate-100 px-2.5 py-0.5 rounded border border-slate-200 text-slate-900">
                      {entry.total.toLocaleString('en-US', { minimumFractionDigits: 2 })} {settings.currencySymbol || "جنيه"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-slate-900">طريقة السداد:</span>
                    <span className="font-bold text-slate-700 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded text-[10px]">
                      {entry.paymentMethod === 'cash' ? "نقداً مع الصندوق الرئيسي" : "شيك / حوالة بنكية بنكك"}
                      {entry.paymentRef ? ` (رقم المرجع: ${entry.paymentRef})` : ''}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 border-b border-dashed border-slate-200 pb-2.5">
                  <span className="font-extrabold text-slate-900 min-w-[130px]">البيان وتفاصيل الدفعة:</span>
                  <span className="font-medium pr-1 text-slate-700 flex-1">
                    {entry.description}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Spelling Tafqit Box & Accountant */}
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-[11px] text-slate-700 mt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <strong className="text-slate-950">المبلغ كتابة بالحروف: </strong>
              <span className="font-bold underline text-slate-850">{words}</span>
            </div>
            {entry.accountantName && (
              <div className="bg-white px-2.5 py-1 rounded border border-slate-200">
                <span className="text-slate-500 font-bold">المحاسب المفرز: </span>
                <span className="font-black text-slate-950">{entry.accountantName}</span>
              </div>
            )}
          </div>

          {/* Removed signatures and seals as requested */}
          <div className="mt-8"></div>

          {/* Audit note footer - Removed as requested */}
          <div className="mt-8"></div>

        </div>

        {/* Modal Action Footer at bottom of scroll (with explicit exit and download actions) */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 px-6 flex flex-col sm:flex-row items-center justify-between gap-4 no-print select-none">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-black text-slate-850">خيارات المعالجة وطباعة السند الحالية</p>
            <p className="text-[10px] text-slate-500 mt-0.5">يمكنك تنزيل نسخة رقمية معتمدة وممتازة كملف PDF لتثبيتها أو إرسالها للعميل</p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full sm:w-auto">
            <button 
              onClick={handleDownloadPDF}
              className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>تحميل الفاتورة PDF</span>
            </button>
            
            <button 
              onClick={handlePrint}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all active:scale-95 text-nowrap"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة المستند مباشر</span>
            </button>
            
            <button 
              onClick={onClose}
              className="w-full sm:w-auto bg-slate-200 hover:bg-slate-300 text-slate-800 px-5 py-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 text-nowrap border border-slate-300"
            >
              <X className="w-4 h-4 text-rose-600" />
              <span>الخروج من وضع المعاينة</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
