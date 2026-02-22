import React, { useState } from 'react';

interface SizeRecommendation {
    size: string;
    confidence: string;
}

export default function SizeRecommender() {
    const [isOpen, setIsOpen] = useState(false);
    const [height, setHeight] = useState('');
    const [weight, setWeight] = useState('');
    const [gender, setGender] = useState<'hombre' | 'mujer'>('mujer');
    const [recommendation, setRecommendation] = useState<SizeRecommendation | null>(null);

    function calculateSize(): SizeRecommendation {
        const h = parseInt(height);
        const w = parseInt(weight);
        const bmi = w / ((h / 100) ** 2);

        if (gender === 'mujer') {
            if (h < 160) {
                if (bmi < 20) return { size: 'XS', confidence: 'Alta' };
                if (bmi < 23) return { size: 'S', confidence: 'Alta' };
                if (bmi < 27) return { size: 'M', confidence: 'Media' };
                if (bmi < 31) return { size: 'L', confidence: 'Media' };
                return { size: 'XL', confidence: 'Media' };
            } else if (h < 170) {
                if (bmi < 19) return { size: 'XS', confidence: 'Alta' };
                if (bmi < 22) return { size: 'S', confidence: 'Alta' };
                if (bmi < 26) return { size: 'M', confidence: 'Alta' };
                if (bmi < 30) return { size: 'L', confidence: 'Media' };
                return { size: 'XL', confidence: 'Media' };
            } else {
                if (bmi < 19) return { size: 'S', confidence: 'Alta' };
                if (bmi < 22) return { size: 'M', confidence: 'Alta' };
                if (bmi < 26) return { size: 'L', confidence: 'Alta' };
                if (bmi < 30) return { size: 'XL', confidence: 'Media' };
                return { size: 'XL', confidence: 'Media' };
            }
        } else {
            // Hombre
            if (h < 170) {
                if (bmi < 20) return { size: 'XS', confidence: 'Alta' };
                if (bmi < 23) return { size: 'S', confidence: 'Alta' };
                if (bmi < 27) return { size: 'M', confidence: 'Media' };
                if (bmi < 31) return { size: 'L', confidence: 'Media' };
                return { size: 'XL', confidence: 'Media' };
            } else if (h < 180) {
                if (bmi < 20) return { size: 'S', confidence: 'Alta' };
                if (bmi < 24) return { size: 'M', confidence: 'Alta' };
                if (bmi < 28) return { size: 'L', confidence: 'Alta' };
                if (bmi < 32) return { size: 'XL', confidence: 'Media' };
                return { size: 'XXL', confidence: 'Media' };
            } else {
                if (bmi < 21) return { size: 'M', confidence: 'Alta' };
                if (bmi < 25) return { size: 'L', confidence: 'Alta' };
                if (bmi < 29) return { size: 'XL', confidence: 'Alta' };
                return { size: 'XXL', confidence: 'Media' };
            }
        }
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!height || !weight) return;
        const result = calculateSize();
        setRecommendation(result);
    }

    function reset() {
        setHeight('');
        setWeight('');
        setRecommendation(null);
    }

    return (
        <>
            {/* Trigger Button */}
            <button
                onClick={() => { setIsOpen(true); reset(); }}
                className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-gray-500 hover:text-black border border-gray-200 px-4 py-2 hover:border-black transition-all duration-300"
                type="button"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" />
                </svg>
                Guía de tallas
            </button>

            {/* Modal */}
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setIsOpen(false)}>
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-black/60" />

                    {/* Modal Content */}
                    <div
                        className="relative w-full max-w-md bg-white overflow-hidden animate-fade-in"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Close Button */}
                        <button
                            onClick={() => setIsOpen(false)}
                            className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center hover:bg-gray-100 transition-colors"
                            aria-label="Cerrar"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>

                        {/* Header */}
                        <div className="bg-black px-8 py-8 text-white text-center">
                            <span className="text-xs uppercase tracking-widest opacity-70">Recomendador</span>
                            <h2 className="text-2xl uppercase tracking-widest font-light mt-3">
                                Tu talla ideal
                            </h2>
                            <p className="text-sm opacity-60 mt-2">Basado en tu altura y peso</p>
                        </div>

                        {/* Form / Result */}
                        <div className="px-8 py-8">
                            {!recommendation ? (
                                <form onSubmit={handleSubmit} className="space-y-5">
                                    {/* Gender Selector */}
                                    <div>
                                        <label className="block text-xs uppercase tracking-wider text-gray-500 mb-3">Género</label>
                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                type="button"
                                                onClick={() => setGender('mujer')}
                                                className={`py-3 text-sm uppercase tracking-wider border transition-all duration-200 ${gender === 'mujer'
                                                    ? 'bg-black text-white border-black'
                                                    : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'
                                                    }`}
                                            >
                                                Mujer
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setGender('hombre')}
                                                className={`py-3 text-sm uppercase tracking-wider border transition-all duration-200 ${gender === 'hombre'
                                                    ? 'bg-black text-white border-black'
                                                    : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'
                                                    }`}
                                            >
                                                Hombre
                                            </button>
                                        </div>
                                    </div>

                                    {/* Height */}
                                    <div>
                                        <label htmlFor="sr-height" className="block text-xs uppercase tracking-wider text-gray-500 mb-2">
                                            Altura (cm)
                                        </label>
                                        <input
                                            id="sr-height"
                                            type="number"
                                            min="140"
                                            max="210"
                                            value={height}
                                            onChange={(e) => setHeight(e.target.value)}
                                            placeholder="Ej: 170"
                                            required
                                            className="w-full px-4 py-3 border border-gray-200 text-sm focus:border-black focus:outline-none transition-colors"
                                        />
                                    </div>

                                    {/* Weight */}
                                    <div>
                                        <label htmlFor="sr-weight" className="block text-xs uppercase tracking-wider text-gray-500 mb-2">
                                            Peso (kg)
                                        </label>
                                        <input
                                            id="sr-weight"
                                            type="number"
                                            min="35"
                                            max="150"
                                            value={weight}
                                            onChange={(e) => setWeight(e.target.value)}
                                            placeholder="Ej: 65"
                                            required
                                            className="w-full px-4 py-3 border border-gray-200 text-sm focus:border-black focus:outline-none transition-colors"
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        className="w-full bg-black text-white py-4 text-xs uppercase tracking-widest hover:bg-gray-800 transition-colors"
                                    >
                                        Calcular talla
                                    </button>
                                </form>
                            ) : (
                                <div className="text-center">
                                    {/* Result */}
                                    <div className="mb-6">
                                        <p className="text-xs uppercase tracking-widest text-gray-400 mb-4">Tu talla recomendada</p>
                                        <div className="w-24 h-24 mx-auto border-2 border-black flex items-center justify-center mb-4">
                                            <span className="text-4xl font-light tracking-widest">{recommendation.size}</span>
                                        </div>
                                        <p className="text-sm text-gray-600">
                                            Confianza: <span className={`font-medium ${recommendation.confidence === 'Alta' ? 'text-green-600' : 'text-amber-600'}`}>
                                                {recommendation.confidence}
                                            </span>
                                        </p>
                                    </div>

                                    {/* Info */}
                                    <div className="border border-gray-100 p-4 mb-6 text-left">
                                        <p className="text-xs text-gray-500 leading-relaxed">
                                            Para <strong>{gender === 'mujer' ? 'mujer' : 'hombre'}</strong> de <strong>{height}cm</strong> y <strong>{weight}kg</strong>.
                                            Esta recomendación es orientativa. Te sugerimos consultar la guía de medidas específica de cada prenda.
                                        </p>
                                    </div>

                                    {/* Size Table */}
                                    <div className="border border-gray-100 mb-6">
                                        <table className="w-full text-xs">
                                            <thead>
                                                <tr className="bg-gray-50">
                                                    <th className="py-2 px-3 text-left uppercase tracking-wider text-gray-500">Talla</th>
                                                    <th className="py-2 px-3 text-left uppercase tracking-wider text-gray-500">Pecho (cm)</th>
                                                    <th className="py-2 px-3 text-left uppercase tracking-wider text-gray-500">Cintura (cm)</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(gender === 'mujer'
                                                    ? [
                                                        { size: 'XS', chest: '80-84', waist: '60-64' },
                                                        { size: 'S', chest: '84-88', waist: '64-68' },
                                                        { size: 'M', chest: '88-92', waist: '68-72' },
                                                        { size: 'L', chest: '92-96', waist: '72-76' },
                                                        { size: 'XL', chest: '96-100', waist: '76-80' },
                                                    ]
                                                    : [
                                                        { size: 'XS', chest: '86-90', waist: '72-76' },
                                                        { size: 'S', chest: '90-94', waist: '76-80' },
                                                        { size: 'M', chest: '94-98', waist: '80-84' },
                                                        { size: 'L', chest: '98-102', waist: '84-88' },
                                                        { size: 'XL', chest: '102-106', waist: '88-92' },
                                                        { size: 'XXL', chest: '106-110', waist: '92-96' },
                                                    ]
                                                ).map((row) => (
                                                    <tr
                                                        key={row.size}
                                                        className={`border-t border-gray-100 ${row.size === recommendation.size ? 'bg-black text-white' : ''}`}
                                                    >
                                                        <td className="py-2 px-3 font-medium">{row.size}</td>
                                                        <td className="py-2 px-3">{row.chest}</td>
                                                        <td className="py-2 px-3">{row.waist}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    <button
                                        onClick={reset}
                                        className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-gray-500 hover:text-black transition-colors"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                                        </svg>
                                        Recalcular
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
