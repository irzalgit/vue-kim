import React, { useState } from 'react';

export interface PosterProduct {
  id: number;
  name: string;
  price: number;
  image: string;
  description: string;
}

export interface CartItem extends PosterProduct {
  qty: number;
}

const PRODUCTS: PosterProduct[] = [
  {
    id: 1,
    name: 'Poster 1 - Rumus Cepat Aljabar & Trik Hitung',
    price: 7000,
    image: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=500&auto=format&fit=crop&q=60',
    description: 'Poster rangkuman rumus cepat aljabar dan metode eliminasi/substitusi instan.'
  },
  {
    id: 2,
    name: 'Poster 2 - Geometri Ruang & Bangun Datar',
    price: 8500,
    image: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=500&auto=format&fit=crop&q=60',
    description: 'Visualisasi geometri dimensi 2 dan 3 lengkap dengan rumus luas & volume.'
  },
  {
    id: 3,
    name: 'Poster 3 - Trigonometri Sudut Istimewa',
    price: 9500,
    image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=500&auto=format&fit=crop&q=60',
    description: 'Tabel sudut istimewa kuadran I-IV dan identitas trigonometri esensial.'
  },
  {
    id: 4,
    name: 'Poster 4 - Statistika, Peluang & Kombinatorika',
    price: 11000,
    image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=500&auto=format&fit=crop&q=60',
    description: 'Panduan lengkap rumus permutasi, kombinasi, mean, median, dan simpangan.'
  },
  {
    id: 5,
    name: 'Poster 5 - Bank Soal HOTS & Asesmen TKA 2025',
    price: 12000,
    image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=60',
    description: 'Poster kisi-kisi dan pola penalaran HOTS asesmen standar nasional.'
  },
];

