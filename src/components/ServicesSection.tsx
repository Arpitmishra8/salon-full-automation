import React, { useState } from 'react';
import { Clock, Sparkles, Scissors, Search, ArrowRight } from 'lucide-react';
import { Service } from '../types/index.ts';

interface ServicesSectionProps {
  services: Service[];
  onSelectServiceToBook: (serviceId: string) => void;
}

export const ServicesSection: React.FC<ServicesSectionProps> = ({
  services,
  onSelectServiceToBook
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const categories = ['All', ...Array.from(new Set(services.map(s => s.category)))];

  const filtered = services.filter(s => {
    const matchesCat = selectedCategory === 'All' || s.category === selectedCategory;
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-12">
      {/* Title & Introduction */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-800 tracking-widest uppercase bg-amber-50 px-3 py-1 rounded-full border border-amber-200/60">
          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
          A-One Service Menu · Subhanpura, Vadodara
        </div>
        <h2 className="font-editorial text-3xl sm:text-4xl lg:text-5xl font-bold text-stone-900">
          Hair Styling, Beauty &amp; Bridal Care
        </h2>
        <p className="text-stone-600 text-sm sm:text-base leading-relaxed">
          Explore our complete portfolio of hair treatments, skin therapies, bridal makeover, and spa services at Platinum Complex, Subhanpura.
        </p>
      </div>

      {/* Search & Category Filter */}
      <div className="space-y-4">
        {/* Search Input */}
        <div className="max-w-md mx-auto relative">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by treatment name, balayage, facial..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 shadow-xs"
          />
        </div>

        {/* Categories Tab Bar */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 p-1.5 bg-stone-100/80 rounded-xl max-w-4xl mx-auto">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all ${
                selectedCategory === cat
                  ? 'bg-white text-stone-900 shadow-sm font-semibold'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Services Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-stone-400 text-sm">
          No services match your search or filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filtered.map(service => (
            <div
              key={service.id}
              className="group bg-white rounded-2xl border border-stone-200/80 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                {service.image_url && (
                  <div className="relative h-52 overflow-hidden bg-stone-100">
                    <img
                      src={service.image_url}
                      alt={service.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    {service.is_featured === 1 && (
                      <span className="absolute top-3 left-3 bg-stone-900/90 text-amber-300 backdrop-blur-xs text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider">
                        Signature Service
                      </span>
                    )}
                  </div>
                )}

                <div className="p-6">
                  <div className="flex items-center justify-between text-[11px] text-amber-800 font-semibold uppercase tracking-wider mb-2">
                    <span>{service.category}</span>
                    <span className="text-stone-500 font-normal normal-case flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-stone-400" />
                      {service.duration_minutes} mins
                    </span>
                  </div>

                  <h3 className="font-editorial text-xl font-bold text-stone-900 group-hover:text-amber-900 transition-colors">
                    {service.name}
                  </h3>

                  <p className="text-xs text-stone-600 mt-2 leading-relaxed">
                    {service.description}
                  </p>

                  {service.name === 'Home Services' && (
                    <div className="mt-2 text-[11px] text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200 font-medium">
                      Note: Home Services are available only if confirmed by the salon owner.
                    </div>
                  )}
                </div>
              </div>

              <div className="px-6 pb-6 pt-3 border-t border-stone-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-stone-400 block uppercase tracking-wider">Estimated Price</span>
                  <span className="text-lg font-bold text-stone-900">₹{service.price.toLocaleString()}</span>
                </div>

                <button
                  onClick={() => onSelectServiceToBook(service.id)}
                  className="inline-flex items-center gap-1.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors group-hover:bg-amber-700"
                >
                  <span>Book Now</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Information footer banner */}
      <div className="p-4 bg-stone-100/90 rounded-2xl border border-stone-200 text-center text-xs text-stone-600 max-w-2xl mx-auto space-y-1">
        <p className="font-semibold text-stone-800">
          A-One Hair &amp; Beauty Studio - Subhanpura, Vadodara
        </p>
        <p className="text-[11px] text-stone-500">
          Services and prices can be tailored and customized by the salon owner in the Admin Dashboard. Need bridal consultation? Call 072030 91115 or visit Platinum Complex, G-1, Subhanpura.
        </p>
      </div>
    </div>
  );
};
