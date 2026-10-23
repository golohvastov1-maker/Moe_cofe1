import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import type { Category, DocKind, EventPlan, IngredientRow, ProductCategory, Unit } from "../types";
import { MENU_ORDER, UNITS, amountUnitLabel, catStyle, compareProductCategories, eventTypeStyle, isPieceUnit, isWeighed, orderedRecipeCategories } from "../types";
import { useStore } from "../store";
import { amountLabel, buildShopping, comparePurchasePlaces, eventSummary, fmtDateShort, fmtMoney, getAdditionalShoppingProduct, ingredientCost, parseNum, pieceAmountLabel, plural, recipeFinalPerPortion, recipePerPortion, round2, servicesTotal, shoppingPieceAmountLabel, todayISO, uid } from "../utils";
import { AmountEditor, DangerConfirm, Field, Modal, Segmented, ServingBadge, Stepper, StepperInput, inputCls, selectCls, textareaCls, useCountUp, useToast } from "./UI";
import { IcBook, IcBriefcase, IcCart, IcChevronLeft, IcComment, IcDoc, IcPencil, IcPlus, IcReset, IcRuble, IcSearch, IcUsers, IcX } from "./Icons";
import { EventDocPreview } from "./PrintDocs";
import { EventSheet } from "./EventsScreen";

export function EventDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const { state } = useStore();
  const ev = state.events.find((e) => e.id === id);
  if (!ev) return <section className="px-5 pt-10 text-center"><p className="font-display text-[15px]">Мероприятие не найдено</p><button onClick={onBack} className="tap mt-4 rounded-full border border-line px-5 py-2.5 text-[13px] font-semibold text-sage">К списку мероприятий</button></section>;
  return <DetailInner ev={ev} onBack={onBack} />;
}

type TabId = "menu" | "client" | "services" | "docs" | "comment";

function DetailInner({ ev, onBack }: { ev: EventPlan; onBack: () => void }) {
  const { state, saveEvent, deleteEvent } = useStore();
  const toast = useToast();
  const [tab, setTab] = useState<TabId>("menu");
  const [editOpen, setEditOpen] = useState(false);
  const [docKind, setDocKind] = useState<DocKind | null>(null);
  const [docSortMode, setDocSortMode] = useState<"category" | "place">("category");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [replaceDishId, setReplaceDishId] = useState<string | null>(null);
  const [editDishId, setEditDishId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"added" | "name" | "price">("added");
  const sum = eventSummary(ev, state.recipes, state.products, state.eventTypes);
  const animGrand = useCountUp(sum.grand, 600);
  const typeSt = eventTypeStyle(ev.type);
  const update = (patch: Partial<EventPlan>) => saveEvent({ ...ev, ...patch });
  const TABS: { id: TabId; label: string; short: string; Icon: typeof IcBook }[] = [
    { id: "menu", label: `Меню · ${ev.dishes.length}`, short: `Меню · ${ev.dishes.length}`, Icon: IcBook },
    { id: "client", label: `Клиент · ${ev.clientItems?.length ?? 0}`, short: `Клиент · ${ev.clientItems?.length ?? 0}`, Icon: IcUsers },
    { id: "services", label: `Услуги и скидки · ${ev.services.length}`, short: `Услуги · ${ev.services.length}`, Icon: IcBriefcase },
    { id: "docs", label: "Документы", short: "Документы", Icon: IcDoc },
    { id: "comment", label: "Комментарий", short: "Заметка", Icon: IcComment },
  ];
  return (
    <section className="px-5 pb-8 pt-5 md:px-8">
      <div className="reveal flex items-center gap-2">
        <button onClick={onBack} aria-label="Назад" className="tap grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line text-sage hover:text-cream"><IcChevronLeft size={18} /></button>
        <div className="min-w-0 grow">
          <div className="flex items-center gap-2"><h1 className="truncate font-display text-[19px] leading-tight text-cream">{ev.name}</h1><span className="inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.05em]" style={{ color: typeSt.fg, background: typeSt.bg }}>{ev.type}</span></div>
          <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-sage">{fmtDateShort(ev.date)} · <IcUsers size={12} /> {ev.guests} {plural(ev.guests, ["гость", "гостя", "гостей"])} · {ev.tablesCount} {plural(ev.tablesCount, ["стол", "стола", "столов"])} по {ev.guestsPerTable} чел.</p>
        </div>
        <button onClick={() => setEditOpen(true)} aria-label="Изменить мероприятие" className="tap flex items-center gap-1.5 rounded-[11px] border border-line px-2.5 py-2 text-[12px] font-semibold text-sage hover:text-cream sm:px-3"><IcPencil size={14} /> <span className="hidden sm:inline">Изменить</span></button>
        <DangerConfirm onConfirm={() => { deleteEvent(ev.id); toast("Мероприятие удалено", "del"); onBack(); }} />
      </div>
      <div className="reveal mx-0 mt-4 rounded-[18px] border border-saffron/25 p-4" style={{ background: "linear-gradient(135deg, rgba(244,168,58,0.15), rgba(244,168,58,0.03) 55%, rgba(126,217,176,0.08))" }}>
        <p className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-sage">Смета мероприятия</p>
        <p className="mt-1.5 font-display text-[30px] leading-none text-saffron">{fmtMoney(animGrand)}</p>
        <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className="rounded-full border border-line bg-pine-900/60 px-2.5 py-1 font-semibold text-mint">≈ {fmtMoney(sum.perGuest)} на гостя</span>
          <span className="rounded-full border border-line bg-pine-900/60 px-2.5 py-1 text-sage">{sum.portions} порций</span>
          <span className="rounded-full border border-line bg-pine-900/60 px-2.5 py-1 text-sage">блюда {fmtMoney(sum.foodAfterDiscount)}</span>
          <span className="rounded-full border border-line bg-pine-900/60 px-2.5 py-1 text-sage">услуги {fmtMoney(sum.services)}</span>
          {(sum.dishDiscountSum > 0 || sum.eventDiscountSum > 0) && <span className="rounded-full border border-coral/30 bg-coral/10 px-2.5 py-1 font-semibold text-coral">скидки −{fmtMoney(sum.dishDiscountSum + sum.eventDiscountSum)}</span>}
        </div>
      </div>
      <div className="no-scrollbar mt-5 flex gap-1 overflow-x-auto rounded-[13px] border border-line bg-pine-850 p-1">
        {TABS.map((t) => { const active = tab === t.id; return (<button key={t.id} onClick={() => setTab(t.id)} className={`tap relative flex shrink-0 items-center gap-2 whitespace-nowrap rounded-[10px] px-3.5 py-2 text-[12.5px] font-semibold transition-colors ${active ? "bg-pine-700 text-saffron" : "text-sage hover:text-cream"}`}><t.Icon size={15} /><span className="sm:hidden">{t.short}</span><span className="hidden sm:inline">{t.label}</span></button>); })}
      </div>
      <div className="mt-5">
        {tab === "menu" && <MenuTab ev={ev} onAdd={() => { setReplaceDishId(null); setPickerOpen(true); }} onReplace={(recipeId) => { setReplaceDishId(recipeId); setPickerOpen(true); }} onEditDish={setEditDishId} sortBy={sortBy} setSortBy={setSortBy} />}
        {tab === "client" && <ClientItemsTab ev={ev} />}
        {tab === "services" && <ServicesTab ev={ev} />}
        {tab === "docs" && <DocsTab ev={ev} onOpenDoc={(kind, mode) => { setDocSortMode(mode); setDocKind(kind); }} />}
        {tab === "comment" && <CommentTab ev={ev} />}
      </div>
      <EventSheet open={editOpen} onClose={() => setEditOpen(false)} editing={ev} />
      <AddDishPicker open={pickerOpen} onClose={() => { setPickerOpen(false); setReplaceDishId(null); }} ev={ev} replacingRecipeId={replaceDishId} onAdd={(recipeId) => {
        if (replaceDishId) {
          saveEvent({ ...ev, dishes: ev.dishes.map((dish) => dish.recipeId === replaceDishId ? { ...dish, recipeId, overrides: null } : dish) });
          toast("Блюдо заменено");
        } else {
          saveEvent({ ...ev, dishes: [...ev.dishes, { recipeId, portions: Math.max(1, ev.guests), overrides: null, discount: 0 }] });
          toast("Блюдо добавлено в меню");
        }
        setPickerOpen(false);
        setReplaceDishId(null);
      }} />
      <IngredientEditor key={editDishId ?? "none"} ev={ev} recipeId={editDishId} onClose={() => setEditDishId(null)} />
      {docKind && <EventDocPreview kind={docKind} event={ev} sortMode={docSortMode} onClose={() => setDocKind(null)} />}
    </section>
  );
}

function CommentTab({ ev }: { ev: EventPlan }) {
  const { saveEvent } = useStore();
  const toast = useToast();
  const [comment, setComment] = useState(ev.comment ?? "");
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    saveEvent({ ...ev, comment: comment.trim() || undefined });
    setSaved(true);
    toast("Комментарий сохранён");
    setTimeout(() => setSaved(false), 2000);
  };

  const hasChanges = comment !== (ev.comment ?? "");

  return (
    <div className="space-y-5">
      <div className="reveal rounded-[16px] border border-glacier/30 bg-glacier/5 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 font-display text-[15px]">
              <IcComment size={16} className="text-glacier" /> Комментарий к мероприятию
            </h3>
            <p className="mt-1 text-[11.5px] text-sage">
              Только для внутреннего использования, не отображается в печатных документах
            </p>
          </div>
        </div>
        <div className="mt-4">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Предпочтения клиента, особенности мероприятия, важные заметки..."
            rows={8}
            className={inputCls + " resize-none leading-relaxed"}
          />
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={!hasChanges}
            className="tap flex items-center gap-2 rounded-[12px] bg-gradient-to-br from-saffron to-amber-500 px-5 py-2.5 font-display text-[12px] font-bold text-pine-950 shadow-lg shadow-saffron/20 transition-opacity hover:shadow-saffron/40 hover:scale-105 disabled:opacity-40 disabled:hover:scale-100"
          >
            {saved ? "✓ Сохранено" : "Сохранить комментарий"}
          </button>
          {hasChanges && (
            <span className="text-[12px] text-sage">Есть несохранённые изменения</span>
          )}
        </div>
      </div>
      {ev.comment && (
        <div className="reveal rounded-[14px] border border-line bg-pine-800/50 p-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-sage">Подсказка</p>
          <p className="mt-2 text-[12px] leading-relaxed text-sage">
            Комментарий виден только в приложении. Для информации, которая должна быть в печатных документах, используйте описание блюд или тех. карту в рецептах.
          </p>
        </div>
      )}
    </div>
  );
}

