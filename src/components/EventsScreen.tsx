import { useEffect, useMemo, useState } from "react";
import type { EventPlan, EventType } from "../types";
import { EVENT_TYPE_STYLE, EVENT_TYPES, compareProductCategories, isWeighed } from "../types";
import { useStore } from "../store";
import { amountLabel, comparePurchasePlaces, daysUntilLabel, eventSummary, fmtDateShort, fmtMoney, pieceAmountLabel, plural, todayISO, uid } from "../utils";
import { DangerConfirm, EmptyState, Field, Modal, Segmented, Stepper, StepperInput, inputCls, useToast } from "./UI";
import { IcCalendar, IcPlus, IcSearch, IcX, IcDoc, IcDownload, IcPrinter } from "./Icons";
import { MultiShoppingPreview } from "./PrintDocs";
import type { CombinedShoppingList } from "../types";

export function EventsScreen({ onOpen }: { onOpen: (id: string) => void }) {
  const { state, deleteEvent, deleteCombinedShoppingList } = useStore();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<EventPlan | null>(null);
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState<EventType | "все">("все");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [showPast, setShowPast] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [multiOpen, setMultiOpen] = useState(false);
  const [viewingList, setViewingList] = useState<CombinedShoppingList | null>(null);
  const [today, setToday] = useState(todayISO);
  useEffect(() => {
    const now = new Date();
    const nextMidnight = new Date(now);
    nextMidnight.setHours(24, 0, 0, 0);
    const timer = window.setTimeout(() => setToday(todayISO()), nextMidnight.getTime() - now.getTime());
    return () => window.clearTimeout(timer);
  }, [today]);
  const toggleSelect = (id: string) => setSelected((xs) => (xs.includes(id) ? xs.filter((x) => x !== id) : [...xs, id]));
  const selectedEvents = selected.map((id) => state.events.find((e) => e.id === id)).filter((e): e is EventPlan => !!e && e.date >= today);
  const hasFilters = q !== "" || typeFilter !== "все" || from !== "" || to !== "";
  const filtered = useMemo(() => state.events.filter((e) => { const okQ = !q || e.name.toLowerCase().includes(q.trim().toLowerCase()); const okT = typeFilter === "все" || e.type === typeFilter; const okFrom = !from || e.date >= from; const okTo = !to || e.date <= to; return okQ && okT && okFrom && okTo; }).sort((a, b) => a.date.localeCompare(b.date)), [state.events, q, typeFilter, from, to]);
  const visibleEvents = filtered.filter((event) => showPast ? event.date < today : event.date >= today);
  const upcomingCount = state.events.filter((e) => e.date >= today).length;
  const pastCount = state.events.length - upcomingCount;
  return (
    <section className="px-5 pb-8 pt-6 md:px-8">
      <header className="reveal flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="font-display text-[26px] leading-none text-cream">Мероприятия</h1><p className="mt-2 text-[13px] text-sage">{upcomingCount} предстоящих · {pastCount} прошедших · меню, услуги, скидки и документы</p></div>
        <button onClick={() => { setEditing(null); setOpen(true); }} className="tap flex items-center gap-2 rounded-[12px] bg-gradient-to-br from-saffron to-amber-500 px-4 py-2.5 font-display text-[12px] font-bold text-pine-950 shadow-lg shadow-saffron/20 hover:scale-105"><IcPlus size={16} /> Мероприятие</button>
      </header>
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <div className="relative w-full grow sm:min-w-[190px] sm:max-w-[260px]"><IcSearch size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sage" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Название…" className={inputCls + " pl-10"} /></div>
        <Segmented options={[{ value: "все", label: "Все" }, ...EVENT_TYPES.map((t) => ({ value: t, label: t }))]} value={typeFilter} onChange={setTypeFilter} />
        <div className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:flex sm:items-center sm:gap-1.5">
          <label className="min-w-0 text-[10px] font-semibold text-sage sm:flex sm:items-center sm:gap-1.5 sm:text-[12px]"><span>С</span><input aria-label="Дата начала" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputCls + " mt-1 min-w-0 py-2 text-[12px] sm:mt-0 sm:w-[138px] sm:text-[12.5px]"} /></label>
          <label className="min-w-0 text-[10px] font-semibold text-sage sm:flex sm:items-center sm:gap-1.5 sm:text-[12px]"><span>По</span><input aria-label="Дата окончания" type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputCls + " mt-1 min-w-0 py-2 text-[12px] sm:mt-0 sm:w-[138px] sm:text-[12.5px]"} /></label>
        </div>
        {hasFilters && <button onClick={() => { setQ(""); setTypeFilter("все"); setFrom(""); setTo(""); }} className="tap rounded-full border border-line px-3 py-1.5 text-[11.5px] font-semibold text-sage hover:text-coral">Сбросить</button>}
      </div>
      {state.events.length === 0 ? (<EmptyState icon={<IcCalendar size={24} />} title="Мероприятий пока нет" text="Создайте событие." action={<button onClick={() => { setEditing(null); setOpen(true); }} className="tap rounded-full bg-saffron px-5 py-2.5 font-display text-[12px] font-bold text-pine-950">Новое мероприятие</button>} />) : (
        <>
          <div className="mt-5 grid grid-cols-2 gap-2 rounded-[13px] border border-line bg-pine-850 p-1">
            <button onClick={() => setShowPast(false)} aria-pressed={!showPast} className={`tap rounded-[10px] px-3 py-2.5 text-[12px] font-semibold transition-colors ${!showPast ? "bg-saffron text-pine-950" : "text-sage hover:text-cream"}`}>Предстоящие · {upcomingCount}</button>
            <button onClick={() => { setShowPast(true); setSelected([]); }} aria-pressed={showPast} className={`tap rounded-[10px] px-3 py-2.5 text-[12px] font-semibold transition-colors ${showPast ? "bg-saffron text-pine-950" : "text-sage hover:text-cream"}`}>Прошедшие · {pastCount}</button>
          </div>
          {visibleEvents.length === 0 ? (
            <p className="reveal mt-8 text-center text-[13px] text-sage">
              {filtered.length === 0
                ? "По выбранным фильтрам мероприятий нет"
                : showPast ? "Прошедших мероприятий пока нет" : "Предстоящих мероприятий нет"}
            </p>
          ) : (
        <div className="reveal mt-4 overflow-hidden rounded-[16px] border border-line bg-pine-850">
          {visibleEvents.map((e, i) => {
            const sum = eventSummary(e, state.recipes, state.products);
            const st = EVENT_TYPE_STYLE[e.type];
            const past = e.date < today;
            const isSel = selected.includes(e.id);
            const [day, mon] = fmtDateShort(e.date).split(" ");
            return (
              <div key={e.id} role="button" tabIndex={0} onClick={() => onOpen(e.id)} className={`reveal group grid cursor-pointer grid-cols-[26px_52px_1fr_auto] items-center gap-3 px-4 py-3 hover:bg-pine-800/70 md:grid-cols-[30px_120px_1fr_110px_170px_96px] ${i > 0 ? "border-t border-line/70" : ""} ${past ? "opacity-70" : ""} ${isSel ? "bg-saffron/6" : ""}`} style={{ animationDelay: `${Math.min(i * 45, 400)}ms` }}>
                {past ? <span aria-hidden className="grid place-items-center text-[11px] text-sage">✓</span> : <button onClick={(ev) => { ev.stopPropagation(); toggleSelect(e.id); }} aria-label="В общий список закупок" className="tap grid place-items-center">
                  <span className={`grid h-[22px] w-[22px] place-items-center rounded-[7px] border transition-all ${isSel ? "anim-pop border-saffron bg-saffron text-pine-950" : "border-pine-500 text-transparent hover:border-saffron/60"}`}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg></span>
                </button>}
                <div className="grid h-[46px] w-[52px] place-items-center rounded-[11px] border border-line bg-pine-800 text-center"><div><p className="font-display text-[15px] leading-none text-saffron">{day}</p><p className="mt-0.5 text-[8.5px] font-bold uppercase tracking-wide text-sage">{mon}</p></div></div>
                <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="truncate text-[13.5px] font-semibold text-cream">{e.name}</p><span className="inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.05em]" style={{ color: st.fg, background: st.bg }}>{e.type}</span></div><p className="mt-0.5 text-[11px] text-sage">{fmtDateShort(e.date)} · {daysUntilLabel(e.date)} · {e.dishes.length} {plural(e.dishes.length, ["блюдо", "блюда", "блюд"])}<span className="md:hidden"> · {e.guests} {plural(e.guests, ["гость", "гостя", "гостей"])} · {e.tablesCount} {plural(e.tablesCount, ["стол", "стола", "столов"])}</span></p></div>
                <div className="hidden text-right md:block"><p className="font-display text-[14px] text-cream">{e.guests}</p></div>
                <div className="text-right"><p className="font-display text-[15px] font-bold leading-tight text-saffron">{fmtMoney(sum.grand)}</p><p className="hidden text-[10px] text-sage md:block">≈ {fmtMoney(sum.perGuest)}/гостя</p></div>
                <div className="hidden md:flex items-center justify-end gap-1 opacity-50 group-hover:opacity-100" onClick={(ev) => ev.stopPropagation()}><DangerConfirm onConfirm={() => { deleteEvent(e.id); toast("Мероприятие удалено", "del"); }} /></div>
              </div>
            );
          })}
        </div>
          )}
        </>
      )}
      {selectedEvents.length > 0 && (
        <div className="anim-modal fixed inset-x-0 bottom-[76px] z-40 mx-auto flex w-[calc(100%-24px)] max-w-[600px] items-center gap-2.5 rounded-[16px] border border-saffron/30 bg-pine-850/95 px-4 py-3 shadow-[0_18px_50px_rgba(0,0,0,0.55)] backdrop-blur-md md:bottom-6">
          <p className="min-w-0 grow truncate text-[12.5px] font-semibold text-cream">Выбрано: {selectedEvents.length} <span className="font-normal text-sage">{selectedEvents.length === 1 ? "— отметьте ещё одно" : plural(selectedEvents.length, ["мероприятие", "мероприятия", "мероприятий"])}</span></p>
          <button onClick={() => setSelected([])} aria-label="Сбросить выбор" className="tap grid h-9 w-9 shrink-0 place-items-center rounded-[11px] border border-line text-sage hover:text-coral"><IcX size={15} /></button>
          <button onClick={() => setMultiOpen(true)} disabled={selectedEvents.length < 2} className="tap flex shrink-0 items-center gap-2 rounded-[12px] bg-saffron px-3 py-2.5 font-display text-[11px] font-bold text-pine-950 hover:brightness-110 disabled:opacity-35 sm:px-4 sm:text-[12px]"><span className="sm:hidden">Общий список</span><span className="hidden sm:inline">Общий список закупок</span></button>
        </div>
      )}
      {state.combinedShoppingLists.length > 0 && (
        <div className="reveal mt-6">
          <h2 className="mb-3 font-display text-[18px] text-cream">Общие списки закупок</h2>
          <div className="space-y-2">
            {state.combinedShoppingLists.map((list) => (
              <div key={list.id} className="reveal flex items-center gap-3 rounded-[14px] border border-line bg-pine-800 p-3.5">
                <IcDoc size={20} className="text-saffron shrink-0" />
                <div className="min-w-0 grow">
                  <p className="truncate text-[13.5px] font-semibold text-cream">{list.name}</p>
                  <p className="mt-0.5 text-[11px] text-sage">
                    {list.eventIds.length} {plural(list.eventIds.length, ["мероприятие", "мероприятия", "мероприятий"])} · {list.items.length} позиций · {list.items.filter((i) => i.bought || i.inStock).length} отмечено
                  </p>
                </div>
                <button
                  onClick={() => setViewingList(list)}
                  className="tap rounded-[10px] border border-line px-3 py-1.5 text-[11px] font-semibold text-sage hover:border-saffron/50 hover:text-saffron"
                >
                  Открыть
                </button>
                <DangerConfirm
                  onConfirm={() => {
                    deleteCombinedShoppingList(list.id);
                    toast("Список удалён", "del");
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      )}
      <EventSheet open={open} onClose={() => setOpen(false)} editing={editing} />
      {multiOpen && selectedEvents.length > 0 && <MultiShoppingPreview events={selectedEvents} onClose={() => setMultiOpen(false)} />}
      {viewingList && <CombinedShoppingListView list={viewingList} onClose={() => setViewingList(null)} />}
    </section>
  );
}

function CombinedShoppingListView({ list, onClose }: { list: CombinedShoppingList; onClose: () => void }) {
  const { state, setShoppingStatus, setPurchasePlace } = useStore();
  const toast = useToast();
  const [sortMode, setSortMode] = useState<"category" | "place">("category");
  const currentList = state.combinedShoppingLists.find((entry) => entry.id === list.id) ?? list;

  const toggle = (productId: string, field: "bought" | "inStock") => {
    const item = currentList.items.find((entry) => entry.productId === productId);
    if (!item) return;
    const checked = !item[field];
    const eventIds = item.usedIn.length > 0
      ? item.usedIn.map((usage) => usage.eventId)
      : currentList.eventIds;
    setShoppingStatus(eventIds, productId, field, checked);
    toast("Отметка обновлена");
  };
  const updatePlace = (productId: string, place: string) => {
    const item = currentList.items.find((entry) => entry.productId === productId);
    if (!item) return;
    const eventIds = item.usedIn.length > 0
      ? item.usedIn.map((usage) => usage.eventId)
      : currentList.eventIds;
    setPurchasePlace(eventIds, productId, place);
  };
  
  const total = currentList.items.reduce((s, item) => s + item.cost, 0);
  const boughtCount = currentList.items.filter((i) => i.bought).length;
  const inStockCount = currentList.items.filter((i) => i.inStock).length;
  const orderedItems = sortMode === "place"
    ? [...currentList.items].sort((a, b) =>
        comparePurchasePlaces(a.purchasePlace, b.purchasePlace) || (state.products.find((product) => product.id === a.productId)?.name ?? "")
          .localeCompare(state.products.find((product) => product.id === b.productId)?.name ?? "", "ru"),
      )
    : currentList.items;
  const exportToExcel = async () => {
    try {
      const XLSX = await import("xlsx");
      const rows = orderedItems.flatMap((item) => {
        const product = state.products.find((entry) => entry.id === item.productId);
        if (!product) return [];
        const status = item.bought ? "Куплено" : item.inStock ? "На складе" : "К закупке";
        const usedIn = item.usedIn.map((usage) =>
          `${usage.eventName}: ${usage.dishes.map((dish) => dish.recipeName).join(", ")}`,
        ).join("; ");
        return [[
          product.name,
          product.category,
          isWeighed(product.unit) ? amountLabel(item.amount, product.unit) : pieceAmountLabel(product, item.amount),
          `${fmtMoney(product.price)}/${product.unit}`,
          fmtMoney(item.cost),
          item.purchasePlace ?? "",
          status,
          usedIn,
        ]];
      });
      const worksheet = XLSX.utils.aoa_to_sheet([
        [currentList.name],
        [`Объединено мероприятий: ${currentList.eventIds.length}`],
        [],
        ["Продукт", "Категория", "Количество", "Цена за единицу", "Стоимость", "Место покупки", "Статус", "Мероприятие и блюда"],
        ...rows,
        [],
        ["", "", "", "Итого:", fmtMoney(total), "", "", ""],
      ]);
      worksheet["!cols"] = [
        { wch: 28 }, { wch: 20 }, { wch: 18 }, { wch: 18 }, { wch: 16 }, { wch: 24 }, { wch: 16 }, { wch: 60 },
      ];
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Общий список");
      XLSX.writeFile(workbook, `${currentList.name.replace(/[\\/:*?"<>|]/g, "-")}.xlsx`);
    } catch (error) {
      console.error("Не удалось экспортировать общий список закупок в Excel.", error);
      toast("Не удалось сохранить файл Excel", "del");
    }
  };
  
  return (
    <div className="print-host print-list-host fixed inset-0 z-[80] flex items-center justify-center bg-[#04100c]/97 backdrop-blur-md">
      <div className="print-list-modal w-full max-w-[900px] max-h-[90vh] overflow-y-auto rounded-[16px] border border-line bg-pine-900 shadow-2xl print:max-h-none print:max-w-none print:overflow-visible print:rounded-none print:border-0 print:bg-white print:shadow-none">
        <div className="no-print sticky top-0 z-10 flex items-center justify-between border-b border-line bg-pine-900 px-6 py-4">
          <div>
            <h2 className="font-display text-[18px] text-cream">{currentList.name}</h2>
            <p className="mt-1 text-[12px] text-sage">
              {currentList.eventIds.length} {plural(currentList.eventIds.length, ["мероприятие", "мероприятия", "мероприятий"])} · {currentList.items.length} позиций
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => void exportToExcel()} className="tap flex items-center gap-1.5 rounded-[10px] border border-line px-3 py-2 text-[11px] font-semibold text-sage hover:text-mint">
              <IcDownload size={14} /> <span className="hidden sm:inline">Сохранить в Excel</span>
            </button>
            <button onClick={() => window.print()} className="tap flex items-center gap-1.5 rounded-[10px] bg-saffron px-3 py-2 text-[11px] font-semibold text-pine-950 hover:brightness-110">
              <IcPrinter size={14} /> <span className="hidden sm:inline">Сохранить в PDF</span>
            </button>
            <button onClick={onClose} aria-label="Закрыть" className="tap grid h-9 w-9 place-items-center rounded-full border border-line text-sage hover:text-cream">
              <IcX size={16} />
            </button>
          </div>
        </div>
        <div className="no-print p-6">
          <div className="mb-4 grid grid-cols-3 gap-3">
            <div className="rounded-[12px] border border-line bg-pine-800 p-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-sage">Всего</p>
              <p className="mt-1 font-display text-[20px] text-cream">{currentList.items.length}</p>
            </div>
            <div className="rounded-[12px] border border-mint/30 bg-mint/5 p-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-mint">Куплено</p>
              <p className="mt-1 font-display text-[20px] text-mint">{boughtCount}</p>
            </div>
            <div className="rounded-[12px] border border-glacier/30 bg-glacier/5 p-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-glacier">На складе</p>
              <p className="mt-1 font-display text-[20px] text-glacier">{inStockCount}</p>
            </div>
          </div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[13px] text-sage">Итого к закупке: <span className="font-display font-bold text-saffron">{fmtMoney(total)}</span></p>
            <Segmented options={[{ value: "category", label: "По категориям" }, { value: "place", label: "По месту покупки" }]} value={sortMode} onChange={setSortMode} />
          </div>
          {(() => {
            const groups = new Map<string, typeof currentList.items>();
            for (const item of currentList.items) {
              const product = state.products.find((p) => p.id === item.productId);
              if (!product) continue;
              const place = item.purchasePlace?.trim();
              const key = sortMode === "category" ? product.category : place ?? "";
              const group = groups.get(key);
              if (group) group.push(item);
              else groups.set(key, [item]);
            }
            const sortedGroups = Array.from(groups.keys()).sort((a, b) => sortMode === "category"
              ? compareProductCategories(a, b, state.productCategories)
              : comparePurchasePlaces(a, b));
            return sortedGroups.map((groupName) => {
              const items = groups.get(groupName)!;
              const categoryTotal = items.reduce((s, item) => s + item.cost, 0);
              return (
                <div key={groupName} className="mt-5">
                  <div className="mb-2 flex items-center gap-2 border-b border-line pb-1">
                    <span className="text-[12px] font-bold uppercase tracking-[0.1em] text-mint">{groupName || "Место не указано"}</span>
                    <span className="text-[11px] text-sage">· {items.length} поз.</span>
                    <span className="h-px grow bg-line" />
                    <span className="text-[11px] text-sage">{fmtMoney(categoryTotal)}</span>
                  </div>
                  <div className="space-y-2">
                    {items.map((item) => {
                      const product = state.products.find((p) => p.id === item.productId);
                      if (!product) return null;
                      return (
                        <div key={item.productId} className={`flex flex-wrap items-center gap-2.5 rounded-[12px] border px-3 py-2.5 ${item.bought || item.inStock ? "border-mint/25 bg-mint/5 opacity-80" : "border-line bg-pine-800"}`}>
                          <div className="min-w-0 grow">
                            <p className={`text-[13px] font-semibold ${item.bought || item.inStock ? "text-sage" : "text-cream"}`}>{product.name}</p>
                            <p className="text-[10.5px] text-sage">
                              {isWeighed(product.unit) ? amountLabel(item.amount, product.unit) : pieceAmountLabel(product, item.amount)} · {fmtMoney(item.cost)}
                            </p>
                            {item.usedIn.length > 0 && (
                              <div className="mt-1 text-[9px] text-sage">
                                {item.usedIn.map((u, i) => (
                                  <div key={i}>
                                    <span className="font-semibold text-cream">{u.eventName}</span>
                                    {u.dishes.map((d, j) => {
                                      const amountStr = isWeighed(product.unit) ? amountLabel(d.amount, product.unit) : pieceAmountLabel(product, d.amount);
                                      return (
                                        <span key={j}>
                                          {j === 0 ? ": " : ", "}
                                          <span>{d.recipeName} — {amountStr}</span>
                                        </span>
                                      );
                                    })}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <input
                            aria-label={`Где купить: ${product.name}`}
                            value={item.purchasePlace ?? ""}
                            onChange={(event) => updatePlace(item.productId, event.target.value)}
                            placeholder="Где купить?"
                            className={inputCls + " w-[130px] max-w-[42vw] py-1.5 text-[11px] sm:w-[180px] sm:text-[12px]"}
                          />
                          <button
                            onClick={() => toggle(item.productId, "inStock")}
                            className={`tap rounded-full border px-2.5 py-1 text-[10px] font-bold transition-colors ${item.inStock ? "border-glacier/50 bg-glacier/15 text-glacier" : "border-line text-sage hover:text-glacier"}`}
                          >
                            на складе
                          </button>
                          <button
                            onClick={() => toggle(item.productId, "bought")}
                            className={`tap rounded-full border px-2.5 py-1 text-[10px] font-bold transition-colors ${item.bought ? "border-mint/50 bg-mint/15 text-mint" : "border-line text-sage hover:text-mint"}`}
                          >
                            куплено
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            });
          })()}
        </div>
        <div id="print-root" className="print-list-content hidden print:block px-8 py-8" style={{ background: "#fefdfb", color: "#2d2420" }}>
          <h1 className="font-display text-[22px]">{currentList.name}</h1>
          <p className="mt-1 text-[11px]">
            Общий список закупок · {currentList.eventIds.length} {plural(currentList.eventIds.length, ["мероприятие", "мероприятия", "мероприятий"])} · {currentList.items.length} позиций
          </p>
          <table className="mt-5 w-full border-collapse text-[10px]">
            <thead>
              <tr style={{ background: "#f5f0e8" }}>
                {["Продукт", "Категория", "Количество", "Цена за единицу", "Стоимость", "Место покупки", "Статус", "Мероприятие и блюда"].map((title) => (
                  <th key={title} className="border-b p-2 text-left font-semibold" style={{ borderColor: "#e0d5c8" }}>{title}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orderedItems.map((item) => {
                const product = state.products.find((entry) => entry.id === item.productId);
                if (!product) return null;
                return (
                  <tr key={item.productId}>
                    <td className="border-b p-2" style={{ borderColor: "#e0d5c8" }}>{product.name}</td>
                    <td className="border-b p-2" style={{ borderColor: "#e0d5c8" }}>{product.category}</td>
                    <td className="border-b p-2" style={{ borderColor: "#e0d5c8" }}>
                      {isWeighed(product.unit) ? amountLabel(item.amount, product.unit) : pieceAmountLabel(product, item.amount)}
                    </td>
                    <td className="border-b p-2" style={{ borderColor: "#e0d5c8" }}>{fmtMoney(product.price)}/{product.unit}</td>
                    <td className="border-b p-2" style={{ borderColor: "#e0d5c8" }}>{fmtMoney(item.cost)}</td>
                    <td className="border-b p-2" style={{ borderColor: "#e0d5c8" }}>{item.purchasePlace || "—"}</td>
                    <td className="border-b p-2" style={{ borderColor: "#e0d5c8" }}>
                      {item.bought ? "Куплено" : item.inStock ? "На складе" : "К закупке"}
                    </td>
                    <td className="border-b p-2" style={{ borderColor: "#e0d5c8" }}>
                      {item.usedIn.length > 0 ? item.usedIn.map((usage) => (
                        <div key={usage.eventId} className="mb-1 last:mb-0">
                          <span className="font-semibold">{usage.eventName}:</span>
                          {" "}
                          {usage.dishes.map((dish) =>
                            `${dish.recipeName} (${isWeighed(product.unit) ? amountLabel(dish.amount, product.unit) : pieceAmountLabel(product, dish.amount)})`,
                          ).join(", ")}
                        </div>
                      )) : "—"}
                    </td>
                  </tr>
                );
              })}
              <tr>
                <td colSpan={4} className="p-2 text-right font-bold">Итого:</td>
                <td className="p-2 font-bold">{fmtMoney(total)}</td>
                <td />
                <td />
                <td />
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function EventSheet({ open, onClose, editing }: { open: boolean; onClose: () => void; editing: EventPlan | null }) {
  const { saveEvent } = useStore();
  const toast = useToast();
  const [name, setName] = useState("");
  const [type, setType] = useState<EventType>("Торжество");
  const [date, setDate] = useState(todayISO());
  const [guests, setGuests] = useState(20);
  const [guestsPerTable, setGuestsPerTable] = useState(6);
  const [tablesCount, setTablesCount] = useState(4);
  useEffect(() => {
    if (open) {
      setName(editing?.name ?? ""); setType(editing?.type ?? "Торжество");
      setDate(editing?.date ?? todayISO()); setGuests(editing?.guests ?? 20);
      const defaultGPT = (editing?.type ?? "Торжество") === "Торжество" ? 6 : 8;
      setGuestsPerTable(editing?.guestsPerTable ?? defaultGPT);
      setTablesCount(editing?.tablesCount ?? Math.ceil((editing?.guests ?? 20) / defaultGPT));
    }
  }, [open, editing]);
  const valid = name.trim().length > 0 && date !== "";
  const save = () => {
    if (!valid) return;
    saveEvent({ id: editing?.id ?? uid(), name: name.trim(), type, date, guests, guestsPerTable, tablesCount, discount: editing?.discount ?? 0, dishes: editing?.dishes ?? [], services: editing?.services ?? [], clientItems: editing?.clientItems ?? [], bought: editing?.bought ?? [], inStock: editing?.inStock ?? [], purchasePlaces: editing?.purchasePlaces ?? {}, comment: editing?.comment });
    toast(editing ? "Мероприятие обновлено" : "Мероприятие создано"); onClose();
  };
  return (
    <Modal open={open} onClose={onClose} title={editing ? "Мероприятие" : "Новое мероприятие"} subtitle="Тип влияет на оформление печатных форм" footer={
      <div className="flex items-center gap-3">
        <button onClick={onClose} className="tap shrink-0 rounded-[14px] border border-line px-5 py-3 font-display text-[13px] font-bold text-sage hover:text-cream">Отмена</button>
        <button onClick={save} disabled={!valid} className="tap grow rounded-[14px] bg-saffron py-3 font-display text-[13px] font-bold text-pine-950 disabled:opacity-35">Сохранить</button>
      </div>
    }>
      <div className="space-y-5">
        <Field label="Название"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Например, Свадьба Михаила и Елены" className={inputCls} autoFocus={!editing} /></Field>
        <Field label="Тип мероприятия"><div className="grid grid-cols-2 gap-2">{EVENT_TYPES.map((t) => { const st = EVENT_TYPE_STYLE[t]; const active = t === type; return (<button key={t} onClick={() => { setType(t); const gpt = t === "Торжество" ? 6 : 8; setGuestsPerTable(gpt); setTablesCount(Math.ceil(guests / gpt)); }} className="tap rounded-[12px] border py-3 text-[13px] font-semibold transition-colors" style={active ? { borderColor: st.fg, background: st.bg, color: st.fg } : { borderColor: "var(--color-line)", color: "var(--color-sage)" }}>{t}</button>); })}</div></Field>
        <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2"><Field label="Дата"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls + " font-display text-[13px]"} /></Field><Field label="Гостей"><StepperInput value={guests} onChange={(v) => { setGuests(v); setTablesCount(Math.ceil(v / guestsPerTable)); }} min={1} placeholder="Кол-во" /></Field></div>
        <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2"><Field label="Гостей за столом"><Stepper value={guestsPerTable} onChange={(v) => { setGuestsPerTable(v); setTablesCount(Math.ceil(guests / v)); }} min={1} /></Field><Field label="Столов"><Stepper value={tablesCount} onChange={setTablesCount} min={1} /></Field></div>
      </div>
    </Modal>
  );
}
