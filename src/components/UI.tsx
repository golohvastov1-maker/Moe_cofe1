import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { formatPackageContent, productPackageContent } from "../utils";
import type { ServingStyle } from "../types";
import { IcCheck, IcMinus, IcPlate, IcPlus, IcTable, IcTrash, IcX } from "./Icons";

export const inputCls = "w-full rounded-[12px] border border-line bg-pine-800 px-3.5 py-2.5 text-[16px] md:text-[13.5px] outline-none transition-colors focus:border-saffron/60";
export const selectCls = inputCls + " appearance-none";
export const textareaCls = inputCls + " resize-none leading-relaxed";

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.08em] text-sage">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-[11px] text-sage">{hint}</span>}
    </label>
  );
}

interface ToastMsg { id: number; text: string; kind: "ok" | "del" | "info"; }
const ToastCtx = createContext<(text: string, kind?: ToastMsg["kind"]) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastMsg[]>([]);
  const idRef = useRef(1);
  const push = useCallback((text: string, kind: ToastMsg["kind"] = "ok") => {
    const id = idRef.current++;
    setItems((xs) => [...xs.slice(-2), { id, text, kind }]);
    window.setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), 2800);
  }, []);
  useEffect(() => {
    const onStorageError = () => push("Не удалось сохранить данные. Освободите место в браузере.", "del");
    window.addEventListener("moe-cafe-storage-error", onStorageError);
    return () => window.removeEventListener("moe-cafe-storage-error", onStorageError);
  }, [push]);
  const color = (k: ToastMsg["kind"]) => k === "del" ? "border-coral/40 text-coral" : k === "info" ? "border-glacier/40 text-glacier" : "border-mint/40 text-mint";
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-[86px] z-[90] flex flex-col items-center gap-2 px-4 md:bottom-6">
        {items.map((t) => (
          <div key={t.id} className={`anim-toast rounded-full border bg-pine-850/95 px-4 py-2 text-[12.5px] font-semibold shadow-[0_12px_34px_rgba(0,0,0,0.5)] backdrop-blur-md ${color(t.kind)}`}>
            {t.text}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function Modal({ open, onClose, title, subtitle, footer, maxW = "max-w-[560px]", children }: { open: boolean; onClose: () => void; title: string; subtitle?: string; footer?: ReactNode; maxW?: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center md:items-center">
      <div className="anim-fade absolute inset-0 bg-[#04100c]/80 backdrop-blur-[3px]" onClick={onClose} />
      <div className={`anim-modal relative flex max-h-[92dvh] w-[calc(100%-16px)] flex-col overflow-hidden rounded-t-[20px] border border-line bg-pine-900 shadow-[0_-20px_80px_rgba(0,0,0,0.6)] md:w-full md:rounded-[20px] ${maxW}`}>
        <div className="border-t-2 border-saffron/70" />
        <div className="flex items-start justify-between gap-3 px-5 pb-3 pt-4">
          <div>
            <h2 className="font-display text-[17px] leading-tight">{title}</h2>
            {subtitle && <p className="mt-1 text-[11.5px] text-sage">{subtitle}</p>}
          </div>
          <button onClick={onClose} aria-label="Закрыть" className="tap grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line text-sage hover:text-cream">
            <IcX size={16} />
          </button>
        </div>
        <div className="scroll-thin grow overflow-y-auto px-5 pb-2">{children}</div>
        {footer && <div className="border-t border-line bg-pine-850/80 px-3 py-3 shadow-[0_-12px_30px_rgba(0,0,0,0.25)] sm:px-5 sm:py-4">{footer}</div>}
      </div>
    </div>
  );
}

export function Stepper({ value, onChange, min = 1, small = false }: { value: number; onChange: (n: number) => void; min?: number; small?: boolean }) {
  const h = small ? "h-8" : "h-10";
  return (
    <div className={`inline-flex items-center gap-1 rounded-[12px] border border-line bg-pine-800 p-1 ${h}`}>
      <button onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label="Уменьшить" className={`tap grid ${small ? "h-6 w-6" : "h-8 w-8"} place-items-center rounded-[9px] bg-pine-700 text-sage transition-colors hover:text-cream disabled:opacity-30`}>
        <IcMinus size={small ? 12 : 14} />
      </button>
      <span className={`${small ? "min-w-[34px] text-[13px]" : "min-w-[44px] text-[15px]"} text-center font-display font-bold`}>{value}</span>
      <button onClick={() => onChange(value + 1)} aria-label="Увеличить" className={`tap grid ${small ? "h-6 w-6" : "h-8 w-8"} place-items-center rounded-[9px] bg-pine-700 text-sage transition-colors hover:text-cream`}>
        <IcPlus size={small ? 12 : 14} />
      </button>
    </div>
  );
}

export function StepperInput({ value, onChange, min = 1, small = false, placeholder = "" }: { value: number; onChange: (n: number) => void; min?: number; small?: boolean; placeholder?: string }) {
  const h = small ? "h-8" : "h-10";
  const [inputValue, setInputValue] = useState(String(value));
  useEffect(() => { setInputValue(String(value)); }, [value]);
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num >= min) onChange(Math.floor(num));
  };
  const handleBlur = () => {
    const num = parseFloat(inputValue);
    if (isNaN(num) || num < min) setInputValue(String(value));
    else onChange(Math.floor(num));
  };
  return (
    <div className={`inline-flex items-center gap-1 rounded-[12px] border border-line bg-pine-800 p-1 ${h}`}>
      <button onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label="Уменьшить" className={`tap grid ${small ? "h-6 w-6" : "h-8 w-8"} place-items-center rounded-[9px] bg-pine-700 text-sage transition-colors hover:text-cream disabled:opacity-30`}>
        <IcMinus size={small ? 12 : 14} />
      </button>
      <input type="text" inputMode="numeric" value={inputValue} onChange={handleInputChange} onBlur={handleBlur} placeholder={placeholder} className={`${small ? "w-12 text-[13px]" : "w-14 text-[15px]"} text-center font-display font-bold bg-transparent outline-none`} />
      <button onClick={() => onChange(value + 1)} aria-label="Увеличить" className={`tap grid ${small ? "h-6 w-6" : "h-8 w-8"} place-items-center rounded-[9px] bg-pine-700 text-sage transition-colors hover:text-cream`}>
        <IcPlus size={small ? 12 : 14} />
      </button>
    </div>
  );
}

export function Segmented<T extends string>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="inline-flex max-w-full flex-wrap gap-1 rounded-[13px] border border-line bg-pine-800 p-1">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button key={o.value} onClick={() => onChange(o.value)} className={`tap whitespace-nowrap rounded-[9px] px-3 py-1.5 text-[11.5px] font-semibold transition-colors ${active ? "bg-saffron text-pine-950" : "text-sage hover:text-cream"}`}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function ServingBadge({ serving, light = false }: { serving: ServingStyle; light?: boolean }) {
  const shared = serving === "shared";
  const fg = light ? (shared ? "#b45309" : "#047857") : shared ? "#f59e0b" : "#10b981";
  const bg = light ? (shared ? "rgba(180,83,9,0.10)" : "rgba(4,120,87,0.10)") : (shared ? "rgba(245,158,11,0.15)" : "rgba(16,185,129,0.15)");
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.04em]" style={{ color: fg, background: bg }} title={shared ? "Блюдо подаётся целиком на стол" : "Подача на каждого гостя"}>
      {shared ? <IcTable size={11} /> : <IcPlate size={11} />}
      {shared ? "общим на стол" : "порционно"}
    </span>
  );
}