function MenuTab({ ev, onAdd, onReplace, onEditDish, sortBy, setSortBy }: { ev: EventPlan; onAdd: () => void; onReplace: (recipeId: string) => void; onEditDish: (recipeId: string) => void; sortBy: "added" | "name" | "price"; setSortBy: (s: "added" | "name" | "price") => void }) {
  const { state, saveEvent } = useStore();
  const toast = useToast();
  const sum = eventSummary(ev, state.recipes, state.products, state.eventTypes);
  const byCat = useMemo(() => {
    const m = new Map<Category, typeof sum.dishes>();
    if (sortBy === "added") {
      m.set("Порядок добавления", [...sum.dishes]);
      return m;
    }
    for (const d of sum.dishes) { const c = d.recipe.category; const arr = m.get(c); if (arr) arr.push(d); else m.set(c, [d]); }
    for (const [cat, dishes] of m.entries()) {
      const sorted = [...dishes].sort((a, b) => {
        if (sortBy === "name") return a.recipe.name.localeCompare(b.recipe.name, "ru");
        const priceA = recipeFinalPerPortion(a.recipe, state.products);
        const priceB = recipeFinalPerPortion(b.recipe, state.products);
        return priceB - priceA;
      });
      m.set(cat, sorted);
    }
    return m;
  }, [sum.dishes, sortBy, state.products]);
  const updateDish = (recipeId: string, patch: Partial<EventPlan["dishes"][number]>) => saveEvent({ ...ev, dishes: ev.dishes.map((d) => (d.recipeId === recipeId ? { ...d, ...patch } : d)) });
  const removeDish = (recipeId: string) => { saveEvent({ ...ev, dishes: ev.dishes.filter((d) => d.recipeId !== recipeId) }); toast("Блюдо убрано из меню", "info"); };
  return (
    <div>
      {ev.dishes.length === 0 && <p className="reveal rounded-[14px] border border-dashed border-pine-500/70 px-4 py-6 text-center text-[12.5px] text-sage">Меню пустое — добавьте блюда, и смета соберётся автоматически</p>}
      {ev.dishes.length > 0 && <div className="reveal mb-4 flex items-center gap-2"><span className="text-[11px] font-bold uppercase tracking-[0.08em] text-sage">Сортировка:</span><Segmented options={[{ value: "added", label: "По порядку добавления" }, { value: "name", label: "По названию" }, { value: "price", label: "По цене" }]} value={sortBy} onChange={setSortBy} /></div>}
      <div className="space-y-6">
        {orderedRecipeCategories(state.categories, [...byCat.keys()], MENU_ORDER).map((cat) => {
          const dishes = byCat.get(cat);
          if (!dishes || dishes.length === 0) return null;
          const st = catStyle(cat);
          const catTotal = dishes.reduce((s, d) => s + (d.includedInEventTotal ? d.clientPerPortion * d.dish.portions : 0), 0);
          return (
            <div key={cat} className="reveal">
              <div className="mb-2.5 flex items-center gap-2.5"><span className="h-2 w-2 rounded-full" style={{ background: st.fg }} /><h2 className="font-display text-[14px] font-bold" style={{ color: st.fg }}>{cat}</h2><span className="text-[11px] font-semibold text-sage">{dishes.length} {dishes.length === 1 ? "блюдо" : dishes.length < 5 ? "блюда" : "блюд"}</span><span className="h-px grow bg-line" /><span className="hidden text-[11px] text-sage sm:inline">{fmtMoney(catTotal)}</span></div>
              <div className="space-y-2">
                {dishes.map((d, i) => {
                  const basePer = recipeFinalPerPortion(d.recipe, state.products);
                  const disc = d.dish.discount ?? 0;
                  const line = d.clientPerPortion * d.dish.portions;
                  return (
                    <div key={d.recipe.id} className="reveal rounded-[14px] border border-line bg-pine-800 p-3.5" style={{ animationDelay: `${Math.min(i * 40, 300)}ms` }}>
                      <div className="flex items-center gap-2">
                        <div className="min-w-0 grow">
                          <div className="flex flex-wrap items-center gap-2"><p className="truncate text-[13.5px] font-semibold text-cream">{d.recipe.name}</p>{sortBy === "added" && <span className="rounded-full border border-line px-2 py-0.5 text-[9px] font-semibold text-sage">{d.recipe.category}</span>}<ServingBadge serving={d.recipe.serving} />{d.overridden && <span className="shrink-0 rounded-full border border-glacier/30 bg-glacier/10 px-2 py-0.5 text-[9px] font-bold uppercase text-glacier">состав изменён</span>}{d.dish.comment && <span className="shrink-0 rounded-full border border-saffron/30 bg-saffron/10 px-2 py-0.5 text-[9px] font-bold uppercase text-saffron">есть комментарий</span>}</div>
                          <p className="mt-0.5 text-[11px] text-sage">{fmtMoney(basePer)} с чел-ка · выход {d.recipe.servingWeight} г{disc > 0 && <span className="text-coral"> · скидка −{disc}%</span>}</p>
                          {!d.includedInEventTotal && <p className="mt-0.5 text-[10px] font-semibold text-sage">Не учитывается в стоимости мероприятия</p>}
                          {d.dish.comment && <p className="mt-1 truncate text-[10.5px] text-saffron/80">* {d.dish.comment}</p>}
                        </div>
                        <button onClick={() => onReplace(d.recipe.id)} className="tap shrink-0 rounded-[10px] border border-line px-2.5 py-1.5 text-[11px] font-semibold text-sage hover:border-saffron/40 hover:text-saffron">Заменить</button>
                        <button onClick={() => onEditDish(d.recipe.id)} className="tap shrink-0 rounded-[10px] border border-line px-2.5 py-1.5 text-[11px] font-semibold text-sage hover:border-glacier/40 hover:text-glacier">Состав</button>
                        <button onClick={() => removeDish(d.recipe.id)} aria-label="Убрать блюдо" className="tap grid h-7 w-7 shrink-0 place-items-center rounded-full text-sage hover:text-coral"><IcX size={14} /></button>
                      </div>
                      <div className="mt-2.5 flex flex-wrap items-center gap-3">
                        <StepperInput small value={d.dish.portions} min={1} onChange={(n) => updateDish(d.recipe.id, { portions: n })} placeholder="порций" />
                        <label className="flex items-center gap-1.5 text-[11px] text-sage">скидка<input value={String(disc || "")} onChange={(e) => updateDish(d.recipe.id, { discount: Math.max(0, Math.min(100, parseNum(e.target.value))) })} inputMode="numeric" placeholder="0" className="w-12 rounded-[9px] border border-line bg-pine-850 px-2 py-1 text-right font-display text-[12px] font-semibold outline-none focus:border-coral/60" />%</label>
                        <p className="ml-auto whitespace-nowrap font-display text-[15px] font-bold text-saffron">{fmtMoney(line)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <button onClick={onAdd} className="tap mt-4 flex w-full items-center justify-center gap-2 rounded-[12px] border border-dashed border-pine-500 py-3 text-[13px] font-semibold text-sage hover:border-saffron/50 hover:text-cream"><IcPlus size={16} /> Добавить блюдо</button>
    </div>
  );
}

function AddDishPicker({ open, onClose, ev, replacingRecipeId, onAdd }: { open: boolean; onClose: () => void; ev: EventPlan; replacingRecipeId: string | null; onAdd: (recipeId: string) => void }) {
  const { state } = useStore();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<Category | "все">("все");
  const list = state.recipes.filter((r) => (cat === "все" || r.category === cat) && r.name.toLowerCase().includes(q.trim().toLowerCase())).sort((a, b) => a.name.localeCompare(b.name, "ru"));
  return (
    <Modal open={open} onClose={onClose} title={replacingRecipeId ? "Заменить блюдо" : "Добавить блюдо"} subtitle={`Порции по умолчанию — по числу гостей (${ev.guests})`}>
      <div className="relative"><IcSearch size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sage" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск по рецептам…" className={inputCls + " pl-10"} autoFocus /></div>
      <div className="no-scrollbar mt-3 flex gap-1.5 overflow-x-auto pb-1">{(["все", ...state.categories.map(c => c.name)] as const).map((c) => (<button key={c} onClick={() => setCat(c)} className={`tap shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-colors ${cat === c ? "border-saffron/60 bg-saffron/15 text-saffron" : "border-line bg-pine-800 text-sage hover:text-cream"}`}>{c === "все" ? "Все категории" : c}</button>))}</div>
      <div className="mt-3 space-y-2 pb-2">
        {list.map((r) => { const st = catStyle(r.category); const added = ev.dishes.some((d) => d.recipeId === r.id && d.recipeId !== replacingRecipeId); return (<button key={r.id} disabled={added} onClick={() => onAdd(r.id)} className={`tap flex w-full items-center gap-3 rounded-[12px] border px-3.5 py-3 text-left transition-colors ${added ? "border-mint/25 bg-mint/6 opacity-60" : "border-line bg-pine-800 hover:border-saffron/40"}`}><span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px]" style={{ background: st.bg, color: st.fg }}><IcBook size={17} /></span><span className="min-w-0 grow"><span className="block truncate text-[13.5px] font-semibold text-cream">{r.name}</span><span className="text-[11px] text-sage">{r.category} · рассчитано на {r.portions} чел-к</span></span><span className="shrink-0 text-right"><span className="block font-display text-[13px] font-bold text-mint">{fmtMoney(recipeFinalPerPortion(r, state.products))}</span><span className="text-[10px] text-sage">с чел-ка</span></span>{added ? (<span className="shrink-0 text-[11px] font-bold text-mint">в меню</span>) : (<IcPlus size={16} className="shrink-0 text-saffron" />)}</button>); })}
        {list.length === 0 && <p className="py-6 text-center text-[13px] text-sage">Ничего не нашлось</p>}
      </div>
    </Modal>
  );
}

function IngredientEditor({ ev, recipeId, onClose }: { ev: EventPlan; recipeId: string | null; onClose: () => void }) {
  const { state, saveEvent } = useStore();
  const toast = useToast();
  const dish = ev.dishes.find((d) => d.recipeId === recipeId);
  const recipe = state.recipes.find((r) => r.id === recipeId);
  const [rows, setRows] = useState<IngredientRow[] | null>(null);
  const [swapFor, setSwapFor] = useState<string | null>(null);
  const [comment, setComment] = useState(dish?.comment ?? "");
  if (!dish || !recipe) return null;
  const current: IngredientRow[] = rows ?? dish.overrides ?? recipe.ingredients;
  const overridden = rows !== null || dish.overrides !== null;
  const costPer = current.reduce((s, row) => s + ingredientCost(row, state.products), 0) / Math.max(1, recipe.portions);
  const setRow = (idx: number, patch: Partial<IngredientRow>) => setRows(current.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  const setToTaste = (idx: number, checked: boolean) => setRows(current.map((row, i) => {
    if (i !== idx) return row;
    const product = state.products.find((item) => item.id === row.productId);
    const defaultAmount = product?.unit === "кг" ? 500 : product?.unit === "л" ? 200 : 1;
    return { ...row, toTaste: checked, amount: checked ? 0 : row.amount || defaultAmount };
  }));
  const removeRow = (idx: number) => setRows(current.filter((_, i) => i !== idx));
  const swap = (oldId: string, newId: string) => { setRows(current.map((r) => (r.productId === oldId ? { ...r, productId: newId } : r))); setSwapFor(null); };
  const save = () => { saveEvent({ ...ev, dishes: ev.dishes.map((d) => (d.recipeId === recipe.id ? { ...d, overrides: rows ?? d.overrides, comment: comment.trim() || undefined } : d)) }); toast("Состав блюда сохранён для этого мероприятия"); onClose(); };
  const resetToMaster = () => { saveEvent({ ...ev, dishes: ev.dishes.map((d) => (d.recipeId === recipe.id ? { ...d, overrides: null } : d)) }); setRows(null); toast("Возвращён эталонный состав рецепта", "info"); onClose(); };
  return (
    <>
      <Modal open onClose={onClose} title={recipe.name} subtitle="Изменения касаются только этого мероприятия — рецепт в справочнике не меняется" maxW="max-w-[600px]" footer={
        <div className="flex items-center gap-3">
          {overridden && dish.overrides !== null && <button onClick={resetToMaster} className="tap flex shrink-0 items-center gap-1.5 rounded-[14px] border border-line px-3.5 py-3 text-[12px] font-semibold text-sage hover:border-glacier/40 hover:text-glacier"><IcReset size={14} /> К рецепту</button>}
          <button onClick={onClose} className="tap shrink-0 rounded-[14px] border border-line px-5 py-3 font-display text-[13px] font-bold text-sage hover:border-pine-400 hover:text-cream">Отмена</button>
          <button onClick={save} className="tap grow rounded-[14px] bg-saffron py-3 font-display text-[13px] font-bold text-pine-950 hover:brightness-110">Сохранить состав</button>
        </div>
      }>
        <div className="mb-3 rounded-[12px] border border-line bg-pine-800 px-3.5 py-2.5 text-[12px] text-sage">Себестоимость с чел-ка по этому составу: <span className="font-display font-bold text-mint">{fmtMoney(costPer)}</span><span className="text-sage"> · на {dish.portions} порций</span></div>
        <div className="space-y-2">
          {current.map((row, i) => {
            const p = state.products.find((x) => x.id === row.productId);
            if (!p) return null;
            return (
              <div key={row.productId + i} className={`rounded-[13px] border bg-pine-700/70 p-3 ${row.clientProvided ? "border-glacier/40" : "border-line"}`}>
                <div className="flex items-center justify-between gap-2">
                  <p className="min-w-0 truncate text-[13.5px] font-semibold text-cream">
                    {p.name}
                    {row.clientProvided && <span className="ml-2 rounded-full bg-glacier/20 px-2 py-0.5 text-[9px] font-bold uppercase text-glacier">клиент</span>}
                  </p>
                  <div className="flex shrink-0 items-center gap-1">
                    <button onClick={() => setSwapFor(row.productId)} className="tap rounded-[9px] border border-line px-2 py-1 text-[10.5px] font-semibold text-sage hover:border-saffron/40 hover:text-saffron">заменить</button>
                    <button onClick={() => removeRow(i)} aria-label="Убрать" className="tap grid h-6 w-6 place-items-center rounded-full text-sage hover:text-coral"><IcX size={13} /></button>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {row.toTaste
                    ? <span className="rounded-full bg-saffron/15 px-2.5 py-1 text-[11px] font-semibold text-saffron">По вкусу · не входит в закупки</span>
                    : <AmountEditor product={p} value={row.amount} onChange={(v) => setRow(i, { amount: v })} />}
                  {!row.toTaste && <span className="ml-auto whitespace-nowrap font-display text-[13px] font-semibold text-saffron">{fmtMoney(ingredientCost(row, state.products))}</span>}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
                  <label className="flex cursor-pointer items-center gap-2 text-[11px] text-sage">
                    <input type="checkbox" checked={row.toTaste ?? false} onChange={(e) => setToTaste(i, e.target.checked)} className="h-4 w-4 rounded border-line bg-pine-800 accent-saffron" />
                    По вкусу (без количества и закупки)
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 text-[11px] text-sage">
                    <input type="checkbox" checked={row.clientProvided ?? false} onChange={(e) => setRow(i, { clientProvided: e.target.checked })} className="h-4 w-4 rounded border-line bg-pine-800 accent-glacier" />
                    Привозит/готовит клиент
                  </label>
                </div>
              </div>
            );
          })}
          {current.length === 0 && <p className="rounded-[12px] border border-dashed border-pine-500/70 px-4 py-4 text-center text-[12.5px] text-sage">Состав пуст</p>}
        </div>
        <div className="mt-4">
          <Field label="Комментарий к блюду" hint="Будет отображаться в задании для повара">
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Например: подать горячим, украсить зеленью..."
              rows={3}
              className={textareaCls}
            />
          </Field>
        </div>
      </Modal>
      {swapFor && (<Modal open onClose={() => setSwapFor(null)} title="Заменить продукт" subtitle="Выберите продукт из базы"><div className="space-y-2 pb-2">{state.products.filter((p) => p.id !== swapFor).sort((a, b) => a.name.localeCompare(b.name, "ru")).map((p) => (<button key={p.id} onClick={() => swap(swapFor, p.id)} className="tap flex w-full items-center gap-3 rounded-[12px] border border-line bg-pine-800 px-3.5 py-2.5 text-left hover:border-saffron/40"><span className="min-w-0 grow"><span className="block truncate text-[13.5px] font-semibold text-cream">{p.name}</span><span className="text-[11px] text-sage">{fmtMoney(p.price)} / {p.unit}</span></span><IcPlus size={15} className="shrink-0 text-saffron" /></button>))}</div></Modal>)}
    </>
  );
}

function ClientItemsTab({ ev }: { ev: EventPlan }) {
  const { saveEvent } = useStore();
  const toast = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const clientItems = ev.clientItems ?? [];
  const addItem = (item: { name: string; amount: number; unit: string; note?: string }) => { saveEvent({ ...ev, clientItems: [...clientItems, { id: uid(), ...item }] }); toast("Позиция клиента добавлена"); setAddOpen(false); };
  const updateItem = (id: string, patch: Partial<{ name: string; amount: number; unit: string; note?: string }>) => { saveEvent({ ...ev, clientItems: clientItems.map((item) => (item.id === id ? { ...item, ...patch } : item)) }); toast("Позиция обновлена"); setEditingItem(null); };
  const removeItem = (id: string) => { saveEvent({ ...ev, clientItems: clientItems.filter((item) => item.id !== id) }); toast("Позиция удалена", "del"); };
  return (
    <div className="space-y-5">
      <div className="reveal rounded-[16px] border border-glacier/30 bg-glacier/5 p-4">
        <div className="flex items-start justify-between gap-3">
          <div><h3 className="flex items-center gap-2 font-display text-[15px]"><IcUsers size={16} className="text-glacier" /> Продукты клиента</h3><p className="mt-1 text-[11.5px] text-sage">Позиции, которые клиент привозит или готовит самостоятельно. Эти продукты не включаются в список закупок.</p></div>
          <button onClick={() => setAddOpen(true)} className="tap flex shrink-0 items-center gap-1.5 rounded-[10px] bg-glacier/20 px-3 py-2 text-[11.5px] font-semibold text-glacier hover:bg-glacier/30"><IcPlus size={14} /> Добавить</button>
        </div>
      </div>
      {clientItems.length === 0 ? (<p className="reveal rounded-[12px] border border-dashed border-pine-500/70 px-4 py-6 text-center text-[12.5px] text-sage">Нет позиций от клиента</p>) : (
        <div className="space-y-2">
          {clientItems.map((item, i) => (
            <div key={item.id} className="reveal flex items-center gap-3 rounded-[14px] border border-glacier/20 bg-pine-800 p-3.5" style={{ animationDelay: `${Math.min(i * 40, 300)}ms` }}>
              <div className="min-w-0 grow"><p className="truncate text-[13.5px] font-semibold text-cream">{item.name}</p><p className="mt-0.5 text-[11px] text-sage">{item.amount} {item.unit}{item.note && <span className="ml-2 text-glacier">· {item.note}</span>}</p></div>
              <button onClick={() => setEditingItem(item.id)} className="tap grid h-7 w-7 shrink-0 place-items-center rounded-full border border-line text-sage hover:border-glacier/40 hover:text-glacier" aria-label="Редактировать"><IcPencil size={13} /></button>
              <DangerConfirm onConfirm={() => removeItem(item.id)} />
            </div>
          ))}
        </div>
      )}
      <ClientItemModal open={addOpen} onClose={() => setAddOpen(false)} onSave={addItem} />
      {editingItem && (<ClientItemModal open={true} onClose={() => setEditingItem(null)} item={clientItems.find((i) => i.id === editingItem)} onSave={(data) => updateItem(editingItem, data)} />)}
    </div>
  );
}

function ClientItemModal({ open, onClose, item, onSave }: { open: boolean; onClose: () => void; item?: { name: string; amount: number; unit: string; note?: string }; onSave: (data: { name: string; amount: number; unit: string; note?: string }) => void }) {
  const [name, setName] = useState(item?.name ?? "");
  const [amount, setAmount] = useState(String(item?.amount ?? ""));
  const [unit, setUnit] = useState(item?.unit ?? "кг");
  const [note, setNote] = useState(item?.note ?? "");
  useEffect(() => { if (open) { setName(item?.name ?? ""); setAmount(String(item?.amount ?? "")); setUnit(item?.unit ?? "кг"); setNote(item?.note ?? ""); } }, [open, item]);
  const valid = name.trim().length > 0 && parseNum(amount) > 0;
  const handleSave = () => { if (!valid) return; onSave({ name: name.trim(), amount: parseNum(amount), unit, note: note.trim() || undefined }); };
  return (
    <Modal open={open} onClose={onClose} title={item ? "Редактировать позицию" : "Новая позиция клиента"} subtitle="Продукт, который привозит или готовит клиент" footer={
      <div className="flex items-center gap-3">
        <button onClick={onClose} className="tap shrink-0 rounded-[14px] border border-line px-5 py-3 font-display text-[13px] font-bold text-sage transition-colors hover:border-pine-400 hover:text-cream">Отмена</button>
        <button onClick={handleSave} disabled={!valid} className="tap grow rounded-[14px] bg-saffron py-3 font-display text-[13px] font-bold text-pine-950 transition-opacity disabled:opacity-35">Сохранить</button>
      </div>
    }>
      <div className="space-y-5">
        <Field label="Название"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Например, Торт от бабушки" className={inputCls} autoFocus={!item} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Количество"><input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder="0" className={inputCls + " font-display font-semibold"} /></Field>
          <Field label="Единица"><select value={unit} onChange={(e) => setUnit(e.target.value)} className={selectCls}><option value="кг">кг</option><option value="г">г</option><option value="л">л</option><option value="мл">мл</option><option value="шт">шт</option><option value="упак">упак</option><option value="порция">порция</option></select></Field>
        </div>
        <Field label="Комментарий" hint="Необязательно"><input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Например, привезёт за 2 часа до начала" className={inputCls} /></Field>
      </div>
    </Modal>
  );
}

function ServicesTab({ ev }: { ev: EventPlan }) {
  const { state, saveEvent } = useStore();
  const toast = useToast();
  const sum = eventSummary(ev, state.recipes, state.products, state.eventTypes);
  const [customOpen, setCustomOpen] = useState(false);
  const discount = ev.discount ?? 0;
  const fillStyle = { "--fill": `${(discount / 100) * 100}%` } as CSSProperties;
  const addService = (serviceId: string) => { const s = state.services.find((x) => x.id === serviceId); if (!s) return; saveEvent({ ...ev, services: [...ev.services, { id: uid(), serviceId: s.id, name: s.name, unit: s.unit, quantity: 1, price: s.price }] }); toast("Услуга добавлена"); };
  const updateService = (id: string, patch: Partial<EventPlan["services"][number]>) => saveEvent({ ...ev, services: ev.services.map((s) => (s.id === id ? { ...s, ...patch } : s)) });
  const removeService = (id: string) => { saveEvent({ ...ev, services: ev.services.filter((s) => s.id !== id) }); toast("Услуга убрана", "info"); };
  return (
    <div className="space-y-5">
      <div className="reveal rounded-[16px] border border-line bg-pine-800 p-4">
        <div className="flex items-center justify-between"><p className="text-[12px] font-bold uppercase tracking-[0.08em] text-sage">Общая скидка на блюда</p><p className="font-display text-[16px] font-bold text-coral">{discount}%</p></div>
        <input type="range" min={0} max={100} step={5} value={discount} onChange={(e) => saveEvent({ ...ev, discount: Number(e.target.value) })} style={fillStyle} className="mt-3 w-full" />
        <div className={`mt-3 grid grid-cols-2 gap-2 text-[11.5px] ${sum.excludedDishesTotal > 0 ? "sm:grid-cols-5" : "sm:grid-cols-4"}`}>
          <div className="rounded-[10px] bg-pine-850 px-2.5 py-2"><p className="text-sage">По прайсу</p><p className="font-display font-bold text-cream">{fmtMoney(sum.foodListTotal)}</p></div>
          <div className="rounded-[10px] bg-pine-850 px-2.5 py-2"><p className="text-sage">Скидки блюд</p><p className="font-display font-bold text-coral">−{fmtMoney(sum.dishDiscountSum)}</p></div>
          <div className="rounded-[10px] bg-pine-850 px-2.5 py-2"><p className="text-sage">Общая скидка</p><p className="font-display font-bold text-coral">−{fmtMoney(sum.eventDiscountSum)}</p></div>
          <div className="rounded-[10px] bg-pine-850 px-2.5 py-2"><p className="text-sage">Блюда к оплате</p><p className="font-display font-bold text-mint">{fmtMoney(sum.foodAfterDiscount)}</p></div>
          {sum.excludedDishesTotal > 0 && <div className="rounded-[10px] border border-line bg-pine-850 px-2.5 py-2"><p className="text-sage">Блюда вне сметы</p><p className="font-display font-bold text-cream">{fmtMoney(sum.excludedDishesTotal)}</p></div>}
        </div>
      </div>
      <div className="reveal">
        <div className="mb-2.5 flex items-center justify-between"><h2 className="flex items-center gap-2 font-display text-[15px]"><IcBriefcase size={16} className="text-mist" /> Услуги</h2><button onClick={() => setCustomOpen(true)} className="tap flex items-center gap-1.5 rounded-[10px] border border-line px-3 py-1.5 text-[11.5px] font-semibold text-sage hover:border-saffron/40 hover:text-saffron"><IcPlus size={14} /> Разовая услуга</button></div>
        {ev.services.length === 0 && <p className="rounded-[12px] border border-dashed border-pine-500/70 px-4 py-4 text-center text-[12.5px] text-sage">Услуг пока нет — добавьте из справочника ниже или разовую</p>}
        <div className="space-y-2">
          {ev.services.map((s) => (<div key={s.id} className="reveal rounded-[14px] border border-line bg-pine-800 p-3.5"><div className="flex items-center gap-2"><div className="min-w-0 grow"><p className="truncate text-[13.5px] font-semibold text-cream">{s.name}</p><p className="text-[11px] text-sage">за 1 «{s.unit}»</p></div><button onClick={() => removeService(s.id)} aria-label="Убрать услугу" className="tap grid h-7 w-7 shrink-0 place-items-center rounded-full text-sage hover:text-coral"><IcX size={14} /></button></div><div className="mt-2.5 flex flex-wrap items-center gap-3"><label className="flex items-center gap-1.5 text-[11px] text-sage">цена<input value={String(s.price || "")} onChange={(e) => updateService(s.id, { price: Math.max(0, parseNum(e.target.value)) })} inputMode="decimal" className="w-20 rounded-[9px] border border-line bg-pine-850 px-2 py-1 text-right font-display text-[12px] font-semibold outline-none focus:border-saffron/60" />₽</label><StepperInput small value={s.quantity} min={1} onChange={(n) => updateService(s.id, { quantity: n })} placeholder="кол-во" /><span className="text-[11px] text-sage">{s.unit}</span><p className="ml-auto whitespace-nowrap font-display text-[15px] font-bold text-saffron">{fmtMoney(s.price * s.quantity)}</p></div></div>))}
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">{state.services.filter((s) => !ev.services.some((x) => x.serviceId === s.id)).map((s) => (<button key={s.id} onClick={() => addService(s.id)} className="tap rounded-full border border-line bg-pine-800 px-3 py-1.5 text-[11.5px] font-semibold text-sage hover:border-mist/40 hover:text-mist">+ {s.name}</button>))}</div>
        <div className="mt-4 flex items-center justify-between rounded-[14px] border border-line bg-pine-800 px-4 py-3"><span className="text-[12px] font-semibold text-sage">Итого услуги</span><span className="font-display text-[15px] font-bold text-mist">{fmtMoney(servicesTotal(ev.services))}</span></div>
      </div>
      <CustomServiceModal open={customOpen} onClose={() => setCustomOpen(false)} onAdd={(name, unit, price) => { saveEvent({ ...ev, services: [...ev.services, { id: uid(), serviceId: null, name, unit, quantity: 1, price }] }); toast("Разовая услуга добавлена"); setCustomOpen(false); }} />
    </div>
  );
}

function CustomServiceModal({ open, onClose, onAdd }: { open: boolean; onClose: () => void; onAdd: (name: string, unit: string, price: number) => void }) {
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("услуга");
  const [price, setPrice] = useState("");
  const valid = name.trim().length > 0 && parseNum(price) > 0;
  return (
    <Modal open={open} onClose={onClose} title="Разовая услуга" subtitle="Не из справочника — попадёт только в это мероприятие" footer={
      <div className="flex items-center gap-3">
        <button onClick={onClose} className="tap shrink-0 rounded-[14px] border border-line px-5 py-3 font-display text-[13px] font-bold text-sage hover:border-pine-400 hover:text-cream">Отмена</button>
        <button onClick={() => onAdd(name.trim(), unit.trim() || "услуга", round2(parseNum(price)))} disabled={!valid} className="tap grow rounded-[14px] bg-saffron py-3 font-display text-[13px] font-bold text-pine-950 disabled:opacity-35">Добавить</button>
      </div>
    }>
      <div className="space-y-4">
        <label className="block"><span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.08em] text-sage">Название</span><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Например, Аренда шатра" className={inputCls} autoFocus /></label>
        <div className="grid grid-cols-2 gap-3"><label className="block"><span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.08em] text-sage">Ед. изм.</span><input value={unit} onChange={(e) => setUnit(e.target.value)} className={inputCls} /></label><label className="block"><span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.08em] text-sage">Цена, ₽</span><input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" placeholder="0" className={inputCls + " font-display font-semibold"} /></label></div>
      </div>
    </Modal>
  );
}

function DocsTab({ ev, onOpenDoc }: { ev: EventPlan; onOpenDoc: (k: DocKind, sortMode: "category" | "place") => void }) {
  const { state, saveEvent, setShoppingStatus, setPurchasePlace } = useStore();
  const toast = useToast();
  const [sortMode, setSortMode] = useState<"category" | "place">("category");
  const [extraMode, setExtraMode] = useState<"product" | "custom">("product");
  const [extraProductId, setExtraProductId] = useState("");
  const [extraAmount, setExtraAmount] = useState("");
  const [extraName, setExtraName] = useState("");
  const [extraCategory, setExtraCategory] = useState<ProductCategory>("Прочие");
  const [extraUnit, setExtraUnit] = useState<Unit>("шт");
  const [extraPrice, setExtraPrice] = useState("");
  const shopping = buildShopping(ev, state.recipes, state.products, state.productCategories);
  const extraProduct = state.products.find((product) => product.id === extraProductId);
  const additionalItems = [...(ev.additionalShoppingItems ?? [])].sort((a, b) => {
    const productA = getAdditionalShoppingProduct(a, state.products);
    const productB = getAdditionalShoppingProduct(b, state.products);
    if (!productA || !productB) return productA ? -1 : productB ? 1 : 0;
    return compareProductCategories(productA.category, productB.category, state.productCategories)
      || productA.name.localeCompare(productB.name, "ru");
  });
  const bought = new Set(ev.bought ?? []);
  const inStock = new Set(ev.inStock ?? []);
  const addExtraItem = () => {
    const amount = parseNum(extraAmount);
    const price = parseNum(extraPrice);
    if (amount <= 0) return;
    if (extraMode === "product" && !extraProduct) return;
    if (extraMode === "custom" && (!extraName.trim() || price < 0)) return;
    saveEvent({
      ...ev,
      additionalShoppingItems: [
        ...(ev.additionalShoppingItems ?? []),
        extraMode === "product" && extraProduct
          ? { id: uid(), productId: extraProduct.id, amount }
          : {
              id: uid(),
              name: extraName.trim(),
              category: extraCategory,
              unit: extraUnit,
              price,
              amount,
            },
      ],
    });
    setExtraAmount("");
    setExtraName("");
    setExtraPrice("");
    toast("Позиция добавлена в закупки");
  };
  const removeExtraItem = (id: string) => {
    saveEvent({
      ...ev,
      additionalShoppingItems: (ev.additionalShoppingItems ?? []).filter((item) => item.id !== id),
    });
    toast("Дополнительная позиция удалена", "info");
  };
  const toggle = (field: "bought" | "inStock", productId: string) => {
    setShoppingStatus([ev.id], productId, field, !ev[field]?.includes(productId));
  };
  const toBuy = shopping.filter((r) => !bought.has(r.product.id) && !inStock.has(r.product.id));
  const toBuySum = toBuy.reduce((s, r) => s + r.cost, 0);
  const DOCS: { kind: DocKind; title: string; desc: string; Icon: typeof IcDoc }[] = [
    { kind: "chef", title: "Задание для поваров", desc: "Техкарты по зонам кухни с весами на число порций", Icon: IcBook },
    { kind: "shopping", title: "Сводный список закупок", desc: "Агрегация ингредиентов всего меню", Icon: IcCart },
    { kind: "invoice", title: "Счёт для клиента", desc: ev.type === "Поминки" ? "Для поминок — услуги и дополнительные блюда; блюда категории «Поминки» скрыты" : "Блюда по категориям с наценкой + услуги и скидки", Icon: IcRuble },
  ];
  return (
    <div className="space-y-6">
      <div className="grid gap-2.5 sm:grid-cols-3">
        {DOCS.map((d, i) => (<button key={d.kind} onClick={() => onOpenDoc(d.kind, sortMode)} className="reveal card-hover rounded-[16px] border border-line bg-pine-800 p-4 text-left" style={{ animationDelay: `${i * 60}ms` }}><d.Icon size={20} className="text-saffron" /><p className="mt-2.5 font-display text-[14px] leading-snug">{d.title}</p><p className="mt-1 text-[11px] leading-relaxed text-sage">{d.desc}</p></button>))}
      </div>
      <div className="reveal">
        <div className="mb-4 rounded-[14px] border border-line bg-pine-800 p-3.5">
          <h2 className="font-display text-[14px] text-cream">Дополнительные позиции</h2>
          <p className="mt-1 text-[11px] leading-relaxed text-sage">Добавьте продукты из справочника или отдельные позиции. Для кг укажите граммы, для л — миллилитры.</p>
          <div className="mb-3 flex gap-2">
            <button onClick={() => setExtraMode("product")} aria-pressed={extraMode === "product"} className={`tap rounded-full border px-3 py-1.5 text-[11px] font-semibold ${extraMode === "product" ? "border-saffron/60 bg-saffron/15 text-saffron" : "border-line text-sage"}`}>Из продуктов</button>
            <button onClick={() => setExtraMode("custom")} aria-pressed={extraMode === "custom"} className={`tap rounded-full border px-3 py-1.5 text-[11px] font-semibold ${extraMode === "custom" ? "border-saffron/60 bg-saffron/15 text-saffron" : "border-line text-sage"}`}>Своя позиция</button>
          </div>
          {extraMode === "product" ? (
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_150px_auto]">
              <select aria-label="Продукт для дополнительной закупки" value={extraProductId} onChange={(event) => setExtraProductId(event.target.value)} className={inputCls}>
                <option value="">Выберите продукт…</option>
                {state.productCategories.map((category) => {
                  const categoryProducts = state.products
                    .filter((product) => product.category === category)
                    .sort((a, b) => a.name.localeCompare(b.name, "ru"));
                  return categoryProducts.length > 0
                    ? <optgroup key={category} label={category}>{categoryProducts.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</optgroup>
                    : null;
                })}
                {state.products.filter((product) => !state.productCategories.includes(product.category)).length > 0 && (
                  <optgroup label="Другие категории">
                    {state.products.filter((product) => !state.productCategories.includes(product.category)).map((product) => <option key={product.id} value={product.id}>{product.name} · {product.category}</option>)}
                  </optgroup>
                )}
              </select>
              <input
                aria-label={`Количество${extraProduct ? `, ${amountUnitLabel(extraProduct.unit)}` : ""}`}
                value={extraAmount}
                onChange={(event) => setExtraAmount(event.target.value)}
                inputMode="decimal"
                placeholder={extraProduct ? `Количество, ${amountUnitLabel(extraProduct.unit)}` : "Количество"}
                className={inputCls}
              />
              <button onClick={addExtraItem} disabled={!extraProduct || parseNum(extraAmount) <= 0} className="tap flex items-center justify-center gap-1.5 rounded-[11px] bg-saffron px-3.5 py-2.5 text-[12px] font-bold text-pine-950 disabled:opacity-40"><IcPlus size={15} /> Добавить</button>
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              <input aria-label="Название позиции" value={extraName} onChange={(event) => setExtraName(event.target.value)} placeholder="Название позиции" className={inputCls} />
              <select aria-label="Категория позиции" value={extraCategory} onChange={(event) => setExtraCategory(event.target.value)} className={inputCls}>
                {state.productCategories.map((category) => <option key={category} value={category}>{category}</option>)}
              </select>
              <select aria-label="Единица измерения" value={extraUnit} onChange={(event) => setExtraUnit(event.target.value as Unit)} className={inputCls}>
                {UNITS.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
              </select>
              <input aria-label="Цена за единицу" value={extraPrice} onChange={(event) => setExtraPrice(event.target.value)} inputMode="decimal" placeholder="Цена за единицу, ₽" className={inputCls} />
              <input aria-label={`Количество, ${amountUnitLabel(extraUnit)}`} value={extraAmount} onChange={(event) => setExtraAmount(event.target.value)} inputMode="decimal" placeholder={`Количество, ${amountUnitLabel(extraUnit)}`} className={inputCls} />
              <button onClick={addExtraItem} disabled={!extraName.trim() || parseNum(extraAmount) <= 0 || parseNum(extraPrice) < 0} className="tap flex items-center justify-center gap-1.5 rounded-[11px] bg-saffron px-3.5 py-2.5 text-[12px] font-bold text-pine-950 disabled:opacity-40"><IcPlus size={15} /> Добавить</button>
            </div>
          )}
          {additionalItems.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {additionalItems.map((item) => {
                const product = getAdditionalShoppingProduct(item, state.products);
                if (!product) return null;
                return (
                  <div key={item.id} className="flex items-center gap-2 rounded-[9px] bg-pine-850 px-3 py-2">
                    <span className="min-w-0 grow truncate text-[12px] text-cream">{product.category} · {product.name} · {isWeighed(product.unit) ? amountLabel(item.amount, product.unit) : pieceAmountLabel(product, item.amount)}</span>
                    <span className="shrink-0 text-[11px] text-sage">{fmtMoney(ingredientCost({ productId: product.id, amount: item.amount }, [product, ...state.products]))}</span>
                    <button onClick={() => removeExtraItem(item.id)} aria-label={`Удалить дополнительную позицию ${product.name}`} className="tap grid h-7 w-7 shrink-0 place-items-center rounded-full text-sage hover:text-coral"><IcX size={14} /></button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 font-display text-[15px]"><IcCart size={16} className="text-mint" /> Список покупок</h2>
          <div className="flex flex-wrap items-center gap-2">
            {shopping.length > 0 && <span className="text-[11px] font-semibold text-sage">к закупке {toBuy.length} из {shopping.length} · {fmtMoney(toBuySum)}</span>}
            <Segmented options={[{ value: "category", label: "По категориям" }, { value: "place", label: "По месту покупки" }]} value={sortMode} onChange={setSortMode} />
          </div>
        </div>
        {shopping.length === 0 ? (<p className="rounded-[12px] border border-dashed border-pine-500/70 px-4 py-4 text-center text-[12.5px] text-sage">Появится автоматически из ингредиентов всех блюд меню и дополнительных позиций</p>) : (
          <div className="space-y-5">
            {(() => {
              const groups = new Map<string, typeof shopping>();
              for (const row of shopping) {
                const place = ev.purchasePlaces?.[row.product.id]?.trim();
                const key = sortMode === "category" ? row.product.category : place ?? "";
                const group = groups.get(key);
                if (group) group.push(row);
                else groups.set(key, [row]);
              }
              const sortedGroups = Array.from(groups.keys()).sort((a, b) => sortMode === "category"
                ? compareProductCategories(a, b, state.productCategories)
                : comparePurchasePlaces(a, b));
              return sortedGroups.map((groupName) => {
                const items = groups.get(groupName)!;
                const categoryTotal = items.reduce((s, r) => s + r.cost, 0);
                const categoryToBuy = items.filter((r) => !bought.has(r.product.id) && !inStock.has(r.product.id));
                return (
                  <div key={groupName} className="reveal">
                    <div className="mb-2.5 flex items-center gap-2.5"><span className="h-2 w-2 rounded-full bg-mint" /><h3 className="font-display text-[13px] font-bold text-mint">{groupName || "Место не указано"}</h3><span className="text-[11px] font-semibold text-sage">{items.length} {items.length === 1 ? "позиция" : items.length < 5 ? "позиции" : "позиций"}</span><span className="h-px grow bg-line" /><span className="hidden text-[11px] text-sage sm:inline">к закупке {categoryToBuy.length} · {fmtMoney(categoryTotal)}</span></div>
                    <div className="space-y-2">
                      {items.map((r) => {
                        const isBought = bought.has(r.product.id);
                        const isStock = inStock.has(r.product.id);
                        const hasClientItems = (r.clientAmount ?? 0) > 0;
                        return (
                          <div key={r.product.id} className={`reveal flex flex-wrap items-center gap-2.5 rounded-[13px] border px-3.5 py-2.5 transition-all ${isBought || isStock ? "border-mint/25 bg-mint/5 opacity-80" : "border-line bg-pine-800"}`}>
                            <div className="min-w-0 grow">
                              <p className={`truncate text-[13px] font-semibold text-cream ${isBought || isStock ? "text-sage" : ""}`}>{r.product.name}</p>
                              <p className="text-[10.5px] text-sage">{isPieceUnit(r.product.unit) ? shoppingPieceAmountLabel(r.product, r.amount, r.requiredAmount) : amountLabel(r.amount, r.product.unit)} · {fmtMoney(r.cost)}</p>
                              {hasClientItems && <p className="mt-1 text-[10px] text-glacier"><span className="font-semibold">Клиент:</span> {isPieceUnit(r.product.unit) ? pieceAmountLabel(r.product, r.clientAmount!) : amountLabel(r.clientAmount!, r.product.unit)}{r.clientNotes && <span className="ml-1 text-sage">· {r.clientNotes}</span>}</p>}
                              {r.usedInDishes && r.usedInDishes.length > 0 && <p className="mt-1 text-[10px] text-sage"><span className="font-semibold">В блюдах:</span> {r.usedInDishes.map((d) => `${d.name} — ${d.amount}`).join(", ")}</p>}
                            </div>
                            <input
                              aria-label={`Где купить: ${r.product.name}`}
                              value={ev.purchasePlaces?.[r.product.id] ?? ""}
                              onChange={(event) => setPurchasePlace([ev.id], r.product.id, event.target.value)}
                              placeholder="Где купить?"
                              className={inputCls + " w-[130px] max-w-[42vw] py-1.5 text-[11px] sm:w-[180px] sm:text-[12px]"}
                            />
                            <button onClick={() => toggle("inStock", r.product.id)} className={`tap rounded-full border px-2.5 py-1 text-[10.5px] font-bold transition-colors ${isStock ? "border-glacier/50 bg-glacier/15 text-glacier" : "border-line text-sage hover:text-glacier"}`}>есть на складе</button>
                            <button onClick={() => toggle("bought", r.product.id)} className={`tap rounded-full border px-2.5 py-1 text-[10.5px] font-bold transition-colors ${isBought ? "border-mint/50 bg-mint/15 text-mint" : "border-line text-sage hover:text-mint"}`}>куплено</button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
