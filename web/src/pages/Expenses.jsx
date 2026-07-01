import React, { useState, useEffect } from 'react';
import { api } from '../api';

export default function Expenses({ 
  expensesList, 
  onRefresh, 
  triggerAddOpen, 
  setTriggerAddOpen 
}) {
  const [showModal, setShowModal] = useState(false);
  const [categories, setCategories] = useState([]);
  const [stats, setStats] = useState({ categoryBreakdown: [], monthlyTrend: [] });
  const [loadingStats, setLoadingStats] = useState(false);

  // Form State
  const [expenseCategoryId, setExpenseCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  // Custom category form
  const [showCatInput, setShowCatInput] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  // Date range for report export
  const [expReportStart, setExpReportStart] = useState('');
  const [expReportEnd, setExpReportEnd] = useState('');

  useEffect(() => {
    loadCategories();
    loadStats();
  }, [expensesList]);

  useEffect(() => {
    if (triggerAddOpen) {
      handleOpenAdd();
      setTriggerAddOpen(false);
    }
  }, [triggerAddOpen]);

  const loadCategories = async () => {
    try {
      const data = await api.getExpenseCategories();
      setCategories(data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadStats = async () => {
    setLoadingStats(true);
    try {
      const data = await api.getExpenseStats();
      setStats(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleOpenAdd = () => {
    setExpenseCategoryId(categories[0]?._id || '');
    setAmount('');
    setDate(new Date().toISOString().split('T')[0]);
    setNotes('');
    setShowModal(true);
  };

  const handleSaveExpense = async (e) => {
    e.preventDefault();
    if (!expenseCategoryId || !amount || Number(amount) <= 0) {
      alert("Please choose a category and enter a valid amount.");
      return;
    }

    try {
      await api.createExpense({
        category: expenseCategoryId,
        amount: Number(amount),
        date,
        notes
      });
      setShowModal(false);
      onRefresh();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCatName) return;
    try {
      const cat = await api.createExpenseCategory(newCatName);
      setCategories([...categories, cat]);
      setExpenseCategoryId(cat._id);
      setNewCatName('');
      setShowCatInput(false);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteExpense = async (id) => {
    if (window.confirm("Are you sure you want to delete this expense record?")) {
      try {
        await api.deleteExpense(id);
        onRefresh();
      } catch (err) {
        alert(err.message);
      }
    }
  };

  // Metrics
  const todayStr = new Date().toISOString().split('T')[0];
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0,0,0,0);

  const todayTotal = expensesList
    .filter(e => new Date(e.date).toISOString().split('T')[0] === todayStr)
    .reduce((sum, e) => sum + e.amount, 0);

  const monthlyTotal = expensesList
    .filter(e => new Date(e.date) >= startOfMonth)
    .reduce((sum, e) => sum + e.amount, 0);

  // SVG graphic helpers
  const maxCategoryAmt = Math.max(...stats.categoryBreakdown.map(b => b.amount), 1);
  const maxTrendAmt = Math.max(...stats.monthlyTrend.map(b => b.amount), 1);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h1>Expense Management</h1>
          <p style={{ color: 'var(--text-muted)' }}>Log business outlays, manage customized expense ledger columns & view visual trend charts</p>
        </div>
        <button className="btn btn-danger" onClick={handleOpenAdd} style={{ fontSize: '18px' }}>
          💸 + Record Expense Entry
        </button>
      </div>

      {/* Overview stats cards */}
      <div className="grid-2" style={{ marginBottom: '25px' }}>
        <div className="register-card" style={{ borderColor: 'var(--danger)', borderLeft: '8px solid var(--danger)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ color: 'var(--text-muted)', fontSize: '16px', fontWeight: 'bold' }}>TODAY'S EXPENSES</p>
            <h2 style={{ fontSize: '36px', color: 'var(--danger)', fontWeight: '800', marginTop: '5px' }}>Rs. {todayTotal.toFixed(2)}</h2>
          </div>
          <span style={{ fontSize: '32px' }}>⛽</span>
        </div>
        <div className="register-card" style={{ borderColor: 'var(--danger)', borderLeft: '8px solid var(--danger)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ color: 'var(--text-muted)', fontSize: '16px', fontWeight: 'bold' }}>MONTHLY EXPENSES</p>
            <h2 style={{ fontSize: '36px', color: 'var(--danger)', fontWeight: '800', marginTop: '5px' }}>Rs. {monthlyTotal.toFixed(2)}</h2>
          </div>
          <span style={{ fontSize: '32px' }}>📊</span>
        </div>
      </div>

      <div className="grid-2" style={{ alignItems: 'flex-start' }}>
        {/* Left: Expenses log list */}
        <div className="register-card">
          <h2>📜 Expenditures Log Book</h2>
          <div className="ledger-book" style={{ marginTop: '15px' }}>
            <table className="ledger-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Category</th>
                  <th>Notes</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                  <th style={{ textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {expensesList.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '20px' }}>No expenses recorded.</td>
                  </tr>
                ) : (
                  expensesList.map(e => (
                    <tr key={e._id}>
                      <td>{new Date(e.date).toLocaleDateString('en-IN')}</td>
                      <td>
                        <span className="badge" style={{ backgroundColor: 'var(--danger-light)', color: 'var(--danger)' }}>
                          {e.category?.name || 'Uncategorized'}
                        </span>
                      </td>
                      <td><span style={{ fontSize: '14px' }}>{e.notes || '-'}</span></td>
                      <td style={{ textAlign: 'right', fontWeight: 'bold', color: 'var(--danger)' }}>
                        Rs. {e.amount.toFixed(2)}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button 
                          onClick={() => handleDeleteExpense(e._id)} 
                          style={{ border: 'none', background: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '18px' }}
                          title="Delete Expense Log"
                        >
                          🗑
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Charts and Export Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Charts card */}
          <div className="register-card">
            <h2>📈 Expense Analytics</h2>
            
            {loadingStats ? (
              <div style={{ padding: '20px', textAlign: 'center' }}>Loading expense graphs...</div>
            ) : (
              <div style={{ marginTop: '20px' }}>
                
                {/* Horizontal Progress Bars: Category Breakdown */}
                <h4 style={{ marginBottom: '15px', color: 'var(--text-main)' }}>Category-wise Spending</h4>
                {stats.categoryBreakdown.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '14px', fontStyle: 'italic', marginBottom: '20px' }}>No categories data.</p>
                ) : (
                  stats.categoryBreakdown.map((item, idx) => {
                    const percentage = (item.amount / maxCategoryAmt) * 100;
                    return (
                      <div key={idx} style={{ marginBottom: '15px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: '600', marginBottom: '5px' }}>
                          <span>🏷 {item.category}</span>
                          <span>Rs. {item.amount}</span>
                        </div>
                        <div style={{ width: '100%', height: '14px', backgroundColor: '#e2e8f0', borderRadius: '99px', overflow: 'hidden' }}>
                          <div style={{ width: `${percentage}%`, height: '100%', backgroundColor: 'var(--danger)', borderRadius: '99px' }} />
                        </div>
                      </div>
                    );
                  })
                )}

                {/* Vertical Bar Chart: Monthly Trend */}
                <h4 style={{ marginTop: '30px', marginBottom: '15px', color: 'var(--text-main)' }}>Monthly Outlay Trend</h4>
                {stats.monthlyTrend.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '14px', fontStyle: 'italic' }}>No trend logs.</p>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'flex-end', height: '180px', borderBottom: '2px solid var(--border-color)', paddingBottom: '10px', gap: '20px', overflowX: 'auto', paddingTop: '20px' }}>
                    {stats.monthlyTrend.map((t, idx) => {
                      const percentage = (t.amount / maxTrendAmt) * 130; // max height 130px
                      return (
                        <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, minWidth: '50px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--danger)', marginBottom: '5px' }}>Rs.{t.amount}</span>
                          <div style={{ width: '24px', height: `${Math.max(percentage, 5)}px`, backgroundColor: 'var(--primary)', borderRadius: '6px 6px 0 0' }} />
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px', whiteSpace: 'nowrap' }}>{t.month}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

              </div>
            )}
          </div>

          {/* Export Report action */}
          <div className="register-card" style={{ borderColor: 'var(--primary)', borderWidth: '2px' }}>
            <h3 style={{ color: 'var(--primary)', marginBottom: '10px' }}>📄 Export PDF Expense Report</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '15px', marginBottom: '15px' }}>Select date range to download complete PDF statement</p>
            
            <div className="grid-2" style={{ gap: '10px', marginBottom: '15px' }}>
              <div>
                <label className="form-label" style={{ fontSize: '13px' }}>From Date</label>
                <input type="date" className="form-control" value={expReportStart} onChange={e => setExpReportStart(e.target.value)} style={{ padding: '8px', minHeight: '40px', fontSize: '15px' }} />
              </div>
              <div>
                <label className="form-label" style={{ fontSize: '13px' }}>To Date</label>
                <input type="date" className="form-control" value={expReportEnd} onChange={e => setExpReportEnd(e.target.value)} style={{ padding: '8px', minHeight: '40px', fontSize: '15px' }} />
              </div>
            </div>

            <a 
              href={api.getExpensePdfUrl(expReportStart, expReportEnd)} 
              target="_blank" 
              rel="noreferrer" 
              className="btn btn-primary" 
              style={{ width: '100%', textDecoration: 'none', fontWeight: 'bold' }}
            >
              📥 Download Expense Statement PDF
            </a>
          </div>

        </div>
      </div>

      {/* RECORD EXPENSE MODAL */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>💸 Record Expense Outlay</h2>
            <form onSubmit={handleSaveExpense} style={{ marginTop: '15px' }}>
              
              <div className="form-group">
                <label className="form-label">Expense Category *</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <select 
                    className="form-control" 
                    required 
                    value={expenseCategoryId} 
                    onChange={e => setExpenseCategoryId(e.target.value)}
                    style={{ flex: 1 }}
                  >
                    {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </select>
                  <button 
                    type="button" 
                    className="btn btn-outline" 
                    onClick={() => setShowCatInput(!showCatInput)}
                    style={{ minWidth: '50px', padding: '0 15px' }}
                  >
                    🏷 + Category
                  </button>
                </div>
              </div>

              {/* Add Custom Category Form */}
              {showCatInput && (
                <div style={{ backgroundColor: 'var(--bg-paper)', padding: '15px', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '15px' }}>
                  <label className="form-label" style={{ fontSize: '14px' }}>Add Custom Category Name</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="e.g. Ice Blocks or Depot Repairs"
                      value={newCatName}
                      onChange={e => setNewCatName(e.target.value)}
                      style={{ flex: 1, minHeight: '40px', padding: '8px' }}
                    />
                    <button type="button" className="btn btn-primary" onClick={handleAddCategory} style={{ minHeight: '40px', padding: '8px 15px', fontSize: '15px' }}>
                      Add
                    </button>
                  </div>
                </div>
              )}

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Amount Paid (Rs.) *</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    required 
                    placeholder="e.g. 500"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Expense Date</label>
                  <input type="date" className="form-control" required value={date} onChange={e => setDate(e.target.value)} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Notes / Remarks</label>
                <textarea 
                  className="form-control" 
                  placeholder="e.g. Purchased 40 Litres Diesel for Loading Auto"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  style={{ minHeight: '80px', fontFamily: 'inherit' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '25px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-danger">
                  Save Expense Outlay
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
