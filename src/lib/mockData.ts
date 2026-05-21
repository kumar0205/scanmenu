import { Timestamp } from 'firebase/firestore';
import type { Restaurant, Category, MenuItem, Table, Order, Rating } from '../types';

export const mockRestaurant: Restaurant = {
  id: 'demo-restaurant',
  name: 'Sharma Dhaba',
  slug: 'sharma-dhaba',
  logoUrl: '',
  phone: '919876543210',
  address: '123 Main Market, Delhi',
  currency: '₹',
  googleReviewUrl: 'https://g.page/r/demo/review',
  rewards: {
    active: true,
    discountPercent: 10,
    discountLabel: '10% Off',
    dessertLabel: 'Free Dessert',
    dessertDescription: 'On next order',
  },
  plan: 'pro',
  ownerId: 'demo-user',
  waterBottle: {
    enabled: true,
    price: 20,
  },
  callWaiter: {
    enabled: true,
  },
  createdAt: Timestamp.now(),
};

export const mockCategories: Category[] = [
  { id: 'cat-1', name: 'Starters', order: 0, isActive: true },
  { id: 'cat-2', name: 'Main Course', order: 1, isActive: true },
  { id: 'cat-3', name: 'Breads', order: 2, isActive: true },
  { id: 'cat-4', name: 'Beverages', order: 3, isActive: true },
  { id: 'cat-5', name: 'Desserts', order: 4, isActive: true },
  { id: 'cat-6', name: "Fish Item's", order: 5, isActive: true },
  { id: 'cat-7', name: "Prawns Item's", order: 6, isActive: true },
  { id: 'cat-8', name: "Kamju Item's", order: 7, isActive: true },
  { id: 'cat-9', name: "Indian Bread's", order: 8, isActive: true },
];

