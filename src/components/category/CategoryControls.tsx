import React, { useMemo, useState } from 'react';

export default function CategoryControls({ products }: { products: any[] }) {
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState('default');
  const [page, setPage] = useState(1);
  const pageSize = 12;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let result = products.filter(p => !q || p.name.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q));

    // Sort products
    switch (sortBy) {
      case 'price-asc':
        result = [...result].sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        result = [...result].sort((a, b) => b.price - a.price);
        break;
      case 'name':
        result = [...result].sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'newest':
        result = [...result].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
    }

    return result;
  }, [products, query, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = filtered.slice((page - 1) * pageSize, page * pageSize);

  function goto(p: number) {
    setPage(Math.max(1, Math.min(totalPages, p)));
    window.scrollTo({ top: 200, behavior: 'smooth' });
  }

  return (
    <div>
      {/* Products Grid - P&B 4 Column Layout */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-6">
        {current.map((product) => (
          <div key={product.id} className="group">
            <a href={`/productos/${product.slug}`} className="block">
              {/* Product Image - P&B Style */}
              <div className="aspect-[3/4] bg-gray-100 overflow-hidden mb-3 relative">
                <img
                  src={product.images?.[0] || ''}
                  alt={product.name}
                  className="w-full h-full object-cover transition-opacity duration-300 group-hover:opacity-90"
                  loading="lazy"
                />

                {/* Discount Badge - P&B Style */}
                {product.compare_at_price && product.compare_at_price > product.price && (
                  <span className="absolute top-3 left-3 text-accent-500 text-xs uppercase tracking-wider">
                    -{Math.round(((product.compare_at_price - product.price) / product.compare_at_price) * 100)}%
                  </span>
                )}

                {/* Wishlist Button */}
                <button
                  className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                  </svg>
                </button>

                {/* Quick Add Button - P&B Style */}
                <div className="absolute bottom-0 left-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                  <button
                    className="w-full py-3 bg-white text-black text-xs uppercase tracking-widest font-medium hover:bg-black hover:text-white transition-colors"
                    onClick={(e) => { e.preventDefault(); window.location.href = `/productos/${product.slug}`; }}
                  >
                    Añadir rápido
                  </button>
                </div>
              </div>

              {/* Product Info - P&B Minimal */}
              <h3 className="text-sm text-black hover:underline line-clamp-1">{product.name}</h3>
              <div className="mt-1 flex items-center gap-2">
                <span className={`text-sm ${product.compare_at_price && product.compare_at_price > product.price ? 'text-accent-500' : ''}`}>
                  {(product.price / 100).toFixed(2)}€
                </span>
                {product.compare_at_price && product.compare_at_price > product.price && (
                  <span className="text-sm text-gray-400 line-through">
                    {(product.compare_at_price / 100).toFixed(2)}€
                  </span>
                )}
              </div>

              {/* Color Swatches */}
              <div className="mt-2 flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-black border border-gray-200"></span>
                <span className="w-3 h-3 rounded-full bg-white border border-gray-200"></span>
                <span className="w-3 h-3 rounded-full bg-blue-900 border border-gray-200"></span>
              </div>
            </a>
          </div>
        ))}
      </div>

      {/* Pagination - P&B Style */}
      {totalPages > 1 && (
        <div className="mt-12 flex items-center justify-center gap-4">
          <button
            onClick={() => goto(page - 1)}
            disabled={page === 1}
            className="px-6 py-3 border border-gray-200 text-xs uppercase tracking-widest hover:border-black disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Anterior
          </button>

          <div className="flex items-center gap-2">
            {Array.from({ length: totalPages }, (_, i) => i + 1).slice(
              Math.max(0, page - 3),
              Math.min(totalPages, page + 2)
            ).map(p => (
              <button
                key={p}
                onClick={() => goto(p)}
                className={`w-10 h-10 flex items-center justify-center text-sm transition-colors ${p === page
                    ? 'bg-black text-white'
                    : 'hover:bg-gray-100'
                  }`}
              >
                {p}
              </button>
            ))}
          </div>

          <button
            onClick={() => goto(page + 1)}
            disabled={page === totalPages}
            className="px-6 py-3 border border-gray-200 text-xs uppercase tracking-widest hover:border-black disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Siguiente
          </button>
        </div>
      )}
    </div>
  );
}
