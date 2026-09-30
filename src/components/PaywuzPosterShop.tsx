import React, { useState } from 'react';

export interface PaywuzPosterItem {
  id: string;
  name: string;
  price: number;
  tag: string;
  image: string;
  description: string;
}

export interface PaywuzCartItem extends PaywuzPosterItem {
  qty: number;
}

const PAYWUZ_EXCLUSIVE_POSTERS: PaywuzPosterItem[] = [
  {
    id: 'pw-1',
    name: 'Paywuz Edition 1 - Neon Cyber Formula',
    price: 7000,
    tag: 'Best Seller',
    image: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=500&auto=format&fit=crop&q=60',
    description: 'Poster visual futuristik bernuansa neon dengan infografis rumus matematika modern.'
  },
  {
    id: 'pw-2',
    name: 'Paywuz Edition 2 - Matrix Data Flow',
    price: 8000,
    tag: 'Popular',
    image: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=500&auto=format&fit=crop&q=60',
    description: 'Konsep matriks dan vektor biner dengan resolusi cetak ultra-tajam.'
  },
  {
    id: 'pw-3',
    name: 'Paywuz Edition 3 - Deep Space Geometry',
    price: 9500,
    tag: 'Hot Deal',
    image: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=500&auto=format&fit=crop&q=60',
    description: 'Eksplorasi dimensi ruang angkasa dan geometri analitik dalam desain artistik.'
  },
  {
    id: 'pw-4',
    name: 'Paywuz Edition 4 - Vintage Gold Typography',
    price: 10500,
    tag: 'Limited',
    image: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=500&auto=format&fit=crop&q=60',
    description: 'Tipografi kutipan matematika klasik dengan aksen warna emas metallic.'
  },
  {
    id: 'pw-5',
    name: 'Paywuz Edition 5 - Premium Dark Minimalist',
    price: 12000,
    tag: 'Exclusive',
    image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=500&auto=format&fit=crop&q=60',
    description: 'Karya seni abstrak monokrom premium untuk dekorasi ruang belajar dan kerja.'
  },
];

