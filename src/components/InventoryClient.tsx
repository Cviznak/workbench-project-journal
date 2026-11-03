'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  InventoryFolder,
  InventoryItem,
  ItemType,
  ItemCondition,
  Currency,
} from '@/lib/types';
import { formatCurrency, cn } from '@/lib/utils';
import {
  Package,
  Folder,
  Plus,
  Search,
  ShoppingCart,
  AlertTriangle,
  Minus,
  ExternalLink,
  Edit2,
  Trash2,
  Check,
  X,
  Filter,
  Wrench,
  Layers,
  ArrowUpRight,
  RefreshCw,
  SlidersHorizontal,
  Sparkles,
  DollarSign,
  FolderPlus,
  Tag,
} from 'lucide-react';

interface InventoryClientProps {
  initialFolders: InventoryFolder[];
  initialItems: InventoryItem[];
  userId: string;
}

const FOLDER_COLORS = [
  '#6366f1', // Indigo
  '#3b82f6', // Blue
  '#06b6d4', // Cyan
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#ec4899', // Pink
  '#8b5cf6', // Purple
  '#64748b', // Slate
];

const COMMON_UNITS = [
  'pcs',
  'g',
  'kg',
  'ml',
  'l',
  'm',
  'cm',
  'mm',
  'rolls',
  'box',
  'sheets',
  'pairs',
  'sets',
];

