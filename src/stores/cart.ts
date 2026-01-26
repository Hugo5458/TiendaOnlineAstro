// src/stores/cart.ts
import { atom, computed } from 'nanostores';
import type { Product } from '../lib/supabase';

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  maxStock: number;
  size?: string;
  color?: string;
  image?: string;
}

// ============= Core State =============

const initialCart: CartItem[] = (() => {
  try {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem('fashionstore-cart');
    const parsed = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
})();

export const cartItems = atom<CartItem[]>(initialCart);
export const isCartOpen = atom<boolean>(false);

// Computed stores kept for compatibility with React components
export const cartCount = computed(cartItems, (items) => items.reduce((sum, item) => sum + item.quantity, 0));
export const cartSubtotal = computed(cartItems, (items) => items.reduce((sum, item) => sum + item.price * item.quantity, 0));
export const cartTotal = computed(cartSubtotal, (subtotal) => `€${(subtotal / 100).toFixed(2)}`);

// ============= Helper Functions =============

export function getCartCount(): number {
  const items = cartItems.get();
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

export function getCartSubtotal(): number {
  const items = cartItems.get();
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

export function getCartTotal(): string {
  const subtotal = getCartSubtotal();
  return `€${(subtotal / 100).toFixed(2)}`;
}

// ============= Cart Actions =============

/**
 * Add a product to cart or increase its quantity
 */
/**
 * Add a product to cart or increase its quantity
 */
export function addToCart(
  product: Product,
  quantity: number = 1,
  size?: string,
  color?: string
) {
  // Validación
  if (!product || !product.id) {
    return;
  }

  if (quantity < 1) {
    return;
  }

  if (quantity > product.stock) {
    return;
  }

  const current = cartItems.get();

  // Check if item already exists with same variant
  const existingItem = current.find(
    (item) => item.productId === product.id && item.size === size && item.color === color
  );

  let updated: CartItem[];

  if (existingItem) {
    // Increase quantity if item already exists
    updated = current.map((item) =>
      item.id === existingItem.id
        ? { ...item, quantity: Math.min(item.quantity + quantity, product.stock) }
        : item
    );
  } else {
    // Create new cart item
    const newItem: CartItem = {
      id: `${product.id}-${size}-${color}-${Date.now()}`,
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity,
      maxStock: product.stock,
      size,
      color,
      image: product.images?.[0],
    };
    updated = [...current, newItem];
  }

  // Update store
  cartItems.set(updated);

  // Persist to localStorage
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('fashionstore-cart', JSON.stringify(updated));
      isCartOpen.set(true); // Open cart when adding item
    } catch (error) {
      console.error('Error guardando carrito:', error);
    }
  }
}

/**
 * Remove an item from cart by its ID
 */
export function removeFromCart(itemId: string) {
  const current = cartItems.get();
  const updated = current.filter((item) => item.id !== itemId);

  cartItems.set(updated);

  if (typeof window !== 'undefined') {
    localStorage.setItem('fashionstore-cart', JSON.stringify(updated));
  }
}

/**
 * Update quantity of an item
 */
export function updateCartItemQuantity(itemId: string, quantity: number) {
  const current = cartItems.get();
  const updated = current
    .map((item) => (item.id === itemId ? { ...item, quantity: Math.max(quantity, 1) } : item))
    .filter((item) => item.quantity > 0);

  cartItems.set(updated);

  if (typeof window !== 'undefined') {
    localStorage.setItem('fashionstore-cart', JSON.stringify(updated));
  }
}

/**
 * Remove all items from cart
 */
export function clearCart() {
  cartItems.set([]);
  if (typeof window !== 'undefined') {
    localStorage.removeItem('fashionstore-cart');
  }
}

// ============= Cart UI Actions =============

export function openCart() {
  isCartOpen.set(true);
}

export function closeCart() {
  isCartOpen.set(false);
}

export function toggleCart() {
  isCartOpen.set(!isCartOpen.get());
}

/**
 * Get cart data formatted for checkout submission
 */
export function getCartCheckoutPayload() {
  const items = cartItems.get();
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return {
    items,
    subtotal,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    formattedTotal: `€${(subtotal / 100).toFixed(2)}`,
  };
}
