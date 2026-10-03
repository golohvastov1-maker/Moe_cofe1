import { useState, useEffect } from "react";
import type { ReactNode } from "react";
import type { DocKind, EventPlan } from "../types";
import { useStore } from "../store";
import { fmtDateLong, fmtMoney, plural, recipeCost, todayISO } from "../utils";
import { IcPrinter, IcX } from "./Icons";

const INK = "#3d3530";
const SOFT = "#8a7f75";
const RULE = "#e0d5c8";
const GOLD = "#d4a017";

function DocHeader({ note }: { note: string }) {
  const { state } = useStore();
  const r = state.requisites;
  return (
    <div className="mb-6 flex items-start justify-between gap-6">
      <div>
        <p className="font-display text-[15px] tracking-[0.02em] text-[#1a1512]">Мое кафе</p>
        <p className="mt-1 max-w-[300px] text-[10px] leading-relaxed" style={{ color: SOFT }}>{r.org} · {r.inn}<br />{r.address} · {r.phone}</p>
      </div>
      <div className="text-right">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: GOLD }}>{note}</p>
        <p className="mt-1 text-[10px]" style={{ color: SOFT }}>от {fmtDateLong(todayISO())}</p>
      </div>
    </div>
  );
}

function PreviewShell({ title, subtitle, onClose, children, onExportExcel }: { title: string; subtitle: string; onClose: () => void; children: ReactNode; onExportExcel?: () => void }) {
  return (
    <div className="print-host fixed inset-0 z-[80] overflow-y-auto bg-[#04100c]/97 scroll-thin">
      <div className="no-print sticky top-0 z-10 border-b border-line bg-pine-900/95 backdrop-blur-md">
        <div className="mx-auto flex h-[54px] max-w-[860px] items-center gap-3 px-4">
          <button onClick={onClose} className="tap grid h-9 w-9 place-items-center rounded-full border border-line text-sage hover:text-cream" aria-label="Закрыть"><IcX size={16} /></button>
          <div className="min-w-0 grow"><p className="truncate font-display text-[14px] leading-tight">{title}</p><p className="truncate text-[10.5px] text-sage">{subtitle}</p></div>
          {onExportExcel && <button onClick={onExportExcel} className="tap flex items-center gap-2 rounded-[11px] border border-line bg-pine-800 px-3.5 py-2 font-display text-[11.5px] font-bold text-sage hover:text-mint">Сохранить в Excel</button>}
          <button onClick={() => window.print()} className="tap flex items-center gap-2 rounded-[11px] bg-saffron px-3.5 py-2 font-display text-[11.5px] font-bold text-pine-950 hover:brightness-110"><IcPrinter size={15} /> Сохранить в PDF</button>
        </div>
      </div>
      <div className="mx-auto max-w-[860px] px-3 py-6 md:px-6">
        <div id="print-root" className="print-sheet overflow-hidden rounded-[6px] shadow-[0_30px_90px_rgba(0,0,0,0.6)]" style={{ fontFamily: "var(--font-body)", background: "#fefdfb", color: "#2d2420" }}>{children}</div>
        <p className="no-print mt-4 pb-4 text-center text-[11px] text-sage">Формат А4 · для PDF выберите «Сохранить как PDF» в диалоге печати</p>
      </div>
    </div>
  );
}

export function EventDocPreview({ kind, event, onClose }: { kind: DocKind; event: EventPlan; onClose: () => void }) {
  const { state } = useStore();
  const titles: Record<DocKind, string> = { chef: "Задание для поваров", shopping: "Сводный список закупок", invoice: "Счёт для клиента" };

  const handleExportExcel = () => {
    // Упрощённый экспорт
    alert(`Экспорт в Excel: ${titles[kind]} для "${event.name}"`);
  };

  return (
    <PreviewShell title={titles[kind]} subtitle={event.name} onClose={onClose} onExportExcel={handleExportExcel}>
      <div className="px-10 py-12" style={{ background: "#fefdfb" }}>
        <DocHeader note={kind === "chef" ? "технологическая карта" : kind === "shopping" ? "складская ведомость" : "финансовый документ"} />
        <div className="flex items-end justify-between gap-4 border-b-2 pb-4" style={{ borderColor: INK }}>
          <div>
            <h1 className="font-display text-[24px] leading-tight">{titles[kind]}</h1>
            <p className="mt-1 text-[12.5px]" style={{ color: SOFT }}>{event.name} · {fmtDateLong(event.date)} · {event.guests} {plural(event.guests, ["гость", "гостя", "гостей"])} · {event.tablesCount} {plural(event.tablesCount, ["стол", "стола", "столов"])} по {event.guestsPerTable} чел.</p>
          </div>
        </div>
        <div className="mt-6">
          <p className="text-[12px]" style={{ color: SOFT }}>
            Документ содержит {event.dishes.length} {plural(event.dishes.length, ["блюдо", "блюда", "блюд"])} и {event.services.length} {plural(event.services.length, ["услуга", "услуги", "услуг"])}.
          </p>
          {event.comment && (
            <div className="mt-4 rounded-[8px] border p-3" style={{ borderColor: RULE }}>
              <p className="text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: GOLD }}>Комментарий</p>
              <p className="mt-1 text-[11px] whitespace-pre-line" style={{ color: SOFT }}>{event.comment}</p>
            </div>
          )}
        </div>
      </div>
    </PreviewShell>
  );
}

