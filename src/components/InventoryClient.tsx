'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
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
  EquipmentLog,
  EquipmentActionType,
  InventoryTransaction,
} from '@/lib/types';
import { formatCurrency, cn } from '@/lib/utils';
import { convertCurrency, SUPPORTED_CURRENCIES, DEFAULT_CURRENCY } from '@/lib/currency';
import { compressWorkshopImage } from '@/lib/imageUtils';
import { sounds, triggerCelebrationConfetti } from '@/lib/soundEffects';
import {
  calculateResistorBands,
  findNearestE12,
  formatOhms,
  recommendWattage,
} from '@/lib/electronicsUtils';
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
  Coins,
  Calculator,
  Loader2,
  Camera,
  Image as ImageIcon,
  Grid,
  Flame,
  Printer,
  QrCode,
  Globe,
  Tag,
  Copy,
  Download,
  Upload,
  Wrench,
  FileText,
  Cpu,
  Zap,
  Battery,
  Activity,
  History,
} from 'lucide-react';

interface InventoryClientProps {
  initialFolders: InventoryFolder[];
  initialItems: InventoryItem[];
  initialRecipes?: MakerRecipe[];
  userId: string;
  initialPreferredCurrency?: Currency;
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
  initialPreferredCurrency = 'USD',
}: InventoryClientProps) {
  const router = useRouter();
  const supabase = createClient();

  const [folders, setFolders] = useState<InventoryFolder[]>(initialFolders);
  const [items, setItems] = useState<InventoryItem[]>(initialItems);
  const [recipes, setRecipes] = useState<MakerRecipe[]>(initialRecipes);

  // Preferred Currency
  const [preferredCurrency, setPreferredCurrency] = useState<Currency>(() => {
    if (typeof window !== 'undefined') {
      const local = localStorage.getItem('workbench_currency') as Currency | null;
      if (local && (local === 'USD' || local === 'EUR' || local === 'ILS' || local === 'GBP')) {
        return local;
      }
    }
    return initialPreferredCurrency || 'USD';
  });

  useEffect(() => {
    const onCurrencyChange = () => {
      const local = localStorage.getItem('workbench_currency') as Currency | null;
      if (local && (local === 'USD' || local === 'EUR' || local === 'ILS' || local === 'GBP')) {
        setPreferredCurrency(local);
      }
    };
    window.addEventListener('workbench_currency_changed', onCurrencyChange);
    return () => window.removeEventListener('workbench_currency_changed', onCurrencyChange);
  }, []);

  const handleCurrencyChange = async (newCurr: Currency) => {
    setPreferredCurrency(newCurr);
    if (typeof window !== 'undefined') {
      localStorage.setItem('workbench_currency', newCurr);
      window.dispatchEvent(new Event('workbench_currency_changed'));
    }
    try {
      const { data: prof } = await supabase
        .from('profiles')
        .select('settings_json')
        .eq('id', userId)
        .maybeSingle();
      const currentSettings = (prof?.settings_json as Record<string, any>) || {};
      await supabase
        .from('profiles')
        .update({
          settings_json: { ...currentSettings, preferred_currency: newCurr },
        })
        .eq('id', userId);
    } catch (_) {}
  };

  // Filters
  const [selectedFolderId, setSelectedFolderId] = useState<string | 'ALL' | 'LOW_STOCK'>('ALL');
  const [activeTab, setActiveTab] = useState<
    'ALL' | 'MATERIAL' | 'EQUIPMENT' | 'FINISHED_GOOD' | 'CART' | 'RECIPES' | 'CALCULATORS'
  >('ALL');
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
  const [batchNotes, setBatchNotes] = useState<string>('');
  const [batchRating, setBatchRating] = useState<number | null>(5);
  const [executingBatch, setExecutingBatch] = useState(false);
  const [expandedRuns, setExpandedRuns] = useState<Record<string, boolean>>({});

  // Print Views State
  const [printBatchRecipe, setPrintBatchRecipe] = useState<MakerRecipe | null>(null);
  const [printLabelsModalOpen, setPrintLabelsModalOpen] = useState(false);
  const [printLabelsFilter, setPrintLabelsFilter] = useState<'FILTERED' | 'LOW_STOCK' | 'ALL'>('FILTERED');

  // CSV Import & Equipment Logbook Modal State
  const [csvImportModalOpen, setCsvImportModalOpen] = useState(false);
  const [equipmentLogItem, setEquipmentLogItem] = useState<InventoryItem | null>(null);

  // Pending Formula Recovery
  const [pendingFormula, setPendingFormula] = useState<{
    title: string;
    category: string;
    instructions_md: string;
  } | null>(null);
  const [savingPendingFormula, setSavingPendingFormula] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('workbench_pending_formula');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.title && parsed?.instructions_md) {
          setPendingFormula(parsed);
        }
      }
    } catch (_) {}
  }, []);

  async function handleSavePendingFormula() {
    if (!pendingFormula) return;
    setSavingPendingFormula(true);
    try {
      const { data, error } = await supabase
        .from('maker_recipes')
        .insert({
          user_id: userId,
          title: pendingFormula.title,
          category: pendingFormula.category,
          instructions_md: pendingFormula.instructions_md,
        })
        .select()
        .single();

      if (error) throw error;

      localStorage.removeItem('workbench_pending_formula');
      if (data) {
        setRecipes((prev) => [data, ...prev]);
      }
      triggerCelebrationConfetti();
      showToast(`Saved "${pendingFormula.title}" to your Workshop Formulas!`);
      setPendingFormula(null);
    } catch (err: any) {
      showToast(err.message || 'Failed to save pending formula');
    } finally {
      setSavingPendingFormula(false);
    }
  }

  function handleDiscardPendingFormula() {
    try {
      localStorage.removeItem('workbench_pending_formula');
    } catch (_) {}
    setPendingFormula(null);
  }

  // Lab Calculators State
  const [calcActiveTool, setCalcActiveTool] = useState<
    'RESIN' | 'PERFUME' | '3D_PRINT' | 'CROSS_STITCH' | 'CANDLE' | 'LASER_CUT' | 'ELECTRONICS' | 'SILICONE' | 'WOODWORKING'
  >('RESIN');

  // 1. Epoxy Resin Calculator State
  const [resinShape, setResinShape] = useState<'RECTANGLE' | 'CYLINDER' | 'CUSTOM'>('RECTANGLE');
  const [resinLengthMm, setResinLengthMm] = useState<number>(100);
  const [resinWidthMm, setResinWidthMm] = useState<number>(100);
  const [resinDepthMm, setResinDepthMm] = useState<number>(20);
  const [resinDiameterMm, setResinDiameterMm] = useState<number>(80);
  const [resinCustomVolMl, setResinCustomVolMl] = useState<number>(200);
  const [resinDensity, setResinDensity] = useState<number>(1.12);
  const [resinRatioPreset, setResinRatioPreset] = useState<'1:1_VOL' | '2:1_WT' | '3:1_WT' | '100:44_WT'>('1:1_VOL');

  // 2. Perfume Dilution Calculator State
  const [perfumeBottleMl, setPerfumeBottleMl] = useState<number>(50);
  const [perfumeConcentration, setPerfumeConcentration] = useState<'EXTRAIT' | 'EDP' | 'EDT' | 'EDC' | 'CUSTOM'>('EDP');
  const [perfumeCustomPct, setPerfumeCustomPct] = useState<number>(18);
  const [fragranceOilDensity, setFragranceOilDensity] = useState<number>(0.95);
  const [alcoholDensity, setAlcoholDensity] = useState<number>(0.789);

  // 3. 3D Print Costing Calculator State
  const [printMaterial, setPrintMaterial] = useState<string>('PLA');
  const [partWeightG, setPartWeightG] = useState<number>(120);
  const [spoolCost, setSpoolCost] = useState<number>(85);
  const [spoolWeightG, setSpoolWeightG] = useState<number>(1000);
  const [printHours, setPrintHours] = useState<number>(6);
  const [printMinutes, setPrintMinutes] = useState<number>(30);
  const [printerWatts, setPrinterWatts] = useState<number>(150);
  const [kwhRate, setKwhRate] = useState<number>(0.65);
  const [printFailureBuffer, setPrintFailureBuffer] = useState<number>(5);
  const [targetMarginPct, setTargetMarginPct] = useState<number>(65);

  // 4. Cross-Stitch & Fabric Calculator State
  const [stitchWidth, setStitchWidth] = useState<number>(140);
  const [stitchHeight, setStitchHeight] = useState<number>(100);
  const [stitchAidaCount, setStitchAidaCount] = useState<number>(14);
  const [stitchBorderMargin, setStitchBorderMargin] = useState<number>(5);
  const [stitchStrands, setStitchStrands] = useState<number>(2);

  // 5. Candle & Soap Batch Calculator State
  const [candleWaterWeight, setCandleWaterWeight] = useState<number>(200);
  const [candleUnits, setCandleUnits] = useState<number>(1);
  const [candleWaxType, setCandleWaxType] = useState<'SOY' | 'PARAFFIN' | 'BEESWAX' | 'SOAP_BASE'>('SOY');
  const [candleFragrancePct, setCandleFragrancePct] = useState<number>(8);
  const [candleWaxPricePerKg, setCandleWaxPricePerKg] = useState<number>(45);
  const [candleFragrancePricePer100g, setCandleFragrancePricePer100g] = useState<number>(35);
  const [candlePackagingPerUnit, setCandlePackagingPerUnit] = useState<number>(5);

  // 6. Laser Cut / CNC Sheet Nesting Calculator State
  const [laserSheetWidthMm, setLaserSheetWidthMm] = useState<number>(600);
  const [laserSheetHeightMm, setLaserSheetHeightMm] = useState<number>(400);
  const [laserSheetCost, setLaserSheetCost] = useState<number>(45);
  const [laserPartWidthMm, setLaserPartWidthMm] = useState<number>(80);
  const [laserPartHeightMm, setLaserPartHeightMm] = useState<number>(50);
  const [laserKerfSpacingMm, setLaserKerfSpacingMm] = useState<number>(2);
  const [laserCutTimeMin, setLaserCutTimeMin] = useState<number>(12);
  const [laserHourlyRate, setLaserHourlyRate] = useState<number>(30);
  const [laserMachineWatts, setLaserMachineWatts] = useState<number>(450);
  const [laserKwhRate, setLaserKwhRate] = useState<number>(0.65);
  const [laserMarginPct, setLaserMarginPct] = useState<number>(60);

  // 7. Electronics & LED Resistor Calculator State
  const [elecMode, setElecMode] = useState<'LED' | 'BATTERY'>('LED');
  const [elecSupplyV, setElecSupplyV] = useState<number>(5.0);
  const [elecLedVf, setElecLedVf] = useState<number>(2.0);
  const [elecLedCurrentMa, setElecLedCurrentMa] = useState<number>(20);
  const [elecLedCount, setElecLedCount] = useState<number>(1);
  const [elecBatteryMah, setElecBatteryMah] = useState<number>(2500);
  const [elecBatteryV, setElecBatteryV] = useState<number>(3.7);
  const [elecLoadCurrentMa, setElecLoadCurrentMa] = useState<number>(150);
  const [elecEfficiencyPct, setElecEfficiencyPct] = useState<number>(85);

  // 8. Silicone Mold Box Calculator State
  const [siliconeBoxShape, setSiliconeBoxShape] = useState<'RECTANGLE' | 'CYLINDER'>('RECTANGLE');
  const [siliconeBoxLengthMm, setSiliconeBoxLengthMm] = useState<number>(120);
  const [siliconeBoxWidthMm, setSiliconeBoxWidthMm] = useState<number>(80);
  const [siliconeBoxHeightMm, setSiliconeBoxHeightMm] = useState<number>(60);
  const [siliconeBoxDiameterMm, setSiliconeBoxDiameterMm] = useState<number>(100);
  const [siliconeDisplacementMode, setSiliconeDisplacementMode] = useState<'WEIGHT' | 'VOLUME'>('WEIGHT');
  const [siliconeMasterWeightG, setSiliconeMasterWeightG] = useState<number>(85);
  const [siliconeMasterDensity, setSiliconeMasterDensity] = useState<number>(1.24);
  const [siliconeMasterVolumeCm3, setSiliconeMasterVolumeCm3] = useState<number>(68.5);
  const [siliconeRatio, setSiliconeRatio] = useState<'1:1' | '10:1'>('1:1');
  const [siliconeDensity, setSiliconeDensity] = useState<number>(1.10);
  const [siliconeCostPerKg, setSiliconeCostPerKg] = useState<number>(85);
  const [siliconeMarginPct, setSiliconeMarginPct] = useState<number>(10);

  // Item Stock Movement History State
  const [historyModalItem, setHistoryModalItem] = useState<InventoryItem | null>(null);
  const [itemTransactions, setItemTransactions] = useState<InventoryTransaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);

  // 9. Woodworking Cut-List & Board-Foot State
  const [woodUnit, setWoodUnit] = useState<'METRIC' | 'IMPERIAL'>('METRIC');
  const [woodStockLength, setWoodStockLength] = useState<number>(2400); // 2400mm or 96"
  const [woodStockWidth, setWoodStockWidth] = useState<number>(140); // 140mm or 5.5"
  const [woodStockThickness, setWoodStockThickness] = useState<number>(38); // 38mm or 1.5"
  const [woodKerf, setWoodKerf] = useState<number>(3.2); // 3.2mm or 0.125"
  const [woodBoardPrice, setWoodBoardPrice] = useState<number>(14.5);
  const [woodCutPieces, setWoodCutPieces] = useState<
    Array<{ id: string; label: string; length: number; quantity: number }>
  >([
    { id: '1', label: 'Legs', length: 750, quantity: 4 },
    { id: '2', label: 'Side Rails', length: 600, quantity: 4 },
    { id: '3', label: 'End Stretchers', length: 400, quantity: 4 },
  ]);

  async function openItemHistory(item: InventoryItem) {
    setHistoryModalItem(item);
    setLoadingTransactions(true);
    try {
      const { data, error } = await supabase
        .from('inventory_transactions')
        .select('*')
        .eq('item_id', item.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      setItemTransactions(data || []);
    } catch (err: any) {
      alert(`Failed to load history: ${err.message}`);
    } finally {
      setLoadingTransactions(false);
    }
  }

  function handleToggleWoodUnit(unit: 'METRIC' | 'IMPERIAL') {
    if (unit === woodUnit) return;
    setWoodUnit(unit);
    if (unit === 'IMPERIAL') {
      setWoodStockLength(96);
      setWoodStockWidth(5.5);
      setWoodStockThickness(1.5);
      setWoodKerf(0.125);
      setWoodCutPieces([
        { id: '1', label: 'Legs', length: 30, quantity: 4 },
        { id: '2', label: 'Side Rails', length: 24, quantity: 4 },
        { id: '3', label: 'End Stretchers', length: 16, quantity: 4 },
      ]);
    } else {
      setWoodStockLength(2400);
      setWoodStockWidth(140);
      setWoodStockThickness(38);
      setWoodKerf(3.2);
      setWoodCutPieces([
        { id: '1', label: 'Legs', length: 750, quantity: 4 },
        { id: '2', label: 'Side Rails', length: 600, quantity: 4 },
        { id: '3', label: 'End Stretchers', length: 400, quantity: 4 },
      ]);
    }
  }

  function handleAddWoodCutPiece() {
    setWoodCutPieces((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substring(2, 9),
        label: `Piece ${prev.length + 1}`,
        length: woodUnit === 'METRIC' ? 500 : 20,
        quantity: 1,
      },
    ]);
  }

  function handleRemoveWoodCutPiece(id: string) {
    setWoodCutPieces((prev) => prev.filter((p) => p.id !== id));
  }

  function handleUpdateWoodCutPiece(id: string, field: 'label' | 'length' | 'quantity', val: any) {
    setWoodCutPieces((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: val } : p))
    );
  }

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

  // Total inventory value converted to preferred currency
  const totalWorkshopValueInPreferred = useMemo(() => {
    return items.reduce((sum, item) => {
      const qty = Number(item.quantity) || 0;
      const price = Number(item.unit_price) || 0;
      const itemCurr = item.currency || 'USD';
      return sum + convertCurrency(qty * price, itemCurr, preferredCurrency);
    }, 0);
  }, [items, preferredCurrency]);

  // Total estimated restock cart cost converted to preferred currency
  const totalCartCostInPreferred = useMemo(() => {
    return cartItems.reduce((sum, item) => {
      const targetQty = Number(item.restock_target_qty) || 1;
      const price = Number(item.unit_price) || 0;
      const itemCurr = item.currency || 'USD';
      return sum + convertCurrency(targetQty * price, itemCurr, preferredCurrency);
    }, 0);
  }, [cartItems, preferredCurrency]);

  // Filtered items for display
  const displayedItems = useMemo(() => {
    return items.filter((item) => {
      if (activeTab === 'MATERIAL' && item.item_type !== 'MATERIAL') return false;
      if (activeTab === 'EQUIPMENT' && item.item_type !== 'EQUIPMENT') return false;
      if (activeTab === 'FINISHED_GOOD' && item.item_type !== 'FINISHED_GOOD') return false;
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

  // Toggle Recipe Public Status
  async function handleToggleRecipePublic(recipe: MakerRecipe) {
    const nextPublic = !recipe.is_public;
    try {
      const { error } = await supabase
        .from('maker_recipes')
        .update({ is_public: nextPublic })
        .eq('id', recipe.id);
      if (error) throw error;
      setRecipes((prev) =>
        prev.map((r) => (r.id === recipe.id ? { ...r, is_public: nextPublic } : r))
      );
      showToast(nextPublic ? 'Formula is now Public on your Maker Profile!' : 'Formula is now Private.');
    } catch (err: any) {
      showToast(err.message || 'Failed to update recipe visibility');
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
        p_batch_notes: batchNotes,
        p_outcome_rating: batchRating || null,
      });

      if (error) throw error;

      // Optimistically append newly recorded batch run to recipe history
      if (data?.run_id) {
        const newRun = {
          id: data.run_id,
          recipe_id: runningRecipe.id,
          user_id: userId,
          batch_multiplier: batchMultiplier,
          units_produced: data.units_produced || 1,
          total_batch_cost: data.total_batch_cost || 0,
          unit_cogs: data.unit_cogs || 0,
          outcome_rating: batchRating || null,
          batch_notes: batchNotes || '',
          created_at: new Date().toISOString(),
        };

        setRecipes((prev) =>
          prev.map((r) =>
            r.id === runningRecipe.id
              ? { ...r, runs: [newRun, ...(r.runs || [])] }
              : r
          )
        );
      }

      // Optimistically decrement ingredient stock & increment finished good output stock
      setItems((prev) =>
        prev.map((item) => {
          // If this is the linked output item
          if (runningRecipe.output_item_id && item.id === runningRecipe.output_item_id) {
            const addedUnits = (Number(runningRecipe.output_yield_qty) || 1) * batchMultiplier;
            const newUnitPrice = data?.unit_cogs || item.unit_price;
            return {
              ...item,
              quantity: (Number(item.quantity) || 0) + addedUnits,
              unit_price: newUnitPrice,
            };
          }

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
      const producedMsg = data?.produced_qty > 0 ? ` Produced +${data.produced_qty} finished units!` : '';
      showToast(`Executed "${runningRecipe.title}" (${batchMultiplier}x batch)!${producedMsg} (+15 XP)`);
      setRunBatchModalOpen(false);
      setRunningRecipe(null);
    } catch (err: any) {
      alert(`Recipe execution error: ${err.message || 'Unknown error'}`);
    } finally {
      setExecutingBatch(false);
    }
  }

  // Universal CSV Exporter
  function handleExportCSV(mode: 'ALL' | 'CART' = 'ALL') {
    const list = mode === 'CART' ? cartItems : items;
    if (list.length === 0) {
      showToast(mode === 'CART' ? 'Restock cart is empty!' : 'No inventory items to export.');
      return;
    }

    const headers = [
      'Name',
      'Type',
      'Quantity',
      'Unit',
      'Unit Price',
      'Currency',
      'Condition',
      'Location / SKU',
      'Low Stock Alert',
      'Restock Target Qty',
      'In Cart',
      'Notes',
    ];

    const escapeCsv = (val: any) => `"${String(val ?? '').replace(/"/g, '""')}"`;

    const rows = list.map((item) => [
      escapeCsv(item.name),
      escapeCsv(item.item_type || 'MATERIAL'),
      item.quantity ?? 0,
      escapeCsv(item.unit || 'pcs'),
      item.unit_price ?? 0,
      escapeCsv(item.currency || preferredCurrency),
      escapeCsv(item.condition || 'GOOD'),
      escapeCsv(item.sku_or_location || ''),
      item.low_stock_threshold ?? 0,
      item.restock_target_qty ?? 1,
      item.in_restock_cart ? 'YES' : 'NO',
      escapeCsv(item.description || ''),
    ]);

    const csvContent =
      '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStr = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `workbench_inventory_${mode.toLowerCase()}_${dateStr}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`Exported ${list.length} items to CSV`);
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

      {/* Pending Calculator Formula Recovery Banner */}
      {pendingFormula && (
        <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-amber-500/15 via-blue-500/10 to-emerald-500/15 border border-amber-500/30 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-amber-950 flex items-center justify-center font-bold text-lg shadow-sm shrink-0">
              <FlaskConical className="w-5 h-5 text-amber-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                  Unsaved Formula
                </span>
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  Save your earlier calculator results
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                Save <strong>&ldquo;{pendingFormula.title}&rdquo;</strong> from your recent lab calculation into your Workshop Formulas.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            <button
              type="button"
              onClick={handleDiscardPendingFormula}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Discard
            </button>
            <button
              type="button"
              onClick={handleSavePendingFormula}
              disabled={savingPendingFormula}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 shadow-sm shadow-blue-500/20 transition"
            >
              {savingPendingFormula ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              <span>Save as Formula</span>
            </button>
          </div>
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
              onClick={() => handleExportCSV(activeTab === 'CART' ? 'CART' : 'ALL')}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs backdrop-blur-md border border-white/20 transition transform active:scale-95"
              title="Export workshop inventory or restock cart to UTF-8 CSV"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={() => setCsvImportModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs backdrop-blur-md border border-white/20 transition transform active:scale-95"
              title="Universal CSV Importer with live preview & validation"
            >
              <Upload className="w-4 h-4" />
              <span>Import CSV</span>
            </button>

            <button
              onClick={() => setBulkModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs backdrop-blur-md border border-white/20 transition transform active:scale-95"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Bulk Quick-Add</span>
            </button>

            <button
              onClick={() => setPrintLabelsModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs backdrop-blur-md border border-white/20 transition transform active:scale-95"
              title="Print Workshop QR Bin Labels or Inventory Order Sheet"
            >
              <Printer className="w-4 h-4" />
              <span>Print Bin Labels</span>
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
              {formatCurrency(totalWorkshopValueInPreferred, preferredCurrency)}
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
          {/* Controls Bar: 2-Row Clean Layout (No horizontal scrolling / clipping) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-sm space-y-4">
            {/* Row 1: All 7 View Tabs Wrapped */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setActiveTab('ALL')}
                className={cn(
                  'px-3.5 py-2 rounded-2xl text-xs font-bold transition',
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
                  'px-3.5 py-2 rounded-2xl text-xs font-bold transition',
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
                  'px-3.5 py-2 rounded-2xl text-xs font-bold transition',
                  activeTab === 'EQUIPMENT'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                )}
              >
                Equipment ({items.filter((i) => i.item_type === 'EQUIPMENT').length})
              </button>
              <button
                onClick={() => setActiveTab('FINISHED_GOOD')}
                className={cn(
                  'flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-bold transition',
                  activeTab === 'FINISHED_GOOD'
                    ? 'bg-amber-600 text-white shadow-md shadow-amber-500/20'
                    : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50'
                )}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Finished Goods</span>
                <span className="px-1.5 py-0.2 rounded-full bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100 text-[10px]">
                  {items.filter((i) => i.item_type === 'FINISHED_GOOD').length}
                </span>
              </button>
              <button
                onClick={() => setActiveTab('RECIPES')}
                className={cn(
                  'flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-bold transition',
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
                  'flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-bold transition',
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
              <button
                onClick={() => setActiveTab('CALCULATORS')}
                className={cn(
                  'flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-bold transition',
                  activeTab === 'CALCULATORS'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                    : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50'
                )}
              >
                <Calculator className="w-3.5 h-3.5" />
                <span>Calculators &amp; Lab</span>
              </button>
            </div>

            {/* Row 2: Search Input + Quick Currency Selector */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder={activeTab === 'RECIPES' ? 'Search formulas, ratios...' : 'Search items, SKU, bin...'}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Quick Currency Selector Pill */}
              <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 shrink-0 self-start sm:self-auto">
                <span className="text-[11px] font-semibold text-slate-400 px-2 uppercase tracking-wider">
                  Display:
                </span>
                {(['USD', 'EUR', 'ILS', 'GBP'] as Currency[]).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => handleCurrencyChange(c)}
                    className={cn(
                      'px-2.5 py-1 rounded-xl text-xs font-extrabold transition',
                      preferredCurrency === c
                        ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    )}
                  >
                    {c === 'USD' ? '$ USD' : c === 'EUR' ? '€ EUR' : c === 'ILS' ? '₪ ILS' : '£ GBP'}
                  </button>
                ))}
              </div>
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
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50 uppercase">
                                {recipe.category}
                              </span>
                              <button
                                onClick={() => handleToggleRecipePublic(recipe)}
                                className={cn(
                                  'flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold transition border',
                                  recipe.is_public
                                    ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
                                )}
                                title={recipe.is_public ? 'Public formula - click to make private' : 'Private formula - click to publish on your Maker Profile'}
                              >
                                <Globe className="w-2.5 h-2.5" />
                                <span>{recipe.is_public ? `Public (${recipe.clones_count || 0})` : 'Private'}</span>
                              </button>
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

                          <div className="flex gap-3 items-start mt-1">
                            {recipe.image_url ? (
                              <img
                                src={recipe.image_url}
                                alt={recipe.title}
                                className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover shrink-0 border border-slate-200 dark:border-slate-800"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                                <FlaskConical className="w-6 h-6" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-base text-slate-900 dark:text-white truncate">
                                {recipe.title}
                              </h3>
                              {recipe.instructions_md && (
                                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
                                  {recipe.instructions_md}
                                </p>
                              )}
                            </div>
                          </div>

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
                          {/* Output Finished Good Link & Unit Economics */}
                          {(() => {
                            const outputItem = items.find((i) => i.id === recipe.output_item_id) || recipe.output_item;
                            const yieldQty = Number(recipe.output_yield_qty) || 1;
                            const packaging = Number(recipe.packaging_overhead) || 4.5;
                            const unitCOGS = (batchCost / yieldQty) + packaging;
                            const retailPrice = Number(recipe.target_retail_price) || 0;
                            const grossProfit = retailPrice > 0 ? retailPrice - unitCOGS : 0;
                            const marginPct = retailPrice > 0 ? (grossProfit / retailPrice) * 100 : 0;

                            return (
                              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                                {outputItem ? (
                                  <div className="flex items-center justify-between p-2.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-900/40 text-xs">
                                    <div className="flex items-center gap-2 truncate mr-2">
                                      <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                      <span className="font-bold text-amber-950 dark:text-amber-100 truncate">
                                        Outputs: {outputItem.name}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0 text-[11px]">
                                      <span className="text-amber-700 dark:text-amber-300">
                                        Yield: <b>{yieldQty} {outputItem.unit || 'pcs'}</b>
                                      </span>
                                      <span>•</span>
                                      <span className="text-slate-500 dark:text-slate-400">
                                        In Stock: <b>{outputItem.quantity} {outputItem.unit || 'pcs'}</b>
                                      </span>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-[11px] text-slate-400 italic px-1">
                                    Raw formula (no finished good output linked).
                                  </div>
                                )}

                                {/* Unit Economics Mini Bar */}
                                <div className="grid grid-cols-3 gap-2 p-2 rounded-2xl bg-slate-50 dark:bg-slate-800/50 text-center text-xs">
                                  <div>
                                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-medium">Unit COGS</span>
                                    <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(unitCOGS, primaryCurrency)}</span>
                                  </div>
                                  <div>
                                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-medium">Target Price</span>
                                    <span className="font-bold text-slate-900 dark:text-white">
                                      {retailPrice > 0 ? formatCurrency(retailPrice, primaryCurrency) : '—'}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-medium">Est. Margin</span>
                                    <span className={cn(
                                      'font-bold text-xs',
                                      retailPrice === 0 ? 'text-slate-400' : marginPct >= 50 ? 'text-emerald-500' : marginPct >= 20 ? 'text-amber-500' : 'text-red-500'
                                    )}>
                                      {retailPrice > 0 ? `${marginPct.toFixed(0)}%` : '—'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
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

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setPrintBatchRecipe(recipe)}
                              className="flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
                              title="Print Recipe Batch Sheet with ingredient checklist & QA sign-off"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>Batch Sheet</span>
                            </button>

                            <button
                              onClick={() => {
                                setRunningRecipe(recipe);
                                setBatchMultiplier(1);
                                setBatchNotes('');
                                setBatchRating(5);
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

                        {/* Past Batch Runs Collapsible Timeline */}
                        {recipe.runs && recipe.runs.length > 0 && (
                          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedRuns((prev) => ({
                                  ...prev,
                                  [recipe.id]: !prev[recipe.id],
                                }))
                              }
                              className="w-full flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 py-1 transition"
                            >
                              <div className="flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-indigo-500" />
                                <span>Past Batch Runs ({recipe.runs.length})</span>
                              </div>
                              {expandedRuns[recipe.id] ? (
                                <ChevronUp className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5" />
                              )}
                            </button>

                            {expandedRuns[recipe.id] && (
                              <div className="space-y-2 mt-2 max-h-56 overflow-y-auto pr-1">
                                {recipe.runs.map((run) => (
                                  <div
                                    key={run.id}
                                    className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/50 dark:border-slate-800 text-xs space-y-1"
                                  >
                                    <div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-200">
                                      <div className="flex items-center gap-1.5">
                                        <span className="px-1.5 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[10px]">
                                          {run.batch_multiplier}x
                                        </span>
                                        <span>
                                          {formatCurrency(run.total_batch_cost, primaryCurrency)}
                                        </span>
                                      </div>
                                      {run.outcome_rating && (
                                        <div className="flex items-center text-amber-400 text-[11px]">
                                          {Array.from({ length: run.outcome_rating }).map((_, i) => (
                                            <Star key={i} className="w-2.5 h-2.5 fill-current" />
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                                      <span>
                                        Yield: {run.units_produced} pcs (COGS: {formatCurrency(run.unit_cogs, primaryCurrency)}/ea)
                                      </span>
                                      <span>{new Date(run.created_at).toLocaleDateString()}</span>
                                    </div>
                                    {run.batch_notes && (
                                      <p className="text-[11px] text-slate-600 dark:text-slate-300 italic pt-0.5 border-t border-slate-200/40 dark:border-slate-700/50">
                                        &ldquo;{run.batch_notes}&rdquo;
                                      </p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
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
                    Direct search generators for Amazon, AliExpress &amp; Temu with target restocking quantities.
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">
                    Total Estimated Cart Cost
                  </span>
                  <span className="text-xl font-extrabold text-purple-600 dark:text-purple-400">
                    {formatCurrency(totalCartCostInPreferred, preferredCurrency)}
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
                              href={`https://www.amazon.com/s?k=${encodeURIComponent(searchPhrase)}&tag=pixelcraft05a-20`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-300 text-xs font-bold border border-amber-300 dark:border-amber-700/60 hover:bg-amber-500/25 transition"
                            >
                              <span>Amazon</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>

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
          ) : activeTab === 'CALCULATORS' ? (
            /* ================= VIEW: INTERACTIVE MAKER CALCULATORS & LAB ================= */
            <div className="space-y-6">
              {/* Header Banner & Sub-tool Selector */}
              <div className="bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-900/60 rounded-3xl p-6 shadow-sm flex flex-col gap-4 overflow-hidden">
                <div>
                  <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                    <Calculator className="w-5 h-5 text-indigo-500" />
                    <span className="text-base">Maker Calculators &amp; Lab Tools</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-3xl">
                    Formulate precise chemical mixtures, calculate mold volumes, dilution ratios, and 3D printing batch economics with 1-click recipe export.
                  </p>
                </div>

                {/* Sub-tool Selector Pills */}
                <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 w-full text-xs font-bold">
                  <button
                    onClick={() => setCalcActiveTool('RESIN')}
                    className={cn(
                      'px-3.5 py-1.5 rounded-xl transition',
                      calcActiveTool === 'RESIN'
                        ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    )}
                  >
                    Epoxy Resin Mold
                  </button>
                  <button
                    onClick={() => setCalcActiveTool('PERFUME')}
                    className={cn(
                      'px-3.5 py-1.5 rounded-xl transition',
                      calcActiveTool === 'PERFUME'
                        ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    )}
                  >
                    Perfume Dilution
                  </button>
                  <button
                    onClick={() => setCalcActiveTool('3D_PRINT')}
                    className={cn(
                      'px-3.5 py-1.5 rounded-xl transition',
                      calcActiveTool === '3D_PRINT'
                        ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    )}
                  >
                    3D Print Costing
                  </button>
                  <button
                    onClick={() => setCalcActiveTool('CROSS_STITCH')}
                    className={cn(
                      'px-3.5 py-1.5 rounded-xl transition',
                      calcActiveTool === 'CROSS_STITCH'
                        ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    )}
                  >
                    Cross-Stitch Fabric
                  </button>
                  <button
                    onClick={() => setCalcActiveTool('CANDLE')}
                    className={cn(
                      'px-3.5 py-1.5 rounded-xl transition',
                      calcActiveTool === 'CANDLE'
                        ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    )}
                  >
                    Candle &amp; Soap
                  </button>
                  <button
                    onClick={() => setCalcActiveTool('LASER_CUT')}
                    className={cn(
                      'px-3.5 py-1.5 rounded-xl transition',
                      calcActiveTool === 'LASER_CUT'
                        ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    )}
                  >
                    Laser &amp; CNC Nesting
                  </button>
                  <button
                    onClick={() => setCalcActiveTool('ELECTRONICS')}
                    className={cn(
                      'px-3.5 py-1.5 rounded-xl transition',
                      calcActiveTool === 'ELECTRONICS'
                        ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    )}
                  >
                    Electronics &amp; LED
                  </button>
                  <button
                    onClick={() => setCalcActiveTool('SILICONE')}
                    className={cn(
                      'px-3.5 py-1.5 rounded-xl transition',
                      calcActiveTool === 'SILICONE'
                        ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    )}
                  >
                    Silicone Mold Box
                  </button>
                  <button
                    onClick={() => setCalcActiveTool('WOODWORKING')}
                    className={cn(
                      'px-3.5 py-1.5 rounded-xl transition',
                      calcActiveTool === 'WOODWORKING'
                        ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    )}
                  >
                    Woodworking &amp; Cut-List
                  </button>
                </div>
              </div>

              {/* 1. EPOXY RESIN CALCULATOR */}
              {calcActiveTool === 'RESIN' && (() => {
                let volCm3 = 0;
                if (resinShape === 'RECTANGLE') {
                  volCm3 = (resinLengthMm * resinWidthMm * resinDepthMm) / 1000;
                } else if (resinShape === 'CYLINDER') {
                  const radiusCm = (resinDiameterMm / 2) / 10;
                  const depthCm = resinDepthMm / 10;
                  volCm3 = Math.PI * radiusCm * radiusCm * depthCm;
                } else {
                  volCm3 = Number(resinCustomVolMl) || 0;
                }

                const totalWeightG = volCm3 * resinDensity;
                let partAWeightG = 0;
                let partBWeightG = 0;
                let ratioLabel = '';

                if (resinRatioPreset === '1:1_VOL') {
                  ratioLabel = '1:1 by Volume (approx. 52% A / 48% B by weight)';
                  partAWeightG = totalWeightG * 0.52;
                  partBWeightG = totalWeightG * 0.48;
                } else if (resinRatioPreset === '2:1_WT') {
                  ratioLabel = '2:1 by Weight (66.7% A / 33.3% B)';
                  partAWeightG = (totalWeightG / 3) * 2;
                  partBWeightG = (totalWeightG / 3) * 1;
                } else if (resinRatioPreset === '3:1_WT') {
                  ratioLabel = '3:1 by Weight (75% A / 25% B)';
                  partAWeightG = (totalWeightG / 4) * 3;
                  partBWeightG = (totalWeightG / 4) * 1;
                } else {
                  ratioLabel = '100:44 by Weight (69.4% A / 30.6% B - Deep Pour)';
                  partAWeightG = totalWeightG * (100 / 144);
                  partBWeightG = totalWeightG * (44 / 144);
                }

                const isExothermicRisk = totalWeightG > 100 && resinDepthMm > 20;
                const isPrecisionScaleNotice = totalWeightG < 20 && totalWeightG > 0;

                function handleSaveResinRecipe() {
                  const prefill: any = {
                    id: '',
                    user_id: userId,
                    title: `Epoxy Mold Cast (${Math.round(volCm3)}ml)`,
                    category: 'Epoxy & Molds',
                    instructions_md: `Epoxy Mix Ratio: ${ratioLabel}\n- Part A (Resin): ${partAWeightG.toFixed(1)}g\n- Part B (Hardener): ${partBWeightG.toFixed(1)}g\n- Total Volume: ${volCm3.toFixed(1)}ml (${totalWeightG.toFixed(1)}g)\n\nStir slowly for 3 minutes scraping sides and bottom. Vacuum degas or torch micro-bubbles. Demold after 24h at 22-25°C ambient.`,
                    rating: 5,
                    output_yield_qty: 1,
                    packaging_overhead: 4.5,
                    target_retail_price: Math.round(totalWeightG * 0.4 + 30),
                  };
                  setEditingRecipe(prefill);
                  setRecipeModalOpen(true);
                }

                return (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left: Input Parameters */}
                    <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-5">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                          <span>Mold Dimensions &amp; Mix Ratio</span>
                        </h3>
                        <span className="text-[11px] font-semibold text-slate-400">
                          Density: {resinDensity} g/cm³
                        </span>
                      </div>

                      {/* Shape Selector */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                          Cavity Geometry
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {(['RECTANGLE', 'CYLINDER', 'CUSTOM'] as const).map((shape) => (
                            <button
                              key={shape}
                              type="button"
                              onClick={() => setResinShape(shape)}
                              className={cn(
                                'py-2 px-3 rounded-2xl text-xs font-bold transition text-center',
                                resinShape === shape
                                  ? 'bg-indigo-600 text-white shadow-sm'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                              )}
                            >
                              {shape === 'RECTANGLE' ? 'Rectangular Block' : shape === 'CYLINDER' ? 'Cylinder / Disc' : 'Direct Volume (ml)'}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Dimensions Input Fields */}
                      {resinShape === 'RECTANGLE' && (
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                              Length (mm)
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={resinLengthMm}
                              onChange={(e) => setResinLengthMm(Math.max(1, parseFloat(e.target.value) || 0))}
                              className="w-full px-3 py-2 rounded-xl text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                              Width (mm)
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={resinWidthMm}
                              onChange={(e) => setResinWidthMm(Math.max(1, parseFloat(e.target.value) || 0))}
                              className="w-full px-3 py-2 rounded-xl text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                              Depth / Height (mm)
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={resinDepthMm}
                              onChange={(e) => setResinDepthMm(Math.max(1, parseFloat(e.target.value) || 0))}
                              className="w-full px-3 py-2 rounded-xl text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                        </div>
                      )}

                      {resinShape === 'CYLINDER' && (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                              Diameter (mm)
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={resinDiameterMm}
                              onChange={(e) => setResinDiameterMm(Math.max(1, parseFloat(e.target.value) || 0))}
                              className="w-full px-3 py-2 rounded-xl text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                              Depth / Thickness (mm)
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={resinDepthMm}
                              onChange={(e) => setResinDepthMm(Math.max(1, parseFloat(e.target.value) || 0))}
                              className="w-full px-3 py-2 rounded-xl text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                        </div>
                      )}

                      {resinShape === 'CUSTOM' && (
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                            Known Mold Volume (ml / cm³)
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={resinCustomVolMl}
                            onChange={(e) => setResinCustomVolMl(Math.max(1, parseFloat(e.target.value) || 0))}
                            className="w-full px-3 py-2 rounded-xl text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                      )}

                      {/* Resin Mix Ratio Preset */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                          Epoxy System Ratio Formula
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {[
                            { id: '1:1_VOL', label: '1:1 by Vol', desc: 'Standard Craft' },
                            { id: '2:1_WT', label: '2:1 by Wt', desc: 'Tabletop / Art' },
                            { id: '3:1_WT', label: '3:1 by Wt', desc: 'Crystal Clear' },
                            { id: '100:44_WT', label: '100:44 by Wt', desc: 'Deep Cast 50mm' },
                          ].map((r) => (
                            <button
                              key={r.id}
                              type="button"
                              onClick={() => setResinRatioPreset(r.id as any)}
                              className={cn(
                                'p-2.5 rounded-2xl text-left border transition',
                                resinRatioPreset === r.id
                                  ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-200'
                                  : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400'
                              )}
                            >
                              <span className="font-bold text-xs block">{r.label}</span>
                              <span className="text-[10px] text-slate-400">{r.desc}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Warnings / Safety Alerts */}
                      {isExothermicRisk && (
                        <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300">
                          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold block">⚠️ Exothermic Thermal Runaway Risk</span>
                            <span className="text-[11px] leading-relaxed">
                              Batches over 100g with depth &gt;20mm produce intense exothermic heat that can crack or yellow resin. Use slow deep-pour hardener (e.g. 100:44) or pour in multiple &lt;15mm layers.
                            </span>
                          </div>
                        </div>
                      )}

                      {isPrecisionScaleNotice && (
                        <div className="p-3.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-2xl flex items-start gap-2.5 text-xs text-blue-800 dark:text-blue-300">
                          <Sparkles className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold block">⚖️ Micro-Batch Scale Precision Notice</span>
                            <span className="text-[11px] leading-relaxed">
                              Batches under 20g are extremely sensitive to ±1g scale inaccuracies. Use a 0.01g jeweler scale to prevent sticky uncured resin.
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right: Mix Breakdown & 1-Click Recipe Export */}
                    <div className="bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-blue-500/5 dark:from-slate-900 dark:to-slate-900 border border-indigo-200/80 dark:border-indigo-900/60 rounded-3xl p-6 shadow-sm flex flex-col justify-between space-y-5">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-indigo-100 dark:border-slate-800">
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                            Scale Batch Results
                          </span>
                          <span className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400">
                            {volCm3.toFixed(1)} ml
                          </span>
                        </div>

                        {/* Part A Card */}
                        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700 space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-700 dark:text-slate-300">Part A (Resin Base)</span>
                            <span className="text-base font-extrabold text-indigo-600 dark:text-indigo-400">
                              {partAWeightG.toFixed(1)} g
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 block">
                            Weigh on calibrated digital scale
                          </span>
                        </div>

                        {/* Part B Card */}
                        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700 space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-700 dark:text-slate-300">Part B (Hardener)</span>
                            <span className="text-base font-extrabold text-purple-600 dark:text-purple-400">
                              {partBWeightG.toFixed(1)} g
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 block">
                            Add Part B directly to Part A
                          </span>
                        </div>

                        {/* Total Summary */}
                        <div className="p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-xs space-y-1.5">
                          <div className="flex items-center justify-between font-bold text-indigo-950 dark:text-indigo-200">
                            <span>Total Mixture Weight:</span>
                            <span className="text-sm font-extrabold">{totalWeightG.toFixed(1)} g</span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-indigo-700 dark:text-indigo-300">
                            <span>Mold Volume:</span>
                            <span>{volCm3.toFixed(1)} ml / cm³</span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-indigo-700 dark:text-indigo-300">
                            <span>Pot Life / Working Time:</span>
                            <span>~30–45 mins</span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleSaveResinRecipe}
                        className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-500/20 transition transform active:scale-95"
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>Save as New Formula</span>
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* 2. PERFUME CONCENTRATION & DILUTION CALCULATOR */}
              {calcActiveTool === 'PERFUME' && (() => {
                let concPct = 18;
                let concLabel = 'Eau de Parfum (EDP)';
                if (perfumeConcentration === 'EXTRAIT') {
                  concPct = 25;
                  concLabel = 'Extrait de Parfum (25%)';
                } else if (perfumeConcentration === 'EDP') {
                  concPct = 18;
                  concLabel = 'Eau de Parfum (18%)';
                } else if (perfumeConcentration === 'EDT') {
                  concPct = 12;
                  concLabel = 'Eau de Toilette (12%)';
                } else if (perfumeConcentration === 'EDC') {
                  concPct = 5;
                  concLabel = 'Eau de Cologne (5%)';
                } else {
                  concPct = Number(perfumeCustomPct) || 15;
                  concLabel = `Custom Concentration (${concPct}%)`;
                }

                const fragranceVolMl = perfumeBottleMl * (concPct / 100);
                const alcoholVolMl = perfumeBottleMl - fragranceVolMl;

                const fragranceWeightG = fragranceVolMl * fragranceOilDensity;
                const alcoholWeightG = alcoholVolMl * alcoholDensity;
                const totalWeightG = fragranceWeightG + alcoholWeightG;

                function handleSavePerfumeRecipe() {
                  const prefill: any = {
                    id: '',
                    user_id: userId,
                    title: `Perfume Accord (${perfumeConcentration} ${perfumeBottleMl}ml)`,
                    category: 'Perfume Lab',
                    instructions_md: `Perfume Concentration Formula (${concLabel}):\n- Bottle Size: ${perfumeBottleMl}ml\n- Fragrance Oil Concentrate: ${fragranceVolMl.toFixed(1)}ml (${fragranceWeightG.toFixed(1)}g)\n- Perfumer's Alcohol (96%): ${alcoholVolMl.toFixed(1)}ml (${alcoholWeightG.toFixed(1)}g)\n\nMaceration Guide: Shake well and rest in dark amber glass at 18-21°C for 3 to 6 weeks. Chill filter before final bottling.`,
                    rating: 5,
                    output_yield_qty: 1,
                    packaging_overhead: 8.5,
                    target_retail_price: Math.round(perfumeBottleMl * 2.5 + 50),
                  };
                  setEditingRecipe(prefill);
                  setRecipeModalOpen(true);
                }

                return (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-5">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                          <span>Fragrance Architecture &amp; Dilution</span>
                        </h3>
                        <span className="text-[11px] font-semibold text-slate-400">
                          Alcohol Density: {alcoholDensity} g/ml
                        </span>
                      </div>

                      {/* Bottle Size Selector */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                          Target Bottle Volume (ml)
                        </label>
                        <div className="grid grid-cols-4 gap-2">
                          {[10, 30, 50, 100].map((size) => (
                            <button
                              key={size}
                              type="button"
                              onClick={() => setPerfumeBottleMl(size)}
                              className={cn(
                                'py-2 px-3 rounded-2xl text-xs font-bold transition text-center',
                                perfumeBottleMl === size
                                  ? 'bg-indigo-600 text-white shadow-sm'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                              )}
                            >
                              {size} ml
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Concentration Class Selector */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                          Concentration Class
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {[
                            { id: 'EXTRAIT', label: 'Extrait', pct: '25%', longevity: '10–14 hrs' },
                            { id: 'EDP', label: 'Eau de Parfum', pct: '18%', longevity: '6–8 hrs' },
                            { id: 'EDT', label: 'Eau de Toilette', pct: '12%', longevity: '4–6 hrs' },
                            { id: 'EDC', label: 'Cologne', pct: '5%', longevity: '2–3 hrs' },
                          ].map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => setPerfumeConcentration(c.id as any)}
                              className={cn(
                                'p-2.5 rounded-2xl text-left border transition',
                                perfumeConcentration === c.id
                                  ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-200'
                                  : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400'
                              )}
                            >
                              <div className="flex items-center justify-between font-bold text-xs">
                                <span>{c.label}</span>
                                <span className="text-indigo-600 dark:text-indigo-400 font-extrabold">{c.pct}</span>
                              </div>
                              <span className="text-[10px] text-slate-400">{c.longevity}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Maceration & Maturation Notice */}
                      <div className="p-3.5 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-2xl flex items-start gap-2.5 text-xs text-purple-900 dark:text-purple-300">
                        <FlaskConical className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold block">✨ Maceration &amp; Maturation Protocol</span>
                          <span className="text-[11px] leading-relaxed">
                            For smooth, non-pungent scent evolution, allow the mixed perfume to macerate in amber glass in a dark, cool cupboard (18–20°C) for at least 3 weeks before first use.
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Dilution Breakdown & Export */}
                    <div className="bg-gradient-to-br from-purple-500/5 via-indigo-500/5 to-pink-500/5 dark:from-slate-900 dark:to-slate-900 border border-purple-200/80 dark:border-purple-900/60 rounded-3xl p-6 shadow-sm flex flex-col justify-between space-y-5">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-purple-100 dark:border-slate-800">
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                            Batch Volume
                          </span>
                          <span className="text-xs font-extrabold text-purple-600 dark:text-purple-400">
                            {perfumeBottleMl} ml
                          </span>
                        </div>

                        {/* Fragrance Oil Card */}
                        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700 space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-700 dark:text-slate-300">Fragrance Compound</span>
                            <span className="text-base font-extrabold text-purple-600 dark:text-purple-400">
                              {fragranceWeightG.toFixed(1)} g
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 block">
                            {fragranceVolMl.toFixed(1)} ml ({concPct}% concentration)
                          </span>
                        </div>

                        {/* Perfumers Alcohol Card */}
                        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700 space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-700 dark:text-slate-300">Perfumer's Alcohol (96%)</span>
                            <span className="text-base font-extrabold text-indigo-600 dark:text-indigo-400">
                              {alcoholWeightG.toFixed(1)} g
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 block">
                            {alcoholVolMl.toFixed(1)} ml base carrier
                          </span>
                        </div>

                        {/* Total Summary */}
                        <div className="p-3.5 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-xs space-y-1.5">
                          <div className="flex items-center justify-between font-bold text-purple-950 dark:text-purple-200">
                            <span>Total Bottle Liquid Weight:</span>
                            <span className="text-sm font-extrabold">{totalWeightG.toFixed(1)} g</span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-purple-700 dark:text-purple-300">
                            <span>Concentration Class:</span>
                            <span>{concLabel}</span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleSavePerfumeRecipe}
                        className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md shadow-purple-500/20 transition transform active:scale-95"
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>Save as New Formula</span>
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* 3. 3D PRINT COSTING CALCULATOR */}
              {calcActiveTool === '3D_PRINT' && (() => {
                const totalHours = printHours + (printMinutes / 60);
                const filamentCost = (partWeightG / spoolWeightG) * spoolCost * (1 + printFailureBuffer / 100);
                const kwhConsumed = (printerWatts / 1000) * totalHours;
                const powerCost = kwhConsumed * kwhRate;
                const totalMfgCost = filamentCost + powerCost;
                const suggestedPrice = targetMarginPct >= 95 ? totalMfgCost * 2 : totalMfgCost / (1 - (targetMarginPct / 100));
                const estProfit = suggestedPrice - totalMfgCost;

                function handleSavePrintRecipe() {
                  const prefill: any = {
                    id: '',
                    user_id: userId,
                    title: `3D Print: ${printMaterial} (${partWeightG}g, ${printHours}h${printMinutes}m)`,
                    category: '3D Printing',
                    instructions_md: `3D Printing Cost Sheet (${printMaterial}):\n- Sliced Weight: ${partWeightG}g (Spool: ${formatCurrency(spoolCost, 'ILS')}/kg)\n- Print Duration: ${printHours}h ${printMinutes}m\n- Machine Power: ${printerWatts}W (${kwhConsumed.toFixed(2)} kWh)\n- Filament Cost: ${formatCurrency(filamentCost, 'ILS')}\n- Electricity Cost: ${formatCurrency(powerCost, 'ILS')}\n- Base Unit Cost: ${formatCurrency(totalMfgCost, 'ILS')}\n- Target Retail Price (${targetMarginPct}% margin): ${formatCurrency(suggestedPrice, 'ILS')}`,
                    rating: 5,
                    output_yield_qty: 1,
                    packaging_overhead: 4.5,
                    target_retail_price: Math.round(suggestedPrice),
                  };
                  setEditingRecipe(prefill);
                  setRecipeModalOpen(true);
                }

                return (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-5">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                          <span>Print Parameters &amp; Machine Overhead</span>
                        </h3>
                        <span className="text-[11px] font-semibold text-slate-400">
                          Electricity Rate: ₪{kwhRate}/kWh
                        </span>
                      </div>

                      {/* Material Selector */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                          Filament Polymer
                        </label>
                        <div className="grid grid-cols-5 gap-2">
                          {['PLA', 'PETG', 'ABS', 'TPU', 'Resin'].map((mat) => (
                            <button
                              key={mat}
                              type="button"
                              onClick={() => setPrintMaterial(mat)}
                              className={cn(
                                'py-2 px-2.5 rounded-2xl text-xs font-bold transition text-center',
                                printMaterial === mat
                                  ? 'bg-indigo-600 text-white shadow-sm'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                              )}
                            >
                              {mat}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Weight & Spool Pricing */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                            Model Weight (g)
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={partWeightG}
                            onChange={(e) => setPartWeightG(Math.max(1, parseFloat(e.target.value) || 0))}
                            className="w-full px-3 py-2 rounded-xl text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                            Spool Price (₪)
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={spoolCost}
                            onChange={(e) => setSpoolCost(Math.max(1, parseFloat(e.target.value) || 0))}
                            className="w-full px-3 py-2 rounded-xl text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                            Failure Buffer (%)
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="50"
                            value={printFailureBuffer}
                            onChange={(e) => setPrintFailureBuffer(Math.max(0, parseFloat(e.target.value) || 0))}
                            className="w-full px-3 py-2 rounded-xl text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                      </div>

                      {/* Print Duration & Machine Power */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                            Print Hours
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={printHours}
                            onChange={(e) => setPrintHours(Math.max(0, parseInt(e.target.value, 10) || 0))}
                            className="w-full px-3 py-2 rounded-xl text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                            Print Minutes
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="59"
                            value={printMinutes}
                            onChange={(e) => setPrintMinutes(Math.max(0, parseInt(e.target.value, 10) || 0))}
                            className="w-full px-3 py-2 rounded-xl text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                            Printer Power (W)
                          </label>
                          <input
                            type="number"
                            min="20"
                            value={printerWatts}
                            onChange={(e) => setPrinterWatts(Math.max(20, parseInt(e.target.value, 10) || 150))}
                            className="w-full px-3 py-2 rounded-xl text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                            Target Margin (%)
                          </label>
                          <input
                            type="number"
                            min="10"
                            max="90"
                            value={targetMarginPct}
                            onChange={(e) => setTargetMarginPct(Math.max(10, Math.min(90, parseInt(e.target.value, 10) || 60)))}
                            className="w-full px-3 py-2 rounded-xl text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Right: Costing Breakdown */}
                    <div className="bg-gradient-to-br from-indigo-500/5 via-blue-500/5 to-cyan-500/5 dark:from-slate-900 dark:to-slate-900 border border-indigo-200/80 dark:border-indigo-900/60 rounded-3xl p-6 shadow-sm flex flex-col justify-between space-y-5">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-indigo-100 dark:border-slate-800">
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                            Total Manufacturing Cost
                          </span>
                          <span className="text-base font-extrabold text-indigo-600 dark:text-indigo-400">
                            {formatCurrency(totalMfgCost, 'ILS')}
                          </span>
                        </div>

                        {/* Breakdown line items */}
                        <div className="space-y-2 text-xs">
                          <div className="p-3 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700 flex items-center justify-between">
                            <span className="text-slate-600 dark:text-slate-300">
                              Filament ({partWeightG}g + {printFailureBuffer}% purge)
                            </span>
                            <span className="font-bold text-slate-900 dark:text-white">
                              {formatCurrency(filamentCost, 'ILS')}
                            </span>
                          </div>

                          <div className="p-3 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700 flex items-center justify-between">
                            <span className="text-slate-600 dark:text-slate-300">
                              Electricity ({kwhConsumed.toFixed(2)} kWh)
                            </span>
                            <span className="font-bold text-slate-900 dark:text-white">
                              {formatCurrency(powerCost, 'ILS')}
                            </span>
                          </div>
                        </div>

                        {/* Suggested Selling Price Card */}
                        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs space-y-1.5">
                          <div className="flex items-center justify-between font-bold text-emerald-950 dark:text-emerald-200">
                            <span>Suggested Selling Price ({targetMarginPct}% margin):</span>
                            <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">
                              {formatCurrency(suggestedPrice, 'ILS')}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-emerald-700 dark:text-emerald-300">
                            <span>Estimated Gross Profit:</span>
                            <span>{formatCurrency(estProfit, 'ILS')} / unit</span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleSavePrintRecipe}
                        className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-500/20 transition transform active:scale-95"
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>Save as New Formula</span>
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* 4. CROSS-STITCH & FABRIC CALCULATOR */}
              {calcActiveTool === 'CROSS_STITCH' && (() => {
                const stitchWidthSafe = Math.max(1, stitchWidth || 1);
                const stitchHeightSafe = Math.max(1, stitchHeight || 1);
                const aidaSafe = Math.max(1, stitchAidaCount || 14);
                const marginSafe = Math.max(0, stitchBorderMargin || 0);

                const designWidthIn = stitchWidthSafe / aidaSafe;
                const designHeightIn = stitchHeightSafe / aidaSafe;
                const designWidthCm = designWidthIn * 2.54;
                const designHeightCm = designHeightIn * 2.54;

                const cutWidthCm = designWidthCm + 2 * marginSafe;
                const cutHeightCm = designHeightCm + 2 * marginSafe;
                const cutWidthIn = cutWidthCm / 2.54;
                const cutHeightIn = cutHeightCm / 2.54;

                const totalStitches = stitchWidthSafe * stitchHeightSafe;
                const cmPerStitch = (14 / aidaSafe) * 2.2;
                const singleStrandMeters = (totalStitches * cmPerStitch * stitchStrands) / 100;
                // Standard DMC skein is 8 meters of 6-strand floss = 48 meters single strand
                const skeinsEstimated = Math.ceil(((singleStrandMeters * 1.15) / 48) * 10) / 10;

                const tapestryNeedle =
                  aidaSafe <= 11
                    ? 'Size 22 Tapestry'
                    : aidaSafe <= 14
                    ? 'Size 24 Tapestry'
                    : aidaSafe <= 18
                    ? 'Size 26 Tapestry'
                    : 'Size 28 Tapestry';

                function handleSaveCrossStitchRecipe() {
                  const prefill: any = {
                    id: '',
                    user_id: userId,
                    title: `Cross-Stitch Fabric & Skein Plan (${stitchWidthSafe}x${stitchHeightSafe} on ${aidaSafe}ct)`,
                    category: 'Cross-Stitch & Textiles',
                    instructions_md: `Cross-Stitch Dimensions & Sizing:\n- Design Stitches: ${stitchWidthSafe} W x ${stitchHeightSafe} H (${totalStitches.toLocaleString()} stitches)\n- Aida Fabric Count: ${aidaSafe}ct (${stitchStrands} strands)\n- Stitched Area: ${designWidthCm.toFixed(1)} x ${designHeightCm.toFixed(1)} cm (${designWidthIn.toFixed(1)}" x ${designHeightIn.toFixed(1)}")\n- Cut Fabric Size (+${marginSafe}cm border): ${cutWidthCm.toFixed(1)} x ${cutHeightCm.toFixed(1)} cm (${cutWidthIn.toFixed(1)}" x ${cutHeightIn.toFixed(1)}")\n- Recommended Needle: ${tapestryNeedle}\n- Estimated Floss Needed: ~${skeinsEstimated} DMC 8m skeins (~${singleStrandMeters.toFixed(0)}m single strand with 15% buffer).`,
                    rating: 5,
                    output_yield_qty: 1,
                    packaging_overhead: 10,
                    target_retail_price: Math.round(totalStitches * 0.05 + 50),
                  };
                  setEditingRecipe(prefill);
                  setRecipeModalOpen(true);
                }

                return (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left: Input Parameters */}
                    <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-5">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                          <Grid className="w-4 h-4 text-indigo-500" />
                          <span>Pattern Dimensions &amp; Fabric Count</span>
                        </h3>
                        <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-900/40">
                          {aidaSafe} Count Aida
                        </span>
                      </div>

                      {/* Stitch Dimensions */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                            Pattern Width (Stitches)
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={stitchWidth}
                            onChange={(e) => setStitchWidth(Math.max(1, parseInt(e.target.value) || 0))}
                            className="w-full px-3 py-2 rounded-xl text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                            Pattern Height (Stitches)
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={stitchHeight}
                            onChange={(e) => setStitchHeight(Math.max(1, parseInt(e.target.value) || 0))}
                            className="w-full px-3 py-2 rounded-xl text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                      </div>

                      {/* Aida Count Presets */}
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1.5">
                          Fabric / Aida Count (Stitches per Inch)
                        </label>
                        <div className="grid grid-cols-5 gap-2">
                          {[11, 14, 16, 18, 22].map((ct) => (
                            <button
                              key={ct}
                              type="button"
                              onClick={() => setStitchAidaCount(ct)}
                              className={cn(
                                'py-2 rounded-xl text-xs font-bold transition border',
                                stitchAidaCount === ct
                                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-indigo-400'
                              )}
                            >
                              {ct} ct
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Margin & Strands */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                            Framing Border Margin (cm on each side)
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            value={stitchBorderMargin}
                            onChange={(e) => setStitchBorderMargin(Math.max(0, parseFloat(e.target.value) || 0))}
                            className="w-full px-3 py-2 rounded-xl text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                            Floss Strands per Stitch
                          </label>
                          <div className="grid grid-cols-4 gap-1.5">
                            {[1, 2, 3, 4].map((s) => (
                              <button
                                key={s}
                                type="button"
                                onClick={() => setStitchStrands(s)}
                                className={cn(
                                  'py-2 rounded-xl text-xs font-bold transition border',
                                  stitchStrands === s
                                    ? 'bg-indigo-600 text-white border-indigo-600'
                                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                                )}
                              >
                                {s} {s === 2 ? '(Std)' : ''}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right: Calculations & Save */}
                    <div className="bg-gradient-to-br from-indigo-50/50 to-purple-50/30 dark:from-indigo-950/20 dark:to-purple-950/10 border border-indigo-100 dark:border-indigo-900/40 rounded-3xl p-6 shadow-sm flex flex-col justify-between gap-5">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-indigo-100 dark:border-indigo-900/40">
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Required Fabric Cut
                          </span>
                          <span className="text-base font-extrabold text-indigo-600 dark:text-indigo-400">
                            {cutWidthCm.toFixed(1)} × {cutHeightCm.toFixed(1)} cm
                          </span>
                        </div>

                        {/* Stitched area vs Cut fabric */}
                        <div className="space-y-2 text-xs">
                          <div className="p-3 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700 flex items-center justify-between">
                            <span className="text-slate-600 dark:text-slate-300">Stitched Area:</span>
                            <span className="font-bold text-slate-900 dark:text-white">
                              {designWidthCm.toFixed(1)} × {designHeightCm.toFixed(1)} cm ({designWidthIn.toFixed(1)}" × {designHeightIn.toFixed(1)}")
                            </span>
                          </div>

                          <div className="p-3 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700 flex items-center justify-between">
                            <span className="text-slate-600 dark:text-slate-300">Cut Fabric (+{marginSafe}cm margin):</span>
                            <span className="font-bold text-indigo-600 dark:text-indigo-400">
                              {cutWidthIn.toFixed(1)}" × {cutHeightIn.toFixed(1)}" in
                            </span>
                          </div>

                          <div className="p-3 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700 flex items-center justify-between">
                            <span className="text-slate-600 dark:text-slate-300">Total Stitch Count:</span>
                            <span className="font-bold text-slate-900 dark:text-white">
                              {totalStitches.toLocaleString()} stitches
                            </span>
                          </div>

                          <div className="p-3 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700 flex items-center justify-between">
                            <span className="text-slate-600 dark:text-slate-300">DMC 8m Skein Estimate:</span>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">
                              ~{skeinsEstimated} skeins ({singleStrandMeters.toFixed(0)}m floss)
                            </span>
                          </div>

                          <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-900 dark:text-amber-200 flex items-center justify-between">
                            <span>Recommended Needle:</span>
                            <span className="font-bold">{tapestryNeedle}</span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleSaveCrossStitchRecipe}
                        className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-500/20 transition transform active:scale-95"
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>Save as New Formula</span>
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* 5. CANDLE & SOAP BATCH CALCULATOR */}
              {calcActiveTool === 'CANDLE' && (() => {
                const waterWeightSafe = Math.max(1, candleWaterWeight || 200);
                const unitsSafe = Math.max(1, candleUnits || 1);
                const foPctSafe = Math.max(1, candleFragrancePct || 8);

                let waxDensity = 0.86;
                let baseName = 'Soy Wax (464)';
                if (candleWaxType === 'PARAFFIN') {
                  waxDensity = 0.90;
                  baseName = 'Paraffin / Blend';
                } else if (candleWaxType === 'BEESWAX') {
                  waxDensity = 0.88;
                  baseName = 'Beeswax / Coconut';
                } else if (candleWaxType === 'SOAP_BASE') {
                  waxDensity = 1.05;
                  baseName = 'Melt & Pour Soap';
                }

                // Candle physics: container fill weight = water weight * wax density
                const singleFillWeight = waterWeightSafe * waxDensity;
                const totalBatchFillWeight = singleFillWeight * unitsSafe;
                // Wax weight = total / (1 + fragranceLoad)
                const totalWaxGrams = totalBatchFillWeight / (1 + foPctSafe / 100);
                const totalFragranceGrams = totalWaxGrams * (foPctSafe / 100);

                const waxPerUnitGrams = totalWaxGrams / unitsSafe;
                const fragrancePerUnitGrams = totalFragranceGrams / unitsSafe;

                const waxCost = (totalWaxGrams / 1000) * (candleWaxPricePerKg || 45);
                const fragranceCost = (totalFragranceGrams / 100) * (candleFragrancePricePer100g || 35);
                const packagingCost = unitsSafe * (candlePackagingPerUnit || 5);
                const totalBatchCost = waxCost + fragranceCost + packagingCost;
                const unitCOGS = totalBatchCost / unitsSafe;
                const suggestedRetail = unitCOGS / (1 - 0.65); // 65% craft margin

                function handleSaveCandleRecipe() {
                  const prefill: any = {
                    id: '',
                    user_id: userId,
                    title: `Candle/Soap Batch (${unitsSafe}x ${waterWeightSafe}ml @ ${foPctSafe}% FO)`,
                    category: 'Candles & Soap',
                    instructions_md: `Batch Formulation (${baseName}):\n- Units: ${unitsSafe} containers (${waterWeightSafe}ml water capacity each)\n- Fragrance Load: ${foPctSafe}%\n- Base/Wax Weight: ${totalWaxGrams.toFixed(1)}g (${waxPerUnitGrams.toFixed(1)}g / unit)\n- Fragrance Oil: ${totalFragranceGrams.toFixed(1)}g (${fragrancePerUnitGrams.toFixed(1)}g / unit)\n- Total Batch Weight: ${totalBatchFillWeight.toFixed(1)}g\n\nPouring Instructions:\n1. Heat wax/base to 85°C (185°F).\n2. Remove from heat and stir in fragrance oil at 80°C (176°F) for 2 continuous minutes.\n3. Pour slowly at 57-60°C (135-140°F) into preheated vessels with centered wicks.\n4. Cure for 10-14 days before test burning.`,
                    rating: 5,
                    output_yield_qty: unitsSafe,
                    packaging_overhead: candlePackagingPerUnit,
                    target_retail_price: Math.round(suggestedRetail),
                  };
                  setEditingRecipe(prefill);
                  setRecipeModalOpen(true);
                }

                return (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left: Input Parameters */}
                    <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-5">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                          <Flame className="w-4 h-4 text-amber-500" />
                          <span>Container Sizing &amp; Base Selection</span>
                        </h3>
                        <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-900/40">
                          {baseName}
                        </span>
                      </div>

                      {/* Base Type Selector */}
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1.5">
                          Wax or Soap Base Type
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {[
                            { id: 'SOY', label: 'Soy Wax (0.86)' },
                            { id: 'PARAFFIN', label: 'Paraffin (0.90)' },
                            { id: 'BEESWAX', label: 'Beeswax (0.88)' },
                            { id: 'SOAP_BASE', label: 'Melt Soap (1.05)' },
                          ].map((b) => (
                            <button
                              key={b.id}
                              type="button"
                              onClick={() => setCandleWaxType(b.id as any)}
                              className={cn(
                                'py-2 px-2 text-center rounded-xl text-xs font-bold transition border',
                                candleWaxType === b.id
                                  ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-amber-400'
                              )}
                            >
                              {b.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Container Volume & Units */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                            Vessel Water Capacity (ml/g)
                          </label>
                          <input
                            type="number"
                            min="10"
                            value={candleWaterWeight}
                            onChange={(e) => setCandleWaterWeight(Math.max(1, parseFloat(e.target.value) || 0))}
                            className="w-full px-3 py-2 rounded-xl text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                            Container Count (Units)
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={candleUnits}
                            onChange={(e) => setCandleUnits(Math.max(1, parseInt(e.target.value) || 0))}
                            className="w-full px-3 py-2 rounded-xl text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                            Fragrance Load ({foPctSafe}%)
                          </label>
                          <input
                            type="range"
                            min="3"
                            max="12"
                            step="0.5"
                            value={candleFragrancePct}
                            onChange={(e) => setCandleFragrancePct(parseFloat(e.target.value) || 8)}
                            className="w-full accent-amber-500 mt-2"
                          />
                        </div>
                      </div>

                      {/* Material Pricing */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                            Wax Price / kg ({preferredCurrency})
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={candleWaxPricePerKg}
                            onChange={(e) => setCandleWaxPricePerKg(Math.max(0, parseFloat(e.target.value) || 0))}
                            className="w-full px-3 py-2 rounded-xl text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                            Fragrance Oil / 100g ({preferredCurrency})
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={candleFragrancePricePer100g}
                            onChange={(e) => setCandleFragrancePricePer100g(Math.max(0, parseFloat(e.target.value) || 0))}
                            className="w-full px-3 py-2 rounded-xl text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                            Vessel &amp; Wick / unit ({preferredCurrency})
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={candlePackagingPerUnit}
                            onChange={(e) => setCandlePackagingPerUnit(Math.max(0, parseFloat(e.target.value) || 0))}
                            className="w-full px-3 py-2 rounded-xl text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Right: Calculations & Save */}
                    <div className="bg-gradient-to-br from-amber-50/50 to-orange-50/30 dark:from-amber-950/20 dark:to-orange-950/10 border border-amber-100 dark:border-amber-900/40 rounded-3xl p-6 shadow-sm flex flex-col justify-between gap-5">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-amber-100 dark:border-amber-900/40">
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Total Batch Weight
                          </span>
                          <span className="text-base font-extrabold text-amber-600 dark:text-amber-400">
                            {totalBatchFillWeight.toFixed(1)} g ({((totalBatchFillWeight) / 28.3495).toFixed(1)} oz)
                          </span>
                        </div>

                        {/* Breakdown line items */}
                        <div className="space-y-2 text-xs">
                          <div className="p-3 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700 flex items-center justify-between">
                            <span className="text-slate-600 dark:text-slate-300">Base Wax Needed:</span>
                            <span className="font-bold text-slate-900 dark:text-white">
                              {totalWaxGrams.toFixed(1)}g ({waxPerUnitGrams.toFixed(1)}g / unit)
                            </span>
                          </div>

                          <div className="p-3 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700 flex items-center justify-between">
                            <span className="text-slate-600 dark:text-slate-300">Fragrance Oil ({foPctSafe}%):</span>
                            <span className="font-bold text-amber-600 dark:text-amber-400">
                              {totalFragranceGrams.toFixed(1)}g ({fragrancePerUnitGrams.toFixed(1)}g / unit)
                            </span>
                          </div>

                          <div className="p-3 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700 flex items-center justify-between">
                            <span className="text-slate-600 dark:text-slate-300">Total Batch Cost:</span>
                            <span className="font-bold text-slate-900 dark:text-white">
                              {formatCurrency(totalBatchCost, preferredCurrency)}
                            </span>
                          </div>

                          <div className="p-3 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700 flex items-center justify-between">
                            <span className="text-slate-600 dark:text-slate-300">Unit COGS:</span>
                            <span className="font-bold text-slate-900 dark:text-white">
                              {formatCurrency(unitCOGS, preferredCurrency)} / unit
                            </span>
                          </div>

                          {/* Suggested Price */}
                          <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between text-emerald-950 dark:text-emerald-200 font-bold">
                            <span>Target Retail (65% margin):</span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-black">
                              {formatCurrency(suggestedRetail, preferredCurrency)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleSaveCandleRecipe}
                        className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-md shadow-amber-500/20 transition transform active:scale-95"
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>Save as New Formula</span>
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* 6. LASER CUT / CNC SHEET NESTING CALCULATOR */}
              {calcActiveTool === 'LASER_CUT' && (() => {
                const sheetW = Math.max(10, Number(laserSheetWidthMm) || 600);
                const sheetH = Math.max(10, Number(laserSheetHeightMm) || 400);
                const partW = Math.max(5, Number(laserPartWidthMm) || 80);
                const partH = Math.max(5, Number(laserPartHeightMm) || 50);
                const kerf = Math.max(0, Number(laserKerfSpacingMm) || 2);

                const cols = Math.max(1, Math.floor((sheetW + kerf) / (partW + kerf)));
                const rows = Math.max(1, Math.floor((sheetH + kerf) / (partH + kerf)));
                const totalPartsYield = cols * rows;

                const sheetAreaMm2 = sheetW * sheetH;
                const partsAreaMm2 = totalPartsYield * (partW * partH);
                const nestingUtilizationPct = Math.min(100, (partsAreaMm2 / sheetAreaMm2) * 100);

                const rawSheetCost = Math.max(0, Number(laserSheetCost) || 0);
                const materialCostPerPart = totalPartsYield > 0 ? rawSheetCost / totalPartsYield : 0;

                const cutMin = Math.max(0, Number(laserCutTimeMin) || 0);
                const machineHourRate = Math.max(0, Number(laserHourlyRate) || 0);
                const machineRunCost = (cutMin / 60) * machineHourRate;

                const powerKwh = ((Number(laserMachineWatts) || 450) / 1000) * (cutMin / 60);
                const electricityCost = powerKwh * (Number(laserKwhRate) || 0.65);

                const laserPartCOGS = materialCostPerPart + machineRunCost + electricityCost;
                const laserMargin = Math.min(95, Math.max(5, Number(laserMarginPct) || 60));
                const laserSuggestedRetail = laserPartCOGS / (1 - laserMargin / 100);
                const laserProfitPerPart = laserSuggestedRetail - laserPartCOGS;

                function handleSaveLaserRecipe() {
                  const prefill: any = {
                    title: `Laser Cut: Sheet Nesting (${totalPartsYield}x ${partW}x${partH}mm)`,
                    category: 'Laser Cutting',
                    instructions_md: `Laser / CNC Sheet Nesting & Machine Cost Sheet:\n- Raw Sheet: ${sheetW} x ${sheetH} mm (${formatCurrency(rawSheetCost, preferredCurrency)})\n- Part Dimensions: ${partW} x ${partH} mm (Kerf: ${kerf} mm)\n- Grid Yield: ${cols} cols x ${rows} rows = ${totalPartsYield} parts per sheet (${nestingUtilizationPct.toFixed(1)}% area efficiency)\n- Cut Duration: ${cutMin} minutes per sheet\n- Machine Overhead: ${formatCurrency(machineRunCost, preferredCurrency)} (${formatCurrency(machineHourRate, preferredCurrency)}/hr rate)\n- Electricity Consumed: ${powerKwh.toFixed(3)} kWh (${formatCurrency(electricityCost, preferredCurrency)})\n- Material Cost / Part: ${formatCurrency(materialCostPerPart, preferredCurrency)}\n- Base Unit COGS: ${formatCurrency(laserPartCOGS, preferredCurrency)}\n- Target Retail Price (${laserMargin}% margin): ${formatCurrency(laserSuggestedRetail, preferredCurrency)} (${formatCurrency(laserProfitPerPart, preferredCurrency)} net profit/part)`,
                  };
                  setEditingRecipe(prefill);
                  setRecipeModalOpen(true);
                }

                return (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-5">
                      <div className="flex items-center gap-2 font-bold text-sm text-slate-800 dark:text-slate-100 pb-3 border-b border-slate-100 dark:border-slate-800">
                        <Layers className="w-4 h-4 text-cyan-500" />
                        <span>Sheet &amp; Cutting Job Parameters</span>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                            Sheet Width (mm)
                          </label>
                          <input
                            type="number"
                            min="10"
                            value={laserSheetWidthMm}
                            onChange={(e) => setLaserSheetWidthMm(Math.max(10, parseInt(e.target.value) || 0))}
                            className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                            Sheet Height (mm)
                          </label>
                          <input
                            type="number"
                            min="10"
                            value={laserSheetHeightMm}
                            onChange={(e) => setLaserSheetHeightMm(Math.max(10, parseInt(e.target.value) || 0))}
                            className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                            Sheet Cost ({preferredCurrency})
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            value={laserSheetCost}
                            onChange={(e) => setLaserSheetCost(Math.max(0, parseFloat(e.target.value) || 0))}
                            className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                            Kerf / Spacing (mm)
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.1"
                            value={laserKerfSpacingMm}
                            onChange={(e) => setLaserKerfSpacingMm(Math.max(0, parseFloat(e.target.value) || 0))}
                            className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                            Part Width (mm)
                          </label>
                          <input
                            type="number"
                            min="5"
                            value={laserPartWidthMm}
                            onChange={(e) => setLaserPartWidthMm(Math.max(5, parseInt(e.target.value) || 0))}
                            className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                            Part Height (mm)
                          </label>
                          <input
                            type="number"
                            min="5"
                            value={laserPartHeightMm}
                            onChange={(e) => setLaserPartHeightMm(Math.max(5, parseInt(e.target.value) || 0))}
                            className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                            Cut Time (Minutes)
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={laserCutTimeMin}
                            onChange={(e) => setLaserCutTimeMin(Math.max(1, parseInt(e.target.value) || 0))}
                            className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                            Machine Rate ({preferredCurrency}/hr)
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={laserHourlyRate}
                            onChange={(e) => setLaserHourlyRate(Math.max(0, parseFloat(e.target.value) || 0))}
                            className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-5">
                      <div className="flex items-center gap-2 font-bold text-sm text-slate-800 dark:text-slate-100 pb-3 border-b border-slate-100 dark:border-slate-800">
                        <Sparkles className="w-4 h-4 text-cyan-500" />
                        <span>Nesting Yield &amp; Unit Economics</span>
                      </div>

                      <div className="p-4 rounded-2xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800 space-y-1">
                        <span className="text-[10px] uppercase font-bold text-cyan-600 dark:text-cyan-400">
                          Parts Yield per Sheet
                        </span>
                        <div className="text-2xl font-black text-cyan-950 dark:text-cyan-100">
                          {totalPartsYield} parts ({cols} &times; {rows})
                        </div>
                        <span className="text-[11px] text-cyan-700 dark:text-cyan-300 font-semibold block">
                          {nestingUtilizationPct.toFixed(1)}% sheet area efficiency
                        </span>
                      </div>

                      <div className="space-y-2 text-xs">
                        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700 flex items-center justify-between">
                          <span className="text-slate-600 dark:text-slate-300">Raw Material / Part:</span>
                          <span className="font-bold text-slate-900 dark:text-white">
                            {formatCurrency(materialCostPerPart, preferredCurrency)}
                          </span>
                        </div>
                        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700 flex items-center justify-between">
                          <span className="text-slate-600 dark:text-slate-300">Machine Run Overhead:</span>
                          <span className="font-bold text-slate-900 dark:text-white">
                            {formatCurrency(machineRunCost, preferredCurrency)}
                          </span>
                        </div>
                        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700 flex items-center justify-between">
                          <span className="text-slate-600 dark:text-slate-300">Unit COGS:</span>
                          <span className="font-bold text-slate-900 dark:text-white">
                            {formatCurrency(laserPartCOGS, preferredCurrency)} / unit
                          </span>
                        </div>
                        <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between text-emerald-950 dark:text-emerald-200 font-bold">
                          <span>Target Retail ({laserMargin}%):</span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-black">
                            {formatCurrency(laserSuggestedRetail, preferredCurrency)}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleSaveLaserRecipe}
                        className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-md shadow-cyan-500/20 transition transform active:scale-95"
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>Save as New Formula</span>
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* 7. ELECTRONICS: LED RESISTOR & BATTERY RUNTIME ESTIMATOR */}
              {calcActiveTool === 'ELECTRONICS' && (() => {
                // Mode A: LED Calculations
                const totalLedVf = elecLedCount * elecLedVf;
                const vDrop = elecSupplyV - totalLedVf;
                const isVoltError = vDrop <= 0;
                const currentAmps = elecLedCurrentMa / 1000;
                const exactOhms = isVoltError ? 0 : vDrop / currentAmps;
                const resistorBands = calculateResistorBands(exactOhms);
                const powerWatts = isVoltError ? 0 : vDrop * currentAmps;
                const recommendedWatt = recommendWattage(powerWatts);

                // Mode B: Battery Calculations
                const batteryWh = (elecBatteryMah * elecBatteryV) / 1000;
                const effFactor = elecEfficiencyPct / 100;
                const usableMah = elecBatteryMah * effFactor;
                const runtimeHours = elecLoadCurrentMa > 0 ? usableMah / elecLoadCurrentMa : 0;
                const hoursPart = Math.floor(runtimeHours);
                const minutesPart = Math.round((runtimeHours - hoursPart) * 60);

                function handleSaveElectronicsRecipe() {
                  let title = '';
                  let md = '';
                  if (elecMode === 'LED') {
                    title = `LED Circuit: ${elecSupplyV}V -> ${elecLedCount}x LED (${resistorBands.label}, ${recommendedWatt})`;
                    md = `### LED Series Resistor Blueprint\n- **Supply Voltage**: ${elecSupplyV}V\n- **LED Forward Voltage**: ${elecLedVf}V (${elecLedCount} in series = ${totalLedVf.toFixed(1)}V)\n- **Forward Current**: ${elecLedCurrentMa} mA\n- **Voltage Drop over Resistor**: ${vDrop.toFixed(2)}V\n- **Exact Resistance**: ${exactOhms.toFixed(1)} Ω\n- **Nearest Standard E12 Resistor**: **${resistorBands.label}**\n- **Color Bands**: Band 1 (${resistorBands.digit1}), Band 2 (${resistorBands.digit2}), Multiplier (10^${resistorBands.multiplierPow}), 5% Gold\n- **Power Dissipation**: ${powerWatts.toFixed(3)} W\n- **Recommended Rating**: ${recommendedWatt}`;
                  } else {
                    title = `Battery Pack: ${elecBatteryMah}mAh @ ${elecBatteryV}V (${hoursPart}h ${minutesPart}m Runtime)`;
                    md = `### Battery Runtime Blueprint\n- **Battery Capacity**: ${elecBatteryMah} mAh (${batteryWh.toFixed(1)} Wh)\n- **Nominal Voltage**: ${elecBatteryV} V\n- **Continuous Load**: ${elecLoadCurrentMa} mA\n- **Converter Efficiency**: ${elecEfficiencyPct}%\n- **Estimated Runtime**: **${hoursPart}h ${minutesPart}m** (${runtimeHours.toFixed(2)} hours)`;
                  }

                  const prefill: any = {
                    id: '',
                    user_id: userId,
                    title,
                    category: 'Electronics',
                    instructions_md: md,
                    rating: 5,
                    output_yield_qty: 1,
                    packaging_overhead: 0,
                    target_retail_price: 0,
                  };
                  setEditingRecipe(prefill);
                  setRecipeModalOpen(true);
                }

                return (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Controls Column */}
                    <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-2">
                          <Cpu className="w-5 h-5 text-indigo-500" />
                          <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                            Hardware &amp; Circuit Parameters
                          </h3>
                        </div>
                        {/* Mode Selector */}
                        <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold">
                          <button
                            type="button"
                            onClick={() => setElecMode('LED')}
                            className={cn(
                              'px-3 py-1.5 rounded-lg transition',
                              elecMode === 'LED'
                                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                            )}
                          >
                            LED Resistor
                          </button>
                          <button
                            type="button"
                            onClick={() => setElecMode('BATTERY')}
                            className={cn(
                              'px-3 py-1.5 rounded-lg transition',
                              elecMode === 'BATTERY'
                                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                            )}
                          >
                            Battery Runtime
                          </button>
                        </div>
                      </div>

                      {elecMode === 'LED' ? (
                        /* Mode A: LED Resistor Inputs */
                        <div className="space-y-4">
                          {/* Supply Voltage */}
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                Supply Voltage (Vs)
                              </label>
                              <div className="flex items-center gap-1">
                                {[3.3, 5.0, 9.0, 12.0, 24.0].map((v) => (
                                  <button
                                    key={v}
                                    type="button"
                                    onClick={() => setElecSupplyV(v)}
                                    className={cn(
                                      'px-2 py-0.5 rounded text-[11px] font-bold transition',
                                      elecSupplyV === v
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                                    )}
                                  >
                                    {v}V
                                  </button>
                                ))}
                              </div>
                            </div>
                            <input
                              type="number"
                              step="0.1"
                              min="1"
                              value={elecSupplyV}
                              onChange={(e) => setElecSupplyV(parseFloat(e.target.value) || 0)}
                              className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white"
                            />
                          </div>

                          {/* LED Color & Vf */}
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                LED Color Presets (Forward Voltage Vf)
                              </label>
                              <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                                {elecLedVf}V
                              </span>
                            </div>
                            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                              {[
                                { name: 'Red', vf: 2.0, color: '#ef4444' },
                                { name: 'Green', vf: 2.2, color: '#22c55e' },
                                { name: 'Blue', vf: 3.2, color: '#3b82f6' },
                                { name: 'White', vf: 3.2, color: '#94a3b8' },
                                { name: 'Amber', vf: 2.1, color: '#f59e0b' },
                                { name: 'UV', vf: 3.4, color: '#a855f7' },
                              ].map((c) => (
                                <button
                                  key={c.name}
                                  type="button"
                                  onClick={() => setElecLedVf(c.vf)}
                                  className={cn(
                                    'py-1.5 px-2 rounded-xl text-xs font-bold transition border text-center',
                                    elecLedVf === c.vf
                                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                                      : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                                  )}
                                >
                                  <span
                                    className="inline-block w-2 h-2 rounded-full mr-1"
                                    style={{ backgroundColor: c.color }}
                                  />
                                  <span>{c.name}</span>
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Forward Current (mA) & Series Count */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <div className="flex items-center justify-between mb-1.5">
                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                  Current (If)
                                </label>
                                <div className="flex items-center gap-1">
                                  {[10, 20, 30].map((ma) => (
                                    <button
                                      key={ma}
                                      type="button"
                                      onClick={() => setElecLedCurrentMa(ma)}
                                      className={cn(
                                        'px-1.5 py-0.5 rounded text-[10px] font-bold transition',
                                        elecLedCurrentMa === ma
                                          ? 'bg-indigo-600 text-white'
                                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                                      )}
                                    >
                                      {ma}mA
                                    </button>
                                  ))}
                                </div>
                              </div>
                              <input
                                type="number"
                                step="1"
                                min="1"
                                max="1000"
                                value={elecLedCurrentMa}
                                onChange={(e) => setElecLedCurrentMa(Math.max(1, parseInt(e.target.value) || 20))}
                                className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                                LEDs in Series (N)
                              </label>
                              <div className="flex items-center gap-2">
                                {[1, 2, 3, 4].map((n) => (
                                  <button
                                    key={n}
                                    type="button"
                                    onClick={() => setElecLedCount(n)}
                                    className={cn(
                                      'flex-1 py-2 rounded-xl text-xs font-bold transition',
                                      elecLedCount === n
                                        ? 'bg-indigo-600 text-white shadow-sm'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                                    )}
                                  >
                                    {n}x
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* Mode B: Battery Runtime Inputs */
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <div className="flex items-center justify-between mb-1.5">
                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                  Battery Capacity (mAh)
                                </label>
                                <span className="text-[11px] text-slate-400">
                                  {batteryWh.toFixed(1)} Wh
                                </span>
                              </div>
                              <input
                                type="number"
                                min="10"
                                value={elecBatteryMah}
                                onChange={(e) => setElecBatteryMah(Math.max(10, parseInt(e.target.value) || 0))}
                                className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white"
                              />
                              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                                {[
                                  { label: '9V (500)', mah: 500 },
                                  { label: 'AA (2000)', mah: 2000 },
                                  { label: '18650 (2500)', mah: 2500 },
                                  { label: 'Powerbank (10k)', mah: 10000 },
                                ].map((p) => (
                                  <button
                                    key={p.label}
                                    type="button"
                                    onClick={() => setElecBatteryMah(p.mah)}
                                    className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                                  >
                                    {p.label}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                                Battery Voltage (V)
                              </label>
                              <input
                                type="number"
                                step="0.1"
                                min="0.5"
                                value={elecBatteryV}
                                onChange={(e) => setElecBatteryV(Math.max(0.5, parseFloat(e.target.value) || 0))}
                                className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white"
                              />
                              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                                {[1.2, 3.7, 5.0, 9.0, 12.0].map((v) => (
                                  <button
                                    key={v}
                                    type="button"
                                    onClick={() => setElecBatteryV(v)}
                                    className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                                  >
                                    {v}V
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                                Continuous Load Current (mA)
                              </label>
                              <input
                                type="number"
                                min="1"
                                value={elecLoadCurrentMa}
                                onChange={(e) => setElecLoadCurrentMa(Math.max(1, parseInt(e.target.value) || 0))}
                                className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                                Discharge / Converter Eff. (%)
                              </label>
                              <input
                                type="number"
                                min="10"
                                max="100"
                                value={elecEfficiencyPct}
                                onChange={(e) => setElecEfficiencyPct(Math.max(10, Math.min(100, parseInt(e.target.value) || 85)))}
                                className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Results & Color Bands Column */}
                    <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between space-y-5">
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 font-bold text-sm text-slate-800 dark:text-slate-100 pb-3 border-b border-slate-100 dark:border-slate-800">
                          <Zap className="w-4 h-4 text-amber-500" />
                          <span>{elecMode === 'LED' ? 'Calculated Resistor & 4-Band Code' : 'Estimated Runtime & Capacity'}</span>
                        </div>

                        {elecMode === 'LED' ? (
                          isVoltError ? (
                            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-600 dark:text-rose-300 font-semibold space-y-1">
                              <p className="font-bold">⚠️ Supply Voltage Too Low</p>
                              <p>
                                Supply voltage ({elecSupplyV}V) must be greater than total LED forward voltage ({totalLedVf.toFixed(1)}V).
                              </p>
                            </div>
                          ) : (
                            <>
                              {/* Hero Resistor Result */}
                              <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 space-y-1">
                                <span className="text-[10px] uppercase font-bold text-indigo-600 dark:text-indigo-400">
                                  Standard E12 Resistor
                                </span>
                                <div className="text-3xl font-black text-indigo-950 dark:text-indigo-100">
                                  {resistorBands.label}
                                </div>
                                <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                                  Exact computed: <b>{exactOhms.toFixed(1)} Ω</b> (Drop: {vDrop.toFixed(2)}V)
                                </span>
                              </div>

                              {/* Interactive 4-Band Resistor Graphic */}
                              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                                  4-Band Color Code Graphic (5% Tol)
                                </span>

                                {/* Axial Resistor SVG */}
                                <div className="py-2 flex items-center justify-center">
                                  <svg viewBox="0 0 240 60" className="w-full max-w-[280px] h-14">
                                    {/* Lead wire left */}
                                    <line x1="10" y1="30" x2="50" y2="30" stroke="#94a3b8" strokeWidth="4" strokeLinecap="round" />
                                    {/* Lead wire right */}
                                    <line x1="190" y1="30" x2="230" y2="30" stroke="#94a3b8" strokeWidth="4" strokeLinecap="round" />
                                    {/* Resistor Body */}
                                    <rect x="50" y="14" width="140" height="32" rx="10" fill="#d4c5a9" stroke="#bfa980" strokeWidth="2" />
                                    {/* Band 1 */}
                                    <rect x="75" y="14" width="10" height="32" fill={resistorBands.color1} />
                                    {/* Band 2 */}
                                    <rect x="98" y="14" width="10" height="32" fill={resistorBands.color2} />
                                    {/* Band 3 (Multiplier) */}
                                    <rect x="121" y="14" width="10" height="32" fill={resistorBands.colorMult} />
                                    {/* Band 4 (Tolerance Gold) */}
                                    <rect x="155" y="14" width="8" height="32" fill={resistorBands.colorTol} />
                                  </svg>
                                </div>

                                {/* Band Legend */}
                                <div className="grid grid-cols-4 gap-1.5 text-center text-[10px] font-bold">
                                  <div className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                                    <span className="block text-slate-400">1st: {resistorBands.digit1}</span>
                                    <span className="inline-block w-3 h-3 rounded-full mt-1" style={{ backgroundColor: resistorBands.color1 }} />
                                  </div>
                                  <div className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                                    <span className="block text-slate-400">2nd: {resistorBands.digit2}</span>
                                    <span className="inline-block w-3 h-3 rounded-full mt-1" style={{ backgroundColor: resistorBands.color2 }} />
                                  </div>
                                  <div className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                                    <span className="block text-slate-400">x10^{resistorBands.multiplierPow}</span>
                                    <span className="inline-block w-3 h-3 rounded-full mt-1" style={{ backgroundColor: resistorBands.colorMult }} />
                                  </div>
                                  <div className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                                    <span className="block text-slate-400">±5%</span>
                                    <span className="inline-block w-3 h-3 rounded-full mt-1" style={{ backgroundColor: resistorBands.colorTol }} />
                                  </div>
                                </div>
                              </div>

                              {/* Power Dissipation & Recommended Wattage */}
                              <div className="space-y-2 text-xs">
                                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700 flex items-center justify-between">
                                  <span className="text-slate-600 dark:text-slate-300">Dissipated Power (P):</span>
                                  <span className="font-bold text-slate-900 dark:text-white">
                                    {powerWatts.toFixed(3)} W ({Math.round(powerWatts * 1000)} mW)
                                  </span>
                                </div>
                                <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between text-emerald-950 dark:text-emerald-200 font-bold">
                                  <span>Recommended Resistor:</span>
                                  <span className="text-emerald-600 dark:text-emerald-400 font-black">
                                    {recommendedWatt}
                                  </span>
                                </div>
                              </div>
                            </>
                          )
                        ) : (
                          /* Battery Mode Output */
                          <>
                            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-1">
                              <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400">
                                Estimated Battery Life
                              </span>
                              <div className="text-3xl font-black text-emerald-950 dark:text-emerald-100">
                                {hoursPart}h {minutesPart}m
                              </div>
                              <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-semibold block">
                                {runtimeHours.toFixed(2)} hours continuous operation
                              </span>
                            </div>

                            <div className="space-y-2 text-xs">
                              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700 flex items-center justify-between">
                                <span className="text-slate-600 dark:text-slate-300">Nominal Energy Capacity:</span>
                                <span className="font-bold text-slate-900 dark:text-white">
                                  {batteryWh.toFixed(2)} Watt-hours (Wh)
                                </span>
                              </div>
                              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700 flex items-center justify-between">
                                <span className="text-slate-600 dark:text-slate-300">Usable Capacity ({elecEfficiencyPct}%):</span>
                                <span className="font-bold text-slate-900 dark:text-white">
                                  {Math.round(usableMah)} mAh
                                </span>
                              </div>
                              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700 flex items-center justify-between">
                                <span className="text-slate-600 dark:text-slate-300">Current Draw:</span>
                                <span className="font-bold text-slate-900 dark:text-white">
                                  {elecLoadCurrentMa} mA
                                </span>
                              </div>
                            </div>
                          </>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={handleSaveElectronicsRecipe}
                        className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-500/20 transition transform active:scale-95"
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>Save as Blueprint / Formula</span>
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* 8. SILICONE MOLD BOX & POUR CALCULATOR */}
              {calcActiveTool === 'SILICONE' && (() => {
                // Box Volume (cm3 / ml)
                let boxVolCm3 = 0;
                if (siliconeBoxShape === 'RECTANGLE') {
                  boxVolCm3 = (siliconeBoxLengthMm * siliconeBoxWidthMm * siliconeBoxHeightMm) / 1000;
                } else {
                  const radiusCm = siliconeBoxDiameterMm / 20;
                  const heightCm = siliconeBoxHeightMm / 10;
                  boxVolCm3 = Math.PI * radiusCm * radiusCm * heightCm;
                }

                // Master Volume (cm3 / ml)
                let masterVolCm3 = 0;
                if (siliconeDisplacementMode === 'WEIGHT') {
                  masterVolCm3 = (Number(siliconeMasterWeightG) || 0) / (Number(siliconeMasterDensity) || 1.24);
                } else {
                  masterVolCm3 = Number(siliconeMasterVolumeCm3) || 0;
                }

                // Net Liquid Silicone Volume
                const netSiliconeVolCm3 = Math.max(0, boxVolCm3 - masterVolCm3);
                const marginMultiplier = 1 + (Number(siliconeMarginPct) || 10) / 100;
                const totalSiliconeVolWithMargin = netSiliconeVolCm3 * marginMultiplier;
                const totalSiliconeWeightG = totalSiliconeVolWithMargin * (Number(siliconeDensity) || 1.10);

                // Mix ratio breakdown
                let partAWeightG = 0;
                let partBWeightG = 0;
                if (siliconeRatio === '1:1') {
                  partAWeightG = totalSiliconeWeightG * 0.5;
                  partBWeightG = totalSiliconeWeightG * 0.5;
                } else {
                  partAWeightG = totalSiliconeWeightG * (10 / 11);
                  partBWeightG = totalSiliconeWeightG * (1 / 11);
                }

                const totalMoldCost = (totalSiliconeWeightG / 1000) * (Number(siliconeCostPerKg) || 85);

                const handleSaveSiliconeRecipe = () => {
                  const shapeText = siliconeBoxShape === 'RECTANGLE'
                    ? `${siliconeBoxLengthMm}x${siliconeBoxWidthMm}x${siliconeBoxHeightMm}mm Box`
                    : `Ø${siliconeBoxDiameterMm}x${siliconeBoxHeightMm}mm Cylinder`;
                  const title = `Silicone Mold: ${shapeText} (${Math.round(totalSiliconeWeightG)}g)`;
                  const md = `### Silicone Mold Box Specifications (${shapeText})\n\n` +
                    `- **Mold Box Volume:** ${boxVolCm3.toFixed(1)} cm³ (ml)\n` +
                    `- **Master Model Displacement:** ${masterVolCm3.toFixed(1)} cm³ (Displacement: ${siliconeDisplacementMode === 'WEIGHT' ? `${siliconeMasterWeightG}g @ ${siliconeMasterDensity}g/cm³` : `${siliconeMasterVolumeCm3}cm³`})\n` +
                    `- **Net Pour Volume (+${siliconeMarginPct}% margin):** ${totalSiliconeVolWithMargin.toFixed(1)} ml (${netSiliconeVolCm3.toFixed(1)} ml net cavity)\n` +
                    `- **Silicone Specific Gravity:** ${siliconeDensity} g/cm³\n\n` +
                    `### Batch Mix Ratio (${siliconeRatio} by Weight)\n` +
                    `- **Part A (Base):** ${partAWeightG.toFixed(1)} g\n` +
                    `- **Part B (Catalyst / Curative):** ${partBWeightG.toFixed(1)} g\n` +
                    `- **Total Silicone Weighed:** ${totalSiliconeWeightG.toFixed(1)} g\n` +
                    `- **Material Cost Estimate:** ${formatCurrency(totalMoldCost, preferredCurrency)}\n\n` +
                    `### Pour & Degassing Instructions\n` +
                    `1. Secure master model to box bottom with double-sided adhesive or hot glue.\n` +
                    `2. Spray mold release on model and box walls; let dry for 10 minutes.\n` +
                    `3. Mix Part A and Part B thoroughly for 3 minutes, scraping sides and bottom of container.\n` +
                    `4. Vacuum degas at 29 in-Hg until foam rises and collapses, then hold for 2 minutes.\n` +
                    `5. Pour in a single thin stream into the lowest corner of the mold box, allowing liquid silicone to rise around the master.\n` +
                    `6. Demold after full cure (typical 4-16 hours depending on platinum vs. tin catalyst).`;

                  const prefill: any = {
                    user_id: userId,
                    title,
                    category: 'Silicone & Molds',
                    instructions_md: md,
                    rating: 5,
                    output_yield_qty: 1,
                    packaging_overhead: 0,
                    target_retail_price: totalMoldCost * 2,
                  };
                  setEditingRecipe(prefill);
                  setRecipeModalOpen(true);
                };

                return (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Controls Column */}
                    <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-5">
                      <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800 font-bold text-sm text-slate-900 dark:text-white">
                        <Boxes className="w-5 h-5 text-indigo-500" />
                        <span>Mold Box Dimensions &amp; Master Displacement</span>
                      </div>

                      {/* Box Shape & Dimensions */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            Mold Box Geometry
                          </label>
                          <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold">
                            <button
                              type="button"
                              onClick={() => setSiliconeBoxShape('RECTANGLE')}
                              className={cn(
                                'px-3 py-1 rounded-lg transition',
                                siliconeBoxShape === 'RECTANGLE'
                                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                  : 'text-slate-500'
                              )}
                            >
                              Rectangular Box
                            </button>
                            <button
                              type="button"
                              onClick={() => setSiliconeBoxShape('CYLINDER')}
                              className={cn(
                                'px-3 py-1 rounded-lg transition',
                                siliconeBoxShape === 'CYLINDER'
                                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                  : 'text-slate-500'
                              )}
                            >
                              Cylindrical Cup
                            </button>
                          </div>
                        </div>

                        {siliconeBoxShape === 'RECTANGLE' ? (
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                Length (mm)
                              </label>
                              <input
                                type="number"
                                min="10"
                                value={siliconeBoxLengthMm}
                                onChange={(e) => setSiliconeBoxLengthMm(Math.max(1, parseFloat(e.target.value) || 0))}
                                className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                Width (mm)
                              </label>
                              <input
                                type="number"
                                min="10"
                                value={siliconeBoxWidthMm}
                                onChange={(e) => setSiliconeBoxWidthMm(Math.max(1, parseFloat(e.target.value) || 0))}
                                className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                Height (mm)
                              </label>
                              <input
                                type="number"
                                min="10"
                                value={siliconeBoxHeightMm}
                                onChange={(e) => setSiliconeBoxHeightMm(Math.max(1, parseFloat(e.target.value) || 0))}
                                className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white"
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                Diameter (mm)
                              </label>
                              <input
                                type="number"
                                min="10"
                                value={siliconeBoxDiameterMm}
                                onChange={(e) => setSiliconeBoxDiameterMm(Math.max(1, parseFloat(e.target.value) || 0))}
                                className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                Height (mm)
                              </label>
                              <input
                                type="number"
                                min="10"
                                value={siliconeBoxHeightMm}
                                onChange={(e) => setSiliconeBoxHeightMm(Math.max(1, parseFloat(e.target.value) || 0))}
                                className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white"
                              />
                            </div>
                          </div>
                        )}
                        <p className="text-[11px] text-slate-400">
                          Total Box Volume: <b>{boxVolCm3.toFixed(1)} cm³ (ml)</b>
                        </p>
                      </div>

                      {/* Master Model Displacement */}
                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            Master Model Displacement
                          </label>
                          <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold">
                            <button
                              type="button"
                              onClick={() => setSiliconeDisplacementMode('WEIGHT')}
                              className={cn(
                                'px-3 py-1 rounded-lg transition',
                                siliconeDisplacementMode === 'WEIGHT'
                                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                  : 'text-slate-500'
                              )}
                            >
                              By Weight &amp; Density
                            </button>
                            <button
                              type="button"
                              onClick={() => setSiliconeDisplacementMode('VOLUME')}
                              className={cn(
                                'px-3 py-1 rounded-lg transition',
                                siliconeDisplacementMode === 'VOLUME'
                                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                  : 'text-slate-500'
                              )}
                            >
                              Direct Volume (cm³)
                            </button>
                          </div>
                        </div>

                        {siliconeDisplacementMode === 'WEIGHT' ? (
                          <div className="space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                  Master Model Weight (grams)
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.1"
                                  value={siliconeMasterWeightG}
                                  onChange={(e) => setSiliconeMasterWeightG(Math.max(0, parseFloat(e.target.value) || 0))}
                                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                  Material Density: {siliconeMasterDensity} g/cm³
                                </label>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0.1"
                                  value={siliconeMasterDensity}
                                  onChange={(e) => setSiliconeMasterDensity(Math.max(0.1, parseFloat(e.target.value) || 1.24))}
                                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white"
                                />
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[10px] text-slate-400 font-bold uppercase mr-1">Presets:</span>
                              {[
                                { name: 'PLA (1.24)', d: 1.24 },
                                { name: 'Resin / ABS (1.12)', d: 1.12 },
                                { name: 'Clay (1.60)', d: 1.60 },
                                { name: 'Wood (0.75)', d: 0.75 },
                                { name: 'Metal (7.30)', d: 7.30 },
                              ].map((p) => (
                                <button
                                  key={p.name}
                                  type="button"
                                  onClick={() => setSiliconeMasterDensity(p.d)}
                                  className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                                >
                                  {p.name}
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                              Master Model Volume (cm³ / ml)
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="0.1"
                              value={siliconeMasterVolumeCm3}
                              onChange={(e) => setSiliconeMasterVolumeCm3(Math.max(0, parseFloat(e.target.value) || 0))}
                              className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white"
                            />
                          </div>
                        )}
                        <p className="text-[11px] text-slate-400">
                          Displaced Model Volume: <b>{masterVolCm3.toFixed(1)} cm³</b> | Net Mold Cavity: <b>{netSiliconeVolCm3.toFixed(1)} ml</b>
                        </p>
                      </div>

                      {/* Silicone Formulation & Parameters */}
                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                          Silicone Formulation &amp; Costing
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                              Mix Ratio (A:B)
                            </label>
                            <select
                              value={siliconeRatio}
                              onChange={(e) => setSiliconeRatio(e.target.value as any)}
                              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white"
                            >
                              <option value="1:1">1:1 (Platinum RTV)</option>
                              <option value="10:1">10:1 (Tin / Platinum)</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                              Specific Gravity
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min="0.8"
                              max="1.5"
                              value={siliconeDensity}
                              onChange={(e) => setSiliconeDensity(Math.max(0.8, parseFloat(e.target.value) || 1.10))}
                              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                              Pour Margin (%)
                            </label>
                            <input
                              type="number"
                              min="0"
                              max="30"
                              value={siliconeMarginPct}
                              onChange={(e) => setSiliconeMarginPct(Math.max(0, parseInt(e.target.value) || 10))}
                              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                              Cost / kg ({preferredCurrency})
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={siliconeCostPerKg}
                              onChange={(e) => setSiliconeCostPerKg(Math.max(0, parseFloat(e.target.value) || 0))}
                              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Results Column */}
                    <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between space-y-5">
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 font-bold text-sm text-slate-800 dark:text-slate-100 pb-3 border-b border-slate-100 dark:border-slate-800">
                          <Sparkles className="w-4 h-4 text-indigo-500" />
                          <span>Batch Pour Weights &amp; Mix Breakdown</span>
                        </div>

                        {/* Total Silicone Weight Card */}
                        <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 space-y-1">
                          <span className="text-[10px] uppercase font-bold text-indigo-600 dark:text-indigo-400">
                            Total Liquid Silicone Required (+{siliconeMarginPct}% cup buffer)
                          </span>
                          <div className="text-3xl font-black text-indigo-950 dark:text-indigo-100">
                            {totalSiliconeWeightG.toFixed(1)} g
                          </div>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                            Volume: <b>{totalSiliconeVolWithMargin.toFixed(1)} ml</b> ({netSiliconeVolCm3.toFixed(1)} ml net displacement)
                          </span>
                        </div>

                        {/* Part A & Part B Breakdown Cards */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700 space-y-1">
                            <span className="text-[10px] uppercase font-bold text-slate-500">
                              Part A (Base {siliconeRatio === '1:1' ? '50%' : '90.9%'})
                            </span>
                            <div className="text-xl font-bold text-slate-900 dark:text-white">
                              {partAWeightG.toFixed(1)} g
                            </div>
                          </div>
                          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700 space-y-1">
                            <span className="text-[10px] uppercase font-bold text-slate-500">
                              Part B (Catalyst {siliconeRatio === '1:1' ? '50%' : '9.1%'})
                            </span>
                            <div className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
                              {partBWeightG.toFixed(1)} g
                            </div>
                          </div>
                        </div>

                        {/* Mold Economics & Cost */}
                        <div className="space-y-2 text-xs">
                          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700 flex items-center justify-between">
                            <span className="text-slate-600 dark:text-slate-300">Estimated Silicone Material Cost:</span>
                            <span className="font-bold text-slate-900 dark:text-white">
                              {formatCurrency(totalMoldCost, preferredCurrency)}
                            </span>
                          </div>
                          <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between text-emerald-950 dark:text-emerald-200 font-bold">
                            <span>Recommended Mold Asset Valuation (2x):</span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-black">
                              {formatCurrency(totalMoldCost * 2, preferredCurrency)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleSaveSiliconeRecipe}
                        className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-500/20 transition transform active:scale-95"
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>Save as Blueprint / Formula</span>
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* 9. WOODWORKING LINEAR & SHEET CUT-LIST KERF OPTIMIZER & BOARD-FOOT CALCULATOR */}
              {calcActiveTool === 'WOODWORKING' && (() => {
                const unitLabel = woodUnit === 'METRIC' ? 'mm' : 'in';
                const kerf = Math.max(0, Number(woodKerf) || 0);
                const stockLength = Math.max(1, Number(woodStockLength) || 1);
                const stockWidth = Math.max(0.1, Number(woodStockWidth) || 1);
                const stockThickness = Math.max(0.1, Number(woodStockThickness) || 1);
                const boardPrice = Math.max(0, Number(woodBoardPrice) || 0);

                // Board-Feet (BF) per board:
                let tIn = stockThickness;
                let wIn = stockWidth;
                let lIn = stockLength;
                if (woodUnit === 'METRIC') {
                  tIn = stockThickness / 25.4;
                  wIn = stockWidth / 25.4;
                  lIn = stockLength / 25.4;
                }
                const bfPerBoard = (tIn * wIn * lIn) / 144;

                // Expand cut pieces
                const expandedCuts: Array<{ id: string; label: string; length: number }> = [];
                let oversizedError = false;
                woodCutPieces.forEach((p) => {
                  const pLen = Math.max(0, Number(p.length) || 0);
                  const pQty = Math.max(1, Math.floor(Number(p.quantity) || 1));
                  if (pLen > stockLength) {
                    oversizedError = true;
                  }
                  for (let i = 0; i < pQty; i++) {
                    expandedCuts.push({
                      id: `${p.id}-${i}`,
                      label: p.label || 'Cut Piece',
                      length: pLen,
                    });
                  }
                });

                // First Fit Decreasing 1D Bin Packing
                const sortedCuts = [...expandedCuts].sort((a, b) => b.length - a.length);

                interface PackedBoard {
                  boardNumber: number;
                  cuts: Array<{ id: string; label: string; length: number }>;
                  usedLength: number;
                  kerfWaste: number;
                  scrapWaste: number;
                }

                const packedBoards: PackedBoard[] = [];

                sortedCuts.forEach((cut) => {
                  let placed = false;
                  for (let b of packedBoards) {
                    const needed = b.cuts.length === 0 ? cut.length : (cut.length + kerf);
                    const remaining = stockLength - (b.usedLength + b.kerfWaste);
                    if (needed <= remaining) {
                      b.cuts.push(cut);
                      b.usedLength += cut.length;
                      b.kerfWaste = (b.cuts.length - 1) * kerf;
                      b.scrapWaste = Math.max(0, stockLength - b.usedLength - b.kerfWaste);
                      placed = true;
                      break;
                    }
                  }

                  if (!placed) {
                    packedBoards.push({
                      boardNumber: packedBoards.length + 1,
                      cuts: [cut],
                      usedLength: cut.length,
                      kerfWaste: 0,
                      scrapWaste: Math.max(0, stockLength - cut.length),
                    });
                  }
                });

                const totalBoardsCount = Math.max(1, packedBoards.length);
                const totalBF = bfPerBoard * totalBoardsCount;
                const totalCost = totalBoardsCount * boardPrice;
                const totalPiecesCount = expandedCuts.length;
                const costPerPiece = totalPiecesCount > 0 ? (totalCost / totalPiecesCount) : 0;
                const totalCutLength = expandedCuts.reduce((s, c) => s + c.length, 0);
                const totalStockLength = totalBoardsCount * stockLength;
                const totalKerfWaste = packedBoards.reduce((s, b) => s + b.kerfWaste, 0);
                const totalScrapWaste = packedBoards.reduce((s, b) => s + b.scrapWaste, 0);
                const wastePct = totalStockLength > 0 ? Math.max(0, ((totalStockLength - totalCutLength) / totalStockLength) * 100) : 0;

                const handleSaveWoodworkingRecipe = async () => {
                  const title = `Woodworking Cut-List (${totalPiecesCount} pcs, ${totalBoardsCount} boards)`;
                  const category = 'Woodworking & Carpentry';
                  const instructions = `Woodworking Cut-List & Board-Foot Plan:\n- Stock Board: ${stockLength}${unitLabel} L x ${stockWidth}${unitLabel} W x ${stockThickness}${unitLabel} T (${totalBF.toFixed(2)} Total BF)\n- Blade Kerf Loss: ${kerf}${unitLabel}\n- Stock Boards Required: ${totalBoardsCount} boards (${formatCurrency(totalCost, preferredCurrency)})\n- Finished Cut Pieces: ${totalPiecesCount} pcs (${formatCurrency(costPerPiece, preferredCurrency)} / piece avg)\n- Material Waste: ${wastePct.toFixed(1)}% (${unitLabel === 'mm' ? `${(totalScrapWaste / 1000).toFixed(2)}m` : `${(totalScrapWaste / 12).toFixed(1)}ft`} scrap offcuts)\n\nCut List Breakdown:\n${woodCutPieces.map((p) => `- ${p.quantity}x ${p.label}: ${p.length}${unitLabel}`).join('\n')}\n\nBoard Cutting Map:\n${packedBoards.map((b) => `Board #${b.boardNumber}: [${b.cuts.map((c: any) => `${c.label} (${c.length}${unitLabel})`).join(' + ')}] -> Scrap Remainder: ${b.scrapWaste.toFixed(1)}${unitLabel}`).join('\n')}`;

                  try {
                    const { data, error } = await supabase
                      .from('maker_recipes')
                      .insert({
                        user_id: userId,
                        title,
                        category,
                        instructions_md: instructions,
                      })
                      .select()
                      .single();
                    if (error) throw error;
                    if (data) {
                      setRecipes((prev) => [data, ...prev]);
                      sounds.playLevelUp();
                      triggerCelebrationConfetti();
                      showToast(`🌲 "${title}" saved to your workshop formulas!`);
                    }
                  } catch (err: any) {
                    alert(`Failed to save formula: ${err.message}`);
                  }
                };

                return (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* Left Column: Lumber & Cut-List Parameters */}
                    <div className="lg:col-span-7 space-y-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-bold text-base text-slate-900 dark:text-white">
                            Woodworking Linear &amp; Sheet Cut-List Optimizer
                          </h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            First-fit greedy kerf bin-packing, board-foot volume, and lumber cost estimator.
                          </p>
                        </div>

                        {/* Metric / Imperial Unit Toggle */}
                        <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold shrink-0">
                          <button
                            type="button"
                            onClick={() => handleToggleWoodUnit('METRIC')}
                            className={cn(
                              'px-2.5 py-1 rounded-lg transition',
                              woodUnit === 'METRIC'
                                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                            )}
                          >
                            Metric (mm)
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleWoodUnit('IMPERIAL')}
                            className={cn(
                              'px-2.5 py-1 rounded-lg transition',
                              woodUnit === 'IMPERIAL'
                                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                            )}
                          >
                            Imperial (in)
                          </button>
                        </div>
                      </div>

                      {/* Stock Lumber Board Dimensions */}
                      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-3">
                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                          Stock Lumber Board Specifications
                        </span>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                              Stock Length ({unitLabel})
                            </label>
                            <input
                              type="number"
                              min="1"
                              step="any"
                              value={woodStockLength}
                              onChange={(e) => setWoodStockLength(Math.max(1, parseFloat(e.target.value) || 1))}
                              className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-900 dark:text-white"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                              Width ({unitLabel})
                            </label>
                            <input
                              type="number"
                              min="0.1"
                              step="any"
                              value={woodStockWidth}
                              onChange={(e) => setWoodStockWidth(Math.max(0.1, parseFloat(e.target.value) || 1))}
                              className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-900 dark:text-white"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                              Thickness ({unitLabel})
                            </label>
                            <input
                              type="number"
                              min="0.1"
                              step="any"
                              value={woodStockThickness}
                              onChange={(e) => setWoodStockThickness(Math.max(0.1, parseFloat(e.target.value) || 1))}
                              className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-900 dark:text-white"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                              Saw Blade Kerf ({unitLabel})
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={woodKerf}
                              onChange={(e) => setWoodKerf(Math.max(0, parseFloat(e.target.value) || 0))}
                              className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-900 dark:text-white"
                            />
                          </div>
                        </div>

                        <div className="pt-2 flex items-center justify-between border-t border-slate-200/60 dark:border-slate-700/60 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="text-slate-500">Board Price:</span>
                            <div className="flex items-center gap-1">
                              <span className="text-slate-400 font-bold">$</span>
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={woodBoardPrice}
                                onChange={(e) => setWoodBoardPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                                className="w-20 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-900 dark:text-white"
                              />
                            </div>
                          </div>
                          <span className="text-[11px] text-slate-400">
                            Single Board: <b>{bfPerBoard.toFixed(2)} BF</b>
                          </span>
                        </div>
                      </div>

                      {/* Cut List Items Table */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                            Cut List Parts ({totalPiecesCount} pieces)
                          </span>
                          <button
                            type="button"
                            onClick={handleAddWoodCutPiece}
                            className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add Cut Piece</span>
                          </button>
                        </div>

                        {oversizedError && (
                          <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-400 text-xs flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 shrink-0" />
                            <span>Warning: One or more cut pieces exceed stock board length ({stockLength}{unitLabel})!</span>
                          </div>
                        )}

                        <div className="space-y-2">
                          {woodCutPieces.map((piece, idx) => (
                            <div
                              key={piece.id || idx}
                              className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-3 text-xs"
                            >
                              <div className="flex-1 min-w-0">
                                <input
                                  type="text"
                                  value={piece.label}
                                  onChange={(e) => handleUpdateWoodCutPiece(piece.id, 'label', e.target.value)}
                                  placeholder="Part label..."
                                  className="w-full px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold text-slate-900 dark:text-white outline-none"
                                />
                              </div>

                              <div className="flex items-center gap-1 shrink-0 w-28">
                                <input
                                  type="number"
                                  min="1"
                                  step="any"
                                  value={piece.length}
                                  onChange={(e) => handleUpdateWoodCutPiece(piece.id, 'length', Math.max(1, parseFloat(e.target.value) || 1))}
                                  className="w-full px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold text-slate-900 dark:text-white text-right outline-none"
                                />
                                <span className="text-[11px] text-slate-400 shrink-0">{unitLabel}</span>
                              </div>

                              <div className="flex items-center gap-1 shrink-0 w-20">
                                <span className="text-[11px] text-slate-400">x</span>
                                <input
                                  type="number"
                                  min="1"
                                  value={piece.quantity}
                                  onChange={(e) => handleUpdateWoodCutPiece(piece.id, 'quantity', Math.max(1, parseInt(e.target.value, 10) || 1))}
                                  className="w-full px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold text-slate-900 dark:text-white text-center outline-none"
                                />
                              </div>

                              {woodCutPieces.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveWoodCutPiece(piece.id)}
                                  className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition shrink-0"
                                  title="Remove cut piece"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Optimization Results & Visual Diagram */}
                    <div className="lg:col-span-5 space-y-4">
                      {/* Total Boards & Board-Foot Banner */}
                      <div className="p-5 rounded-3xl bg-gradient-to-br from-amber-50 to-orange-50/50 dark:from-amber-950/20 dark:to-orange-950/10 border border-amber-200/80 dark:border-amber-900/40 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                            Required Stock Boards
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400">
                            {packedBoards.length} {packedBoards.length === 1 ? 'Board' : 'Boards'}
                          </span>
                        </div>

                        <div className="text-3xl font-black text-amber-950 dark:text-amber-100">
                          {packedBoards.length} <span className="text-lg font-bold text-amber-700 dark:text-amber-300">Boards Needed</span>
                        </div>

                        <div className="pt-2 border-t border-amber-200/60 dark:border-amber-900/40 grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <span className="text-slate-500 block text-[10px] uppercase font-bold">Total Board-Feet</span>
                            <span className="font-bold text-slate-900 dark:text-white text-base">
                              {totalBF.toFixed(2)} BF
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[10px] uppercase font-bold">Estimated Lumber Cost</span>
                            <span className="font-bold text-slate-900 dark:text-white text-base">
                              {formatCurrency(totalCost, preferredCurrency)}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                          <div>
                            <span className="text-slate-500 block text-[10px] uppercase font-bold">Cost Per Finished Piece</span>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">
                              {formatCurrency(costPerPiece, preferredCurrency)} / pc
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[10px] uppercase font-bold">Waste &amp; Offcuts</span>
                            <span className={cn("font-bold", wastePct > 25 ? "text-amber-600" : "text-emerald-600")}>
                              {wastePct.toFixed(1)}% waste
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Visual Board Packing Map */}
                      <div className="p-4 rounded-3xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3">
                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                          Visual Cutting Diagram ({packedBoards.length} Boards)
                        </span>

                        <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                          {packedBoards.map((board) => (
                            <div key={board.boardNumber} className="space-y-1.5 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="font-bold text-slate-800 dark:text-slate-200">
                                  Board #{board.boardNumber}
                                </span>
                                <span className="text-slate-400">
                                  Rem: <b>{board.scrapWaste.toFixed(0)}{unitLabel}</b> ({((board.scrapWaste / stockLength) * 100).toFixed(0)}% scrap)
                                </span>
                              </div>

                              {/* Stacked Bar Visualizer */}
                              <div className="w-full h-6 rounded-lg bg-slate-200 dark:bg-slate-800 overflow-hidden flex items-stretch border border-slate-300 dark:border-slate-700">
                                {board.cuts.map((cut, cIdx) => {
                                  const widthPct = (cut.length / stockLength) * 100;
                                  const colors = [
                                    'bg-indigo-500 text-white',
                                    'bg-amber-500 text-white',
                                    'bg-blue-500 text-white',
                                    'bg-emerald-500 text-white',
                                    'bg-purple-500 text-white',
                                  ];
                                  const colorClass = colors[cIdx % colors.length];

                                  return (
                                    <div
                                      key={cIdx}
                                      style={{ width: `${widthPct}%` }}
                                      className={cn(
                                        'h-full flex items-center justify-center text-[9px] font-bold px-1 truncate border-r border-slate-900/20',
                                        colorClass
                                      )}
                                      title={`${cut.label}: ${cut.length}${unitLabel}`}
                                    >
                                      {cut.length}{unitLabel}
                                    </div>
                                  );
                                })}

                                {board.scrapWaste > 0 && (
                                  <div
                                    style={{ width: `${(board.scrapWaste / stockLength) * 100}%` }}
                                    className="h-full bg-slate-300/60 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center text-[8px] font-bold italic"
                                    title={`Scrap Offcut: ${board.scrapWaste.toFixed(0)}${unitLabel}`}
                                  >
                                    Scrap
                                  </div>
                                )}
                              </div>

                              <div className="text-[10px] text-slate-500 truncate">
                                Cuts: {board.cuts.map((c) => `${c.label} (${c.length}${unitLabel})`).join(' + ')}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Save Blueprint Action */}
                      <button
                        type="button"
                        onClick={handleSaveWoodworkingRecipe}
                        className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-500/20 transition transform active:scale-95"
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>Save as Blueprint / Formula</span>
                      </button>
                    </div>
                  </div>
                );
              })()}
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
                                <>
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

                                  {item.maintenance_interval_days && item.maintenance_interval_days > 0 ? (() => {
                                    const lastTime = item.last_maintained_at
                                      ? new Date(item.last_maintained_at).getTime()
                                      : new Date(item.created_at || Date.now()).getTime();
                                    const nextDueDate = lastTime + item.maintenance_interval_days * 86400000;
                                    const isOverdue = Date.now() > nextDueDate;
                                    const daysRemaining = Math.round((nextDueDate - Date.now()) / 86400000);

                                    return (
                                      <span
                                        className={cn(
                                          'text-[10px] font-extrabold px-2 py-0.5 rounded-full border',
                                          isOverdue
                                            ? 'bg-rose-50 text-rose-600 border-rose-300 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800 animate-pulse'
                                            : 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800'
                                        )}
                                        title={
                                          isOverdue
                                            ? `Maintenance is overdue by ${Math.abs(daysRemaining)} days!`
                                            : `Maintenance due in ${daysRemaining} days (Every ${item.maintenance_interval_days}d)`
                                        }
                                      >
                                        {isOverdue ? '⚠️ Maint. Overdue' : `Due in ${daysRemaining}d`}
                                      </span>
                                    );
                                  })() : null}
                                </>
                              )}
                            </div>

                            <div className="flex items-center gap-1">
                              {item.item_type === 'EQUIPMENT' && (
                                <button
                                  type="button"
                                  onClick={() => setEquipmentLogItem(item)}
                                  className="p-1.5 rounded-xl text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition"
                                  title="Equipment Maintenance & Calibration Logbook"
                                >
                                  <Wrench className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => openItemHistory(item)}
                                className="p-1.5 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                                title="Stock Movement Ledger & Audit History"
                              >
                                <History className="w-3.5 h-3.5" />
                              </button>
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

                          <div className="flex gap-3 items-start mt-1">
                            {item.image_url ? (
                              <img
                                src={item.image_url}
                                alt={item.name}
                                className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover shrink-0 border border-slate-200 dark:border-slate-800"
                              />
                            ) : item.item_type === 'FINISHED_GOOD' ? (
                              <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                                <Sparkles className="w-6 h-6" />
                              </div>
                            ) : null}

                            <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-base text-slate-900 dark:text-white truncate">
                                {item.name}
                              </h3>

                              {item.description && (
                                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
                                  {item.description}
                                </p>
                              )}

                              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-2">
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

                            <div className="flex items-center gap-1.5">
                              {/* Amazon Affiliate Quick Search */}
                              <a
                                href={`https://www.amazon.com/s?k=${encodeURIComponent(item.search_keyword || item.name)}&tag=pixelcraft05a-20`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2.5 py-2 rounded-2xl bg-amber-500/15 text-amber-700 dark:text-amber-300 text-xs font-bold border border-amber-300 dark:border-amber-700/60 hover:bg-amber-500/25 transition shadow-sm"
                                title="Search & Restock on Amazon"
                              >
                                <span>Amazon</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>

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
          defaultCurrency={preferredCurrency}
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
          onItemCreated={(newGood) => setItems((prev) => [newGood, ...prev])}
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

              {/* Output Finished Goods to Produce */}
              {runningRecipe.output_item_id && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/40 rounded-2xl space-y-1.5">
                  <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider block">
                    Finished Goods to be Produced:
                  </span>
                  <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-white">
                    <span className="truncate mr-2">
                      🎁 {items.find((i) => i.id === runningRecipe.output_item_id)?.name || 'Finished Creation'}
                    </span>
                    <span className="text-emerald-600 dark:text-emerald-400 shrink-0">
                      +{(Number(runningRecipe.output_yield_qty) || 1) * batchMultiplier} {items.find((i) => i.id === runningRecipe.output_item_id)?.unit || 'units'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-amber-800 dark:text-amber-300">
                    <span>Reward: <b>+15 XP Production Practice</b></span>
                    <span>Auto-calculates unit COGS</span>
                  </div>
                </div>
              )}

              {/* Batch Outcome Rating */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Outcome Quality Rating (Optional)
                </label>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setBatchRating(star === batchRating ? null : star)}
                      className="p-1 hover:scale-110 transition text-amber-400"
                    >
                      <Star
                        className={cn(
                          'w-5 h-5',
                          batchRating && star <= batchRating ? 'fill-current' : 'text-slate-300 dark:text-slate-600'
                        )}
                      />
                    </button>
                  ))}
                  <span className="text-[11px] text-slate-400 ml-2">
                    {batchRating ? `${batchRating} Stars` : 'Unrated'}
                  </span>
                </div>
              </div>

              {/* Batch Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Batch Notes &amp; Observations
                </label>
                <textarea
                  value={batchNotes}
                  onChange={(e) => setBatchNotes(e.target.value)}
                  placeholder="e.g. Ambient temp 23°C, cured in pressure pot at 45 psi, zero bubbles..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 outline-none resize-none focus:ring-2 focus:ring-emerald-500"
                />
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
          defaultCurrency={preferredCurrency}
          onImported={(newItems) => {
            setItems((prev) => [...newItems, ...prev]);
            setBulkModalOpen(false);
            showToast(`Imported ${newItems.length} items to workshop inventory!`);
          }}
        />
      )}

      {/* ================= MODAL: PRINT QR BIN LABELS ================= */}
      {printLabelsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 lg:p-7 max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 no-print">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Print Workshop Bin Labels</span>
                    <span className="text-xs font-mono uppercase bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">
                      Physical QR Tags
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    High-contrast printable bin cards with SKU barcodes, minimum thresholds, and storage locations.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPrintLabelsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scope Filter Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 py-3 border-b border-slate-100 dark:border-slate-800 no-print">
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-slate-400 font-bold uppercase tracking-wider text-[11px] mr-1">
                  Scope:
                </span>
                {(
                  [
                    { id: 'FILTERED', label: `Current Filtered (${displayedItems.length})` },
                    { id: 'LOW_STOCK', label: `Low Stock Only (${lowStockItems.length})` },
                    { id: 'ALL', label: `All Workshop Items (${items.length})` },
                  ] as const
                ).map((scope) => (
                  <button
                    key={scope.id}
                    type="button"
                    onClick={() => setPrintLabelsFilter(scope.id)}
                    className={cn(
                      'px-3 py-1.5 rounded-xl font-bold transition text-xs',
                      printLabelsFilter === scope.id
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    )}
                  >
                    {scope.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition active:scale-95"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Labels Now</span>
                </button>
              </div>
            </div>

            {/* Printable Preview Area */}
            <div className="flex-1 overflow-y-auto py-4">
              <div id="workbench-printable-area" className="space-y-4">
                <div className="hidden print:block pb-3 border-b-2 border-black mb-4">
                  <h1 className="text-xl font-black uppercase tracking-tight text-black">
                    WORKBENCH — WORKSHOP INVENTORY BIN LABELS
                  </h1>
                  <p className="text-xs text-gray-700">
                    Generated on {new Date().toLocaleDateString()} | Total Labels: {
                      (printLabelsFilter === 'LOW_STOCK' ? lowStockItems : printLabelsFilter === 'ALL' ? items : displayedItems).length
                    }
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 print:grid-cols-3 print:gap-2">
                  {(printLabelsFilter === 'LOW_STOCK'
                    ? lowStockItems
                    : printLabelsFilter === 'ALL'
                    ? items
                    : displayedItems
                  ).map((item) => {
                    const sku = `SKU-${item.id.slice(0, 8).toUpperCase()}`;
                    return (
                      <div
                        key={item.id}
                        className="bg-white border-2 border-slate-900 dark:border-slate-600 p-3.5 rounded-2xl print:rounded-none flex flex-col justify-between gap-2.5 text-black shadow-sm print:shadow-none break-inside-avoid"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <span className="text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-300">
                              {item.item_type}
                            </span>
                            <h4 className="font-black text-sm text-slate-900 truncate mt-1">
                              {item.name}
                            </h4>
                            <p className="text-[11px] text-slate-600 font-medium">
                              Bin / Loc: <strong className="text-black">{item.sku_or_location || 'General Storage'}</strong>
                            </p>
                          </div>
                          <WorkshopQrGlyph value={sku} />
                        </div>

                        <div className="pt-2 border-t border-slate-200 flex items-end justify-between gap-2">
                          <div>
                            <div className="text-[10px] text-slate-600">
                              Stock: <b className="text-slate-900">{item.quantity} {item.unit}</b>
                            </div>
                            <div className="text-[9px] text-slate-500">
                              Reorder at: &le; {item.low_stock_threshold || 1} {item.unit}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs font-black text-slate-900">
                              {formatCurrency(item.unit_price, item.currency)}
                            </div>
                            <span className="text-[8px] font-mono text-slate-500 uppercase">
                              {sku}
                            </span>
                          </div>
                        </div>

                        <WorkshopBarcode text={sku} />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2 no-print">
              <button
                type="button"
                onClick={() => setPrintLabelsModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition active:scale-95"
              >
                <Printer className="w-4 h-4" />
                <span>Print Labels</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: PRINT RECIPE BATCH SHEET ================= */}
      {printBatchRecipe && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 lg:p-8 max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 no-print">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Recipe Batch Sheet</span>
                    <span className="text-xs font-mono uppercase bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full">
                      Print View
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Batch production traveler with ingredient check-off and quality sign-off lines.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPrintBatchRecipe(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Printable Area */}
            <div className="flex-1 overflow-y-auto py-4">
              <div id="workbench-printable-area" className="bg-white text-black p-6 border-2 border-black rounded-xl print:border-none print:p-0 space-y-6">
                {/* Header banner */}
                <div className="border-b-2 border-black pb-4 flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-widest font-black text-gray-600">
                      WORKBENCH BATCH PRODUCTION SHEET
                    </span>
                    <h2 className="text-2xl font-black text-black tracking-tight mt-0.5">
                      {printBatchRecipe.title}
                    </h2>
                    <span className="inline-block mt-1 text-xs font-bold uppercase tracking-wider px-2 py-0.5 bg-gray-100 border border-black">
                      Category: {printBatchRecipe.category}
                    </span>
                  </div>
                  <div className="text-right text-xs space-y-1">
                    <div>
                      Batch ID: <strong className="font-mono">BATCH-{printBatchRecipe.id.slice(0, 8).toUpperCase()}</strong>
                    </div>
                    <div>Date: <strong>{new Date().toLocaleDateString()}</strong></div>
                    <div>Target Yield: <strong>{printBatchRecipe.output_yield_qty || 1} units</strong></div>
                  </div>
                </div>

                {/* Operator info row */}
                <div className="grid grid-cols-2 gap-4 text-xs border border-gray-300 p-3">
                  <div>Operator / Compounder: ____________________________________</div>
                  <div>Station / Bench: ____________________________________</div>
                </div>

                {/* Ingredients checklist */}
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider mb-2">
                    1. Formulation Ingredients Checklist
                  </h4>
                  <table className="w-full text-xs border-collapse border border-black">
                    <thead>
                      <tr className="bg-gray-100 border-b border-black text-left">
                        <th className="p-2 border-r border-black">Material / Raw Good</th>
                        <th className="p-2 border-r border-black w-28">Target Qty</th>
                        <th className="p-2 border-r border-black w-28">Actual Weighed</th>
                        <th className="p-2 border-r border-black w-28">Lot #</th>
                        <th className="p-2 w-16 text-center">Verified</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(printBatchRecipe.ingredients || []).map((ri, idx) => {
                        const item = items.find((i) => i.id === ri.inventory_item_id) || ri.inventory_item;
                        return (
                          <tr key={ri.id || idx} className="border-b border-gray-300">
                            <td className="p-2 font-bold border-r border-black">
                              {item?.name || 'Raw Ingredient'}
                            </td>
                            <td className="p-2 border-r border-black">
                              {ri.quantity_required} {item?.unit || 'units'}
                            </td>
                            <td className="p-2 border-r border-black font-mono">
                              [ ________ ]
                            </td>
                            <td className="p-2 border-r border-black font-mono">
                              [ ________ ]
                            </td>
                            <td className="p-2 text-center font-mono">
                              [ &nbsp; ]
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Instructions */}
                {printBatchRecipe.instructions_md && (
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider mb-1.5">
                      2. Compounding &amp; Processing Procedure
                    </h4>
                    <div className="p-3 bg-gray-50 border border-gray-300 text-xs whitespace-pre-wrap leading-relaxed font-mono">
                      {printBatchRecipe.instructions_md}
                    </div>
                  </div>
                )}

                {/* Quality Assurance & Release Sign-Off */}
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider mb-2">
                    3. Quality Inspection &amp; Batch Release Sign-Off
                  </h4>
                  <div className="border border-black p-3 space-y-3 text-xs">
                    <div className="grid grid-cols-3 gap-3">
                      <div>Visual Color/Clarity: [ ] Pass [ ] Fail</div>
                      <div>Viscosity/Density: [ ] Pass [ ] Fail</div>
                      <div>Actual Final Yield: ____________ units</div>
                    </div>
                    <div className="pt-3 border-t border-gray-300 grid grid-cols-2 gap-4">
                      <div>
                        Operator Signature: ___________________________ Date: _________
                      </div>
                      <div>
                        QA Supervisor Sign-Off: _______________________ Date: _________
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2 no-print">
              <button
                type="button"
                onClick={() => setPrintBatchRecipe(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-500/20 transition active:scale-95"
              >
                <Printer className="w-4 h-4" />
                <span>Print Batch Sheet</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: UNIVERSAL CSV IMPORTER ================= */}
      {csvImportModalOpen && (
        <CsvImportModal
          isOpen={csvImportModalOpen}
          onClose={() => setCsvImportModalOpen(false)}
          userId={userId}
          folders={folders}
          defaultCurrency={preferredCurrency}
          onImported={(newItems) => {
            setItems((prev) => [...newItems, ...prev]);
            setCsvImportModalOpen(false);
            sounds.playTaskComplete();
            triggerCelebrationConfetti();
            showToast(`Successfully imported ${newItems.length} items from CSV!`);
          }}
        />
      )}

      {/* ================= MODAL: EQUIPMENT MAINTENANCE & CALIBRATION LOGBOOK ================= */}
      {equipmentLogItem && (
        <EquipmentLogModal
          isOpen={Boolean(equipmentLogItem)}
          onClose={() => setEquipmentLogItem(null)}
          item={equipmentLogItem}
          userId={userId}
          defaultCurrency={preferredCurrency}
          onMaintenanceLogged={(updatedItem) => {
            setItems((prev) =>
              prev.map((i) => (i.id === updatedItem.id ? { ...i, ...updatedItem } : i))
            );
            setEquipmentLogItem(null);
            sounds.playLevelUp();
            triggerCelebrationConfetti();
            showToast(`Logged maintenance for "${updatedItem.name}"! (+10 XP)`);
          }}
        />
      )}

      {/* ================= MODAL: ITEM STOCK MOVEMENT LEDGER ================= */}
      {historyModalItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Stock Movement Ledger</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {historyModalItem.name} • Current: <b>{historyModalItem.quantity} {historyModalItem.unit}</b>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setHistoryModalItem(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {loadingTransactions ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-400 text-xs gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                  <span>Loading stock audit history...</span>
                </div>
              ) : itemTransactions.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  <Package className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
                  <p className="font-semibold">No stock movements recorded yet.</p>
                  <p className="text-[11px] mt-0.5">Transactions are recorded on restocks, recipe executions, task BOM completions, and manual stock edits.</p>
                </div>
              ) : (
                itemTransactions.map((tx) => {
                  const deltaNum = Number(tx.delta_qty) || 0;
                  const isPositive = deltaNum > 0;
                  const isZero = deltaNum === 0;

                  const reasonBadge = (() => {
                    switch (tx.reason_type) {
                      case 'TASK_BOM':
                        return { label: 'Task BOM', color: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800' };
                      case 'RECIPE_BATCH':
                        return { label: 'Recipe Batch', color: 'bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400 border-purple-200 dark:border-purple-800' };
                      case 'RESTOCK_CART':
                        return { label: 'Restock Received', color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' };
                      case 'CSV_IMPORT':
                        return { label: 'CSV Import', color: 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400 border-blue-200 dark:border-blue-800' };
                      case 'MANUAL':
                      default:
                        return { label: 'Manual Adjustment', color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700' };
                    }
                  })();

                  return (
                    <div
                      key={tx.id}
                      className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={cn(
                            "w-12 text-center py-1 rounded-xl font-bold font-mono text-xs border shrink-0",
                            isPositive
                              ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
                              : isZero
                              ? "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                              : "bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400 border-amber-200 dark:border-amber-800"
                          )}
                        >
                          {isPositive ? `+${deltaNum}` : deltaNum}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold border", reasonBadge.color)}>
                              {reasonBadge.label}
                            </span>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400">
                              Balance: <b>{tx.quantity_after} {historyModalItem.unit}</b>
                            </span>
                          </div>
                          {tx.reference_note && (
                            <p className="text-[11px] text-slate-600 dark:text-slate-300 truncate mt-0.5 font-medium">
                              {tx.reference_note}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0 text-[11px] text-slate-400">
                        <div>{new Date(tx.created_at).toLocaleDateString()}</div>
                        <div className="text-[10px]">{new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setHistoryModalItem(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Close Ledger
              </button>
            </div>
          </div>
        </div>
      )}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #workbench-printable-area,
          #workbench-printable-area * {
            visibility: visible;
          }
          #workbench-printable-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
            color: black !important;
            padding: 16px !important;
            margin: 0 !important;
            z-index: 99999;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}

// -------------------------------------------------------------
// SUB-COMPONENTS: QR & BARCODE RENDERERS FOR PHYSICAL WORKSHOPS
// -------------------------------------------------------------
function WorkshopQrGlyph({ value }: { value: string }) {
  const cells = useMemo(() => {
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
      hash = (hash << 5) - hash + value.charCodeAt(i);
      hash |= 0;
    }
    const grid: boolean[][] = [];
    for (let r = 0; r < 7; r++) {
      const row: boolean[] = [];
      for (let c = 0; c < 7; c++) {
        const isCorner =
          (r <= 1 && c <= 1) ||
          (r <= 1 && c >= 5) ||
          (r >= 5 && c <= 1);
        if (isCorner) {
          row.push(true);
        } else {
          const bit = Math.abs(hash ^ (r * 13 + c * 7)) % 3 !== 0;
          row.push(bit);
        }
      }
      grid.push(row);
    }
    return grid;
  }, [value]);

  return (
    <svg
      viewBox="0 0 7 7"
      className="w-12 h-12 shrink-0 bg-white p-0.5 border border-slate-300 rounded"
      shapeRendering="crispEdges"
    >
      {cells.map((row, r) =>
        row.map((active, c) =>
          active ? <rect key={`${r}-${c}`} x={c} y={r} width="1" height="1" fill="#000" /> : null
        )
      )}
    </svg>
  );
}

function WorkshopBarcode({ text }: { text: string }) {
  const bars = useMemo(() => {
    const list: number[] = [];
    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i);
      list.push(code % 2 === 0 ? 2 : 1);
      list.push(code % 3 === 0 ? 3 : 1);
      list.push(1);
    }
    return list;
  }, [text]);

  const totalWidth = bars.reduce((a, b) => a + b, 0);

  return (
    <div className="flex flex-col items-center">
      <svg viewBox={`0 0 ${totalWidth} 20`} className="w-full h-5">
        {(() => {
          let currentX = 0;
          return bars.map((w, idx) => {
            const x = currentX;
            currentX += w;
            return idx % 2 === 0 ? (
              <rect key={idx} x={x} y="0" width={w} height="20" fill="#000" />
            ) : null;
          });
        })()}
      </svg>
      <span className="text-[8px] font-mono tracking-widest text-slate-800 uppercase mt-0.5">
        {text}
      </span>
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
  defaultCurrency?: Currency;
  onImported: (items: InventoryItem[]) => void;
}

function BulkAddModal({ isOpen, onClose, folders, userId, defaultCurrency = 'USD', onImported }: BulkAddModalProps) {
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
        currency: defaultCurrency || 'USD',
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
        currency: defaultCurrency || 'USD',
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
      currency: item.currency || defaultCurrency || 'USD',
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
  onItemCreated?: (item: InventoryItem) => void;
}

function RecipeModal({
  isOpen,
  onClose,
  recipe,
  inventoryItems,
  userId,
  onSaved,
  onItemCreated,
}: RecipeModalProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  const [title, setTitle] = useState(recipe?.title || '');
  const [category, setCategory] = useState(recipe?.category || 'General');
  const [instructionsMd, setInstructionsMd] = useState(recipe?.instructions_md || '');
  const [rating, setRating] = useState<number>(recipe?.rating || 5);
  const [isPublic, setIsPublic] = useState<boolean>(recipe?.is_public || false);
  const [imageUrl, setImageUrl] = useState<string>(recipe?.image_url || '');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>(recipe?.image_url || '');
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (PNG, JPG, WebP, etc.)');
      return;
    }
    setImageFile(file);
    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview('');
    setImageUrl('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  const [ingredients, setIngredients] = useState<
    Array<{ inventory_item_id: string; quantity_required: number }>
  >(
    recipe?.ingredients?.map((ri) => ({
      inventory_item_id: ri.inventory_item_id,
      quantity_required: Number(ri.quantity_required) || 1,
    })) || []
  );

  // v1.6 Output Finished Good & Unit Economics state
  const [outputItemId, setOutputItemId] = useState<string>(recipe?.output_item_id || '');
  const [outputYieldQty, setOutputYieldQty] = useState<string>(
    String(recipe?.output_yield_qty ?? 1)
  );
  const [packagingOverhead, setPackagingOverhead] = useState<string>(
    String(recipe?.packaging_overhead ?? 4.5)
  );
  const [targetRetailPrice, setTargetRetailPrice] = useState<string>(
    String(recipe?.target_retail_price ?? 0)
  );
  const [deductMarketplaceFee, setDeductMarketplaceFee] = useState<boolean>(true);
  const [creatingGood, setCreatingGood] = useState(false);

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

  // Unit Economics calculation
  const yieldQty = Math.max(0.01, parseFloat(outputYieldQty) || 1);
  const pkgOverhead = Math.max(0, parseFloat(packagingOverhead) || 0);
  const retailPrice = Math.max(0, parseFloat(targetRetailPrice) || 0);
  const unitIngredientsCost = estimatedCost / yieldQty;
  const unitCOGS = unitIngredientsCost + pkgOverhead;
  const marketplaceFee = deductMarketplaceFee ? retailPrice * 0.095 : 0;
  const netProfit = retailPrice - unitCOGS - marketplaceFee;
  const marginPercent = retailPrice > 0 ? (netProfit / retailPrice) * 100 : 0;

  const primaryCurrency = useMemo(() => {
    const firstIng = ingredients[0];
    const item = inventoryItems.find((i) => i.id === firstIng?.inventory_item_id);
    return item?.currency || 'USD';
  }, [ingredients, inventoryItems]);

  // Auto create Finished Good in inventory_items
  async function handleAutoCreateFinishedGood() {
    if (!title.trim()) {
      alert('Please enter a formula title first');
      return;
    }
    setCreatingGood(true);
    try {
      const { data, error } = await supabase
        .from('inventory_items')
        .insert({
          user_id: userId,
          name: title.trim(),
          item_type: 'FINISHED_GOOD',
          description: `Produced via formula: ${title.trim()}`,
          quantity: 0,
          unit: 'pcs',
          unit_price: Math.round(unitCOGS * 100) / 100,
          currency: primaryCurrency,
          condition: 'GOOD',
          in_restock_cart: false,
          restock_target_qty: 1,
        })
        .select()
        .single();

      if (error) throw error;
      if (data) {
        if (onItemCreated) onItemCreated(data as InventoryItem);
        setOutputItemId(data.id);
      }
    } catch (err: any) {
      alert(`Failed to auto-create item: ${err.message}`);
    } finally {
      setCreatingGood(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      alert('Please enter a formula title');
      return;
    }

    setLoading(true);

    try {
      let finalImageUrl = imageUrl;
      if (imageFile) {
        setUploadingImage(true);
        try {
          const compressedBlob = await compressWorkshopImage(imageFile, 512, 0.82);
          const fileName = `${userId}/recipe_${Date.now()}.webp`;
          const { error: uploadErr } = await supabase.storage
            .from('community-media')
            .upload(fileName, compressedBlob, {
              contentType: 'image/webp',
              upsert: true,
            });
          if (uploadErr) {
            console.error('Failed to upload image:', uploadErr);
            alert(`Image upload failed: ${uploadErr.message}`);
            setLoading(false);
            setUploadingImage(false);
            return;
          }
          const { data: pubData } = supabase.storage
            .from('community-media')
            .getPublicUrl(fileName);
          finalImageUrl = pubData.publicUrl;
        } catch (err: any) {
          console.error('Image compression failed:', err);
          alert('Failed to compress image.');
          setLoading(false);
          setUploadingImage(false);
          return;
        }
      }

      let savedId = recipe?.id;

      if (recipe?.id) {
        const { error } = await supabase
          .from('maker_recipes')
          .update({
            title: title.trim(),
            category,
            instructions_md: instructionsMd.trim(),
            rating,
            is_public: isPublic,
            image_url: finalImageUrl || '',
            output_item_id: outputItemId || null,
            output_yield_qty: yieldQty,
            packaging_overhead: pkgOverhead,
            target_retail_price: retailPrice,
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
            is_public: isPublic,
            image_url: finalImageUrl || '',
            output_item_id: outputItemId || null,
            output_yield_qty: yieldQty,
            packaging_overhead: pkgOverhead,
            target_retail_price: retailPrice,
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

      // Fetch full recipe with joined ingredients and output_item
      const { data: fullRecipe } = await supabase
        .from('maker_recipes')
        .select('*, output_item:inventory_items(*), ingredients:recipe_ingredients(*, inventory_item:inventory_items(*))')
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
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
            <FlaskConical className="w-5 h-5 text-emerald-500" />
            <span>{recipe ? 'Edit Formula / Recipe' : 'New Workshop Formula'}</span>
          </div>
          <button onClick={onClose} className="p-1 rounded-xl text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
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

          {/* Public Formula Sharing Toggle */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70">
            <div className="flex items-center gap-2.5">
              <Globe className="w-4 h-4 text-blue-500 shrink-0" />
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white block">
                  Public Formula
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                  Share on your Maker Profile so others can clone it to their workshop (+50 XP when cloned).
                </span>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Formula Photo */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Formula / Batch Photo (Optional)
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />
            {imagePreview ? (
              <div className="relative inline-block group">
                <img
                  src={imagePreview}
                  alt="Formula Preview"
                  className="w-20 h-20 rounded-2xl object-cover border border-slate-200 dark:border-slate-700 shadow-sm"
                />
                <div className="absolute inset-0 bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-1 rounded-lg bg-white/80 dark:bg-slate-900/80 text-slate-800 dark:text-white hover:bg-white"
                    title="Change Photo"
                  >
                    <Camera className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="p-1 rounded-lg bg-red-600/80 text-white hover:bg-red-600"
                    title="Remove Photo"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-3 py-2 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-400 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-emerald-600 transition"
              >
                <Camera className="w-4 h-4 text-emerald-500" />
                <span>Upload Recipe Thumbnail (WebP center-crop)</span>
              </button>
            )}
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

          <div className="flex items-center justify-between">
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
          </div>

          {/* ================= v1.6 OUTPUT GOOD LINK & YIELD ================= */}
          <div className="p-3.5 bg-violet-50/60 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-900/60 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-violet-900 dark:text-violet-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-violet-500" />
                <span>Output Finished Creation (Stock Destination)</span>
              </span>
              <button
                type="button"
                onClick={handleAutoCreateFinishedGood}
                disabled={creatingGood}
                className="text-[11px] font-bold text-violet-700 dark:text-violet-400 hover:underline flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                <span>{creatingGood ? 'Creating...' : '+ Auto-Create Creation Item'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Destination Finished Good (in Inventory)
                </label>
                <select
                  value={outputItemId}
                  onChange={(e) => setOutputItemId(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-violet-200 dark:border-violet-800 text-xs font-medium text-slate-900 dark:text-white"
                >
                  <option value="">(None - Do not track finished stock)</option>
                  {inventoryItems
                    .filter((item) => item.item_type === 'FINISHED_GOOD')
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({item.quantity} {item.unit} in stock)
                      </option>
                    ))}
                  {/* Also permit selecting any item if no finished good created yet */}
                  {inventoryItems
                    .filter((item) => item.item_type !== 'FINISHED_GOOD')
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        [Material/Equip] {item.name} ({item.quantity} {item.unit})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Yield per Batch
                </label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="any"
                    min="0.01"
                    required
                    value={outputYieldQty}
                    onChange={(e) => setOutputYieldQty(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-violet-200 dark:border-violet-800 text-xs font-bold text-center text-slate-900 dark:text-white"
                  />
                  <span className="text-xs text-slate-400">units</span>
                </div>
              </div>
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
          </div>

          {/* ================= v1.6 UNIT ECONOMICS & MARGIN SIMULATOR ================= */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-amber-500" />
                <span>Unit Economics &amp; Pricing Margin Simulator</span>
              </span>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={deductMarketplaceFee}
                    onChange={(e) => setDeductMarketplaceFee(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-0"
                  />
                  <span>Simulate 9.5% Platform Fee (Etsy/Payment)</span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Packaging &amp; Shipping Overhead (Box, Bubble Mailer, Bag)
                </label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={packagingOverhead}
                    onChange={(e) => setPackagingOverhead(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                  />
                  <span className="text-xs text-slate-400">{primaryCurrency}</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Target Retail Sale Price
                </label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={targetRetailPrice}
                    onChange={(e) => setTargetRetailPrice(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                  />
                  <span className="text-xs text-slate-400">{primaryCurrency}</span>
                </div>
              </div>
            </div>

            {/* Live Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-800">
              <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 font-semibold block">Batch Ingredients</span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {formatCurrency(estimatedCost, primaryCurrency)}
                </span>
              </div>

              <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 font-semibold block">Unit COGS (All-in)</span>
                <span className="text-xs font-bold text-violet-600 dark:text-violet-400">
                  {formatCurrency(unitCOGS, primaryCurrency)}
                </span>
              </div>

              <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 font-semibold block">Net Margin / Unit</span>
                <span className={cn(
                  'text-xs font-bold',
                  netProfit > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'
                )}>
                  {formatCurrency(netProfit, primaryCurrency)}
                </span>
              </div>

              <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 font-semibold block">Gross Margin %</span>
                <span className={cn(
                  'text-xs font-extrabold',
                  marginPercent >= 50
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : marginPercent >= 20
                    ? 'text-amber-500'
                    : 'text-rose-500'
                )}>
                  {retailPrice > 0 ? `${marginPercent.toFixed(1)}%` : '—'}
                </span>
              </div>
            </div>
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
  defaultCurrency?: Currency;
  onSaved: (item: InventoryItem) => void;
}

function ItemModal({ isOpen, onClose, item, folders, userId, defaultCurrency = 'USD', onSaved }: ItemModalProps) {
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
  const [maintenanceIntervalDays, setMaintenanceIntervalDays] = useState<string>(
    item?.maintenance_interval_days !== undefined ? String(item.maintenance_interval_days) : '0'
  );
  const [unitPrice, setUnitPrice] = useState<string>(item ? String(item.unit_price) : '0');
  const [currency, setCurrency] = useState<Currency>(item?.currency || defaultCurrency || 'USD');
  const [condition, setCondition] = useState<ItemCondition>(item?.condition || 'GOOD');
  const [searchKeyword, setSearchKeyword] = useState(item?.search_keyword || '');
  const [reorderUrl, setReorderUrl] = useState(item?.reorder_url || '');
  const [imageUrl, setImageUrl] = useState<string>(item?.image_url || '');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>(item?.image_url || '');
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (PNG, JPG, WebP, etc.)');
      return;
    }
    setImageFile(file);
    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview('');
    setImageUrl('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      alert('Please enter an item name');
      return;
    }

    setLoading(true);

    let finalImageUrl = imageUrl;
    if (imageFile) {
      setUploadingImage(true);
      try {
        const compressedBlob = await compressWorkshopImage(imageFile, 512, 0.82);
        const fileName = `${userId}/inventory_${Date.now()}.webp`;
        const { error: uploadErr } = await supabase.storage
          .from('community-media')
          .upload(fileName, compressedBlob, {
            contentType: 'image/webp',
            upsert: true,
          });
        if (uploadErr) {
          console.error('Failed to upload image:', uploadErr);
          alert(`Image upload failed: ${uploadErr.message}`);
          setLoading(false);
          setUploadingImage(false);
          return;
        }
        const { data: pubData } = supabase.storage
          .from('community-media')
          .getPublicUrl(fileName);
        finalImageUrl = pubData.publicUrl;
      } catch (err: any) {
        console.error('Image compression failed:', err);
        alert('Failed to compress image.');
        setLoading(false);
        setUploadingImage(false);
        return;
      }
    }

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
      maintenance_interval_days:
        itemType === 'EQUIPMENT' ? Math.max(0, parseInt(maintenanceIntervalDays, 10) || 0) : 0,
      search_keyword: searchKeyword.trim(),
      reorder_url: reorderUrl.trim(),
      image_url: finalImageUrl || '',
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
                <option value="FINISHED_GOOD">Finished Creation (Output)</option>
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

          {/* Item Photo */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Item Photo (Optional)
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />
            {imagePreview ? (
              <div className="relative inline-block group">
                <img
                  src={imagePreview}
                  alt="Item Preview"
                  className="w-20 h-20 rounded-2xl object-cover border border-slate-200 dark:border-slate-700 shadow-sm"
                />
                <div className="absolute inset-0 bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-1 rounded-lg bg-white/80 dark:bg-slate-900/80 text-slate-800 dark:text-white hover:bg-white"
                    title="Change Photo"
                  >
                    <Camera className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="p-1 rounded-lg bg-red-600/80 text-white hover:bg-red-600"
                    title="Remove Photo"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-3 py-2 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-400 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-blue-600 transition"
              >
                <Camera className="w-4 h-4 text-blue-500" />
                <span>Upload Item Photo (WebP center-crop)</span>
              </button>
            )}
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
                {itemType === 'FINISHED_GOOD'
                  ? 'Unit Production Cost / COGS'
                  : itemType === 'EQUIPMENT'
                  ? 'Replacement Cost'
                  : 'Unit Purchase Price'}
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
                <option value="USD">$ USD</option>
                <option value="EUR">€ EUR</option>
                <option value="ILS">₪ ILS</option>
                <option value="GBP">£ GBP</option>
              </select>
            </div>
          </div>

          {/* Equipment Condition & Service Interval */}
          {itemType === 'EQUIPMENT' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Tool Condition
                </label>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value as ItemCondition)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white"
                >
                  <option value="GOOD">Good Condition</option>
                  <option value="NEEDS_MAINTENANCE">Needs Maintenance</option>
                  <option value="REPLACE">Needs Replacement</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Service Interval (Days)
                </label>
                <input
                  type="number"
                  min="0"
                  max="3650"
                  placeholder="e.g. 30, 90, 180 (0 = off)"
                  value={maintenanceIntervalDays}
                  onChange={(e) => setMaintenanceIntervalDays(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Alert interval for recalibration/cleaning.
                </span>
              </div>
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

// -------------------------------------------------------------
// SUB-COMPONENT: UNIVERSAL CSV IMPORTER MODAL
// -------------------------------------------------------------
interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  folders: InventoryFolder[];
  defaultCurrency: Currency;
  onImported: (items: InventoryItem[]) => void;
}

function CsvImportModal({
  isOpen,
  onClose,
  userId,
  folders,
  defaultCurrency,
  onImported,
}: CsvImportModalProps) {
  const supabase = createClient();
  const [csvText, setCsvText] = useState('');
  const [targetFolderId, setTargetFolderId] = useState('');
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function downloadSampleCsv() {
    const sample = `Name,Type,Quantity,Unit,Unit Price,Currency,Condition,Location,Reorder Point,Notes\nPLA Filament 1.75mm Black,MATERIAL,3,rolls,85,USD,GOOD,Rack A1,1,Premium 1kg spools\n0.4mm Brass V6 Nozzle,EQUIPMENT,5,pcs,12,USD,NEW,Drawer 2,2,Spare hotend nozzles\nIsopropyl Alcohol 99%,MATERIAL,1000,ml,35,USD,GOOD,Chemical Cabinet,250,Bed cleaner & resin wash\n`;
    const blob = new Blob(['\uFEFF' + sample], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'workbench_inventory_template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function parseCsvContent(text: string) {
    setImportError(null);
    if (!text.trim()) {
      setParsedRows([]);
      return;
    }

    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) {
      setParsedRows([]);
      return;
    }

    // Split line respecting double quotes
    function parseCsvLine(line: string): string[] {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if ((char === ',' || char === '\t') && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    }

    // Check if first row is header
    const firstTokens = parseCsvLine(lines[0]);
    const isHeader = firstTokens.some((t) =>
      ['name', 'type', 'quantity', 'unit', 'price'].includes(t.toLowerCase())
    );
    const dataLines = isHeader ? lines.slice(1) : lines;

    const rows = dataLines
      .map((line) => {
        const tokens = parseCsvLine(line);
        if (!tokens[0]) return null;

        const rawType = (tokens[1] || 'MATERIAL').toUpperCase();
        const validTypes = ['MATERIAL', 'EQUIPMENT', 'FINISHED_GOOD'];
        const item_type = validTypes.includes(rawType) ? rawType : 'MATERIAL';

        const qty = parseFloat(tokens[2]) || 0;
        const unit = tokens[3] || 'pcs';
        const unitPrice = parseFloat(tokens[4]) || 0;
        const rawCurr = (tokens[5] || defaultCurrency).toUpperCase();
        const validCurrencies = ['USD', 'EUR', 'ILS', 'GBP'];
        const currency = validCurrencies.includes(rawCurr) ? rawCurr : defaultCurrency;
        const condition = tokens[6] || 'GOOD';
        const sku_or_location = tokens[7] || '';
        const reorder_point = parseFloat(tokens[8]) || 0;
        const description = tokens[9] || '';

        return {
          name: tokens[0],
          item_type,
          quantity: qty,
          unit,
          unit_price: unitPrice,
          currency,
          condition,
          sku_or_location,
          low_stock_threshold: reorder_point,
          description,
          folder_id: targetFolderId || null,
        };
      })
      .filter(Boolean);

    setParsedRows(rows);
  }

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = String(event.target?.result || '');
      setCsvText(content);
      parseCsvContent(content);
    };
    reader.readAsText(file);
  }

  async function handleImportSubmit() {
    if (parsedRows.length === 0) return;
    setIsImporting(true);
    setImportError(null);

    try {
      // Map rows with target folder if set
      const payload = parsedRows.map((r) => ({
        ...r,
        folder_id: targetFolderId || null,
      }));

      const { data, error } = await supabase.rpc('bulk_import_inventory_csv', {
        p_items: payload,
      });

      if (error) throw error;

      if (data && data.items) {
        onImported(data.items as InventoryItem[]);
      } else {
        // Fallback query if RPC returns count only
        const { data: refreshed } = await supabase
          .from('inventory_items')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(payload.length);

        if (refreshed) {
          onImported(refreshed as InventoryItem[]);
        }
      }
    } catch (err: any) {
      setImportError(err.message || 'Failed to import CSV');
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-3xl p-6 shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5 font-bold text-slate-900 dark:text-white">
            <Upload className="w-5 h-5 text-blue-600" />
            <span>Universal Inventory CSV Importer</span>
          </div>
          <button onClick={onClose} className="p-1 rounded-xl text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {/* Header Controls: File Upload & Template Download */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50">
            <div>
              <h4 className="text-xs font-bold text-blue-900 dark:text-blue-300">
                Bulk Import up to 250 Inventory Items
              </h4>
              <p className="text-[11px] text-blue-700/80 dark:text-blue-400 mt-0.5">
                Upload a spreadsheet or CSV from Excel, Google Sheets, or your shop export.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={downloadSampleCsv}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 hover:bg-blue-50 shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Sample CSV Template</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv,text/plain"
                onChange={handleFileSelected}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Select File</span>
              </button>
            </div>
          </div>

          {/* Folder Target & Paste Box */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Or Paste Raw CSV Text:
              </label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-semibold">Assign to Folder:</span>
                <select
                  value={targetFolderId}
                  onChange={(e) => {
                    setTargetFolderId(e.target.value);
                    if (parsedRows.length > 0) {
                      setParsedRows((prev) =>
                        prev.map((r) => ({ ...r, folder_id: e.target.value || null }))
                      );
                    }
                  }}
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

            <textarea
              rows={4}
              value={csvText}
              onChange={(e) => {
                setCsvText(e.target.value);
                parseCsvContent(e.target.value);
              }}
              placeholder="Name,Type,Quantity,Unit,Unit Price,Currency,Condition,Location,Reorder Point,Notes..."
              className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white focus:outline-none"
            />
          </div>

          {/* Error Message */}
          {importError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-600 dark:text-rose-400 font-medium">
              ⚠️ {importError}
            </div>
          )}

          {/* Preview Table */}
          {parsedRows.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  Parsed Preview ({parsedRows.length} items ready to import):
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setCsvText('');
                    setParsedRows([]);
                  }}
                  className="text-[11px] text-red-500 hover:underline"
                >
                  Clear All
                </button>
              </div>

              <div className="max-h-56 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-[10px] uppercase font-bold text-slate-500">
                    <tr>
                      <th className="p-2.5">Name</th>
                      <th className="p-2.5">Type</th>
                      <th className="p-2.5">Quantity</th>
                      <th className="p-2.5">Price</th>
                      <th className="p-2.5">Location</th>
                      <th className="p-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {parsedRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="p-2.5 font-semibold text-slate-900 dark:text-white truncate max-w-[180px]">
                          {row.name}
                        </td>
                        <td className="p-2.5">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 uppercase">
                            {row.item_type}
                          </span>
                        </td>
                        <td className="p-2.5 font-bold">
                          {row.quantity} {row.unit}
                        </td>
                        <td className="p-2.5">
                          {row.unit_price > 0 ? `${row.currency} ${row.unit_price}` : '—'}
                        </td>
                        <td className="p-2.5 text-slate-500 text-[11px]">
                          {row.sku_or_location || '—'}
                        </td>
                        <td className="p-2.5 text-right">
                          <button
                            type="button"
                            onClick={() =>
                              setParsedRows((prev) => prev.filter((_, i) => i !== idx))
                            }
                            className="p-1 rounded text-slate-400 hover:text-red-500"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-400 font-medium">
            {parsedRows.length > 0 ? `${parsedRows.length} items queued` : 'Paste CSV or pick a file'}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isImporting || parsedRows.length === 0}
              onClick={handleImportSubmit}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md disabled:opacity-50 transition"
            >
              {isImporting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Importing...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Import {parsedRows.length} Items</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// SUB-COMPONENT: EQUIPMENT MAINTENANCE & CALIBRATION LOGBOOK MODAL
// -------------------------------------------------------------
interface EquipmentLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: InventoryItem;
  userId: string;
  defaultCurrency: Currency;
  onMaintenanceLogged: (updatedItem: InventoryItem) => void;
}

function EquipmentLogModal({
  isOpen,
  onClose,
  item,
  userId,
  defaultCurrency,
  onMaintenanceLogged,
}: EquipmentLogModalProps) {
  const supabase = createClient();
  const [logs, setLogs] = useState<EquipmentLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);

  // Form State
  const [actionType, setActionType] = useState<EquipmentActionType>('MAINTENANCE');
  const [summary, setSummary] = useState('');
  const [cost, setCost] = useState('');
  const [conditionAfter, setConditionAfter] = useState<ItemCondition>(item.condition || 'GOOD');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadLogs() {
      setLoadingLogs(true);
      const { data } = await supabase
        .from('equipment_logs')
        .select('*')
        .eq('item_id', item.id)
        .order('performed_at', { ascending: false });

      if (data) {
        setLogs(data as EquipmentLog[]);
      }
      setLoadingLogs(false);
    }

    loadLogs();
  }, [item.id, supabase]);

  async function handleLogSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!summary.trim()) {
      alert('Please enter service notes describing the work performed');
      return;
    }

    setIsSubmitting(true);
    try {
      const parsedCost = parseFloat(cost) || 0;
      const { data, error } = await supabase.rpc('log_equipment_maintenance', {
        p_item_id: item.id,
        p_action_type: actionType,
        p_summary: summary.trim(),
        p_cost: parsedCost,
        p_condition_after: conditionAfter,
      });

      if (error) throw error;

      const newLog: EquipmentLog = {
        id: data?.log_id || crypto.randomUUID(),
        item_id: item.id,
        user_id: userId,
        action_type: actionType,
        summary: summary.trim(),
        cost: parsedCost,
        condition_after: conditionAfter,
        performed_at: new Date().toISOString(),
      };

      setLogs((prev) => [newLog, ...prev]);

      // Call parent updater
      onMaintenanceLogged({
        ...item,
        last_maintained_at: newLog.performed_at,
        condition: conditionAfter,
      });

      setSummary('');
      setCost('');
    } catch (err: any) {
      alert(`Failed to log maintenance: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl p-6 shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5 font-bold text-slate-900 dark:text-white">
            <Wrench className="w-5 h-5 text-amber-500" />
            <span>Equipment Maintenance Logbook: {item.name}</span>
          </div>
          <button onClick={onClose} className="p-1 rounded-xl text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-4 space-y-5">
          {/* Item Status Header */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 text-xs">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Condition</span>
              <span className="font-extrabold text-slate-900 dark:text-white">{item.condition}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Service Cycle</span>
              <span className="font-extrabold text-slate-900 dark:text-white">
                {item.maintenance_interval_days ? `Every ${item.maintenance_interval_days}d` : 'None'}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Last Serviced</span>
              <span className="font-extrabold text-slate-900 dark:text-white">
                {item.last_maintained_at ? new Date(item.last_maintained_at).toLocaleDateString() : 'Never'}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Logs</span>
              <span className="font-extrabold text-slate-900 dark:text-white">{logs.length}</span>
            </div>
          </div>

          {/* Form: Log New Service */}
          <form onSubmit={handleLogSubmit} className="p-4 rounded-2xl border border-amber-200/80 dark:border-amber-900/50 bg-amber-50/30 dark:bg-amber-950/20 space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-amber-200/50 dark:border-amber-900/40">
              <Activity className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                Record New Maintenance / Calibration Service (+10 XP)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Action Type
                </label>
                <select
                  value={actionType}
                  onChange={(e) => setActionType(e.target.value as EquipmentActionType)}
                  className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white"
                >
                  <option value="MAINTENANCE">Maintenance</option>
                  <option value="CALIBRATION">Calibration</option>
                  <option value="REPAIR">Repair</option>
                  <option value="PART_SWAP">Part Swap</option>
                  <option value="INSPECTION">Inspection</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Condition After Service
                </label>
                <select
                  value={conditionAfter}
                  onChange={(e) => setConditionAfter(e.target.value as ItemCondition)}
                  className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white"
                >
                  <option value="GOOD">Good Condition</option>
                  <option value="NEEDS_MAINTENANCE">Needs Maintenance</option>
                  <option value="REPLACE">Needs Replacement</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Cost ({defaultCurrency})
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                Service Summary &amp; Findings *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Replaced 0.4mm nozzle, cleaned heatbreak, recalibrated Z-offset bed level."
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-sm transition disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Save Service Log</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Past Maintenance History */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-900 dark:text-white block">
              Maintenance History ({logs.length})
            </span>

            {loadingLogs ? (
              <div className="text-center py-6 text-slate-400">
                <Loader2 className="w-5 h-5 animate-spin mx-auto mb-1 text-slate-400" />
                <span className="text-xs">Loading service logbook...</span>
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-8 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
                No maintenance records yet. Use the form above to record calibrations, repairs, and inspections.
              </div>
            ) : (
              <div className="space-y-2">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 uppercase">
                          {log.action_type}
                        </span>
                        <span className="text-slate-400 text-[11px]">
                          {new Date(log.performed_at).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {log.cost > 0 && (
                          <span className="font-bold text-slate-900 dark:text-white">
                            {formatCurrency(log.cost, defaultCurrency)}
                          </span>
                        )}
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                          {log.condition_after}
                        </span>
                      </div>
                    </div>
                    <p className="text-slate-700 dark:text-slate-300 font-medium">
                      {log.summary}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Close Logbook
          </button>
        </div>
      </div>
    </div>
  );
}
