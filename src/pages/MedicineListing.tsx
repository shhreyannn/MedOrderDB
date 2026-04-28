import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/lib/database';
import { ShoppingCart, ShieldCheck, Truck, ShieldAlert, BadgePercent, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '@/contexts/CartContext';
import { toast } from 'sonner';

import imgParacetamol from '@/assets/medicine-paracetamol.jpg';
import imgAntibiotic from '@/assets/medicine-antibiotic.jpg';
import imgAntihistamine from '@/assets/medicine-antihistamine.jpg';
import imgAntacid from '@/assets/medicine-antacid.jpg';
import imgCough from '@/assets/medicine-cough.jpg';
import imgIbuprofen from '@/assets/medicine-ibuprofen.jpg';
import imgMetformin from '@/assets/medicine-metformin.jpg';
import imgAzithromycin from '@/assets/medicine-azithromycin.jpg';

const medicineImages: Record<number, string> = {
  1: imgParacetamol,
  2: imgAntibiotic,
  3: imgAntihistamine,
  4: imgAntacid,
  5: imgCough,
  6: imgIbuprofen,
  7: imgMetformin,
  8: imgAzithromycin,
};

const MedicineListing: React.FC = () => {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const today = new Date().toISOString().split('T')[0];

  const { data: medicines = [], isLoading } = useQuery({
    queryKey: ['medicines'],
    queryFn: () => db.getMedicines(),
  });

  const categories = ['All', ...Array.from(new Set(medicines.map(m => m.category)))];

  const filteredMedicines = medicines.filter(m => {
    const matchCategory = selectedCategory === 'All' || m.category === selectedCategory;
    const matchSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        m.manufacturer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  const handleAddToCart = (m: any) => {
    addToCart(m);
    toast.success(`${m.name} added to cart`);
  };

  return (
    <div className="space-y-12 pb-12">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-primary to-accent rounded-3xl overflow-hidden shadow-lg mt-4">
        <div className="absolute inset-0 bg-white/10 mix-blend-overlay pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
        <div className="relative p-8 md:p-12 lg:p-16 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="text-white space-y-6 max-w-xl">
            <div className="inline-flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur-md border border-white/30">
              <BadgePercent className="w-4 h-4" /> Limited Time Offer
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight">
              Genuine Medicines, <br className="hidden md:block"/> Delivered Safely.
            </h1>
            <p className="text-primary-foreground/90 text-lg">
              Experience the power of a fully ACID-compliant transactional pharmacy. 100% data integrity guaranteed.
            </p>
            <div className="flex gap-4 pt-2">
              <button onClick={() => {
                document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' });
              }} className="bg-white text-primary px-6 py-3 rounded-xl font-bold hover:bg-secondary transition-colors shadow-sm">
                Shop Now
              </button>
            </div>
          </div>
          
          {/* Trust badges right side hero */}
          <div className="hidden md:flex flex-col gap-4">
            <div className="bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl flex items-center gap-4 w-64 text-white">
              <div className="bg-white/20 p-3 rounded-full"><ShieldCheck className="w-6 h-6" /></div>
              <div><h4 className="font-bold">Verified Quality</h4><p className="text-xs text-white/80">Sourced directly</p></div>
            </div>
            <div className="bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl flex items-center gap-4 w-64 text-white">
              <div className="bg-white/20 p-3 rounded-full"><Truck className="w-6 h-6" /></div>
              <div><h4 className="font-bold">Fast Delivery</h4><p className="text-xs text-white/80">Same day dispatch</p></div>
            </div>
          </div>
        </div>
      </section>

      {/* Catalog Section */}
      <section id="catalog" className="space-y-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <h2 className="text-2xl font-bold text-foreground tracking-tight">Our Catalog</h2>
          
          {/* Search Bar */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search medicines or brands..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
            />
          </div>
        </div>

        {/* Categories */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                selectedCategory === cat 
                  ? 'bg-primary text-primary-foreground shadow-md' 
                  : 'bg-white border border-border text-foreground hover:border-primary hover:text-primary'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Product Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white border border-border rounded-2xl overflow-hidden animate-pulse">
                <div className="aspect-square bg-muted" />
                <div className="p-5 space-y-3">
                  <div className="h-4 bg-muted rounded w-1/3" />
                  <div className="h-5 bg-muted rounded w-3/4" />
                  <div className="h-8 bg-muted rounded mt-4" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredMedicines.length === 0 ? (
          <div className="text-center py-20 bg-white border border-border rounded-2xl">
            <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-bold text-foreground">No medicines found</h3>
            <p className="text-muted-foreground text-sm mt-1">Try adjusting your search or category filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredMedicines.map(m => {
              const expired = m.expiry_date < today;
              const outOfStock = m.stock === 0;
              const available = !expired && !outOfStock;
              
              // Fake MRP for realism (20% higher than price)
              const mrp = (m.price * 1.2).toFixed(2);

              return (
                <div
                  key={m.id}
                  className={`group bg-white border border-border rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 flex flex-col ${
                    !available ? 'opacity-70 grayscale-[20%]' : ''
                  }`}
                >
                  {/* Image Container */}
                  <div className="relative aspect-[4/3] bg-secondary/30 p-6 flex items-center justify-center overflow-hidden">
                    {/* Badges */}
                    <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
                      {expired ? (
                        <span className="flex items-center gap-1 bg-destructive text-destructive-foreground text-[10px] font-bold uppercase px-2 py-1 rounded-md shadow-sm">
                          <ShieldAlert className="w-3 h-3" /> Expired
                        </span>
                      ) : outOfStock ? (
                        <span className="bg-muted-foreground text-white text-[10px] font-bold uppercase px-2 py-1 rounded-md shadow-sm">
                          Out of Stock
                        </span>
                      ) : (
                        <span className="bg-accent text-white text-[10px] font-bold uppercase px-2 py-1 rounded-md shadow-sm">
                          20% OFF
                        </span>
                      )}
                    </div>
                    
                    <img
                      src={medicineImages[m.id] || imgParacetamol}
                      alt={m.name}
                      className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500 drop-shadow-sm"
                    />
                  </div>

                  {/* Details */}
                  <div className="p-5 flex flex-col flex-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary mb-1">
                      {m.category}
                    </span>

                    <h3 className="font-bold text-foreground leading-tight mb-1">
                      {m.name}
                    </h3>
                    <p className="text-xs text-muted-foreground mb-4">
                      By <span className="font-medium text-foreground/80">{m.manufacturer}</span>
                    </p>

                    <div className="mt-auto pt-4 border-t border-border flex flex-col gap-4">
                      <div className="flex items-end justify-between">
                        <div>
                          <p className="text-[10px] text-muted-foreground line-through mb-0.5">MRP ₹{mrp}</p>
                          <div className="flex items-baseline gap-0.5">
                            <span className="text-xl font-bold text-foreground">₹{m.price.toFixed(0)}</span>
                            <span className="text-sm font-semibold text-foreground/70">.{(m.price % 1).toFixed(2).slice(2)}</span>
                          </div>
                        </div>
                        {available && (
                          <span className={`text-[11px] font-semibold px-2 py-1 rounded-md ${m.stock <= 10 ? 'bg-amber-100 text-amber-700' : 'bg-primary/10 text-primary'}`}>
                            {m.stock} Left
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => handleAddToCart(m)}
                        disabled={!available}
                        className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all ${
                          available 
                            ? 'bg-foreground text-background hover:bg-primary hover:text-primary-foreground shadow-md hover:shadow-lg' 
                            : 'bg-muted text-muted-foreground cursor-not-allowed'
                        }`}
                      >
                        <ShoppingCart className="w-4 h-4" />
                        {available ? 'Add to Cart' : 'Unavailable'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

export default MedicineListing;
