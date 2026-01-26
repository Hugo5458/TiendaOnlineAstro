// src/components/islands/AddToCartButton.tsx
// Interactive React component for adding products to cart - P&B Style
// This is an Astro "Island" - hydrated only where used

import { useState, useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { addToCart, openCart } from '../../stores/cart';
import type { Product } from '../../lib/supabase';

interface AddToCartButtonProps {
  product: Product;
  variant?: 'default' | 'minimal';
  hideSizeSelector?: boolean;
  hideColorSelector?: boolean;
}

export default function AddToCartButton({
  product,
  variant = 'default',
  hideSizeSelector = false,
  hideColorSelector = false,
}: AddToCartButtonProps) {
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState<string | undefined>(product.sizes?.[0]);
  const [selectedColor, setSelectedColor] = useState<string | undefined>(product.colors?.[0]);
  const [isAdding, setIsAdding] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Reset feedback after 3 seconds
  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  // Safety timeout: Resetear estado si se queda atascado por más de 5 segundos
  useEffect(() => {
    if (isAdding) {
      const safetyTimer = setTimeout(() => {
        console.warn('Safety timeout: Reseteando estado de isAdding');
        setIsAdding(false);
      }, 5000);
      return () => clearTimeout(safetyTimer);
    }
  }, [isAdding]);

  const handleAddToCart = async () => {
    if (!product?.id || quantity <= 0 || quantity > product.stock) {
      return;
    }

    setIsAdding(true);

    try {
      addToCart(product, quantity, selectedSize, selectedColor);
      setFeedback('Añadido al carrito');
      setQuantity(1);

      await new Promise(resolve => setTimeout(resolve, 500));
      openCart();
    } catch (error) {
      setFeedback('Error');
    } finally {
      setIsAdding(false);
    }
  };

  const isOutOfStock = product.stock === 0;
  const canAdd = quantity < product.stock;

  if (variant === 'minimal') {
    return (
      <button
        onClick={handleAddToCart}
        disabled={isOutOfStock || isAdding}
        className={`
          w-full py-3 text-xs uppercase tracking-widest transition-colors
          ${isOutOfStock
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-black text-white hover:bg-gray-800'
          }
        `}
      >
        {isOutOfStock ? 'Agotado' : isAdding ? 'Añadiendo...' : 'Añadir'}
      </button>
    );
  }

  return (
    <div className="space-y-6">
      {/* Size Selector - P&B Style */}
      {!hideSizeSelector && product.sizes && product.sizes.length > 0 && (
        <div>
          <label className="block text-xs uppercase tracking-widest mb-3">Talla</label>
          <div className="flex gap-2 flex-wrap">
            {product.sizes.map((size) => (
              <button
                key={size}
                onClick={() => setSelectedSize(size)}
                className={`
                  min-w-[3rem] px-4 py-3 border text-xs uppercase tracking-wider transition-colors
                  ${selectedSize === size
                    ? 'border-black bg-black text-white'
                    : 'border-gray-200 hover:border-black'
                  }
                `}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Color Selector - P&B Style */}
      {!hideColorSelector && product.colors && product.colors.length > 0 && (
        <div>
          <label className="block text-xs uppercase tracking-widest mb-3">
            Color: <span className="font-normal">{selectedColor}</span>
          </label>
          <div className="flex gap-2 flex-wrap">
            {product.colors.map((color) => (
              <button
                key={color}
                onClick={() => setSelectedColor(color)}
                className={`
                  w-8 h-8 rounded-full border-2 transition-all
                  ${selectedColor === color
                    ? 'ring-2 ring-offset-2 ring-black'
                    : 'hover:ring-2 hover:ring-offset-2 hover:ring-gray-300'
                  }
                `}
                style={{
                  backgroundColor: color.toLowerCase() === 'negro' ? '#000' :
                    color.toLowerCase() === 'blanco' ? '#fff' :
                      color.toLowerCase() === 'azul' ? '#1e40af' :
                        color.toLowerCase() === 'rojo' ? '#dc2626' :
                          color.toLowerCase() === 'verde' ? '#16a34a' :
                            color.toLowerCase() === 'gris' ? '#6b7280' :
                              color.toLowerCase() === 'beige' ? '#d4a574' :
                                color.toLowerCase() === 'marrón' ? '#8b4513' :
                                  '#e5e7eb',
                  borderColor: color.toLowerCase() === 'blanco' ? '#e5e7eb' : 'transparent'
                }}
                title={color}
              />
            ))}
          </div>
        </div>
      )}

      {/* Quantity Selector - P&B Style */}
      <div>
        <label className="block text-xs uppercase tracking-widest mb-3">Cantidad</label>
        <div className="flex items-center">
          <div className="flex items-center border border-gray-200">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              disabled={quantity === 1}
              className="w-10 h-10 flex items-center justify-center hover:bg-gray-50 disabled:opacity-30 transition-colors"
            >
              −
            </button>
            <span className="w-12 h-10 flex items-center justify-center text-sm border-x border-gray-200">
              {quantity}
            </span>
            <button
              onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
              disabled={!canAdd}
              className="w-10 h-10 flex items-center justify-center hover:bg-gray-50 disabled:opacity-30 transition-colors"
            >
              +
            </button>
          </div>
          <span className="text-xs text-gray-400 ml-4 uppercase tracking-wider">
            {product.stock} disponibles
          </span>
        </div>
      </div>

      {/* Add to Cart Button - P&B Style */}
      <button
        onClick={handleAddToCart}
        disabled={isOutOfStock || isAdding}
        className={`
          w-full py-4 text-xs uppercase tracking-widest transition-colors
          ${isOutOfStock
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : isAdding
              ? 'bg-gray-800 text-white'
              : 'bg-black text-white hover:bg-gray-800'
          }
        `}
      >
        {isOutOfStock ? (
          <>Agotado</>
        ) : isAdding ? (
          <>Añadiendo...</>
        ) : (
          <>Añadir al carrito</>
        )}
      </button>

      {/* Feedback - P&B Style */}
      {feedback && (
        <div className="py-3 px-4 border border-gray-200 text-center text-xs uppercase tracking-wider">
          {feedback}
        </div>
      )}

      {/* Low Stock Warning - P&B Style */}
      {0 < product.stock && product.stock <= 5 && (
        <div className="text-xs text-accent-500 uppercase tracking-wider">
          Solo {product.stock} unidades disponibles
        </div>
      )}
    </div>
  );
}
