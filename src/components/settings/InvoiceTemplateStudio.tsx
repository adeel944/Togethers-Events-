import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, GripVertical, Type, Image as ImageIcon, Save, RotateCcw, ChevronUp, ChevronDown, Eye } from 'lucide-react';
import { BusinessProfile, InvoiceSettings } from '../../types';

export type CustomInvoiceBlockType = 'text' | 'logo' | 'business' | 'title' | 'client' | 'event' | 'items' | 'totals' | 'terms' | 'signature' | 'bank';
export interface CustomInvoiceBlock {
  id: string;
  type: CustomInvoiceBlockType;
  label: string;
  text: string;
  x: number;
  y: number;
  w: number;
  h: number;
  fontSize: number;
  bold: boolean;
}

const STORAGE_KEY = 'together-events-custom-invoice-layout-v1';

const defaultBlocks = (): CustomInvoiceBlock[] => [
  { id: 'logo', type: 'logo', label: 'Business Logo', text: '', x: 6, y: 5, w: 22, h: 9, fontSize: 14, bold: false },
  { id: 'business', type: 'business', label: 'Business Name & Contact', text: '', x: 31, y: 5, w: 34, h: 10, fontSize: 15, bold: true },
  { id: 'title', type: 'title', label: 'Document Title', text: '', x: 69, y: 5, w: 25, h: 10, fontSize: 17, bold: true },
  { id: 'client', type: 'client', label: 'Bill To / Client', text: '', x: 6, y: 18, w: 43, h: 12, fontSize: 11, bold: false },
  { id: 'event', type: 'event', label: 'Event Details', text: '', x: 53, y: 18, w: 41, h: 12, fontSize: 11, bold: false },
  { id: 'items', type: 'items', label: 'Invoice Items', text: '', x: 6, y: 33, w: 88, h: 27, fontSize: 10, bold: false },
  { id: 'totals', type: 'totals', label: 'Totals & Balance', text: '', x: 60, y: 62, w: 34, h: 14, fontSize: 11, bold: true },
  { id: 'terms', type: 'terms', label: 'Terms & Conditions', text: '', x: 6, y: 62, w: 50, h: 16, fontSize: 9, bold: false },
  { id: 'bank', type: 'bank', label: 'Bank Payment Instructions', text: '', x: 6, y: 80, w: 52, h: 10, fontSize: 9, bold: false },
  { id: 'signature', type: 'signature', label: 'Authorized Signature', text: '', x: 67, y: 80, w: 27, h: 12, fontSize: 9, bold: false },
];

const typeOptions: { type: CustomInvoiceBlockType; label: string }[] = [
  { type: 'text', label: 'Text Box' },
  { type: 'logo', label: 'Business Logo' },
  { type: 'business', label: 'Business Name' },
  { type: 'title', label: 'Document Title' },
  { type: 'client', label: 'Client Details' },
  { type: 'event', label: 'Event Details' },
  { type: 'items', label: 'Invoice Items' },
  { type: 'totals', label: 'Totals / Balance' },
  { type: 'terms', label: 'Terms & Conditions' },
  { type: 'bank', label: 'Bank Instructions' },
  { type: 'signature', label: 'Signature' },
];

const loadLayout = (): CustomInvoiceBlock[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultBlocks();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length ? parsed : defaultBlocks();
  } catch {
    return defaultBlocks();
  }
};

interface Props {
  profile: BusinessProfile;
  settings: InvoiceSettings;
  onSaveSettings: (settings: InvoiceSettings) => Promise<InvoiceSettings>;
}

