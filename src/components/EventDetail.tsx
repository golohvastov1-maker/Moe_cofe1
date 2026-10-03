import { useState } from "react";
import type { EventPlan } from "../types";
import { useStore } from "../store";
import { fmtDateShort, fmtMoney, plural } from "../utils";
import { IcChevronLeft, IcPencil, IcUsers } from "./Icons";
import { DangerConfirm } from "./UI";
import { EventSheet } from "./EventsScreen";
import { EventDocPreview } from "./PrintDocs";

export function EventDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const { state, deleteEvent } = useStore();
  const ev = state.events.find((e) => e.id === id);
  const [editOpen, setEditOpen] = useState(false);
  const [docKind, setDocKind] = useState<"chef" | "shopping" | "invoice" | null>(null);
  
  if (!ev) return <div className="px-5 pt-10 text-center"><p className="font-display text-[15px]">Мероприятие не найдено</p><button onClick={onBack} className="tap mt-4 rounded-full border border-line px-5 py-2.5 text-[13px] font-semibold text-sage">К списку</button></div>;
  
  return (
    <section className="px-5 pb-8 pt-5 md:px-8">
      <div className="reveal flex items-center gap-2">
        <button onClick={onBack} aria-label="Назад" className="tap grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line text-sage hover:text-cream"><IcChevronLeft size={18} /></button>
        <div className="min-w-0 grow">
          <div className="flex items-center gap-2"><h1 className="truncate font-display text-[19px] leading-tight text-cream">{ev.name}</h1><span className="inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.05em]" style={{ color: ev.type === "Торжество" ? "#f4a83a" : "#aebfd2", background: ev.type === "Торжество" ? "rgba(244,168,58,0.13)" : "rgba(174,191,210,0.13)" }}>{ev.type}</span></div>
          <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-sage">{fmtDateShort(ev.date)} · <IcUsers size={12} /> {ev.guests} {plural(ev.guests, ["гость", "гостя", "гостей"])} · {ev.tablesCount} {plural(ev.tablesCount, ["стол", "стола", "столов"])} по {ev.guestsPerTable} чел.</p>
        </div>
        <button onClick={() => setEditOpen(true)} aria-label="Изменить" className="tap flex items-center gap-1.5 rounded-[11px] border border-line px-2.5 py-2 text-[12px] font-semibold text-sage hover:text-cream sm:px-3"><IcPencil size={14} /> <span className="hidden sm:inline">Изменить</span></button>
        <DangerConfirm onConfirm={() => { deleteEvent(ev.id); onBack(); }} />
      </div>
      
      {ev.comment && (
        <div className="reveal mx-0 mt-3 rounded-[14px] border border-glacier/30 bg-glacier/5 p-3.5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 grow"><p className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-glacier">Комментарий</p><p className="mt-1.5 text-[12px] leading-relaxed text-cream whitespace-pre-line">{ev.comment}</p></div>
            <button onClick={() => setEditOpen(true)} className="tap shrink-0 rounded-[8px] border border-glacier/30 bg-glacier/10 px-2 py-1 text-[10px] font-semibold text-glacier hover:bg-glacier/20">Изменить</button>
          </div>
        </div>
      )}
      
      <div className="mt-6 space-y-4">
        <div className="rounded-[16px] border border-line bg-pine-800 p-4">
          <h3 className="font-display text-[15px] text-cream">Меню</h3>
          <p className="mt-2 text-[13px] text-sage">Блюд: {ev.dishes.length}</p>
        </div>
        <div className="rounded-[16px] border border-line bg-pine-800 p-4">
          <h3 className="font-display text-[15px] text-cream">Услуги</h3>
          <p className="mt-2 text-[13px] text-sage">Услуг: {ev.services.length}</p>
          <p className="mt-1 text-[13px] text-sage">Общая скидка: {ev.discount}%</p>
        </div>
        <div className="rounded-[16px] border border-line bg-pine-800 p-4">
          <h3 className="font-display text-[15px] text-cream">Документы</h3>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <button onClick={() => setDocKind("chef")} className="tap rounded-[12px] border border-line bg-pine-700 p-3 text-left hover:border-saffron/50"><p className="text-[13px] font-semibold text-cream">Задание для поваров</p></button>
            <button onClick={() => setDocKind("shopping")} className="tap rounded-[12px] border border-line bg-pine-700 p-3 text-left hover:border-saffron/50"><p className="text-[13px] font-semibold text-cream">Список закупок</p></button>
            <button onClick={() => setDocKind("invoice")} className="tap rounded-[12px] border border-line bg-pine-700 p-3 text-left hover:border-saffron/50"><p className="text-[13px] font-semibold text-cream">Счёт для клиента</p></button>
          </div>
        </div>
        <div className="rounded-[16px] border border-saffron/25 p-4" style={{ background: "linear-gradient(135deg, rgba(244,168,58,0.15), rgba(244,168,58,0.03) 55%, rgba(126,217,176,0.08))" }}>
          <p className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-sage">Смета мероприятия</p>
          <p className="mt-1.5 font-display text-[30px] leading-none text-saffron">{fmtMoney(ev.services.reduce((s, svc) => s + svc.price * svc.quantity, 0))}</p>
        </div>
      </div>
      
      <EventSheet open={editOpen} onClose={() => setEditOpen(false)} editing={ev} />
      {docKind && <EventDocPreview kind={docKind} event={ev} onClose={() => setDocKind(null)} />}
    </section>
  );
}
