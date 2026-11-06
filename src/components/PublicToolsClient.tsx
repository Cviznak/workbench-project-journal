'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency } from '@/lib/utils';
import { getPreferredCurrency } from '@/lib/currency';
import { useTranslation } from '@/lib/i18n';
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
  Grid,
  Cpu,
  Zap,
} from 'lucide-react';
import {
  calculateResistorBands,
  findNearestE12,
  formatOhms,
  recommendWattage,
  BAND_COLORS,
  MULTIPLIER_COLORS,
} from '@/lib/electronicsUtils';

export type ToolType = 'RESIN' | 'PERFUME' | '3D_PRINT' | 'CROSS_STITCH' | 'CANDLE' | 'LASER_CUT' | 'ELECTRONICS';

export function slugToTool(slug?: string | null): ToolType {
  if (!slug) return 'RESIN';
  const norm = slug.toLowerCase().trim();
  if (norm === 'perfume') return 'PERFUME';
  if (norm === '3dprint' || norm === '3d_print') return '3D_PRINT';
  if (norm === 'crossstitch' || norm === 'cross-stitch' || norm === 'stitch') return 'CROSS_STITCH';
  if (norm === 'candle' || norm === 'soap') return 'CANDLE';
  if (norm === 'lasercut' || norm === 'laser' || norm === 'cnc') return 'LASER_CUT';
  if (norm === 'electronics' || norm === 'led' || norm === 'resistor' || norm === 'battery') return 'ELECTRONICS';
  return 'RESIN';
}

export function toolToSlug(tool: ToolType): string {
  switch (tool) {
    case 'RESIN':
      return 'resin';
    case 'PERFUME':
      return 'perfume';
    case '3D_PRINT':
      return '3dprint';
    case 'CROSS_STITCH':
      return 'crossstitch';
    case 'CANDLE':
      return 'candle';
    case 'LASER_CUT':
      return 'lasercut';
    case 'ELECTRONICS':
      return 'electronics';
  }
}

interface PublicToolsClientProps {
  currentUser: any;
  currentProfile: any;
  initialTool?: string;
}

