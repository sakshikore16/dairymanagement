import React, { useState } from 'react';
import { api } from '../api';
import NumberPad from '../components/NumberPad';

export default function Collections({ 
  collectionsList, 
  customersList, 
  onRefresh, 
  triggerAddOpen, 
  setTriggerAddOpen 
}) {
  const [showModal, setShowModal] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [amountCollected, setAmountCollected] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  // Set trigger action if redirected from dashboard
  React.useEffect(() => {
    if (triggerAddOpen) {
      handleOpenAdd();
      setTriggerAddOpen(false);
    }
  }, [triggerAddOpen]);

  const handleOpenAdd = () => {
    setSelectedCustomerId('');
    setAmountCollected('');
    setPaymentMethod('Cash');
    setNotes('');
    setDate(new Date().toISOString().split('T')[0]);
    setShowModal(true);
  };

  const handleQuickCollect = (cust) => {
    setSelectedCustomerId(cust._id);
    setAmountCollected(cust.balance.toString()); // prefill full outstanding
    setPaymentMethod('Cash');
    setNotes('Full payment collection');
    setDate(new Date().toISOString().split('T')[0]);
    setShowModal(true);
  };

  const handleSaveCollection = async (e) => {
    e.preventDefault();
    if (!selectedCustomerId || !amountCollected || Number(amountCollected) <= 0) {
      alert("Please select a customer and enter a valid collection amount.");
      return;
    }

    try {
      await api.createCollection({
        customerId: selectedCustomerId,
        amountCollected: Number(amountCollected),
        paymentMethod,
        notes,
        date
      });
      setShowModal(false);
      onRefresh();
    } catch (err) {
      alert(err.message);
    }
  };

  // Filter customers who have positive outstanding debt
  const pendingCollectionQueue = customersList.filter(c => c.status === 'Active' && c.balance > 0);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h1>Daily Money Collections</h1>
          <p style={{ color: 'var(--text-muted)' }}>Log cash collections, UPI payouts, and track outstanding ledger bills</p>
        </div>
        <button className="btn btn-success" onClick={handleOpenAdd} style={{ fontSize: '18px' }}>
          💸 + Record New Collection
        </button>
      </div>

      <div className="grid-2" style={{ alignItems: 'flex-start' }}>
        
        {/* Left: Pending Collection Queue */}
        <div className="register-card" style={{ borderColor: 'var(--danger)', borderWidth: '2px' }}>
          <h2 style={{ color: 'var(--danger)', marginBottom: '5px' }}>💸 Outstanding Collections Queue</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '20px', fontSize: '16px' }}>List of active accounts with unpaid balances</p>
          
          <div style={{ maxHeight: '550px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
            {pendingCollectionQueue.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                🎉 Great! No outstanding collections pending today.
              </div>
            ) : (
              pendingCollectionQueue.map(cust => (
                <div 
                  key={cust._id} 
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    padding: '16px', 
                    borderBottom: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-card)'
                  }}
                >
                  <div>
                    <h4 style={{ fontSize: '18px', fontWeight: 'bold' }}>{cust.name}</h4>
                    <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Area: {cust.area || 'N/A'}</p>
                    <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--danger)', marginTop: '4px' }}>
                      Owes: Rs. {cust.balance.toFixed(2)}
                    </div>
                  </div>
                  <button 
                    className="btn btn-success" 
                    onClick={() => handleQuickCollect(cust)}
                    style={{ padding: '8px 16px', minHeight: '40px', fontSize: '15px' }}
                  >
                    💰 Collect
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Collection History Log */}
        <div className="register-card">
          <h2>📜 Payments Receipt Ledger</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '20px', fontSize: '16px' }}>History of money collected in the field</p>
          
          <div className="ledger-book" style={{ marginTop: '0' }}>
            <table className="ledger-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Method</th>
                  <th style={{ textAlign: 'right' }}>Collected (-)</th>
                </tr>
              </thead>
              <tbody>
                {collectionsList.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', padding: '20px' }}>No payments logged yet.</td>
                  </tr>
                ) : (
                  collectionsList.map((col) => (
                    <tr key={col._id} style={{ backgroundColor: 'var(--success-light)' }}>
                      <td>{new Date(col.date).toLocaleDateString('en-IN')}</td>
                      <td>
                        <strong>{col.customer?.name}</strong>
                        <br />
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{col.notes || 'Payment Log'}</span>
                      </td>
                      <td><span className="badge" style={{ backgroundColor: 'var(--bg-paper)', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}>{col.paymentMethod}</span></td>
                      <td className="collect-amount" style={{ borderLeft: 'none', fontSize: '18px' }}>
                        Rs. {col.amountCollected.toFixed(2)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* RECORD COLLECTION MODAL */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <h2>💸 Record Money Collection</h2>
            
            <form onSubmit={handleSaveCollection} style={{ marginTop: '15px' }}>
              <div className="form-group">
                <label className="form-label">Collection Date</label>
                <input type="date" className="form-control" required value={date} onChange={e => setDate(e.target.value)} />
              </div>

              {/* Customer Selector */}
              <div className="form-group">
                <label className="form-label">Select Customer *</label>
                <select 
                  className="form-control"
                  required
                  value={selectedCustomerId}
                  onChange={e => {
                    setSelectedCustomerId(e.target.value);
                    const cust = customersList.find(c => c._id === e.target.value);
                    if (cust && !amountCollected) {
                      setAmountCollected(cust.balance.toString()); // prefill outstanding
                    }
                  }}
                >
                  <option value="">-- Choose Customer --</option>
                  {customersList.filter(c => c.status === 'Active').map(c => (
                    <option key={c._id} value={c._id}>{c.name} (Owes: Rs.{c.balance.toFixed(2)})</option>
                  ))}
                </select>
              </div>

              {/* Amount Entry & NumberPad */}
              <div className="grid-2" style={{ alignItems: 'flex-start' }}>
                <div className="form-group">
                  <label className="form-label">Amount Collected (Rs.) *</label>
                  <NumberPad 
                    value={amountCollected} 
                    onChange={setAmountCollected}
                  />
                </div>
                
                <div>
                  <div className="form-group">
                    <label className="form-label">Payment Method</label>
                    <select 
                      className="form-control"
                      value={paymentMethod}
                      onChange={e => setPaymentMethod(e.target.value)}
                    >
                      <option value="Cash">💵 Cash</option>
                      <option value="UPI">📱 UPI / PhonePe / GPay</option>
                      <option value="Bank Transfer">🏦 Bank Transfer</option>
                      <option value="Other">📝 Other Method</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Notes / Remarks</label>
                    <textarea 
                      className="form-control"
                      placeholder="e.g. Cleared full balance"
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      style={{ minHeight: '80px', fontFamily: 'inherit' }}
                    />
                  </div>
                  
                  <button 
                    type="submit" 
                    className="btn btn-success" 
                    style={{ width: '100%', marginTop: '10px', fontSize: '18px', fontWeight: 'bold' }}
                  >
                    ✓ Save Payment
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '25px', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '15px' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
