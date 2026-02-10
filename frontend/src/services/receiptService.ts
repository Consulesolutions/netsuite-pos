import type { Transaction, TransactionItem, Payment, Location, Register } from '../types';
import { format } from 'date-fns';

interface ReceiptConfig {
  storeName: string;
  storeAddress: string;
  storePhone: string;
  footerMessage: string;
  showBarcode: boolean;
  paperWidth: 58 | 80;
}

const defaultConfig: ReceiptConfig = {
  storeName: 'NetSuite POS',
  storeAddress: '',
  storePhone: '',
  footerMessage: 'Thank you for your purchase!',
  showBarcode: true,
  paperWidth: 80,
};

export class ReceiptService {
  private config: ReceiptConfig;

  constructor(config?: Partial<ReceiptConfig>) {
    this.config = { ...defaultConfig, ...config };
  }

  generateReceipt(
    transaction: Transaction,
    location: Location,
    register: Register
  ): string {
    const width = this.config.paperWidth === 80 ? 48 : 32;
    const divider = '='.repeat(width);
    const thinDivider = '-'.repeat(width);

    const lines: string[] = [];

    // Header
    lines.push(this.center(this.config.storeName || location.name, width));
    if (this.config.storeAddress) {
      lines.push(this.center(this.config.storeAddress, width));
    }
    if (this.config.storePhone) {
      lines.push(this.center(this.config.storePhone, width));
    }
    lines.push('');
    lines.push(divider);

    // Transaction info
    lines.push(`Receipt: ${transaction.receiptNumber}`);
    lines.push(`Date: ${format(new Date(transaction.createdAt), 'MM/dd/yyyy HH:mm')}`);
    lines.push(`Register: ${register.name}`);
    if (transaction.customer) {
      lines.push(`Customer: ${transaction.customer.firstName} ${transaction.customer.lastName}`);
    }
    lines.push(thinDivider);

    // Items
    transaction.items.forEach((item) => {
      lines.push(this.formatItemLine(item, width));
      if (item.discountAmount > 0) {
        lines.push(this.rightAlign(`  Discount: -$${item.discountAmount.toFixed(2)}`, width));
      }
    });

    lines.push(thinDivider);

    // Totals
    lines.push(this.formatTotalLine('Subtotal:', transaction.subtotal, width));
    if (transaction.discountTotal > 0) {
      lines.push(this.formatTotalLine('Discount:', -transaction.discountTotal, width));
    }
    lines.push(this.formatTotalLine('Tax:', transaction.taxTotal, width));
    lines.push(divider);
    lines.push(this.formatTotalLine('TOTAL:', transaction.total, width, true));
    lines.push(divider);

    // Payments
    lines.push('');
    lines.push('Payment:');
    transaction.payments.forEach((payment) => {
      lines.push(this.formatPaymentLine(payment, width));
    });

    const totalPaid = transaction.payments.reduce((sum, p) => sum + p.amount, 0);
    const change = totalPaid - transaction.total;
    if (change > 0) {
      lines.push(this.formatTotalLine('Change:', change, width));
    }

    lines.push('');
    lines.push(thinDivider);

    // Footer
    lines.push('');
    lines.push(this.center(this.config.footerMessage, width));
    lines.push('');

    // Barcode placeholder (for receipt printers that support it)
    if (this.config.showBarcode) {
      lines.push(this.center(`*${transaction.receiptNumber}*`, width));
    }

    return lines.join('\n');
  }

  generateXReport(
    location: Location,
    register: Register,
    data: {
      openTime: Date;
      currentTime: Date;
      transactionCount: number;
      totalSales: number;
      cashSales: number;
      cardSales: number;
      otherSales: number;
      refundTotal: number;
      voidCount: number;
    }
  ): string {
    const width = this.config.paperWidth === 80 ? 48 : 32;
    const divider = '='.repeat(width);

    const lines: string[] = [];

    lines.push(this.center('X REPORT', width));
    lines.push(this.center('(Not a closing report)', width));
    lines.push('');
    lines.push(divider);
    lines.push(`Location: ${location.name}`);
    lines.push(`Register: ${register.name}`);
    lines.push(`Open: ${format(data.openTime, 'MM/dd/yyyy HH:mm')}`);
    lines.push(`Printed: ${format(data.currentTime, 'MM/dd/yyyy HH:mm')}`);
    lines.push(divider);
    lines.push('');
    lines.push(this.formatTotalLine('Transactions:', data.transactionCount, width));
    lines.push(this.formatTotalLine('Total Sales:', data.totalSales, width));
    lines.push('');
    lines.push('By Payment Type:');
    lines.push(this.formatTotalLine('  Cash:', data.cashSales, width));
    lines.push(this.formatTotalLine('  Card:', data.cardSales, width));
    lines.push(this.formatTotalLine('  Other:', data.otherSales, width));
    lines.push('');
    lines.push(this.formatTotalLine('Refunds:', data.refundTotal, width));
    lines.push(this.formatTotalLine('Voids:', data.voidCount, width));
    lines.push('');
    lines.push(divider);

    return lines.join('\n');
  }

