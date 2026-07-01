import React, { useState, useEffect } from 'react';
import { api } from '../api';

export default function Customers({ customersList, onRefresh, triggerAddOpen, setTriggerAddOpen, onQuickAction }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [areaFilter, setAreaFilter] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [ledgerData, setLedgerData] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loadingLedger, setLoadingLedger] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Form State
  const [formName, setFormName] = useState('');
  const [formMobile, setFormMobile] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formArea, setFormArea] = useState('');
  const [formType, setFormType] = useState('Home');
  const [formNotes, setFormNotes] = useState('');
  const [formStatus, setFormStatus] = useState('Active');
  const [isEditing, setIsEditing] = useState(null); // stores customerId

  useEffect(() => {
    if (triggerAddOpen) {
      handleOpenAdd();
      setTriggerAddOpen(false);
    }
  }, [triggerAddOpen]);

  // Load customer ledger details
  const handleSelectCustomer = async (cust) => {
    setSelectedCustomer(cust);
    setLoadingLedger(true);
    try {
      const data = await api.getCustomerLedger(cust._id);
      setLedgerData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingLedger(false);
    }
  };

  const handleOpenAdd = () => {
    setIsEditing(null);
    setFormName('');
    setFormMobile('');
    setFormAddress('');
    setFormArea('');
    setFormType('Home');
    setFormNotes('');
    setFormStatus('Active');
    setShowAddModal(true);
  };

  const handleOpenEdit = (cust, e) => {
    e.stopPropagation();
    setIsEditing(cust._id);
    setFormName(cust.name);
    setFormMobile(cust.mobileNumber || '');
    setFormAddress(cust.address || '');
    setFormArea(cust.area || '');
    setFormType(cust.customerType);
    setFormNotes(cust.notes || '');
    setFormStatus(cust.status);
    setShowAddModal(true);
  };

  const handleSaveCustomer = async (e) => {
    e.preventDefault();
    const payload = {
      name: formName,
      mobileNumber: formMobile,
      address: formAddress,
      area: formArea,
      customerType: formType,
      notes: formNotes,
      status: formStatus
    };

    try {
      if (isEditing) {
        await api.updateCustomer(isEditing, payload);
      } else {
        await api.createCustomer(payload);
      }
      setShowAddModal(false);
      onRefresh();
      if (selectedCustomer && selectedCustomer._id === isEditing) {
        // Refresh detail view
        const refreshedCust = { ...selectedCustomer, ...payload };
        handleSelectCustomer(refreshedCust);
      }
    } catch (err) {
      alert("Error saving customer: " + err.message);
    }
  };

  const handleDeleteCustomer = async (id, e) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this customer? Historical records will be kept, but they will be removed from directory.")) {
      try {
        await api.deleteCustomer(id);
        setSelectedCustomer(null);
        onRefresh();
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const toggleStatus = async (cust, e) => {
    e.stopPropagation();
    const newStatus = cust.status === 'Active' ? 'Inactive' : 'Active';
    try {
      await api.updateCustomer(cust._id, { status: newStatus });
      onRefresh();
      if (selectedCustomer && selectedCustomer._id === cust._id) {
        setSelectedCustomer({ ...selectedCustomer, status: newStatus });
      }
    } catch (err) {
      alert(err.message);
    }
  };

  // Compile Ledger entries chronologically
  const getCompiledLedger = () => {
    if (!ledgerData) return [];
    const entries = [];
    
    const formatEntryTime = (dateObj) => {
      return dateObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    };

    ledgerData.transactions.forEach(t => {
      const createdD = new Date(t.createdAt || t.date);
      entries.push({
        date: new Date(t.date),
        createdAt: createdD,
        time: t.time || formatEntryTime(createdD),
        type: 'SUPPLY',
        desc: t.products.map(p => `${p.brandName} ${p.name} x${p.quantity}`).join(', '),
        amount: t.grandTotal,
        invoiceNo: t.invoiceNumber || t._id.substring(18).toUpperCase()
      });
    });

    ledgerData.collections.forEach(c => {
      const createdD = new Date(c.createdAt || c.date);
      entries.push({
        date: new Date(c.date),
        createdAt: createdD,
        time: formatEntryTime(createdD),
        type: 'COLLECTION',
        desc: `Payment Recv (${c.paymentMethod})${c.notes ? ' - ' + c.notes : ''}`,
        amount: c.amountCollected,
        invoiceNo: `COL-${c._id.substring(20).toUpperCase()}`
      });
    });

    // Filter by dates if set
    let filtered = entries;
    if (startDate) {
      const s = new Date(startDate);
      filtered = filtered.filter(e => e.date >= s);
    }
    if (endDate) {
      const e = new Date(endDate);
      e.setHours(23,59,59,999);
      filtered = filtered.filter(e => e.date <= e);
    }

    // Sort chronologically: date first, then exact entry order (createdAt)
    filtered.sort((a, b) => {
      const dA = new Date(a.date).setHours(0,0,0,0);
      const dB = new Date(b.date).setHours(0,0,0,0);
      if (dA !== dB) return dA - dB;
      return a.createdAt - b.createdAt;
    });
    return filtered;
  };

  const compiledLedger = getCompiledLedger();
  
  // Calculate running balances
  let currentRunningBal = 0;
  const ledgerWithBalances = compiledLedger.map(entry => {
    if (entry.type === 'SUPPLY') {
      currentRunningBal += entry.amount;
    } else {
      currentRunningBal -= entry.amount;
    }
    return { ...entry, runningBal: currentRunningBal };
  });

  // Filter main directory
  const filteredCustomers = customersList.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (c.mobileNumber && c.mobileNumber.includes(searchTerm)) ||
      (c.area && c.area.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesArea = areaFilter === '' || c.area === areaFilter;
    return matchesSearch && matchesArea;
  });

  // Extract unique areas for filter dropdown
  const uniqueAreas = [...new Set(customersList.map(c => c.area).filter(Boolean))];

  return (
    <div>
      {!selectedCustomer ? (
        // CUSTOMER DIRECTORY VIEW
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
            <div>
              <h1>Customer Ledger Directory</h1>
              <p style={{ color: 'var(--text-muted)' }}>Registered customer accounts & outstanding records</p>
            </div>
            <button className="btn btn-primary" onClick={handleOpenAdd} style={{ fontSize: '18px' }}>
              👤 + Add New Customer
            </button>
          </div>

          {/* Search Controls */}
          <div className="register-card" style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '250px' }}>
              <input 
                type="text" 
                className="form-control" 
                placeholder="🔍 Search by Name, Phone, or Area..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <div style={{ width: '200px' }}>
              <select 
                className="form-control" 
                value={areaFilter} 
                onChange={e => setAreaFilter(e.target.value)}
              >
                <option value="">All Areas</option>
                {uniqueAreas.map((a, i) => <option key={i} value={a}>{a}</option>)}
              </select>
            </div>
          </div>

          {/* Customers Cards Grid */}
          <div className="grid-3" style={{ marginTop: '20px', gap: '20px' }}>
            {filteredCustomers.map(cust => (
              <div 
                key={cust._id} 
                className="register-card" 
                onClick={() => handleSelectCustomer(cust)}
                style={{ 
                  cursor: 'pointer',
                  borderColor: cust.status === 'Active' ? 'var(--border-color)' : 'var(--text-muted)',
                  opacity: cust.status === 'Active' ? 1 : 0.6,
                  borderWidth: '2px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: '180px'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <h3 style={{ fontSize: '22px', fontWeight: 'bold' }}>{cust.name}</h3>
                    <span className={`badge ${cust.status === 'Active' ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '12px' }}>
                      {cust.status}
                    </span>
                  </div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '16px', marginTop: '5px' }}>
                    📍 {cust.address ? `${cust.address}, ` : ''} <strong>{cust.area || 'No Area'}</strong>
                  </p>
                  <p style={{ color: 'var(--text-muted)', fontSize: '16px' }}>
                    📞 {cust.mobileNumber || 'No Mobile'}
                  </p>
                  <span className="badge" style={{ backgroundColor: '#f1f5f9', color: '#475569', marginTop: '10px', fontSize: '13px' }}>
                    Type: {cust.customerType}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '15px', paddingTop: '10px', borderTop: '1px solid var(--border-color)' }}>
                  <div>
                    <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Balance:</span>
                    <div style={{ fontSize: '20px', fontWeight: '800', color: cust.balance > 0 ? 'var(--danger)' : 'var(--success)' }}>
                      Rs. {cust.balance.toFixed(2)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn btn-outline" onClick={(e) => handleOpenEdit(cust, e)} style={{ padding: '8px 12px', minHeight: '38px', fontSize: '15px' }}>
                      ✏️ Edit
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {filteredCustomers.length === 0 && (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                No customers found matching search criteria.
              </div>
            )}
          </div>
        </div>
      ) : (
        // INDIVIDUAL CUSTOMER PROFILE & LEDGER VIEW
        <div>
          <button className="btn btn-outline" onClick={() => { setSelectedCustomer(null); setLedgerData(null); }} style={{ marginBottom: '20px', fontSize: '16px', minHeight: '40px' }}>
            ← Back to Customer Directory
          </button>

          {/* Profile Card Header */}
          <div className="register-card" style={{ borderLeft: '8px solid var(--primary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '15px' }}>
              <div>
                <span className="badge" style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)', fontWeight: 'bold', fontSize: '14px', marginBottom: '8px' }}>
                  {selectedCustomer.customerType} Account
                </span>
                <h2 style={{ fontSize: '32px', fontWeight: '800', margin: '5px 0' }}>{selectedCustomer.name}</h2>
                <p style={{ fontSize: '18px', color: 'var(--text-muted)' }}>
                  📍 Address: {selectedCustomer.address || 'N/A'} | Area: <strong>{selectedCustomer.area || 'N/A'}</strong>
                </p>
                {selectedCustomer.notes && (
                  <p style={{ fontSize: '16px', color: 'var(--text-muted)', marginTop: '8px', fontStyle: 'italic' }}>
                    📝 Note: {selectedCustomer.notes}
                  </p>
                )}
              </div>

              {/* Outstanding debt display */}
              <div style={{ textAlign: 'right', minWidth: '200px' }}>
                <span style={{ fontSize: '16px', color: 'var(--text-muted)', fontWeight: 'bold' }}>Outstanding Balance</span>
                <h1 style={{ fontSize: '36px', color: selectedCustomer.balance > 0 ? 'var(--danger)' : 'var(--success)', fontWeight: '900', margin: '5px 0' }}>
                  Rs. {selectedCustomer.balance.toFixed(2)}
                </h1>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '10px' }}>
                  {selectedCustomer.mobileNumber && (
                    <a 
                      href={`tel:${selectedCustomer.mobileNumber}`} 
                      className="btn btn-primary" 
                      style={{ textDecoration: 'none', padding: '10px 15px', minHeight: '44px', fontSize: '16px', display: 'flex', gap: '5px' }}
                    >
                      📞 Call Customer ({selectedCustomer.mobileNumber})
                    </a>
                  )}
                  <button className="btn btn-outline" onClick={(e) => toggleStatus(selectedCustomer, e)} style={{ padding: '10px 15px', minHeight: '44px', fontSize: '16px' }}>
                    {selectedCustomer.status === 'Active' ? '⏸ Deactivate' : '▶ Activate'}
                  </button>
                  <button className="btn btn-danger" onClick={(e) => handleDeleteCustomer(selectedCustomer._id, e)} style={{ padding: '10px 15px', minHeight: '44px', fontSize: '16px' }}>
                    🗑 Delete
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Ledger Statement Section */}
          <div className="register-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
              <h2>📖 Traditional Paper Ledger Register</h2>
              
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                <button 
                  className="btn btn-primary" 
                  onClick={() => onQuickAction('add-supply-for-customer', selectedCustomer._id)}
                  style={{ padding: '10px 16px', minHeight: '44px', fontSize: '16px' }}
                >
                  🥛 + Record Supply Entry
                </button>
                {/* PDF generation URLs */}
                <a 
                  href={api.getLedgerPdfUrl(selectedCustomer._id, startDate, endDate)} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="btn btn-success" 
                  style={{ textDecoration: 'none', padding: '10px 16px', minHeight: '44px', fontSize: '16px' }}
                >
                  📄 Download Ledger PDF
                </a>
              </div>
            </div>

            {/* Date Filtering */}
            <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', flexWrap: 'wrap', backgroundColor: 'var(--bg-paper)', padding: '15px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              <div style={{ flex: 1, minWidth: '150px' }}>
                <label className="form-label" style={{ fontSize: '14px' }}>Start Date</label>
                <input type="date" className="form-control" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ minHeight: '42px', padding: '8px' }} />
              </div>
              <div style={{ flex: 1, minWidth: '150px' }}>
                <label className="form-label" style={{ fontSize: '14px' }}>End Date</label>
                <input type="date" className="form-control" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ minHeight: '42px', padding: '8px' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button className="btn btn-outline" onClick={() => { setStartDate(''); setEndDate(''); }} style={{ minHeight: '42px', padding: '8px 15px' }}>
                  Clear Filter
                </button>
              </div>
            </div>

            {loadingLedger ? (
              <div style={{ padding: '40px', textAlign: 'center' }}>Loading ledger history...</div>
            ) : (
              // Bahi-Khata ledger container
              <div className="ledger-book">
                <table className="ledger-table">
                  <thead>
                    <tr>
                      <th style={{ width: '120px' }}>Date</th>
                      <th>Description</th>
                      <th style={{ width: '130px', textAlign: 'right' }}>Supply (+)</th>
                      <th style={{ width: '130px', textAlign: 'right' }}>Collection (-)</th>
                      <th style={{ width: '150px', textAlign: 'right' }}>Running Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledgerWithBalances.length === 0 ? (
                      <tr>
                        <td colSpan="5" style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                          No entries logged in this period.
                        </td>
                      </tr>
                    ) : (
                      // Reverse order to show latest first? 
                      // For a running balance, chronologically ascending matches paper book. 
                      // We list them ascending so balance sums make logic, but reverse it if you want latest first.
                      // Let's show ascending so the math adds up row by row.
                      ledgerWithBalances.map((entry, idx) => (
                        <tr key={idx} style={{ backgroundColor: entry.type === 'COLLECTION' ? 'var(--success-light)' : 'transparent' }}>
                          <td>
                            {new Date(entry.date).toLocaleDateString('en-IN')}
                            {entry.time && (
                              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                                {entry.time}
                              </div>
                            )}
                          </td>
                          <td>
                            <strong>{entry.type}</strong> <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>[{entry.invoiceNo}]</span>
                            <br />
                            <span style={{ fontSize: '14px', color: '#475569' }}>{entry.desc}</span>
                          </td>
                          <td className="supply-amount">
                            {entry.type === 'SUPPLY' ? `Rs. ${entry.amount.toFixed(2)}` : '-'}
                          </td>
                          <td className="collect-amount">
                            {entry.type === 'COLLECTION' ? `Rs. ${entry.amount.toFixed(2)}` : '-'}
                          </td>
                          <td className="running-bal" style={{ color: entry.runningBal > 0 ? 'var(--danger)' : 'var(--success)' }}>
                            Rs. {entry.runningBal.toFixed(2)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ADD/EDIT CUSTOMER MODAL */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>{isEditing ? '✏️ Edit Customer Profile' : '👤 Add New Customer'}</h2>
            <form onSubmit={handleSaveCustomer} style={{ marginTop: '15px' }}>
              <div className="form-group">
                <label className="form-label">Customer Full Name *</label>
                <input 
                  type="text" 
                  className="form-control" 
                  required 
                  value={formName} 
                  onChange={e => setFormName(e.target.value)} 
                  placeholder="e.g. Ramesh Kumar"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Mobile Phone Number (Optional)</label>
                <input 
                  type="tel" 
                  className="form-control" 
                  value={formMobile} 
                  onChange={e => setFormMobile(e.target.value)} 
                  placeholder="e.g. 9876543210"
                />
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Delivery Area (Optional)</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={formArea} 
                    onChange={e => setFormArea(e.target.value)} 
                    placeholder="e.g. Shastri Colony"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Customer Type</label>
                  <select 
                    className="form-control" 
                    value={formType} 
                    onChange={e => setFormType(e.target.value)}
                  >
                    <option value="Home">Home (Household)</option>
                    <option value="Shop">Shop (Retail / Tea Stall)</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Complete Address</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={formAddress} 
                  onChange={e => setFormAddress(e.target.value)} 
                  placeholder="e.g. House No. 24, Street 3"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Special Delivery Instructions / Notes</label>
                <textarea 
                  className="form-control" 
                  value={formNotes} 
                  onChange={e => setFormNotes(e.target.value)} 
                  placeholder="e.g. Needs 2 packets by 6 AM, leave on gate"
                  style={{ minHeight: '80px', fontFamily: 'inherit' }}
                />
              </div>

              {isEditing && (
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select 
                    className="form-control" 
                    value={formStatus} 
                    onChange={e => setFormStatus(e.target.value)}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', marginTop: '25px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-success">
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
