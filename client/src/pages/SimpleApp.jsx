import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  getStockReport,
  getTransactions,
  addPurchase,
  addDispatch,
  addSale,
  createItem,
  reverseTransaction,
} from '../services/api';
import toast from 'react-hot-toast';
import {
  Plus,
  ArrowRight,
  TrendingUp,
  Warehouse,
  Home,
  ShoppingBag,
  RotateCcw,
  Search,
  Download,
  LogOut,
  X,
  Check,
  RefreshCw,
  Package,
} from 'lucide-react';

const SimpleApp = () => {
  const { user, logoutUser } = useAuth();
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [recentActions, setRecentActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Active Action Modal (Stock In / Move to Shop / Sale)
  const [actionModal, setActionModal] = useState(null); // { type: 'purchase' | 'dispatch' | 'sale', item }
  const [quantity, setQuantity] = useState(5);
  const [customerName, setCustomerName] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Add Item Modal
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemOpeningBales, setNewItemOpeningBales] = useState(0);

  const loadData = async () => {
    try {
      setLoading(true);
      const [reportRes, txRes] = await Promise.all([
        getStockReport(),
        getTransactions({ limit: 10 }),
      ]);
      setItems(reportRes.data.data || []);
      setRecentActions(txRes.data.data || []);
    } catch {
      toast.error('Failed to load stock data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleLogout = () => {
    logoutUser();
    navigate('/login');
  };

  const openAction = (type, item) => {
    setActionModal({ type, item });
    setQuantity(type === 'purchase' ? 10 : type === 'dispatch' ? 5 : 1);
    setCustomerName('');
    setNote('');
  };

  const closeActionModal = () => {
    setActionModal(null);
  };

  const adjustQty = (delta) => {
    setQuantity((prev) => {
      const next = prev + delta;
      if (actionModal?.type === 'dispatch' && next > actionModal.item.godown) {
        toast.error(`Only ${actionModal.item.godown} bales available in Godown`);
        return prev;
      }
      if (actionModal?.type === 'sale' && next > actionModal.item.home) {
        toast.error(`Only ${actionModal.item.home} bales available in Shop`);
        return prev;
      }
      return Math.max(1, next);
    });
  };

  const handleConfirmAction = async () => {
    if (!actionModal) return;
    const { type, item } = actionModal;
    const qty = Number(quantity);

    if (qty <= 0) {
      toast.error('Please enter a valid quantity of bales');
      return;
    }

    if (type === 'dispatch' && qty > item.godown) {
      toast.error(`Cannot move ${qty} bales. Godown only has ${item.godown} bales.`);
      return;
    }

    if (type === 'sale' && qty > item.home) {
      toast.error(`Cannot sell ${qty} bales. Shop only has ${item.home} bales.`);
      return;
    }

    setSubmitting(true);
    try {
      if (type === 'purchase') {
        await addPurchase({
          itemId: item._id,
          quantity: qty,
          transactionDate: new Date().toISOString().split('T')[0],
          remarks: note || 'New stock inward',
        });
        toast.success(`Added ${qty} bales of ${item.itemName} to Godown!`);
      } else if (type === 'dispatch') {
        await addDispatch({
          itemId: item._id,
          quantity: qty,
          transactionDate: new Date().toISOString().split('T')[0],
          remarks: note || 'Moved to shop',
        });
        toast.success(`Moved ${qty} bales of ${item.itemName} to Shop!`);
      } else if (type === 'sale') {
        await addSale({
          itemId: item._id,
          quantity: qty,
          customerName: customerName || 'Cash Customer',
          transactionDate: new Date().toISOString().split('T')[0],
          remarks: note || 'Sold to customer',
        });
        toast.success(`Recorded sale of ${qty} bales of ${item.itemName}!`);
      }

      closeActionModal();
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateItem = async (e) => {
    e.preventDefault();
    if (!newItemName.trim()) {
      toast.error('Please enter a cloth name');
      return;
    }

    setSubmitting(true);
    try {
      const res = await createItem({
        itemName: newItemName.trim(),
        description: 'Textile cut piece / cloth roll',
      });

      const opening = Number(newItemOpeningBales);
      if (opening > 0 && res.data.data?._id) {
        await addPurchase({
          itemId: res.data.data._id,
          quantity: opening,
          transactionDate: new Date().toISOString().split('T')[0],
          remarks: 'Initial stock',
        });
      }

      toast.success(`Added ${newItemName.trim()} to stock!`);
      setNewItemName('');
      setNewItemOpeningBales(0);
      setShowAddItemModal(false);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add item');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUndo = async (tx) => {
    if (!window.confirm('Do you want to undo this action?')) return;
    try {
      await reverseTransaction(tx._id, { correctionReason: 'User mistake undo' });
      toast.success('Action undone successfully.');
      loadData();
    } catch {
      toast.error('Could not undo transaction.');
    }
  };

  const exportCSV = () => {
    if (items.length === 0) {
      toast.error('No items to export');
      return;
    }
    const headers = ['Cloth Name', 'Godown Bales', 'Shop Bales', 'Total Remaining', 'Total Sold'];
    const rows = items.map((i) => [
      `"${i.itemName}"`,
      i.godown || 0,
      i.home || 0,
      (i.godown || 0) + (i.home || 0),
      i.sold || 0,
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `Kishore_Stock_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Stock report downloaded.');
  };

  // Calculations
  const totalGodown = items.reduce((sum, i) => sum + (i.godown || 0), 0);
  const totalShop = items.reduce((sum, i) => sum + (i.home || 0), 0);
  const totalSold = items.reduce((sum, i) => sum + (i.sold || 0), 0);
  const totalRemaining = totalGodown + totalShop;

  const filteredItems = items.filter((i) =>
    i.itemName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', color: '#0f172a' }}>
      
      {/* Top Clean Navbar */}
      <nav
        style={{
          background: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          position: 'sticky',
          top: 0,
          zIndex: 40,
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        }}
      >
        <div
          style={{
            maxWidth: '1050px',
            margin: '0 auto',
            padding: '14px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          {/* Logo & Shop Name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                background: '#16a34a',
                color: '#ffffff',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                fontSize: '18px',
                boxShadow: '0 2px 6px rgba(22,163,74,0.3)',
              }}
            >
              K
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '16px', lineHeight: 1.2 }}>
                Kishore Cloth & Cut Pieces
              </div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>
                Simple Stock Manager
              </div>
            </div>
          </div>

          {/* Action Buttons & Logout */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={() => setShowAddItemModal(true)}
              style={{
                background: '#16a34a',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                padding: '9px 15px',
                fontWeight: 700,
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(22,163,74,0.25)',
              }}
            >
              <Plus size={16} />
              + Add Cloth
            </button>

            <button
              onClick={exportCSV}
              title="Download Excel / CSV Report"
              style={{
                background: '#f1f5f9',
                color: '#334155',
                border: '1px solid #cbd5e1',
                borderRadius: '10px',
                padding: '9px 12px',
                fontWeight: 600,
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
              }}
            >
              <Download size={15} />
              Report
            </button>

            <button
              onClick={loadData}
              title="Refresh Stock"
              style={{
                background: '#f1f5f9',
                color: '#334155',
                border: '1px solid #cbd5e1',
                borderRadius: '10px',
                padding: '9px 11px',
                cursor: 'pointer',
              }}
            >
              <RefreshCw size={15} />
            </button>

            <button
              onClick={handleLogout}
              title="Sign Out"
              style={{
                background: '#fee2e2',
                color: '#dc2626',
                border: '1px solid #fca5a5',
                borderRadius: '10px',
                padding: '9px 12px',
                fontWeight: 600,
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer',
              }}
            >
              <LogOut size={14} />
              Logout
            </button>
          </div>
        </div>
      </nav>

      {/* Main Page Body */}
      <main style={{ maxWidth: '1050px', margin: '0 auto', padding: '24px 16px 80px' }}>
        
        {/* Modern 3-Card Summary Banner */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
            gap: '16px',
            marginBottom: '28px',
          }}
        >
          {/* Godown Card */}
          <div
            style={{
              background: '#ffffff',
              border: '1.5px solid #bbf7d0',
              borderRadius: '18px',
              padding: '18px 20px',
              boxShadow: '0 4px 12px rgba(22, 163, 74, 0.06)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Godown Stock
              </div>
              <div style={{ fontSize: '32px', fontWeight: 900, color: '#15803d', marginTop: '2px', lineHeight: 1 }}>
                {totalGodown}
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                Total bales in storage
              </div>
            </div>
            <div
              style={{
                width: '46px',
                height: '46px',
                background: '#dcfce7',
                color: '#16a34a',
                borderRadius: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '22px',
              }}
            >
              🏢
            </div>
          </div>

          {/* Shop Card */}
          <div
            style={{
              background: '#ffffff',
              border: '1.5px solid #bfdbfe',
              borderRadius: '18px',
              padding: '18px 20px',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.06)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Shop Stock
              </div>
              <div style={{ fontSize: '32px', fontWeight: 900, color: '#1d4ed8', marginTop: '2px', lineHeight: 1 }}>
                {totalShop}
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                Bales ready for customers
              </div>
            </div>
            <div
              style={{
                width: '46px',
                height: '46px',
                background: '#dbeafe',
                color: '#2563eb',
                borderRadius: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '22px',
              }}
            >
              🏠
            </div>
          </div>

          {/* Sold Card */}
          <div
            style={{
              background: '#ffffff',
              border: '1.5px solid #fde68a',
              borderRadius: '18px',
              padding: '18px 20px',
              boxShadow: '0 4px 12px rgba(217, 119, 6, 0.06)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Total Sold
              </div>
              <div style={{ fontSize: '32px', fontWeight: 900, color: '#b45309', marginTop: '2px', lineHeight: 1 }}>
                {totalSold}
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                Bales sold to buyers
              </div>
            </div>
            <div
              style={{
                width: '46px',
                height: '46px',
                background: '#fef3c7',
                color: '#d97706',
                borderRadius: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '22px',
              }}
            >
              💰
            </div>
          </div>
        </div>

        {/* Section Header & Simple Search */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div>
            <h2 style={{ fontSize: '19px', fontWeight: 800, margin: 0 }}>
              Cloth Stock & Actions
            </h2>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '2px 0 0' }}>
              Tap on any button below to add stock, move to shop, or record a sale
            </p>
          </div>

          {/* Search Input */}
          <div style={{ position: 'relative', minWidth: '220px' }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#94a3b8',
              }}
            />
            <input
              type="text"
              placeholder="Search cloth name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px 9px 36px',
                borderRadius: '12px',
                border: '1.5px solid #cbd5e1',
                background: '#ffffff',
                fontSize: '13.5px',
                outline: 'none',
              }}
            />
          </div>
        </div>

        {/* CLOTH CARDS LIST */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '50px 20px', color: '#64748b' }}>
              <div className="spinner" style={{ margin: '0 auto 12px' }} />
              Loading stock balances...
            </div>
          ) : filteredItems.length === 0 ? (
            <div
              style={{
                background: '#ffffff',
                border: '1.5px solid #e2e8f0',
                borderRadius: '18px',
                padding: '40px 20px',
                textAlign: 'center',
                color: '#64748b',
              }}
            >
              <Package size={40} style={{ opacity: 0.4, margin: '0 auto 8px' }} />
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#334155' }}>
                No items found
              </h3>
              <p style={{ fontSize: '13px', margin: '4px 0 16px' }}>
                {searchTerm ? 'Try a different search keyword.' : 'Get started by adding your first cloth.'}
              </p>
              <button
                onClick={() => setShowAddItemModal(true)}
                style={{
                  background: '#16a34a',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '9px 18px',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                + Add New Cloth
              </button>
            </div>
          ) : (
            filteredItems.map((item) => (
              <div
                key={item._id}
                style={{
                  background: '#ffffff',
                  border: '1.5px solid #e2e8f0',
                  borderRadius: '18px',
                  padding: '18px 20px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                  transition: 'all 0.15s ease',
                }}
              >
                {/* Item Info Header */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '14px',
                    flexWrap: 'wrap',
                    gap: '10px',
                  }}
                >
                  <div>
                    <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                      {item.itemName}
                    </h3>
                    <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
                      Code: {item.itemCode || item.itemName.toUpperCase()}
                    </span>
                  </div>

                  {/* Stock Badges */}
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <div
                      style={{
                        background: (item.godown || 0) > 0 ? '#f0fdf4' : '#fef2f2',
                        border: '1px solid ' + ((item.godown || 0) > 0 ? '#bbf7d0' : '#fecaca'),
                        color: (item.godown || 0) > 0 ? '#15803d' : '#991b1b',
                        borderRadius: '10px',
                        padding: '6px 14px',
                        textAlign: 'center',
                      }}
                    >
                      <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>Godown</div>
                      <div style={{ fontSize: '18px', fontWeight: 900 }}>
                        {item.godown || 0} <span style={{ fontSize: '11px', fontWeight: 600 }}>bales</span>
                      </div>
                    </div>

                    <div
                      style={{
                        background: (item.home || 0) > 0 ? '#eff6ff' : '#f8fafc',
                        border: '1px solid ' + ((item.home || 0) > 0 ? '#bfdbfe' : '#e2e8f0'),
                        color: (item.home || 0) > 0 ? '#1d4ed8' : '#64748b',
                        borderRadius: '10px',
                        padding: '6px 14px',
                        textAlign: 'center',
                      }}
                    >
                      <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>In Shop</div>
                      <div style={{ fontSize: '18px', fontWeight: 900 }}>
                        {item.home || 0} <span style={{ fontSize: '11px', fontWeight: 600 }}>bales</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3 Large Action Buttons */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                    gap: '10px',
                    marginTop: '8px',
                  }}
                >
                  {/* Action 1: Stock In */}
                  <button
                    onClick={() => openAction('purchase', item)}
                    style={{
                      background: '#f0fdf4',
                      color: '#15803d',
                      border: '1.5px solid #86efac',
                      borderRadius: '12px',
                      padding: '12px 10px',
                      fontWeight: 800,
                      fontSize: '13.5px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#dcfce7')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = '#f0fdf4')}
                  >
                    <span style={{ fontSize: '18px' }}>📥</span>
                    <span>+ Stock In</span>
                  </button>

                  {/* Action 2: Move to Shop */}
                  <button
                    onClick={() => openAction('dispatch', item)}
                    disabled={(item.godown || 0) <= 0}
                    style={{
                      background: (item.godown || 0) > 0 ? '#eff6ff' : '#f8fafc',
                      color: (item.godown || 0) > 0 ? '#1d4ed8' : '#94a3b8',
                      border: '1.5px solid ' + ((item.godown || 0) > 0 ? '#93c5fd' : '#e2e8f0'),
                      borderRadius: '12px',
                      padding: '12px 10px',
                      fontWeight: 800,
                      fontSize: '13.5px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      cursor: (item.godown || 0) > 0 ? 'pointer' : 'not-allowed',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => (item.godown || 0) > 0 && (e.currentTarget.style.background = '#dbeafe')}
                    onMouseLeave={(e) => (item.godown || 0) > 0 && (e.currentTarget.style.background = '#eff6ff')}
                  >
                    <span style={{ fontSize: '18px' }}>🚚</span>
                    <span>Move to Shop</span>
                  </button>

                  {/* Action 3: Sold */}
                  <button
                    onClick={() => openAction('sale', item)}
                    disabled={(item.home || 0) <= 0}
                    style={{
                      background: (item.home || 0) > 0 ? '#fffbeb' : '#f8fafc',
                      color: (item.home || 0) > 0 ? '#b45309' : '#94a3b8',
                      border: '1.5px solid ' + ((item.home || 0) > 0 ? '#fde68a' : '#e2e8f0'),
                      borderRadius: '12px',
                      padding: '12px 10px',
                      fontWeight: 800,
                      fontSize: '13.5px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      cursor: (item.home || 0) > 0 ? 'pointer' : 'not-allowed',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => (item.home || 0) > 0 && (e.currentTarget.style.background = '#fef3c7')}
                    onMouseLeave={(e) => (item.home || 0) > 0 && (e.currentTarget.style.background = '#fffbeb')}
                  >
                    <span style={{ fontSize: '18px' }}>💰</span>
                    <span>Sold</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* RECENT ACTIVITY & RECEIPTS FEED */}
        <div
          style={{
            background: '#ffffff',
            border: '1.5px solid #e2e8f0',
            borderRadius: '18px',
            padding: '20px 22px',
            marginTop: '32px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: '#0f172a' }}>
              📋 Today's Activity Log
            </h3>
            <span style={{ fontSize: '12px', color: '#64748b' }}>Latest 10 actions</span>
          </div>

          {recentActions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px', color: '#94a3b8', fontSize: '13.5px' }}>
              No transactions recorded yet today.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {recentActions.map((tx) => {
                const isPurchase = tx.transactionType === 'purchase';
                const isDispatch = tx.transactionType === 'dispatch';

                return (
                  <div
                    key={tx._id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '11px 14px',
                      borderRadius: '12px',
                      background: tx.isReversed ? '#f8fafc' : isPurchase ? '#f0fdf4' : isDispatch ? '#eff6ff' : '#fffbeb',
                      border: '1px solid ' + (tx.isReversed ? '#e2e8f0' : isPurchase ? '#bbf7d0' : isDispatch ? '#bfdbfe' : '#fde68a'),
                      opacity: tx.isReversed ? 0.45 : 1,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '18px' }}>
                        {isPurchase ? '📥' : isDispatch ? '🚚' : '💰'}
                      </span>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                          <strong>{tx.itemId?.itemName || 'Cloth'}</strong> –{' '}
                          <span style={{ color: isPurchase ? '#15803d' : isDispatch ? '#1d4ed8' : '#b45309' }}>
                            {tx.quantity} bales{' '}
                            {isPurchase ? 'added to Godown' : isDispatch ? 'moved to Shop' : 'Sold'}
                          </span>
                        </div>
                        <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                          {tx.customerName ? `Customer: ${tx.customerName} • ` : ''}
                          {tx.remarks ? `${tx.remarks} • ` : ''}
                          {new Date(tx.transactionDate || tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>

                    {!tx.isReversed && (
                      <button
                        onClick={() => handleUndo(tx)}
                        title="Made a mistake? Undo this entry"
                        style={{
                          background: '#ffffff',
                          border: '1px solid #fca5a5',
                          color: '#dc2626',
                          borderRadius: '8px',
                          padding: '5px 9px',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <RotateCcw size={12} />
                        Undo
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* ACTION STEPPER MODAL */}
      {actionModal && (
        <div className="modal-overlay" onClick={closeActionModal} style={{ zIndex: 1000 }}>
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '440px',
              borderRadius: '24px',
              padding: '24px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '28px' }}>
                  {actionModal.type === 'purchase' ? '📥' : actionModal.type === 'dispatch' ? '🚚' : '💰'}
                </span>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 900, margin: 0, color: '#0f172a' }}>
                    {actionModal.type === 'purchase'
                      ? 'Stock In to Godown'
                      : actionModal.type === 'dispatch'
                      ? 'Move Stock to Shop'
                      : 'Record Customer Sale'}
                  </h3>
                  <div style={{ fontSize: '13px', color: '#16a34a', fontWeight: 700 }}>
                    {actionModal.item.itemName}
                  </div>
                </div>
              </div>
              <button
                onClick={closeActionModal}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Current Stock Banner */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px dashed #cbd5e1',
                borderRadius: '12px',
                padding: '10px 14px',
                marginBottom: '18px',
                fontSize: '12.5px',
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <span>Godown: <strong>{actionModal.item.godown || 0} bales</strong></span>
              <span>Shop: <strong>{actionModal.item.home || 0} bales</strong></span>
            </div>

            {/* Big Stepper Quantity Display */}
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                Quantity (Bales)
              </div>
              <div
                style={{
                  fontSize: '52px',
                  fontWeight: 900,
                  color: actionModal.type === 'purchase' ? '#15803d' : actionModal.type === 'dispatch' ? '#1d4ed8' : '#b45309',
                  lineHeight: 1.1,
                  margin: '10px 0',
                }}
              >
                {quantity}
              </div>

              {/* Stepper Buttons */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => adjustQty(-5)}
                  style={{
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    borderRadius: '10px',
                    padding: '8px 14px',
                    fontSize: '14px',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  -5
                </button>
                <button
                  type="button"
                  onClick={() => adjustQty(-1)}
                  style={{
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    borderRadius: '10px',
                    padding: '8px 14px',
                    fontSize: '14px',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  -1
                </button>
                <button
                  type="button"
                  onClick={() => adjustQty(1)}
                  style={{
                    background: '#dcfce7',
                    border: '1.5px solid #86efac',
                    color: '#15803d',
                    borderRadius: '10px',
                    padding: '8px 16px',
                    fontSize: '15px',
                    fontWeight: 900,
                    cursor: 'pointer',
                  }}
                >
                  +1
                </button>
                <button
                  type="button"
                  onClick={() => adjustQty(5)}
                  style={{
                    background: '#dcfce7',
                    border: '1.5px solid #86efac',
                    color: '#15803d',
                    borderRadius: '10px',
                    padding: '8px 14px',
                    fontSize: '15px',
                    fontWeight: 900,
                    cursor: 'pointer',
                  }}
                >
                  +5
                </button>
                <button
                  type="button"
                  onClick={() => adjustQty(10)}
                  style={{
                    background: '#dcfce7',
                    border: '1.5px solid #86efac',
                    color: '#15803d',
                    borderRadius: '10px',
                    padding: '8px 14px',
                    fontSize: '15px',
                    fontWeight: 900,
                    cursor: 'pointer',
                  }}
                >
                  +10
                </button>
              </div>
            </div>

            {/* Optional Customer Name if Sale */}
            {actionModal.type === 'sale' && (
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                  Customer Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sri Balaji Silks / Retail Buyer"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    fontSize: '14px',
                    borderRadius: '10px',
                    border: '1.5px solid #cbd5e1',
                    outline: 'none',
                  }}
                />
              </div>
            )}

            {/* Optional Note */}
            <div style={{ marginBottom: '18px' }}>
              <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                Note / Bill # (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Lorry # / Invoice # / Cash"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  fontSize: '14px',
                  borderRadius: '10px',
                  border: '1.5px solid #cbd5e1',
                  outline: 'none',
                }}
              />
            </div>

            {/* Big Confirm Button */}
            <button
              type="button"
              onClick={handleConfirmAction}
              disabled={submitting}
              style={{
                width: '100%',
                background: actionModal.type === 'purchase' ? '#16a34a' : actionModal.type === 'dispatch' ? '#2563eb' : '#d97706',
                color: '#ffffff',
                border: 'none',
                borderRadius: '14px',
                padding: '15px',
                fontSize: '16px',
                fontWeight: 900,
                cursor: submitting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
              }}
            >
              <Check size={20} />
              {submitting ? 'Saving...' : 'Confirm & Save'}
            </button>
          </div>
        </div>
      )}

      {/* ADD CLOTH MODAL */}
      {showAddItemModal && (
        <div className="modal-overlay" onClick={() => setShowAddItemModal(false)} style={{ zIndex: 1000 }}>
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '420px',
              borderRadius: '24px',
              padding: '24px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 900, margin: 0, color: '#0f172a' }}>
                + Add New Cloth Material
              </h3>
              <button
                onClick={() => setShowAddItemModal(false)}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateItem}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                  Cloth / Item Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Cotton Voile / Zari Boota"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    fontSize: '14.5px',
                    borderRadius: '10px',
                    border: '1.5px solid #cbd5e1',
                    outline: 'none',
                  }}
                  required
                  autoFocus
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                  Starting Godown Bales (Optional)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="0"
                  value={newItemOpeningBales}
                  onChange={(e) => setNewItemOpeningBales(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    fontSize: '14.5px',
                    borderRadius: '10px',
                    border: '1.5px solid #cbd5e1',
                    outline: 'none',
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                style={{
                  width: '100%',
                  background: '#16a34a',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '14px',
                  fontSize: '15px',
                  fontWeight: 800,
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <Plus size={18} />
                {submitting ? 'Adding...' : 'Save New Cloth'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default SimpleApp;