export const InvoiceTemplateStudio: React.FC<Props> = ({ profile, settings, onSaveSettings }) => {
  const [blocks, setBlocks] = useState<CustomInvoiceBlock[]>(loadLayout);
  const [selectedId, setSelectedId] = useState<string | null>('title');
  const [saved, setSaved] = useState(false);
  const [dragging, setDragging] = useState<{ id: string; ox: number; oy: number } | null>(null);

  const selected = useMemo(() => blocks.find((b) => b.id === selectedId) || null, [blocks, selectedId]);

  useEffect(() => {
    const stop = () => setDragging(null);
    window.addEventListener('pointerup', stop);
    return () => window.removeEventListener('pointerup', stop);
  }, []);

  const updateBlock = (id: string, patch: Partial<CustomInvoiceBlock>) => {
    setBlocks((current) => current.map((b) => b.id === id ? { ...b, ...patch } : b));
  };

  const addText = () => {
    const id = `text-${Date.now()}`;
    const next: CustomInvoiceBlock = { id, type: 'text', label: 'Custom Text', text: 'Click to edit this text', x: 10, y: 12, w: 35, h: 7, fontSize: 11, bold: false };
    setBlocks((current) => [...current, next]);
    setSelectedId(id);
  };

  const addBlock = (type: CustomInvoiceBlockType) => {
    if (type === 'text') return addText();
    const base = typeOptions.find((o) => o.type === type)?.label || 'Element';
    const id = `${type}-${Date.now()}`;
    const next: CustomInvoiceBlock = { id, type, label: base, text: '', x: 10, y: 12, w: 35, h: 8, fontSize: 11, bold: false };
    setBlocks((current) => [...current, next]);
    setSelectedId(id);
  };

  const removeSelected = () => {
    if (!selectedId) return;
    setBlocks((current) => current.filter((b) => b.id !== selectedId));
    setSelectedId(null);
  };

  const save = async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(blocks));
    await onSaveSettings({ ...settings, defaultTemplate: 'custom' });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2500);
  };

  const reset = () => {
    const fresh = defaultBlocks();
    setBlocks(fresh);
    setSelectedId('title');
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
  };

  const startDrag = (e: React.PointerEvent<HTMLDivElement>, block: CustomInvoiceBlock) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setSelectedId(block.id);
    setDragging({ id: block.id, ox: e.clientX, oy: e.clientY });
  };

  const moveDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    const paper = e.currentTarget.parentElement?.getBoundingClientRect();
    if (!paper) return;
    const dx = ((e.clientX - dragging.ox) / paper.width) * 100;
    const dy = ((e.clientY - dragging.oy) / paper.height) * 100;
    setDragging((d) => d ? { ...d, ox: e.clientX, oy: e.clientY } : d);
    const b = blocks.find((item) => item.id === dragging.id);
    if (!b) return;
    updateBlock(b.id, { x: Math.max(0, Math.min(100 - b.w, b.x + dx)), y: Math.max(0, Math.min(100 - b.h, b.y + dy)) });
  };

  const sample = {
    client: 'Sarah & Farhan Ahmed',
    event: 'Baraat • 18 Sep 2026',
    venue: 'Serena Marquee, Grand Ballroom',
    total: 'Rs. 1,850,000',
  };

  const renderBlock = (block: CustomInvoiceBlock) => {
    const common = 'h-full w-full overflow-hidden rounded border border-transparent hover:border-slate-300 transition-colors';
    switch (block.type) {
      case 'logo': return profile.logoUrl ? <img src={profile.logoUrl} alt="Logo" className="h-full w-full object-contain" /> : <div className={`${common} flex items-center justify-center bg-slate-100 text-slate-500 font-bold`}>{profile.businessName?.charAt(0) || 'T'}</div>;
      case 'business': return <div className={common}><div className="font-bold leading-tight">{profile.businessName || 'Your Business Name'}</div><div className="text-[8px] text-slate-500 mt-1">{profile.phone || 'Phone'} {profile.email ? `• ${profile.email}` : ''}</div></div>;
      case 'title': return <div className={`${common} text-right`}><div className="font-bold tracking-wide">{settings.documentTitle || 'BOOKING CONFIRMATION'}</div><div className="text-[9px] text-slate-400 mt-1">#INV-1001</div></div>;
      case 'client': return <div className={`${common} p-2 bg-slate-50`}><div className="text-[8px] uppercase tracking-widest text-slate-400 font-bold">Bill To</div><div className="font-semibold mt-1">{sample.client}</div><div className="text-[9px] text-slate-500">+92 321 4455667</div></div>;
      case 'event': return <div className={`${common} p-2 bg-slate-50`}><div className="text-[8px] uppercase tracking-widest text-slate-400 font-bold">Event Details</div><div className="font-semibold mt-1">{sample.event}</div><div className="text-[9px] text-slate-500">{sample.venue}</div></div>;
      case 'items': return <div className={`${common} border-slate-200`}><div className="grid grid-cols-[1fr_45px_70px] gap-1 px-2 py-1.5 bg-slate-100 text-[8px] font-bold uppercase"><span>Description</span><span className="text-center">Qty</span><span className="text-right">Amount</span></div>{['Event planning & décor package','Catering & service','Photography'].map((x,i)=><div key={x} className="grid grid-cols-[1fr_45px_70px] gap-1 px-2 py-1.5 border-t border-slate-100 text-[8px]"><span>{x}</span><span className="text-center">{i===1?500:1}</span><span className="text-right">Rs. {(i+1)*250000 .toLocaleString()}</span></div>)}</div>;
      case 'totals': return <div className={`${common} p-2 text-right`}><div className="text-[9px] text-slate-500">Subtotal&nbsp;&nbsp; Rs. 1,850,000</div><div className="font-bold mt-1">Total&nbsp;&nbsp; {sample.total}</div><div className="text-[9px] mt-1">Advance&nbsp;&nbsp; Rs. 800,000</div><div className="font-bold bg-slate-100 rounded p-1 mt-1">Balance&nbsp;&nbsp; Rs. 1,050,000</div></div>;
      case 'terms': return <div className={`${common} p-2`}><div className="text-[8px] uppercase tracking-widest text-slate-400 font-bold">Terms & Conditions</div><div className="text-[8px] text-slate-500 mt-1 whitespace-pre-line">{profile.defaultTerms || 'Your standard terms will appear here.'}</div></div>;
      case 'bank': return <div className={`${common} p-2 bg-slate-50`}><div className="text-[8px] uppercase tracking-widest text-slate-400 font-bold">Bank Payment Instructions</div><div className="text-[8px] text-slate-600 mt-1">{profile.bankDetails?.bankName || 'Bank Name'} • {profile.bankDetails?.accountTitle || 'Account Title'}<br />{profile.bankDetails?.accountNumber || 'Account Number'}</div></div>;
      case 'signature': return <div className={`${common} text-center`}><div className="h-8 flex items-end justify-center">{profile.signatureUrl ? <img src={profile.signatureUrl} alt="Signature" className="h-8 max-w-full object-contain" /> : <span className="text-[9px] text-slate-400 italic">Signature</span>}</div><div className="border-t border-slate-300 mt-1 pt-1 text-[8px] font-bold">AUTHORIZED SIGNATURE</div></div>;
      default: return <div className={`${common} p-2 whitespace-pre-wrap`}>{block.text || 'Custom text'}</div>;
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      <div className="flex items-center justify-between gap-4">
        <div><h2 className="text-lg font-bold text-slate-900">Custom Invoice Designer</h2><p className="text-xs text-slate-500 mt-1">Drag elements anywhere on the A4 sheet. Click an element to edit, resize, move or remove it.</p></div>
        <div className="flex items-center gap-2"><button type="button" onClick={reset} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold"><RotateCcw className="w-3.5 h-3.5" />Reset</button><button type="button" onClick={save} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold"><Save className="w-3.5 h-3.5" />{saved ? 'Saved' : 'Save Custom Template'}</button></div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[220px_minmax(520px,1fr)_260px] gap-5 items-start">
        <div className="p-4 rounded-2xl bg-white/80 border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold"><Plus className="w-4 h-4" />Add Element</div>
          <button onClick={addText} type="button" className="w-full p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-left text-xs font-semibold flex items-center gap-2"><Type className="w-4 h-4" />Custom Text</button>
          <div className="grid grid-cols-1 gap-1.5 max-h-[520px] overflow-y-auto pr-1">
            {typeOptions.filter(o => o.type !== 'text').map((o) => <button key={o.type} onClick={() => addBlock(o.type)} type="button" className="w-full p-2 rounded-lg border border-slate-100 hover:border-slate-200 hover:bg-slate-50 text-left text-[11px] font-medium">{o.label}</button>)}
          </div>
          <p className="text-[10px] text-slate-400 leading-relaxed">Elements already on the page can also be selected and moved. Use the right panel for exact position and size.</p>
        </div>

        <div className="rounded-2xl bg-slate-100 border border-slate-200 p-4 sm:p-7 overflow-auto">
          <div className="mx-auto relative bg-white shadow-xl" style={{ width: 'min(100%, 560px)', aspectRatio: '210 / 297', minHeight: 700, maxHeight: 'calc(100vh - 260px)' }}>
            <div className="absolute inset-0 overflow-hidden" onPointerMove={moveDrag}>
              {blocks.map((block) => <div key={block.id} onPointerDown={(e) => startDrag(e, block)} onClick={() => setSelectedId(block.id)} className={`absolute cursor-move select-none ${selectedId === block.id ? 'ring-2 ring-slate-900 ring-offset-1' : ''}`} style={{ left: `${block.x}%`, top: `${block.y}%`, width: `${block.w}%`, height: `${block.h}%`, fontSize: `${block.fontSize}px`, fontWeight: block.bold ? 700 : 400 }} title="Click to select, drag to move">{renderBlock(block)}</div>)}
            </div>
          </div>
          <div className="flex items-center justify-center gap-2 text-[10px] text-slate-500 mt-3"><Eye className="w-3.5 h-3.5" />Live A4 preview • what you arrange here becomes your custom template</div>
        </div>

        <div className="p-4 rounded-2xl bg-white/80 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between"><div className="text-sm font-bold">Element Settings</div>{selected && <button onClick={removeSelected} type="button" className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50" title="Remove element"><Trash2 className="w-4 h-4" /></button>}</div>
          {!selected ? <p className="text-xs text-slate-400">Click any element on the A4 page to edit it.</p> : <>
            <div><label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Element</label><input value={selected.label} onChange={e => updateBlock(selected.id, { label: e.target.value })} className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 text-xs" /></div>
            {selected.type === 'text' && <div><label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Text</label><textarea rows={4} value={selected.text} onChange={e => updateBlock(selected.id, { text: e.target.value })} className="w-full mt-1 px-3 py-2 rounded-xl border border-slate-200 text-xs" /></div>}
            <div className="grid grid-cols-2 gap-2">
              <label className="text-[10px] font-bold text-slate-500">X %<input type="number" min="0" max="100" value={Math.round(selected.x)} onChange={e => updateBlock(selected.id, { x: Number(e.target.value) })} className="w-full mt-1 px-2 py-1.5 rounded-lg border border-slate-200 text-xs" /></label>
              <label className="text-[10px] font-bold text-slate-500">Y %<input type="number" min="0" max="100" value={Math.round(selected.y)} onChange={e => updateBlock(selected.id, { y: Number(e.target.value) })} className="w-full mt-1 px-2 py-1.5 rounded-lg border border-slate-200 text-xs" /></label>
              <label className="text-[10px] font-bold text-slate-500">Width %<input type="number" min="5" max="100" value={Math.round(selected.w)} onChange={e => updateBlock(selected.id, { w: Number(e.target.value) })} className="w-full mt-1 px-2 py-1.5 rounded-lg border border-slate-200 text-xs" /></label>
              <label className="text-[10px] font-bold text-slate-500">Height %<input type="number" min="3" max="100" value={Math.round(selected.h)} onChange={e => updateBlock(selected.id, { h: Number(e.target.value) })} className="w-full mt-1 px-2 py-1.5 rounded-lg border border-slate-200 text-xs" /></label>
            </div>
            <div className="grid grid-cols-2 gap-2"><label className="text-[10px] font-bold text-slate-500">Font<input type="number" min="7" max="28" value={selected.fontSize} onChange={e => updateBlock(selected.id, { fontSize: Number(e.target.value) })} className="w-full mt-1 px-2 py-1.5 rounded-lg border border-slate-200 text-xs" /></label><button type="button" onClick={() => updateBlock(selected.id, { bold: !selected.bold })} className={`mt-4 px-2 py-1.5 rounded-lg border text-xs font-semibold ${selected.bold ? 'bg-slate-900 text-white border-slate-900' : 'bg-white border-slate-200'}`}>Bold</button></div>
            <div className="flex gap-2 pt-2 border-t border-slate-100"><button type="button" onClick={() => updateBlock(selected.id, { y: Math.max(0, selected.y - 1) })} className="flex-1 py-2 rounded-lg border border-slate-200 text-xs"><ChevronUp className="w-3.5 h-3.5 mx-auto" /></button><button type="button" onClick={() => updateBlock(selected.id, { y: Math.min(100 - selected.h, selected.y + 1) })} className="flex-1 py-2 rounded-lg border border-slate-200 text-xs"><ChevronDown className="w-3.5 h-3.5 mx-auto" /></button></div>
          </>}
        </div>
      </div>
    </div>
  );
};

export const CUSTOM_INVOICE_LAYOUT_STORAGE_KEY = STORAGE_KEY;
export const getCustomInvoiceLayout = loadLayout;
