import { useMemo, useState } from "react";
import type { Tab } from "../types";
import { EVENT_TYPE_STYLE } from "../types";
import { useStore } from "../store";
import { daysUntil, daysUntilLabel, eventSummary, fmtDateShort, fmtMoney, plural, todayISO } from "../utils";
import { Chip, useCountUp } from "./UI";
import { IcArrowRight, IcCalendar, IcPlus, IcSpark, IcTask } from "./Icons";
import { TaskModal, TaskToggle, taskDueStyle } from "./TasksScreen";

export function Dashboard({ onOpenEvent, onGoTab }: { onOpenEvent: (id: string) => void; onGoTab: (t: Tab) => void }) {
  const { state, toggleTask } = useStore();
  const today = todayISO();
  const [taskOpen, setTaskOpen] = useState(false);
  const upcoming = useMemo(() => state.events.filter((e) => e.date >= today).sort((a, b) => a.date.localeCompare(b.date)), [state.events, today]);
  const upcomingSum = useMemo(() => upcoming.reduce((s, e) => s + eventSummary(e, state.recipes, state.products).grand, 0), [upcoming, state.recipes, state.products]);
  const animSum = useCountUp(upcomingSum, 700);
  const openTasks = useMemo(() => state.tasks.filter((t) => !t.done).sort((a, b) => a.dueDate.localeCompare(b.dueDate)), [state.tasks]);
  const hour = new Date().getHours();
  const hello = hour < 5 ? "Доброй ночи" : hour < 12 ? "Доброе утро" : hour < 18 ? "Добрый день" : "Добрый вечер";
  return (
    <section className="px-5 pb-8 pt-6 md:px-8">
      <header className="reveal flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-sage">{new Date().toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" })}</p>
          <h1 className="mt-1.5 font-display text-[26px] leading-tight text-cream">{hello}, шеф</h1>
          <p className="mt-2 text-[13px] text-sage">Впереди {upcoming.length} {plural(upcoming.length, ["мероприятие", "мероприятия", "мероприятий"])} на <span className="font-semibold text-saffron">{fmtMoney(animSum)}</span></p>
        </div>
        <button onClick={() => onGoTab("events")} className="tap flex items-center gap-2 rounded-[12px] bg-gradient-to-br from-saffron to-amber-500 px-4 py-2.5 font-display text-[12px] font-bold text-pine-950 shadow-lg shadow-saffron/20 hover:shadow-saffron/40 hover:scale-105"><IcCalendar size={16} /> Новое мероприятие</button>
      </header>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.25fr_1fr]">
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-display text-[16px]"><IcSpark size={16} className="text-saffron" /> Ближайшие мероприятия</h2>
            <button onClick={() => onGoTab("events")} className="tap flex items-center gap-1 text-[12px] font-semibold text-sage hover:text-saffron">все <IcArrowRight size={13} /></button>
          </div>
          {upcoming.length === 0 ? (
            <p className="rounded-[14px] border border-dashed border-pine-500/70 px-4 py-6 text-center text-[12.5px] text-sage">Впереди пока пусто — самое время запланировать событие</p>
          ) : (
            <div className="space-y-2.5">
              {upcoming.slice(0, 4).map((e, i) => {
                const sum = eventSummary(e, state.recipes, state.products);
                const st = EVENT_TYPE_STYLE[e.type];
                const soon = daysUntil(e.date) <= 14;
                const [day, mon] = fmtDateShort(e.date).split(" ");
                return (
                  <button key={e.id} onClick={() => onOpenEvent(e.id)} className="reveal card-hover flex w-full items-center gap-3.5 rounded-[16px] border border-line bg-gradient-to-br from-pine-800 to-pine-850 p-4 text-left" style={{ animationDelay: `${120 + i * 70}ms` }}>
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] border border-saffron/30 bg-pine-700/80 text-center">
                      <div>
                        <p className="font-display text-[15px] leading-none text-saffron">{day}</p>
                        <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wide text-sage">{mon}</p>
                      </div>
                    </div>
                    <div className="min-w-0 grow">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-[13.5px] font-semibold text-cream">{e.name}</p>
                        {soon && <Chip className="border border-saffron/50 bg-saffron/20 text-saffron">{daysUntilLabel(e.date)}</Chip>}
                      </div>
                      <p className="mt-1 flex flex-wrap items-center gap-2 text-[11.5px] text-sage">
                        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ color: st.fg, background: st.bg }}>{e.type}</span>
                        {e.guests} {plural(e.guests, ["гость", "гостя", "гостей"])} · {e.tablesCount} {plural(e.tablesCount, ["стол", "стола", "столов"])} · {e.dishes.length} {plural(e.dishes.length, ["блюдо", "блюда", "блюд"])}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-display text-[15px] font-bold text-saffron">{fmtMoney(sum.grand)}</p>
                      <p className="text-[10.5px] text-sage">≈ {fmtMoney(sum.perGuest)}/гостя</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-display text-[16px]"><IcTask size={16} className="text-mint" /> Задачи</h2>
            <button onClick={() => onGoTab("tasks")} className="tap flex items-center gap-1 text-[12px] font-semibold text-sage hover:text-saffron">все <IcArrowRight size={13} /></button>
          </div>
          {openTasks.length === 0 ? (
            <p className="rounded-[14px] border border-dashed border-pine-500/70 px-4 py-6 text-center text-[12.5px] text-sage">Открытых задач нет — можно выдохнуть</p>
          ) : (
            <div className="space-y-2">
              {openTasks.slice(0, 5).map((t, i) => {
                const ev = t.eventId ? state.events.find((e) => e.id === t.eventId) : null;
                const due = taskDueStyle(t);
                return (
                  <div key={t.id} className="reveal flex items-center gap-3 rounded-[14px] border border-line bg-pine-800 px-3.5 py-3" style={{ animationDelay: `${160 + i * 60}ms` }}>
                    <TaskToggle done={t.done} onToggle={() => toggleTask(t.id)} />
                    <div className="min-w-0 grow">
                      <p className="truncate text-[12.5px] font-semibold leading-snug text-cream">{t.title}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[9.5px] font-bold" style={{ color: due.fg, background: due.bg }}>{due.label}</span>
                        {ev && <button onClick={() => onOpenEvent(ev.id)} className="tap max-w-[150px] truncate rounded-full border border-line bg-pine-700 px-2 py-0.5 text-[9.5px] font-semibold text-sage hover:text-saffron">{ev.name}</button>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <button onClick={() => setTaskOpen(true)} className="tap mt-2.5 flex w-full items-center justify-center gap-2 rounded-[14px] border border-dashed border-pine-500 py-3 text-[12.5px] font-semibold text-sage hover:border-mint/50 hover:text-mint"><IcPlus size={15} /> Быстрая задача</button>
        </div>
      </div>
      <TaskModal open={taskOpen} onClose={() => setTaskOpen(false)} editing={null} />
    </section>
  );
}