export default function PublicToolsClient({
  currentUser,
  currentProfile,
  initialTool,
}: PublicToolsClientProps) {
  const router = useRouter();
  const supabase = createClient();
  const { t } = useTranslation();

  const [activeTool, setActiveTool] = useState<ToolType>(() => {
    if (initialTool) return slugToTool(initialTool);
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const toolParam = params.get('tool');
      if (toolParam) return slugToTool(toolParam);
    }
    return 'RESIN';
  });

  const handleSelectTool = (tool: ToolType) => {
    setActiveTool(tool);
    setSaveStatus(null);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('tool', toolToSlug(tool));
      window.history.replaceState(null, '', url.toString());
    }
  };

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

  // 4. Cross-Stitch & Fabric State
  const [stitchWidth, setStitchWidth] = useState<number>(140);
  const [stitchHeight, setStitchHeight] = useState<number>(100);
  const [stitchAidaCount, setStitchAidaCount] = useState<number>(14);
  const [stitchBorderMarginCm, setStitchBorderMarginCm] = useState<number>(5);
  const [stitchStrands, setStitchStrands] = useState<number>(2);

  // 5. Candle & Soap Batch State
  const [candleWaterWeight, setCandleWaterWeight] = useState<number>(200);
  const [candleUnits, setCandleUnits] = useState<number>(1);
  const [candleWaxType, setCandleWaxType] = useState<'SOY' | 'PARAFFIN' | 'BEESWAX' | 'SOAP_BASE'>('SOY');
  const [candleFragrancePct, setCandleFragrancePct] = useState<number>(8);
  const [candleWaxPricePerKg, setCandleWaxPricePerKg] = useState<number>(45);
  const [candleFragrancePricePer100g, setCandleFragrancePricePer100g] = useState<number>(35);
  const [candlePackagingPerUnit, setCandlePackagingPerUnit] = useState<number>(5);

  // 6. Laser Cut / CNC Sheet Nesting State
  const [laserSheetWidthMm, setLaserSheetWidthMm] = useState<number>(600);
  const [laserSheetHeightMm, setLaserSheetHeightMm] = useState<number>(400);
  const [laserSheetCost, setLaserSheetCost] = useState<number>(45);
  const [laserPartWidthMm, setLaserPartWidthMm] = useState<number>(80);
  const [laserPartHeightMm, setLaserPartHeightMm] = useState<number>(50);
  const [laserKerfMm, setLaserKerfMm] = useState<number>(2);
  const [laserCutMinutes, setLaserCutMinutes] = useState<number>(12);
  const [laserHourlyRate, setLaserHourlyRate] = useState<number>(30);
  const [laserMachineWatts, setLaserMachineWatts] = useState<number>(450);
  const [laserKwhRate, setLaserKwhRate] = useState<number>(0.65);
  const [laserMarginPct, setLaserMarginPct] = useState<number>(60);

  // 7. Electronics & LED / Battery State
  const [elecMode, setElecMode] = useState<'LED_RESISTOR' | 'BATTERY_RUNTIME'>('LED_RESISTOR');
  const [elecSupplyV, setElecSupplyV] = useState<number>(5.0);
  const [elecLedVf, setElecLedVf] = useState<number>(2.0);
  const [elecLedCurrentMa, setElecLedCurrentMa] = useState<number>(20);
  const [elecLedCount, setElecLedCount] = useState<number>(1);
  const [elecBatteryMah, setElecBatteryMah] = useState<number>(2500);
  const [elecBatteryV, setElecBatteryV] = useState<number>(3.7);
  const [elecLoadCurrentMa, setElecLoadCurrentMa] = useState<number>(150);
  const [elecEfficiencyPct, setElecEfficiencyPct] = useState<number>(85);

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

  // Calculations: Cross-Stitch
  const stitchW = Math.max(1, Number(stitchWidth) || 1);
  const stitchH = Math.max(1, Number(stitchHeight) || 1);
  const aidaCt = Math.max(1, Number(stitchAidaCount) || 14);
  const marginCm = Math.max(0, Number(stitchBorderMarginCm) || 0);

  const designWidthIn = stitchW / aidaCt;
  const designHeightIn = stitchH / aidaCt;
  const designWidthCm = designWidthIn * 2.54;
  const designHeightCm = designHeightIn * 2.54;

  const cutWidthCm = designWidthCm + 2 * marginCm;
  const cutHeightCm = designHeightCm + 2 * marginCm;
  const cutWidthIn = cutWidthCm / 2.54;
  const cutHeightIn = cutHeightCm / 2.54;

  const totalStitches = stitchW * stitchH;
  const cmPerStitch = (14 / aidaCt) * 2.2;
  const singleStrandMeters = (totalStitches * cmPerStitch * stitchStrands) / 100;
  const dmcSkeinsEstimated = Math.ceil(((singleStrandMeters * 1.15) / 48) * 10) / 10;
  const tapestryNeedle =
    aidaCt <= 11
      ? 'Size 22 Tapestry'
      : aidaCt <= 14
      ? 'Size 24 Tapestry'
      : aidaCt <= 18
      ? 'Size 26 Tapestry'
      : 'Size 28 Tapestry';

  // Calculations: Candle & Soap
  const waterWeight = Math.max(1, Number(candleWaterWeight) || 200);
  const units = Math.max(1, Number(candleUnits) || 1);
  const foPct = Math.max(1, Number(candleFragrancePct) || 8);

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

  const singleFillWeight = waterWeight * waxDensity;
  const totalBatchFillWeight = singleFillWeight * units;
  const totalWaxGrams = totalBatchFillWeight / (1 + foPct / 100);
  const totalFragranceGrams = totalWaxGrams * (foPct / 100);

  const waxPerUnitGrams = totalWaxGrams / units;
  const fragrancePerUnitGrams = totalFragranceGrams / units;

  const waxCost = (totalWaxGrams / 1000) * (Number(candleWaxPricePerKg) || 45);
  const fragranceCost = (totalFragranceGrams / 100) * (Number(candleFragrancePricePer100g) || 35);
  const packagingCost = units * (Number(candlePackagingPerUnit) || 5);
  const totalBatchCost = waxCost + fragranceCost + packagingCost;
  const unitCOGS = totalBatchCost / units;
  const suggestedRetail = unitCOGS / (1 - 0.65);

  // Calculations: Laser Cut & CNC Nesting
  const sheetW = Math.max(10, Number(laserSheetWidthMm) || 600);
  const sheetH = Math.max(10, Number(laserSheetHeightMm) || 400);
  const partW = Math.max(5, Number(laserPartWidthMm) || 80);
  const partH = Math.max(5, Number(laserPartHeightMm) || 50);
  const kerf = Math.max(0, Number(laserKerfMm) || 2);

  const cols = Math.max(1, Math.floor((sheetW + kerf) / (partW + kerf)));
  const rows = Math.max(1, Math.floor((sheetH + kerf) / (partH + kerf)));
  const totalPartsYield = cols * rows;

  const sheetAreaMm2 = sheetW * sheetH;
  const partsAreaMm2 = totalPartsYield * (partW * partH);
  const nestingUtilizationPct = Math.min(100, (partsAreaMm2 / sheetAreaMm2) * 100);

  const rawSheetCost = Math.max(0, Number(laserSheetCost) || 0);
  const materialCostPerPart = totalPartsYield > 0 ? rawSheetCost / totalPartsYield : 0;

  const cutMin = Math.max(0, Number(laserCutMinutes) || 0);
  const machineHourRate = Math.max(0, Number(laserHourlyRate) || 0);
  const machineRunCost = (cutMin / 60) * machineHourRate;

  const powerKwh = ((Number(laserMachineWatts) || 450) / 1000) * (cutMin / 60);
  const electricityCost = powerKwh * (Number(laserKwhRate) || 0.65);

  const laserPartCOGS = materialCostPerPart + machineRunCost + electricityCost;
  const laserMargin = Math.min(95, Math.max(5, Number(laserMarginPct) || 60));
  const laserSuggestedRetail = laserPartCOGS / (1 - laserMargin / 100);
  const laserProfitPerPart = laserSuggestedRetail - laserPartCOGS;
  const totalSheetRevenue = laserSuggestedRetail * totalPartsYield;

  // Calculations: Electronics & LED / Battery
  const supplyV = Math.max(0, Number(elecSupplyV) || 0);
  const ledVf = Math.max(0, Number(elecLedVf) || 0);
  const ledMa = Math.max(0.1, Number(elecLedCurrentMa) || 20);
  const ledCount = Math.max(1, Number(elecLedCount) || 1);

  const totalLedVf = ledVf * ledCount;
  const voltageDropAcrossResistor = Math.max(0, supplyV - totalLedVf);
  const idealResistanceOhms = voltageDropAcrossResistor > 0 ? voltageDropAcrossResistor / (ledMa / 1000) : 0;
  const nearestE12Ohms = findNearestE12(idealResistanceOhms);
  const actualCurrentMa = nearestE12Ohms > 0 ? (voltageDropAcrossResistor / nearestE12Ohms) * 1000 : 0;
  const resistorPowerWatts = voltageDropAcrossResistor * (actualCurrentMa / 1000);
  const recommendedResistorWattage = recommendWattage(resistorPowerWatts);
  const resistorBands = calculateResistorBands(nearestE12Ohms);
  const isVoltageInsufficient = supplyV <= totalLedVf && supplyV > 0;

  const batteryMah = Math.max(1, Number(elecBatteryMah) || 1);
  const batteryV = Math.max(0.1, Number(elecBatteryV) || 3.7);
  const loadMa = Math.max(0.1, Number(elecLoadCurrentMa) || 1);
  const effPct = Math.min(100, Math.max(10, Number(elecEfficiencyPct) || 85));

  const batteryWh = (batteryMah * batteryV) / 1000;
  const loadWatts = (batteryV * loadMa) / 1000;
  const effectiveMah = batteryMah * (effPct / 100);
  const runtimeHours = effectiveMah / loadMa;
  const runtimeDays = runtimeHours / 24;

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
    } else if (toolName === '3D_PRINT') {
      title = `3D Print: ${printMaterial} (${partWeightG}g, ${printHours}h${printMinutes}m)`;
      category = '3D Printing';
      instructions = `3D Printing Cost Sheet (${printMaterial}):\n- Sliced Weight: ${partWeightG}g (Spool: ${formatCurrency(spoolCost, currency)}/kg)\n- Print Duration: ${printHours}h ${printMinutes}m\n- Machine Power: ${printerWatts}W (${kwhConsumed.toFixed(2)} kWh)\n- Filament Cost: ${formatCurrency(filamentCost, currency)}\n- Electricity Cost: ${formatCurrency(powerCost, currency)}\n- Base Unit Cost: ${formatCurrency(totalMfgCost, currency)}\n- Target Retail Price (${targetMarginPct}% margin): ${formatCurrency(suggestedPrice, currency)}`;
    } else if (toolName === 'CROSS_STITCH') {
      title = `Cross-Stitch Fabric & Skein Plan (${stitchW}x${stitchH} on ${aidaCt}ct)`;
      category = 'Cross-Stitch & Textiles';
      instructions = `Cross-Stitch Dimensions & Sizing:\n- Design Stitches: ${stitchW} W x ${stitchH} H (${totalStitches.toLocaleString()} stitches)\n- Aida Fabric Count: ${aidaCt}ct (${stitchStrands} strands)\n- Stitched Area: ${designWidthCm.toFixed(1)} x ${designHeightCm.toFixed(1)} cm (${designWidthIn.toFixed(1)}" x ${designHeightIn.toFixed(1)}")\n- Cut Fabric Size (+${marginCm}cm border): ${cutWidthCm.toFixed(1)} x ${cutHeightCm.toFixed(1)} cm (${cutWidthIn.toFixed(1)}" x ${cutHeightIn.toFixed(1)}")\n- Recommended Needle: ${tapestryNeedle}\n- Estimated Floss Needed: ~${dmcSkeinsEstimated} DMC 8m skeins (~${singleStrandMeters.toFixed(0)}m single strand with 15% buffer).`;
    } else if (toolName === 'CANDLE') {
      title = `Candle/Soap Batch (${units}x ${waterWeight}ml @ ${foPct}% FO)`;
      category = 'Candles & Soap';
      instructions = `Batch Formulation (${baseName}):\n- Units: ${units} containers (${waterWeight}ml water capacity each)\n- Fragrance Load: ${foPct}%\n- Base/Wax Weight: ${totalWaxGrams.toFixed(1)}g (${waxPerUnitGrams.toFixed(1)}g / unit)\n- Fragrance Oil: ${totalFragranceGrams.toFixed(1)}g (${fragrancePerUnitGrams.toFixed(1)}g / unit)\n- Total Batch Weight: ${totalBatchFillWeight.toFixed(1)}g\n\nPouring Instructions:\n1. Heat wax/base to 85°C (185°F).\n2. Remove from heat and stir in fragrance oil at 80°C (176°F) for 2 continuous minutes.\n3. Pour slowly at 57-60°C (135-140°F) into preheated vessels with centered wicks.\n4. Cure for 10-14 days before test burning.`;
    } else if (toolName === 'LASER_CUT') {
      title = `Laser Cut: Sheet Nesting (${totalPartsYield}x ${partW}x${partH}mm)`;
      category = 'Laser Cutting & CNC';
      instructions = `Laser / CNC Sheet Nesting & Machine Cost Sheet:\n- Raw Sheet: ${sheetW} x ${sheetH} mm (${formatCurrency(rawSheetCost, currency)})\n- Part Dimensions: ${partW} x ${partH} mm (Kerf & Spacing: ${kerf} mm)\n- Grid Yield: ${cols} cols x ${rows} rows = ${totalPartsYield} parts per sheet (${nestingUtilizationPct.toFixed(1)}% area efficiency)\n- Cut Duration: ${cutMin} minutes per sheet\n- Machine Overhead: ${formatCurrency(machineRunCost, currency)} (${formatCurrency(machineHourRate, currency)}/hr rate)\n- Electricity Consumed: ${powerKwh.toFixed(3)} kWh (${formatCurrency(electricityCost, currency)})\n- Material Cost / Part: ${formatCurrency(materialCostPerPart, currency)}\n- Base Unit COGS: ${formatCurrency(laserPartCOGS, currency)}\n- Target Retail Price (${laserMargin}% margin): ${formatCurrency(laserSuggestedRetail, currency)} (${formatCurrency(laserProfitPerPart, currency)} net profit/part)\n- Full Sheet Gross Revenue: ${formatCurrency(totalSheetRevenue, currency)}`;
    } else if (toolName === 'ELECTRONICS') {
      if (elecMode === 'LED_RESISTOR') {
        const band1Name = BAND_COLORS[resistorBands.digit1]?.name || 'Band 1';
        const band2Name = BAND_COLORS[resistorBands.digit2]?.name || 'Band 2';
        const multName = MULTIPLIER_COLORS[resistorBands.multiplierPow]?.name || 'Multiplier';
        title = `LED Resistor Formula (${supplyV}V -> ${ledCount}x ${ledVf}V @ ${ledMa}mA)`;
        category = 'Electronics & Hardware';
        instructions = `LED Resistor & Current Limiter Specifications:\n- Supply Voltage: ${supplyV}V\n- Forward Voltage Drop: ${totalLedVf.toFixed(2)}V (${ledCount}x ${ledVf}V LEDs in series)\n- Target LED Current: ${ledMa}mA\n- Ideal Resistance: ${idealResistanceOhms.toFixed(1)} Ω\n- Nearest Standard E12 Resistor: ${formatOhms(nearestE12Ohms)} (Color Bands: ${band1Name} - ${band2Name} - ${multName} - Gold)\n- Actual Operating Current: ${actualCurrentMa.toFixed(1)}mA\n- Resistor Power Dissipation: ${resistorPowerWatts < 1 ? `${Math.round(resistorPowerWatts * 1000)}mW` : `${resistorPowerWatts.toFixed(2)}W`}\n- Recommended Resistor Rating: ${recommendedResistorWattage} or higher rating.`;
      } else {
        title = `Battery Runtime Plan (${batteryMah}mAh @ ${loadMa}mA Load)`;
        category = 'Electronics & Hardware';
        instructions = `Battery Capacity & Runtime Estimation:\n- Battery Spec: ${batteryMah}mAh @ ${batteryV}V (${batteryWh.toFixed(2)} Wh energy storage)\n- Load Current Draw: ${loadMa}mA (~${(loadWatts * 1000).toFixed(1)}mW continuous)\n- Circuit Efficiency: ${effPct}%\n- Effective Usable Capacity: ${Math.round(effectiveMah)}mAh\n- Estimated Continuous Runtime: ${runtimeHours < 24 ? `${runtimeHours.toFixed(1)} hours` : `${runtimeHours.toFixed(1)} hours (~${runtimeDays.toFixed(1)} days)`}.`;
      }
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
            {t('tools.title')}
          </h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            {t('tools.subtitle')}
          </p>
        </div>

        {/* ================================================================== */}
        {/* 4. TOOL SELECTOR TABS                                              */}
        {/* ================================================================== */}
        <div className="mt-8 flex items-center justify-center">
          <div className="flex flex-wrap items-center justify-center gap-1 p-1.5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md">
            <button
              onClick={() => handleSelectTool('RESIN')}
              className={`flex items-center gap-2 px-3.5 sm:px-5 py-2.5 rounded-xl text-xs font-bold transition ${
                activeTool === 'RESIN'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FlaskConical className="w-4 h-4" />
              <span>{t('tools.tab_resin')}</span>
            </button>
            <button
              onClick={() => handleSelectTool('PERFUME')}
              className={`flex items-center gap-2 px-3.5 sm:px-5 py-2.5 rounded-xl text-xs font-bold transition ${
                activeTool === 'PERFUME'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>{t('tools.tab_perfume')}</span>
            </button>
            <button
              onClick={() => handleSelectTool('3D_PRINT')}
              className={`flex items-center gap-2 px-3.5 sm:px-5 py-2.5 rounded-xl text-xs font-bold transition ${
                activeTool === '3D_PRINT'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Printer className="w-4 h-4" />
              <span>{t('tools.tab_3dprint')}</span>
            </button>
            <button
              onClick={() => handleSelectTool('CROSS_STITCH')}
              className={`flex items-center gap-2 px-3.5 sm:px-5 py-2.5 rounded-xl text-xs font-bold transition ${
                activeTool === 'CROSS_STITCH'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Grid className="w-4 h-4" />
              <span>{t('tools.tab_crossstitch')}</span>
            </button>
            <button
              onClick={() => handleSelectTool('CANDLE')}
              className={`flex items-center gap-2 px-3.5 sm:px-5 py-2.5 rounded-xl text-xs font-bold transition ${
                activeTool === 'CANDLE'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Flame className="w-4 h-4" />
              <span>{t('tools.tab_candle')}</span>
            </button>
            <button
              onClick={() => handleSelectTool('LASER_CUT')}
              className={`flex items-center gap-2 px-3.5 sm:px-5 py-2.5 rounded-xl text-xs font-bold transition ${
                activeTool === 'LASER_CUT'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>{t('tools.tab_lasercut')}</span>
            </button>
            <button
              onClick={() => handleSelectTool('ELECTRONICS')}
              className={`flex items-center gap-2 px-3.5 sm:px-5 py-2.5 rounded-xl text-xs font-bold transition ${
                activeTool === 'ELECTRONICS'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Cpu className="w-4 h-4" />
              <span>{t('tools.tab_electronics')}</span>
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

          {/* ============================================================== */}
          {/* TOOL 4: CROSS-STITCH & FABRIC CALCULATOR                       */}
          {/* ============================================================== */}
          {activeTool === 'CROSS_STITCH' && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Grid className="w-5 h-5 text-indigo-400" />
                    <span>Cross-Stitch &amp; Pixel Art Fabric Calculator</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Calculate exact finished design dimensions, framing cut sizes, and DMC embroidery skein requirements.
                  </p>
                </div>
                <span className="hidden sm:inline-block px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  {aidaCt} Count Aida
                </span>
              </div>

              {/* Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Design Width (Stitches)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={stitchWidth}
                    onChange={(e) => setStitchWidth(Math.max(1, parseInt(e.target.value, 10) || 0))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs outline-none focus:border-blue-500 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Design Height (Stitches)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={stitchHeight}
                    onChange={(e) => setStitchHeight(Math.max(1, parseInt(e.target.value, 10) || 0))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs outline-none focus:border-blue-500 font-bold"
                  />
                </div>
              </div>

              {/* Aida Presets */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">
                  Fabric / Aida Count (Stitches per Inch)
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {[11, 14, 16, 18, 22].map((ct) => (
                    <button
                      key={ct}
                      type="button"
                      onClick={() => setStitchAidaCount(ct)}
                      className={`py-2 rounded-xl text-xs font-bold transition border ${
                        stitchAidaCount === ct
                          ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-500/20'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                      }`}
                    >
                      {ct} ct
                    </button>
                  ))}
                </div>
              </div>

              {/* Margin & Strands */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Framing Margin (cm on each side)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={stitchBorderMarginCm}
                    onChange={(e) => setStitchBorderMarginCm(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs outline-none focus:border-blue-500 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Floss Strands per Stitch
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[1, 2, 3, 4].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setStitchStrands(s)}
                        className={`py-2 rounded-xl text-xs font-bold transition border ${
                          stitchStrands === s
                            ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-500/20'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {s} {s === 2 ? '(Std)' : ''}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Output Display */}
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Required Fabric Cut Size
                  </span>
                  <span className="text-xl font-black text-indigo-400">
                    {cutWidthCm.toFixed(1)} × {cutHeightCm.toFixed(1)} cm ({cutWidthIn.toFixed(1)}" × {cutHeightIn.toFixed(1)}")
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="block text-[10px] text-slate-400">Stitched Area</span>
                    <span className="block text-sm font-bold text-white mt-1">
                      {designWidthCm.toFixed(1)} × {designHeightCm.toFixed(1)} cm
                    </span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="block text-[10px] text-slate-400">Total Stitches</span>
                    <span className="block text-sm font-bold text-white mt-1">
                      {totalStitches.toLocaleString()}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="block text-[10px] text-slate-400">DMC 8m Skeins</span>
                    <span className="block text-sm font-bold text-emerald-400 mt-1">
                      ~{dmcSkeinsEstimated} skeins
                    </span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-800/80">
                    <span className="block text-[10px] text-indigo-300">Needle Rec.</span>
                    <span className="block text-sm font-bold text-indigo-400 mt-1">
                      {tapestryNeedle}
                    </span>
                  </div>
                </div>
              </div>

              {/* Save Recipe CTA */}
              <div className="flex items-center justify-end pt-2">
                <button
                  onClick={() => handleSaveFormula('CROSS_STITCH')}
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-blue-600 hover:bg-blue-700 transition flex items-center gap-1.5 shadow-md shadow-blue-500/20 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  <span>{currentUser ? 'Save as Formula' : 'Save Recipe (Join Free)'}</span>
                </button>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TOOL 5: CANDLE & SOAP BATCH CALCULATOR                         */}
          {/* ============================================================== */}
          {activeTool === 'CANDLE' && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Flame className="w-5 h-5 text-amber-400" />
                    <span>Candle &amp; Soap Batch Formulation Calculator</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Calculate exact wax grams, fragrance load percentages, container displacement, and all-in batch costing.
                  </p>
                </div>
                <span className="hidden sm:inline-block px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  {baseName}
                </span>
              </div>

              {/* Base Selection */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">
                  Base Wax / Soap Type
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
                      className={`py-2 px-2 text-center rounded-xl text-xs font-bold transition border ${
                        candleWaxType === b.id
                          ? 'bg-amber-600 text-white border-amber-500 shadow-md shadow-amber-500/20'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Vessel Capacity, Count & Fragrance Slider */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Vessel Water Capacity (ml/g)
                  </label>
                  <input
                    type="number"
                    min="10"
                    value={candleWaterWeight}
                    onChange={(e) => setCandleWaterWeight(Math.max(1, parseFloat(e.target.value) || 0))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs outline-none focus:border-amber-500 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Container Count (Units)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={candleUnits}
                    onChange={(e) => setCandleUnits(Math.max(1, parseInt(e.target.value, 10) || 0))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs outline-none focus:border-amber-500 font-bold"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 mb-1">
                    <span>Fragrance Load</span>
                    <span className="text-amber-400 font-bold">{foPct}%</span>
                  </div>
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

              {/* Pricing inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-800">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Wax Cost / kg ({currency})
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={candleWaxPricePerKg}
                    onChange={(e) => setCandleWaxPricePerKg(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs outline-none focus:border-amber-500 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Fragrance Oil / 100g ({currency})
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={candleFragrancePricePer100g}
                    onChange={(e) => setCandleFragrancePricePer100g(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs outline-none focus:border-amber-500 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Vessel &amp; Wick / unit ({currency})
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={candlePackagingPerUnit}
                    onChange={(e) => setCandlePackagingPerUnit(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs outline-none focus:border-amber-500 font-bold"
                  />
                </div>
              </div>

              {/* Output Display */}
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Total Batch Weight
                  </span>
                  <span className="text-xl font-black text-amber-400">
                    {totalBatchFillWeight.toFixed(1)} g ({((totalBatchFillWeight) / 28.3495).toFixed(1)} oz)
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="block text-[10px] text-slate-400">Base Wax Needed</span>
                    <span className="block text-sm font-bold text-white mt-1">
                      {totalWaxGrams.toFixed(1)}g ({waxPerUnitGrams.toFixed(1)}g/ea)
                    </span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="block text-[10px] text-slate-400">Fragrance Oil ({foPct}%)</span>
                    <span className="block text-sm font-bold text-amber-400 mt-1">
                      {totalFragranceGrams.toFixed(1)}g ({fragrancePerUnitGrams.toFixed(1)}g/ea)
                    </span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="block text-[10px] text-slate-400">Unit COGS</span>
                    <span className="block text-sm font-bold text-rose-400 mt-1">
                      {formatCurrency(unitCOGS, currency)}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-800/80">
                    <span className="block text-[10px] text-amber-300">Target Retail (65%)</span>
                    <span className="block text-sm font-bold text-amber-400 mt-1">
                      {formatCurrency(suggestedRetail, currency)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Save Recipe CTA */}
              <div className="flex items-center justify-end pt-2">
                <button
                  onClick={() => handleSaveFormula('CANDLE')}
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-amber-600 hover:bg-amber-700 transition flex items-center gap-1.5 shadow-md shadow-amber-500/20 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  <span>{currentUser ? 'Save as Formula' : 'Save Recipe (Join Free)'}</span>
                </button>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TOOL 6: LASER CUT / CNC SHEET NESTING ESTIMATOR               */}
          {/* ============================================================== */}
          {activeTool === 'LASER_CUT' && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Layers className="w-5 h-5 text-cyan-400" />
                    <span>Laser Cut &amp; CNC Sheet Nesting Cost Estimator</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Calculate sheet parts yield, kerf-aware grid nesting, machine run time overhead, electricity, and per-part unit COGS.
                  </p>
                </div>
                <span className="hidden sm:inline-block px-3 py-1 rounded-full text-[10px] font-mono uppercase bg-cyan-950 border border-cyan-800 text-cyan-400">
                  Nesting &amp; COGS
                </span>
              </div>

              {/* Input Grid: Sheet & Part Parameters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Raw Sheet Dimensions */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Sheet Width (mm)
                  </label>
                  <input
                    type="number"
                    min="10"
                    value={laserSheetWidthMm}
                    onChange={(e) => setLaserSheetWidthMm(Math.max(10, parseInt(e.target.value) || 0))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs outline-none focus:border-cyan-500 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Sheet Height (mm)
                  </label>
                  <input
                    type="number"
                    min="10"
                    value={laserSheetHeightMm}
                    onChange={(e) => setLaserSheetHeightMm(Math.max(10, parseInt(e.target.value) || 0))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs outline-none focus:border-cyan-500 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Raw Sheet Cost ({currency})
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={laserSheetCost}
                    onChange={(e) => setLaserSheetCost(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs outline-none focus:border-cyan-500 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Kerf / Spacing (mm)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={laserKerfMm}
                    onChange={(e) => setLaserKerfMm(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs outline-none focus:border-cyan-500 font-bold"
                  />
                </div>

                {/* Part Dimensions */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Part Width (mm)
                  </label>
                  <input
                    type="number"
                    min="5"
                    value={laserPartWidthMm}
                    onChange={(e) => setLaserPartWidthMm(Math.max(5, parseInt(e.target.value) || 0))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs outline-none focus:border-cyan-500 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Part Height (mm)
                  </label>
                  <input
                    type="number"
                    min="5"
                    value={laserPartHeightMm}
                    onChange={(e) => setLaserPartHeightMm(Math.max(5, parseInt(e.target.value) || 0))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs outline-none focus:border-cyan-500 font-bold"
                  />
                </div>

                {/* Machine Job & Rate */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Cut Time (Minutes)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={laserCutMinutes}
                    onChange={(e) => setLaserCutMinutes(Math.max(1, parseInt(e.target.value) || 0))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs outline-none focus:border-cyan-500 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Machine Rate ({currency}/hr)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={laserHourlyRate}
                    onChange={(e) => setLaserHourlyRate(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs outline-none focus:border-cyan-500 font-bold"
                  />
                </div>
              </div>

              {/* Output Display & Nesting Grid Visualizer */}
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                      Grid Nesting Yield
                    </span>
                    <span className="text-xl font-black text-cyan-400">
                      {totalPartsYield} parts per sheet ({cols} wide &times; {rows} tall)
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-400 block">Sheet Area Utilization</span>
                    <span className="text-sm font-extrabold text-emerald-400">
                      {nestingUtilizationPct.toFixed(1)}% efficiency
                    </span>
                  </div>
                </div>

                {/* Interactive Miniature Sheet Preview */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col items-center justify-center">
                  <div
                    className="relative bg-slate-950 border-2 border-dashed border-cyan-500/40 rounded-xl flex flex-wrap content-start overflow-hidden p-1 gap-1"
                    style={{
                      width: '100%',
                      maxWidth: '360px',
                      height: '180px',
                    }}
                  >
                    {Array.from({ length: Math.min(60, totalPartsYield) }).map((_, idx) => (
                      <div
                        key={idx}
                        className="bg-cyan-500/20 border border-cyan-400/50 rounded-sm flex items-center justify-center text-[9px] font-mono text-cyan-300"
                        style={{
                          flex: `0 0 calc(${100 / Math.min(10, cols)}% - 4px)`,
                          height: `calc(${100 / Math.min(6, rows)}% - 4px)`,
                        }}
                      >
                        {idx + 1}
                      </div>
                    ))}
                  </div>
                  <span className="text-[10px] text-slate-500 mt-2">
                    Visualizing nested parts ({sheetW}mm &times; {sheetH}mm stock with {kerf}mm kerf spacing)
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="block text-[10px] text-slate-400">Material / Part</span>
                    <span className="block text-sm font-bold text-white mt-1">
                      {formatCurrency(materialCostPerPart, currency)}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="block text-[10px] text-slate-400">Machine Run Cost</span>
                    <span className="block text-sm font-bold text-white mt-1">
                      {formatCurrency(machineRunCost, currency)}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="block text-[10px] text-slate-400">Unit COGS</span>
                    <span className="block text-sm font-bold text-rose-400 mt-1">
                      {formatCurrency(laserPartCOGS, currency)}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-cyan-950/40 border border-cyan-800/80">
                    <span className="block text-[10px] text-cyan-300">Target Retail ({laserMargin}%)</span>
                    <span className="block text-sm font-bold text-cyan-400 mt-1">
                      {formatCurrency(laserSuggestedRetail, currency)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Save Recipe CTA */}
              <div className="flex items-center justify-end pt-2">
                <button
                  onClick={() => handleSaveFormula('LASER_CUT')}
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-cyan-600 hover:bg-cyan-700 transition flex items-center gap-1.5 shadow-md shadow-cyan-500/20 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  <span>{currentUser ? 'Save as Formula' : 'Save Recipe (Join Free)'}</span>
                </button>
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* TOOL 7: ELECTRONICS & LED RESISTOR / BATTERY RUNTIME ESTIMATOR   */}
          {/* ================================================================ */}
          {activeTool === 'ELECTRONICS' && (
            <div className="space-y-6">
              {/* Mode Toggle Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900 border border-slate-800">
                <div className="flex items-center gap-2.5">
                  <Cpu className="w-5 h-5 text-indigo-400" />
                  <div>
                    <h2 className="text-base font-bold text-white">Electronics &amp; Hardware Lab</h2>
                    <p className="text-xs text-slate-400">LED Current Limiting Resistors, E12 Series &amp; Battery Runtime Calculator</p>
                  </div>
                </div>
                <div className="inline-flex p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setElecMode('LED_RESISTOR')}
                    className={`px-3.5 py-1.5 rounded-lg transition ${
                      elecMode === 'LED_RESISTOR'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    LED Resistor &amp; Ohm&apos;s Law
                  </button>
                  <button
                    type="button"
                    onClick={() => setElecMode('BATTERY_RUNTIME')}
                    className={`px-3.5 py-1.5 rounded-lg transition ${
                      elecMode === 'BATTERY_RUNTIME'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Battery Runtime &amp; Wh
                  </button>
                </div>
              </div>

              {elecMode === 'LED_RESISTOR' ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left Column: LED Inputs */}
                  <div className="space-y-4">
                    {/* Supply Voltage */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-bold text-slate-300">
                          Supply Voltage (Vs)
                        </label>
                        <div className="flex items-center gap-1">
                          {[3.3, 5.0, 9.0, 12.0, 24.0].map((v) => (
                            <button
                              key={v}
                              type="button"
                              onClick={() => setElecSupplyV(v)}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                                elecSupplyV === v
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                              }`}
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
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-semibold text-white outline-none focus:border-blue-500"
                      />
                    </div>

                    {/* LED Color Presets */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-bold text-slate-300">
                          LED Color &amp; Forward Voltage (Vf)
                        </label>
                        <span className="text-[11px] font-bold text-blue-400">
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
                            className={`py-1.5 px-2 rounded-xl text-xs font-bold transition border text-center ${
                              elecLedVf === c.vf
                                ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                                : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white'
                            }`}
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

                    {/* Current & Series Count */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-xs font-bold text-slate-300">
                            Target Current (If)
                          </label>
                          <div className="flex items-center gap-1">
                            {[10, 20, 30].map((ma) => (
                              <button
                                key={ma}
                                type="button"
                                onClick={() => setElecLedCurrentMa(ma)}
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition ${
                                  elecLedCurrentMa === ma
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-slate-950 text-slate-500 hover:text-white border border-slate-800'
                                }`}
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
                          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-semibold text-white outline-none focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1.5">
                          LEDs in Series
                        </label>
                        <div className="flex items-center gap-1.5">
                          {[1, 2, 3, 4].map((n) => (
                            <button
                              key={n}
                              type="button"
                              onClick={() => setElecLedCount(n)}
                              className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${
                                elecLedCount === n
                                  ? 'bg-blue-600 text-white shadow-sm'
                                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                              }`}
                            >
                              {n}x
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: LED Results & Resistor Graphic */}
                  <div className="space-y-4">
                    {isVoltageInsufficient ? (
                      <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-900 text-xs text-rose-300 font-semibold space-y-1">
                        <p className="font-bold flex items-center gap-1">
                          <AlertTriangle className="w-4 h-4 text-rose-400" />
                          <span>Supply Voltage Too Low</span>
                        </p>
                        <p>
                          Supply voltage ({supplyV}V) must be greater than total LED forward voltage ({totalLedVf.toFixed(1)}V for {ledCount} series LEDs).
                        </p>
                      </div>
                    ) : (
                      <>
                        {/* Resistor Value Card */}
                        <div className="p-4 rounded-2xl bg-blue-950/40 border border-blue-900/60 space-y-1">
                          <span className="text-[10px] uppercase font-bold text-blue-400">
                            Nearest Standard E12 Resistor
                          </span>
                          <div className="text-3xl font-black text-white">
                            {formatOhms(nearestE12Ohms)}
                          </div>
                          <span className="text-[11px] text-slate-400 block">
                            Exact calculated: <b>{idealResistanceOhms.toFixed(1)} Ω</b> (Drop: {voltageDropAcrossResistor.toFixed(2)}V, Actual: {actualCurrentMa.toFixed(1)}mA)
                          </span>
                        </div>

                        {/* 4-Band Resistor Color SVG */}
                        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                            4-Band Resistor Color Code (&plusmn;5% Tolerance)
                          </span>

                          <div className="py-2 flex items-center justify-center">
                            <svg viewBox="0 0 240 60" className="w-full max-w-[280px] h-14">
                              <line x1="10" y1="30" x2="50" y2="30" stroke="#64748b" strokeWidth="4" strokeLinecap="round" />
                              <line x1="190" y1="30" x2="230" y2="30" stroke="#64748b" strokeWidth="4" strokeLinecap="round" />
                              <rect x="50" y="14" width="140" height="32" rx="10" fill="#d4c5a9" stroke="#bfa980" strokeWidth="2" />
                              <rect x="75" y="14" width="10" height="32" fill={resistorBands.color1} />
                              <rect x="98" y="14" width="10" height="32" fill={resistorBands.color2} />
                              <rect x="121" y="14" width="10" height="32" fill={resistorBands.colorMult} />
                              <rect x="155" y="14" width="8" height="32" fill={resistorBands.colorTol} />
                            </svg>
                          </div>

                          <div className="grid grid-cols-4 gap-1.5 text-center text-[10px] font-bold">
                            <div className="p-1.5 rounded-lg border border-slate-800 bg-slate-950">
                              <span className="block text-slate-400">1st: {resistorBands.digit1}</span>
                              <span className="inline-block w-3 h-3 rounded-full mt-1" style={{ backgroundColor: resistorBands.color1 }} />
                            </div>
                            <div className="p-1.5 rounded-lg border border-slate-800 bg-slate-950">
                              <span className="block text-slate-400">2nd: {resistorBands.digit2}</span>
                              <span className="inline-block w-3 h-3 rounded-full mt-1" style={{ backgroundColor: resistorBands.color2 }} />
                            </div>
                            <div className="p-1.5 rounded-lg border border-slate-800 bg-slate-950">
                              <span className="block text-slate-400">x10^{resistorBands.multiplierPow}</span>
                              <span className="inline-block w-3 h-3 rounded-full mt-1" style={{ backgroundColor: resistorBands.colorMult }} />
                            </div>
                            <div className="p-1.5 rounded-lg border border-slate-800 bg-slate-950">
                              <span className="block text-slate-400">&plusmn;5% Gold</span>
                              <span className="inline-block w-3 h-3 rounded-full mt-1" style={{ backgroundColor: resistorBands.colorTol }} />
                            </div>
                          </div>
                        </div>

                        {/* Power & Wattage Recommendation */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                            <span className="block text-[10px] text-slate-400">Power Dissipation</span>
                            <span className="block text-sm font-bold text-white mt-1">
                              {resistorPowerWatts < 1 ? `${Math.round(resistorPowerWatts * 1000)} mW` : `${resistorPowerWatts.toFixed(2)} W`}
                            </span>
                          </div>
                          <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-900/60">
                            <span className="block text-[10px] text-emerald-400">Recommended Rating</span>
                            <span className="block text-sm font-bold text-emerald-300 mt-1">
                              {recommendedResistorWattage}
                            </span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                /* Battery Runtime Mode */
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left Column: Battery Inputs */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-xs font-bold text-slate-300">
                            Battery Capacity (mAh)
                          </label>
                          <span className="text-[11px] text-slate-400 font-mono">
                            {batteryWh.toFixed(1)} Wh
                          </span>
                        </div>
                        <input
                          type="number"
                          min="10"
                          value={elecBatteryMah}
                          onChange={(e) => setElecBatteryMah(Math.max(10, parseInt(e.target.value) || 0))}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-semibold text-white outline-none focus:border-blue-500"
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
                              className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-slate-950 border border-slate-800 text-slate-400 hover:text-white"
                            >
                              {p.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1.5">
                          Battery Voltage (V)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          min="0.5"
                          value={elecBatteryV}
                          onChange={(e) => setElecBatteryV(Math.max(0.5, parseFloat(e.target.value) || 0))}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-semibold text-white outline-none focus:border-blue-500"
                        />
                        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                          {[1.2, 3.7, 5.0, 9.0, 12.0].map((v) => (
                            <button
                              key={v}
                              type="button"
                              onClick={() => setElecBatteryV(v)}
                              className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-slate-950 border border-slate-800 text-slate-400 hover:text-white"
                            >
                              {v}V
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1.5">
                          Continuous Load Current (mA)
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={elecLoadCurrentMa}
                          onChange={(e) => setElecLoadCurrentMa(Math.max(1, parseInt(e.target.value) || 0))}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-semibold text-white outline-none focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1.5">
                          Efficiency Factor (%)
                        </label>
                        <input
                          type="number"
                          min="10"
                          max="100"
                          value={elecEfficiencyPct}
                          onChange={(e) => setElecEfficiencyPct(Math.max(10, Math.min(100, parseInt(e.target.value) || 85)))}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-semibold text-white outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Battery Results */}
                  <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-900/60 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-emerald-400">
                        Estimated Continuous Runtime
                      </span>
                      <div className="text-3xl font-black text-white">
                        {runtimeHours < 24 ? `${runtimeHours.toFixed(1)} Hours` : `${runtimeHours.toFixed(1)}h (${runtimeDays.toFixed(1)} Days)`}
                      </div>
                      <span className="text-[11px] text-slate-400 block">
                        Effective capacity: {Math.round(effectiveMah)} mAh at {effPct}% converter efficiency
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-center">
                      <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                        <span className="block text-[10px] text-slate-400">Total Energy (Wh)</span>
                        <span className="block text-sm font-bold text-white mt-1">
                          {batteryWh.toFixed(2)} Wh
                        </span>
                      </div>
                      <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                        <span className="block text-[10px] text-slate-400">Load Power Draw</span>
                        <span className="block text-sm font-bold text-amber-400 mt-1">
                          {loadWatts < 1 ? `${Math.round(loadWatts * 1000)} mW` : `${loadWatts.toFixed(2)} W`}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Save Recipe CTA */}
              <div className="flex items-center justify-end pt-2">
                <button
                  onClick={() => handleSaveFormula('ELECTRONICS')}
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

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-xs text-slate-300 leading-relaxed">
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

            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
              <div className="font-bold text-white flex items-center gap-1.5">
                <Grid className="w-4 h-4 text-indigo-400" />
                <span>Aida Count &amp; Framing Margin</span>
              </div>
              <p>
                Aida cloth count determines stitches per inch: 14ct produces 5.5 stitches/cm, while 18ct produces 7.1 stitches/cm. Never cut cloth to exact design size: always add at least a 5cm (2-inch) perimeter border so framers have tension grip without clipping your stitches.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
              <div className="font-bold text-white flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-amber-500" />
                <span>Fragrance Load Physics</span>
              </div>
              <p>
                Candle fragrance load is calculated against wax weight, not total container weight. Adding fragrance oil above 10-12% causes oil bleeding. Always stir gently for 2 full minutes at 80°C so fragrance binds into the soy crystal lattice before pouring.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
              <div className="font-bold text-white flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-cyan-400" />
                <span>Laser Kerf &amp; Nesting Efficiency</span>
              </div>
              <p>
                A CO2 or diode laser focal spot burns away 0.1mm - 0.3mm of material (kerf). Factoring kerf spacing and shared-line cutting prevents part scorching, protects delicate bridges, and maximizes raw sheet yield.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
              <div className="font-bold text-white flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-indigo-400" />
                <span>LED Current Limiting &amp; Thermal Runaway</span>
              </div>
              <p>
                LEDs are non-linear diodes with negative temperature coefficients. Connecting an LED directly to a power source without a current-limiting resistor causes exponential current growth, thermal runaway, and immediate burnout. Always choose the nearest standard E12 resistor rated for at least 2&times; the calculated dissipation wattage.
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
