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
  const [productFilterText, setProductFilterText] = useState('');

  // Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0]);
  const [txTime, setTxTime] = useState(
    new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
  );
  
  // supplyQuantities state maps productId -> quantity
  const [supplyQuantities, setSupplyQuantities] = useState({});

  useEffect(() => {
    if (triggerAddOpen) {
      handleOpenRecordSupply();
      setTriggerAddOpen(false);
    }
  }, [triggerAddOpen]);

  const handleOpenRecordSupply = () => {
    setTxDate(new Date().toISOString().split('T')[0]);
    setTxTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }));
    setSupplyQuantities({});
    setProductFilterText('');

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

  // Quantity updates
  const handleQtyChange = (prodId, val) => {
    const num = Math.max(0, parseInt(val) || 0);
    setSupplyQuantities(prev => ({
      ...prev,
      [prodId]: num
    }));
  };

  const adjustQty = (prodId, delta) => {
    const current = supplyQuantities[prodId] || 0;
    const next = Math.max(0, current + delta);
    setSupplyQuantities(prev => ({
      ...prev,
      [prodId]: next
    }));
  };

  // Submit transaction to server
  const handleSaveTransaction = async (e) => {
    e.preventDefault();
    if (!selectedCustomerId) {
      alert("Please select a customer.");
      return;
    }

    const payloadProducts = Object.entries(supplyQuantities)
      .filter(([_, qty]) => qty > 0)
      .map(([prodId, qty]) => ({
        productId: prodId,
        quantity: qty
      }));

    if (payloadProducts.length === 0) {
      alert("Please enter a quantity for at least one product.");
      return;
    }

    // Verify stock availability
    for (const item of payloadProducts) {
      const prod = productsList.find(p => p._id === item.productId);
      if (prod && prod.currentStock < item.quantity) {
        const proceed = window.confirm(
          `Product "${prod.brand?.name} ${prod.name}" has only ${prod.currentStock} units in stock. Selling ${item.quantity} will make inventory negative. Do you want to proceed?`
        );
        if (!proceed) return;
      }
    }

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
    if (window.confirm("Duplicate this transaction? All items and quantities will be copied, stock will automatically deduct, and a new invoice generated for today.")) {
      try {
        await api.duplicateTransaction(txId);
        onRefresh();
      } catch (err) {
        alert(err.message);
      }
    }
  };

  // Group active products by Category, then Brand
  const getGroupedProducts = () => {
    const groups = {};
    const filtered = productsList.filter(p => {
      if (p.status !== 'Available') return false;
      if (!productFilterText) return true;
      const search = productFilterText.toLowerCase();
      const pName = p.name.toLowerCase();
      const bName = (p.brand?.name || '').toLowerCase();
      const cName = (p.category?.name || '').toLowerCase();
      return pName.includes(search) || bName.includes(search) || cName.includes(search);
    });

    filtered.forEach(p => {
      const cat = p.category?.name || 'Uncategorized Category';
      const brand = p.brand?.name || 'Generic Brand';
      if (!groups[cat]) groups[cat] = {};
      if (!groups[cat][brand]) groups[cat][brand] = [];
      groups[cat][brand].push(p);
    });
    return groups;
  };

  const groupedProducts = getGroupedProducts();

  // Calculate Running Grand Total
  const grandTotal = Object.entries(supplyQuantities).reduce((sum, [prodId, qty]) => {
    const prod = productsList.find(p => p._id === prodId);
    return sum + (prod ? prod.sellingPrice * qty : 0);
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
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '25px' }}>No transactions recorded yet.</td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => (
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
          <div className="modal-content" style={{ maxWidth: '850px', width: '95%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <h2>🥛 Record Daily Supply</h2>
            
            <form onSubmit={handleSaveTransaction} style={{ marginTop: '15px', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ overflowY: 'auto', paddingRight: '5px', flex: 1 }}>
                
                {/* Meta Inputs Grid */}
                <div className="grid-3" style={{ gap: '15px', marginBottom: '15px' }}>
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

                <div style={{ borderTop: '2px solid var(--border-color)', paddingTop: '15px', marginBottom: '15px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: 'bold' }}>🛒 Delivery Items Checklist</h3>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="🔍 Quick filter items by name..." 
                      value={productFilterText} 
                      onChange={e => setProductFilterText(e.target.value)}
                      style={{ maxWidth: '300px', minHeight: '38px', padding: '5px 10px', fontSize: '14px' }}
                    />
                  </div>

                  {/* Grouped Product List */}
                  {Object.keys(groupedProducts).length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', backgroundColor: 'var(--bg-paper)', borderRadius: '12px' }}>
                      No active products found matching the filter.
                    </div>
                  ) : (
                    Object.entries(groupedProducts).map(([catName, brandsMap]) => (
                      <div key={catName} style={{ marginBottom: '20px', border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden' }}>
                        <div style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)', padding: '8px 15px', fontWeight: 'bold', fontSize: '16px' }}>
                          🥛 {catName}
                        </div>
                        <div style={{ padding: '15px', backgroundColor: 'var(--bg-card)' }}>
                          {Object.entries(brandsMap).map(([brandName, productsArray]) => (
                            <div key={brandName} style={{ marginBottom: '15px' }}>
                              <h4 style={{ fontSize: '14px', textTransform: 'uppercase', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)', paddingBottom: '3px', marginBottom: '8px', fontWeight: 'bold' }}>
                                {brandName}
                              </h4>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {productsArray.map(p => (
                                  <div key={p._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', backgroundColor: 'var(--bg-paper)', borderRadius: '8px', flexWrap: 'wrap', gap: '10px' }}>
                                    <div style={{ flex: 1, minWidth: '200px' }}>
                                      <strong style={{ fontSize: '16px' }}>{p.name}</strong>
                                      <br />
                                      <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                                        Price: Rs. {p.sellingPrice.toFixed(2)} | Stock: {p.currentStock} {p.unit}
                                      </span>
                                    </div>
                                    
                                    {/* Qty Counter controls */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                      <button 
                                        type="button" 
                                        onClick={() => adjustQty(p._id, -1)}
                                        className="btn btn-outline"
                                        style={{ minHeight: '34px', minWidth: '34px', padding: 0, fontSize: '18px', fontWeight: 'bold' }}
                                      >
                                        -
                                      </button>
                                      <input 
                                        type="number"
                                        min="0"
                                        className="form-control"
                                        value={supplyQuantities[p._id] || ''}
                                        placeholder="0"
                                        onChange={e => handleQtyChange(p._id, e.target.value)}
                                        style={{ width: '60px', minHeight: '34px', textAlign: 'center', fontSize: '16px', fontWeight: 'bold', padding: 0 }}
                                      />
                                      <button 
                                        type="button" 
                                        onClick={() => adjustQty(p._id, 1)}
                                        className="btn btn-outline"
                                        style={{ minHeight: '34px', minWidth: '34px', padding: 0, fontSize: '18px', fontWeight: 'bold' }}
                                      >
                                        +
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
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