export const ShopBphy: React.FC = () => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const formatRupiah = (number: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(number);
  };

  const addToCart = (product: PosterProduct) => {
    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.id === product.id);
      if (existing) {
        return prevCart.map((item) =>
          item.id === product.id ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [...prevCart, { ...product, qty: 1 }];
    });
  };

  const updateQty = (id: number, delta: number) => {
    setCart((prevCart) =>
      prevCart
        .map((item) => {
          if (item.id === id) {
            const newQty = item.qty + delta;
            return newQty > 0 ? { ...item, qty: newQty } : null;
          }
          return item;
        })
        .filter((item): item is CartItem => item !== null)
    );
  };

  const removeFromCart = (id: number) => {
    setCart((prevCart) => prevCart.filter((item) => item.id !== id));
  };

  const totalAmount = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);

  const handleCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) {
      alert('Keranjang masih kosong!');
      return;
    }
    if (!customerName || !customerEmail) {
      alert('Silakan lengkapi nama dan email!');
      return;
    }

    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      window.open('https://paywuz.id', '_blank');
      alert(`Pesanan ${formatRupiah(totalAmount)} berhasil dibuat. Menghubungkan ke https://paywuz.id`);
    }, 600);
  };

  return (
    <section className="my-5 p-4 bg-white rounded-4 shadow-sm border">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 pb-3 border-bottom">
        <div>
          <span className="badge bg-primary-subtle text-primary fw-bold px-3 py-1 rounded-pill mb-1">
            Official Poster Catalog
          </span>
          <h3 className="fw-bold text-dark mb-1">Shop Bphy - Poster Edukasi Matematika</h3>
          <p className="text-muted small mb-0">
            Daftar Poster 1 sampai 5 berkualitas tinggi (Rp 7.000 s/d Rp 12.000) dengan pembayaran Paywuz.
          </p>
        </div>
        <div className="badge bg-dark fs-6 px-3 py-2 rounded-pill">
          <i className="fa-solid fa-cart-shopping me-2"></i>
          {totalItems} item di keranjang
        </div>
      </div>

      <div className="row g-4">
        {/* Poster 1 - 5 Cards */}
        <div className="col-lg-8">
          <div className="row g-3">
            {PRODUCTS.map((product) => (
              <div key={product.id} className="col-md-6 col-xl-4">
                <div className="card h-100 border rounded-4 overflow-hidden shadow-sm hover-shadow">
                  <div className="position-relative" style={{ height: '160px' }}>
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-100 h-100 object-fit-cover"
                    />
                    <span className="position-absolute top-0 end-0 m-2 badge bg-dark text-white fw-bold px-2 py-1 rounded-3">
                      {formatRupiah(product.price)}
                    </span>
                  </div>
                  <div className="card-body d-flex flex-column justify-content-between p-3">
                    <div>
                      <h6 className="fw-bold text-dark mb-1">{product.name}</h6>
                      <p className="text-muted small mb-3" style={{ fontSize: '12px' }}>
                        {product.description}
                      </p>
                    </div>
                    <button
                      onClick={() => addToCart(product)}
                      className="btn btn-dark btn-sm w-100 rounded-pill fw-semibold"
                    >
                      <i className="fa-solid fa-plus me-1"></i> Tambah Keranjang
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Keranjang & Checkout */}
        <div className="col-lg-4">
          <div className="p-4 bg-light rounded-4 border sticky-top" style={{ top: '20px' }}>
            <h5 className="fw-bold text-dark mb-3 d-flex align-items-center">
              <i className="fa-solid fa-basket-shopping text-primary me-2"></i> Keranjang Shop Bphy
            </h5>

            {cart.length === 0 ? (
              <div className="text-center py-4 text-muted small">
                Keranjang masih kosong. Pilih poster 1-5 di samping.
              </div>
            ) : (
              <div>
                <div className="mb-3" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {cart.map((item) => (
                    <div key={item.id} className="d-flex align-items-center justify-content-between p-2 mb-2 bg-white rounded-3 border">
                      <div style={{ maxWidth: '140px' }}>
                        <div className="fw-bold small text-truncate">{item.name}</div>
                        <div className="text-muted small" style={{ fontSize: '11px' }}>{formatRupiah(item.price)}</div>
                      </div>
                      <div className="d-flex align-items-center gap-1">
                        <button onClick={() => updateQty(item.id, -1)} className="btn btn-outline-secondary btn-sm py-0 px-2 rounded-2">-</button>
                        <span className="small fw-bold px-1">{item.qty}</span>
                        <button onClick={() => updateQty(item.id, 1)} className="btn btn-outline-secondary btn-sm py-0 px-2 rounded-2">+</button>
                        <button onClick={() => removeFromCart(item.id)} className="btn btn-outline-danger btn-sm py-0 px-1 rounded-2 ms-1">
                          <i className="fa-solid fa-trash" style={{ fontSize: '10px' }}></i>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-top pt-3">
                  <div className="d-flex justify-content-between fw-bold mb-3">
                    <span>Total Pembayaran:</span>
                    <span className="text-primary">{formatRupiah(totalAmount)}</span>
                  </div>

                  <form onSubmit={handleCheckout} className="d-flex flex-column gap-2">
                    <input
                      type="text"
                      required
                      placeholder="Nama Pembeli"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="form-control form-control-sm rounded-3"
                    />
                    <input
                      type="email"
                      required
                      placeholder="Email Pembeli"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      className="form-control form-control-sm rounded-3"
                    />
                    <button
                      type="submit"
                      disabled={isProcessing}
                      className="btn btn-primary w-100 rounded-pill fw-bold mt-2"
                    >
                      <i className="fa-solid fa-credit-card me-2"></i>
                      {isProcessing ? 'Memproses...' : 'Bayar via Paywuz.id'}
                    </button>
                  </form>
                  <small className="text-center d-block text-muted mt-2" style={{ fontSize: '11px' }}>
                    Sistem pembayaran resmi <a href="https://paywuz.id" target="_blank" rel="noreferrer" className="fw-bold text-decoration-none">paywuz.id</a>
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

export default ShopBphy;
