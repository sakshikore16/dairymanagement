import React from 'react';

export default function Dashboard({ stats, onNavigate, onQuickAction }) {
  if (!stats) {
    return <div style={{ fontSize: '20px', padding: '20px' }}>Loading Dashboard...</div>;
  }

  // Cards layout configuration
  const cardData = [
    { title: "Today's Deliveries", val: stats.todayDeliveries, desc: "supplies completed morning", color: "var(--primary)" },
    { title: "Today's Sales", val: `Rs. ${stats.todaySales}`, desc: "total value of supplies today", color: "var(--primary)" },
    { title: "Today's Collection", val: `Rs. ${stats.todayMoneyCollected}`, desc: "money collected today", color: "var(--success)" },
    { title: "Pending Collections", val: `Rs. ${stats.pendingCollections}`, desc: "total customer outstanding debt", color: "var(--danger)" },
    { title: "Monthly Revenue", val: `Rs. ${stats.monthlyRevenue}`, desc: "total sales this calendar month", color: "var(--primary)" },
    { title: "Monthly Expenses", val: `Rs. ${stats.monthlyExpenses}`, desc: "total expenses this month", color: "var(--danger)" },
    { 
      title: "Net Profit", 
      val: `Rs. ${stats.netProfit}`, 
      desc: "monthly revenue minus expenses", 
      color: stats.netProfit >= 0 ? "var(--success)" : "var(--danger)",
      bg: stats.netProfit >= 0 ? "var(--success-light)" : "var(--danger-light)"
    },
    { title: "Total Customers", val: `${stats.activeCustomers} / ${stats.totalCustomers}`, desc: "active vs registered total", color: "var(--text-main)" },
    { title: "Low Stock Alert", val: stats.lowStockProducts, desc: "products near empty", color: stats.lowStockProducts > 0 ? "var(--danger)" : "var(--success)" }
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h1 style={{ marginBottom: '5px' }}>Register Dashboard</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '18px' }}>Daily Summary & Registers</p>
        </div>
        <button 
          className="btn btn-outline" 
          onClick={() => window.open(onQuickAction('excel-url'), '_blank')}
          style={{ fontSize: '16px', minHeight: '44px', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          📥 Download Monthly Excel Report
        </button>
      </div>

      {/* Low Stock Alerts Banner */}
      {stats.lowStockProducts > 0 && (
        <div style={{
          backgroundColor: 'var(--danger-light)',
          border: '3px solid var(--danger)',
          borderRadius: '16px',
          padding: '20px',
          marginBottom: '25px',
          color: 'var(--danger)',
        }}>
          <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '10px' }}>🚨 Low Stock Alert! ({stats.lowStockProducts} products)</h3>
          <ul style={{ paddingLeft: '20px', fontSize: '18px' }}>
            {stats.lowStockAlerts && stats.lowStockAlerts.map((item, idx) => (
              <li key={idx} style={{ marginBottom: '5px' }}>
                <strong>{item.name}</strong>: Only <strong>{item.currentStock} items</strong> left (Warning level: {item.minimumStockAlert})
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Quick Action Block */}
      <div className="register-card" style={{ border: '3px solid var(--primary)', backgroundColor: 'var(--primary-light)' }}>
        <h3 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--primary)', marginBottom: '15px' }}>⚡ QUICK ACTIONS</h3>
        <div className="grid-3" style={{ gap: '15px' }}>
          <button className="btn btn-primary" onClick={() => onQuickAction('add-supply')} style={{ fontSize: '18px', display: 'flex', gap: '10px' }}>
            🥛 Record Daily Supply
          </button>
          <button className="btn btn-success" onClick={() => onQuickAction('add-collection')} style={{ fontSize: '18px', display: 'flex', gap: '10px' }}>
            💸 Record Collection
          </button>
          <button className="btn btn-outline" onClick={() => onQuickAction('add-customer')} style={{ fontSize: '18px', display: 'flex', gap: '10px' }}>
            👤 Add New Customer
          </button>
          <button className="btn btn-outline" onClick={() => onQuickAction('add-product')} style={{ fontSize: '18px', display: 'flex', gap: '10px' }}>
            📦 Add Product Variant
          </button>
          <button className="btn btn-outline" onClick={() => onQuickAction('add-expense')} style={{ fontSize: '18px', display: 'flex', gap: '10px' }}>
            💸 Log Expense Entry
          </button>
          <button className="btn btn-outline" onClick={() => onNavigate('customers')} style={{ fontSize: '18px', display: 'flex', gap: '10px' }}>
            🔍 Search Ledger Registers
          </button>
        </div>
      </div>

      {/* Stat Cards Grid */}
      <div className="grid-3" style={{ marginTop: '25px', gap: '20px' }}>
        {cardData.map((card, i) => (
          <div 
            key={i} 
            className="register-card" 
            style={{ 
              backgroundColor: card.bg || 'var(--bg-card)', 
              borderColor: card.color,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: '160px'
            }}
          >
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '16px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{card.title}</p>
              <h2 style={{ fontSize: '32px', color: card.color, marginTop: '8px', marginBottom: '2px', fontWeight: '800' }}>{card.val}</h2>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', fontStyle: 'italic' }}>{card.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
