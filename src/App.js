import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('kasir');

  const [menuList, setMenuList] = useState([]);
  const [orders, setOrders] = useState([]);
  const [history, setHistory] = useState([]);
  const [cart, setCart] = useState([]);

  const [customerName, setCustomerName] = useState('');
  const [filterCategory, setFilterCategory] = useState('Semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [receiptOrder, setReceiptOrder] = useState(null);
  const [selectedShift, setSelectedShift] = useState(null);

  const [userRole, setUserRole] = useState("");
  const [username, setUsername] = useState("");
  
  // ===== LOGIN =====
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const [showShiftSummary, setShowShiftSummary] = useState(false);
  const [isClosingShift, setIsClosingShift] = useState(false);

  const [countdown, setCountdown] = useState(5);

  const [loginData, setLoginData] = useState({
    username: '',
    password: ''
  });

  // State untuk Form Menu & Edit
  const [newMenu, setNewMenu] = useState({ name: '', price: '', category: 'Makanan', image: '' });
  const [editingId, setEditingId] = useState(null);

  // --- STATE BARU UNTUK LAPORAN ---
  const [reportDate, setReportDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [isPrintingReport, setIsPrintingReport] = useState(false); 

  const totalTransaction = orders.length;

  const totalRevenue = (orders || []).reduce(
    (sum, order) => sum + Number(order?.total || 0),
    0
  );

  const totalItems = (orders || []).reduce(
    (sum, order) =>
      sum +
      (order?.items || []).reduce(
        (itemTotal, item) => itemTotal + Number(item?.qty || 0),
        0
      ),
    0
  );

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    const storedUsername = localStorage.getItem("username");

    if (token) {
      setUserRole(role);
      setUsername(storedUsername);
      setIsLoggedIn(true);
    }

    fetch("http://localhost:5000/api/menu")
      .then(res => res.json())
      .then(data => setMenuList(data))
      .catch(err => console.error("Gagal load menu:", err));

    fetch("http://localhost:5000/api/orders")
      .then(res => res.json())
      .then(data => {
        setOrders(data);
      })
      .catch(err => console.error("Gagal load orders:", err));

  }, []);

  useEffect(() => {
    if (userRole === "admin") {
      fetchHistory();
    }
  }, [userRole]);

  useEffect(() => {
    if (userRole === "kasir" && activeTab !== "kasir" && activeTab !== "antrian") {
        setActiveTab("kasir");
    }
    if (userRole === "admin" && activeTab === "kasir") {
        setActiveTab("laporan");
    }
  }, [userRole, activeTab]);

  useEffect(() => {
    if (!showShiftSummary || !isClosingShift) return;

    if (countdown === 0) {
      handleLogout("Shift berhasil ditutup.");
      return;
    }

    const timer = setTimeout(() => {
      setCountdown(prev => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [showShiftSummary, isClosingShift, countdown]);

  const confirmCloseShift = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/close-shift", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`
          }
      });

      if (!response.ok) {
        const result = await response.json();
        alert(result.message);
        return;
      }

      await fetchHistory();
      setOrders([]);
      setCart([]);
      setReceiptOrder(null);
      setCustomerName("");
      setIsClosingShift(true);
    } catch (err) {
      alert("Gagal menutup shift. Periksa koneksi server.");
    }
  }

  const fetchHistory = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/history", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`
          }
      });
      if (!response.ok) return;
      const result = await response.json();
      setHistory(result);
    } catch (err) {
      console.error("Gagal load history:", err);
    }
  }

  // ===== LOGIN =====
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch("http://localhost:5000/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginData)
      });

      const result = await response.json();

      if (response.ok) {
        localStorage.setItem("token", result.token);
        localStorage.setItem("role", result.role);
        localStorage.setItem("username", result.username);

        setUserRole(result.role);
        setUsername(result.username);

        if (result.role === "admin") setActiveTab("laporan");
        else setActiveTab("kasir");

        setIsLoggedIn(true);
        alert("Login berhasil!");
      } else {
        alert(result.message);
      }
    } catch (err) {
      alert("Server Error");
    }
  };

  const handleCloseShift = () => {
    setShowShiftSummary(true);
    setCountdown(5);
  }

  const handleLogout = (message = "Logout berhasil") => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("username");

    setIsLoggedIn(false);
    setUserRole("");
    setUsername("");
    setActiveTab("kasir");

    setShowShiftSummary(false);
    setIsClosingShift(false);
    setCountdown(5);

    alert(message);
  };

  // --- FUNGSI KELOLA MENU ---
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("image", file);

    try {
        const response = await fetch("http://localhost:5000/api/upload", {
            method: "POST",
            body: formData
        });

        const result = await response.json();
        if (!response.ok) {
            alert(result.message);
            return;
        }

        setNewMenu(prev => ({ ...prev, image: result.image }));
    } catch (err) {
        console.error(err);
        alert("Upload gambar gagal");
    }
  };

  const handleSubmitMenu = async (e) => {
    e.preventDefault();
    if (!newMenu.name || !newMenu.price) return alert('Nama dan Harga wajib diisi!');

    try {
      if (editingId) {
        const response = await fetch(`http://localhost:5000/api/menu/${editingId}`, {
          method: 'PUT',
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`
          },
          body: JSON.stringify(newMenu)
        });

        if (response.status === 401 || response.status === 403) {
          handleLogout("Sesi login telah berakhir. Silakan login kembali.");
          return;
        }

        const result = await response.json();
        setMenuList(menuList.map(item => item.id === editingId ? result.menu : item));
        alert("Menu berhasil diperbarui!");
      } else {
        const response = await fetch("http://localhost:5000/api/menu", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`
          },
          body: JSON.stringify(newMenu)
        });

        if (response.status === 401 || response.status === 403) {
          handleLogout("Sesi login telah berakhir. Silakan login kembali.");
          return;
        }

        const result = await response.json();
        setMenuList([...menuList, result.menu]);
        alert('Menu baru berhasil ditambahkan!');
      }
      setNewMenu({ name: '', price: '', category: 'Makanan', image: '' });
      setEditingId(null);
    } catch(err) {
      alert("Gagal menyimpan menu.");
    }
  };

  const handleEditClick = (item) => {
    setNewMenu(item);
    setEditingId(item.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteMenu = async (id, name) => {
    if (window.confirm(`Yakin ingin menghapus menu "${name}"?`)) {
      const response = await fetch(`http://localhost:5000/api/menu/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });

      if (response.status === 401 || response.status === 403) {
        handleLogout("Sesi login telah berakhir. Silakan login kembali.");
        return;
      }
      setMenuList(menuList.filter(menu => menu.id !== id));
    }
  };

  // --- FUNGSI KASIR ---
  const handleCheckout = async (e) => {
    e.preventDefault();
    if (cart.length === 0 || !customerName) {
        alert("Keranjang kosong / Nama belum diisi!");
        return;
    }

    try {
        const response = await fetch("http://localhost:5000/api/orders", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                customer: customerName,
                items: cart,
                total: totalHarga
            })
        });

        const result = await response.json();

        const resOrders = await fetch("http://localhost:5000/api/orders");
        const dataOrders = await resOrders.json();
        setOrders(dataOrders);

        setReceiptOrder({
            ...result,
            items: result.items && result.items.length > 0 ? result.items : cart,
            total: result.total !== undefined ? result.total : totalHarga,
            date: result.date || result.created_at || new Date().toLocaleString("id-ID")
        });

        setCart([]);
        setCustomerName("");
    } catch(err) {
        console.error(err);
        alert("Gagal memproses checkout.");
    }
  };

  const updateStatus = async (orderId, newStatus) => {
    try {
      const response = await fetch(`http://localhost:5000/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.status === 401 || response.status === 403) {
        handleLogout("Sesi login telah berakhir. Silakan login kembali.");
        return;
      }

      const result = await response.json();
      setOrders(orders.map(order => order.id === orderId ? { ...order, status: result.order.status } : order));
    } catch (err) {
      alert("Gagal update status.");
    }
  };

  const addToCart = (item) => {
    const existing = cart.find(c => c.id === item.id);
    if (existing) setCart(cart.map(c => c.id === item.id ? { ...c, qty: c.qty + 1 } : c));
    else setCart([...cart, { ...item, qty: 1 }]);
  };

  const filteredMenu = menuList.filter(item => {
    return (filterCategory === 'Semua' || item.category === filterCategory) &&
      item.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const totalHarga = cart.reduce((total, item) => total + (item.price * item.qty), 0);
  
  // --- LOGIKA FILTER LAPORAN ---
  const filteredReportOrders = orders.filter(o => {
    if (o.status !== 'Selesai') return false;
    if (!reportDate) return true; 

    const dateObj = new Date(o.date || o.created_at);
    if (isNaN(dateObj.getTime())) return false;
    
    const orderDateLocal = dateObj.toLocaleDateString('en-CA'); 
    return orderDateLocal === reportDate;
  });

  const reportTotal = filteredReportOrders.reduce(
    (sum, item) => sum + Number(item.total),
    0
  );

  if (!isLoggedIn) {
    return (
      <div className="login-page">
        <div className="login-box">
          <h1>🍽️ Sudi Mampir</h1>
          <h3>Sistem Kasir Digital<br />UMKM Lik Kasno</h3>
          <form onSubmit={handleLogin}>
            <input type="text" placeholder="Username" value={loginData.username} onChange={(e) => setLoginData({ ...loginData, username: e.target.value })} />
            <input type="password" placeholder="Password" value={loginData.password} onChange={(e) => setLoginData({ ...loginData, password: e.target.value })} />
            <button type="submit">Login</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* ===== Modal Tutup Kasir ===== */}
      {showShiftSummary && (
        <div className="shift-modal">
          <div className="shift-card">
            <div className="shift-header">
              <h2>🔒 TUTUP KASIR</h2>
              <p>Ringkasan Shift Hari Ini</p>
            </div>
            <hr />
            <div className="shift-info">
              <div className="info-row"><span>Tanggal</span><strong>{new Date().toLocaleDateString("id-ID")}</strong></div>
              <div className="info-row"><span>Jam</span><strong>{new Date().toLocaleTimeString("id-ID")}</strong></div>
              <div className="info-row"><span>Kasir</span><strong>{username}</strong></div>
              <div className="info-row"><span>Role</span><strong>{userRole.toUpperCase()}</strong></div>
            </div>
            <hr />
            <div className="summary-box">
              <div className="summary-item"><h3>{totalTransaction}</h3><p>Total Transaksi</p></div>
              <div className="summary-item"><h3>{totalItems}</h3><p>Item Terjual</p></div>
            </div>
            <div className="revenue-box">
              <h4>Total Pendapatan</h4>
              <h2>Rp {Number(totalRevenue || 0).toLocaleString("id-ID")}</h2>
            </div>
            <hr />
            <p className="thanks-text">Terima kasih telah menyelesaikan shift hari ini.<br />Seluruh transaksi berhasil direkap.</p>
            {!isClosingShift ?
              <div className="shift-actions">
                <button className="btn-cancel-shift" onClick={() => { setShowShiftSummary(false); setIsClosingShift(false); setCountdown(5); }}>❌ Batal</button>
                <button className="btn-confirm-shift" onClick={confirmCloseShift}>✅ Tutup Shift</button>
              </div> :
              <div className="countdown">Logout otomatis dalam <span>{countdown}</span> detik</div>
            }
          </div>
        </div>
      )}

      {selectedShift && (
        <div className="shift-modal">
          <div className="shift-card">
            <h2>📑 {selectedShift.shiftCode || `Shift #${selectedShift.id}`}</h2>
            <hr />
            <p>Kasir : <strong>{selectedShift.cashier || '-'}</strong></p>
            <p>Tanggal : <strong>{selectedShift.date || selectedShift.created_at ? new Date(selectedShift.date || selectedShift.created_at).toLocaleString('id-ID') : '-'}</strong></p>
            <hr />
            <h3>Daftar Transaksi</h3>

            {(selectedShift.orders || []).map(order => (
              <div key={order.id} style={{ padding: "12px", marginBottom: "10px", background: "#f8fafc", borderRadius: "8px" }}>
                <strong>Order #{order.id}</strong>
                <p>Pelanggan : {order.customer}</p>
                <p>Status : {order.status}</p>
                <p>Rp {Number(order.total).toLocaleString("id-ID")}</p>
              </div>
            ))}
            <hr />
            <button className="btn-cancel-shift" onClick={() => setSelectedShift(null)}>Tutup</button>
          </div>
        </div>
      )}

      <div className="app-container">
        <header className="main-header no-print">
          <div className="header-content">
            <h1>Sudi Mampir <span>(Lik Kasno)</span></h1>
            <p>Sistem Kasir Digital - UMKM Binaan UMP</p>
          </div>
          <nav className="nav-tabs">
            {userRole === "kasir" && <button className={activeTab === 'kasir' ? 'active' : ''} onClick={() => setActiveTab('kasir')}>🛒 Kasir</button>}
            {userRole === "kasir" && <button className={activeTab === 'antrian' ? 'active' : ''} onClick={() => setActiveTab('antrian')}>⏳ Antrian ({orders.filter(o => o?.status === "Diproses").length})</button>}
            {userRole === "admin" && <button className={activeTab === "laporan" ? "active" : ""} onClick={() => setActiveTab("laporan")}>📊 Laporan</button>}
            {userRole === "admin" && <button className={activeTab === "history" ? "active" : ""} onClick={() => setActiveTab("history")}>📚 Riwayat Shift</button>}
            {userRole === "admin" && <button className={activeTab === "admin" ? "active" : ""} onClick={() => setActiveTab("admin")}>⚙️ Kelola Menu</button>}
            {userRole === "kasir" && <button className="btn-close-shift" onClick={handleCloseShift}>🔒 Tutup Kasir</button>}
            <button className="btn-logout" onClick={() => handleLogout()}>🚪 Logout</button>
          </nav>
        </header>

        <main className="main-content no-print">
          {/* TAB KASIR */}
          {activeTab === 'kasir' && (
            <div className="kasir-grid">
              <div className="menu-section">
                <h2 className="section-title">Menu Digital</h2>
                <div className="filter-bar">
                  <div className="filter-buttons">
                    <button className={filterCategory === 'Semua' ? 'active' : ''} onClick={() => setFilterCategory('Semua')}>Semua</button>
                    <button className={filterCategory === 'Makanan' ? 'active' : ''} onClick={() => setFilterCategory('Makanan')}>Makanan</button>
                    <button className={filterCategory === 'Minuman' ? 'active' : ''} onClick={() => setFilterCategory('Minuman')}>Minuman</button>
                  </div>
                  <input type="text" placeholder="🔍 Cari menu..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="search-input" />
                </div>
                <div className="menu-list">
                  {filteredMenu.map(item => (
                    <div key={item.id} className="menu-card">
                      <img src={`http://localhost:5000${item.image}`} alt={item.name} className="menu-img" />
                      <div className="menu-info">
                        <h3>{item.name}</h3>
                        <p className="price">Rp {Number(item?.price || 0).toLocaleString('id-ID')}</p>
                        <button className="btn-add" onClick={() => addToCart(item)}>+ Tambah</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="cart-section">
                <div className="cart-header-row">
                  <h2 className="section-title">Keranjang</h2>
                  {cart.length > 0 && <button className="btn-clear" onClick={() => setCart([])}>Kosongkan</button>}
                </div>
                <div className="cart-card">
                  <form onSubmit={handleCheckout}>
                    <input type="text" placeholder="Nama Pelanggan..." value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="input-customer" required />
                    <div className="cart-items">
                      {cart.map(item => (
                        <div key={item.id} className="cart-item">
                          <span>{item.name} (x{item.qty})</span>
                          <div className="item-right">
                            <span>Rp {Number((item?.price || 0) * (item?.qty || 0)).toLocaleString('id-ID')}</span>
                            <button type="button" className="btn-remove" onClick={() => setCart(cart.filter(c => c.id !== item.id))}>✕</button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="cart-total"><span>Total:</span><h3>Rp {Number(totalHarga || 0).toLocaleString('id-ID')}</h3></div>
                    <button type="submit" className="btn-checkout" disabled={cart.length === 0}>Buat Pesanan</button>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* TAB KELOLA MENU */}
          {activeTab === 'admin' && (
            <div className="admin-section">
              <h2 className="section-title">⚙️ Manajemen Menu</h2>
              <div className="kasir-grid">
                <div className="cart-card">
                  <h3 style={{ color: editingId ? '#ff9800' : '#0277bd' }}>{editingId ? 'Edit Data Menu' : 'Tambah Menu Baru'}</h3>
                  <form onSubmit={handleSubmitMenu} style={{ marginTop: '15px' }}>
                    <input type="text" placeholder="Nama Menu..." className="input-customer" value={newMenu.name} onChange={(e) => setNewMenu({ ...newMenu, name: e.target.value })} required />
                    <input type="number" placeholder="Harga (misal: 15000)" className="input-customer" value={newMenu.price} onChange={(e) => setNewMenu({ ...newMenu, price: e.target.value })} required />
                    <select className="input-customer" value={newMenu.category} onChange={(e) => setNewMenu({ ...newMenu, category: e.target.value })}>
                      <option value="Makanan">Makanan</option>
                      <option value="Minuman">Minuman</option>
                    </select>
                    <div style={{ marginBottom: '15px' }}>
                      <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Pilih Foto Menu:</label>
                      <input type="file" accept="image/*" onChange={handleImageUpload} className="input-customer" style={{ padding: '10px' }} />
                    </div>
                    {newMenu.image && <img src={`http://localhost:5000${newMenu.image}`} alt="preview" style={{ width:100, height:100, objectFit:"cover", borderRadius:8 }} />}
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button type="submit" className="btn-checkout" style={{ flex: 1, background: editingId ? '#ff9800' : '#4caf50' }}>{editingId ? 'Update Menu' : 'Simpan Menu'}</button>
                      {editingId && <button type="button" className="btn-close" style={{ flex: 1 }} onClick={() => { setNewMenu({ name: '', price: '', category: 'Makanan', image: '' }); setEditingId(null); }}>Batal</button>}
                    </div>
                  </form>
                </div>

                <div className="menu-list" style={{ gridTemplateColumns: '1fr' }}>
                  {menuList.map(item => (
                    <div key={item.id} className="cart-item" style={{ background: 'white', padding: '15px', borderRadius: '8px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <img src={`http://localhost:5000${item.image}`} alt="thumb" style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '8px' }}/>
                        <div>
                          <strong>{item.name}</strong>
                          <p style={{ margin: 0, color: '#ff9800', fontWeight: 'bold' }}>Rp {Number(item?.price || 0).toLocaleString('id-ID')}</p>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <button style={{ background: '#e3f2fd', color: '#0277bd', border: 'none', padding: '8px 15px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }} onClick={() => handleEditClick(item)}>Edit</button>
                        <button className="btn-remove" style={{ width: 'auto', padding: '8px 15px', borderRadius: '4px' }} onClick={() => handleDeleteMenu(item.id, item.name)}>Hapus</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB ANTRIAN */}
          {activeTab === 'antrian' && (
            <div className="antrian-section">
              <h2 className="section-title">Status Antrian</h2>
              <div className="orders-list">
                {orders.map(order => (
                  <div key={order.id} className={`order-card ${order.status?.toLowerCase() || ''}`}>
                    <div className="order-header"><h3>#{order.id} - {order.customer}</h3><span className="status-badge">{order.status}</span></div>
                    <div className="order-items">
                      {(order.items || []).map((item, idx) => (
                        <p key={idx}>{item.name} x{item.qty}</p>
                      ))}
                    </div>
                    <div className="order-footer"><strong>Rp {Number(order?.total || 0).toLocaleString('id-ID')}</strong>
                      <div className="action-buttons">
                        <button className="btn-print-small" onClick={() => setReceiptOrder(order)}>🖨️ Struk</button>
                        {order.status === 'Diproses' && <button className="btn-selesai" onClick={() => updateStatus(order.id, 'Selesai')}>✓ Selesai</button>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB LAPORAN */}
          {activeTab === 'laporan' && (
            <div className="laporan-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
                <h2 className="section-title" style={{ margin: 0 }}>Ringkasan Penjualan</h2>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <label style={{ fontWeight: 'bold', color: '#4a5568' }}>Filter Tanggal:</label>
                  <input type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} className="search-input" style={{ width: 'auto' }} />
                  <button className="btn-add" style={{ padding: '10px 20px' }} onClick={() => setIsPrintingReport(true)}>🖨️ Cetak Laporan</button>
                </div>
              </div>

              <div className="report-summary">
                <div className="report-card"><p>Total Pendapatan</p><h3>Rp {Number(reportTotal || 0).toLocaleString('id-ID')}</h3></div>
                <div className="report-card"><p>Pesanan Selesai</p><h3>{filteredReportOrders.length} Transaksi</h3></div>
              </div>

              <h3 className="section-subtitle" style={{ marginTop: '30px', marginBottom: '15px' }}>Rincian Transaksi Selesai</h3>
              <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #edf2f7', textAlign: 'left' }}>
                      <th style={{ padding: '12px' }}>No Antrian</th>
                      <th style={{ padding: '12px' }}>Pelanggan</th>
                      <th style={{ padding: '12px' }}>Waktu Selesai</th>
                      <th style={{ padding: '12px', textAlign: 'right' }}>Total Belanja</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReportOrders.length === 0 ? (
                      <tr><td colSpan="4" style={{ textAlign: 'center', padding: '20px', color: '#a0aec0' }}>Tidak ada transaksi pada tanggal ini.</td></tr>
                    ) : (
                      filteredReportOrders.map(o => {
                        const waktu = o.created_at ? new Date(o.created_at).toLocaleString("id-ID", {
                          timeZone: "Asia/Jakarta",
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit"
                        }) : "-";

                        return (
                          <tr key={o.id} style={{ borderBottom: '1px solid #edf2f7' }}>
                            <td style={{ padding: '12px', fontWeight: 'bold', color: '#718096' }}>#{o.id}</td>
                            <td style={{ padding: '12px', fontWeight: '600' }}>{o.customer}</td>
                            <td style={{ padding: '12px' }}>{waktu}</td>
                            <td style={{ padding: '12px', textAlign: 'right', color: '#38a169', fontWeight: 'bold' }}>Rp {Number(o?.total || 0).toLocaleString('id-ID')}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB RIWAYAT */}
          {activeTab === "history" && (
            <div className="history-page">
              <h2>🗂 Riwayat Shift</h2>
              {history.length === 0 ? <p>Belum ada riwayat shift.</p> :
                history.map((shift) => {
                  const totalTx = shift.totalTransaction || shift.total_transactions || (shift.orders ? shift.orders.length : 0);
                  const totalRev = shift.totalRevenue || shift.total_revenue || (shift.orders ? shift.orders.reduce((sum, o) => sum + Number(o.total || 0), 0) : 0);
                  const shiftDate = shift.date || shift.created_at ? new Date(shift.date || shift.created_at).toLocaleDateString('id-ID') : '-';

                  return (
                    <div className="history-card" key={shift.id}>
                      <div className="history-header">
                        <h3>{shift.shiftCode || `Shift #${shift.id}`}</h3>
                        <span>{shiftDate}</span>
                      </div>
                      <hr />
                      <p>👤 <strong>Kasir :</strong> {shift.cashier || '-'}</p>
                      <p>🧾 <strong>Total Transaksi :</strong> {totalTx}</p>
                      <p>💰 <strong>Pendapatan :</strong> Rp {Number(totalRev).toLocaleString("id-ID")}</p>
                      <button className="btn-detail" onClick={() => setSelectedShift(shift)}>👁 Lihat Detail</button>
                    </div>
                  );
                })
              }
            </div>
          )}
        </main>

        {/* MODAL CETAK STRUK PELANGGAN */}
        {receiptOrder && (
          <div className="receipt-modal-overlay no-print">
            <div className="receipt-modal-content">
              <div className="receipt-paper" id="printable-area">
                <div className="receipt-header-print">
                  <h2>SUDI MAMPIR</h2>
                  <p>(Lik Kasno)</p>
                  <p>UMKM Binaan UMP</p>
                  <p>========================</p>
                </div>
                
                <div className="receipt-info-print">
                  <p>No Antrian : <strong>#{receiptOrder?.id || '-'}</strong></p>
                  <p>Pelanggan  : {receiptOrder?.customer || '-'}</p>
                  <p>Waktu      : {new Date(receiptOrder?.date || receiptOrder?.created_at || new Date()).toLocaleString("id-ID")}</p>
                </div>
                
                <p>========================</p>
                
                <div className="receipt-items-print">
                  {(receiptOrder?.items || []).map((item, idx) => (
                    <div key={idx} className="receipt-item-row">
                      <span>{item.name} (x{item.qty})</span>
                      <span>Rp {Number((item?.price || 0) * (item?.qty || 0)).toLocaleString('id-ID')}</span>
                    </div>
                  ))}
                </div>
                
                <p>========================</p>
                
                <div className="receipt-total-print">
                  <h3>TOTAL: Rp {Number(receiptOrder?.total || 0).toLocaleString('id-ID')}</h3>
                </div>
                <div className="receipt-footer-print"><p>Matur Nuwun!</p></div>
              </div>
              
              <div className="receipt-actions no-print">
                <button className="btn-print" onClick={() => window.print()}>🖨️ Print Struk</button>
                <button className="btn-close" onClick={() => setReceiptOrder(null)}>Tutup</button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL CETAK LAPORAN */}
        {isPrintingReport && (
          <div className="receipt-modal-overlay no-print">
            <div className="receipt-modal-content" style={{ width: '700px', maxWidth: '95vw' }}>
              <div className="receipt-paper" id="printable-area" style={{ padding: '40px' }}>
                <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                  <h2 style={{ fontSize: '24px', margin: '0 0 10px 0' }}>LAPORAN PENJUALAN HARIAN</h2>
                  <h3 style={{ fontSize: '18px', margin: '0 0 5px 0', color: '#4a5568' }}>UMKM SUDI MAMPIR (LIK KASNO)</h3>
                  <p style={{ margin: 0, fontStyle: 'italic' }}>
                    Tanggal Laporan: {reportDate ? reportDate : 'Semua Waktu'}
                  </p>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #000' }}>
                      <th style={{ padding: '10px', textAlign: 'left' }}>No</th>
                      <th style={{ padding: '10px', textAlign: 'left' }}>Nama Pelanggan</th>
                      <th style={{ padding: '10px', textAlign: 'left' }}>Waktu Transaksi</th>
                      <th style={{ padding: '10px', textAlign: 'right' }}>Nominal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReportOrders.length === 0 ? (
                      <tr><td colSpan="4" style={{ textAlign: 'center', padding: '20px' }}>Tidak ada data</td></tr>
                    ) : (
                      filteredReportOrders.map((o, index) => {
                        const waktu = o.created_at ? new Date(o.created_at).toLocaleString("id-ID", {
                          timeZone: "Asia/Jakarta",
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit"
                        }) : "-";

                        return (
                          <tr key={o.id} style={{ borderBottom: '1px dashed #ccc' }}>
                            <td style={{ padding: "10px" }}>{index + 1}</td>
                            <td style={{ padding: "10px" }}>{o.customer}</td>
                            <td style={{ padding: "10px" }}>{waktu}</td>
                            <td style={{ padding: "10px", textAlign: "right" }}>
                              Rp {Number(o.total).toLocaleString("id-ID")}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px', borderTop: '2px solid #000', paddingTop: '15px' }}>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ margin: '0 0 5px 0', fontSize: '16px' }}>Total Transaksi: <strong>{filteredReportOrders.length} Pesanan</strong></p>
                    <h3 style={{ margin: 0, fontSize: '22px' }}>Total Pendapatan: Rp {Number(reportTotal || 0).toLocaleString('id-ID')}</h3>
                  </div>
                </div>
              </div>
              <div className="receipt-actions no-print">
                <button className="btn-print" onClick={() => window.print()}>🖨️ Print Laporan</button>
                <button className="btn-close" onClick={() => setIsPrintingReport(false)}>Tutup</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default App;