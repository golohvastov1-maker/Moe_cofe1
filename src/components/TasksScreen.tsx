import { useEffect, useMemo, useState } from "react";
import type { Task } from "../types";
import { useStore } from "../store";
import { addDaysISO, daysUntil, fmtDateShort, plural, todayISO, uid } from "../utils";
import { DangerConfirm, EmptyState, Field, Modal, Segmented, inputCls, selectCls, useToast } from "./UI";
import { IcPencil, IcPlus, IcTask } from "./Icons";

type TimeFilter = "all" | "overdue" | "today" | "week" | "later" | "done";

export function taskDueStyle(t: Task): { fg: string; bg: string; label: string } {
  const n = daysUntil(t.dueDate);
  if (t.done) return { fg: "#9abfae", bg: "rgba(154,191,174,0.15)", label: `выполнено · ${fmtDateShort(t.dueDate)}` };
  if (n < 0) return { fg: "#f07358", bg: "rgba(240,115,88,0.15)", label: `просрочено на ${-n} дн.` };
  if (n === 0) return { fg: "#f5b042", bg: "rgba(245,176,66,0.15)", label: "сегодня" };
  if (n === 1) return { fg: "#6ee7b7", bg: "rgba(110,231,183,0.15)", label: "завтра" };
  return { fg: "#b8c9db", bg: "rgba(184,201,219,0.15)", label: `через ${n} дн.` };
}

export function TaskToggle({ done, onToggle }: { done: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} aria-label={done ? "Вернуть в работу" : "Отметить выполненной"} className="tap shrink-0">
      <span className={`grid h-6 w-6 place-items-center rounded-[8px] border transition-colors ${done ? "border-mint bg-mint text-pine-950" : "border-pine-500 text-transparent hover:border-mint/60"}`}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
      </span>
    </button>
  );
}

export function TasksScreen({ onOpenEvent }: { onOpenEvent: (id: string) => void }) {
  const { state, toggleTask, deleteTask } = useStore();
  const toast = useToast();
  const [filter, setFilter] = useState<TimeFilter>("all");
  const [sheet, setSheet] = useState<{ open: boolean; editing: Task | null }>({ open: false, editing: null });
  const today = todayISO();
  const weekEnd = addDaysISO(7);
  const sorted = useMemo(() => [...state.tasks].sort((a, b) => { if (a.done !== b.done) return a.done ? 1 : -1; return a.dueDate.localeCompare(b.dueDate); }), [state.tasks]);
  const filtered = sorted.filter((t) => {
    switch (filter) {
      case "overdue": return !t.done && t.dueDate < today;
      case "today": return !t.done && t.dueDate === today;
      case "week": return !t.done && t.dueDate > today && t.dueDate <= weekEnd;
      case "later": return !t.done && t.dueDate > weekEnd;
      case "done": return t.done;
      default: return true;
    }
  });
  const doneCount = state.tasks.filter((t) => t.done).length;
  const progress = state.tasks.length ? doneCount / state.tasks.length : 0;
  const countFor = (f: TimeFilter): number => {
    switch (f) {
      case "overdue": return state.tasks.filter((t) => !t.done && t.dueDate < today).length;
      case "today": return state.tasks.filter((t) => !t.done && t.dueDate === today).length;
      case "week": return state.tasks.filter((t) => !t.done && t.dueDate > today && t.dueDate <= weekEnd).length;
      case "later": return state.tasks.filter((t) => !t.done && t.dueDate > weekEnd).length;
      case "done": return doneCount;
      default: return state.tasks.length;
    }
  };
  return (
    <section className="px-5 pb-8 pt-6 md:px-8">
      <header className="reveal flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="font-display text-[26px] leading-none text-cream">Задачи</h1><p className="mt-2 text-[13px] text-sage">Выполнено {doneCount} из {state.tasks.length} · привязывайте задачи к мероприятиям</p></div>
        <button onClick={() => setSheet({ open: true, editing: null })} className="tap flex items-center gap-2 rounded-[12px] bg-gradient-to-br from-saffron to-amber-500 px-4 py-2.5 font-display text-[12px] font-bold text-pine-950 shadow-lg shadow-saffron/20 hover:scale-105"><IcPlus size={16} /> Задача</button>
      </header>
      {state.tasks.length > 0 && (<div className="reveal mt-4 h-1.5 overflow-hidden rounded-full bg-pine-600"><div className="h-full rounded-full bg-mint transition-all duration-500 ease-out" style={{ width: `${progress * 100}%` }} /></div>)}
      <div className="mt-4"><Segmented options={[{ value: "all", label: `Все · ${countFor("all")}` }, { value: "overdue", label: `Просрочено · ${countFor("overdue")}` }, { value: "today", label: `Сегодня · ${countFor("today")}` }, { value: "week", label: `Неделя · ${countFor("week")}` }, { value: "later", label: `Позже · ${countFor("later")}` }, { value: "done", label: `Готово · ${countFor("done")}` }]} value={filter} onChange={setFilter} /></div>
      {state.tasks.length === 0 ? (<EmptyState icon={<IcTask size={24} />} title="Задач пока нет" text="Запишите, что нужно сделать к мероприятиям." action={<button onClick={() => setSheet({ open: true, editing: null })} className="tap rounded-full bg-saffron px-5 py-2.5 font-display text-[12px] font-bold text-pine-950">Новая задача</button>} />) : filtered.length === 0 ? (<p className="reveal mt-10 text-center text-[13px] text-sage">В этом промежутке задач нет</p>) : (
        <div className="mt-4 space-y-2">
          {filtered.map((t, i) => {
            const ev = t.eventId ? state.events.find((e) => e.id === t.eventId) : null;
            const due = taskDueStyle(t);
            return (
              <div key={t.id} className={`reveal flex items-center gap-3 rounded-[14px] border border-line bg-pine-800 px-3.5 py-3 transition-opacity ${t.done ? "opacity-70" : ""}`} style={{ animationDelay: `${Math.min(i * 40, 360)}ms` }}>
                <TaskToggle done={t.done} onToggle={() => toggleTask(t.id)} />
                <div className="min-w-0 grow">
                  <p className={`truncate text-[13.5px] font-semibold leading-snug ${t.done ? "text-sage line-through decoration-mint/60" : "text-cream"}`}>{t.title}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ color: due.fg, background: due.bg }}>{due.label}</span>
                    {ev && <button onClick={() => onOpenEvent(ev.id)} className="tap max-w-[180px] truncate rounded-full border border-line bg-pine-700 px-2 py-0.5 text-[10px] font-semibold text-sage hover:text-saffron">{ev.name}</button>}
                  </div>
                </div>
                <button onClick={() => setSheet({ open: true, editing: t })} aria-label="Редактировать задачу" className="tap grid h-8 w-8 shrink-0 place-items-center rounded-[10px] border border-line text-sage hover:text-cream"><IcPencil size={13} /></button>
                <div className="shrink-0"><DangerConfirm onConfirm={() => { deleteTask(t.id); toast("Задача удалена", "del"); }} /></div>
              </div>
            );
          })}
        </div>
      )}
      <TaskModal open={sheet.open} onClose={() => setSheet({ open: false, editing: null })} editing={sheet.editing} />
    </section>
  );
}

