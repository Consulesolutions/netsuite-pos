import { useState, useCallback } from 'react';
import {
  ArrowLeftIcon,
  BanknotesIcon,
  CreditCardIcon,
  GiftIcon,
  TicketIcon,
  CheckCircleIcon,
  PrinterIcon,
} from '@heroicons/react/24/outline';
import { useCartStore } from '../../stores/cartStore';
import { useAuthStore } from '../../stores/authStore';
import { useSyncStore } from '../../stores/syncStore';
import { useHardwareStore } from '../../stores/hardwareStore';
import { receiptService } from '../../services/receiptService';
import { api } from '../../services/api';
import { db } from '../../services/offlineDb';
import type { Transaction, PaymentMethod, Payment } from '../../types';
import toast from 'react-hot-toast';
import { v4 as uuid } from 'uuid';

interface CheckoutProps {
  onBack: () => void;
}

type CheckoutStep = 'payment' | 'processing' | 'complete';

export default function Checkout({ onBack }: CheckoutProps) {
  const [step, setStep] = useState<CheckoutStep>('payment');
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [completedTransaction, setCompletedTransaction] = useState<Transaction | null>(null);

  const { cart, payments, addPayment, clearCart, getRemainingBalance, clearPayments } = useCartStore();
  const { user, location, register, shift } = useAuthStore();
  const { addToQueue } = useSyncStore();
  const { status, printReceipt, openCashDrawer } = useHardwareStore();

  const remainingBalance = getRemainingBalance();
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

  const paymentMethods: { method: PaymentMethod; label: string; icon: typeof BanknotesIcon }[] = [
    { method: 'cash', label: 'Cash', icon: BanknotesIcon },
    { method: 'card', label: 'Card', icon: CreditCardIcon },
    { method: 'gift_card', label: 'Gift Card', icon: GiftIcon },
    { method: 'store_credit', label: 'Store Credit', icon: TicketIcon },
  ];

  const quickAmounts = [5, 10, 20, 50, 100];

  const handleAddPayment = useCallback(async () => {
    if (!selectedMethod) return;

    let amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Enter a valid amount');
      return;
    }

    // For non-cash payments, limit to remaining balance
    if (selectedMethod !== 'cash' && amount > remainingBalance) {
      amount = remainingBalance;
    }

    if (selectedMethod === 'card') {
      // Process card payment
      const { processCardPayment } = useHardwareStore.getState();
      const result = await processCardPayment(amount);
      if (!result.success) {
        toast.error(result.error || 'Card payment failed');
        return;
      }
      addPayment('card', amount, result.reference);
    } else {
      addPayment(selectedMethod, amount);
    }

    setPaymentAmount('');
    setSelectedMethod(null);
    toast.success(`${selectedMethod} payment added`);
  }, [selectedMethod, paymentAmount, remainingBalance, addPayment]);

  const handleCompleteTransaction = useCallback(async () => {
    if (remainingBalance > 0.01) {
      toast.error('Payment incomplete');
      return;
    }

    setStep('processing');

    try {
      // Create transaction
      const transaction: Transaction = {
        id: uuid(),
        type: 'sale',
        status: 'completed',
        registerId: register?.id || '',
        locationId: location?.id || '',
        userId: user?.id || '',
        customerId: cart.customer?.id,
        customer: cart.customer,
        items: cart.items.map((item) => ({
          id: uuid(),
          itemId: item.itemId,
          itemName: item.item.name,
          sku: item.item.sku,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountAmount: item.discountAmount,
          taxAmount: item.taxAmount,
          lineTotal: item.lineTotal,
        })),
        payments: payments.map((p) => ({ ...p, transactionId: '' })),
        subtotal: cart.subtotal,
        taxTotal: cart.taxTotal,
        discountTotal: cart.discountTotal,
        total: cart.total,
        receiptNumber: generateReceiptNumber(),
        createdAt: new Date(),
      };

      // Save to local DB
      await db.transactions.add(transaction);

      // Try to sync immediately if online
      try {
        const response = await api.post('/transactions', transaction);
        transaction.netsuiteId = response.data.netsuiteId;
        transaction.status = 'synced';
        transaction.syncedAt = new Date();
        await db.transactions.put(transaction);
      } catch {
        // Add to sync queue if failed
        await addToQueue({
          type: 'transaction',
          action: 'create',
          data: transaction,
        });
      }

      // Open cash drawer for cash payments
      const hasCashPayment = payments.some((p) => p.method === 'cash');
      if (hasCashPayment && status.cashDrawer === 'connected') {
        try {
          await openCashDrawer();
        } catch {
          console.error('Failed to open cash drawer');
        }
      }

      setCompletedTransaction(transaction);
      setStep('complete');

      // Clear cart after short delay
      setTimeout(() => {
        clearCart();
        clearPayments();
      }, 100);

    } catch (error) {
      toast.error('Failed to complete transaction');
      setStep('payment');
    }
  }, [
    remainingBalance,
    register,
    location,
    user,
    cart,
    payments,
    addToQueue,
    status,
    openCashDrawer,
    clearCart,
    clearPayments,
  ]);

  const handlePrintReceipt = useCallback(async () => {
    if (!completedTransaction || !location || !register) return;

    try {
      const receiptContent = receiptService.generateReceipt(
        completedTransaction,
        location,
        register
      );

      if (status.printer === 'connected') {
        await printReceipt(receiptContent);
        toast.success('Receipt printed');
      } else {
        // Open print dialog for browser printing
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(`
            <pre style="font-family: monospace; font-size: 12px;">${receiptContent}</pre>
          `);
          printWindow.document.close();
          printWindow.print();
        }
      }
    } catch (error) {
      toast.error('Failed to print receipt');
    }
  }, [completedTransaction, location, register, status, printReceipt]);

  const handleNumpad = (value: string) => {
    if (value === 'C') {
      setPaymentAmount('');
    } else if (value === '.') {
      if (!paymentAmount.includes('.')) {
        setPaymentAmount(paymentAmount + '.');
      }
    } else if (value === 'DEL') {
      setPaymentAmount(paymentAmount.slice(0, -1));
    } else {
      setPaymentAmount(paymentAmount + value);
    }
  };

  if (step === 'processing') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary-600 border-t-transparent mb-4"></div>
        <p className="text-lg font-medium">Processing transaction...</p>
      </div>
    );
  }

  if (step === 'complete' && completedTransaction) {
    const change = totalPaid - cart.total;

    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <CheckCircleIcon className="w-24 h-24 text-green-500 mb-6" />
        <h2 className="text-2xl font-bold mb-2">Transaction Complete</h2>
        <p className="text-gray-600 mb-6">Receipt #{completedTransaction.receiptNumber}</p>

        {change > 0.01 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 mb-6 text-center">
            <p className="text-yellow-800 text-sm mb-1">Change Due</p>
            <p className="text-4xl font-bold text-yellow-900">${change.toFixed(2)}</p>
          </div>
        )}

        <div className="flex gap-4">
          <button
            onClick={handlePrintReceipt}
            className="btn-secondary flex items-center gap-2"
          >
            <PrinterIcon className="w-5 h-5" />
            Print Receipt
          </button>
          <button onClick={onBack} className="btn-primary">
            New Sale
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="p-4 bg-white border-b border-gray-200 flex items-center gap-4">
        <button onClick={onBack} className="btn-ghost p-2">
          <ArrowLeftIcon className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-semibold">Checkout</h2>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Payment methods */}
        <div className="w-80 p-4 border-r border-gray-200 overflow-auto">
          <h3 className="font-medium mb-4">Payment Method</h3>

          <div className="space-y-2">
            {paymentMethods.map(({ method, label, icon: Icon }) => (
              <button
                key={method}
                onClick={() => {
                  setSelectedMethod(method);
                  setPaymentAmount(remainingBalance.toFixed(2));
                }}
                className={`w-full p-4 rounded-lg border-2 flex items-center gap-3 transition-colors ${
                  selectedMethod === method
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Icon className="w-6 h-6" />
                <span className="font-medium">{label}</span>
              </button>
            ))}
          </div>

          {/* Applied payments */}
          {payments.length > 0 && (
            <div className="mt-6">
              <h3 className="font-medium mb-2">Applied Payments</h3>
              <div className="space-y-2">
                {payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="p-3 bg-gray-50 rounded-lg flex justify-between items-center"
                  >
                    <span className="capitalize">{payment.method.replace('_', ' ')}</span>
                    <span className="font-medium">${payment.amount.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Amount entry */}
        <div className="flex-1 p-6 flex flex-col">
          <div className="flex-1 flex flex-col items-center justify-center">
            {/* Remaining balance */}
            <div className="text-center mb-8">
              <p className="text-sm text-gray-600 mb-1">
                {remainingBalance <= 0 ? 'Total Paid' : 'Remaining Balance'}
              </p>
              <p className={`text-5xl font-bold ${remainingBalance <= 0 ? 'text-green-600' : ''}`}>
                ${Math.abs(remainingBalance).toFixed(2)}
              </p>
            </div>

            {selectedMethod && remainingBalance > 0 && (
              <>
                {/* Amount input */}
                <div className="w-64 mb-6">
                  <input
                    type="text"
                    value={paymentAmount}
                    readOnly
                    className="input text-3xl text-center font-mono"
                    placeholder="0.00"
                  />
                </div>

                {/* Quick amounts (for cash) */}
                {selectedMethod === 'cash' && (
                  <div className="flex gap-2 mb-6">
                    {quickAmounts.map((amount) => (
                      <button
                        key={amount}
                        onClick={() => setPaymentAmount(amount.toString())}
                        className="btn-secondary px-4"
                      >
                        ${amount}
                      </button>
                    ))}
                    <button
                      onClick={() => setPaymentAmount(remainingBalance.toFixed(2))}
                      className="btn-secondary px-4"
                    >
                      Exact
                    </button>
                  </div>
                )}

                {/* Numpad */}
                <div className="grid grid-cols-3 gap-2 w-64 mb-6">
                  {['7', '8', '9', '4', '5', '6', '1', '2', '3', '.', '0', 'DEL'].map(
                    (key) => (
                      <button
                        key={key}
                        onClick={() => handleNumpad(key)}
                        className="pos-numpad-btn"
                      >
                        {key}
                      </button>
                    )
                  )}
                </div>

                <button
                  onClick={handleAddPayment}
                  disabled={!paymentAmount || parseFloat(paymentAmount) <= 0}
                  className="btn-primary w-64 py-3"
                >
                  Add Payment
                </button>
              </>
            )}
          </div>

          {/* Complete button */}
          <button
            onClick={handleCompleteTransaction}
            disabled={remainingBalance > 0.01}
            className="btn-success w-full py-4 text-lg"
          >
            Complete Sale
          </button>
        </div>
      </div>
    </div>
  );
}

function generateReceiptNumber(): string {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${dateStr}-${random}`;
}
