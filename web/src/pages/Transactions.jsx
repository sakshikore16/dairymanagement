import React, { useState, useEffect } from 'react';
import { api } from '../api';

export default function Transactions({ 
  transactionsList, 
  customersList, 
  productsList, 
  onRefresh, 
  triggerAddOpen, 
  setTriggerAddOpen,
  preSelectedCustomerId,
  setPreSelectedCustomerId
}) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0]);
  const [txTime, setTxTime] = useState(
    new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
  );
  
  // Dynamic Items list state: [{ id, categoryId, brandId, productId, quantity }]
  const [items, setItems] = useState([]);

  // Master lists for selectors
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);

  useEffect(() => {
    if (triggerAddOpen) {
      handleOpenRecordSupply();
      setTriggerAddOpen(false);
    }
  }, [triggerAddOpen]);

  const loadSelectors = async () => {
    try {
      const cats = await api.getCategories();
      const brs = await api.getBrands();
      setCategories(cats);
      setBrands(brs);
    } catch (err) {
      console.error("Error loading master selectors: ", err);
    }
  };

  const handleOpenRecordSupply = () => {
    loadSelectors();
    setTxDate(new Date().toISOString().split('T')[0]);
    setTxTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }));
    
    // Start with one empty row
    setItems([{ id: Date.now(), categoryId: '', brandId: '', productId: '', quantity: 1 }]);

    if (preSelectedCustomerId) {
      setSelectedCustomerId(preSelectedCustomerId);
    } else {
      setSelectedCustomerId('');
    }
    setShowAddModal(true);
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    if (setPreSelectedCustomerId) {
      setPreSelectedCustomerId('');
    }
  };

  // Add a new row to items list
  const handleAddItemRow = () => {
    setItems([
      ...items,
      { id: Date.now() + Math.random(), categoryId: '', brandId: '', productId: '', quantity: 1 }
    ]);
  };

  // Remove a row
  const handleRemoveItemRow = (id) => {
    if (items.length === 1) return; // Keep at least one row
    setItems(items.filter(item => item.id !== id));
  };

  // Update specific field in a row
  const handleUpdateItemRow = (id, field, value) => {
    setItems(
      items.map(item => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };
          // Reset child cascades and auto-select if parent changes
          if (field === 'categoryId') {
            updated.brandId = '';
            updated.productId = '';
            
            // Auto-select brand if only one exists for this category
            const filteredBrands = brands.filter(b => b.category?._id === value);
            if (filteredBrands.length === 1) {
              updated.brandId = filteredBrands[0]._id;
              
              // Auto-select product if only one exists for this brand
              const filteredProds = productsList.filter(p => 
                p.category?._id === value && 
                p.brand?._id === filteredBrands[0]._id &&
                p.status === 'Available'
              );
              if (filteredProds.length === 1) {
                updated.productId = filteredProds[0]._id;
              }
            }
          } else if (field === 'brandId') {
            updated.productId = '';
            
            // Auto-select product if only one exists for this brand
            const filteredProds = productsList.filter(p => 
              p.category?._id === item.categoryId && 
              p.brand?._id === value &&
              p.status === 'Available'
            );
            if (filteredProds.length === 1) {
              updated.productId = filteredProds[0]._id;
            }
          }
          return updated;
        }
        return item;
      })
    );
  };

  // Submit transaction to server
  const handleSaveTransaction = async (e) => {
    e.preventDefault();
    if (!selectedCustomerId) {
      alert("Please select a customer.");
      return;
    }

    // Verify all rows are filled out
    const incompleteRow = items.find(item => !item.categoryId || !item.brandId || !item.productId || !item.quantity);
    if (incompleteRow) {
      alert("Please select Category, Brand, Product and Quantity for all rows, or delete the empty rows.");
      return;
    }

    const payloadProducts = items.map(item => ({
      productId: item.productId,
      quantity: Number(item.quantity)
    }));

    // Low stock checks removed per user request

    const payload = {
      customerId: selectedCustomerId,
      date: txDate,
      time: txTime,
      products: payloadProducts
    };

    try {
      await api.createTransaction(payload);
      handleCloseModal();
      onRefresh();
    } catch (err) {
      alert(err.message);
    }
  };

  // Duplicate past transaction
  const handleDuplicate = async (txId) => {
    if (window.confirm("Duplicate this transaction? All items and quantities will be copied, stock will deduct, and a new invoice generated for today.")) {
      try {
        await api.duplicateTransaction(txId);
        onRefresh();
      } catch (err) {
        alert(err.message);
      }
    }
  };

  // Calculate Running Grand Total
  const grandTotal = items.reduce((sum, item) => {
    if (!item.productId) return sum;
    const prod = productsList.find(p => p._id === item.productId);
    return sum + (prod ? prod.sellingPrice * (Number(item.quantity) || 0) : 0);
  }, 0);

  // Filter transaction list
  const filteredTransactions = transactionsList.filter(t => {
    const custName = t.customer?.name || '';
    const areaName = t.customer?.area || '';
    const invNo = t.invoiceNumber || '';
    const match = searchTerm.toLowerCase();
    return custName.toLowerCase().includes(match) || 
      areaName.toLowerCase().includes(match) || 
      invNo.toLowerCase().includes(match);
  });

  // Sort transaction logs chronologically (newest first / latest at the top)
  const sortedTransactions = [...filteredTransactions].sort((a, b) => {
    return new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date);
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h1>Daily Supply Registers</h1>
          <p style={{ color: 'var(--text-muted)' }}>Daily supply ledger, locked price history, duplicate logs & invoice sheets</p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenRecordSupply} style={{ fontSize: '18px' }}>
          🥛 + Record Daily Supply
        </button>
      </div>

      {/* Search Header */}
      <div className="register-card">
        <input 
          type="text" 
          className="form-control" 
          placeholder="🔍 Search supplies by Customer Name, Area, or Invoice Number..." 
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Transactions History List */}
      <div className="register-card" style={{ marginTop: '20px' }}>
        <h2>📜 Supply Transactions Log</h2>
        <div className="ledger-book">
          <table className="ledger-table">
            <thead>
              <tr>
                <th>Date / Time</th>
                <th>Invoice No</th>
                <th>Customer</th>
                <th>Delivered Products</th>
                <th style={{ textAlign: 'right' }}>Total (INR)</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedTransactions.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '25px' }}>No transactions recorded yet.</td>
                </tr>
              ) : (
                sortedTransactions.map((tx) => (
                  <tr key={tx._id}>
                    <td>
                      {new Date(tx.date).toLocaleDateString('en-IN')}
                      <br />
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{tx.time}</span>
                    </td>
                    <td><strong style={{ color: 'var(--primary)' }}>{tx.invoiceNumber}</strong></td>
                    <td>
                      <strong>{tx.customer?.name}</strong>
                      <br />
                      <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>📍 {tx.customer?.area}</span>
                    </td>
                    <td>
                      <ul style={{ paddingLeft: '15px', margin: 0, fontSize: '14px' }}>
                        {tx.products.map((p, idx) => (
                          <li key={idx}>
                            {p.brandName} {p.name}: {p.quantity} {p.unit} @ Rs.{p.unitPrice}
                          </li>
                        ))}
                      </ul>
                    </td>
                    <td className="supply-amount" style={{ borderLeft: 'none', fontSize: '18px', fontWeight: '800' }}>
                      Rs. {tx.grandTotal.toFixed(2)}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <a 
                          href={api.getInvoicePdfUrl(tx._id)} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="btn btn-outline" 
                          style={{ padding: '8px 12px', minHeight: '38px', fontSize: '14px', textDecoration: 'none' }}
                        >
                          📄 Invoice PDF
                        </a>
                        <button 
                          className="btn btn-outline" 
                          onClick={() => handleDuplicate(tx._id)}
                          style={{ padding: '8px 12px', minHeight: '38px', fontSize: '14px' }}
                        >
                          🔁 Duplicate
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* RECORD TRANSACTION MODAL */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '950px', width: '95%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <h2>🥛 Record Daily Supply</h2>
            
            <form onSubmit={handleSaveTransaction} style={{ marginTop: '15px', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ overflowY: 'auto', paddingRight: '5px', flex: 1 }}>
                
                {/* Meta Inputs Grid */}
                <div className="grid-3" style={{ gap: '15px', marginBottom: '20px' }}>
                  <div className="form-group">
                    <label className="form-label">Delivery Date</label>
                    <input type="date" className="form-control" required value={txDate} onChange={e => setTxDate(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Delivery Time</label>
                    <input type="text" className="form-control" required value={txTime} onChange={e => setTxTime(e.target.value)} />
                  </div>
                  
                  {/* Customer Selector */}
                  <div className="form-group">
                    <label className="form-label">Select Customer Account *</label>
                    <select 
                      className="form-control"
                      required
                      value={selectedCustomerId}
                      onChange={e => setSelectedCustomerId(e.target.value)}
                      disabled={!!preSelectedCustomerId}
                    >
                      <option value="">-- Choose Customer --</option>
                      {customersList.filter(c => c.status === 'Active').map(c => (
                        <option key={c._id} value={c._id}>{c.name} ({c.area || 'No Area'})</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Items Row Builder Table */}
                <div style={{ borderTop: '2px solid var(--border-color)', paddingTop: '15px', marginBottom: '15px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '15px' }}>🛒 Delivery Items List</h3>

                  <div style={{ minWidth: '700px', overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'var(--bg-paper)' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)' }}>
                          <th style={{ padding: '10px', fontSize: '14px', width: '22%' }}>Product Category</th>
                          <th style={{ padding: '10px', fontSize: '14px', width: '22%' }}>Brand</th>
                          <th style={{ padding: '10px', fontSize: '14px', width: '30%' }}>Product Variant</th>
                          <th style={{ padding: '10px', fontSize: '14px', width: '16%', textAlign: 'center' }}>Quantity</th>
                          <th style={{ padding: '10px', fontSize: '14px', width: '10%', textAlign: 'center' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item) => {
                          // Cascading dropdowns filtered options
                          const filteredBrands = brands.filter(b => b.category?._id === item.categoryId);
                          const filteredProducts = productsList.filter(p => 
                            p.category?._id === item.categoryId && 
                            p.brand?._id === item.brandId &&
                            p.status === 'Available'
                          );
                          const activeProduct = productsList.find(p => p._id === item.productId);

                          return (
                            <tr key={item.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                              <td style={{ padding: '8px' }}>
                                <select 
                                  className="form-control"
                                  value={item.categoryId}
                                  onChange={e => handleUpdateItemRow(item.id, 'categoryId', e.target.value)}
                                  style={{ minHeight: '38px', fontSize: '14px' }}
                                >
                                  <option value="">-- Select Category --</option>
                                  {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                                </select>
                              </td>

                              <td style={{ padding: '8px' }}>
                                {filteredBrands.length === 1 && item.brandId ? (
                                  <div style={{ padding: '8px 12px', backgroundColor: 'var(--bg-paper)', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold', color: 'var(--text-main)', border: '1px solid var(--border-color)', minHeight: '38px', display: 'flex', alignItems: 'center' }}>
                                    {filteredBrands[0].name}
                                  </div>
                                ) : (
                                  <select 
                                    className="form-control"
                                    value={item.brandId}
                                    onChange={e => handleUpdateItemRow(item.id, 'brandId', e.target.value)}
                                    disabled={!item.categoryId}
                                    style={{ minHeight: '38px', fontSize: '14px' }}
                                  >
                                    <option value="">-- Select Brand --</option>
                                    {filteredBrands.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
                                  </select>
                                )}
                              </td>

                              <td style={{ padding: '8px' }}>
                                {filteredProducts.length === 1 && item.productId ? (
                                  <div style={{ padding: '8px 12px', backgroundColor: 'var(--bg-paper)', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold', color: 'var(--text-main)', border: '1px solid var(--border-color)', minHeight: '38px', display: 'flex', alignItems: 'center' }}>
                                    {filteredProducts[0].name} (Rs. {filteredProducts[0].sellingPrice})
                                  </div>
                                ) : (
                                  <select 
                                    className="form-control"
                                    value={item.productId}
                                    onChange={e => handleUpdateItemRow(item.id, 'productId', e.target.value)}
                                    disabled={!item.brandId}
                                    style={{ minHeight: '38px', fontSize: '14px' }}
                                  >
                                    <option value="">-- Select Product --</option>
                                    {filteredProducts.map(p => (
                                      <option key={p._id} value={p._id}>
                                        {p.name} (Rs. {p.sellingPrice})
                                      </option>
                                    ))}
                                  </select>
                                )}
                              </td>

                              <td style={{ padding: '8px', textAlign: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                                  <input 
                                    type="number"
                                    min="1"
                                    className="form-control"
                                    value={item.quantity}
                                    onChange={e => handleUpdateItemRow(item.id, 'quantity', e.target.value)}
                                    disabled={!item.productId}
                                    style={{ width: '70px', minHeight: '38px', textAlign: 'center', fontWeight: 'bold' }}
                                  />
                                  {activeProduct && (
                                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                      {activeProduct.unit}
                                    </span>
                                  )}
                                </div>
                                {activeProduct && (
                                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                    Stock: {activeProduct.currentStock}
                                  </div>
                                )}
                              </td>

                              <td style={{ padding: '8px', textAlign: 'center' }}>
                                <button
                                  type="button"
                                  className="btn btn-outline"
                                  onClick={() => handleRemoveItemRow(item.id)}
                                  disabled={items.length === 1}
                                  style={{ minHeight: '38px', borderColor: 'var(--danger)', color: 'var(--danger)', padding: '0 12px' }}
                                >
                                  🗑
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={handleAddItemRow}
                    style={{ marginTop: '15px', fontSize: '15px', minHeight: '40px' }}
                  >
                    ➕ Add Another Product Item
                  </button>
                </div>
              </div>

              {/* Modal Footer (Always visible) */}
              <div style={{ borderTop: '2px solid var(--border-color)', paddingTop: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '15px' }}>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text-main)' }}>
                  Total Items Value: <strong style={{ color: 'var(--danger)', fontSize: '24px' }}>Rs. {grandTotal.toFixed(2)}</strong>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="button" className="btn btn-outline" onClick={handleCloseModal}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-success" disabled={grandTotal === 0}>
                    ✓ Save & Deliver Daily Supply
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
