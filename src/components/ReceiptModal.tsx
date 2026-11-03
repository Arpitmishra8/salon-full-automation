import React, { useState, useEffect } from 'react';
import { X, Printer, Sparkles, CheckCircle2 } from 'lucide-react';
import { Receipt, Salon } from '../types/index.ts';
import { fetchReceipt } from '../services/api.ts';

interface ReceiptModalProps {
  receiptIdOrAppointmentId: string | null;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  receiptIdOrAppointmentId,
  onClose
}) => {
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [salon, setSalon] = useState<Salon | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (receiptIdOrAppointmentId) {
      loadReceipt(receiptIdOrAppointmentId);
    }
  }, [receiptIdOrAppointmentId]);

  const loadReceipt = async (id: string) => {
    try {
      setLoading(true);
      const res = await fetchReceipt(id);
      setReceipt(res.receipt);
      setSalon(res.salon);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!receiptIdOrAppointmentId) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-stone-200 overflow-hidden text-stone-900">
        {/* Actions bar (not printed) */}
        <div className="bg-stone-900 text-stone-100 p-4 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-400">
            <Sparkles className="w-4 h-4" />
            Official Salon Tax Receipt
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
            >
              <Printer className="w-3.5 h-3.5" /> Print Receipt
            </button>
            <button
              onClick={onClose}
              className="text-stone-400 hover:text-white p-1.5 rounded-lg hover:bg-stone-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Canvas */}
        <div id="printable-receipt" className="p-8 font-sans space-y-6">
          {loading ? (
            <div className="py-12 text-center text-xs text-stone-400">Loading receipt details...</div>
          ) : receipt && salon ? (
            <>
              {/* Receipt Header */}
              <div className="text-center border-b border-stone-200 pb-5 space-y-1">
                <h2 className="font-editorial text-2xl font-bold tracking-wide text-stone-900">
                  {salon.name}
                </h2>
                <p className="text-[11px] text-stone-500">{salon.tagline}</p>
                <p className="text-[11px] text-stone-600 mt-1">
                  {salon.address}, {salon.city}, {salon.state} - {salon.pincode}
                </p>
                <p className="text-[11px] text-stone-600">
                  Phone: {salon.phone} | Email: {salon.email}
                </p>
              </div>

              {/* Receipt Metadata */}
              <div className="grid grid-cols-2 text-xs gap-3 pb-4 border-b border-stone-100">
                <div>
                  <span className="text-stone-400 text-[10px] uppercase block">Receipt No.</span>
                  <span className="font-mono font-bold text-stone-900">{receipt.receipt_number}</span>
                </div>
                <div className="text-right">
                  <span className="text-stone-400 text-[10px] uppercase block">Date &amp; Time</span>
                  <span className="text-stone-800">{new Date(receipt.created_at).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-stone-400 text-[10px] uppercase block">Billed To (Customer)</span>
                  <span className="font-semibold text-stone-900">{receipt.customer_name}</span>
                  <span className="block text-stone-500 text-[11px]">{receipt.customer_phone}</span>
                </div>
                <div className="text-right">
                  <span className="text-stone-400 text-[10px] uppercase block">Attending Specialist</span>
                  <span className="font-semibold text-stone-900">{receipt.staff_name}</span>
                </div>
              </div>

              {/* Line Items Table */}
              <div className="space-y-3">
                <table className="w-full text-xs text-left">
                  <thead className="border-b border-stone-200 text-stone-500 uppercase text-[10px]">
                    <tr>
                      <th className="py-2">Description</th>
                      <th className="py-2 text-right">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    <tr>
                      <td className="py-3">
                        <div className="font-semibold text-stone-900">{receipt.service_name}</div>
                        <div className="text-[11px] text-stone-400">Appointment on {receipt.appointment_date}</div>
                      </td>
                      <td className="py-3 text-right font-medium text-stone-900">
                        ₹{receipt.subtotal.toLocaleString()}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Calculations Summary */}
              <div className="bg-stone-50 p-4 rounded-xl space-y-2 text-xs border border-stone-200/60">
                <div className="flex justify-between text-stone-600">
                  <span>Subtotal:</span>
                  <span>₹{receipt.subtotal.toLocaleString()}</span>
                </div>
                {receipt.discount > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Direct Discount:</span>
                    <span>-₹{receipt.discount.toLocaleString()}</span>
                  </div>
                )}
                {receipt.points_redeemed > 0 && (
                  <div className="flex justify-between text-amber-800">
                    <span>Loyalty Points Redeemed ({receipt.points_redeemed} pts):</span>
                    <span>-₹{receipt.points_discount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-stone-600">
                  <span>Taxes (GST Inclusive):</span>
                  <span>₹0.00</span>
                </div>
                <div className="flex justify-between border-t border-stone-200 pt-2 text-sm font-bold text-stone-900">
                  <span>Total Amount Paid:</span>
                  <span className="text-base font-extrabold text-stone-900">
                    ₹{receipt.total_paid.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Payment Details */}
              <div className="text-xs text-stone-500 border-t border-stone-100 pt-3 flex justify-between items-center">
                <div>
                  <span>Payment Method: </span>
                  <span className="font-semibold text-stone-900 uppercase">{receipt.payment_method}</span>
                  {receipt.transaction_reference && (
                    <span className="block text-[11px] text-stone-400">Ref: {receipt.transaction_reference}</span>
                  )}
                </div>
                <div className="flex items-center gap-1 text-emerald-700 font-semibold text-xs">
                  <CheckCircle2 className="w-4 h-4" /> Paid in Full
                </div>
              </div>

              {/* Receipt Footer */}
              <div className="text-center pt-4 border-t border-stone-200 text-[11px] text-stone-400 space-y-1">
                <p>Thank you for choosing {salon.name}.</p>
                <p>Loyalty points earned from this visit have been credited to your mobile balance.</p>
              </div>
            </>
          ) : (
            <div className="py-8 text-center text-xs text-red-500">Failed to load receipt.</div>
          )}
        </div>
      </div>
    </div>
  );
};
