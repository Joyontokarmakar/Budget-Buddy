import React from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '../utils/cn';
import { getSafeItems } from '../utils/items';
import type { ExpenseWithDetails } from '../types';

export interface DigitalReceiptProps {
  expense: ExpenseWithDetails;
  selectedProductName?: string;
  className?: string;
}

export const DigitalReceipt: React.FC<DigitalReceiptProps> = ({
  expense,
  selectedProductName,
  className
}) => {
  const { i18n } = useTranslation();

  const safeItems = getSafeItems(expense.items);
  const storeName = expense.store?.rendering_name || expense.store?.name || 'SUPERMARKT';
  const categoryName = expense.category?.name || 'General';

  // Format date and time
  const rawDate = expense.date ? new Date(expense.date) : new Date();
  const dateFormatted = !isNaN(rawDate.getTime())
    ? rawDate.toLocaleDateString(i18n.language === 'de' ? 'de-DE' : 'de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      })
    : '28.09.2026';

  const timeFormatted = !isNaN(rawDate.getTime()) && expense.date?.includes('T')
    ? rawDate.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
    : '16:08';

  // Deterministic bon number from expense ID
  let hash = 47707;
  if (expense.id) {
    for (let i = 0; i < expense.id.length; i++) {
      hash = ((hash << 5) - hash + expense.id.charCodeAt(i)) | 0;
    }
  }
  const bonNr = (Math.abs(hash) % 8999) + 1000;
  const kasseNr = ((Math.abs(hash) % 4) + 1).toString();
  const uidNr = `DE${(Math.abs(hash * 31) % 899999999 + 100000000)}`;

  // Payment method
  const accountName = expense.account?.name || 'Girocard / VISA';
  const methodUpper = accountName.toUpperCase();
  const paymentMethodDisplay = methodUpper.includes('BAR') || methodUpper.includes('CASH')
    ? 'BAR'
    : methodUpper.includes('VISA')
    ? 'VISA'
    : methodUpper.includes('MASTER')
    ? 'Mastercard'
    : methodUpper.includes('PAYPAL')
    ? 'PayPal'
    : accountName;

  // Determine items and taxes
  // In Germany: food/groceries = 7% (B), general/drinks = 19% (A)
  const isFoodCategory = categoryName.toLowerCase().includes('food') || 
                         categoryName.toLowerCase().includes('groc') ||
                         categoryName.toLowerCase().includes('lebensmittel');

  const processedItems = safeItems.length > 0
    ? safeItems.map(item => {
        const itemName = String(item.name || 'Item').trim();
        const itemAmount = Number(item.amount || 0);
        const itemQty = item.quantity && Number(item.quantity) > 1 ? Number(item.quantity) : 1;
        const unitPrice = itemQty > 1 ? itemAmount / itemQty : itemAmount;
        
        // Check if item is food or drink
        const isDrink = itemName.toLowerCase().includes('cola') || 
                        itemName.toLowerCase().includes('wasser') || 
                        itemName.toLowerCase().includes('beer') || 
                        itemName.toLowerCase().includes('bier') ||
                        itemName.toLowerCase().includes('drink') ||
                        itemName.toLowerCase().includes('pfand');
        
        const isDeposit = itemName.toLowerCase().includes('pfand');
        const taxRateCode = isDrink ? 'A' : (isFoodCategory ? 'B' : 'A');

        return {
          name: itemName,
          amount: itemAmount,
          quantity: itemQty,
          unitPrice,
          taxRateCode,
          isDeposit,
          isTarget: selectedProductName && itemName.toLowerCase() === selectedProductName.toLowerCase().trim()
        };
      })
    : [
        {
          name: expense.notes ? expense.notes.slice(0, 32) : categoryName,
          amount: expense.amount,
          quantity: 1,
          unitPrice: expense.amount,
          taxRateCode: isFoodCategory ? 'B' : 'A',
          isDeposit: false,
          isTarget: false
        }
      ];

  // Calculate tax breakdown
  let bruttoA = 0;
  let bruttoB = 0;

  processedItems.forEach(item => {
    if (item.taxRateCode === 'A') {
      bruttoA += item.amount;
    } else {
      bruttoB += item.amount;
    }
  });

  const nettoA = bruttoA / 1.19;
  const steuerA = bruttoA - nettoA;

  const nettoB = bruttoB / 1.07;
  const steuerB = bruttoB - nettoB;

  const nettoGesamt = nettoA + nettoB;
  const steuerGesamt = steuerA + steuerB;
  const bruttoGesamt = expense.amount;

  return (
    <div
      className={cn(
        "relative w-full max-w-[360px] mx-auto bg-[#fafaf7] dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100",
        "border border-zinc-300 dark:border-zinc-800 shadow-md rounded-sm p-5 sm:p-6",
        "font-mono text-xs leading-relaxed tracking-tight select-text transition-colors",
        className
      )}
    >
      {/* Top jagged tear edge */}
      <div className="flex justify-between items-center text-[7px] text-zinc-400 dark:text-zinc-600 select-none overflow-hidden -mt-3 mb-2 tracking-[0.25em]">
        ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲
      </div>

      {/* Header: Store Name & Details */}
      <div className="text-center space-y-1 mb-4">
        <h3 className="font-extrabold text-sm tracking-wider uppercase text-zinc-950 dark:text-white">
          *** {storeName.toUpperCase()} ***
        </h3>
        <p className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-tight">
          Markt-Filiale · {categoryName}
        </p>
        <p className="text-[9.5px] text-zinc-400 dark:text-zinc-500">
          UID Nr.: {uidNr}
        </p>
      </div>

      {/* EUR Currency Indicator */}
      <div className="text-right text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 mb-1">
        EUR
      </div>

      {/* Itemized Product List */}
      <div className="space-y-1.5 border-t border-dashed border-zinc-300 dark:border-zinc-800 pt-2">
        {processedItems.map((item, idx) => (
          <div key={idx} className={cn("space-y-0.5", item.isTarget ? "bg-amber-100/70 dark:bg-amber-950/40 p-1 rounded font-bold" : "")}>
            <div className="flex justify-between items-baseline gap-2">
              <span className="truncate max-w-[210px] uppercase text-[11px] text-zinc-800 dark:text-zinc-200">
                {item.name}
              </span>
              <span className="shrink-0 font-medium text-[11.5px] text-zinc-900 dark:text-zinc-100">
                {item.amount.toFixed(2).replace('.', ',')} {item.taxRateCode} {item.isDeposit ? '*' : ''}
              </span>
            </div>

            {/* Quantity multiplier line (e.g. 2 Stk x 0,49) */}
            {item.quantity > 1 && (
              <div className="text-[10px] text-zinc-500 dark:text-zinc-400 pl-4">
                {item.quantity} Stk x {item.unitPrice.toFixed(2).replace('.', ',')}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Single dashed divider */}
      <div className="border-b border-dashed border-zinc-400 dark:border-zinc-700 my-3" />

      {/* SUMME (Total) */}
      <div className="flex justify-between items-baseline font-black text-sm tracking-wide text-zinc-950 dark:text-white">
        <span>SUMME</span>
        <div className="flex items-baseline gap-2">
          <span className="text-[11px] font-normal text-zinc-500 dark:text-zinc-400">EUR</span>
          <span className="text-base">{expense.amount.toFixed(2).replace('.', ',')}</span>
        </div>
      </div>

      {/* Double line separator */}
      <div className="border-b-2 border-double border-zinc-800 dark:border-zinc-400 my-2" />

      {/* Geg. Payment Method */}
      <div className="flex justify-between items-baseline font-bold text-xs text-zinc-800 dark:text-zinc-200">
        <span>Geg. {paymentMethodDisplay}</span>
        <div className="flex items-baseline gap-2">
          <span className="text-[10px] font-normal text-zinc-500 dark:text-zinc-400">EUR</span>
          <span>{expense.amount.toFixed(2).replace('.', ',')}</span>
        </div>
      </div>

      {/* Discount line if present */}
      {expense.discount && expense.discount > 0 ? (
        <div className="flex justify-between items-baseline text-[11px] text-emerald-700 dark:text-emerald-400 font-bold mt-1">
          <span>Rabatt / Ersparnis</span>
          <div className="flex items-baseline gap-2">
            <span className="text-[10px] font-normal">EUR</span>
            <span>-{expense.discount.toFixed(2).replace('.', ',')} *</span>
          </div>
        </div>
      ) : null}

      {/* German Tax / MwSt Table */}
      <div className="mt-4 pt-2 border-t border-dashed border-zinc-300 dark:border-zinc-800 text-[9.5px] text-zinc-600 dark:text-zinc-400 space-y-1">
        <div className="grid grid-cols-4 text-zinc-400 dark:text-zinc-500 font-semibold border-b border-zinc-200 dark:border-zinc-800 pb-1">
          <span>Steuer %</span>
          <span className="text-right">Netto</span>
          <span className="text-right">Steuer</span>
          <span className="text-right">Brutto</span>
        </div>
        
        {bruttoA > 0 && (
          <div className="grid grid-cols-4">
            <span>A= 19,0%</span>
            <span className="text-right">{nettoA.toFixed(2).replace('.', ',')}</span>
            <span className="text-right">{steuerA.toFixed(2).replace('.', ',')}</span>
            <span className="text-right">{bruttoA.toFixed(2).replace('.', ',')}</span>
          </div>
        )}

        {bruttoB > 0 && (
          <div className="grid grid-cols-4">
            <span>B=  7,0%</span>
            <span className="text-right">{nettoB.toFixed(2).replace('.', ',')}</span>
            <span className="text-right">{steuerB.toFixed(2).replace('.', ',')}</span>
            <span className="text-right">{bruttoB.toFixed(2).replace('.', ',')}</span>
          </div>
        )}

        <div className="grid grid-cols-4 font-bold text-zinc-800 dark:text-zinc-200 border-t border-zinc-200 dark:border-zinc-800 pt-1">
          <span className="truncate">Gesamt</span>
          <span className="text-right">{nettoGesamt.toFixed(2).replace('.', ',')}</span>
          <span className="text-right">{steuerGesamt.toFixed(2).replace('.', ',')}</span>
          <span className="text-right">{bruttoGesamt.toFixed(2).replace('.', ',')}</span>
        </div>
      </div>

      {/* Date, Time, Bon Number */}
      <div className="mt-4 pt-2 border-t border-dashed border-zinc-300 dark:border-zinc-800 text-[10px] text-zinc-600 dark:text-zinc-400 space-y-1">
        <div className="flex justify-between">
          <span>{dateFormatted}  {timeFormatted}</span>
          <span>Bon-Nr.: {bonNr}</span>
        </div>
        <div className="flex justify-between text-[9px] text-zinc-400 dark:text-zinc-500">
          <span>Markt: 1154</span>
          <span>Kasse: {kasseNr}</span>
          <span>Bed.: 888888</span>
        </div>
      </div>

      {/* Notes if user added any */}
      {expense.notes && (
        <div className="mt-3 p-2 bg-zinc-100 dark:bg-zinc-900 rounded text-[9.5px] text-zinc-600 dark:text-zinc-400 italic break-words border border-zinc-200 dark:border-zinc-800">
          Notiz: {expense.notes}
        </div>
      )}

      {/* Asterisks Divider */}
      <div className="text-center text-[10px] text-zinc-400 dark:text-zinc-600 tracking-widest my-3 select-none">
        ********************************
      </div>

      {/* Receipt Footer Note */}
      <div className="text-center text-[10.5px] text-zinc-700 dark:text-zinc-300 space-y-1">
        <p className="font-bold">Danke für deinen Einkauf</p>
        <p className="text-[9.5px] text-zinc-500 dark:text-zinc-400">
          {storeName.toLowerCase().includes('penny') ? 'Erstmal zu Penny' : storeName}
        </p>
      </div>

      {/* Bottom jagged tear edge */}
      <div className="flex justify-between items-center text-[7px] text-zinc-400 dark:text-zinc-600 select-none overflow-hidden mt-4 -mb-3 tracking-[0.25em]">
        ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼
      </div>
    </div>
  );
};
