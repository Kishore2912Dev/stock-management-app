import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  getStockReport,
  getTransactions,
  addPurchase,
  addDispatch,
  createItem,
  deleteItem,
  reverseTransaction,
} from '../services/api';
import toast from 'react-hot-toast';
import {
  Plus,
  ArrowRight,
  Warehouse,
  Home,
  RotateCcw,
  Search,
  Download,
  LogOut,
  X,
  Check,
  RefreshCw,
  Package,
  Trash2,
  Truck,
} from 'lucide-react';

const DEFAULT_TRANSPORTS = ['Deepak', 'D.R.T.C', 'RAJKAMAL'];

const loadSavedTransports = () => {
  try {
    const raw = localStorage.getItem('kishore_stock_transports');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return DEFAULT_TRANSPORTS;
};

const saveTransports = (list) => {
  try {
    localStorage.setItem('kishore_stock_transports', JSON.stringify(list));
  } catch {}
};

const SimpleApp = () => {
  const { user, logoutUser } = useAuth();
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [recentActions, setRecentActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Active Action Modal (Stock In / Move to Home)
  const [actionModal, setActionModal] = useState(null); // { type: 'purchase' | 'dispatch', item }
  const [quantity, setQuantity] = useState(5);
  const [baleNumber, setBaleNumber] = useState('');
  const [transportName, setTransportName] = useState('Deepak');
  const [transportsList, setTransportsList] = useState(loadSavedTransports);
  const [showNewTransportInput, setShowNewTransportInput] = useState(false);
  const [newTransportText, setNewTransportText] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Delete Cloth Modal
  const [itemToDelete, setItemToDelete] = useState(null);

  // Add Item Modal
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemBaleNumber, setNewItemBaleNumber] = useState('');
  const [newItemOpeningBales, setNewItemOpeningBales] = useState(0);
  const [newItemTransport, setNewItemTransport] = useState('Deepak');
  const [showNewTransportInAdd, setShowNewTransportInAdd] = useState(false);
  const [newTransportInAddText, setNewTransportInAddText] = useState('');

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
    setQuantity(type === 'purchase' ? 10 : 5);
    setBaleNumber('');
    setTransportName(transportsList[0] || 'Deepak');
    setShowNewTransportInput(false);
    setNewTransportText('');
    setNote('');
  };

  const closeActionModal = () => {
    setActionModal(null);
  };

  // Stepper quantity adjustment (steppers: -5, -1, +1, +5)
  const adjustQty = (delta) => {
    setQuantity((prev) => {
      const next = prev + delta;
      if (actionModal?.type === 'dispatch' && next > actionModal.item.godown) {
        toast.error(`Only ${actionModal.item.godown} bales available in Godown`);
        return prev;
      }
      return Math.max(1, next);
    });
  };

  // Adjust starting bales in Add Cloth modal
  const adjustNewItemQty = (delta) => {
    setNewItemOpeningBales((prev) => Math.max(0, Number(prev || 0) + delta));
  };

  // Smart handler: Typing "2456*5" or "2456 * 5" auto-splits into Bale #2456 and Count 5
  const handleBaleNumberInput = (val) => {
    setBaleNumber(val);
    const match = val.match(/^([a-zA-Z0-9\-_]+)\s*[\*xX]\s*(\d+)$/);
    if (match) {
      const detectedBaleNo = match[1];
      const detectedCount = parseInt(match[2], 10);
      if (detectedCount > 0) {
        setBaleNumber(detectedBaleNo);
        setQuantity(detectedCount);
        toast.success(`Lot set: Bale #${detectedBaleNo} × ${detectedCount} bales`, {
          id: 'lot-detected',
          duration: 2000,
        });
      }
    }
  };

  // Smart handler for Add Cloth Modal
  const handleNewItemBaleNumberInput = (val) => {
    setNewItemBaleNumber(val);
    const match = val.match(/^([a-zA-Z0-9\-_]+)\s*[\*xX]\s*(\d+)$/);
    if (match) {
      const detectedBaleNo = match[1];
      const detectedCount = parseInt(match[2], 10);
      if (detectedCount > 0) {
        setNewItemBaleNumber(detectedBaleNo);
        setNewItemOpeningBales(detectedCount);
        toast.success(`Lot set: Bale #${detectedBaleNo} × ${detectedCount} bales`, {
          id: 'new-lot-detected',
          duration: 2000,
        });
      }
    }
  };

  const handleAddTransport = (text, isFromAddItem = false) => {
    const trimmed = text.trim();
    if (!trimmed) {
      toast.error('Please enter a transport name');
      return;
    }
    if (!transportsList.includes(trimmed)) {
      const updated = [...transportsList, trimmed];
      setTransportsList(updated);
      saveTransports(updated);
      toast.success(`Transport "${trimmed}" added!`);
    }
    if (isFromAddItem) {
      setNewItemTransport(trimmed);
      setShowNewTransportInAdd(false);
      setNewTransportInAddText('');
    } else {
      setTransportName(trimmed);
      setShowNewTransportInput(false);
      setNewTransportText('');
    }
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

    setSubmitting(true);
    try {
      const cleanBale = (baleNumber || '').trim();
      const cleanTransport = (transportName || '').trim();

      if (type === 'purchase') {
        await addPurchase({
          itemId: item._id,
          quantity: qty,
          baleNumber: cleanBale,
          transportName: cleanTransport,
          transactionDate: new Date().toISOString().split('T')[0],
          remarks: note || (cleanBale ? `Bale #${cleanBale} via ${cleanTransport || 'Direct'}` : 'Stock Inward'),
        });
        const lotInfo = cleanBale ? ` (Bale #${cleanBale} × ${qty})` : ` (${qty} bales)`;
        toast.success(`Added ${item.itemName} to Godown${lotInfo}!`);
      } else if (type === 'dispatch') {
        await addDispatch({
          itemId: item._id,
          quantity: qty,
          baleNumber: cleanBale,
          transportName: cleanTransport,
          transactionDate: new Date().toISOString().split('T')[0],
          remarks: note || (cleanBale ? `Bale #${cleanBale} to Home` : 'Moved to Home'),
        });
        const lotInfo = cleanBale ? ` (Bale #${cleanBale} × ${qty})` : ` (${qty} bales)`;
        toast.success(`Moved ${item.itemName} to Home${lotInfo}!`);
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
      const cleanBale = (newItemBaleNumber || '').trim();
      const cleanTransport = (newItemTransport || '').trim();

      if (opening > 0 && res.data.data?._id) {
        await addPurchase({
          itemId: res.data.data._id,
          quantity: opening,
          baleNumber: cleanBale,
          transportName: cleanTransport,
          transactionDate: new Date().toISOString().split('T')[0],
          remarks: cleanBale ? `Initial stock (Bale #${cleanBale} via ${cleanTransport || 'Direct'})` : 'Initial stock inward',
        });
      }

      const lotInfo = cleanBale && opening > 0 ? ` (Bale #${cleanBale} × ${opening})` : opening > 0 ? ` (${opening} bales)` : '';
      toast.success(`Added ${newItemName.trim()} to stock${lotInfo}!`);
      
      // Reset form
      setNewItemName('');
      setNewItemBaleNumber('');
      setNewItemOpeningBales(0);
      setNewItemTransport(transportsList[0] || 'Deepak');
      setShowNewTransportInAdd(false);
      setNewTransportInAddText('');
      setShowAddItemModal(false);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add item');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteItem = async (item) => {
    if (!item?._id) return;
    setSubmitting(true);
    try {
      await deleteItem(item._id);
      toast.success(`Removed "${item.itemName}" from stock.`);
      setItemToDelete(null);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove cloth item.');
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
    const headers = ['Cloth Name', 'Godown Bales', 'Home Bales', 'Total Stock'];
    const rows = items.map((i) => [
      `"${i.itemName}"`,
      i.godown || 0,
      i.home || 0,
      (i.godown || 0) + (i.home || 0),
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

  // Calculations (Godown, Home, Total Stock)
  const totalGodown = items.reduce((sum, i) => sum + (i.godown || 0), 0);
  const totalHome = items.reduce((sum, i) => sum + (i.home || 0), 0);
  const totalStock = totalGodown + totalHome;

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
            <img
              src="/logo.svg"
              alt="Kishore Cloth Logo"
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '11px',
                boxShadow: '0 2px 8px rgba(22,163,74,0.25)',
                display: 'block',
              }}
            />
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
              onClick={() => {
                setNewItemName('');
                setNewItemBaleNumber('');
                setNewItemOpeningBales(0);
                setNewItemTransport(transportsList[0] || 'Deepak');
                setShowNewTransportInAdd(false);
                setNewTransportInAddText('');
                setShowAddItemModal(true);
              }}
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
        
        {/* Modern 3-Card Summary Banner (Godown, Home, Total Stock) */}
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

          {/* Home Card (Changed from Shop to Home) */}
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
                Home Stock
              </div>
              <div style={{ fontSize: '32px', fontWeight: 900, color: '#1d4ed8', marginTop: '2px', lineHeight: 1 }}>
                {totalHome}
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                Bales kept at home
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

          {/* Total Stock Card */}
          <div
            style={{
              background: '#ffffff',
              border: '1.5px solid #fed7aa',
              borderRadius: '18px',
              padding: '18px 20px',
              boxShadow: '0 4px 12px rgba(234, 88, 12, 0.06)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#ea580c', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Total Available Stock
              </div>
              <div style={{ fontSize: '32px', fontWeight: 900, color: '#c2410c', marginTop: '2px', lineHeight: 1 }}>
                {totalStock}
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                All bales (Godown + Home)
              </div>
            </div>
            <div
              style={{
                width: '46px',
                height: '46px',
                background: '#ffedd5',
                color: '#ea580c',
                borderRadius: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '22px',
              }}
            >
              📦
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
              Add stock into godown or move bales from godown to home
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
                onClick={() => {
                  setNewItemName('');
                  setNewItemBaleNumber('');
                  setNewItemOpeningBales(0);
                  setNewItemTransport(transportsList[0] || 'Deepak');
                  setShowAddItemModal(true);
                }}
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
                {/* Item Info Header with Remove Cloth Button */}
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                        {item.itemName}
                      </h3>
                      {/* Remove Cloth Button */}
                      <button
                        onClick={() => setItemToDelete(item)}
                        title={`Remove ${item.itemName} from stock`}
                        style={{
                          background: '#fef2f2',
                          border: '1px solid #fecaca',
                          color: '#dc2626',
                          borderRadius: '8px',
                          padding: '3px 8px',
                          fontSize: '11.5px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <Trash2 size={12} />
                        Remove
                      </button>
                    </div>
                    <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
                      Code: {item.itemCode || item.itemName.toUpperCase()}
                    </span>
                  </div>

                  {/* Stock Badges (Godown & Home) */}
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <div
                      style={{
                        background: (item.godown || 0) > 0 ? '#f0fdf4' : '#fef2f2',
                        border: '1px solid ' + ((item.godown || 0) > 0 ? '#bbf7d0' : '#fecaca'),
                        color: (item.godown || 0) > 0 ? '#15803d' : '#991b1b',
                        borderRadius: '10px',
                        padding: '6px 14px',
                        textAlign: 'center',
                        minWidth: '85px',
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
                        minWidth: '85px',
                      }}
                    >
                      <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>At Home</div>
                      <div style={{ fontSize: '18px', fontWeight: 900 }}>
                        {item.home || 0} <span style={{ fontSize: '11px', fontWeight: 600 }}>bales</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2 Big Action Buttons: + Stock In & Move to Home */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
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
                      padding: '13px 12px',
                      fontWeight: 800,
                      fontSize: '14px',
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

                  {/* Action 2: Move to Home (Changed from Shop to Home) */}
                  <button
                    onClick={() => openAction('dispatch', item)}
                    disabled={(item.godown || 0) <= 0}
                    style={{
                      background: (item.godown || 0) > 0 ? '#eff6ff' : '#f8fafc',
                      color: (item.godown || 0) > 0 ? '#1d4ed8' : '#94a3b8',
                      border: '1.5px solid ' + ((item.godown || 0) > 0 ? '#93c5fd' : '#e2e8f0'),
                      borderRadius: '12px',
                      padding: '13px 12px',
                      fontWeight: 800,
                      fontSize: '14px',
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
                    <span style={{ fontSize: '18px' }}>🏠</span>
                    <span>Move to Home</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* RECENT ACTIVITY LOG */}
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
            <span style={{ fontSize: '12px', color: '#64748b' }}>Latest actions</span>
          </div>

          {recentActions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px', color: '#94a3b8', fontSize: '13.5px' }}>
              No transactions recorded yet today.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {recentActions.map((tx) => {
                const isPurchase = tx.transactionType === 'purchase';

                return (
                  <div
                    key={tx._id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px 14px',
                      borderRadius: '12px',
                      background: tx.isReversed ? '#f8fafc' : isPurchase ? '#f0fdf4' : '#eff6ff',
                      border: '1px solid ' + (tx.isReversed ? '#e2e8f0' : isPurchase ? '#bbf7d0' : '#bfdbfe'),
                      opacity: tx.isReversed ? 0.45 : 1,
                      flexWrap: 'wrap',
                      gap: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '20px' }}>
                        {isPurchase ? '📥' : '🏠'}
                      </span>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                          <strong>{tx.itemId?.itemName || 'Cloth'}</strong> –{' '}
                          <span style={{ color: isPurchase ? '#15803d' : '#1d4ed8' }}>
                            {tx.quantity} bales {isPurchase ? 'added to Godown' : 'moved to Home'}
                          </span>
                          {tx.baleNumber && (
                            <span
                              style={{
                                marginLeft: '8px',
                                fontSize: '12px',
                                fontWeight: 800,
                                color: '#0f172a',
                                background: '#e2e8f0',
                                padding: '2px 8px',
                                borderRadius: '6px',
                                display: 'inline-block',
                              }}
                            >
                              Bale #{tx.baleNumber} × {tx.quantity}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginTop: '2px' }}>
                          {tx.transportName && (
                            <span style={{ color: '#2563eb', fontWeight: 700 }}>
                              🚚 {tx.transportName}
                            </span>
                          )}
                          {tx.transportName && tx.remarks && <span>•</span>}
                          {tx.remarks && <span>{tx.remarks}</span>}
                          <span>•</span>
                          <span>{new Date(tx.transactionDate || tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
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
                          padding: '5px 10px',
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

      {/* ACTION STEPPER MODAL (Stock In / Move to Home) */}
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '28px' }}>
                  {actionModal.type === 'purchase' ? '📥' : '🏠'}
                </span>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 900, margin: 0, color: '#0f172a' }}>
                    {actionModal.type === 'purchase' ? 'Stock In to Godown' : 'Move Stock to Home'}
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
                marginBottom: '16px',
                fontSize: '12.5px',
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <span>Godown: <strong>{actionModal.item.godown || 0} bales</strong></span>
              <span>Home: <strong>{actionModal.item.home || 0} bales</strong></span>
            </div>

            {/* BALE NUMBER INPUT (with auto 2456*5 parsing) */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#334155', display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <span>🏷️ Bale Number</span>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>e.g. 2456 or 2456*5</span>
              </label>
              <input
                type="text"
                placeholder="Enter Bale # (e.g. 2456 or 2456*5)"
                value={baleNumber}
                onChange={(e) => handleBaleNumberInput(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  fontSize: '14.5px',
                  fontWeight: 600,
                  borderRadius: '10px',
                  border: '1.5px solid #cbd5e1',
                  outline: 'none',
                }}
              />
              <span style={{ fontSize: '11px', color: '#64748b', marginTop: '3px', display: 'block' }}>
                Tip: Typing <b>2456*5</b> automatically sets Bale #2456 and Count to 5 bales.
              </span>
            </div>

            {/* Stepper Quantity Display & Buttons (-5, -1, +1, +5) */}
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                Number of Bales (Count)
              </div>
              <div
                style={{
                  fontSize: '48px',
                  fontWeight: 900,
                  color: actionModal.type === 'purchase' ? '#15803d' : '#1d4ed8',
                  lineHeight: 1.1,
                  margin: '8px 0',
                }}
              >
                {quantity}
              </div>

              {/* Stepper Buttons: ONLY -5, -1, +1, +5 */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => adjustQty(-5)}
                  style={{
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    borderRadius: '10px',
                    padding: '8px 16px',
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
                    padding: '8px 16px',
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
                    padding: '8px 18px',
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
                    padding: '8px 16px',
                    fontSize: '15px',
                    fontWeight: 900,
                    cursor: 'pointer',
                  }}
                >
                  +5
                </button>
              </div>
            </div>

            {/* Live Lot Preview Badge (e.g. 2456 * 5) */}
            {baleNumber && (
              <div
                style={{
                  background: '#f0fdf4',
                  border: '1px solid #86efac',
                  color: '#15803d',
                  borderRadius: '10px',
                  padding: '8px 12px',
                  fontSize: '13px',
                  fontWeight: 700,
                  textAlign: 'center',
                  marginBottom: '16px',
                }}
              >
                🏷️ Bale Lot: <b>{baleNumber} × {quantity}</b> ({quantity} {quantity === 1 ? 'bale' : 'bales'})
              </div>
            )}

            {/* TRANSPORT NAME DROPDOWN */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#334155', display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <span>🚚 Transport Name</span>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>Select or add new</span>
              </label>
              
              <select
                value={showNewTransportInput ? '__new__' : transportName}
                onChange={(e) => {
                  if (e.target.value === '__new__') {
                    setShowNewTransportInput(true);
                  } else {
                    setShowNewTransportInput(false);
                    setTransportName(e.target.value);
                  }
                }}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  fontSize: '14px',
                  borderRadius: '10px',
                  border: '1.5px solid #cbd5e1',
                  background: '#ffffff',
                  fontWeight: 600,
                  color: '#0f172a',
                  outline: 'none',
                }}
              >
                <option value="">-- No Transport / Direct --</option>
                {transportsList.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
                <option value="__new__">➕ + Add New Transport...</option>
              </select>

              {/* Inline Add New Transport Input */}
              {showNewTransportInput && (
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  <input
                    type="text"
                    placeholder="Enter transport name..."
                    value={newTransportText}
                    onChange={(e) => setNewTransportText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTransport(newTransportText, false);
                      }
                    }}
                    autoFocus
                    style={{
                      flex: 1,
                      padding: '9px 12px',
                      fontSize: '13.5px',
                      borderRadius: '9px',
                      border: '1.5px solid #2563eb',
                      outline: 'none',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => handleAddTransport(newTransportText, false)}
                    style={{
                      background: '#2563eb',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '9px',
                      padding: '9px 14px',
                      fontWeight: 700,
                      fontSize: '13px',
                      cursor: 'pointer',
                    }}
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewTransportInput(false);
                      setNewTransportText('');
                    }}
                    style={{
                      background: '#f1f5f9',
                      color: '#64748b',
                      border: '1px solid #cbd5e1',
                      borderRadius: '9px',
                      padding: '9px 12px',
                      fontSize: '13px',
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            {/* Optional Note / Lorry Receipt # */}
            <div style={{ marginBottom: '18px' }}>
              <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                Note / Lorry Receipt # (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Lorry # / Invoice # / Surat Mill"
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
                background: actionModal.type === 'purchase' ? '#16a34a' : '#2563eb',
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

      {/* CONFIRMATION MODAL FOR REMOVING CLOTH ITEM */}
      {itemToDelete && (
        <div className="modal-overlay" onClick={() => setItemToDelete(null)} style={{ zIndex: 1100 }}>
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '400px',
              borderRadius: '22px',
              padding: '24px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: '#fee2e2',
                color: '#dc2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 14px',
                fontSize: '26px',
              }}
            >
              <Trash2 size={26} />
            </div>

            <h3 style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a', margin: '0 0 8px' }}>
              Remove Cloth Item?
            </h3>

            <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 20px', lineHeight: 1.5 }}>
              Are you sure you want to remove <strong>"{itemToDelete.itemName}"</strong> from stock?
              This will remove all its bales from Godown and Home.
            </p>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                style={{
                  flex: 1,
                  background: '#f1f5f9',
                  color: '#334155',
                  border: '1px solid #cbd5e1',
                  borderRadius: '12px',
                  padding: '12px',
                  fontSize: '14px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteItem(itemToDelete)}
                disabled={submitting}
                style={{
                  flex: 1,
                  background: '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '12px',
                  fontSize: '14px',
                  fontWeight: 800,
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 8px rgba(220, 38, 38, 0.3)',
                }}
              >
                {submitting ? 'Removing...' : 'Yes, Remove'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD CLOTH MODAL (with Bale Number, Steppers, & Transport Dropdown) */}
      {showAddItemModal && (
        <div className="modal-overlay" onClick={() => setShowAddItemModal(false)} style={{ zIndex: 1000 }}>
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
              {/* 1. Cloth Name */}
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

              {/* 2. Initial Bale Number (with auto 2456*5 parsing) */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#334155', display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                  <span>🏷️ Bale Number (Optional)</span>
                  <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>e.g. 2456 or 2456*5</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter Bale # (e.g. 2456 or 2456*5)"
                  value={newItemBaleNumber}
                  onChange={(e) => handleNewItemBaleNumberInput(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    fontSize: '14px',
                    fontWeight: 600,
                    borderRadius: '10px',
                    border: '1.5px solid #cbd5e1',
                    outline: 'none',
                  }}
                />
                <span style={{ fontSize: '11px', color: '#64748b', marginTop: '3px', display: 'block' }}>
                  Tip: Typing <b>2456*5</b> sets Bale #2456 and Count to 5 bales.
                </span>
              </div>

              {/* 3. Starting Godown Bales Count with Steppers (-5, -1, +1, +5) */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                  Starting Godown Bales (Count)
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="0"
                    value={newItemOpeningBales || ''}
                    onChange={(e) => setNewItemOpeningBales(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    style={{
                      flex: 1,
                      padding: '10px 14px',
                      fontSize: '15px',
                      fontWeight: 800,
                      borderRadius: '10px',
                      border: '1.5px solid #cbd5e1',
                      outline: 'none',
                      textAlign: 'center',
                    }}
                  />
                  {/* Stepper buttons: -5, -1, +1, +5 */}
                  <div style={{ display: 'flex', gap: '5px' }}>
                    <button
                      type="button"
                      onClick={() => adjustNewItemQty(-5)}
                      style={{
                        background: '#f1f5f9',
                        border: '1px solid #cbd5e1',
                        borderRadius: '8px',
                        padding: '8px 10px',
                        fontSize: '13px',
                        fontWeight: 800,
                        cursor: 'pointer',
                      }}
                    >
                      -5
                    </button>
                    <button
                      type="button"
                      onClick={() => adjustNewItemQty(-1)}
                      style={{
                        background: '#f1f5f9',
                        border: '1px solid #cbd5e1',
                        borderRadius: '8px',
                        padding: '8px 10px',
                        fontSize: '13px',
                        fontWeight: 800,
                        cursor: 'pointer',
                      }}
                    >
                      -1
                    </button>
                    <button
                      type="button"
                      onClick={() => adjustNewItemQty(1)}
                      style={{
                        background: '#dcfce7',
                        border: '1px solid #86efac',
                        color: '#15803d',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        fontSize: '13px',
                        fontWeight: 900,
                        cursor: 'pointer',
                      }}
                    >
                      +1
                    </button>
                    <button
                      type="button"
                      onClick={() => adjustNewItemQty(5)}
                      style={{
                        background: '#dcfce7',
                        border: '1px solid #86efac',
                        color: '#15803d',
                        borderRadius: '8px',
                        padding: '8px 10px',
                        fontSize: '13px',
                        fontWeight: 900,
                        cursor: 'pointer',
                      }}
                    >
                      +5
                    </button>
                  </div>
                </div>

                {/* Live lot preview in Add Cloth modal */}
                {newItemBaleNumber && (
                  <div
                    style={{
                      background: '#f0fdf4',
                      border: '1px solid #86efac',
                      color: '#15803d',
                      borderRadius: '8px',
                      padding: '6px 10px',
                      fontSize: '12px',
                      fontWeight: 700,
                      marginTop: '8px',
                    }}
                  >
                    🏷️ Lot: <b>{newItemBaleNumber} × {newItemOpeningBales || 0}</b> ({newItemOpeningBales || 0} bales)
                  </div>
                )}
              </div>

              {/* 4. Transport Name Dropdown */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#334155', display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                  <span>🚚 Transport Name</span>
                  <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>Select or add new</span>
                </label>
                
                <select
                  value={showNewTransportInAdd ? '__new__' : newItemTransport}
                  onChange={(e) => {
                    if (e.target.value === '__new__') {
                      setShowNewTransportInAdd(true);
                    } else {
                      setShowNewTransportInAdd(false);
                      setNewItemTransport(e.target.value);
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    fontSize: '14px',
                    borderRadius: '10px',
                    border: '1.5px solid #cbd5e1',
                    background: '#ffffff',
                    fontWeight: 600,
                    color: '#0f172a',
                    outline: 'none',
                  }}
                >
                  <option value="">-- No Transport / Direct --</option>
                  {transportsList.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                  <option value="__new__">➕ + Add New Transport...</option>
                </select>

                {/* Inline Add New Transport Input */}
                {showNewTransportInAdd && (
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                    <input
                      type="text"
                      placeholder="Enter transport name..."
                      value={newTransportInAddText}
                      onChange={(e) => setNewTransportInAddText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddTransport(newTransportInAddText, true);
                        }
                      }}
                      autoFocus
                      style={{
                        flex: 1,
                        padding: '9px 12px',
                        fontSize: '13.5px',
                        borderRadius: '9px',
                        border: '1.5px solid #2563eb',
                        outline: 'none',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => handleAddTransport(newTransportInAddText, true)}
                      style={{
                        background: '#2563eb',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '9px',
                        padding: '9px 14px',
                        fontWeight: 700,
                        fontSize: '13px',
                        cursor: 'pointer',
                      }}
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewTransportInAdd(false);
                        setNewTransportInAddText('');
                      }}
                      style={{
                        background: '#f1f5f9',
                        color: '#64748b',
                        border: '1px solid #cbd5e1',
                        borderRadius: '9px',
                        padding: '9px 12px',
                        fontSize: '13px',
                        cursor: 'pointer',
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={submitting}
                style={{
                  width: '100%',
                  background: '#16a34a',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '14px',
                  padding: '14px',
                  fontSize: '15px',
                  fontWeight: 800,
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  boxShadow: '0 3px 10px rgba(22,163,74,0.3)',
                }}
              >
                <Plus size={18} />
                {submitting ? 'Saving...' : 'Save New Cloth'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default SimpleApp;