export function MultiShoppingPreview({ events, onClose }: { events: EventPlan[]; onClose: () => void }) {
  const handleExportExcel = () => {
    alert(`Экспорт в Excel: общий список закупок для ${events.length} мероприятий`);
  };
  return (
    <PreviewShell title="Общий список закупок" subtitle={`${events.length} ${plural(events.length, ["мероприятие", "мероприятия", "мероприятий"])} · ингредиенты суммированы`} onClose={onClose} onExportExcel={handleExportExcel}>
      <div className="px-10 py-12" style={{ background: "#fefdfb" }}>
        <DocHeader note="объединённая ведомость" />
        <div className="flex items-end justify-between gap-4 border-b-2 pb-4" style={{ borderColor: INK }}>
          <div>
            <h1 className="font-display text-[24px] leading-tight">Общий список закупок</h1>
            <p className="mt-1 text-[12.5px]" style={{ color: SOFT }}>Объединено {events.length} {plural(events.length, ["мероприятие", "мероприятия", "мероприятий"])}: {events.map((e) => `${e.name} (${fmtDateLong(e.date)})`).join(" · ")}</p>
          </div>
        </div>
        <div className="mt-6">
          {events.map((ev) => (
            <div key={ev.id} className="mt-4">
              <p className="font-display text-[14px]">{ev.name}</p>
              <p className="text-[11px]" style={{ color: SOFT }}>{ev.guests} гостей · {ev.dishes.length} блюд</p>
            </div>
          ))}
        </div>
      </div>
    </PreviewShell>
  );
}

export function RecipesPricePreview({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state } = useStore();
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [showSelection, setShowSelection] = useState(true);

  useEffect(() => {
    if (open) {
      const defaultCategories = state.categories.filter((c) => c.isDefault && c.name !== "Поминки").map((c) => c.name);
      setSelectedCategories(defaultCategories);
      setShowSelection(true);
    }
  }, [open, state.categories]);

  if (!open) return null;

  const toggleCategory = (catName: string) => {
    setSelectedCategories((prev) => prev.includes(catName) ? prev.filter((c) => c !== catName) : [...prev, catName]);
  };

  const handlePrint = () => { setShowSelection(false); };
  const handleExportExcel = () => { alert("Экспорт прайс-листа в Excel"); };

  if (showSelection) {
    return (
      <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#04100c]/97 backdrop-blur-md">
        <div className="w-full max-w-[600px] rounded-[16px] border border-line bg-pine-900 p-6 shadow-2xl">
          <div className="mb-6">
            <h2 className="font-display text-[20px] text-cream">Выберите категории для печати</h2>
            <p className="mt-2 text-[13px] text-sage">Отметьте категории блюд, которые нужно включить в прайс-лист</p>
          </div>
          <div className="mb-6 grid grid-cols-2 gap-3">
            {state.categories.map((cat) => {
              const isSelected = selectedCategories.includes(cat.name);
              const recipesCount = state.recipes.filter((r) => r.category === cat.name).length;
              return (
                <button key={cat.id} onClick={() => toggleCategory(cat.name)} className={`tap flex items-center gap-3 rounded-[12px] border p-3 text-left transition-all ${isSelected ? "border-saffron/60 bg-saffron/10" : "border-line bg-pine-800 hover:border-sage/40"}`}>
                  <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-[6px] border-2 transition-all ${isSelected ? "border-saffron bg-saffron" : "border-sage/40"}`}>
                    {isSelected && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>}
                  </div>
                  <div className="min-w-0 grow">
                    <p className={`text-[13px] font-semibold ${isSelected ? "text-saffron" : "text-cream"}`}>{cat.name}</p>
                    <p className="text-[11px] text-sage">{recipesCount} {recipesCount === 1 ? "блюдо" : recipesCount < 5 ? "блюда" : "блюд"}</p>
                  </div>
                </button>
              );
            })}
          </div>
          <div className="flex items-center justify-between gap-3">
            <button onClick={onClose} className="tap rounded-[12px] border border-line px-5 py-2.5 font-display text-[13px] font-bold text-sage hover:text-cream">Отмена</button>
            <button onClick={handlePrint} disabled={selectedCategories.length === 0} className="tap flex items-center gap-2 rounded-[12px] bg-saffron px-5 py-2.5 font-display text-[13px] font-bold text-pine-950 disabled:opacity-35"><IcPrinter size={16} /> Печать / PDF</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <PreviewShell title="Прайс-лист блюд" subtitle="Конечные цены по кулинарному справочнику" onClose={onClose} onExportExcel={handleExportExcel}>
      <div className="px-10 py-12" style={{ background: "#fefdfb" }}>
        <DocHeader note="кулинарный справочник" />
        <div className="border-b-2 pb-4" style={{ borderColor: INK }}>
          <h1 className="font-display text-[24px] leading-tight">Прайс-лист блюд</h1>
          <p className="mt-1 text-[12.5px]" style={{ color: SOFT }}>Конечные цены с наценкой · {fmtDateLong(todayISO())}</p>
        </div>
        {selectedCategories.map((cat) => {
          const group = state.recipes.filter((r) => r.category === cat).sort((a, b) => a.name.localeCompare(b.name, "ru"));
          if (group.length === 0) return null;
          return (
            <div key={cat} className="mt-6">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: GOLD }}>{cat} · {group.length}</p>
              <div className="mt-2 space-y-2">
                {group.map((r) => (
                  <div key={r.id} className="flex items-baseline justify-between gap-4 border-b py-2" style={{ borderColor: RULE }}>
                    <div>
                      <p className="font-display text-[13.5px]">{r.name}</p>
                      <p className="text-[10.5px] italic" style={{ color: SOFT }}>{r.description}</p>
                    </div>
                    <p className="shrink-0 font-display text-[14px] font-semibold">{fmtMoney(r.portions > 0 ? (r.markupMode === "fixed" ? r.markupValue / r.portions : (recipeCost(r, state.products) / r.portions) * (1 + r.markupValue / 100)) : 0)}</p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </PreviewShell>
  );
}