export function EmptyState({ icon, title, text, action }: { icon: ReactNode; title: string; text: string; action?: ReactNode }) {
  return (
    <div className="reveal mx-auto mt-10 max-w-[380px] rounded-[18px] border border-dashed border-pine-500/70 px-6 py-10 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-[14px] bg-pine-700 text-saffron">{icon}</div>
      <p className="mt-4 font-display text-[15px]">{title}</p>
      <p className="mt-2 text-[12.5px] leading-relaxed text-sage">{text}</p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

export function DangerConfirm({ onConfirm, hint = "удалить?" }: { onConfirm: () => void; hint?: string }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = window.setTimeout(() => setArmed(false), 2600);
    return () => window.clearTimeout(t);
  }, [armed]);
  return (
    <button onClick={(e) => { e.stopPropagation(); if (armed) { setArmed(false); onConfirm(); } else { setArmed(true); } }} aria-label="Удалить" className={`tap flex shrink-0 items-center gap-1.5 rounded-[10px] border px-2 py-1.5 text-[11px] font-bold transition-colors ${armed ? "border-coral/60 bg-coral/15 text-coral" : "border-line text-sage hover:border-coral/40 hover:text-coral"}`}>
      <IcTrash size={13} />
      {armed && <span>{hint}</span>}
    </button>
  );
}

