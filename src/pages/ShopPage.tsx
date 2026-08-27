// src/pages/ShopPage.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShoppingCart, Plus, Minus, Trash2, Check, Package, Sparkles, 
  ArrowLeft, Search, ShieldCheck, Truck, X, Phone, User, 
  MapPin, FileText, Send, Info, Eye, CheckCircle2, ChevronRight, Tag
} from 'lucide-react';

export interface PosterProduct {
  id: string;
  name: string;
  category: 'Matematika' | 'Kimia' | 'Fisika' | 'Biologi' | 'Geografi';
  price: number;
  originalPrice: number;
  rating: number;
  soldCount: number;
  size: string;
  material: string;
  description: string;
  features: string[];
  gradient: string;
  badge?: string;
  iconSymbol: string;
}

export interface CartItem {
  product: PosterProduct;
  quantity: number;
}

// 5 Poster Pendidikan dengan harga satuan antara 8.500 s/d 10.000
export const POSTER_PRODUCTS: PosterProduct[] = [
  {
    id: 'poster-matematika',
    name: 'Poster Rumus Matematika SMA & Aljabar Lengkap',
    category: 'Matematika',
    price: 8500,
    originalPrice: 15000,
    rating: 4.9,
    soldCount: 320,
    size: 'A3+ (32 x 48 cm)',
    material: 'Art Paper 260 gsm Glossy Laminated',
    description: 'Rangkuman visual rumus penting aljabar, trigonometri, geometri bidang, kalkulus, deret angka, dan matriks. Dirancang dengan bagan terstruktur untuk memudahkan hafalan dan pemahaman konsep cepat.',
    features: [
      'Font & simbol matematika jelas terbaca (LaTeX quality)',
      'Tahan cipratan air & anti pudar (Laminasi glossy)',
      'Cocok ditempel di dinding kamar belajar, lab sekolah, atau kelas',
      'Dilengkapi tips cepat & rumus sakti ujian'
    ],
    gradient: 'from-blue-600 via-indigo-600 to-cyan-500',
    badge: 'Terlaris',
    iconSymbol: '∑ ∫ √ π'
  },
  {
    id: 'poster-kimia',
    name: 'Poster Tabel Periodik Unsur Kimia Modern HD',
    category: 'Kimia',
    price: 9000,
    originalPrice: 16000,
    rating: 4.8,
    soldCount: 245,
    size: 'A3+ (32 x 48 cm)',
    material: 'Art Paper 260 gsm HD Vivid Print',
    description: 'Tabel periodik unsur IUPAC terbaru memuat 118 unsur lengkap dengan nomor atom, nomor massa, konfigurasi elektron, titik lebur, keelektronegatifan, dan pengelompokan warna golongan unsur.',
    features: [
      '118 Unsur lengkap IUPAC terupdate',
      'Skema warna kontras untuk memudahkan identifikasi golongan',
      'Informasi lengkap nomor atom, massa molar & wujud zat',
      'Kertas tebal premium tidak mudah robek'
    ],
    gradient: 'from-emerald-600 via-teal-600 to-green-500',
    badge: 'Paling Populer',
    iconSymbol: '⚗️ H₂O NaCl'
  },
  {
    id: 'poster-fisika',
    name: 'Poster Hukum Fisika, Gaya & Tata Surya Semesta',
    category: 'Fisika',
    price: 9500,
    originalPrice: 17500,
    rating: 5.0,
    soldCount: 180,
    size: 'A3+ (32 x 48 cm)',
    material: 'Art Paper 260 gsm Anti-Glare Coating',
    description: 'Infografis komprehensif memuat Hukum Newton, Hukum Gravitasi & Termodinamika, Gelombang & Optik, Listrik Magnet, serta diagram orbit planet tata surya dengan data skala nyata.',
    features: [
      'Ilustrasi astronomi & tata surya warna ultra tajam',
      'Rumus-rumus mekanika, energi, gelombang & termodinamika',
      'Daftar konstanta fisika dasar standar internasional',
      'Format visual infografis yang memanjakan mata'
    ],
    gradient: 'from-purple-600 via-violet-600 to-pink-500',
    badge: 'Rekomendasi Guru',
    iconSymbol: '⚛️ E=mc² 🪐'
  },
  {
    id: 'poster-biologi',
    name: 'Poster Anatomi Tubuh Manusia & Sistem Organ',
    category: 'Biologi',
    price: 9000,
    originalPrice: 16000,
    rating: 4.9,
    soldCount: 210,
    size: 'A3+ (32 x 48 cm)',
    material: 'Art Paper 260 gsm Crystal Coat',
    description: 'Poster anatomi sistem tubuh manusia beresolusi tinggi, mencakup sistem peredaran darah, rangka tubuh, pernapasan, saraf, dan pencernaan disertai penamaan organ dalam bahasa Indonesia & Latin.',
    features: [
      'Visualisasi 3D anatomi organ dan sistem tubuh manusia',
      'Nomenklatur ganda (Bahasa Indonesia & Istilah Medis Latin)',
      'Rincian fungsi utama tiap organ dan sistem sirkulasi',
      'Warna cerah memudahkan pembelajaran biologi SMA & umum'
    ],
    gradient: 'from-rose-600 via-amber-600 to-orange-500',
    badge: 'Edukasi Lengkap',
    iconSymbol: '🫀 🧬 🔬'
  },
  {
    id: 'poster-geografi',
    name: 'Poster Peta Indonesia 38 Provinsi & Geografi Nusantara',
    category: 'Geografi',
    price: 10000,
    originalPrice: 18000,
    rating: 4.9,
    soldCount: 290,
    size: 'A3+ (32 x 48 cm)',
    material: 'Art Paper 260 gsm Waterproof Laminate',
    description: 'Peta Negara Kesatuan Republik Indonesia terbaru mencakup 38 Provinsi lengkap dengan ibukota provinsi, batas wilayah perairan, zona waktu (WIB/WITA/WIT), dan pulau-pulau utama nusantara.',
    features: [
      'Peta resmi pembagian 38 Provinsi terbaru',
      'Detail pulau, selat, laut, dan zona waktu nasional',
      'Simbol legenda jelas: Ibukota, pelabuhan, bandara utama',
      'Laminasi tahan basah dan mudah dibersihkan'
    ],
    gradient: 'from-amber-600 via-orange-600 to-yellow-500',
    badge: 'Edisi 38 Provinsi',
    iconSymbol: '🗺️ 🇮🇩 🧭'
  }
];

