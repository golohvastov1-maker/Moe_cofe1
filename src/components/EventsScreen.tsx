import { useEffect, useMemo, useState } from "react";
import type { EventPlan, EventType } from "../types";
import { EVENT_TYPE_STYLE, EVENT_TYPES } from "../types";
import { useStore } from "../store";
import { daysUntilLabel, eventSummary, fmtDateShort, fmtMoney, plural, todayISO, uid } from "../utils";
import { DangerConfirm, EmptyState, Field, Modal, Segmented, Stepper, inputCls, useToast } from "./UI";
import { IcCalendar, IcPlus, IcSearch, IcX } from "./Icons";
import { MultiShoppingPreview } from "./PrintDocs";

export function EventsScreen({ onOpen }: { onOpen: (id: string) => void }) {
  const { state, deleteEvent } = useStore();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<EventPlan | null>(null);
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState<EventType | "все">("все");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [multiOpen, setMultiOpen] = useState(false);
  const toggleSelect = (id: string) => setSelected((xs) => (xs.includes(id) ? xs.filter((x) => x !== id) : [...xs, id]));
  const selectedEvents = selected.map((id) => state.events.find((e) => e.id === id)).filter((e): e is EventPlan => !!e);
  const hasFilters = q !== "" || typeFilter !== "все" || from !== "" || to !== "";
  const filtered = useMemo(() => state.events.filter((e) => { const okQ = !q || e.name.toLowerCase().includes(q.trim().toLowerCase()); const okT = typeFilter === "все" || e.type === typeFilter; const okFrom = !from || e.date >= from; const okTo = !to || e.date <= to; return okQ && okT && okFrom && okTo; }).sort((a, b) => a.date.localeCompare(b.date)), [state.events, q, typeFilter, from, to]);
  const upcomingCount = state.events.filter((e) => e.date >= todayISO()).length;
  return (
    <section className="px-5 pb-8 pt-6 md:px-8">
      <header className="reveal flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="font-display text-[26px] leading-none text-cream">Мероприятия</h1><p className="mt-2 text-[13px] text-sage">{upcomingCount} предстоящих · меню, услуги, скидки и пакет документов</p></div>
        <button onClick={() => { setEditing(null); setOpen(true); }} className="tap flex items-center gap-2 rounded-[12px] bg-gradient-to-br from-saffron to-amber-500 px-4 py-2.5 font-display text-[12px] font-bold text-pine-950 shadow-lg shadow-saffron/20 hover:scale-105"><IcPlus size={16} /> Мероприятие</button>
      </header>
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[190px] grow sm:max-w-[260px]"><IcSearch size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sage" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Название…" className={inputCls + " pl-10"} /></div>
        <Segmented options={[{ value: "все", label: "Все" }, ...EVENT_TYPES.map((t) => ({ value: t, label: t }))]} value={typeFilter} onChange={setTypeFilter} />
        <div className="flex items-center gap-1.5 text-[12px] text-sage"><span className="hidden sm:inline">с</span><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputCls + " w-[138px] py-2 text-[12.5px]"} /><span>по</span><input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputCls + " w-[138px] py-2 text-[12.5px]"} /></div>
        {hasFilters && <button onClick={() => { setQ(""); setTypeFilter("все"); setFrom(""); setTo(""); }} className="tap rounded-full border border-line px-3 py-1.5 text-[11.5px] font-semibold text-sage hover:text-coral">Сбросить</button>}
      </div>
      {state.events.length === 0 ? (<EmptyState icon={<IcCalendar size={24} />} title="Мероприятий пока нет" text="Создайте событие." action={<button onClick={() => { setEditing(null); setOpen(true); }} className="tap rounded-full bg-saffron px-5 py-2.5 font-display text-[12px] font-bold text-pine-950">Новое мероприятие</button>} />) : filtered.length === 0 ? (<p className="reveal mt-10 text-center text-[13px] text-sage">В выбранном периоде событий нет</p>) : (
        <div className="reveal mt-5 overflow-hidden rounded-[16px] border border-line bg-pine-850">
          {filtered.map((e, i) => {
            const sum = eventSummary(e, state.recipes, state.products);
            const st = EVENT_TYPE_STYLE[e.type];
            const past = e.date < todayISO();
            const isSel = selected.includes(e.id);
            const [day, mon] = fmtDateShort(e.date).split(" ");
            return (
              <div key={e.id} role="button" tabIndex={0} onClick={() => onOpen(e.id)} className={`reveal group grid cursor-pointer grid-cols-[26px_52px_1fr_auto] items-center gap-3 px-4 py-3 hover:bg-pine-800/70 md:grid-cols-[30px_120px_1fr_110px_170px_96px] ${i > 0 ? "border-t border-line/70" : ""} ${past ? "opacity-70" : ""} ${isSel ? "bg-saffron/6" : ""}`} style={{ animationDelay: `${Math.min(i * 45, 400)}ms` }}>
                <button onClick={(ev) => { ev.stopPropagation(); toggleSelect(e.id); }} aria-label="В общий список закупок" className="tap grid place-items-center">
                  <span className={`grid h-[22px] w-[22px] place-items-center rounded-[7px] border transition-all ${isSel ? "anim-pop border-saffron bg-saffron text-pine-950" : "border-pine-500 text-transparent hover:border-saffron/60"}`}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg></span>
                </button>
                <div className="grid h-[46px] w-[52px] place-items-center rounded-[11px] border border-line bg-pine-800 text-center"><div><p className="font-display text-[15px] leading-none text-saffron">{day}</p><p className="mt-0.5 text-[8.5px] font-bold uppercase tracking-wide text-sage">{mon}</p></div></div>
                <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="truncate text-[13.5px] font-semibold text-cream">{e.name}</p><span className="inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.05em]" style={{ color: st.fg, background: st.bg }}>{e.type}</span>{e.comment && <span className="inline-flex shrink-0 items-center rounded-full border border-glacier/30 bg-glacier/10 px-2 py-0.5 text-[9px] font-bold uppercase text-glacier">есть заметка</span>}</div><p className="mt-0.5 text-[11px] text-sage">{fmtDateShort(e.date)} · {daysUntilLabel(e.date)} · {e.dishes.length} {plural(e.dishes.length, ["блюдо", "блюда", "блюд"])}<span className="md:hidden"> · {e.guests} {plural(e.guests, ["гость", "гостя", "гостей"])} · {e.tablesCount} {plural(e.tablesCount, ["стол", "стола", "столов"])}</span></p>{e.comment && <p className="mt-1 truncate text-[10.5px] text-glacier/80">{e.comment}</p>}</div>
                <div className="hidden text-right md:block"><p className="font-display text-[14px] text-cream">{e.guests}</p></div>
                <div className="text-right"><p className="font-display text-[15px] font-bold leading-tight text-saffron">{fmtMoney(sum.grand)}</p><p className="hidden text-[10px] text-sage md:block">≈ {fmtMoney(sum.perGuest)}/гостя</p></div>
                <div className="hidden md:flex items-center justify-end gap-1 opacity-50 group-hover:opacity-100" onClick={(ev) => ev.stopPropagation()}><DangerConfirm onConfirm={() => { deleteEvent(e.id); toast("Мероприятие удалено", "del"); }} /></div>
              </div>
            );
          })}
        </div>
      )}
      {selectedEvents.length > 0 && (
        <div className="anim-modal fixed inset-x-0 bottom-[76px] z-40 mx-auto flex w-[calc(100%-24px)] max-w-[600px] items-center gap-2.5 rounded-[16px] border border-saffron/30 bg-pine-850/95 px-4 py-3 shadow-[0_18px_50px_rgba(0,0,0,0.55)] backdrop-blur-md md:bottom-6">
          <p className="min-w-0 grow truncate text-[12.5px] font-semibold text-cream">Выбрано: {selectedEvents.length} <span className="font-normal text-sage">{selectedEvents.length === 1 ? "— отметьте ещё одно" : plural(selectedEvents.length, ["мероприятие", "мероприятия", "мероприятий"])}</span></p>
          <button onClick={() => setSelected([])} aria-label="Сбросить выбор" className="tap grid h-9 w-9 shrink-0 place-items-center rounded-[11px] border border-line text-sage hover:text-coral"><IcX size={15} /></button>
          <button onClick={() => setMultiOpen(true)} disabled={selectedEvents.length < 2} className="tap flex shrink-0 items-center gap-2 rounded-[12px] bg-saffron px-4 py-2.5 font-display text-[12px] font-bold text-pine-950 hover:brightness-110 disabled:opacity-35">Общий список закупок</button>
        </div>
      )}
      <EventSheet open={open} onClose={() => setOpen(false)} editing={editing} />
      {multiOpen && selectedEvents.length > 0 && <MultiShoppingPreview events={selectedEvents} onClose={() => setMultiOpen(false)} />}
    </section>
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
  const [comment, setComment] = useState("");
  useEffect(() => {
    if (open) {
      setName(editing?.name ?? ""); setType(editing?.type ?? "Торжество");
      setDate(editing?.date ?? todayISO()); setGuests(editing?.guests ?? 20);
      const defaultGPT = (editing?.type ?? "Торжество") === "Торжество" ? 6 : 8;
      setGuestsPerTable(editing?.guestsPerTable ?? defaultGPT);
      setTablesCount(editing?.tablesCount ?? Math.ceil((editing?.guests ?? 20) / defaultGPT));
      setComment(editing?.comment ?? "");
    }
  }, [open, editing]);
  const valid = name.trim().length > 0 && date !== "";
  const save = () => {
    if (!valid) return;
    saveEvent({ id: editing?.id ?? uid(), name: name.trim(), type, date, guests, guestsPerTable, tablesCount, discount: editing?.discount ?? 0, dishes: editing?.dishes ?? [], services: editing?.services ?? [], clientItems: editing?.clientItems ?? [], bought: editing?.bought ?? [], inStock: editing?.inStock ?? [], comment: comment.trim() || undefined });
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
        <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2"><Field label="Дата"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls + " font-display text-[13px]"} /></Field><Field label="Гостей"><Stepper value={guests} onChange={(v) => { setGuests(v); setTablesCount(Math.ceil(v / guestsPerTable)); }} min={1} /></Field></div>
        <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2"><Field label="Гостей за столом"><Stepper value={guestsPerTable} onChange={(v) => { setGuestsPerTable(v); setTablesCount(Math.ceil(guests / v)); }} min={1} /></Field><Field label="Столов"><Stepper value={tablesCount} onChange={setTablesCount} min={1} /></Field></div>
        <Field label="Комментарий" hint="Только для приложения, не отображается в документах"><textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Предпочтения клиента, особенности…" rows={3} className={inputCls + " resize-none"} /></Field>
      </div>
    </Modal>
  );
}