  generateZReport(
    location: Location,
    register: Register,
    data: {
      openTime: Date;
      closeTime: Date;
      openingBalance: number;
      closingBalance: number;
      expectedCash: number;
      variance: number;
      transactionCount: number;
      totalSales: number;
      cashSales: number;
      cardSales: number;
      otherSales: number;
      refundTotal: number;
      voidCount: number;
    }
  ): string {
    const width = this.config.paperWidth === 80 ? 48 : 32;
    const divider = '='.repeat(width);

    const lines: string[] = [];

    lines.push(this.center('Z REPORT', width));
    lines.push(this.center('(End of Day)', width));
    lines.push('');
    lines.push(divider);
    lines.push(`Location: ${location.name}`);
    lines.push(`Register: ${register.name}`);
    lines.push(`Open: ${format(data.openTime, 'MM/dd/yyyy HH:mm')}`);
    lines.push(`Close: ${format(data.closeTime, 'MM/dd/yyyy HH:mm')}`);
    lines.push(divider);
    lines.push('');
    lines.push('CASH DRAWER:');
    lines.push(this.formatTotalLine('Opening:', data.openingBalance, width));
    lines.push(this.formatTotalLine('Cash Sales:', data.cashSales, width));
    lines.push(this.formatTotalLine('Expected:', data.expectedCash, width));
    lines.push(this.formatTotalLine('Counted:', data.closingBalance, width));
    lines.push(this.formatTotalLine('Variance:', data.variance, width));
    lines.push('');
    lines.push(divider);
    lines.push('');
    lines.push('SALES SUMMARY:');
    lines.push(this.formatTotalLine('Transactions:', data.transactionCount, width));
    lines.push(this.formatTotalLine('Total Sales:', data.totalSales, width));
    lines.push('');
    lines.push('By Payment Type:');
    lines.push(this.formatTotalLine('  Cash:', data.cashSales, width));
    lines.push(this.formatTotalLine('  Card:', data.cardSales, width));
    lines.push(this.formatTotalLine('  Other:', data.otherSales, width));
    lines.push('');
    lines.push(this.formatTotalLine('Refunds:', data.refundTotal, width));
    lines.push(this.formatTotalLine('Voids:', data.voidCount, width));
    lines.push('');
    lines.push(divider);
    lines.push('');
    lines.push(this.center('*** END OF REPORT ***', width));

    return lines.join('\n');
  }

  private center(text: string, width: number): string {
    const padding = Math.max(0, Math.floor((width - text.length) / 2));
    return ' '.repeat(padding) + text;
  }

  private rightAlign(text: string, width: number): string {
    const padding = Math.max(0, width - text.length);
    return ' '.repeat(padding) + text;
  }

  private formatItemLine(item: TransactionItem, width: number): string {
    const nameWidth = width - 15;
    const name = item.itemName.length > nameWidth
      ? item.itemName.substring(0, nameWidth - 1) + '.'
      : item.itemName;

    const qty = item.quantity.toString();
    const price = `$${item.lineTotal.toFixed(2)}`;
    const qtyPrice = `${qty} x $${item.unitPrice.toFixed(2)}`;

    // First line: item name
    // Second line: qty x price = total (right aligned)
    return `${name}\n${this.rightAlign(`${qtyPrice}  ${price}`, width)}`;
  }

  private formatTotalLine(
    label: string,
    amount: number,
    width: number,
    bold = false
  ): string {
    const amountStr = typeof amount === 'number'
      ? `$${amount.toFixed(2)}`
      : amount.toString();

    const padding = width - label.length - amountStr.length;
    const line = label + ' '.repeat(Math.max(1, padding)) + amountStr;

    return bold ? line.toUpperCase() : line;
  }

  private formatPaymentLine(payment: Payment, width: number): string {
    const method = payment.method.charAt(0).toUpperCase() + payment.method.slice(1).replace('_', ' ');
    let reference = '';

    if (payment.cardLast4) {
      reference = ` (****${payment.cardLast4})`;
    } else if (payment.giftCardNumber) {
      reference = ` (${payment.giftCardNumber.slice(-4)})`;
    } else if (payment.reference) {
      reference = ` (${payment.reference})`;
    }

    const label = `  ${method}${reference}:`;
    return this.formatTotalLine(label, payment.amount, width);
  }
}

export const receiptService = new ReceiptService();
