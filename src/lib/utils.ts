// Utility functions for FashionStore

/**
 * Format price from cents to display string
 */
export function formatPrice(priceInCents: number, currency: string = 'EUR'): string {
    return new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: currency,
    }).format(priceInCents / 100);
}

/**
 * Calculate discount percentage
 */
export function calculateDiscount(price: number, compareAtPrice: number | null): number {
    if (!compareAtPrice || compareAtPrice <= price) return 0;
    return Math.round(((compareAtPrice - price) / compareAtPrice) * 100);
}

/**
 * Generate a URL-friendly slug from a string
 */
export function slugify(text: string): string {
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove accents
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
}

/**
 * Truncate text to a maximum length
 */
export function truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
}

/**
 * Get stock status label and color
 */
export function getStockStatus(stock: number): { label: string; color: string; available: boolean } {
    if (stock <= 0) {
        return { label: 'Agotado', color: 'text-red-600', available: false };
    }
    if (stock <= 5) {
        return { label: `¡Solo quedan ${stock}!`, color: 'text-amber-600', available: true };
    }
    return { label: 'En stock', color: 'text-green-600', available: true };
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Generate order number
 */
export function generateOrderNumber(): string {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `FS-${dateStr}-${random}`;
}

/**
 * Class name utility (similar to clsx)
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
    return classes.filter(Boolean).join(' ');
}
