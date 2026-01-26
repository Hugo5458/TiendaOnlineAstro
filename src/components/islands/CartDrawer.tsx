import React, { useEffect, useState } from 'react';
import { useStore } from '@nanostores/react';
import { isCartOpen, closeCart, cartItems, removeFromCart, updateCartItemQuantity, getCartSubtotal } from '../../stores/cart';

export default function CartDrawer() {
    const isOpen = useStore(isCartOpen);
    const items = useStore(cartItems);
    const [isUpdating, setIsUpdating] = useState(false);

    // Prevent scroll when open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
    }, [isOpen]);

    const formatPrice = (cents: number) => {
        return new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: 'EUR',
        }).format(cents / 100);
    };

    const subtotal = getCartSubtotal();
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

    const handleUpdateQuantity = async (itemId: string, newQuantity: number) => {
        if (isUpdating) return;
        // setIsUpdating(true); // Optional: if we want to block fast clicks
        try {
            if (newQuantity < 1) {
                removeFromCart(itemId);
            } else {
                updateCartItemQuantity(itemId, newQuantity);
            }
        } catch (e) {
            console.error(e);
        } finally {
            // setIsUpdating(false);
        }
    };

    const handleRemove = (itemId: string) => {
        removeFromCart(itemId);
    }

    return (
        <>
            {/* Overlay */}
            <div
                className={`fixed inset-0 bg-black/50 z-[60] transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                    }`}
                onClick={() => closeCart()}
                aria-hidden="true"
            />

            {/* Slide-over panel - P&B Style */}
            <div
                className={`fixed inset-y-0 right-0 z-[70] w-full max-w-md bg-white transform transition-transform duration-300 ease-out flex flex-col shadow-2xl ${isOpen ? 'translate-x-0' : 'translate-x-full'
                    }`}
            >
                {/* Header - P&B Style */}
                <div className="flex items-center justify-between px-6 h-14 border-b border-gray-100 flex-shrink-0">
                    <span className="text-sm uppercase tracking-widest font-bold">
                        Carrito ({totalItems})
                    </span>
                    <button
                        type="button"
                        onClick={() => closeCart()}
                        className="p-2 -mr-2 hover:opacity-70 transition-opacity"
                        aria-label="Cerrar carrito"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Cart Items */}
                <div className="flex-1 overflow-y-auto">
                    {items.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full py-12 text-center px-6">
                            <svg className="w-16 h-16 text-gray-200 mb-6" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                            </svg>
                            <p className="text-sm text-gray-500 mb-6 uppercase tracking-wider">Tu carrito está vacío</p>
                            <button
                                onClick={() => closeCart()}
                                className="px-8 py-3 bg-black text-white text-xs uppercase tracking-widest hover:bg-gray-800 transition-colors"
                            >
                                Empezar a comprar
                            </button>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {items.map((item) => (
                                <div key={item.id} className="flex gap-4 p-6 hover:bg-gray-50/50 transition-colors group">
                                    <div className="w-24 h-32 flex-shrink-0 bg-gray-100 overflow-hidden relative">
                                        <img
                                            src={item.image || '/placeholder.jpg'}
                                            alt={item.name}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <div className="flex-1 flex flex-col justify-between py-1">
                                        <div>
                                            <div className="flex justify-between items-start">
                                                <h3 className="text-sm text-black font-medium leading-tight mr-4">{item.name}</h3>
                                                <button
                                                    onClick={() => handleRemove(item.id)}
                                                    className="text-gray-400 hover:text-black transition-colors"
                                                    aria-label="Eliminar producto"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </div>
                                            {(item.size || item.color) && (
                                                <div className="mt-2 text-xs text-gray-500 space-y-1">
                                                    {item.size && <p>Talla: <span className="text-black uppercase">{item.size}</span></p>}
                                                    {item.color && <p>Color: <span className="text-black capitalize">{item.color}</span></p>}
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center justify-between mt-4">
                                            {/* Quantity Controls - P&B */}
                                            <div className="flex items-center border border-gray-200 h-8">
                                                <button
                                                    onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                                                    className="w-8 h-full flex items-center justify-center hover:bg-gray-100 transition-colors text-gray-600"
                                                    disabled={isUpdating}
                                                >
                                                    −
                                                </button>
                                                <span className="w-10 h-full flex items-center justify-center text-xs font-medium border-x border-gray-200">
                                                    {item.quantity}
                                                </span>
                                                <button
                                                    onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                                                    className="w-8 h-full flex items-center justify-center hover:bg-gray-100 transition-colors text-gray-600"
                                                    disabled={item.quantity >= item.maxStock || isUpdating}
                                                >
                                                    +
                                                </button>
                                            </div>

                                            <p className="font-medium text-sm">{formatPrice(item.price * item.quantity)}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                {items.length > 0 && (
                    <div className="border-t border-gray-100 p-6 space-y-4 bg-white flex-shrink-0">
                        {/* Subtotal */}
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs uppercase tracking-widest text-gray-500">Subtotal</span>
                            <span className="text-lg font-medium">
                                {formatPrice(subtotal)}
                            </span>
                        </div>

                        <p className="text-[10px] text-gray-400 text-center">
                            Impuestos incluidos. Gastos de envío calculados en el pago.
                        </p>

                        <div className="space-y-3 pt-2">
                            {/* Checkout Button */}
                            <a
                                href="/carrito"
                                className="block w-full bg-black text-white text-center py-4 text-xs uppercase tracking-widest hover:bg-gray-800 transition-colors font-bold"
                            >
                                Tramitar Pedido
                            </a>

                            <button
                                onClick={() => closeCart()}
                                className="block w-full text-center py-3 text-xs uppercase tracking-wider text-black border border-gray-200 hover:border-black transition-colors"
                            >
                                Seguir comprando
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
