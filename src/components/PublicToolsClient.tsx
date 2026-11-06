'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency } from '@/lib/utils';
import { getPreferredCurrency } from '@/lib/currency';
import { Currency } from '@/lib/types';
import {
  Calculator,
  FlaskConical,
  Printer,
  Sparkles,
  ArrowRight,
  AlertTriangle,
  Info,
  Check,
  Loader2,
  BookOpen,
  HelpCircle,
  ChevronDown,
  Layers,
  Flame,
  Award,
} from 'lucide-react';

interface PublicToolsClientProps {
  currentUser: any;
  currentProfile: any;
}

export default function PublicToolsClient({
  currentUser,
  currentProfile,
}: PublicToolsClientProps) {
  const router = useRouter();
  const supabase = createClient();

  const [activeTool, setActiveTool] = useState<'RESIN' | 'PERFUME' | '3D_PRINT'>('RESIN');
  const [currency, setCurrency] = useState<Currency>(() => getPreferredCurrency());
  const [saveStatus, setSaveStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [saving, setSaving] = useState(false);

  // 1. Epoxy Resin State
  const [moldShape, setMoldShape] = useState<'RECTANGLE' | 'CYLINDER'>('RECTANGLE');
  const [moldLength, setMoldLength] = useState<number>(15);
  const [moldWidth, setMoldWidth] = useState<number>(10);
  const [moldHeight, setMoldHeight] = useState<number>(2.5);
  const [moldDiameter, setMoldDiameter] = useState<number>(12);
  const [resinDensity, setResinDensity] = useState<number>(1.05);
  const [systemRatio, setSystemRatio] = useState<'1:1' | '2:1' | '3:1' | '100:45' | 'CUSTOM'>('2:1');
  const [customRatioA, setCustomRatioA] = useState<number>(100);
  const [customRatioB, setCustomRatioB] = useState<number>(50);

  // 2. Perfume State
  const [perfumeBottleMl, setPerfumeBottleMl] = useState<number>(50);
  const [perfumeConcentration, setPerfumeConcentration] = useState<'EXTRAIT' | 'EDP' | 'EDT' | 'EDC' | 'CUSTOM'>('EDP');
  const [perfumeCustomPct, setPerfumeCustomPct] = useState<number>(18);

  // 3. 3D Print State
  const [printMaterial, setPrintMaterial] = useState<string>('PLA');
  const [partWeightG, setPartWeightG] = useState<number>(65);
  const [spoolCost, setSpoolCost] = useState<number>(90);
  const [spoolWeightG, setSpoolWeightG] = useState<number>(1000);
  const [printHours, setPrintHours] = useState<number>(4);
  const [printMinutes, setPrintMinutes] = useState<number>(30);
  const [printerWatts, setPrinterWatts] = useState<number>(150);
  const [kwhRate, setKwhRate] = useState<number>(0.6);
  const [printFailureBuffer, setPrintFailureBuffer] = useState<number>(5);
  const [targetMarginPct, setTargetMarginPct] = useState<number>(65);

  // Calculations: Epoxy
  let volCm3 = 0;
  if (moldShape === 'RECTANGLE') {
    volCm3 = (Number(moldLength) || 0) * (Number(moldWidth) || 0) * (Number(moldHeight) || 0);
  } else {
    const radius = (Number(moldDiameter) || 0) / 2;
    volCm3 = Math.PI * Math.pow(radius, 2) * (Number(moldHeight) || 0);
  }

  const totalWeightG = volCm3 * (Number(resinDensity) || 1.05);

  let partAPct = 0.6667;
  let partBPct = 0.3333;
  let ratioLabel = '2:1 by weight';

  if (systemRatio === '1:1') {
    partAPct = 0.5;
    partBPct = 0.5;
    ratioLabel = '1:1 by volume/weight';
  } else if (systemRatio === '2:1') {
    partAPct = 2 / 3;
    partBPct = 1 / 3;
    ratioLabel = '2:1 by weight';
  } else if (systemRatio === '3:1') {
    partAPct = 3 / 4;
    partBPct = 1 / 4;
    ratioLabel = '3:1 by weight';
  } else if (systemRatio === '100:45') {
    partAPct = 100 / 145;
    partBPct = 45 / 145;
    ratioLabel = '100:45 by weight';
  } else {
    const totParts = (Number(customRatioA) || 1) + (Number(customRatioB) || 1);
    partAPct = (Number(customRatioA) || 1) / totParts;
    partBPct = (Number(customRatioB) || 1) / totParts;
    ratioLabel = `${customRatioA}:${customRatioB} custom`;
  }

  const partAWeightG = totalWeightG * partAPct;
  const partBWeightG = totalWeightG * partBPct;
  const isHighExotherm = totalWeightG > 100 && moldHeight > 2.0;

  // Calculations: Perfume
  let concPct = 18;
  let concLabel = 'Eau de Parfum (EDP) 18%';
  if (perfumeConcentration === 'EXTRAIT') {
    concPct = 25;
    concLabel = 'Extrait de Parfum (25%)';
  } else if (perfumeConcentration === 'EDP') {
    concPct = 18;
    concLabel = 'Eau de Parfum (18%)';
  } else if (perfumeConcentration === 'EDT') {
    concPct = 10;
    concLabel = 'Eau de Toilette (10%)';
  } else if (perfumeConcentration === 'EDC') {
    concPct = 4;
    concLabel = 'Eau de Cologne (4%)';
  } else {
    concPct = Number(perfumeCustomPct) || 15;
    concLabel = `Custom (${concPct}%)`;
  }

  const fragranceVolMl = perfumeBottleMl * (concPct / 100);
  const alcoholVolMl = perfumeBottleMl - fragranceVolMl;
  const fragranceWeightG = fragranceVolMl * 0.95;
  const alcoholWeightG = alcoholVolMl * 0.8;
  const estimatedBatchWeightG = fragranceWeightG + alcoholWeightG;

  // Calculations: 3D Print
  const totalHours = printHours + printMinutes / 60;
  const filamentCost = (partWeightG / spoolWeightG) * spoolCost * (1 + printFailureBuffer / 100);
  const kwhConsumed = (printerWatts / 1000) * totalHours;
  const powerCost = kwhConsumed * kwhRate;
  const totalMfgCost = filamentCost + powerCost;
  const marginDecimal = targetMarginPct / 100;
  const suggestedPrice = marginDecimal < 1 ? totalMfgCost / (1 - marginDecimal) : totalMfgCost * 2;
  const grossProfit = suggestedPrice - totalMfgCost;

  // Save Formula Handler
  async function handleSaveFormula(toolName: string) {
    let title = '';
    let category = '';
    let instructions = '';

    if (toolName === 'RESIN') {
      title = `Epoxy Mold Pour (${Math.round(volCm3)}ml)`;
      category = 'Epoxy & Molds';
      instructions = `Epoxy Mix Ratio: ${ratioLabel}\n- Part A (Resin): ${partAWeightG.toFixed(1)}g\n- Part B (Hardener): ${partBWeightG.toFixed(1)}g\n- Total Volume: ${volCm3.toFixed(1)}ml (${totalWeightG.toFixed(1)}g)\n\nStir slowly for 3 minutes scraping sides and bottom. Vacuum degas or torch micro-bubbles. Demold after 24h at 22-25°C ambient.`;
    } else if (toolName === 'PERFUME') {
      title = `Perfume Accord (${perfumeConcentration} ${perfumeBottleMl}ml)`;
      category = 'Perfume Lab';
      instructions = `Perfume Concentration Formula (${concLabel}):\n- Bottle Size: ${perfumeBottleMl}ml\n- Fragrance Oil Concentrate: ${fragranceVolMl.toFixed(1)}ml (${fragranceWeightG.toFixed(1)}g)\n- Perfumer's Alcohol (96%): ${alcoholVolMl.toFixed(1)}ml (${alcoholWeightG.toFixed(1)}g)\n\nMaceration Guide: Shake well and rest in dark amber glass at 18-21°C for 3 to 6 weeks. Chill filter before final bottling.`;
    } else {
      title = `3D Print: ${printMaterial} (${partWeightG}g, ${printHours}h${printMinutes}m)`;
      category = '3D Printing';
      instructions = `3D Printing Cost Sheet (${printMaterial}):\n- Sliced Weight: ${partWeightG}g (Spool: ${formatCurrency(spoolCost, currency)}/kg)\n- Print Duration: ${printHours}h ${printMinutes}m\n- Machine Power: ${printerWatts}W (${kwhConsumed.toFixed(2)} kWh)\n- Filament Cost: ${formatCurrency(filamentCost, currency)}\n- Electricity Cost: ${formatCurrency(powerCost, currency)}\n- Base Unit Cost: ${formatCurrency(totalMfgCost, currency)}\n- Target Retail Price (${targetMarginPct}% margin): ${formatCurrency(suggestedPrice, currency)}`;
    }

    if (!currentUser) {
      try {
        const payload = {
          toolName,
          title,
          category,
          instructions_md: instructions,
          timestamp: Date.now(),
        };
        localStorage.setItem('workbench_pending_formula', JSON.stringify(payload));
      } catch (_) {}
      router.push('/signup?redirect=/inventory');
      return;
    }

    setSaving(true);
    setSaveStatus(null);

    try {
      const { error } = await supabase.from('maker_recipes').insert({
        user_id: currentUser.id,
        title,
        category,
        instructions_md: instructions,
      });

      if (error) throw error;

      setSaveStatus({
        success: true,
        message: `"${title}" has been saved to your workshop formulas!`,
      });
    } catch (err: any) {
      setSaveStatus({
        success: false,
        message: err.message || 'Failed to save recipe formula',
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* ==================================================================== */}
      {/* 1. TOP NAVIGATION                                                    */}
      {/* ==================================================================== */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-slate-950/80 border-b border-slate-900 px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white font-black text-base flex items-center justify-center shadow-lg shadow-blue-500/30">
              W
            </div>
            <span className="font-black text-lg tracking-tight text-white">Workbench</span>
            <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              Lab Tools
            </span>
          </Link>

          <nav className="flex items-center gap-3 sm:gap-4">
            <Link
              href="/community"
              className="text-xs font-semibold text-slate-400 hover:text-white transition"
            >
              Community
            </Link>
            {currentUser ? (
              <Link
                href="/dashboard"
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition"
              >
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-xs font-semibold text-slate-400 hover:text-white transition px-2 py-1"
                >
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 transition"
                >
                  Start Free Workshop &rarr;
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* ==================================================================== */}
      {/* 2. GUEST CTA BANNER                                                  */}
      {/* ==================================================================== */}
      {!currentUser && (
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white py-2.5 px-4 text-xs font-medium text-center shadow-inner">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-2">
            <span>
              💡 <strong>Free Interactive Workshop Calculators.</strong> Want to save recipes, auto-deduct raw materials from stock, and earn Maker XP?
            </span>
            <Link
              href="/signup"
              className="underline font-bold hover:text-blue-100 flex items-center gap-1 shrink-0"
            >
              <span>Create Free Account</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 3. HERO SECTION                                                      */}
      {/* ==================================================================== */}
      <section className="py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold">
            <Calculator className="w-3.5 h-3.5" />
            <span>Precision Workshop Formulation Suite</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
            Free Maker Calculators &amp; Lab Formulation Tools
          </h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            Eliminate ruined molds, harsh perfume blends, and underpriced 3D prints. Calculate exact chemical ratios, exothermic thresholds, alcohol dilutions, and all-in batch unit economics in real time.
          </p>
        </div>

        {/* ================================================================== */}
        {/* 4. TOOL SELECTOR TABS                                              */}
        {/* ================================================================== */}
        <div className="mt-8 flex items-center justify-center">
          <div className="flex p-1.5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md">
            <button
              onClick={() => {
                setActiveTool('RESIN');
                setSaveStatus(null);
              }}
              className={`flex items-center gap-2 px-4 sm:px-6 py-2.5 rounded-xl text-xs font-bold transition ${
                activeTool === 'RESIN'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FlaskConical className="w-4 h-4" />
              <span>Epoxy Resin &amp; Mold</span>
            </button>
            <button
              onClick={() => {
                setActiveTool('PERFUME');
                setSaveStatus(null);
              }}
              className={`flex items-center gap-2 px-4 sm:px-6 py-2.5 rounded-xl text-xs font-bold transition ${
                activeTool === 'PERFUME'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Perfume Dilution</span>
            </button>
            <button
              onClick={() => {
                setActiveTool('3D_PRINT');
                setSaveStatus(null);
              }}
              className={`flex items-center gap-2 px-4 sm:px-6 py-2.5 rounded-xl text-xs font-bold transition ${
                activeTool === '3D_PRINT'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Printer className="w-4 h-4" />
              <span>3D Print Costing</span>
            </button>
          </div>
        </div>

        {/* Save Status Banner */}
        {saveStatus && (
          <div
            className={`mt-6 p-4 rounded-2xl text-xs flex items-center justify-between gap-3 max-w-2xl mx-auto border ${
              saveStatus.success
                ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                : 'bg-red-950/40 border-red-800 text-red-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 flex-shrink-0" />
              <span>{saveStatus.message}</span>
            </div>
            {saveStatus.success && (
              <Link href="/inventory" className="font-bold underline shrink-0 hover:text-white">
                View Recipes &rarr;
              </Link>
            )}
          </div>
        )}

        {/* ================================================================== */}
        {/* 5. INTERACTIVE CALCULATOR PANELS                                   */}
        {/* ================================================================== */}
        <div className="mt-8 max-w-4xl mx-auto">
          {/* TAB 1: EPOXY RESIN */}
          {activeTool === 'RESIN' && (
            <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/60 border border-slate-800 shadow-xl space-y-8">
              <div>
                <h2 className="text-xl font-black text-white">Epoxy Resin &amp; Mold Volume Calculator</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Compute exact cavity volume, density mass, and Part A (Resin) vs Part B (Hardener) gram weights for clear casting and deep pours.
                </p>
              </div>

              {/* Mold Geometry Inputs */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                  <Layers className="w-4 h-4 text-blue-400" />
                  <span>Mold Shape &amp; Internal Dimensions</span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setMoldShape('RECTANGLE')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold border transition ${
                      moldShape === 'RECTANGLE'
                        ? 'bg-blue-600/20 border-blue-500 text-blue-400'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    Rectangular Box
                  </button>
                  <button
                    onClick={() => setMoldShape('CYLINDER')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold border transition ${
                      moldShape === 'CYLINDER'
                        ? 'bg-blue-600/20 border-blue-500 text-blue-400'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    Cylinder / Disc
                  </button>
                </div>

                {moldShape === 'RECTANGLE' ? (
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">Length (cm)</label>
                      <input
                        type="number"
                        min="0.1"
                        step="0.5"
                        value={moldLength}
                        onChange={(e) => setMoldLength(Math.max(0, parseFloat(e.target.value) || 0))}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">Width (cm)</label>
                      <input
                        type="number"
                        min="0.1"
                        step="0.5"
                        value={moldWidth}
                        onChange={(e) => setMoldWidth(Math.max(0, parseFloat(e.target.value) || 0))}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">Depth / Height (cm)</label>
                      <input
                        type="number"
                        min="0.1"
                        step="0.5"
                        value={moldHeight}
                        onChange={(e) => setMoldHeight(Math.max(0, parseFloat(e.target.value) || 0))}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">Diameter (cm)</label>
                      <input
                        type="number"
                        min="0.1"
                        step="0.5"
                        value={moldDiameter}
                        onChange={(e) => setMoldDiameter(Math.max(0, parseFloat(e.target.value) || 0))}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">Depth / Height (cm)</label>
                      <input
                        type="number"
                        min="0.1"
                        step="0.5"
                        value={moldHeight}
                        onChange={(e) => setMoldHeight(Math.max(0, parseFloat(e.target.value) || 0))}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Mixing Ratio Selection */}
              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-300">Resin System Mix Ratio</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: '2:1', label: '2:1 by weight', sub: 'Deep Pour' },
                    { id: '1:1', label: '1:1 by volume', sub: 'Standard Art' },
                    { id: '3:1', label: '3:1 by weight', sub: 'Hard Tabletop' },
                    { id: '100:45', label: '100:45 by weight', sub: 'Marine / Infusion' },
                  ].map((r) => (
                    <button
                      key={r.id}
                      onClick={() => setSystemRatio(r.id as any)}
                      className={`p-3 rounded-2xl border text-left transition ${
                        systemRatio === r.id
                          ? 'bg-blue-600/15 border-blue-500 text-blue-400'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <div className="text-xs font-bold">{r.label}</div>
                      <div className="text-[10px] text-slate-500">{r.sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Batch Results Card */}
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Required Batch Breakdown</span>
                  <span className="text-xs text-blue-400 font-bold">{Math.round(volCm3)} ml total volume</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="block text-[11px] text-slate-400">Part A (Resin)</span>
                    <span className="block text-2xl font-black text-white mt-1">{partAWeightG.toFixed(1)}g</span>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="block text-[11px] text-slate-400">Part B (Hardener)</span>
                    <span className="block text-2xl font-black text-blue-400 mt-1">{partBWeightG.toFixed(1)}g</span>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="block text-[11px] text-slate-400">Total Mix Mass</span>
                    <span className="block text-2xl font-black text-emerald-400 mt-1">{totalWeightG.toFixed(1)}g</span>
                  </div>
                </div>

                {isHighExotherm && (
                  <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-800/80 text-amber-300 text-xs flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-400" />
                    <div>
                      <strong>Exothermic Thermal Runaway Warning:</strong> Pouring &gt;100g deeper than 2.0cm with fast art resin creates intense internal heat buildup, resulting in yellowing, boiling bubbles, and potential smoke. Use deep-pour slow resin or cast in staged thin layers.
                    </div>
                  </div>
                )}
              </div>

              {/* Save Recipe CTA */}
              <div className="flex items-center justify-between pt-2">
                <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5" />
                  <span>Stir slowly for 3 minutes scraping side walls to prevent tacky uncured resin.</span>
                </div>
                <button
                  onClick={() => handleSaveFormula('RESIN')}
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-blue-600 hover:bg-blue-700 transition flex items-center gap-1.5 shadow-md shadow-blue-500/20 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  <span>{currentUser ? 'Save as Formula' : 'Save Recipe (Join Free)'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: PERFUME DILUTION */}
          {activeTool === 'PERFUME' && (
            <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/60 border border-slate-800 shadow-xl space-y-8">
              <div>
                <h2 className="text-xl font-black text-white">Perfume Dilution &amp; Concentration Calculator</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Accurately blend fragrance oil compounds with 96% perfumer's ethanol. Calculate exact volume ratios and weight measurements for commercial bottling.
                </p>
              </div>

              {/* Bottle Sizes */}
              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-300">Target Flacon / Bottle Size</label>
                <div className="flex flex-wrap gap-2">
                  {[10, 30, 50, 100].map((size) => (
                    <button
                      key={size}
                      onClick={() => setPerfumeBottleMl(size)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold border transition ${
                        perfumeBottleMl === size
                          ? 'bg-blue-600 border-blue-500 text-white'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {size} ml
                    </button>
                  ))}
                </div>
              </div>

              {/* Concentration Standards */}
              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-300">Concentration Tier</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {[
                    { id: 'EXTRAIT', name: 'Extrait de Parfum', pct: '25%', longevity: '6–8+ hours' },
                    { id: 'EDP', name: 'Eau de Parfum (EDP)', pct: '18%', longevity: '4–6 hours' },
                    { id: 'EDT', name: 'Eau de Toilette (EDT)', pct: '10%', longevity: '2–4 hours' },
                    { id: 'EDC', name: 'Eau de Cologne (EDC)', pct: '4%', longevity: '1–2 hours' },
                  ].map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setPerfumeConcentration(c.id as any)}
                      className={`p-3.5 rounded-2xl border text-left transition ${
                        perfumeConcentration === c.id
                          ? 'bg-blue-600/15 border-blue-500 text-blue-400'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs">{c.name}</span>
                        <span className="font-extrabold text-xs text-white">{c.pct}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">Longevity: {c.longevity}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Formulation Output */}
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Mixing Proportions for {perfumeBottleMl}ml Flacon
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="block text-[11px] text-slate-400">Fragrance Oil Concentrate</span>
                    <span className="block text-2xl font-black text-amber-400 mt-1">{fragranceVolMl.toFixed(1)} ml</span>
                    <span className="text-[10px] text-slate-500">Weight: {fragranceWeightG.toFixed(1)}g (0.95 density)</span>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="block text-[11px] text-slate-400">Perfumer's Alcohol (96% Ethanol)</span>
                    <span className="block text-2xl font-black text-blue-400 mt-1">{alcoholVolMl.toFixed(1)} ml</span>
                    <span className="text-[10px] text-slate-500">Weight: {alcoholWeightG.toFixed(1)}g (0.80 density)</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 text-xs text-slate-400 space-y-1">
                  <div className="font-bold text-slate-200">Maceration Best Practice:</div>
                  <p>
                    Seal mixed formulation in amber glass and store in a cool, dark cupboard (18–20°C) for 3 to 6 weeks. Maceration softens harsh ethanol top-notes and allows base accord molecules to coalesce.
                  </p>
                </div>
              </div>

              {/* Save Recipe CTA */}
              <div className="flex items-center justify-end pt-2">
                <button
                  onClick={() => handleSaveFormula('PERFUME')}
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-blue-600 hover:bg-blue-700 transition flex items-center gap-1.5 shadow-md shadow-blue-500/20 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  <span>{currentUser ? 'Save as Formula' : 'Save Recipe (Join Free)'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: 3D PRINT COSTING */}
          {activeTool === '3D_PRINT' && (
            <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/60 border border-slate-800 shadow-xl space-y-8">
              <div>
                <h2 className="text-xl font-black text-white">3D Print Filament &amp; Electricity Costing Calculator</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Accurately calculate your true Cost of Goods Sold (COGS). Accounts for sliced gram weight, purge waste buffers, printer power draw (kWh), and target gross profit margins.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Part Sliced Weight (grams)</label>
                  <input
                    type="number"
                    min="1"
                    value={partWeightG}
                    onChange={(e) => setPartWeightG(Math.max(1, parseFloat(e.target.value) || 0))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Spool Cost (₪ or $ per kg)</label>
                  <input
                    type="number"
                    min="1"
                    value={spoolCost}
                    onChange={(e) => setSpoolCost(Math.max(1, parseFloat(e.target.value) || 0))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Print Hours</label>
                  <input
                    type="number"
                    min="0"
                    value={printHours}
                    onChange={(e) => setPrintHours(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Print Minutes</label>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={printMinutes}
                    onChange={(e) => setPrintMinutes(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Machine Power (W)</label>
                  <input
                    type="number"
                    min="20"
                    value={printerWatts}
                    onChange={(e) => setPrinterWatts(Math.max(20, parseInt(e.target.value, 10) || 150))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Margin Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                  <span>Target Gross Margin</span>
                  <span className="text-blue-400">{targetMarginPct}%</span>
                </div>
                <input
                  type="range"
                  min="30"
                  max="90"
                  step="5"
                  value={targetMarginPct}
                  onChange={(e) => setTargetMarginPct(parseInt(e.target.value, 10))}
                  className="w-full h-2 rounded-lg bg-slate-800 accent-blue-600 cursor-pointer"
                />
              </div>

              {/* Cost & Price Output */}
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Unit Economics Breakdown</span>
                  <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl text-xs font-bold">
                    {(['USD', 'EUR', 'ILS', 'GBP'] as Currency[]).map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setCurrency(c)}
                        className={`px-2 py-0.5 rounded-lg transition ${
                          currency === c
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="block text-[10px] text-slate-400">Filament Cost</span>
                    <span className="block text-lg font-bold text-white mt-1">{formatCurrency(filamentCost, currency)}</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="block text-[10px] text-slate-400">Power ({kwhConsumed.toFixed(2)} kWh)</span>
                    <span className="block text-lg font-bold text-white mt-1">{formatCurrency(powerCost, currency)}</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="block text-[10px] text-slate-400">Total Unit COGS</span>
                    <span className="block text-lg font-black text-rose-400 mt-1">{formatCurrency(totalMfgCost, currency)}</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-blue-950/40 border border-blue-800/80">
                    <span className="block text-[10px] text-blue-300">Suggested Retail</span>
                    <span className="block text-lg font-black text-blue-400 mt-1">{formatCurrency(suggestedPrice, currency)}</span>
                  </div>
                </div>
              </div>

              {/* Save Recipe CTA */}
              <div className="flex items-center justify-end pt-2">
                <button
                  onClick={() => handleSaveFormula('3D_PRINT')}
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-blue-600 hover:bg-blue-700 transition flex items-center gap-1.5 shadow-md shadow-blue-500/20 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  <span>{currentUser ? 'Save as Formula' : 'Save Recipe (Join Free)'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ==================================================================== */}
      {/* 6. EDUCATIONAL & SEO GUIDE SECTION                                   */}
      {/* ==================================================================== */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 border-t border-slate-900 bg-slate-950/40">
        <div className="max-w-4xl mx-auto space-y-10">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-black text-white">Why Precise Workshop Calculations Matter</h2>
            <p className="text-xs text-slate-400 max-w-xl mx-auto">
              Whether you are casting silicone, blending fine fragrances, or 3D printing batch prototypes, guesswork leads to wasted material, sticky resins, and inaccurate retail pricing.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-slate-300 leading-relaxed">
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
              <div className="font-bold text-white flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-amber-400" />
                <span>Epoxy Thermal Runaway</span>
              </div>
              <p>
                Thermoset epoxy curing is exothermic: the chemical reaction generates heat, which accelerates curing, generating even more heat. In pours deeper than 2.5cm, core temperatures can exceed 150°C, cracking silicone molds and yellowing resin.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
              <div className="font-bold text-white flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-blue-400" />
                <span>Perfume Maceration Science</span>
              </div>
              <p>
                Ethanol alcohol bonds with volatile aroma chemicals through esterification over time. Rushing bottling without 3-6 weeks of dark amber glass maceration leaves a sharp, synthetic alcohol blast on first spray.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
              <div className="font-bold text-white flex items-center gap-1.5">
                <Award className="w-4 h-4 text-emerald-400" />
                <span>True 3D Print Economics</span>
              </div>
              <p>
                Most hobbyists price prints solely based on raw grams used. Factoring in purge towers, support failures (5%), heated bed electricity draw (150W), and target gross margins ensures your workshop operates sustainably.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* 7. FOOTER                                                            */}
      {/* ==================================================================== */}
      <footer className="border-t border-slate-900 py-10 px-4 sm:px-6 lg:px-8 bg-slate-950 text-xs text-slate-500 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xs">
              W
            </div>
            <span className="font-extrabold text-slate-300">Workbench</span>
            <span>&bull; The RPG Operating System for Makers</span>
          </div>

          <div className="flex items-center gap-5">
            <Link href="/" className="hover:text-slate-300 transition">
              Home
            </Link>
            <Link href="/community" className="hover:text-slate-300 transition">
              Community
            </Link>
            <Link href="/login" className="hover:text-slate-300 transition">
              Sign In
            </Link>
            <Link href="/signup" className="hover:text-slate-300 transition text-blue-400 font-bold">
              Join Free
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