export const mockItems: MenuItem[] = [
  { id: 'item-1', name: 'Paneer Tikka', description: 'Marinated cottage cheese grilled in tandoor', price: 220, imageUrl: '', categoryId: 'cat-1', isVeg: true, isAvailable: true, order: 0, createdAt: Timestamp.now() },
  { id: 'item-2', name: 'Chicken Seekh Kebab', description: 'Minced chicken kebabs with aromatic spices', price: 280, imageUrl: '', categoryId: 'cat-1', isVeg: false, isAvailable: true, order: 1, createdAt: Timestamp.now() },
  { id: 'item-3', name: 'Veg Spring Rolls', description: 'Crispy rolls stuffed with mixed vegetables', price: 160, imageUrl: '', categoryId: 'cat-1', isVeg: true, isAvailable: true, order: 2, createdAt: Timestamp.now() },
  { id: 'item-4', name: 'Paneer Butter Masala', description: 'Creamy tomato-based curry with soft paneer', price: 260, imageUrl: '', categoryId: 'cat-2', isVeg: true, isAvailable: true, order: 3, createdAt: Timestamp.now() },
  { id: 'item-5', name: 'Butter Chicken', description: 'Tender chicken in rich buttery tomato gravy', price: 320, imageUrl: '', categoryId: 'cat-2', isVeg: false, isAvailable: true, order: 4, createdAt: Timestamp.now() },
  { id: 'item-6', name: 'Dal Makhani', description: 'Slow-cooked black lentils with cream and butter', price: 220, imageUrl: '', categoryId: 'cat-2', isVeg: true, isAvailable: true, order: 5, createdAt: Timestamp.now() },
  { id: 'item-7', name: 'Chicken Biryani', description: 'Fragrant basmati rice layered with spiced chicken', price: 300, imageUrl: '', categoryId: 'cat-2', isVeg: false, isAvailable: true, order: 6, createdAt: Timestamp.now() },
  { id: 'item-8', name: 'Butter Naan', description: 'Soft leavened bread brushed with butter', price: 50, imageUrl: '', categoryId: 'cat-3', isVeg: true, isAvailable: true, order: 7, createdAt: Timestamp.now() },
  { id: 'item-9', name: 'Garlic Naan', description: 'Naan topped with fresh garlic and coriander', price: 60, imageUrl: '', categoryId: 'cat-3', isVeg: true, isAvailable: true, order: 8, createdAt: Timestamp.now() },
  { id: 'item-10', name: 'Tandoori Roti', description: 'Whole wheat bread baked in clay oven', price: 40, imageUrl: '', categoryId: 'cat-3', isVeg: true, isAvailable: true, order: 9, createdAt: Timestamp.now() },
  { id: 'item-11', name: 'Mango Lassi', description: 'Chilled yogurt drink blended with mango pulp', price: 100, imageUrl: '', categoryId: 'cat-4', isVeg: true, isAvailable: true, order: 10, createdAt: Timestamp.now() },
  { id: 'item-12', name: 'Masala Chai', description: 'Spiced Indian tea with milk', price: 40, imageUrl: '', categoryId: 'cat-4', isVeg: true, isAvailable: true, order: 11, createdAt: Timestamp.now() },
  { id: 'item-13', name: 'Fresh Lime Soda', description: 'Refreshing lime with soda water', price: 60, imageUrl: '', categoryId: 'cat-4', isVeg: true, isAvailable: false, order: 12, createdAt: Timestamp.now() },
  { id: 'item-14', name: 'Gulab Jamun', description: 'Deep-fried milk dumplings in sugar syrup', price: 80, imageUrl: '', categoryId: 'cat-5', isVeg: true, isAvailable: true, order: 13, createdAt: Timestamp.now() },
  { id: 'item-15', name: 'Rasmalai', description: 'Soft paneer discs in saffron-flavored milk', price: 100, imageUrl: '', categoryId: 'cat-5', isVeg: true, isAvailable: true, order: 14, createdAt: Timestamp.now() },
  
  // Fish Item's
  { id: 'item-fish-1', name: 'Pepper Fish', description: 'Spiced fish wok-tossed with freshly crushed pepper', price: 280, imageUrl: '', categoryId: 'cat-6', isVeg: false, isAvailable: true, order: 15, createdAt: Timestamp.now() },
  { id: 'item-fish-2', name: 'Apollo Fish', description: 'Hyderabadi style crispy fried fish fillets tossed in yogurt sauce', price: 280, imageUrl: '', categoryId: 'cat-6', isVeg: false, isAvailable: true, order: 16, createdAt: Timestamp.now() },
  { id: 'item-fish-3', name: 'Fish 65', description: 'Deep-fried spicy fish bites marinated in southern spices', price: 280, imageUrl: '', categoryId: 'cat-6', isVeg: false, isAvailable: true, order: 17, createdAt: Timestamp.now() },
  { id: 'item-fish-4', name: 'Fish Chilli', description: 'Stir-fried fish cubes with bell peppers and green chillies', price: 280, imageUrl: '', categoryId: 'cat-6', isVeg: false, isAvailable: true, order: 18, createdAt: Timestamp.now() },
  { id: 'item-fish-5', name: 'Fish Manchuria', description: 'Fish dumplings tossed in sweet and tangy Manchurian sauce', price: 280, imageUrl: '', categoryId: 'cat-6', isVeg: false, isAvailable: true, order: 19, createdAt: Timestamp.now() },
  { id: 'item-fish-6', name: 'Fish Curry', description: 'Traditional homestyle fish curry in spiced gravy', price: 280, imageUrl: '', categoryId: 'cat-6', isVeg: false, isAvailable: true, order: 20, createdAt: Timestamp.now() },

  // Prawns Item's
  { id: 'item-prawns-1', name: 'Pepper Prawns', description: 'Juicy prawns sautéed with crushed pepper and curry leaves', price: 300, imageUrl: '', categoryId: 'cat-7', isVeg: false, isAvailable: true, order: 21, createdAt: Timestamp.now() },
  { id: 'item-prawns-2', name: 'Loose Prawns', description: 'Crispy fried prawns seasoned with garlic and onions', price: 300, imageUrl: '', categoryId: 'cat-7', isVeg: false, isAvailable: true, order: 22, createdAt: Timestamp.now() },
  { id: 'item-prawns-3', name: 'Prawns Chilli', description: 'Prawns cooked in spicy Indo-Chinese chilli sauce', price: 300, imageUrl: '', categoryId: 'cat-7', isVeg: false, isAvailable: true, order: 23, createdAt: Timestamp.now() },
  { id: 'item-prawns-4', name: 'Prawns 65', description: 'Spicy marinated prawns fried to perfection', price: 300, imageUrl: '', categoryId: 'cat-7', isVeg: false, isAvailable: true, order: 24, createdAt: Timestamp.now() },
  { id: 'item-prawns-5', name: 'Prawns Curry', description: 'Prawns simmered in traditional spiced coconut milk gravy', price: 300, imageUrl: '', categoryId: 'cat-7', isVeg: false, isAvailable: true, order: 25, createdAt: Timestamp.now() },
  { id: 'item-prawns-6', name: 'Kadai Prawns Curry', description: 'Prawns cooked with bell peppers in freshly ground kadai masala', price: 300, imageUrl: '', categoryId: 'cat-7', isVeg: false, isAvailable: true, order: 26, createdAt: Timestamp.now() },
  { id: 'item-prawns-7', name: 'Butter Prawns Curry', description: 'Rich and creamy buttery tomato gravy with tender prawns', price: 300, imageUrl: '', categoryId: 'cat-7', isVeg: false, isAvailable: true, order: 27, createdAt: Timestamp.now() },
  { id: 'item-prawns-8', name: 'Prawns Rayalaseema', description: 'Fiery prawns curry prepared with Guntur chillies in Rayalaseema style', price: 300, imageUrl: '', categoryId: 'cat-7', isVeg: false, isAvailable: true, order: 28, createdAt: Timestamp.now() },

  // Kamju Item's
  { id: 'item-kamju-1', name: 'Kamju Roast', description: 'Marinated quail slow-roasted with herbs and local spices', price: 300, imageUrl: '', categoryId: 'cat-8', isVeg: false, isAvailable: true, order: 29, createdAt: Timestamp.now() },
  { id: 'item-kamju-2', name: 'Kamju Pepper Roast', description: 'Quail roast seasoned with black pepper and roasted garlic', price: 300, imageUrl: '', categoryId: 'cat-8', isVeg: false, isAvailable: true, order: 30, createdAt: Timestamp.now() },
  { id: 'item-kamju-3', name: 'Kamju Ghee Roast', description: 'Rich quail fry cooked in pure cow ghee and signature masala', price: 300, imageUrl: '', categoryId: 'cat-8', isVeg: false, isAvailable: true, order: 31, createdAt: Timestamp.now() },
  { id: 'item-kamju-4', name: 'Kamju Fry', description: 'Crispy deep-fried quail marinated in spicy dry masala', price: 300, imageUrl: '', categoryId: 'cat-8', isVeg: false, isAvailable: true, order: 32, createdAt: Timestamp.now() },
  { id: 'item-kamju-5', name: 'Kamju Curry', description: 'Tender quail slow-cooked in rustic gravy', price: 300, imageUrl: '', categoryId: 'cat-8', isVeg: false, isAvailable: true, order: 33, createdAt: Timestamp.now() },
  { id: 'item-kamju-6', name: 'Kamju Rayalaseema', description: 'Hot and spicy quail curry in authentic Rayalaseema style', price: 300, imageUrl: '', categoryId: 'cat-8', isVeg: false, isAvailable: true, order: 34, createdAt: Timestamp.now() },

  // Indian Bread's
  { id: 'item-bread-1', name: 'Roti', description: 'Plain tandoori whole wheat flatbread', price: 30, imageUrl: '', categoryId: 'cat-9', isVeg: true, isAvailable: true, order: 35, createdAt: Timestamp.now() },
  { id: 'item-bread-2', name: 'Butter Roti', description: 'Whole wheat flatbread brushed with fresh butter', price: 35, imageUrl: '', categoryId: 'cat-9', isVeg: true, isAvailable: true, order: 36, createdAt: Timestamp.now() },
  { id: 'item-bread-3', name: 'Butter Naan', description: 'Tandoor baked refined flour bread with butter', price: 45, imageUrl: '', categoryId: 'cat-9', isVeg: true, isAvailable: true, order: 37, createdAt: Timestamp.now() },
  { id: 'item-bread-4', name: 'Plain Naan', description: 'Classic tandoor baked refined flour bread', price: 40, imageUrl: '', categoryId: 'cat-9', isVeg: true, isAvailable: true, order: 38, createdAt: Timestamp.now() },
  { id: 'item-bread-5', name: 'Garlic Naan', description: 'Naan topped with minced garlic and butter', price: 50, imageUrl: '', categoryId: 'cat-9', isVeg: true, isAvailable: true, order: 39, createdAt: Timestamp.now() },
  { id: 'item-bread-6', name: 'Butter Kulcha', description: 'Soft leavened flatbread stuffed and brushed with butter', price: 45, imageUrl: '', categoryId: 'cat-9', isVeg: true, isAvailable: true, order: 40, createdAt: Timestamp.now() },
];

