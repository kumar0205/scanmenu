import { formatCurrency } from './formatters';

export interface OrderMessageInput {
  tableNumber: string;
  customerName: string;
  items: Array<{ name: string; qty: number; price: number; isVeg: boolean }>;
  totalAmount: number;
  note?: string;
  id?: string;
}

export function buildOrderMessage(
  order: OrderMessageInput,
  currency: string = '₹',
  payLink?: string
): string {
  const timeStr = new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const divider = '----------------------------------------';
  
  const itemLines = order.items
    .map(i => {
      const vegIndicator = i.isVeg ? '🟢' : '🔴';
      const formattedPrice = formatCurrency(i.price, currency);
      const formattedSubtotal = formatCurrency(i.price * i.qty, currency);
      return `${vegIndicator} *${i.qty}x ${i.name}*\n   └─ _Price: ${formattedPrice} | Sub: ${formattedSubtotal}_`;
    })
    .join('\n');

  let msg = `*🆕 NEW ORDER CONFIRMED!*\n`;
  msg += `${divider}\n`;
  msg += `📍 *Table:* ${order.tableNumber ? `Table ${order.tableNumber}` : 'Takeaway'}\n`;
  msg += `👤 *Customer:* *${order.customerName}*\n`;
  msg += `⏱️ *Time:* ${timeStr}\n`;
  if (order.id) {
    const displayId = order.id.startsWith('demo-') ? order.id : `#${order.id.substring(0, 8).toUpperCase()}`;
    msg += `🆔 *Order ID:* ${displayId}\n`;
  }
  msg += `${divider}\n\n`;
  msg += `🍽️ *ORDERED ITEMS:*\n${itemLines}\n\n`;
  msg += `${divider}\n`;
  
  const tax = order.totalAmount * 0.05;
  const grandTotal = order.totalAmount * 1.05;
  
  msg += `💵 *BILL DETAILS:*\n`;
  msg += `▫️ Subtotal: ${formatCurrency(order.totalAmount, currency)}\n`;
  msg += `▫️ GST & Charges (5%): ${formatCurrency(tax, currency)}\n`;
  msg += `*Grand Total:* *${formatCurrency(grandTotal, currency)}*\n`;
  msg += `${divider}\n`;

  if (order.note && order.note.trim()) {
    msg += `\n📝 *Customer Note:*\n"${order.note.trim()}"\n\n${divider}\n`;
  }

  if (payLink) {
    msg += `\n🔗 *Pay / View Order Online:*\n${payLink}\n\n${divider}\n`;
  }

  msg += `\nThank you for dining with us! 😊`;
  return msg;
}

export function openWhatsApp(phone: string, message: string): void {
  const encoded = encodeURIComponent(message);
  window.open(`https://wa.me/${phone}?text=${encoded}`, '_blank');
}