export function TaskModal({ open, onClose, editing, eventId }: { open: boolean; onClose: () => void; editing: Task | null; eventId?: string | null }) {
  const { state, saveTask, deleteTask } = useStore();
  const toast = useToast();
  const [title, setTitle] = useState("");
  const [evId, setEvId] = useState<string>("");
  const [due, setDue] = useState(addDaysISO(1));
  useEffect(() => { if (open) { setTitle(editing?.title ?? ""); setEvId(editing?.eventId ?? eventId ?? ""); setDue(editing?.dueDate ?? addDaysISO(1)); } }, [open, editing, eventId]);
  const valid = title.trim().length > 0 && due !== "";
  const save = () => { if (!valid) return; saveTask({ id: editing?.id ?? uid(), title: title.trim(), eventId: evId || null, dueDate: due, done: editing?.done ?? false, createdAt: editing?.createdAt ?? todayISO() }); toast(editing ? "Задача обновлена" : "Задача добавлена"); onClose(); };
  return (
    <Modal open={open} onClose={onClose} title={editing ? "Задача" : "Новая задача"} subtitle="Срок подсвечивается по срочности" footer={
      <div className="flex items-center gap-3">
        {editing && <DangerConfirm hint="удалить?" onConfirm={() => { deleteTask(editing.id); toast("Задача удалена", "del"); onClose(); }} />}
        <button onClick={onClose} className="tap shrink-0 rounded-[14px] border border-line px-5 py-3 font-display text-[13px] font-bold text-sage hover:text-cream">Отмена</button>
        <button onClick={save} disabled={!valid} className="tap grow rounded-[14px] bg-saffron py-3 font-display text-[13px] font-bold text-pine-950 disabled:opacity-35">Сохранить</button>
      </div>
    }>
      <div className="space-y-5">
        <Field label="Что сделать"><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Например, согласовать меню с клиентом" className={inputCls} autoFocus={!editing} /></Field>
        <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2">
          <Field label="Срок"><input type="date" value={due} onChange={(e) => setDue(e.target.value)} className={inputCls + " font-display text-[13px]"} /></Field>
          <Field label="Мероприятие"><select value={evId} onChange={(e) => setEvId(e.target.value)} className={selectCls}><option value="">Без привязки</option>{[...state.events].sort((a, b) => a.date.localeCompare(b.date)).map((e) => (<option key={e.id} value={e.id}>{fmtDateShort(e.date)} · {e.name}</option>))}</select></Field>
        </div>
      </div>
    </Modal>
  );
}
