import { useState } from "react";
import type { Tab } from "./types";
import { StoreProvider } from "./store";
import { ToastProvider } from "./components/UI";
import { Dashboard } from "./components/Dashboard";
import { ProductsScreen, ServicesScreen, RequisitesScreen } from "./components/Screens";
import { RecipesScreen } from "./components/RecipesScreen";
import { EventsScreen } from "./components/EventsScreen";
import { EventDetail } from "./components/EventDetail";
import { TasksScreen } from "./components/TasksScreen";
import { BrandMark, IcBasket, IcBriefcase, IcCalendar, IcDash, IcHat, IcTask, IcDoc } from "./components/Icons";

const NAV: { id: Tab; label: string; short: string; Icon: typeof IcDash }[] = [
  { id: "dashboard", label: "Дашборд", short: "Главная", Icon: IcDash },
  { id: "events", label: "Мероприятия", short: "События", Icon: IcCalendar },
  { id: "tasks", label: "Задачи", short: "Задачи", Icon: IcTask },
  { id: "recipes", label: "Рецепты", short: "Рецепты", Icon: IcHat },
  { id: "products", label: "Продукты", short: "Продукты", Icon: IcBasket },
  { id: "services", label: "Услуги", short: "Услуги", Icon: IcBriefcase },
  { id: "requisites", label: "Реквизиты", short: "Реквизиты", Icon: IcDoc },
];

function Ambient() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
      <div className="glow-a absolute -top-44 left-1/4 h-[560px] w-[560px] rounded-full opacity-[0.15] blur-[120px]" style={{ background: "#f5b042" }} />
      <div className="glow-b absolute -bottom-56 right-1/4 h-[620px] w-[620px] rounded-full opacity-[0.14] blur-[130px]" style={{ background: "#265a44" }} />
      <div className="absolute right-[4%] top-1/3 h-[320px] w-[320px] rounded-full opacity-[0.08] blur-[90px]" style={{ background: "#6ee7b7" }} />
    </div>
  );
}

function AppInner() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [eventId, setEventId] = useState<string | null>(null);
  const goTab = (t: Tab) => { setTab(t); setEventId(null); };
  const openEvent = (id: string) => { setTab("events"); setEventId(id); };
  return (
    <div className="min-h-dvh bg-pine-950">
      <Ambient />
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[224px] flex-col border-r border-line bg-gradient-to-b from-pine-900/95 to-pine-950/95 backdrop-blur-xl md:flex">
        <div className="flex items-center gap-2.5 px-5 pb-5 pt-6"><BrandMark size={28} /><div><p className="font-display text-[16px] leading-none text-cream">Мое кафе</p><p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-sage">учёт и калькуляция</p></div></div>
        <nav className="grow space-y-1 px-3">{NAV.map((n) => { const active = tab === n.id; return (<button key={n.id} onClick={() => goTab(n.id)} className={`tap relative flex w-full items-center gap-3 rounded-[12px] px-3.5 py-2.5 text-[13px] font-semibold transition-all ${active ? "bg-gradient-to-r from-saffron/20 to-transparent text-saffron shadow-lg shadow-saffron/10" : "text-sage hover:bg-pine-800/60 hover:text-cream"}`}><span className={`absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-saffron transition-all ${active ? "opacity-100 shadow-lg shadow-saffron/50" : "opacity-0"}`} /><n.Icon size={18} />{n.label}</button>); })}</nav>
        <div className="m-3 rounded-[14px] border border-line bg-pine-800/50 p-3.5"><p className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-sage">Локальная база</p><p className="mt-1.5 text-[11px] leading-relaxed text-sage">Все данные хранятся в этом браузере: склад, рецепты, сметы, задачи и журнал цен.</p></div>
      </aside>
      <div className="sticky top-0 z-30 border-b border-line bg-gradient-to-b from-pine-900/98 to-pine-950/95 backdrop-blur-xl md:hidden">
        <div className="flex h-[54px] items-center gap-2.5 px-5"><BrandMark size={24} /><span className="font-display text-[15px] text-cream">Мое кафе</span><span className="ml-auto rounded-full border border-saffron/30 bg-saffron/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-saffron">{NAV.find((n) => n.id === tab)?.label}</span></div>
      </div>
      <main className="relative bg-pine-950 md:pl-[224px]">
        <div className="mx-auto min-h-dvh max-w-[1180px] pb-24 md:pb-10">
          {tab === "dashboard" && <Dashboard onOpenEvent={openEvent} onGoTab={goTab} />}
          {tab === "events" && (eventId ? <EventDetail id={eventId} onBack={() => setEventId(null)} /> : <EventsScreen onOpen={setEventId} />)}
          {tab === "tasks" && <TasksScreen onOpenEvent={openEvent} />}
          {tab === "recipes" && <RecipesScreen />}
          {tab === "products" && <ProductsScreen />}
          {tab === "services" && <ServicesScreen />}
          {tab === "requisites" && <RequisitesScreen />}
        </div>
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-gradient-to-t from-pine-950/98 to-pine-900/95 backdrop-blur-xl md:hidden">
        <div className="grid grid-cols-7 px-1 pb-[max(8px,env(safe-area-inset-bottom))] pt-1.5">{NAV.map((n) => { const active = tab === n.id; return (<button key={n.id} onClick={() => goTab(n.id)} className="tap relative flex flex-col items-center gap-1 py-1.5"><span className={`absolute -top-1.5 h-1 w-7 rounded-full bg-saffron transition-all ${active ? "opacity-100 shadow-lg shadow-saffron/50" : "opacity-0"}`} /><n.Icon size={18} className={`transition-all ${active ? "text-saffron scale-110" : "text-sage"}`} /><span className={`text-[8.5px] font-bold tracking-wide transition-all ${active ? "text-saffron" : "text-sage"}`}>{n.short}</span></button>); })}</div>
      </nav>
    </div>
  );
}

export default function App() {
  return (<StoreProvider><ToastProvider><AppInner /></ToastProvider></StoreProvider>);
}