export function formatRupiah(amount: number): string {
  return `Rp ${Number(amount).toLocaleString('id-ID')}`;
}

export default function ShopPage() {
  const navigate = useNavigate();
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('jualan_poster_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [selectedProduct, setSelectedProduct] = useState<PosterProduct | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(false);
  const [orderSuccess, setOrderSuccess] = useState<boolean>(false);
  const [lastInvoice, setLastInvoice] = useState<string>('');

  // Form checkout state
  const [buyerName, setBuyerName] = useState<string>('');
  const [buyerPhone, setBuyerPhone] = useState<string>('');
  const [buyerAddress, setBuyerAddress] = useState<string>('');
  const [buyerNotes, setBuyerNotes] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('qris');
  const [addedToast, setAddedToast] = useState<string | null>(null);

  // Simpan keranjang ke localStorage
  useEffect(() => {
    localStorage.setItem('jualan_poster_cart', JSON.stringify(cart));
  }, [cart]);

  // Tambah item ke keranjang
  const addToCart = (product: PosterProduct, qty: number = 1) => {
    setCart(prevCart => {
      const existing = prevCart.find(item => item.product.id === product.id);
      if (existing) {
        return prevCart.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + qty }
            : item
        );
      }
      return [...prevCart, { product, quantity: qty }];
    });

    setAddedToast(`"${product.name}" ditambahkan ke keranjang (+${qty})`);
    setTimeout(() => setAddedToast(null), 2500);
  };

  // Ubah kuantitas
  const updateQuantity = (productId: string, delta: number) => {
    setCart(prevCart => {
      return prevCart
        .map(item => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  // Hapus item dari keranjang
  const removeFromCart = (productId: string) => {
    setCart(prevCart => prevCart.filter(item => item.product.id !== productId));
  };

  // Kosongkan keranjang
  const clearCart = () => {
    if (window.confirm('Apakah Anda yakin ingin mengosongkan keranjang?')) {
      setCart([]);
    }
  };

  // Total perhitungan
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const totalOriginalPrice = cart.reduce((sum, item) => sum + item.product.originalPrice * item.quantity, 0);
  const totalSavings = totalOriginalPrice - totalPrice;

  // Filter produk
  const filteredProducts = POSTER_PRODUCTS.filter(p => {
    const matchCategory = selectedCategory === 'Semua' || p.category === selectedCategory;
    const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        p.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  // Submit checkout
  const handleCheckoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) {
      alert('Keranjang belanja Anda kosong!');
      return;
    }
    if (!buyerName.trim() || !buyerPhone.trim() || !buyerAddress.trim()) {
      alert('Mohon lengkapi Nama, Nomor WhatsApp, dan Alamat Pengiriman.');
      return;
    }

    const invoiceNo = `INV-POSTER-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
    setLastInvoice(invoiceNo);

    // Kirim via WhatsApp secara terstruktur
    const itemsText = cart.map((item, idx) => 
      `${idx + 1}. *${item.product.name}*\n   Jumlah: ${item.quantity} pcs x ${formatRupiah(item.product.price)} = ${formatRupiah(item.product.price * item.quantity)}`
    ).join('\n');

    const waMessage = 
`🛒 *PESANAN BARU - JUALAN POSTER*
No. Invoice: *${invoiceNo}*
---------------------------------------
👤 *Data Pembeli:*
- Nama: ${buyerName.trim()}
- No. WA: ${buyerPhone.trim()}
- Alamat: ${buyerAddress.trim()}
${buyerNotes.trim() ? `- Catatan: ${buyerNotes.trim()}` : ''}
- Pembayaran: ${paymentMethod === 'qris' ? 'QRIS / Otomatis (checkout.html)' : 'Transfer Bank / Manual'}

📦 *Rincian Barang:*
${itemsText}

---------------------------------------
📊 *Ringkasan Biaya:*
- Total Barang: ${totalItems} pcs
- Total Pembayaran: *${formatRupiah(totalPrice)}*

Mohon konfirmasi pengiriman pesanan. Terima kasih!`;

    // Simpan data invoice terakhir di localStorage
    localStorage.setItem('last_poster_invoice', invoiceNo);
    localStorage.setItem('last_poster_cart', JSON.stringify(cart));
    localStorage.setItem('last_poster_buyer', JSON.stringify({
      name: buyerName.trim(),
      phone: buyerPhone.trim(),
      address: buyerAddress.trim(),
      notes: buyerNotes.trim(),
      totalPrice
    }));

    // Kosongkan keranjang
    setCart([]);
    setIsCheckoutOpen(false);

    if (paymentMethod === 'qris') {
      // SINKRONISASI KE CHECKOUT.HTML
      const CHECKOUT_BASE = import.meta.env.DEV ? '/checkout.html' : 'https://math315.id/checkout.html';
      const productName = `Pesanan Poster Edukasi ${totalItems} pcs`;
      const checkoutUrl = `${CHECKOUT_BASE}?productId=poster_order_${Date.now().toString().slice(-4)}&productName=${encodeURIComponent(productName)}&price=${totalPrice}&phone=${encodeURIComponent(buyerPhone.trim())}&name=${encodeURIComponent(buyerName.trim())}`;
      
      // Arahkan langsung ke checkout.html
      window.location.href = checkoutUrl;
    } else {
      // Mode Manual WhatsApp
      setOrderSuccess(true);
      const encodedMsg = encodeURIComponent(waMessage);
      const waUrl = `https://wa.me/6281234567890?text=${encodedMsg}`;
      window.open(waUrl, '_blank');
    }
  };

  const categories = ['Semua', 'Matematika', 'Kimia', 'Fisika', 'Biologi', 'Geografi'];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white pb-20">
      
      {/* Toast Notifikasi Tambah Barang */}
      {addedToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-bounce border border-emerald-400/40">
          <CheckCircle2 size={20} />
          <span className="text-sm font-semibold">{addedToast}</span>
        </div>
      )}

      {/* TOP NAVBAR */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 lg:px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate('/')}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1 text-sm font-medium"
              title="Kembali ke Beranda"
            >
              <ArrowLeft size={18} />
              <span className="hidden sm:inline">Beranda</span>
            </button>
            
            <div className="h-6 w-px bg-slate-800 hidden sm:block"></div>

            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
                <Sparkles size={20} className="text-white" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-300 bg-clip-text text-transparent">
                  Jualan Poster
                </h1>
                <p className="text-xs text-indigo-400 font-medium hidden sm:block">Poster Pendidikan & Sains Edukatif</p>
              </div>
            </div>
          </div>

          {/* Quick Search */}
          <div className="flex-1 max-w-md hidden md:block">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text"
                placeholder="Cari poster matematika, kimia, fisika, biologi..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Cart Button */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-semibold shadow-lg shadow-indigo-600/30 transition-all transform hover:scale-105 active:scale-95"
            >
              <ShoppingCart size={20} />
              <span className="hidden sm:inline text-sm">Keranjang</span>
              {totalItems > 0 && (
                <span className="bg-rose-500 text-white text-xs font-extrabold px-2 py-0.5 rounded-full animate-pulse shadow-md">
                  {totalItems}
                </span>
              )}
            </button>
          </div>

        </div>
      </header>

      {/* HERO BANNER */}
      <section className="relative overflow-hidden bg-gradient-to-b from-indigo-950/60 via-slate-900 to-slate-950 px-4 lg:px-8 py-12 border-b border-slate-800">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-600/15 via-transparent to-transparent pointer-events-none"></div>
        <div className="max-w-7xl mx-auto relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold uppercase tracking-wider mb-4">
            <Sparkles size={14} /> Toko Resmi Poster Pendidikan
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white mb-4">
            Poster Edukasi Visual Berkualitas Tinggi
          </h2>
          <p className="text-slate-300 text-base sm:text-lg max-w-2xl mx-auto mb-8 leading-relaxed">
            Tingkatkan pemahaman belajar Sains & Matematika dengan poster A3+ beresolusi tajam, laminasi awet, dan desain infografis modern.
          </p>

          {/* Keunggulan Toko */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 max-w-4xl mx-auto">
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400">
                <Tag size={18} />
              </div>
              <div className="text-left">
                <div className="text-xs text-slate-400">Harga Terjangkau</div>
                <div className="text-sm font-bold text-slate-100">Rp 8.500 - 10.000</div>
              </div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
                <Package size={18} />
              </div>
              <div className="text-left">
                <div className="text-xs text-slate-400">Kuantitas Bebas</div>
                <div className="text-sm font-bold text-slate-100">Beli 1 atau Banyak</div>
              </div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400">
                <ShieldCheck size={18} />
              </div>
              <div className="text-left">
                <div className="text-xs text-slate-400">Kualitas Bahan</div>
                <div className="text-sm font-bold text-slate-100">Art Paper 260gsm</div>
              </div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400">
                <Truck size={18} />
              </div>
              <div className="text-left">
                <div className="text-xs text-slate-400">Packing Aman</div>
                <div className="text-sm font-bold text-slate-100">Tabung Selongsong</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FILTER & SEARCH SECTION */}
      <section className="max-w-7xl mx-auto px-4 lg:px-8 pt-8 pb-4">
        
        {/* Mobile Search input */}
        <div className="mb-4 md:hidden">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text"
              placeholder="Cari poster edukasi..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      {/* PRODUCT LIST GRID */}
      <main className="max-w-7xl mx-auto px-4 lg:px-8 py-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <span>Daftar Poster Pendidikan</span>
            <span className="text-xs bg-indigo-500/20 text-indigo-400 px-2.5 py-0.5 rounded-full font-semibold border border-indigo-500/30">
              {filteredProducts.length} Produk
            </span>
          </h3>
          <span className="text-xs text-slate-400">Harga satuan Rp 8.500 s/d Rp 10.000</span>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center max-w-md mx-auto">
            <Package size={48} className="mx-auto text-slate-600 mb-4" />
            <h4 className="text-lg font-bold text-white mb-2">Poster Tidak Ditemukan</h4>
            <p className="text-sm text-slate-400 mb-6">Coba gunakan kata kunci pencarian lain atau pilih kategori Semua.</p>
            <button
              onClick={() => { setSelectedCategory('Semua'); setSearchQuery(''); }}
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-500"
            >
              Reset Filter
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map(product => {
              const inCartItem = cart.find(i => i.product.id === product.id);
              const inCartQty = inCartItem ? inCartItem.quantity : 0;

              return (
                <div 
                  key={product.id}
                  className="bg-slate-900 border border-slate-800 hover:border-indigo-500/50 rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl hover:shadow-indigo-500/10 transition-all flex flex-col group"
                >
                  {/* Poster Visual Banner / Mockup */}
                  <div className={`relative h-56 bg-gradient-to-br ${product.gradient} p-6 flex flex-col justify-between overflow-hidden`}>
                    <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px]"></div>
                    
                    {/* Pattern Overlay */}
                    <div className="absolute -right-8 -bottom-8 opacity-15 text-8xl font-black select-none pointer-events-none text-white">
                      {product.category[0]}
                    </div>

                    <div className="relative z-10 flex items-start justify-between">
                      <span className="bg-black/40 backdrop-blur-md border border-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full">
                        {product.category}
                      </span>
                      {product.badge && (
                        <span className="bg-amber-500 text-slate-950 text-xs font-extrabold px-2.5 py-0.5 rounded-full shadow-md">
                          {product.badge}
                        </span>
                      )}
                    </div>

                    {/* Central Icon / Title illustration */}
                    <div className="relative z-10 text-center my-auto">
                      <div className="text-3xl sm:text-4xl font-extrabold text-white/95 tracking-wide drop-shadow-md font-mono">
                        {product.iconSymbol}
                      </div>
                      <div className="text-xs text-white/80 font-medium mt-1">
                        Format Cetak {product.size}
                      </div>
                    </div>

                    <div className="relative z-10 flex items-center justify-between text-xs text-white/90">
                      <span className="font-medium bg-black/30 px-2 py-0.5 rounded backdrop-blur-sm">
                        ⭐ {product.rating} ({product.soldCount} terjual)
                      </span>
                      <button 
                        onClick={() => setSelectedProduct(product)}
                        className="bg-white/20 hover:bg-white/30 text-white px-2.5 py-1 rounded-lg backdrop-blur-md flex items-center gap-1 font-medium transition-colors"
                      >
                        <Eye size={13} /> Detail
                      </button>
                    </div>
                  </div>

                  {/* Product Details */}
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors line-clamp-2 mb-2">
                        {product.name}
                      </h4>
                      <p className="text-xs text-slate-400 line-clamp-2 mb-4 leading-relaxed">
                        {product.description}
                      </p>
                    </div>

                    <div>
                      {/* Price section */}
                      <div className="flex items-baseline gap-2 mb-4">
                        <span className="text-2xl font-extrabold text-emerald-400">
                          {formatRupiah(product.price)}
                        </span>
                        <span className="text-xs text-slate-500 line-through">
                          {formatRupiah(product.originalPrice)}
                        </span>
                        <span className="text-xs font-semibold text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded">
                          Hemat {formatRupiah(product.originalPrice - product.price)}
                        </span>
                      </div>

                      {/* Action buttons */}
                      {inCartQty > 0 ? (
                        <div className="flex items-center justify-between bg-slate-800/90 border border-indigo-500/40 rounded-xl p-1.5">
                          <button
                            onClick={() => updateQuantity(product.id, -1)}
                            className="w-9 h-9 rounded-lg bg-slate-700 hover:bg-rose-600 text-white flex items-center justify-center transition-colors"
                            title="Kurangi kuantitas"
                          >
                            <Minus size={16} />
                          </button>
                          <span className="text-sm font-bold text-white">
                            {inCartQty} di Keranjang
                          </span>
                          <button
                            onClick={() => updateQuantity(product.id, 1)}
                            className="w-9 h-9 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center transition-colors"
                            title="Tambah kuantitas"
                          >
                            <Plus size={16} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => addToCart(product, 1)}
                          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-semibold rounded-xl transition-all shadow-md shadow-indigo-600/20 text-sm"
                        >
                          <ShoppingCart size={16} />
                          Tambah ke Keranjang
                        </button>
                      )}
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* FLOATING CART SUMMARY BAR (If Cart has items) */}
      {totalItems > 0 && !isCartOpen && (
        <div className="fixed bottom-4 left-4 right-4 max-w-2xl mx-auto z-40 bg-slate-900/95 border border-indigo-500/40 backdrop-blur-xl p-3 sm:p-4 rounded-2xl shadow-2xl flex items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
              <ShoppingCart size={20} />
            </div>
            <div>
              <div className="text-xs text-slate-400">Total {totalItems} Poster di Keranjang</div>
              <div className="text-lg font-black text-emerald-400">{formatRupiah(totalPrice)}</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCartOpen(true)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition-colors"
            >
              Lihat Keranjang
            </button>
            <button
              onClick={() => {
                setIsCartOpen(false);
                setIsCheckoutOpen(true);
              }}
              className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-600/30 flex items-center gap-1 transition-all"
            >
              Checkout <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* CART DRAWER / MODAL */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm animate-fade-in">
          <div 
            className="w-full max-w-md bg-slate-900 border-l border-slate-800 h-full flex flex-col shadow-2xl transform transition-transform animate-slide-left"
          >
            {/* Header Drawer */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
              <div className="flex items-center gap-2.5">
                <ShoppingCart className="text-indigo-400" size={22} />
                <div>
                  <h3 className="font-bold text-white text-base">Keranjang Belanja</h3>
                  <p className="text-xs text-slate-400">Toko Jualan Poster ({totalItems} item)</p>
                </div>
              </div>
              <button 
                onClick={() => setIsCartOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6">
                  <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center text-slate-500 mb-4">
                    <ShoppingCart size={32} />
                  </div>
                  <h4 className="text-base font-bold text-white mb-1">Keranjang Masih Kosong</h4>
                  <p className="text-xs text-slate-400 max-w-xs mb-6">
                    Pilih poster pendidikan kesukaan Anda dan klik tombol Tambah ke Keranjang.
                  </p>
                  <button
                    onClick={() => setIsCartOpen(false)}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl"
                  >
                    Mulai Belanja
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                    <span>Daftar Barang ({cart.length} jenis poster)</span>
                    <button 
                      onClick={clearCart}
                      className="text-rose-400 hover:text-rose-300 flex items-center gap-1 font-medium"
                    >
                      <Trash2 size={13} /> Kosongkan
                    </button>
                  </div>

                  {cart.map(item => (
                    <div 
                      key={item.product.id}
                      className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3.5 flex gap-3 items-center"
                    >
                      {/* Mini Thumbnail */}
                      <div className={`w-14 h-14 rounded-lg bg-gradient-to-br ${item.product.gradient} flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-md`}>
                        {item.product.category.slice(0, 3)}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h5 className="text-xs font-bold text-white truncate">{item.product.name}</h5>
                        <div className="text-xs text-emerald-400 font-semibold mt-0.5">
                          {formatRupiah(item.product.price)} / pcs
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Subtotal: <span className="text-slate-200 font-medium">{formatRupiah(item.product.price * item.quantity)}</span>
                        </div>
                      </div>

                      {/* Qty Counter */}
                      <div className="flex items-center gap-1.5 bg-slate-900 rounded-lg p-1 border border-slate-700">
                        <button
                          onClick={() => updateQuantity(item.product.id, -1)}
                          className="w-6 h-6 rounded bg-slate-800 hover:bg-rose-600 text-white flex items-center justify-center text-xs"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="text-xs font-bold px-1 text-white min-w-[20px] text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.product.id, 1)}
                          className="w-6 h-6 rounded bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center text-xs"
                        >
                          <Plus size={12} />
                        </button>
                      </div>

                      {/* Remove */}
                      <button
                        onClick={() => removeFromCart(item.product.id)}
                        className="text-slate-500 hover:text-rose-400 p-1 rounded"
                        title="Hapus"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </>
              )}
            </div>

            {/* Footer Summary & Checkout Button */}
            {cart.length > 0 && (
              <div className="p-5 border-t border-slate-800 bg-slate-950/60 space-y-3">
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Total Kuantitas</span>
                    <span className="font-semibold text-white">{totalItems} buah poster</span>
                  </div>
                  {totalSavings > 0 && (
                    <div className="flex justify-between text-emerald-400">
                      <span>Total Hemat Promo</span>
                      <span className="font-semibold">-{formatRupiah(totalSavings)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-bold text-white pt-2 border-t border-slate-800">
                    <span>Total Pembayaran</span>
                    <span className="text-emerald-400 text-lg">{formatRupiah(totalPrice)}</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setIsCartOpen(false);
                    setIsCheckoutOpen(true);
                  }}
                  className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 text-sm transition-all"
                >
                  Lanjut ke Pembayaran <ChevronRight size={18} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PRODUCT DETAIL MODAL */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl">
            
            {/* Banner */}
            <div className={`relative h-44 bg-gradient-to-br ${selectedProduct.gradient} p-6 flex flex-col justify-between`}>
              <div className="flex justify-between items-start">
                <span className="bg-black/40 text-white text-xs font-semibold px-3 py-1 rounded-full backdrop-blur-md">
                  {selectedProduct.category}
                </span>
                <button 
                  onClick={() => setSelectedProduct(null)}
                  className="p-1.5 bg-black/40 text-white hover:bg-black/60 rounded-full backdrop-blur-md"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="text-center font-mono text-3xl font-extrabold text-white drop-shadow">
                {selectedProduct.iconSymbol}
              </div>
              <div className="text-xs text-white/90">
                Spesifikasi Ukuran: <strong>{selectedProduct.size}</strong>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              <div>
                <h3 className="text-lg font-bold text-white mb-1">{selectedProduct.name}</h3>
                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <span className="text-amber-400 font-semibold">⭐ {selectedProduct.rating}</span>
                  <span>•</span>
                  <span>{selectedProduct.soldCount} terjual</span>
                  <span>•</span>
                  <span className="text-slate-300 font-medium">{selectedProduct.material}</span>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed bg-slate-800/50 p-3.5 rounded-xl border border-slate-800">
                {selectedProduct.description}
              </p>

              <div>
                <h5 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2">Fitur & Keunggulan:</h5>
                <ul className="space-y-1.5 text-xs text-slate-300">
                  {selectedProduct.features.map((feat, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <Check size={14} className="text-emerald-400 shrink-0" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-400">Harga Satuan:</div>
                  <div className="text-xl font-extrabold text-emerald-400">{formatRupiah(selectedProduct.price)}</div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      addToCart(selectedProduct, 1);
                      setSelectedProduct(null);
                    }}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-indigo-600/30"
                  >
                    <ShoppingCart size={15} /> + Keranjang
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* CHECKOUT MODAL FORM */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl my-auto">
            
            {/* Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
              <div className="flex items-center gap-2.5">
                <FileText className="text-emerald-400" size={22} />
                <div>
                  <h3 className="font-bold text-white text-base">Checkout Pesanan Poster</h3>
                  <p className="text-xs text-slate-400">Lengkapi data pengiriman untuk memproses order</p>
                </div>
              </div>
              <button 
                onClick={() => setIsCheckoutOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCheckoutSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
              
              {/* Ringkasan Barang yang Dipesan */}
              <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3.5 space-y-2">
                <div className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex justify-between">
                  <span>Ringkasan Produk ({totalItems} pcs)</span>
                  <span className="text-emerald-400 font-bold">{formatRupiah(totalPrice)}</span>
                </div>
                <div className="max-h-28 overflow-y-auto space-y-1 pr-1 text-xs text-slate-300">
                  {cart.map(item => (
                    <div key={item.product.id} className="flex justify-between py-0.5 border-b border-slate-800/60">
                      <span className="truncate pr-2">• {item.product.name} (x{item.quantity})</span>
                      <span className="shrink-0 font-medium">{formatRupiah(item.product.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Data Pembeli */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <User size={14} className="text-indigo-400" /> Nama Lengkap Pembeli *
                </label>
                <input 
                  type="text"
                  required
                  placeholder="Contoh: Budi Santoso"
                  value={buyerName}
                  onChange={e => setBuyerName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Phone size={14} className="text-indigo-400" /> Nomor WhatsApp Aktif *
                </label>
                <input 
                  type="tel"
                  required
                  placeholder="Contoh: 081234567890"
                  value={buyerPhone}
                  onChange={e => setBuyerPhone(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <MapPin size={14} className="text-indigo-400" /> Alamat Lengkap Pengiriman *
                </label>
                <textarea 
                  required
                  rows={2}
                  placeholder="Nama jalan, nomor rumah, RT/RW, kelurahan, kecamatan, kota/kabupaten, kode pos"
                  value={buyerAddress}
                  onChange={e => setBuyerAddress(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                ></textarea>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Info size={14} className="text-slate-400" /> Catatan Tambahan (Opsional)
                </label>
                <input 
                  type="text"
                  placeholder="Contoh: Harap bungkus dengan ekstra bubble wrap"
                  value={buyerNotes}
                  onChange={e => setBuyerNotes(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Opsi Pembayaran */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Metode Pembayaran
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <label className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition-colors ${
                    paymentMethod === 'qris' ? 'bg-indigo-600/20 border-indigo-500 text-white font-bold' : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}>
                    <input 
                      type="radio"
                      name="payment"
                      value="qris"
                      checked={paymentMethod === 'qris'}
                      onChange={() => setPaymentMethod('qris')}
                      className="hidden"
                    />
                    <span>⚡ QRIS / Gateway Otomatis</span>
                  </label>

                  <label className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition-colors ${
                    paymentMethod === 'transfer' ? 'bg-indigo-600/20 border-indigo-500 text-white font-bold' : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}>
                    <input 
                      type="radio"
                      name="payment"
                      value="transfer"
                      checked={paymentMethod === 'transfer'}
                      onChange={() => setPaymentMethod('transfer')}
                      className="hidden"
                    />
                    <span>💬 Manual via WhatsApp</span>
                  </label>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-3 border-t border-slate-800">
                <button
                  type="submit"
                  className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 text-sm transition-all"
                >
                  <Send size={16} />
                  {paymentMethod === 'qris' ? 'Lanjut ke Pembayaran QRIS' : 'Kirim Pesanan via WhatsApp'} ({formatRupiah(totalPrice)})
                </button>
                <p className="text-[11px] text-slate-400 text-center mt-2">
                  {paymentMethod === 'qris' 
                    ? 'Anda akan diarahkan ke checkout.html untuk login dan pembayaran instan QRIS.' 
                    : 'Pesanan akan langsung diteruskan ke WhatsApp admin untuk konfirmasi manual.'}
                </p>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* ORDER SUCCESS MODAL */}
      {orderSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 text-center shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-4 border border-emerald-500/30">
              <CheckCircle2 size={36} />
            </div>
            <h3 className="text-xl font-bold text-white mb-1">Pesanan Berhasil Dibuat!</h3>
            <p className="text-xs text-slate-400 mb-4">
              Invoice: <strong className="text-indigo-400 font-mono">{lastInvoice}</strong>
            </p>
            <div className="bg-slate-800/80 rounded-xl p-4 text-xs text-slate-300 mb-6 text-left space-y-1.5 border border-slate-700">
              <div className="flex justify-between">
                <span>Status Order:</span>
                <span className="text-amber-400 font-bold">Menunggu Pembayaran</span>
              </div>
              <div className="flex justify-between">
                <span>WhatsApp Admin:</span>
                <span className="text-emerald-400 font-medium">Terhubung Otomatis</span>
              </div>
              <div className="flex justify-between">
                <span>Pengiriman:</span>
                <span>Tabung Poster Aman</span>
              </div>
            </div>
            <button
              onClick={() => setOrderSuccess(false)}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-sm transition-colors"
            >
              Kembali ke Toko Poster
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
