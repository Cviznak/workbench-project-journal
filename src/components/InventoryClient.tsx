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
  MakerRecipe,
  RecipeIngredient,
} from '@/lib/types';
import { formatCurrency, cn } from '@/lib/utils';
import { sounds, triggerCelebrationConfetti } from '@/lib/soundEffects';
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
  Layers,
  Sparkles,
  FlaskConical,
  Play,
  Star,
  FileSpreadsheet,
  ChevronDown,
  ChevronUp,
  Boxes,
  HelpCircle,
  Clock,
  CheckCircle2,
} from 'lucide-react';

interface InventoryClientProps {
  initialFolders: InventoryFolder[];
  initialItems: InventoryItem[];
  initialRecipes?: MakerRecipe[];
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

const RECIPE_CATEGORIES = [
  'General',
  '3D Printing',
  'Epoxy & Molds',
  'Perfume Lab',
  'Soap Making',
  'Electronics',
  'Finishes & Stains',
];

// Starter Workshop Presets for Quick Bulk-Add
const WORKSHOP_PRESETS = [
  {
    id: '3d-printing',
    name: '3D Printing Workshop',
    icon: '🖨️',
    description: 'PLA/PETG filaments, nozzles, PTFE tubing, and IPA bed cleaner',
    items: [
      { name: 'PLA Filament Black 1.75mm', item_type: 'MATERIAL', quantity: 2, unit: 'rolls', unit_price: 85, low_stock_threshold: 1, sku_or_location: 'Filament Rack' },
      { name: 'PLA Filament White 1.75mm', item_type: 'MATERIAL', quantity: 2, unit: 'rolls', unit_price: 85, low_stock_threshold: 1, sku_or_location: 'Filament Rack' },
      { name: 'PETG Filament Grey 1.75mm', item_type: 'MATERIAL', quantity: 1, unit: 'rolls', unit_price: 95, low_stock_threshold: 1, sku_or_location: 'Filament Rack' },
      { name: '0.4mm Brass V6 Nozzles', item_type: 'EQUIPMENT', quantity: 5, unit: 'pcs', unit_price: 15, low_stock_threshold: 2, sku_or_location: 'Drawer 1' },
      { name: 'PTFE Bowden Tubing 1m', item_type: 'MATERIAL', quantity: 2, unit: 'm', unit_price: 12, low_stock_threshold: 1, sku_or_location: 'Drawer 2' },
      { name: 'Isopropyl Alcohol 99%', item_type: 'MATERIAL', quantity: 1000, unit: 'ml', unit_price: 35, low_stock_threshold: 250, sku_or_location: 'Chemical Cabinet' },
    ],
  },
  {
    id: 'epoxy-casting',
    name: 'Epoxy & Silicone Casting Lab',
    icon: '🧪',
    description: '2-part clear epoxy, hardener, silicone mold rubber, and mica pigments',
    items: [
      { name: 'Clear Casting Epoxy Part A', item_type: 'MATERIAL', quantity: 1000, unit: 'ml', unit_price: 60, low_stock_threshold: 250, sku_or_location: 'Resin Shelf' },
      { name: 'Epoxy Hardener Part B', item_type: 'MATERIAL', quantity: 500, unit: 'ml', unit_price: 45, low_stock_threshold: 150, sku_or_location: 'Resin Shelf' },
      { name: 'Mica Color Pigments 12-Pack', item_type: 'MATERIAL', quantity: 1, unit: 'box', unit_price: 45, low_stock_threshold: 1, sku_or_location: 'Pigment Box' },
      { name: 'Platinum Silicone Mold Rubber 1kg', item_type: 'MATERIAL', quantity: 1, unit: 'kg', unit_price: 110, low_stock_threshold: 0.5, sku_or_location: 'Shelf B' },
      { name: 'Disposable Mixing Cups 100ml', item_type: 'MATERIAL', quantity: 50, unit: 'pcs', unit_price: 15, low_stock_threshold: 10, sku_or_location: 'Bin M2' },
      { name: 'Nitrile Gloves L 100-Pack', item_type: 'MATERIAL', quantity: 100, unit: 'pcs', unit_price: 30, low_stock_threshold: 20, sku_or_location: 'PPE Drawer' },
    ],
  },
  {
    id: 'perfume-lab',
    name: 'Perfume & Alchemy Lab',
    icon: '🏺',
    description: 'Perfumers alcohol, aroma chemicals, amber dropper bottles, and pipettes',
    items: [
      { name: 'Perfumers Alcohol 96% Ethanol', item_type: 'MATERIAL', quantity: 1000, unit: 'ml', unit_price: 55, low_stock_threshold: 200, sku_or_location: 'Alcohol Stash' },
      { name: 'Bergamot Essential Oil (FCF)', item_type: 'MATERIAL', quantity: 15, unit: 'ml', unit_price: 32, low_stock_threshold: 3, sku_or_location: 'Oils Rack' },
      { name: 'Virginia Cedarwood Essential Oil', item_type: 'MATERIAL', quantity: 30, unit: 'ml', unit_price: 24, low_stock_threshold: 5, sku_or_location: 'Oils Rack' },
      { name: 'Iso E Super Aroma Chemical', item_type: 'MATERIAL', quantity: 50, unit: 'ml', unit_price: 40, low_stock_threshold: 10, sku_or_location: 'Synthetics Bin' },
      { name: 'Amber Glass Dropper Bottles 10ml', item_type: 'MATERIAL', quantity: 20, unit: 'pcs', unit_price: 35, low_stock_threshold: 5, sku_or_location: 'Bottle Crate' },
      { name: 'Graduated Pipettes 3ml', item_type: 'MATERIAL', quantity: 100, unit: 'pcs', unit_price: 14, low_stock_threshold: 20, sku_or_location: 'Pipette Box' },
    ],
  },
  {
    id: 'electronics-fasteners',
    name: 'Electronics & Fasteners Bench',
    icon: '⚡',
    description: 'M3 hardware, heat-set inserts, silicone hookup wire, solder, and shrink tube',
    items: [
      { name: 'M3 Socket Head Screws Kit (4-20mm)', item_type: 'MATERIAL', quantity: 250, unit: 'pcs', unit_price: 35, low_stock_threshold: 50, sku_or_location: 'Organizer A1' },
      { name: 'M3 Brass Heat-Set Threaded Inserts', item_type: 'MATERIAL', quantity: 100, unit: 'pcs', unit_price: 25, low_stock_threshold: 20, sku_or_location: 'Organizer A2' },
      { name: '22AWG Flexible Silicone Wire 5-Color', item_type: 'MATERIAL', quantity: 10, unit: 'm', unit_price: 22, low_stock_threshold: 2, sku_or_location: 'Wire Spooler' },
      { name: 'Sn63Pb37 Rosin Core Solder 0.8mm', item_type: 'MATERIAL', quantity: 100, unit: 'g', unit_price: 35, low_stock_threshold: 20, sku_or_location: 'Solder Station' },
      { name: 'Heat Shrink Tubing Assortment Kit', item_type: 'MATERIAL', quantity: 120, unit: 'pcs', unit_price: 18, low_stock_threshold: 20, sku_or_location: 'Organizer B1' },
    ],
  },
];

export default function InventoryClient({
  initialFolders,
  initialItems,
  initialRecipes = [],
  userId,
}: InventoryClientProps) {
  const router = useRouter();
  const supabase = createClient();

  const [folders, setFolders] = useState<InventoryFolder[]>(initialFolders);
  const [items, setItems] = useState<InventoryItem[]>(initialItems);
  const [recipes, setRecipes] = useState<MakerRecipe[]>(initialRecipes);

  // Filters
  const [selectedFolderId, setSelectedFolderId] = useState<string | 'ALL' | 'LOW_STOCK'>('ALL');
  const [activeTab, setActiveTab] = useState<'ALL' | 'MATERIAL' | 'EQUIPMENT' | 'CART' | 'RECIPES'>('ALL');
  const [recipeCategory, setRecipeCategory] = useState<string>('All');
  const [search, setSearch] = useState('');

  // Modals state
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<InventoryFolder | null>(null);

  const [recipeModalOpen, setRecipeModalOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<MakerRecipe | null>(null);

  const [bulkModalOpen, setBulkModalOpen] = useState(false);

  const [runBatchModalOpen, setRunBatchModalOpen] = useState(false);
  const [runningRecipe, setRunningRecipe] = useState<MakerRecipe | null>(null);
  const [batchMultiplier, setBatchMultiplier] = useState<number>(1);
  const [executingBatch, setExecutingBatch] = useState(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Realtime subscription for items & folders & recipes
  useEffect(() => {
    const channel = supabase
      .channel('inventory-sync-all')
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
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'maker_recipes', filter: `user_id=eq.${userId}` },
        () => {
          refreshRecipes();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, userId, selectedFolderId]);

  async function refreshRecipes() {
    const { data } = await supabase
      .from('maker_recipes')
      .select('*, ingredients:recipe_ingredients(*, inventory_item:inventory_items(*))')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (data) setRecipes(data as any);
  }

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
      if (activeTab === 'MATERIAL' && item.item_type !== 'MATERIAL') return false;
      if (activeTab === 'EQUIPMENT' && item.item_type !== 'EQUIPMENT') return false;
      if (activeTab === 'CART') return item.in_restock_cart;

      if (selectedFolderId === 'LOW_STOCK') {
        if (Number(item.quantity) > Number(item.low_stock_threshold)) return false;
      } else if (selectedFolderId !== 'ALL') {
        if (item.folder_id !== selectedFolderId) return false;
      }

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

  // Filtered recipes for display
  const displayedRecipes = useMemo(() => {
    return recipes.filter((r) => {
      if (recipeCategory !== 'All' && r.category !== recipeCategory) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesTitle = r.title.toLowerCase().includes(q);
        const matchesDesc = (r.instructions_md || '').toLowerCase().includes(q);
        return matchesTitle || matchesDesc;
      }
      return true;
    });
  }, [recipes, recipeCategory, search]);

  // Stock Adjuster
  async function adjustStock(item: InventoryItem, delta: number) {
    const current = Number(item.quantity) || 0;
    const nextQty = Math.max(0, current + delta);
    if (nextQty === current) return;

    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, quantity: nextQty } : i))
    );

    const { error } = await supabase
      .from('inventory_items')
      .update({ quantity: nextQty, updated_at: new Date().toISOString() })
      .eq('id', item.id);

    if (error) {
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
        i.id === item.id ? { ...i, quantity: newQty, in_restock_cart: false } : i
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

    const { error } = await supabase.from('inventory_items').delete().eq('id', id);

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

    const { error } = await supabase.from('inventory_folders').delete().eq('id', folderId);

    if (error) {
      alert(`Failed to delete folder: ${error.message}`);
    } else {
      showToast(`Folder "${folderName}" deleted`);
    }
  }

  // Delete Recipe
  async function deleteRecipe(recipeId: string, title: string) {
    if (!confirm(`Delete recipe "${title}"?`)) return;

    setRecipes((prev) => prev.filter((r) => r.id !== recipeId));

    const { error } = await supabase.from('maker_recipes').delete().eq('id', recipeId);
    if (error) {
      alert(`Failed to delete recipe: ${error.message}`);
    } else {
      showToast(`Deleted recipe "${title}"`);
    }
  }

  // Execute Recipe Batch (RPC)
  async function handleExecuteRecipeBatch() {
    if (!runningRecipe) return;
    setExecutingBatch(true);

    try {
      const { data, error } = await supabase.rpc('execute_maker_recipe', {
        p_recipe_id: runningRecipe.id,
        p_batch_multiplier: batchMultiplier,
      });

      if (error) throw error;

      // Optimistically decrement local stock
      setItems((prev) =>
        prev.map((item) => {
          const ing = runningRecipe.ingredients?.find(
            (ri) => ri.inventory_item_id === item.id
          );
          if (!ing) return item;

          const needed = (Number(ing.quantity_required) || 0) * batchMultiplier;
          const nextQty = Math.max(0, (Number(item.quantity) || 0) - needed);
          const nowLow = nextQty <= Number(item.low_stock_threshold) && item.item_type === 'MATERIAL';

          return {
            ...item,
            quantity: nextQty,
            in_restock_cart: nowLow ? true : item.in_restock_cart,
          };
        })
      );

      sounds.playLevelUp();
      triggerCelebrationConfetti();
      showToast(`Executed "${runningRecipe.title}" (${batchMultiplier}x batch)! Materials deducted.`);
      setRunBatchModalOpen(false);
      setRunningRecipe(null);
    } catch (err: any) {
      alert(`Recipe execution error: ${err.message || 'Unknown error'}`);
    } finally {
      setExecutingBatch(false);
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
              <span className="text-blue-100 text-xs">v1.5 BOM &amp; Recipes</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Maker Inventory, BOM &amp; Recipes
            </h1>
            <p className="text-blue-100 text-sm mt-1 max-w-2xl">
              Track raw materials, repeatable formulas &amp; batch costing with automated low-stock
              detection, task bill-of-materials deduction, and AliExpress / Temu restock generator.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setBulkModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs backdrop-blur-md border border-white/20 transition transform active:scale-95"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Bulk Quick-Add</span>
            </button>

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
              Workshop Formulas
            </span>
            <span className="text-2xl font-bold tracking-tight">{recipes.length}</span>
          </div>
          <div>
            <span className="text-xs text-blue-200 block uppercase tracking-wider font-medium">
              Workshop Inventory Value
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
                if (activeTab === 'CART' || activeTab === 'RECIPES') setActiveTab('ALL');
              }}
              className={cn(
                'w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition',
                selectedFolderId === 'ALL' && activeTab !== 'CART' && activeTab !== 'RECIPES'
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
                if (activeTab === 'CART' || activeTab === 'RECIPES') setActiveTab('ALL');
              }}
              className={cn(
                'w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition',
                selectedFolderId === 'LOW_STOCK' && activeTab !== 'CART' && activeTab !== 'RECIPES'
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
                const isSelected =
                  selectedFolderId === folder.id && activeTab !== 'CART' && activeTab !== 'RECIPES';

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
                        if (activeTab === 'CART' || activeTab === 'RECIPES') setActiveTab('ALL');
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

        {/* Content Area (Tabs, Search, Grid / Restock Cart / Formulas) */}
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
                onClick={() => setActiveTab('RECIPES')}
                className={cn(
                  'flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-bold transition whitespace-nowrap',
                  activeTab === 'RECIPES'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                    : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50'
                )}
              >
                <FlaskConical className="w-3.5 h-3.5" />
                <span>Formulas &amp; Recipes</span>
                <span className="px-1.5 py-0.2 rounded-full bg-emerald-200 dark:bg-emerald-800 text-emerald-900 dark:text-emerald-100 text-[10px]">
                  {recipes.length}
                </span>
              </button>
              <button
                onClick={() => setActiveTab('CART')}
                className={cn(
                  'flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-bold transition whitespace-nowrap',
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
                placeholder={activeTab === 'RECIPES' ? 'Search formulas, ratios...' : 'Search items, SKU, bin...'}
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

          {/* ================= VIEW: FORMULAS & RECIPES ================= */}
          {activeTab === 'RECIPES' ? (
            <div className="space-y-4">
              <div className="bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-900/60 rounded-3xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                    <FlaskConical className="w-5 h-5 text-emerald-500" />
                    <span className="text-base">Maker Formulas &amp; Batch Recipes</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Repeatable workshop formulas with exact ingredient ratios, unit cost calculation, and 1-click batch stock deduction.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setEditingRecipe(null);
                    setRecipeModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-500/20 transition transform active:scale-95 shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>New Formula / Recipe</span>
                </button>
              </div>

              {/* Recipe Category Filter Chips */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider pl-1">
                  Category:
                </span>
                {['All', ...RECIPE_CATEGORIES].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setRecipeCategory(cat)}
                    className={cn(
                      'px-3 py-1 rounded-full text-xs font-semibold transition',
                      recipeCategory === cat
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {displayedRecipes.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center">
                  <div className="w-14 h-14 rounded-3xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-4">
                    <FlaskConical className="w-7 h-7" />
                  </div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    No Formulas Found
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1 mb-5">
                    {search
                      ? `No recipes matched "${search}".`
                      : 'Create your first repeatable maker formula (e.g. epoxy resin mixing ratios, perfume accord, or soap recipe).'}
                  </p>
                  <button
                    onClick={() => {
                      setEditingRecipe(null);
                      setRecipeModalOpen(true);
                    }}
                    className="px-4 py-2 rounded-2xl bg-emerald-600 text-white font-bold text-xs shadow-md"
                  >
                    + Create First Recipe
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {displayedRecipes.map((recipe) => {
                    const ings = recipe.ingredients || [];
                    const batchCost = ings.reduce((acc, ri) => {
                      const item = items.find((i) => i.id === ri.inventory_item_id) || ri.inventory_item;
                      return acc + (Number(ri.quantity_required) || 0) * (Number(item?.unit_price) || 0);
                    }, 0);
                    const primaryCurrency = ings[0]?.inventory_item?.currency || 'ILS';

                    // Check if sufficient stock for 1x batch
                    const canRun1x = ings.every((ri) => {
                      const item = items.find((i) => i.id === ri.inventory_item_id) || ri.inventory_item;
                      return item ? Number(item.quantity) >= Number(ri.quantity_required) : false;
                    });

                    return (
                      <div
                        key={recipe.id}
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm flex flex-col justify-between gap-4 transition hover:border-emerald-300 dark:hover:border-emerald-800"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50 uppercase">
                                {recipe.category}
                              </span>
                              {recipe.rating && (
                                <div className="flex items-center text-amber-400 text-xs">
                                  {Array.from({ length: recipe.rating }).map((_, idx) => (
                                    <Star key={idx} className="w-3 h-3 fill-current" />
                                  ))}
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => {
                                  setEditingRecipe(recipe);
                                  setRecipeModalOpen(true);
                                }}
                                className="p-1.5 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                                title="Edit Formula"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => deleteRecipe(recipe.id, recipe.title)}
                                className="p-1.5 rounded-xl text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                                title="Delete Formula"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <h3 className="font-bold text-base text-slate-900 dark:text-white">
                            {recipe.title}
                          </h3>

                          {recipe.instructions_md && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">
                              {recipe.instructions_md}
                            </p>
                          )}

                          {/* Ingredients List */}
                          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                              Ingredients ({ings.length}):
                            </span>
                            {ings.map((ri) => {
                              const item = items.find((i) => i.id === ri.inventory_item_id) || ri.inventory_item;
                              const available = Number(item?.quantity) || 0;
                              const needed = Number(ri.quantity_required) || 0;
                              const hasEnough = available >= needed;

                              return (
                                <div
                                  key={ri.id}
                                  className="flex items-center justify-between text-xs py-1 px-2 rounded-xl bg-slate-50 dark:bg-slate-800/60"
                                >
                                  <div className="flex items-center gap-2 truncate mr-2">
                                    <span className={cn('w-2 h-2 rounded-full shrink-0', hasEnough ? 'bg-emerald-500' : 'bg-amber-500')} />
                                    <span className="truncate font-medium text-slate-800 dark:text-slate-200">
                                      {item?.name || 'Unknown Item'}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <span className="font-bold text-slate-900 dark:text-white">
                                      {ri.quantity_required} {item?.unit || 'units'}
                                    </span>
                                    <span className="text-[10px] text-slate-400">
                                      ({available} in stock)
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Batch Cost & Run Action */}
                        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                          <div>
                            <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">
                              Cost Per Batch
                            </span>
                            <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                              {formatCurrency(batchCost, primaryCurrency)}
                            </span>
                          </div>

                          <button
                            onClick={() => {
                              setRunningRecipe(recipe);
                              setBatchMultiplier(1);
                              setRunBatchModalOpen(true);
                            }}
                            className={cn(
                              'flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-bold shadow-md transition transform active:scale-95',
                              canRun1x
                                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20'
                                : 'bg-amber-500 hover:bg-amber-400 text-white shadow-amber-500/20'
                            )}
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>Run Batch</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : activeTab === 'CART' ? (
            /* ================= VIEW: RESTOCK CART ================= */
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
            /* ================= VIEW: INVENTORY ITEMS GRID ================= */
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
                      : 'No items recorded in this folder yet. Use Bulk Quick-Add or + Add Workshop Item.'}
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <button
                      onClick={() => setBulkModalOpen(true)}
                      className="px-4 py-2 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs hover:bg-slate-200"
                    >
                      Bulk Quick-Add Presets
                    </button>
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

      {/* ================= MODAL: ADD / EDIT RECIPE ================= */}
      {recipeModalOpen && (
        <RecipeModal
          isOpen={recipeModalOpen}
          onClose={() => {
            setRecipeModalOpen(false);
            setEditingRecipe(null);
          }}
          recipe={editingRecipe}
          inventoryItems={items}
          userId={userId}
          onSaved={(savedRecipe) => {
            setRecipes((prev) => {
              const exists = prev.some((r) => r.id === savedRecipe.id);
              if (exists) {
                return prev.map((r) => (r.id === savedRecipe.id ? savedRecipe : r));
              }
              return [savedRecipe, ...prev];
            });
            setRecipeModalOpen(false);
            setEditingRecipe(null);
            showToast(editingRecipe ? 'Formula updated' : 'New formula saved');
          }}
        />
      )}

      {/* ================= MODAL: RUN RECIPE BATCH ================= */}
      {runBatchModalOpen && runningRecipe && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                <Play className="w-4 h-4 text-emerald-500 fill-current" />
                <span>Run Batch: {runningRecipe.title}</span>
              </div>
              <button
                onClick={() => {
                  setRunBatchModalOpen(false);
                  setRunningRecipe(null);
                }}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Batch Multiplier
                </label>
                <div className="flex items-center gap-2">
                  {[0.5, 1, 2, 5].map((mult) => (
                    <button
                      key={mult}
                      type="button"
                      onClick={() => setBatchMultiplier(mult)}
                      className={cn(
                        'px-3 py-1.5 rounded-xl text-xs font-bold transition flex-1',
                        batchMultiplier === mult
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      )}
                    >
                      {mult}x
                    </button>
                  ))}
                  <input
                    type="number"
                    step="any"
                    min="0.1"
                    value={batchMultiplier}
                    onChange={(e) => setBatchMultiplier(Math.max(0.1, parseFloat(e.target.value) || 1))}
                    className="w-16 px-2 py-1.5 text-center text-xs font-bold rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Deductions Preview */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Materials to be Deducted:
                </span>
                {(runningRecipe.ingredients || []).map((ri) => {
                  const item = items.find((i) => i.id === ri.inventory_item_id) || ri.inventory_item;
                  const needed = (Number(ri.quantity_required) || 0) * batchMultiplier;
                  const currentStock = Number(item?.quantity) || 0;
                  const sufficient = currentStock >= needed;

                  return (
                    <div
                      key={ri.id}
                      className="flex items-center justify-between text-xs py-0.5"
                    >
                      <span className="truncate mr-2 font-medium text-slate-700 dark:text-slate-200">
                        {item?.name || 'Item'}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-bold text-slate-900 dark:text-white">
                          -{needed} {item?.unit || ''}
                        </span>
                        <span
                          className={cn(
                            'text-[10px] font-semibold',
                            sufficient ? 'text-emerald-500' : 'text-amber-500'
                          )}
                        >
                          (remains: {Math.max(0, currentStock - needed)})
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                ⚠️ Executing this batch will immediately decrement inventory quantities and trigger restock alerts if thresholds are breached.
              </p>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setRunBatchModalOpen(false);
                    setRunningRecipe(null);
                  }}
                  className="px-4 py-2 rounded-2xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={executingBatch}
                  onClick={handleExecuteRecipeBatch}
                  className="px-5 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition disabled:opacity-50"
                >
                  {executingBatch ? 'Deducting Stock...' : 'Execute & Deduct Stock'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: QUICK BULK ADD ================= */}
      {bulkModalOpen && (
        <BulkAddModal
          isOpen={bulkModalOpen}
          onClose={() => setBulkModalOpen(false)}
          folders={folders}
          userId={userId}
          onImported={(newItems) => {
            setItems((prev) => [...newItems, ...prev]);
            setBulkModalOpen(false);
            showToast(`Imported ${newItems.length} items to workshop inventory!`);
          }}
        />
      )}
    </div>
  );
}

// -------------------------------------------------------------
// SUB-COMPONENT: BULK ADD MODAL (PRESETS + FAST PASTE)
// -------------------------------------------------------------
interface BulkAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  folders: InventoryFolder[];
  userId: string;
  onImported: (items: InventoryItem[]) => void;
}

function BulkAddModal({ isOpen, onClose, folders, userId, onImported }: BulkAddModalProps) {
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState<'presets' | 'paste'>('presets');
  const [selectedFolderId, setSelectedFolderId] = useState<string>('');
  const [itemsToImport, setItemsToImport] = useState<any[]>([]);
  const [rawText, setRawText] = useState('');
  const [importing, setImporting] = useState(false);

  function loadPreset(preset: typeof WORKSHOP_PRESETS[0]) {
    setItemsToImport(
      preset.items.map((i) => ({
        ...i,
        currency: 'ILS',
        condition: 'GOOD',
      }))
    );
  }

  function handleParsePaste() {
    if (!rawText.trim()) return;

    const lines = rawText.split('\n').filter((l) => l.trim().length > 0);
    const parsed = lines.map((line) => {
      const parts = line.split(',').map((p) => p.trim());
      return {
        name: parts[0] || 'Workshop Item',
        item_type: 'MATERIAL',
        quantity: parseFloat(parts[1]) || 1,
        unit: parts[2] || 'pcs',
        unit_price: parseFloat(parts[3]) || 0,
        low_stock_threshold: parseFloat(parts[4]) || 1,
        sku_or_location: parts[5] || '',
        currency: 'ILS',
        condition: 'GOOD',
      };
    });

    setItemsToImport(parsed);
  }

  async function handleImport() {
    if (itemsToImport.length === 0) return;
    setImporting(true);

    const payload = itemsToImport.map((item) => ({
      user_id: userId,
      folder_id: selectedFolderId || null,
      name: item.name,
      item_type: item.item_type || 'MATERIAL',
      description: item.description || '',
      sku_or_location: item.sku_or_location || '',
      quantity: Math.max(0, Number(item.quantity) || 0),
      unit: item.unit || 'pcs',
      low_stock_threshold: Math.max(0, Number(item.low_stock_threshold) || 0),
      unit_price: Math.max(0, Number(item.unit_price) || 0),
      currency: item.currency || 'ILS',
      condition: item.condition || 'GOOD',
      search_keyword: '',
      reorder_url: '',
      in_restock_cart: false,
      restock_target_qty: 1,
      updated_at: new Date().toISOString(),
    }));

    const { data, error } = await supabase
      .from('inventory_items')
      .insert(payload)
      .select();

    setImporting(false);
    if (error) {
      alert(`Import error: ${error.message}`);
    } else if (data) {
      onImported(data as InventoryItem[]);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl p-6 shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
            <FileSpreadsheet className="w-5 h-5 text-blue-600" />
            <span>Quick Bulk Add Items</span>
          </div>
          <button onClick={onClose} className="p-1 rounded-xl text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs & Folder Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('presets')}
              className={cn(
                'px-3 py-1.5 rounded-xl text-xs font-bold transition',
                activeTab === 'presets'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              )}
            >
              Workshop Starter Presets
            </button>
            <button
              onClick={() => setActiveTab('paste')}
              className={cn(
                'px-3 py-1.5 rounded-xl text-xs font-bold transition',
                activeTab === 'paste'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              )}
            >
              Multi-Line Paste
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-semibold whitespace-nowrap">Target Folder:</span>
            <select
              value={selectedFolderId}
              onChange={(e) => setSelectedFolderId(e.target.value)}
              className="px-2.5 py-1 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
            >
              <option value="">(None - Unorganized)</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {activeTab === 'presets' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {WORKSHOP_PRESETS.map((p) => (
                <div
                  key={p.id}
                  onClick={() => loadPreset(p)}
                  className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 cursor-pointer transition bg-slate-50/50 dark:bg-slate-800/30 group"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{p.icon}</span>
                    <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-blue-600">
                      {p.name}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    {p.description}
                  </p>
                  <span className="text-[10px] font-semibold text-blue-500 block mt-2">
                    Click to load {p.items.length} items →
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                Paste CSV or Comma-Separated Lines:
              </span>
              <p className="text-[11px] text-slate-400">
                Format: <code>Item Name, Quantity, Unit, Unit Price, Low Stock Alert, Location</code>
              </p>
              <textarea
                rows={5}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder={`PLA Filament Black, 2, rolls, 85, 1, Bin A1\nM3 Heat Set Inserts, 100, pcs, 25, 20, Drawer 3\nIsopropyl Alcohol 99%, 1000, ml, 35, 250, Shelf B`}
                className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white focus:outline-none"
              />
              <button
                type="button"
                onClick={handleParsePaste}
                className="px-4 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-300"
              >
                Parse Lines into Preview
              </button>
            </div>
          )}

          {/* Items Preview Table */}
          {itemsToImport.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  Preview Items to Import ({itemsToImport.length}):
                </span>
                <button
                  onClick={() => setItemsToImport([])}
                  className="text-[11px] text-red-500 hover:underline"
                >
                  Clear Preview
                </button>
              </div>

              <div className="max-h-48 overflow-y-auto space-y-1.5 border border-slate-100 dark:border-slate-800 rounded-xl p-2 bg-slate-50 dark:bg-slate-800/40">
                {itemsToImport.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800"
                  >
                    <span className="truncate font-semibold text-slate-900 dark:text-white mr-2">
                      {item.name}
                    </span>
                    <div className="flex items-center gap-3 shrink-0 text-slate-500 text-[11px]">
                      <span>
                        {item.quantity} {item.unit}
                      </span>
                      <span>•</span>
                      <span>₪{item.unit_price}</span>
                      <button
                        onClick={() =>
                          setItemsToImport((prev) => prev.filter((_, i) => i !== idx))
                        }
                        className="text-slate-400 hover:text-red-500"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-2xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={itemsToImport.length === 0 || importing}
            onClick={handleImport}
            className="px-5 py-2 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition disabled:opacity-50"
          >
            {importing ? 'Importing...' : `Import All ${itemsToImport.length} Items`}
          </button>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// SUB-COMPONENT: RECIPE MODAL (ADD / EDIT)
// -------------------------------------------------------------
interface RecipeModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipe: MakerRecipe | null;
  inventoryItems: InventoryItem[];
  userId: string;
  onSaved: (recipe: MakerRecipe) => void;
}

function RecipeModal({
  isOpen,
  onClose,
  recipe,
  inventoryItems,
  userId,
  onSaved,
}: RecipeModalProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  const [title, setTitle] = useState(recipe?.title || '');
  const [category, setCategory] = useState(recipe?.category || 'General');
  const [instructionsMd, setInstructionsMd] = useState(recipe?.instructions_md || '');
  const [rating, setRating] = useState<number>(recipe?.rating || 5);
  const [ingredients, setIngredients] = useState<
    Array<{ inventory_item_id: string; quantity_required: number }>
  >(
    recipe?.ingredients?.map((ri) => ({
      inventory_item_id: ri.inventory_item_id,
      quantity_required: Number(ri.quantity_required) || 1,
    })) || []
  );

  function addIngredientRow() {
    if (inventoryItems.length === 0) return;
    setIngredients((prev) => [
      ...prev,
      { inventory_item_id: inventoryItems[0].id, quantity_required: 1 },
    ]);
  }

  function removeIngredientRow(idx: number) {
    setIngredients((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateIngredient(idx: number, field: string, val: any) {
    setIngredients((prev) =>
      prev.map((ing, i) => (i === idx ? { ...ing, [field]: val } : ing))
    );
  }

  // Cost per batch preview
  const estimatedCost = useMemo(() => {
    return ingredients.reduce((acc, ing) => {
      const item = inventoryItems.find((i) => i.id === ing.inventory_item_id);
      return acc + (Number(ing.quantity_required) || 0) * (Number(item?.unit_price) || 0);
    }, 0);
  }, [ingredients, inventoryItems]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      alert('Please enter a formula title');
      return;
    }

    setLoading(true);

    try {
      let savedId = recipe?.id;

      if (recipe?.id) {
        const { error } = await supabase
          .from('maker_recipes')
          .update({
            title: title.trim(),
            category,
            instructions_md: instructionsMd.trim(),
            rating,
            updated_at: new Date().toISOString(),
          })
          .eq('id', recipe.id);

        if (error) throw error;

        // Delete existing ingredients to reinsert cleanly
        await supabase.from('recipe_ingredients').delete().eq('recipe_id', recipe.id);
      } else {
        const { data, error } = await supabase
          .from('maker_recipes')
          .insert({
            user_id: userId,
            title: title.trim(),
            category,
            instructions_md: instructionsMd.trim(),
            rating,
          })
          .select()
          .single();

        if (error) throw error;
        savedId = data.id;
      }

      // Insert ingredients
      if (ingredients.length > 0 && savedId) {
        const payload = ingredients.map((ing) => ({
          recipe_id: savedId,
          inventory_item_id: ing.inventory_item_id,
          quantity_required: Math.max(0.01, Number(ing.quantity_required) || 1),
        }));

        const { error: ingErr } = await supabase.from('recipe_ingredients').insert(payload);
        if (ingErr) throw ingErr;
      }

      // Fetch full recipe with joined ingredients
      const { data: fullRecipe } = await supabase
        .from('maker_recipes')
        .select('*, ingredients:recipe_ingredients(*, inventory_item:inventory_items(*))')
        .eq('id', savedId!)
        .single();

      if (fullRecipe) {
        onSaved(fullRecipe as MakerRecipe);
      }
    } catch (err: any) {
      alert(`Save error: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
            <FlaskConical className="w-5 h-5 text-emerald-500" />
            <span>{recipe ? 'Edit Formula / Recipe' : 'New Workshop Formula'}</span>
          </div>
          <button onClick={onClose} className="p-1 rounded-xl text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Formula Title *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Amber Resin Mixing Ratio (2:1)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Category
              </label>
              <input
                type="text"
                list="recipe-categories"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white"
              />
              <datalist id="recipe-categories">
                {RECIPE_CATEGORIES.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Instructions &amp; Mixing Notes
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Mix Part A & B slowly for 3 minutes. Degas in vacuum chamber for 5 mins before pouring. Cure time: 24h at 22°C."
              value={instructionsMd}
              onChange={(e) => setInstructionsMd(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Rating
            </label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="p-1 text-amber-400 hover:scale-110 transition"
                >
                  <Star
                    className={cn(
                      'w-4 h-4',
                      star <= rating ? 'fill-current text-amber-400' : 'text-slate-300 dark:text-slate-700'
                    )}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Ingredients Builder */}
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                Formula Ingredients &amp; Quantities:
              </span>
              <button
                type="button"
                onClick={addIngredientRow}
                className="text-xs font-bold text-emerald-600 hover:underline flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Ingredient</span>
              </button>
            </div>

            {ingredients.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                No ingredients added yet. Click &quot;Add Ingredient&quot; above.
              </p>
            ) : (
              <div className="space-y-2">
                {ingredients.map((ing, idx) => {
                  const selectedItem = inventoryItems.find((i) => i.id === ing.inventory_item_id);

                  return (
                    <div key={idx} className="flex items-center gap-2">
                      <select
                        value={ing.inventory_item_id}
                        onChange={(e) => updateIngredient(idx, 'inventory_item_id', e.target.value)}
                        className="flex-1 px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white"
                      >
                        {inventoryItems.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name} ({item.quantity} {item.unit} in stock)
                          </option>
                        ))}
                      </select>

                      <div className="flex items-center gap-1 w-28">
                        <input
                          type="number"
                          step="any"
                          min="0.01"
                          required
                          value={ing.quantity_required}
                          onChange={(e) =>
                            updateIngredient(idx, 'quantity_required', parseFloat(e.target.value) || 0)
                          }
                          className="w-16 px-2 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-center text-slate-900 dark:text-white"
                        />
                        <span className="text-[11px] text-slate-400 font-medium">
                          {selectedItem?.unit || ''}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeIngredientRow(idx)}
                        className="p-1.5 text-slate-400 hover:text-red-500"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Estimated Batch Cost */}
            {ingredients.length > 0 && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center justify-between text-xs mt-3">
                <span className="font-semibold text-emerald-800 dark:text-emerald-300">
                  Calculated Cost Per Batch:
                </span>
                <span className="font-bold text-emerald-700 dark:text-emerald-400 text-sm">
                  {formatCurrency(estimatedCost, 'ILS')}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
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
              className="px-5 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition disabled:opacity-50"
            >
              {loading ? 'Saving...' : recipe ? 'Update Formula' : 'Save Formula'}
            </button>
          </div>
        </form>
      </div>
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