export default function InventoryClient({
  initialFolders,
  initialItems,
  userId,
}: InventoryClientProps) {
  const router = useRouter();
  const supabase = createClient();

  const [folders, setFolders] = useState<InventoryFolder[]>(initialFolders);
  const [items, setItems] = useState<InventoryItem[]>(initialItems);

  // Filters
  const [selectedFolderId, setSelectedFolderId] = useState<string | 'ALL' | 'LOW_STOCK'>('ALL');
  const [activeTab, setActiveTab] = useState<'ALL' | 'MATERIAL' | 'EQUIPMENT' | 'CART'>('ALL');
  const [search, setSearch] = useState('');

  // Modals state
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<InventoryFolder | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('inventory-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'inventory_items', filter: `user_id=eq.${userId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newItem = payload.new as InventoryItem;
            setItems((prev) => [newItem, ...prev.filter((i) => i.id !== newItem.id)]);
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as InventoryItem;
            setItems((prev) => prev.map((i) => (i.id === updated.id ? { ...i, ...updated } : i)));
          } else if (payload.eventType === 'DELETE') {
            const oldId = payload.old.id;
            setItems((prev) => prev.filter((i) => i.id !== oldId));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'inventory_folders', filter: `user_id=eq.${userId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newF = payload.new as InventoryFolder;
            setFolders((prev) => [...prev.filter((f) => f.id !== newF.id), newF]);
          } else if (payload.eventType === 'UPDATE') {
            const updatedF = payload.new as InventoryFolder;
            setFolders((prev) => prev.map((f) => (f.id === updatedF.id ? updatedF : f)));
          } else if (payload.eventType === 'DELETE') {
            const oldId = payload.old.id;
            setFolders((prev) => prev.filter((f) => f.id !== oldId));
            if (selectedFolderId === oldId) setSelectedFolderId('ALL');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, userId, selectedFolderId]);

  // Folder helper map
  const folderMap = useMemo(() => {
    const map = new Map<string, InventoryFolder>();
    folders.forEach((f) => map.set(f.id, f));
    return map;
  }, [folders]);

  // Counts & Metrics
  const lowStockItems = useMemo(() => {
    return items.filter(
      (item) => Number(item.quantity) <= Number(item.low_stock_threshold)
    );
  }, [items]);

  const cartItems = useMemo(() => {
    return items.filter((item) => item.in_restock_cart);
  }, [items]);

  // Total inventory value summary grouped by currency
  const valueSummary = useMemo(() => {
    const totals: Record<string, number> = { ILS: 0, USD: 0, EUR: 0 };
    items.forEach((item) => {
      const curr = item.currency || 'ILS';
      const val = (Number(item.quantity) || 0) * (Number(item.unit_price) || 0);
      totals[curr] = (totals[curr] || 0) + val;
    });
    return totals;
  }, [items]);

  // Total estimated restock cart cost
  const cartCostSummary = useMemo(() => {
    const totals: Record<string, number> = { ILS: 0, USD: 0, EUR: 0 };
    cartItems.forEach((item) => {
      const curr = item.currency || 'ILS';
      const targetQty = Number(item.restock_target_qty) || 1;
      const unitPrice = Number(item.unit_price) || 0;
      totals[curr] = (totals[curr] || 0) + targetQty * unitPrice;
    });
    return totals;
  }, [cartItems]);

  // Filtered items for display
  const displayedItems = useMemo(() => {
    return items.filter((item) => {
      // Tab filter
      if (activeTab === 'MATERIAL' && item.item_type !== 'MATERIAL') return false;
      if (activeTab === 'EQUIPMENT' && item.item_type !== 'EQUIPMENT') return false;
      if (activeTab === 'CART') return item.in_restock_cart;

      // Folder filter
      if (selectedFolderId === 'LOW_STOCK') {
        if (Number(item.quantity) > Number(item.low_stock_threshold)) return false;
      } else if (selectedFolderId !== 'ALL') {
        if (item.folder_id !== selectedFolderId) return false;
      }

      // Search filter
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(q);
        const matchesSku = (item.sku_or_location || '').toLowerCase().includes(q);
        const matchesDesc = (item.description || '').toLowerCase().includes(q);
        if (!matchesName && !matchesSku && !matchesDesc) return false;
      }

      return true;
    });
  }, [items, activeTab, selectedFolderId, search]);

  // Stock Adjuster
  async function adjustStock(item: InventoryItem, delta: number) {
    const current = Number(item.quantity) || 0;
    const nextQty = Math.max(0, current + delta);
    if (nextQty === current) return;

    // Optimistic update
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, quantity: nextQty } : i))
    );

    const { error } = await supabase
      .from('inventory_items')
      .update({ quantity: nextQty, updated_at: new Date().toISOString() })
      .eq('id', item.id);

    if (error) {
      // Rollback
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, quantity: current } : i))
      );
      alert(`Failed to update stock: ${error.message}`);
    }
  }

  // Direct Stock Input
  async function setStockExact(item: InventoryItem, exactVal: number) {
    const nextQty = Math.max(0, isNaN(exactVal) ? 0 : exactVal);
    const prevQty = Number(item.quantity) || 0;
    if (nextQty === prevQty) return;

    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, quantity: nextQty } : i))
    );

    const { error } = await supabase
      .from('inventory_items')
      .update({ quantity: nextQty, updated_at: new Date().toISOString() })
      .eq('id', item.id);

    if (error) {
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, quantity: prevQty } : i))
      );
      alert(`Failed to update stock: ${error.message}`);
    }
  }

  // Toggle Cart
  async function toggleCart(item: InventoryItem, status?: boolean) {
    const nextInCart = status !== undefined ? status : !item.in_restock_cart;

    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, in_restock_cart: nextInCart } : i))
    );

    const { error } = await supabase
      .from('inventory_items')
      .update({ in_restock_cart: nextInCart, updated_at: new Date().toISOString() })
      .eq('id', item.id);

    if (error) {
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, in_restock_cart: item.in_restock_cart } : i))
      );
      alert(`Cart update failed: ${error.message}`);
    } else {
      showToast(nextInCart ? `Added "${item.name}" to Restock Cart` : `Removed "${item.name}" from Restock Cart`);
    }
  }

  // Auto-Fill Cart with All Low Stock items
  async function autoFillCartWithLowStock() {
    const toAdd = lowStockItems.filter((i) => !i.in_restock_cart);
    if (toAdd.length === 0) {
      showToast('All low stock items are already in your Restock Cart');
      return;
    }

    const ids = toAdd.map((i) => i.id);

    setItems((prev) =>
      prev.map((i) => (ids.includes(i.id) ? { ...i, in_restock_cart: true } : i))
    );

    const { error } = await supabase
      .from('inventory_items')
      .update({ in_restock_cart: true, updated_at: new Date().toISOString() })
      .in('id', ids);

    if (error) {
      alert(`Failed to auto-fill cart: ${error.message}`);
    } else {
      showToast(`Added ${ids.length} low-stock items to Restock Cart`);
    }
  }

  // Update Cart Target Quantity
  async function updateRestockTargetQty(item: InventoryItem, qty: number) {
    const targetQty = Math.max(1, isNaN(qty) ? 1 : qty);

    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, restock_target_qty: targetQty } : i))
    );

    const { error } = await supabase
      .from('inventory_items')
      .update({ restock_target_qty: targetQty, updated_at: new Date().toISOString() })
      .eq('id', item.id);

    if (error) {
      alert(`Failed to update target quantity: ${error.message}`);
    }
  }

  // Mark Item Restocked
  async function markRestocked(item: InventoryItem) {
    const currentQty = Number(item.quantity) || 0;
    const addedQty = Number(item.restock_target_qty) || 1;
    const newQty = currentQty + addedQty;

    setItems((prev) =>
      prev.map((i) =>
        i.id === item.id
          ? { ...i, quantity: newQty, in_restock_cart: false }
          : i
      )
    );

    const { error } = await supabase
      .from('inventory_items')
      .update({
        quantity: newQty,
        in_restock_cart: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', item.id);

    if (error) {
      alert(`Restock failed: ${error.message}`);
    } else {
      showToast(`Restocked! Added +${addedQty} ${item.unit} to "${item.name}"`);
    }
  }

  // Delete Item
  async function deleteItem(id: string, name: string) {
    if (!confirm(`Are you sure you want to delete "${name}" from inventory?`)) return;

    setItems((prev) => prev.filter((i) => i.id !== id));

    const { error } = await supabase
      .from('inventory_items')
      .delete()
      .eq('id', id);

    if (error) {
      alert(`Failed to delete item: ${error.message}`);
    } else {
      showToast(`Deleted "${name}"`);
    }
  }

  // Delete Folder
  async function deleteFolder(folderId: string, folderName: string) {
    if (
      !confirm(
        `Delete folder "${folderName}"? Items inside will remain in inventory as unorganized.`
      )
    )
      return;

    setFolders((prev) => prev.filter((f) => f.id !== folderId));
    setItems((prev) =>
      prev.map((i) => (i.folder_id === folderId ? { ...i, folder_id: null } : i))
    );
    if (selectedFolderId === folderId) setSelectedFolderId('ALL');

    const { error } = await supabase
      .from('inventory_folders')
      .delete()
      .eq('id', folderId);

    if (error) {
      alert(`Failed to delete folder: ${error.message}`);
    } else {
      showToast(`Folder "${folderName}" deleted`);
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-20">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 text-sm font-medium animate-in fade-in slide-in-from-bottom-3 duration-200 border border-slate-700/50">
          <Sparkles className="w-4 h-4 text-blue-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Banner / Metrics Card */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-3xl p-6 text-white shadow-xl shadow-blue-500/10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <span className="bg-white/20 backdrop-blur-md text-white text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider">
                Maker Workshop
              </span>
              <span className="text-blue-100 text-xs">v1.4 Smart Inventory</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Maker Inventory &amp; Restock Cart
            </h1>
            <p className="text-blue-100 text-sm mt-1 max-w-2xl">
              Track raw materials, consumable stock, machinery &amp; tools with automated low-stock
              detection and one-click AliExpress / Temu order link generation.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {lowStockItems.length > 0 && (
              <button
                onClick={autoFillCartWithLowStock}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-amber-950 font-bold text-sm shadow-md transition transform active:scale-95"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>Auto-Fill Cart ({lowStockItems.length} Low)</span>
              </button>
            )}
            <button
              onClick={() => {
                setEditingItem(null);
                setItemModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white hover:bg-blue-50 text-blue-600 font-bold text-sm shadow-md transition transform active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Add Item</span>
            </button>
          </div>
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-white/15 text-white">
          <div>
            <span className="text-xs text-blue-200 block uppercase tracking-wider font-medium">
              Total Items
            </span>
            <span className="text-2xl font-bold tracking-tight">{items.length}</span>
          </div>
          <div>
            <span className="text-xs text-blue-200 block uppercase tracking-wider font-medium">
              Low Stock Alerts
            </span>
            <div className="flex items-center gap-2">
              <span className={cn('text-2xl font-bold tracking-tight', lowStockItems.length > 0 ? 'text-amber-300' : '')}>
                {lowStockItems.length}
              </span>
              {lowStockItems.length > 0 && (
                <span className="bg-amber-400/20 text-amber-200 border border-amber-300/30 text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                  ACTION NEEDED
                </span>
              )}
            </div>
          </div>
          <div>
            <span className="text-xs text-blue-200 block uppercase tracking-wider font-medium">
              Restock Cart
            </span>
            <span className="text-2xl font-bold tracking-tight">{cartItems.length}</span>
          </div>
          <div>
            <span className="text-xs text-blue-200 block uppercase tracking-wider font-medium">
              Estimated Workshop Value
            </span>
            <div className="text-lg sm:text-xl font-bold tracking-tight truncate">
              {formatCurrency(valueSummary.ILS || 0, 'ILS')}
              {valueSummary.USD > 0 && ` + ${formatCurrency(valueSummary.USD, 'USD')}`}
              {valueSummary.EUR > 0 && ` + ${formatCurrency(valueSummary.EUR, 'EUR')}`}
            </div>
          </div>
        </div>
      </div>

      {/* Main Layout: Folder Rail & Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Folder Rail (Sidebar) */}
        <div className="lg:col-span-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 font-bold text-sm text-slate-800 dark:text-slate-100">
              <Folder className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Workshop Folders</span>
            </div>
            <button
              onClick={() => {
                setEditingFolder(null);
                setFolderModalOpen(true);
              }}
              title="Add New Folder"
              className="p-1.5 rounded-xl text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-1">
            {/* All Items Button */}
            <button
              onClick={() => {
                setSelectedFolderId('ALL');
                if (activeTab === 'CART') setActiveTab('ALL');
              }}
              className={cn(
                'w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition',
                selectedFolderId === 'ALL' && activeTab !== 'CART'
                  ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60'
              )}
            >
              <div className="flex items-center gap-2.5">
                <Layers className="w-4 h-4 text-blue-500" />
                <span>All Workshop Items</span>
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                {items.length}
              </span>
            </button>

            {/* Low Stock Alert Button */}
            <button
              onClick={() => {
                setSelectedFolderId('LOW_STOCK');
                if (activeTab === 'CART') setActiveTab('ALL');
              }}
              className={cn(
                'w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition',
                selectedFolderId === 'LOW_STOCK' && activeTab !== 'CART'
                  ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60'
              )}
            >
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span>Low Stock Alerts</span>
              </div>
              <span
                className={cn(
                  'text-[11px] font-bold px-2 py-0.5 rounded-full',
                  lowStockItems.length > 0
                    ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                )}
              >
                {lowStockItems.length}
              </span>
            </button>
          </div>

          {/* User Folders */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1">
            <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 px-3 uppercase tracking-wider block">
              Categories ({folders.length})
            </span>

            {folders.length === 0 ? (
              <div className="p-3 text-center text-xs text-slate-400 dark:text-slate-500">
                No folders yet. Click + to organize by bin, tool type or filament material.
              </div>
            ) : (
              folders.map((folder) => {
                const count = items.filter((i) => i.folder_id === folder.id).length;
                const isSelected = selectedFolderId === folder.id && activeTab !== 'CART';

                return (
                  <div
                    key={folder.id}
                    className={cn(
                      'group flex items-center justify-between px-3 py-2 rounded-2xl text-xs font-semibold transition',
                      isSelected
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                    )}
                  >
                    <button
                      onClick={() => {
                        setSelectedFolderId(folder.id);
                        if (activeTab === 'CART') setActiveTab('ALL');
                      }}
                      className="flex-1 flex items-center gap-2.5 text-left truncate mr-2"
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                        style={{ backgroundColor: folder.color || '#6366f1' }}
                      />
                      <span className="truncate">{folder.name}</span>
                    </button>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[11px] text-slate-400 dark:text-slate-500 font-normal">
                        {count}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingFolder(folder);
                          setFolderModalOpen(true);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-blue-500 transition"
                        title="Edit Folder"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteFolder(folder.id, folder.name);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 transition"
                        title="Delete Folder"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Content Area (Tabs, Search, Grid / Restock Cart) */}
        <div className="lg:col-span-9 space-y-6">
          {/* Controls Bar: Tabs, Search & Restock Toggle */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            {/* View Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
              <button
                onClick={() => setActiveTab('ALL')}
                className={cn(
                  'px-3.5 py-2 rounded-2xl text-xs font-bold transition whitespace-nowrap',
                  activeTab === 'ALL'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                )}
              >
                All Items ({items.length})
              </button>
              <button
                onClick={() => setActiveTab('MATERIAL')}
                className={cn(
                  'px-3.5 py-2 rounded-2xl text-xs font-bold transition whitespace-nowrap',
                  activeTab === 'MATERIAL'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                )}
              >
                Materials ({items.filter((i) => i.item_type === 'MATERIAL').length})
              </button>
              <button
                onClick={() => setActiveTab('EQUIPMENT')}
                className={cn(
                  'px-3.5 py-2 rounded-2xl text-xs font-bold transition whitespace-nowrap',
                  activeTab === 'EQUIPMENT'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                )}
              >
                Equipment ({items.filter((i) => i.item_type === 'EQUIPMENT').length})
              </button>
              <button
                onClick={() => setActiveTab('CART')}
                className={cn(
                  'flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-bold transition whitespace-nowrap',
                  activeTab === 'CART'
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                    : 'bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/50'
                )}
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                <span>Restock Cart</span>
                <span className="px-1.5 py-0.2 rounded-full bg-purple-200 dark:bg-purple-800 text-purple-900 dark:text-purple-100 text-[10px]">
                  {cartItems.length}
                </span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative min-w-[220px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search items, SKU, bin..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* VIEW: RESTOCK CART */}
          {activeTab === 'CART' ? (
            <div className="space-y-4">
              <div className="bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-900/60 rounded-3xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                    <ShoppingCart className="w-5 h-5 text-purple-500" />
                    <span className="text-base">Smart Restock Order Sheet</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Direct search generators for AliExpress &amp; Temu with target restocking quantities.
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">
                    Total Estimated Cart Cost
                  </span>
                  <span className="text-xl font-extrabold text-purple-600 dark:text-purple-400">
                    {formatCurrency(cartCostSummary.ILS || 0, 'ILS')}
                    {cartCostSummary.USD > 0 && ` + ${formatCurrency(cartCostSummary.USD, 'USD')}`}
                    {cartCostSummary.EUR > 0 && ` + ${formatCurrency(cartCostSummary.EUR, 'EUR')}`}
                  </span>
                </div>
              </div>

              {cartItems.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center">
                  <div className="w-14 h-14 rounded-3xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center mx-auto mb-4">
                    <ShoppingCart className="w-7 h-7" />
                  </div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    Restock Cart is Clear!
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1 mb-5">
                    No items currently marked for restock. Use &quot;Auto-Fill Cart&quot; or toggle the cart
                    button on any item card.
                  </p>
                  <button
                    onClick={() => setActiveTab('ALL')}
                    className="px-4 py-2 rounded-2xl bg-blue-600 text-white font-bold text-xs shadow-md"
                  >
                    Browse Workshop Items
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {cartItems.map((item) => {
                    const folder = item.folder_id ? folderMap.get(item.folder_id) : null;
                    const searchPhrase = item.search_keyword || item.name;
                    const aliExpressUrl = `https://www.aliexpress.com/wholesale?SearchText=${encodeURIComponent(
                      searchPhrase
                    )}`;
                    const temuUrl = `https://www.temu.com/search_result.html?search_key=${encodeURIComponent(
                      searchPhrase
                    )}`;

                    return (
                      <div
                        key={item.id}
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-5 transition hover:border-purple-300 dark:hover:border-purple-800"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase">
                              {item.item_type}
                            </span>
                            {folder && (
                              <span
                                className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-white"
                                style={{ backgroundColor: folder.color || '#6366f1' }}
                              >
                                {folder.name}
                              </span>
                            )}
                            {item.sku_or_location && (
                              <span className="text-[11px] text-slate-400">
                                📍 {item.sku_or_location}
                              </span>
                            )}
                          </div>

                          <h3 className="font-bold text-base text-slate-900 dark:text-white truncate">
                            {item.name}
                          </h3>

                          <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1">
                            <span>
                              Current Stock:{' '}
                              <b
                                className={cn(
                                  Number(item.quantity) <= Number(item.low_stock_threshold)
                                    ? 'text-amber-500 font-bold'
                                    : 'text-slate-700 dark:text-slate-200'
                                )}
                              >
                                {item.quantity} {item.unit}
                              </b>
                            </span>
                            <span>•</span>
                            <span>
                              Unit Price: <b>{formatCurrency(item.unit_price, item.currency)}</b>
                            </span>
                          </div>

                          {/* Quick Sourcing Action Links */}
                          <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                            <a
                              href={aliExpressUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 text-xs font-bold border border-orange-200 dark:border-orange-800/60 hover:bg-orange-100 dark:hover:bg-orange-900/40 transition"
                            >
                              <span>AliExpress</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>

                            <a
                              href={temuUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-xs font-bold border border-amber-200 dark:border-amber-800/60 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition"
                            >
                              <span>Temu</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>

                            {item.reorder_url && (
                              <a
                                href={item.reorder_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 text-xs font-bold border border-blue-200 dark:border-blue-800/60 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition"
                              >
                                <span>Direct Supplier</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        </div>

                        {/* Cart Target Quantity & Mark Restocked Button */}
                        <div className="flex flex-col sm:items-end justify-between gap-3 shrink-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <span className="text-[11px] text-slate-400 block font-medium">
                                Target Order ({item.unit})
                              </span>
                              <input
                                type="number"
                                min="1"
                                step="any"
                                value={item.restock_target_qty || 1}
                                onChange={(e) =>
                                  updateRestockTargetQty(item, parseFloat(e.target.value))
                                }
                                className="w-20 px-2 py-1 text-right text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                              />
                            </div>
                            <div className="text-right min-w-[70px]">
                              <span className="text-[11px] text-slate-400 block font-medium">
                                Line Total
                              </span>
                              <span className="text-xs font-bold text-slate-900 dark:text-white">
                                {formatCurrency(
                                  (item.restock_target_qty || 1) * (item.unit_price || 0),
                                  item.currency
                                )}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => toggleCart(item, false)}
                              className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                              title="Remove from Cart"
                            >
                              <X className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => markRestocked(item)}
                              className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-500/20 transition transform active:scale-95"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Mark Restocked (+{item.restock_target_qty || 1})</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* VIEW: INVENTORY ITEMS GRID */
            <div>
              {displayedItems.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center">
                  <div className="w-14 h-14 rounded-3xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-4">
                    <Package className="w-7 h-7" />
                  </div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    No Inventory Items Found
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1 mb-5">
                    {search
                      ? `No items matched your query "${search}".`
                      : 'No items recorded in this folder yet. Add materials, filament, screws or equipment.'}
                  </p>
                  <button
                    onClick={() => {
                      setEditingItem(null);
                      setItemModalOpen(true);
                    }}
                    className="px-4 py-2 rounded-2xl bg-blue-600 text-white font-bold text-xs shadow-md"
                  >
                    + Add Workshop Item
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {displayedItems.map((item) => {
                    const folder = item.folder_id ? folderMap.get(item.folder_id) : null;
                    const isLowStock =
                      Number(item.quantity) <= Number(item.low_stock_threshold);

                    return (
                      <div
                        key={item.id}
                        className={cn(
                          'bg-white dark:bg-slate-900 border rounded-3xl p-5 shadow-sm flex flex-col justify-between gap-4 transition hover:shadow-md',
                          isLowStock
                            ? 'border-amber-300 dark:border-amber-800/80 bg-amber-50/20 dark:bg-amber-950/10'
                            : 'border-slate-200 dark:border-slate-800'
                        )}
                      >
                        {/* Card Header */}
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span
                                className={cn(
                                  'text-[10px] font-bold px-2 py-0.5 rounded-full uppercase',
                                  item.item_type === 'MATERIAL'
                                    ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-900/50'
                                    : 'bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-300 border border-purple-200 dark:border-purple-900/50'
                                )}
                              >
                                {item.item_type}
                              </span>

                              {folder && (
                                <span
                                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-white"
                                  style={{ backgroundColor: folder.color || '#6366f1' }}
                                >
                                  {folder.name}
                                </span>
                              )}

                              {item.item_type === 'EQUIPMENT' && (
                                <span
                                  className={cn(
                                    'text-[10px] font-bold px-2 py-0.5 rounded-full',
                                    item.condition === 'GOOD'
                                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                                      : item.condition === 'NEEDS_MAINTENANCE'
                                      ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400'
                                      : 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400'
                                  )}
                                >
                                  {item.condition === 'GOOD'
                                    ? 'Good Condition'
                                    : item.condition === 'NEEDS_MAINTENANCE'
                                    ? 'Needs Maint.'
                                    : 'Replace'}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => {
                                  setEditingItem(item);
                                  setItemModalOpen(true);
                                }}
                                className="p-1.5 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                                title="Edit Item"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => deleteItem(item.id, item.name)}
                                className="p-1.5 rounded-xl text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                                title="Delete Item"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <h3 className="font-bold text-base text-slate-900 dark:text-white">
                            {item.name}
                          </h3>

                          {item.description && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">
                              {item.description}
                            </p>
                          )}

                          <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-2">
                            {item.sku_or_location && (
                              <span>📍 {item.sku_or_location}</span>
                            )}
                            {item.unit_price > 0 && (
                              <span>
                                {formatCurrency(item.unit_price, item.currency)} / {item.unit}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Stock Adjuster & Low Stock Warning */}
                        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                              In Stock
                            </span>

                            {isLowStock ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-100/60 dark:bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-300 dark:border-amber-800">
                                <AlertTriangle className="w-3 h-3" />
                                <span>
                                  Low Stock (≤ {item.low_stock_threshold} {item.unit})
                                </span>
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-400">
                                Alert at: ≤ {item.low_stock_threshold} {item.unit}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center justify-between gap-3">
                            {/* Stepper Controls */}
                            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-2xl p-1">
                              <button
                                onClick={() => adjustStock(item, -1)}
                                className="w-8 h-8 rounded-xl bg-white dark:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 shadow-sm transition active:scale-95"
                                title="Decrease Stock"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <div className="flex items-center px-2">
                                <input
                                  type="number"
                                  step="any"
                                  min="0"
                                  value={item.quantity}
                                  onChange={(e) =>
                                    setStockExact(item, parseFloat(e.target.value))
                                  }
                                  className="w-16 text-center text-sm font-extrabold bg-transparent text-slate-900 dark:text-white focus:outline-none"
                                />
                                <span className="text-xs text-slate-400 font-medium ml-1">
                                  {item.unit}
                                </span>
                              </div>
                              <button
                                onClick={() => adjustStock(item, 1)}
                                className="w-8 h-8 rounded-xl bg-white dark:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 shadow-sm transition active:scale-95"
                                title="Increase Stock"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Cart Toggle Button */}
                            <button
                              onClick={() => toggleCart(item)}
                              className={cn(
                                'flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-bold transition shadow-sm',
                                item.in_restock_cart
                                  ? 'bg-purple-600 text-white hover:bg-purple-500 shadow-purple-500/20'
                                  : isLowStock
                                  ? 'bg-amber-500 text-white hover:bg-amber-400 shadow-amber-500/20'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                              )}
                              title={
                                item.in_restock_cart
                                  ? 'Item in Restock Cart (Click to remove)'
                                  : 'Add to Restock Cart'
                              }
                            >
                              <ShoppingCart className="w-3.5 h-3.5" />
                              <span>{item.in_restock_cart ? 'In Cart' : '+ Restock'}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ================= MODAL: ADD / EDIT ITEM ================= */}
      {itemModalOpen && (
        <ItemModal
          isOpen={itemModalOpen}
          onClose={() => {
            setItemModalOpen(false);
            setEditingItem(null);
          }}
          item={editingItem}
          folders={folders}
          userId={userId}
          onSaved={(savedItem) => {
            setItems((prev) => {
              const exists = prev.some((i) => i.id === savedItem.id);
              if (exists) {
                return prev.map((i) => (i.id === savedItem.id ? savedItem : i));
              }
              return [savedItem, ...prev];
            });
            setItemModalOpen(false);
            setEditingItem(null);
            showToast(editingItem ? 'Item updated' : 'New item added to inventory');
          }}
        />
      )}

      {/* ================= MODAL: ADD / EDIT FOLDER ================= */}
      {folderModalOpen && (
        <FolderModal
          isOpen={folderModalOpen}
          onClose={() => {
            setFolderModalOpen(false);
            setEditingFolder(null);
          }}
          folder={editingFolder}
          userId={userId}
          onSaved={(savedFolder) => {
            setFolders((prev) => {
              const exists = prev.some((f) => f.id === savedFolder.id);
              if (exists) {
                return prev.map((f) => (f.id === savedFolder.id ? savedFolder : f));
              }
              return [...prev, savedFolder];
            });
            setFolderModalOpen(false);
            setEditingFolder(null);
            showToast(editingFolder ? 'Folder updated' : 'New folder created');
          }}
        />
      )}
    </div>
  );
}

// -------------------------------------------------------------
// SUB-COMPONENT: ITEM MODAL (ADD / EDIT)
// -------------------------------------------------------------
interface ItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: InventoryItem | null;
  folders: InventoryFolder[];
  userId: string;
  onSaved: (item: InventoryItem) => void;
}

function ItemModal({ isOpen, onClose, item, folders, userId, onSaved }: ItemModalProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState(item?.name || '');
  const [itemType, setItemType] = useState<ItemType>(item?.item_type || 'MATERIAL');
  const [folderId, setFolderId] = useState<string>(item?.folder_id || '');
  const [description, setDescription] = useState(item?.description || '');
  const [skuLocation, setSkuLocation] = useState(item?.sku_or_location || '');
  const [quantity, setQuantity] = useState<string>(item ? String(item.quantity) : '1');
  const [unit, setUnit] = useState(item?.unit || 'pcs');
  const [lowStockThreshold, setLowStockThreshold] = useState<string>(
    item ? String(item.low_stock_threshold) : '1'
  );
  const [unitPrice, setUnitPrice] = useState<string>(item ? String(item.unit_price) : '0');
  const [currency, setCurrency] = useState<Currency>(item?.currency || 'ILS');
  const [condition, setCondition] = useState<ItemCondition>(item?.condition || 'GOOD');
  const [searchKeyword, setSearchKeyword] = useState(item?.search_keyword || '');
  const [reorderUrl, setReorderUrl] = useState(item?.reorder_url || '');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      alert('Please enter an item name');
      return;
    }

    setLoading(true);

    const payload = {
      user_id: userId,
      name: name.trim(),
      item_type: itemType,
      folder_id: folderId || null,
      description: description.trim(),
      sku_or_location: skuLocation.trim(),
      quantity: Math.max(0, parseFloat(quantity) || 0),
      unit: unit.trim() || 'pcs',
      low_stock_threshold: Math.max(0, parseFloat(lowStockThreshold) || 0),
      unit_price: Math.max(0, parseFloat(unitPrice) || 0),
      currency,
      condition,
      search_keyword: searchKeyword.trim(),
      reorder_url: reorderUrl.trim(),
      updated_at: new Date().toISOString(),
    };

    if (item?.id) {
      const { data, error } = await supabase
        .from('inventory_items')
        .update(payload)
        .eq('id', item.id)
        .select()
        .single();

      setLoading(false);
      if (error) {
        alert(`Failed to update item: ${error.message}`);
      } else if (data) {
        onSaved(data as InventoryItem);
      }
    } else {
      const { data, error } = await supabase
        .from('inventory_items')
        .insert({
          ...payload,
          in_restock_cart: false,
          restock_target_qty: 1,
        })
        .select()
        .single();

      setLoading(false);
      if (error) {
        alert(`Failed to create item: ${error.message}`);
      } else if (data) {
        onSaved(data as InventoryItem);
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-xl p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-lg">
            <Package className="w-5 h-5 text-blue-600" />
            <span>{item ? 'Edit Workshop Item' : 'Add Inventory Item'}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Item Type & Name */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Type
              </label>
              <select
                value={itemType}
                onChange={(e) => setItemType(e.target.value as ItemType)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white"
              >
                <option value="MATERIAL">Material (Consumable)</option>
                <option value="EQUIPMENT">Equipment (Tool/Gear)</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Item Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. PLA 1.75mm Black Filament"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Folder & Storage Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Folder / Category
              </label>
              <select
                value={folderId}
                onChange={(e) => setFolderId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white"
              >
                <option value="">(No Folder - Unorganized)</option>
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Storage Bin / Location
              </label>
              <input
                type="text"
                placeholder="e.g. Bin A3, Drawer 2"
                value={skuLocation}
                onChange={(e) => setSkuLocation(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Quantity, Unit & Alert Threshold */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Current Quantity
              </label>
              <input
                type="number"
                step="any"
                min="0"
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white text-center"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Unit
              </label>
              <input
                type="text"
                list="unit-options"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white text-center"
              />
              <datalist id="unit-options">
                {COMMON_UNITS.map((u) => (
                  <option key={u} value={u} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Alert Threshold (≤)
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={lowStockThreshold}
                onChange={(e) => setLowStockThreshold(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-amber-600 dark:text-amber-400 text-center"
              />
            </div>
          </div>

          {/* Unit Price & Currency */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Unit Price
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as Currency)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white"
              >
                <option value="ILS">₪ ILS</option>
                <option value="USD">$ USD</option>
                <option value="EUR">€ EUR</option>
              </select>
            </div>
          </div>

          {/* Equipment Condition */}
          {itemType === 'EQUIPMENT' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Condition
              </label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value as ItemCondition)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white"
              >
                <option value="GOOD">Good Condition</option>
                <option value="NEEDS_MAINTENANCE">Needs Maintenance</option>
                <option value="REPLACE">Needs Replacement</option>
              </select>
            </div>
          )}

          {/* Sourcing / Restock Settings */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Smart Sourcing &amp; Restock Link Configuration
            </span>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                AliExpress / Temu Search Phrase (Defaults to Item Name)
              </label>
              <input
                type="text"
                placeholder="e.g. M3 heat set brass inserts 4mm"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Direct Supplier / Reorder URL (Optional)
              </label>
              <input
                type="url"
                placeholder="https://..."
                value={reorderUrl}
                onChange={(e) => setReorderUrl(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Notes &amp; Description
              </label>
              <textarea
                rows={2}
                placeholder="Specifications, supplier notes, batch numbers..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white resize-none"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-2xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition disabled:opacity-50"
            >
              {loading ? 'Saving...' : item ? 'Update Item' : 'Add to Inventory'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// SUB-COMPONENT: FOLDER MODAL (ADD / EDIT)
// -------------------------------------------------------------
interface FolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  folder: InventoryFolder | null;
  userId: string;
  onSaved: (folder: InventoryFolder) => void;
}

function FolderModal({ isOpen, onClose, folder, userId, onSaved }: FolderModalProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(folder?.name || '');
  const [color, setColor] = useState(folder?.color || '#6366f1');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);

    if (folder?.id) {
      const { data, error } = await supabase
        .from('inventory_folders')
        .update({
          name: name.trim(),
          color,
        })
        .eq('id', folder.id)
        .select()
        .single();

      setLoading(false);
      if (error) {
        alert(error.message);
      } else if (data) {
        onSaved(data as InventoryFolder);
      }
    } else {
      const { data, error } = await supabase
        .from('inventory_folders')
        .insert({
          user_id: userId,
          name: name.trim(),
          color,
        })
        .select()
        .single();

      setLoading(false);
      if (error) {
        alert(error.message);
      } else if (data) {
        onSaved(data as InventoryFolder);
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-base">
            <Folder className="w-5 h-5 text-blue-600" />
            <span>{folder ? 'Edit Folder' : 'New Workshop Category'}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Folder Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. 3D Printing, Fasteners, Electronics"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
              Color Tag
            </label>
            <div className="flex items-center gap-2.5 flex-wrap">
              {FOLDER_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    'w-7 h-7 rounded-full transition transform active:scale-90 flex items-center justify-center',
                    color === c ? 'ring-2 ring-offset-2 ring-blue-500 scale-110' : ''
                  )}
                  style={{ backgroundColor: c }}
                >
                  {color === c && <Check className="w-3.5 h-3.5 text-white" />}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-2xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition disabled:opacity-50"
            >
              {loading ? 'Saving...' : folder ? 'Update' : 'Create Folder'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
