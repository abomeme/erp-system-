/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, DollarSign } from 'lucide-react';
import { Contact } from '../types';

interface PayoutModalProps {
  contact: Contact | null;
  outstandingBalance: number;
  isRtl: boolean;
  onClose: () => void;
  onSave: (data: {
    amount: number;
    date: string;
    method: 'cash' | 'bank';
    reference: string;
    description: string;
  }) => void;
}

export default function PayoutModal({ contact, outstandingBalance, isRtl, onClose, onSave }: PayoutModalProps) {
  const [amount, setAmount] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [method, setMethod] = useState<'cash' | 'bank'>('cash');
  const [reference, setReference] = useState<string>(`REF-P${Math.floor(1000 + Math.random() * 8999)}`);
  const [description, setDescription] = useState<string>(
    contact?.type === 'customer' 
      ? 'تحصيل دفعة مالية نقدية من رصيد مبيعات العميل' 
      : 'سداد دفعة مالية نقدية لحساب المشتريات المعلق للمورد'
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0 || !date || !description.trim()) {
      alert(isRtl ? "يرجى ملء جميع الحقول بقيم صحيحة" : "Please fill in all details correctly");
      return;
    }
    onSave({
      amount: parsedAmount,
      date,
      method,
      reference: method === 'bank' ? reference : '',
      description
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in no-print">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-md overflow-hidden transform scale-100 transition-transform">
        
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-4 flex justify-between items-center select-none border-b border-slate-800">
          <h3 className="font-bold text-sm tracking-tight flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-amber-500" />
            <span>
              {contact?.type === 'customer' 
                ? (isRtl ? "تسجيل المبالغ المحصلة (سند قبض)" : "Collect Amount (Receipt)") 
                : (isRtl ? "تسجيل المبالغ المسددة (سند صرف)" : "Disburse Amount (Payment)")
              }
            </span>
          </h3>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3.5 text-xs md:text-sm" dir={isRtl ? 'rtl' : 'ltr'}>
          {contact && (
            <div className={`p-3 bg-slate-50 border border-slate-200 rounded-lg select-none leading-relaxed text-slate-600`}>
              <p className="flex justify-between">
                <span>{isRtl ? "المستفيد / العميل الحالي:" : "Payee Account:"}</span>
                <strong className="text-slate-800">{contact.name}</strong>
              </p>
              <p className="flex justify-between mt-1">
                <span>{isRtl ? "الرصيد المعلق الجاري:" : "Outstanding Balance:"}</span>
                <strong className="text-rose-600 font-mono">
                  {outstandingBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })} جنيه سوداني
                </strong>
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1">{isRtl ? "القيمة المالية *" : "Payment Amount *"}</label>
              <input 
                type="number"
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs font-black font-mono text-slate-800 outline-none focus:bg-white focus:ring-1 focus:ring-amber-500"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1">{isRtl ? "التاريخ الفعلي *" : "Voucher Date *"}</label>
              <input 
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs font-bold font-mono text-slate-800 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">{isRtl ? "طريقة الصرف والتحصيل *" : "Payment Channel *"}</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMethod('cash')}
                className={`p-2 rounded text-xs font-bold transition-all border cursor-pointer text-center ${
                  method === 'cash' 
                    ? 'bg-amber-500 text-white border-amber-600 shadow-xs' 
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {isRtl ? "نقداً مع الخزينة العامة" : "In Hand (Cash)"}
              </button>
              <button
                type="button"
                onClick={() => setMethod('bank')}
                className={`p-2 rounded text-xs font-bold transition-all border cursor-pointer text-center ${
                  method === 'bank' 
                    ? 'bg-amber-500 text-white border-amber-600 shadow-xs' 
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {isRtl ? "بنكك الكتروني / شيك" : "Bank Wire (BKK)"}
              </button>
            </div>
          </div>

          {method === 'bank' && (
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1">{isRtl ? "رقم المرجع البنكي / رقم العملية *" : "Bank Transfer Ref *"}</label>
              <input 
                type="text"
                required
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs font-semibold font-mono text-slate-800 outline-none focus:bg-white"
                placeholder={isRtl ? "رقم مرجعي للحوالة..." : "Cheque reference number..."}
              />
            </div>
          )}

          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">{isRtl ? "بيان الدقة والخدمة المنهجية *" : "Voucher Explanation *"}</label>
            <textarea 
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1.5 text-xs outline-none focus:bg-white font-semibold text-slate-800 resize-none"
            ></textarea>
          </div>

          <div className="pt-2.5 border-t border-slate-200 flex justify-end gap-2">
            <button 
              type="button" 
              onClick={onClose}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded font-semibold text-xs transition-colors cursor-pointer"
            >
              {isRtl ? "إلغاء التعديل" : "Cancel"}
            </button>
            <button 
              type="submit" 
              className="bg-slate-900 text-amber-400 border border-slate-800 hover:bg-slate-800 px-4 py-1.5 rounded font-black text-xs transition-colors shadow-sm cursor-pointer"
            >
              {isRtl ? "ترحيل السند والحفظ" : "Post Payment Ledger"}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
