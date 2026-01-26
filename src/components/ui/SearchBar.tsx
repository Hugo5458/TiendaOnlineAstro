import React, { useState, useEffect, useRef } from 'react';

export default function SearchBar() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [wrapperRef]);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (query.trim().length >= 2) {
                setIsLoading(true);
                try {
                    console.log('Searching for:', query);
                    const res = await fetch(`/api/products/search?q=${encodeURIComponent(query)}`);
                    if (res.ok) {
                        const data = await res.json();
                        console.log('Search results:', data);
                        setResults(data);
                        setIsOpen(true);
                    } else {
                        console.error('Search request failed:', res.status);
                        setResults([]);
                    }
                } catch (error) {
                    console.error('Search error', error);
                    setResults([]);
                } finally {
                    setIsLoading(false);
                }
            } else {
                setResults([]);
                setIsOpen(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [query]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (query.trim()) {
            window.location.href = `/productos?q=${encodeURIComponent(query)}`;
        }
    };

    return (
        <div ref={wrapperRef} className="relative w-full">
            <form onSubmit={handleSubmit} className="relative z-[60]">
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => { if (results.length > 0) setIsOpen(true); }}
                    placeholder="¿Qué estás buscando?"
                    className="w-full px-4 py-3 border-b border-gray-200 text-sm bg-transparent focus:border-black focus:outline-none transition-colors placeholder:text-gray-400"
                    autoComplete="off"
                />

                {/* Search Icon */}
                <button
                    type="submit"
                    className="absolute right-0 top-1/2 -translate-y-1/2 p-2 hover:opacity-70 transition-opacity"
                    aria-label="Buscar"
                >
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                    </svg>
                </button>

                {/* Loading indicator */}
                {isLoading && (
                    <div className="absolute right-10 top-1/2 -translate-y-1/2 flex items-center gap-2">
                        <span className="text-[10px] text-gray-400 uppercase tracking-widest hidden sm:block">Buscando...</span>
                        <svg className="animate-spin h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    </div>
                )}
            </form>

            {/* Results Dropdown - P&B Style */}
            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 shadow-xl z-[100] max-h-96 overflow-y-auto animate-fade-in">
                    {results.length > 0 ? (
                        <>
                            <div className="py-2">
                                {results.map((product) => (
                                    <a
                                        key={product.id}
                                        href={`/productos/${product.slug}`}
                                        className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors group"
                                    >
                                        <div className="w-14 h-14 bg-gray-100 flex-shrink-0 overflow-hidden relative">
                                            {product.image ? (
                                                <img
                                                    src={product.image}
                                                    alt={product.name}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-300">
                                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                    </svg>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-black truncate group-hover:text-accent-500 transition-colors">{product.name}</p>
                                            <p className="text-xs text-gray-500">{typeof product.price === 'number' ? (product.price / 100).toFixed(2) : '0.00'}€</p>
                                        </div>
                                    </a>
                                ))}
                            </div>
                            <div className="border-t border-gray-100 p-2 bg-gray-50">
                                <a
                                    href={`/productos?q=${encodeURIComponent(query)}`}
                                    className="block w-full py-3 text-center text-xs uppercase tracking-widest text-white bg-black hover:bg-gray-800 transition-colors"
                                >
                                    Ver todos los resultados
                                </a>
                            </div>
                        </>
                    ) : (
                        query.length >= 2 && !isLoading && (
                            <div className="p-8 text-center">
                                <p className="text-sm text-gray-500 font-medium">No encontramos nada para "{query}"</p>
                                <p className="text-xs text-gray-400 mt-2">Intenta con términos más generales (ej: camisa, pantalón)</p>
                            </div>
                        )
                    )}
                </div>
            )}
        </div>
    );
}