export const mockTables: Table[] = [
  { id: 't-1', number: '1', status: 'available', currentOrderId: null },
  { id: 't-2', number: '2', status: 'occupied', currentOrderId: 'order-2' },
  { id: 't-3', number: '3', status: 'available', currentOrderId: null },
  { id: 't-4', number: '4', status: 'occupied', currentOrderId: 'order-3' },
  { id: 't-5', number: '5', status: 'inactive', currentOrderId: null },
  { id: 't-6', number: '6', status: 'available', currentOrderId: null },
  { id: 't-7', number: 'VIP', status: 'available', currentOrderId: null },
  { id: 't-8', number: 'Terrace', status: 'available', currentOrderId: null },
];

function minsAgo(m: number) {
  return Timestamp.fromDate(new Date(Date.now() - m * 60000));
}

export const mockOrders: Order[] = [
  {
    id: 'order-1', customerName: 'Rahul', tableId: 't-1', tableNumber: '1',
    items: [
      { itemId: 'item-4', name: 'Paneer Butter Masala', price: 260, qty: 1, isVeg: true },
      { itemId: 'item-8', name: 'Butter Naan', price: 50, qty: 2, isVeg: true },
    ],
    totalAmount: 360, status: 'pending', note: 'Extra spicy please', ratingSubmitted: false,
    createdAt: minsAgo(3), updatedAt: minsAgo(3),
  },
  {
    id: 'order-2', customerName: 'Priya', tableId: 't-2', tableNumber: '2',
    items: [
      { itemId: 'item-5', name: 'Butter Chicken', price: 320, qty: 1, isVeg: false },
      { itemId: 'item-9', name: 'Garlic Naan', price: 60, qty: 2, isVeg: true },
      { itemId: 'item-11', name: 'Mango Lassi', price: 100, qty: 1, isVeg: true },
    ],
    totalAmount: 540, status: 'preparing', note: '', ratingSubmitted: false,
    createdAt: minsAgo(12), updatedAt: minsAgo(8),
  },
  {
    id: 'order-3', customerName: 'Amit', tableId: 't-4', tableNumber: '4',
    items: [
      { itemId: 'item-7', name: 'Chicken Biryani', price: 300, qty: 2, isVeg: false },
      { itemId: 'item-12', name: 'Masala Chai', price: 40, qty: 2, isVeg: true },
    ],
    totalAmount: 680, status: 'ready', note: 'Less oil', ratingSubmitted: false,
    createdAt: minsAgo(25), updatedAt: minsAgo(5),
  },
  {
    id: 'order-4', customerName: 'Sneha', tableId: 't-3', tableNumber: '3',
    items: [
      { itemId: 'item-6', name: 'Dal Makhani', price: 220, qty: 1, isVeg: true },
      { itemId: 'item-10', name: 'Tandoori Roti', price: 40, qty: 3, isVeg: true },
      { itemId: 'item-14', name: 'Gulab Jamun', price: 80, qty: 2, isVeg: true },
    ],
    totalAmount: 420, status: 'completed', note: '', ratingSubmitted: true,
    createdAt: minsAgo(60), updatedAt: minsAgo(30),
  },
  {
    id: 'order-5', customerName: 'Vikram', tableId: 't-1', tableNumber: '1',
    items: [
      { itemId: 'item-1', name: 'Paneer Tikka', price: 220, qty: 1, isVeg: true },
      { itemId: 'item-4', name: 'Paneer Butter Masala', price: 260, qty: 1, isVeg: true },
      { itemId: 'item-8', name: 'Butter Naan', price: 50, qty: 3, isVeg: true },
    ],
    totalAmount: 630, status: 'completed', note: '', ratingSubmitted: true,
    createdAt: minsAgo(120), updatedAt: minsAgo(90),
  },
  {
    id: 'order-6', customerName: 'Neha', tableId: 't-6', tableNumber: '6',
    items: [
      { itemId: 'item-2', name: 'Chicken Seekh Kebab', price: 280, qty: 1, isVeg: false },
    ],
    totalAmount: 280, status: 'cancelled', note: 'Customer left', ratingSubmitted: false,
    createdAt: minsAgo(45), updatedAt: minsAgo(40),
  },
  {
    id: 'order-7', customerName: 'Ravi', tableId: 't-7', tableNumber: 'VIP',
    items: [
      { itemId: 'item-5', name: 'Butter Chicken', price: 320, qty: 1, isVeg: false },
      { itemId: 'item-7', name: 'Chicken Biryani', price: 300, qty: 1, isVeg: false },
      { itemId: 'item-15', name: 'Rasmalai', price: 100, qty: 2, isVeg: true },
    ],
    totalAmount: 820, status: 'completed', note: '', ratingSubmitted: true,
    createdAt: minsAgo(180), updatedAt: minsAgo(150),
  },
  {
    id: 'order-8', customerName: 'Kavita', tableId: 't-3', tableNumber: '3',
    items: [
      { itemId: 'item-3', name: 'Veg Spring Rolls', price: 160, qty: 2, isVeg: true },
      { itemId: 'item-6', name: 'Dal Makhani', price: 220, qty: 1, isVeg: true },
      { itemId: 'item-9', name: 'Garlic Naan', price: 60, qty: 2, isVeg: true },
    ],
    totalAmount: 660, status: 'completed', note: '', ratingSubmitted: false,
    createdAt: minsAgo(300), updatedAt: minsAgo(270),
  },
];

export const mockRatings: Rating[] = [
  {
    id: 'rat-1', orderId: 'order-4', customerName: 'Sneha', tableNumber: '3',
    stars: 5, comment: 'Amazing food and quick service!', rewardClaimed: 'dessert', verified: true,
    createdAt: minsAgo(25),
  },
  {
    id: 'rat-2', orderId: 'order-5', customerName: 'Vikram', tableNumber: '1',
    stars: 4, comment: 'Great paneer, naan was a bit cold.', rewardClaimed: 'discount', verified: true,
    createdAt: minsAgo(85),
  },
  {
    id: 'rat-3', orderId: 'order-7', customerName: 'Ravi', tableNumber: 'VIP',
    stars: 5, comment: 'Best butter chicken in town!', rewardClaimed: 'dessert', verified: false,
    createdAt: minsAgo(145),
  },
  {
    id: 'rat-4', orderId: 'order-8', customerName: 'Kavita', tableNumber: '3',
    stars: 3, comment: 'Food was okay, service was slow.', rewardClaimed: null, verified: false,
    createdAt: minsAgo(265),
  },
];
