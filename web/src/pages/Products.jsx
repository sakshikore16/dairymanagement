import React, { useState, useEffect } from 'react';
import { api } from '../api';

export default function Products({ productsList, onRefresh, triggerAddOpen, setTriggerAddOpen }) {
  const [activeTab, setActiveTab] = useState('catalog'); // 'catalog' or 'history'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [stockHistory, setStockHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Modals state
  const [showProductModal, setShowProductModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [showCatBrandModal, setShowCatBrandModal] = useState(false);

  // Product Form state
  const [formCategory, setFormCategory] = useState('');
  const [formBrand, setFormBrand] = useState('');
  const [formName, setFormName] = useState('');
  const [formQty, setFormQty] = useState('');
  const [formUnit, setFormUnit] = useState('ml');
  const [formPrice, setFormPrice] = useState('');
  const [formStock, setFormStock] = useState('0');
  const [formAlert, setFormAlert] = useState('10');
  const [formStatus, setFormStatus] = useState('Available');
  const [isEditing, setIsEditing] = useState(null); // product ID

  // Stock Adjustment Form state
  const [selectedProductForStock, setSelectedProductForStock] = useState(null);
  const [stockAdjQty, setStockAdjQty] = useState('');
  const [stockAdjNotes, setStockAdjNotes] = useState('Manual Stock Inward');
  const [stockAdjSupplier, setStockAdjSupplier] = useState('');

  // Categories / Brands helpers for form
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [newCatName, setNewCatName] = useState('');
  const [newBrandName, setNewBrandName] = useState('');
  const [newBrandCat, setNewBrandCat] = useState('');

  useEffect(() => {
    loadCategoriesAndBrands();
  }, [productsList]);

  useEffect(() => {
    if (triggerAddOpen) {
      handleOpenAddProduct();
      setTriggerAddOpen(false);
    }
  }, [triggerAddOpen]);

  useEffect(() => {
    if (activeTab === 'history') {
      loadStockHistory();
    }
  }, [activeTab]);

  const loadCategoriesAndBrands = async () => {
    try {
      const cats = await api.getCategories();
      const brs = await api.getBrands();
      setCategories(cats);
      setBrands(brs);
    } catch (err) {
      console.error(err);
    }
  };

  const loadStockHistory = async () => {
    setLoadingHistory(true);
    try {
      const data = await api.getStockHistory();
      setStockHistory(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Open product modals
  const handleOpenAddProduct = () => {
    setIsEditing(null);
    setFormCategory(categories[0]?._id || '');
    setFormBrand('');
    setFormName('');
    setFormQty('');
    setFormUnit('ml');
    setFormPrice('');
    setFormStock('0');
    setFormAlert('10');
    setFormStatus('Available');
    setShowProductModal(true);
  };

  const handleOpenEditProduct = (prod) => {
    setIsEditing(prod._id);
    setFormCategory(prod.category?._id || '');
    setFormBrand(prod.brand?._id || '');
    setFormName(prod.name);
    setFormQty(prod.quantity);
    setFormUnit(prod.unit);
    setFormPrice(prod.sellingPrice);
    setFormStock(prod.currentStock);
    setFormAlert(prod.minimumStockAlert);
    setFormStatus(prod.status);
    setShowProductModal(true);
  };

  // Add Product Submit
  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!formCategory || !formBrand) {
      alert("Category and Brand are required!");
      return;
    }
    const payload = {
      category: formCategory,
      brand: formBrand,
      name: formName,
      quantity: Number(formQty),
      unit: formUnit,
      sellingPrice: Number(formPrice),
      currentStock: Number(formStock),
      minimumStockAlert: Number(formAlert),
      status: formStatus
    };

    try {
      if (isEditing) {
        await api.updateProduct(isEditing, payload);
      } else {
        await api.createProduct(payload);
      }
      setShowProductModal(false);
      onRefresh();
    } catch (err) {
      alert(err.message);
    }
  };

  // Toggle availability status
  const toggleProductStatus = async (prod, e) => {
    e.stopPropagation();
    const newStatus = prod.status === 'Available' ? 'Unavailable' : 'Available';
    try {
      await api.updateProduct(prod._id, { status: newStatus });
      onRefresh();
    } catch (err) {
      alert(err.message);
    }
  };

  // Delete product
  const handleDeleteProduct = async (id, e) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this product? Transactions in ledger will still remember the name and pricing.")) {
      try {
        await api.deleteProduct(id);
        onRefresh();
      } catch (err) {
        alert(err.message);
      }
    }
  };

  // Open Stock adjustment dialog
  const handleOpenStockAdj = (prod, e) => {
    e.stopPropagation();
    setSelectedProductForStock(prod);
    setStockAdjQty('');
    setStockAdjNotes('Manual Stock Inward');
    setStockAdjSupplier('');
    setShowStockModal(true);
  };

  // Save Stock adjustment
  const handleSaveStockAdj = async (e) => {
    e.preventDefault();
    if (!stockAdjQty) return;
    try {
      await api.adjustStock(selectedProductForStock._id, {
        quantityAdded: Number(stockAdjQty),
        notes: stockAdjNotes,
        supplier: stockAdjSupplier
      });
      setShowStockModal(false);
      onRefresh();
    } catch (err) {
      alert(err.message);
    }
  };

  // Add Category/Brand
  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCatName) return;
    try {
      await api.createCategory(newCatName);
      setNewCatName('');
      loadCategoriesAndBrands();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleAddBrand = async (e) => {
    e.preventDefault();
    if (!newBrandName || !newBrandCat) return;
    try {
      await api.createBrand({ name: newBrandName, category: newBrandCat });
      setNewBrandName('');
      loadCategoriesAndBrands();
    } catch (err) {
      alert(err.message);
    }
  };

  // Filters for brand mapping in form selection
  const filteredBrandsForForm = brands.filter(b => b.category?._id === formCategory);

  // Filter Catalog
  const filteredProducts = productsList.filter(p => {
    const nameStr = `${p.category?.name} ${p.brand?.name} ${p.name}`.toLowerCase();
    const matchesSearch = nameStr.includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === '' || p.category?._id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h1>Product & Stock Registers</h1>
          <p style={{ color: 'var(--text-muted)' }}>Configure pricing, sizes, inventory levels and record new arrivals</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-outline" onClick={() => setShowCatBrandModal(true)} style={{ fontSize: '16px' }}>
            🏷 Configure Category & Brands
          </button>
          <button className="btn btn-primary" onClick={handleOpenAddProduct} style={{ fontSize: '18px' }}>
            📦 + Add Product Variant
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '3px solid var(--border-color)', marginBottom: '20px' }}>
        <button 
          onClick={() => setActiveTab('catalog')} 
          style={{
            flex: 1,
            padding: '15px',
            fontSize: '18px',
            fontWeight: 'bold',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            borderBottom: activeTab === 'catalog' ? '4px solid var(--primary)' : 'none',
            color: activeTab === 'catalog' ? 'var(--primary)' : 'var(--text-muted)'
          }}
        >
          📂 Catalog List
        </button>
        <button 
          onClick={() => setActiveTab('history')} 
          style={{
            flex: 1,
            padding: '15px',
            fontSize: '18px',
            fontWeight: 'bold',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            borderBottom: activeTab === 'history' ? '4px solid var(--primary)' : 'none',
            color: activeTab === 'history' ? 'var(--primary)' : 'var(--text-muted)'
          }}
        >
          🕒 Stock History Logs
        </button>
      </div>

      {activeTab === 'catalog' ? (
        // CATALOG VIEW
        <div>
          {/* Filters */}
          <div className="register-card" style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '250px' }}>
              <input 
                type="text" 
                className="form-control" 
                placeholder="🔍 Search products, brands..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <div style={{ width: '200px' }}>
              <select 
                className="form-control" 
                value={selectedCategory} 
                onChange={e => setSelectedCategory(e.target.value)}
              >
                <option value="">All Categories</option>
                {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          {/* Products Grid */}
          <div className="grid-3" style={{ marginTop: '20px', gap: '20px' }}>
            {filteredProducts.map(prod => {
              const isLowStock = prod.currentStock <= prod.minimumStockAlert;
              return (
                <div 
                  key={prod._id} 
                  className="register-card"
                  style={{
                    borderColor: prod.status === 'Available' ? (isLowStock ? 'var(--danger)' : 'var(--border-color)') : 'var(--text-muted)',
                    opacity: prod.status === 'Available' ? 1 : 0.6,
                    borderWidth: '2px',
                    backgroundColor: isLowStock && prod.status === 'Available' ? 'var(--danger-light)' : 'var(--bg-card)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    minHeight: '220px'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <span className="badge" style={{ backgroundColor: '#e2e8f0', color: '#1e293b', fontSize: '12px' }}>
                        {prod.category?.name || 'Category'}
                      </span>
                      <span className={`badge ${prod.status === 'Available' ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '12px' }}>
                        {prod.status}
                      </span>
                    </div>

                    <h3 style={{ fontSize: '22px', fontWeight: 'bold', marginTop: '10px' }}>
                      {prod.brand?.name} {prod.name}
                    </h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '16px' }}>
                      Size: {prod.quantity} {prod.unit}
                    </p>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '15px' }}>
                      <div>
                        <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Price:</span>
                        <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--primary)' }}>
                          Rs. {prod.sellingPrice}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Stock:</span>
                        <div style={{ 
                          fontSize: '22px', 
                          fontWeight: '800', 
                          color: isLowStock ? 'var(--danger)' : 'var(--success)' 
                        }}>
                          {prod.currentStock} {prod.unit}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', marginTop: '20px', paddingTop: '10px', borderTop: '1px solid var(--border-color)' }}>
                    <button 
                      className="btn btn-outline" 
                      onClick={(e) => handleOpenStockAdj(prod, e)}
                      style={{ flex: 1, padding: '8px', minHeight: '40px', fontSize: '14px' }}
                    >
                      📦 Adjust Stock
                    </button>
                    <button 
                      className="btn btn-outline" 
                      onClick={() => handleOpenEditProduct(prod)}
                      style={{ padding: '8px 12px', minHeight: '40px', fontSize: '14px' }}
                    >
                      ✏️ Edit
                    </button>
                    <button 
                      className="btn btn-outline" 
                      onClick={(e) => toggleProductStatus(prod, e)}
                      style={{ padding: '8px 12px', minHeight: '40px', fontSize: '14px' }}
                      title={prod.status === 'Available' ? 'Disable Product' : 'Enable Product'}
                    >
                      {prod.status === 'Available' ? '⏸' : '▶'}
                    </button>
                    <button 
                      className="btn btn-outline" 
                      onClick={(e) => handleDeleteProduct(prod._id, e)}
                      style={{ padding: '8px 12px', minHeight: '40px', fontSize: '14px', color: 'var(--danger)' }}
                    >
                      🗑
                    </button>
                  </div>
                </div>
              );
            })}
            {filteredProducts.length === 0 && (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                No products found in catalog. Add your first product variant.
              </div>
            )}
          </div>
        </div>
      ) : (
        // STOCK HISTORY LOGS
        <div className="register-card">
          <h2>🕒 Stock Inward/Outward Log Book</h2>
          {loadingHistory ? (
            <div style={{ padding: '30px', textAlign: 'center' }}>Loading history...</div>
          ) : (
            <div className="ledger-book">
              <table className="ledger-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Product</th>
                    <th style={{ textAlign: 'right' }}>Quantity</th>
                    <th>Log Details / Notes</th>
                    <th>Supplier</th>
                  </tr>
                </thead>
                <tbody>
                  {stockHistory.length === 0 ? (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', padding: '20px' }}>No stock changes recorded yet.</td>
                    </tr>
                  ) : (
                    stockHistory.map((log) => {
                      const isAddition = log.quantityAdded > 0;
                      return (
                        <tr key={log._id}>
                          <td>{new Date(log.date).toLocaleDateString('en-IN')}</td>
                          <td>
                            <strong>{log.product?.brand?.name} {log.product?.name}</strong>
                            <br />
                            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                              {log.product?.quantity} {log.product?.unit}
                            </span>
                          </td>
                          <td style={{ 
                            textAlign: 'right', 
                            fontWeight: 'bold', 
                            color: isAddition ? 'var(--success)' : 'var(--danger)',
                            borderLeft: '2px solid var(--ledger-line)'
                          }}>
                            {isAddition ? `+${log.quantityAdded}` : log.quantityAdded}
                          </td>
                          <td>{log.notes}</td>
                          <td>{log.supplier || '-'}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ADD/EDIT PRODUCT MODAL */}
      {showProductModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>{isEditing ? '✏️ Edit Product Details' : '📦 Add Product Variant'}</h2>
            <form onSubmit={handleSaveProduct} style={{ marginTop: '15px' }}>
              
              <div className="form-group">
                <label className="form-label">Category *</label>
                <select 
                  className="form-control"
                  required
                  value={formCategory}
                  onChange={e => {
                    setFormCategory(e.target.value);
                    setFormBrand(''); // reset brand
                  }}
                >
                  <option value="">Select Category</option>
                  {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Brand *</label>
                <select 
                  className="form-control"
                  required
                  value={formBrand}
                  onChange={e => setFormBrand(e.target.value)}
                  disabled={!formCategory}
                >
                  <option value="">Select Brand</option>
                  {filteredBrandsForForm.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
                </select>
                {!formCategory && <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Select Category first to choose brand</span>}
              </div>

              <div className="form-group">
                <label className="form-label">Product Name / Variant *</label>
                <input 
                  type="text" 
                  className="form-control"
                  required
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="e.g. Gold 500 ml or Cow Milk 1 L"
                />
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Volume/Weight Size *</label>
                  <input 
                    type="number" 
                    className="form-control"
                    required
                    value={formQty}
                    onChange={e => setFormQty(e.target.value)}
                    placeholder="e.g. 500 or 1"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Unit *</label>
                  <select 
                    className="form-control"
                    value={formUnit}
                    onChange={e => setFormUnit(e.target.value)}
                  >
                    <option value="ml">ml</option>
                    <option value="L">L</option>
                    <option value="g">g</option>
                    <option value="kg">kg</option>
                    <option value="pcs">pcs</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Selling Price (Rs.) *</label>
                <input 
                  type="number" 
                  className="form-control"
                  required
                  value={formPrice}
                  onChange={e => setFormPrice(e.target.value)}
                  placeholder="e.g. 33"
                />
              </div>

              {!isEditing && (
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Opening Stock Qty</label>
                    <input 
                      type="number" 
                      className="form-control"
                      value={formStock}
                      onChange={e => setFormStock(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Low Stock Alert Min Qty</label>
                    <input 
                      type="number" 
                      className="form-control"
                      value={formAlert}
                      onChange={e => setFormAlert(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {isEditing && (
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Low Stock Alert Min Qty</label>
                    <input 
                      type="number" 
                      className="form-control"
                      value={formAlert}
                      onChange={e => setFormAlert(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select 
                      className="form-control"
                      value={formStatus}
                      onChange={e => setFormStatus(e.target.value)}
                    >
                      <option value="Available">Available</option>
                      <option value="Unavailable">Unavailable</option>
                    </select>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', marginTop: '25px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowProductModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-success">
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STOCK ADJUSTMENT MODAL */}
      {showStockModal && selectedProductForStock && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>📦 Stock Inward / Adjust</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>
              Product: <strong>{selectedProductForStock.brand?.name} {selectedProductForStock.name}</strong>
              <br />Current Stock: <strong>{selectedProductForStock.currentStock} {selectedProductForStock.unit}</strong>
            </p>
            <form onSubmit={handleSaveStockAdj}>
              <div className="form-group">
                <label className="form-label">Quantity to Add/Subtract *</label>
                <input 
                  type="number" 
                  className="form-control"
                  required
                  placeholder="Use + for adding stock, - for leakage/damage"
                  value={stockAdjQty}
                  onChange={e => setStockAdjQty(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Supplier Name (Optional)</label>
                <input 
                  type="text" 
                  className="form-control"
                  placeholder="e.g. Amul Depot Indore"
                  value={stockAdjSupplier}
                  onChange={e => setStockAdjSupplier(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Stock Notes</label>
                <select 
                  className="form-control"
                  value={stockAdjNotes}
                  onChange={e => setStockAdjNotes(e.target.value)}
                >
                  <option value="Manual Stock Inward">Manual Stock Inward (Stock Refill)</option>
                  <option value="Delivery Arrival">Delivery Arrival from Brand Supplier</option>
                  <option value="Leakage / Spoiled">Leakage / Spoiled (Deduct Stock)</option>
                  <option value="Stock Audit correction">Stock Audit correction</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '25px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowStockModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-success">
                  Update Stock Level
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIGURE CATEGORY & BRANDS MODAL */}
      {showCatBrandModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '650px' }}>
            <h2>🏷 Categories & Brands Settings</h2>
            
            {/* Create Category */}
            <div style={{ marginTop: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', marginBottom: '10px' }}>Create Category</h3>
              <form onSubmit={handleAddCategory} style={{ display: 'flex', gap: '10px' }}>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="e.g. Curd or Paneer"
                  value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                  style={{ flex: 1 }}
                />
                <button type="submit" className="btn btn-primary" style={{ minWidth: '120px' }}>Add</button>
              </form>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
                {categories.map(c => (
                  <span key={c._id} className="badge" style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)', padding: '5px 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {c.name}
                    <button type="button" onClick={() => api.deleteCategory(c._id).then(loadCategoriesAndBrands)} style={{ border: 'none', background: 'none', color: 'var(--danger)', cursor: 'pointer', fontWeight: 'bold' }}>×</button>
                  </span>
                ))}
              </div>
            </div>

            {/* Create Brand */}
            <div style={{ marginTop: '20px' }}>
              <h3 style={{ fontSize: '18px', marginBottom: '10px' }}>Create Brand</h3>
              <form onSubmit={handleAddBrand} style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <select 
                    className="form-control"
                    value={newBrandCat}
                    onChange={e => setNewBrandCat(e.target.value)}
                    required
                    style={{ flex: 1 }}
                  >
                    <option value="">Assign to Category</option>
                    {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </select>
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="e.g. Amul or Gokul"
                    value={newBrandName}
                    onChange={e => setNewBrandName(e.target.value)}
                    required
                    style={{ flex: 1 }}
                  />
                </div>
                <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-end', minWidth: '120px' }}>Add Brand</button>
              </form>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '15px' }}>
                {brands.map(b => (
                  <span key={b._id} className="badge" style={{ backgroundColor: 'var(--success-light)', color: 'var(--success)', padding: '5px 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {b.category?.name}: {b.name}
                    <button type="button" onClick={() => api.deleteBrand(b._id).then(loadCategoriesAndBrands)} style={{ border: 'none', background: 'none', color: 'var(--danger)', cursor: 'pointer', fontWeight: 'bold' }}>×</button>
                  </span>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', marginTop: '30px', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-outline" onClick={() => setShowCatBrandModal(false)}>
                Done / Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