export function Chip({ children, className = "", style }: { children: ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold leading-none ${className}`} style={style}>
      {children}
    </span>
  );
}

export function useCountUp(target: number, duration = 600): number {
  const [val, setVal] = useState(target);
  const fromRef = useRef(target);
  useEffect(() => {
    const from = fromRef.current;
    if (from === target) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / duration);
      const e = 1 - Math.pow(1 - p, 3);
      setVal(from + (target - from) * e);
      if (p < 1) raf = requestAnimationFrame(tick);
      else fromRef.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
}

export function AmountEditor({ product, value, onChange }: { product: import("../types").Product; value: number; onChange: (v: number) => void }) {
  const weighed = product.unit === "кг" || product.unit === "л";
  const content = productPackageContent(product);
  const canSwap = !weighed && (product.unit === "шт" || product.unit === "упак" || product.unit === "пучок" || product.unit === "зубчик") && !!content;
  
  // Автоматически определяем режим на основе значения
  const getInitialGramsMode = () => {
    if (weighed) {
      // Для весовых продуктов: если значение < 1000, показываем в граммах
      return value < 1000;
    } else if (canSwap) {
      // Для штучных продуктов: если значение < 1, показываем в граммах
      return value < 1;
    }
    return false;
  };
  
  const [gramsMode, setGramsMode] = useState(getInitialGramsMode());
  const [userChangedMode, setUserChangedMode] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  
  // Обновляем режим при изменении значения извне (только если пользователь не менял вручную)
  useEffect(() => {
    if (!userChangedMode) {
      const newMode = weighed ? value < 1000 : (canSwap ? value < 1 : false);
      setGramsMode(newMode);
    }
  }, [value, weighed, canSwap, userChangedMode]);
  
  const formatDisplay = () => {
    if (weighed) {
      if (gramsMode) {
        return String(Math.round(value) || "");
      } else {
        if (value >= 1000) {
          return (value / 1000).toString().replace(".", ",");
        } else {
          return String(value || "");
        }
      }
    } else if (gramsMode && canSwap) {
      const contentAmount = Math.round(value * (content?.amount ?? 1) * 1000) / 1000;
      return contentAmount ? String(contentAmount).replace(".", ",") : "";
    } else {
      return String(value || "").replace(".", ",");
    }
  };
  
  useEffect(() => {
    if (isEditing) return;
    const formatted = formatDisplay();
    if (inputValue !== formatted) {
      setInputValue(formatted);
    }
  }, [value, gramsMode, isEditing, inputValue]);
  
  const commit = (str: string) => {
    setInputValue(str);
    const normalized = str.replace(",", ".");
    const n = parseFloat(normalized);
    if (isNaN(n)) return;
    
    if (weighed) {
      if (gramsMode) {
        onChange(Math.round(n));
      } else {
        onChange(Math.round(n * 1000));
      }
    } else if (gramsMode && canSwap) {
      const units = n / (content?.amount ?? 1);
      onChange(Math.round(units * 1_000_000) / 1_000_000);
    } else {
      onChange(Math.round(n * 100) / 100);
    }
  };
  
  const switchMode = (toGrams: boolean) => { 
    if (toGrams !== gramsMode) {
      setGramsMode(toGrams);
      setUserChangedMode(true); // Пользователь изменил режим вручную
      setTimeout(() => setInputValue(formatDisplay()), 0);
    }
  };
  
  const unitLbl = weighed
    ? (gramsMode ? (product.unit === "кг" ? "г" : "мл") : product.unit)
    : gramsMode && content ? content.unit : product.unit;
  
  return (
    <div className="flex items-center gap-2">
      {(canSwap || weighed) && (
        <div className="flex shrink-0 rounded-[9px] border border-line bg-pine-800 p-0.5">
          <button onClick={() => switchMode(false)} className={`tap rounded-[7px] px-2 py-1 text-[10.5px] font-bold ${!gramsMode ? "bg-saffron text-pine-950" : "text-sage"}`}>
            {weighed ? product.unit : product.unit}
          </button>
          <button onClick={() => switchMode(true)} className={`tap rounded-[7px] px-2 py-1 text-[10.5px] font-bold ${gramsMode ? "bg-saffron text-pine-950" : "text-sage"}`}>
            {weighed ? (product.unit === "кг" ? "г" : "мл") : content?.unit ?? "г"}
          </button>
        </div>
      )}
      <input 
        value={inputValue} 
        onChange={(e) => commit(e.target.value)} 
        onFocus={() => setIsEditing(true)}
        onBlur={() => {
          setIsEditing(false);
          setInputValue(formatDisplay());
        }}
        inputMode="decimal" 
        placeholder="0" 
        className="w-20 rounded-[10px] border border-line bg-pine-800 px-2.5 py-1.5 text-right font-display text-[13px] font-semibold outline-none focus:border-saffron/60" 
      />
      <span className="w-9 text-xs text-sage">{unitLbl}</span>
      {canSwap && gramsMode && <span className="text-[10px] text-sage">≈ {new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 6 }).format(value)} {product.unit}</span>}
      {canSwap && !gramsMode && content && <span className="text-[10px] text-sage">= {formatPackageContent(value * content.amount, content.unit)}</span>}
      {weighed && !gramsMode && value < 1000 && <span className="text-[10px] text-sage">= {value} г</span>}
      {weighed && gramsMode && value >= 1000 && <span className="text-[10px] text-sage">= {(value / 1000).toFixed(2)} {product.unit}</span>}
    </div>
  );
}