export const PaywuzPosterShop: React.FC = () => {
  const [paywuzCart, setPaywuzCart] = useState<PaywuzCartItem[]>([]);
  const [buyerName, setBuyerName] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(num);
  };

  const addToPaywuzCart = (item: PaywuzPosterItem) => {
    setPaywuzCart((prev) => {
      const exists = prev.find((p) => p.id === item.id);
      if (exists) {
        return prev.map((p) => (p.id === item.id ? { ...p, qty: p.qty + 1 } : p));
      }
      return [...prev, { ...item, qty: 1 }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setPaywuzCart((prev) =>
      prev
        .map((p) => {
          if (p.id === id) {
            const nextQty = p.qty + delta;
            return nextQty > 0 ? { ...p, qty: nextQty } : null;
          }
          return p;
        })
        .filter((item): item is PaywuzCartItem => item !== null)
    );
  };

  const removeItem = (id: string) => {
    setPaywuzCart((prev) => prev.filter((p) => p.id !== id));
  };

  const totalPaywuzAmount = paywuzCart.reduce((acc, curr) => acc + curr.price * curr.qty, 0);
  const totalPaywuzItems = paywuzCart.reduce((acc, curr) => acc + curr.qty, 0);

  const handlePaywuzCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    if (paywuzCart.length === 0) {
      alert('Keranjang Paywuz masih kosong!');
      return;
    }
    if (!buyerName || !buyerPhone) {
      alert('Lengkapi nama dan nomor telepon/WhatsApp!');
      return;
    }

    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      window.open('https://paywuz.id', '_blank');
      alert(`Pesanan Paywuz (${formatRupiah(totalPaywuzAmount)}) berhasil dibuat. Mengalihkan ke gerbang https://paywuz.id`);
    }, 600);
  };

  return (
    <section className="my-5 p-4 p-md-5 rounded-4 border text-white shadow-lg" style={{ background: 'linear-gradient(135deg, #0b0f19 0%, #1e1b4b 50%, #0f172a 100%)', borderColor: '#4f46e5' }}>
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 pb-3 border-bottom border-indigo-500 border-opacity-25">
        <div>
          <div className="d-inline-flex align-items-center gap-2 px-3 py-1 rounded-pill mb-2 bg-indigo-950 border border-indigo-400 text-indigo-300 small fw-bold">
            <i className="fa-solid fa-bolt text-warning"></i> Fitur Baru Terpisah: Edisi Khusus Paywuz
          </div>
          <h3 className="fw-bold text-white mb-1">Paywuz Poster Collection (Edisi Khusus)</h3>
          <p className="text-light opacity-75 small mb-0">
            Jualan poster eksklusif terpisah dengan sistem pembayaran instan langsung melalui <a href="https://paywuz.id" target="_blank" rel="noreferrer" className="text-info fw-bold">paywuz.id</a>.
          </p>
        </div>
        <div className="badge bg-success fs-6 px-3 py-2 rounded-pill mt-3 mt-md-0">
          <i className="fa-solid fa-shield-halved me-2"></i>
          {totalPaywuzItems} Item Keranjang Paywuz
        </div>
      </div>

      <div className="row g-4">
        {/* Kolom Poster Edisi Paywuz */}
        <div className="col-lg-8">
          <div className="row g-3">
            {PAYWUZ_EXCLUSIVE_POSTERS.map((poster) => (
              <div key={poster.id} className="col-md-6 col-xl-4">
                <div className="card h-100 bg-dark text-white border-secondary rounded-4 overflow-hidden shadow">
                  <div className="position-relative" style={{ height: '160px' }}>
                    <img
                      src={poster.image}
                      alt={poster.name}
                      className="w-100 h-100 object-fit-cover"
                    />
                    <span className="position-absolute top-0 start-0 m-2 badge bg-primary fw-bold">
                      {poster.tag}
                    </span>
                    <span className="position-absolute bottom-0 end-0 m-2 badge bg-success text-white fw-bold px-2 py-1 rounded-3">
                      {formatRupiah(poster.price)}
                    </span>
                  </div>
                  <div className="card-body d-flex flex-column justify-content-between p-3">
                    <div>
                      <h6 className="fw-bold text-light mb-1">{poster.name}</h6>
                      <p className="text-light opacity-75 small mb-3" style={{ fontSize: '12px' }}>
                        {poster.description}
                      </p>
                    </div>
                    <button
                      onClick={() => addToPaywuzCart(poster)}
                      className="btn btn-outline-info btn-sm w-100 rounded-pill fw-bold"
                    >
                      <i className="fa-solid fa-cart-plus me-1"></i> Beli Edisi Paywuz
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Kolom Keranjang Khusus Paywuz */}
        <div className="col-lg-4">
          <div className="p-4 rounded-4 border bg-dark text-white sticky-top" style={{ top: '20px', borderColor: '#4f46e5' }}>
            <h5 className="fw-bold text-white mb-3 d-flex align-items-center">
              <i className="fa-solid fa-bag-shopping text-warning me-2"></i> Keranjang Paywuz
            </h5>

            {paywuzCart.length === 0 ? (
              <div className="text-center py-4 text-secondary small">
                Keranjang edisi Paywuz masih kosong.
              </div>
            ) : (
              <div>
                <div className="mb-3" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {paywuzCart.map((item) => (
                    <div key={item.id} className="d-flex align-items-center justify-content-between p-2 mb-2 bg-secondary bg-opacity-25 rounded-3 border border-secondary">
                      <div style={{ maxWidth: '140px' }}>
                        <div className="fw-bold small text-truncate text-light">{item.name}</div>
                        <div className="text-success small" style={{ fontSize: '11px' }}>{formatRupiah(item.price)}</div>
                      </div>
                      <div className="d-flex align-items-center gap-1">
                        <button onClick={() => updateQty(item.id, -1)} className="btn btn-sm btn-outline-light py-0 px-2 rounded-2">-</button>
                        <span className="small fw-bold px-1 text-white">{item.qty}</span>
                        <button onClick={() => updateQty(item.id, 1)} className="btn btn-sm btn-outline-light py-0 px-2 rounded-2">+</button>
                        <button onClick={() => removeItem(item.id)} className="btn btn-sm btn-outline-danger py-0 px-1 rounded-2 ms-1">
                          <i className="fa-solid fa-trash" style={{ fontSize: '10px' }}></i>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-top border-secondary pt-3">
                  <div className="d-flex justify-content-between fw-bold mb-3">
                    <span className="text-light">Total Pembayaran:</span>
                    <span className="text-success fs-5">{formatRupiah(totalPaywuzAmount)}</span>
                  </div>

                  <form onSubmit={handlePaywuzCheckout} className="d-flex flex-column gap-2">
                    <input
                      type="text"
                      required
                      placeholder="Nama Lengkap"
                      value={buyerName}
                      onChange={(e) => setBuyerName(e.target.value)}
                      className="form-control form-control-sm bg-dark text-white border-secondary rounded-3"
                    />
                    <input
                      type="tel"
                      required
                      placeholder="No. WhatsApp / HP"
                      value={buyerPhone}
                      onChange={(e) => setBuyerPhone(e.target.value)}
                      className="form-control form-control-sm bg-dark text-white border-secondary rounded-3"
                    />
                    <button
                      type="submit"
                      disabled={isProcessing}
                      className="btn btn-success w-100 rounded-pill fw-bold mt-2 py-2"
                    >
                      <i className="fa-solid fa-bolt me-2"></i>
                      {isProcessing ? 'Menghubungkan...' : 'Bayar Cepat via Paywuz.id'}
                    </button>
                  </form>
                  <small className="text-center d-block text-secondary mt-2" style={{ fontSize: '11px' }}>
                    Gateway pembayaran aman di <a href="https://paywuz.id" target="_blank" rel="noreferrer" className="text-info text-decoration-none">paywuz.id</a>
                  </small>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default PaywuzPosterShop;
