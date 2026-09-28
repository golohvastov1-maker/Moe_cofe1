import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import type { Category, CategoryInfo, MarkupMode, Product, Recipe, ServingStyle } from "../types";
import { SERVING_LABEL, amountUnitLabel, catStyle } from "../types";
import { useStore } from "../store";
import { downloadText, fmtMoney, fmtNum, ingredientCost, parseNum, recipeCost, recipeFinalPerPortion, recipeFinalTotal, recipePerPortion, recipeTotalWeight, round2, uid } from "../utils";
import { AmountEditor, DangerConfirm, EmptyState, Field, Modal, Segmented, ServingBadge, Stepper, inputCls, selectCls, textareaCls, useToast } from "./UI";
import { IcDownload, IcHat, IcPlate, IcPlus, IcPrinter, IcSearch, IcTable, IcX } from "./Icons";
import { RecipesPricePreview } from "./PrintDocs";

function compositionStr(r: Recipe, products: Product[]): string {
  return r.ingredients.map((i) => { const p = products.find((x) => x.id === i.productId); return p ? `${p.name} — ${fmtNum(i.amount)} ${amountUnitLabel(p.unit)} (${fmtMoney(ingredientCost(i, products))})` : null; }).filter(Boolean).join("; ");
}

export function RecipesScreen() {
  const { state, deleteRecipe, usageInEvents } = useStore();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Recipe | null>(null);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<Category | "все">("все");
  const [priceOpen, setPriceOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const filtered = useMemo(() => state.recipes.filter((r) => { const okQ = !q || r.name.toLowerCase().includes(q.trim().toLowerCase()); const okC = cat === "все" || r.category === cat; return okQ && okC; }), [state.recipes, q, cat]);
  const exportCsv = () => {
    const esc = (s: string) => (s.includes(";") ? `"${s}"` : s);
    const lines = ["Название;Категория;Способ подачи;Выход (г);Рассчитано на чел-к в эталоне;Себестоимость порции;Наценка (% или фикс. цена блюда);Цена с чел-ка;Блюдо (цена);Состав",
      ...state.recipes.map((r) => { const pp = recipePerPortion(r, state.products); const price = recipeFinalPerPortion(r, state.products); const markup = r.markupMode === "fixed" ? `фикс. ${String(round2(r.markupValue)).replace(".", ",")} руб.` : `${r.markupValue}%`; return [esc(r.name), r.category, SERVING_LABEL[r.serving], String(r.servingWeight), String(r.portions), String(round2(pp)).replace(".", ","), markup, String(round2(price)).replace(".", ","), String(round2(price * r.portions)).replace(".", ","), esc(compositionStr(r, state.products))].join(";"); })];
    downloadText("recipes-price-list.csv", lines.join("\r\n"));
    toast("Список блюд с ценами и составом выгружен в CSV");
  };
  return (
    <section className="px-5 pb-8 pt-6 md:px-8">
      <header className="reveal flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-[26px] leading-none text-cream">Рецепты</h1>
          <p className="mt-2 text-[13px] text-sage">Кулинарный справочник · себестоимость по складу, цена — с наценкой блюда</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setCategoriesOpen(true)} className="tap flex items-center gap-2 rounded-[12px] border border-line bg-pine-800/80 px-3.5 py-2.5 text-[12px] font-semibold text-sage transition-all hover:border-mint/50 hover:text-mint hover:bg-pine-800">Категории</button>
          <button onClick={exportCsv} disabled={state.recipes.length === 0} className="tap flex items-center gap-2 rounded-[12px] border border-line bg-pine-800/80 px-3.5 py-2.5 text-[12px] font-semibold text-sage transition-all hover:border-mint/50 hover:text-mint hover:bg-pine-800 disabled:opacity-40"><IcDownload size={15} /> Выгрузить CSV</button>
          <button onClick={() => setPriceOpen(true)} disabled={state.recipes.length === 0} className="tap flex items-center gap-2 rounded-[12px] border border-line bg-pine-800/80 px-3.5 py-2.5 text-[12px] font-semibold text-sage transition-all hover:border-mint/50 hover:text-mint hover:bg-pine-800 disabled:opacity-40"><IcPrinter size={15} /> Прайс-лист</button>
          <button onClick={() => { setEditing(null); setOpen(true); }} className="tap flex items-center gap-2 rounded-[12px] bg-gradient-to-br from-saffron to-amber-500 px-4 py-2.5 font-display text-[12px] font-bold text-pine-950 shadow-lg shadow-saffron/20 hover:shadow-saffron/40 hover:scale-105"><IcPlus size={16} /> Рецепт</button>
        </div>
      </header>
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] grow sm:max-w-[320px]"><IcSearch size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sage" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск рецепта…" className={inputCls + " pl-10"} /></div>
        <div className="flex flex-wrap gap-1.5">
          <button onClick={() => setCat("все")} className={`tap rounded-full border px-3 py-1.5 text-[11.5px] font-semibold transition-colors ${cat === "все" ? "border-saffron/60 bg-saffron/15 text-saffron" : "border-line bg-pine-800 text-sage hover:text-cream"}`}>Все · {state.recipes.length}</button>
          {state.categories.map((c) => { const st = catStyle(c.name); const active = cat === c.name; const n = state.recipes.filter((r) => r.category === c.name).length; return (<button key={c.id} onClick={() => setCat(c.name)} className="tap rounded-full border px-3 py-1.5 text-[11.5px] font-semibold transition-colors" style={active ? { borderColor: st.fg, background: st.bg, color: st.fg } : { borderColor: "var(--color-line)", color: "var(--color-sage)" }}>{c.name} · {n}</button>); })}
        </div>
      </div>
      {state.recipes.length === 0 ? (<EmptyState icon={<IcHat size={24} />} title="Справочник пуст" text="Создайте первый рецепт: состав подтянется со склада, себестоимость посчитается сама." action={<button onClick={() => { setEditing(null); setOpen(true); }} className="tap rounded-full bg-saffron px-5 py-2.5 font-display text-[12px] font-bold text-pine-950">Новый рецепт</button>} />) : filtered.length === 0 ? (<p className="reveal mt-10 text-center text-[13px] text-sage">Ничего не нашлось — попробуйте другой фильтр</p>) : (
        <div className="mt-5 space-y-6">
          {state.categories.map((c) => {
            const group = filtered.filter((r) => r.category === c.name).sort((a, b) => a.name.localeCompare(b.name, "ru"));
            if (group.length === 0) return null;
            const st = catStyle(c.name);
            const groupTotal = group.reduce((s, r) => s + recipeFinalTotal(r, state.products), 0);
            return (
              <div key={c.id} className="reveal">
                <div className="mb-2.5 flex items-center gap-2.5"><span className="h-2 w-2 rounded-full" style={{ background: st.fg }} /><h2 className="font-display text-[14px] font-bold" style={{ color: st.fg }}>{c.name}</h2><span className="text-[11px] font-semibold text-sage">{group.length} {group.length === 1 ? "блюдо" : group.length < 5 ? "блюда" : "блюд"}</span><span className="h-px grow bg-line" /><span className="hidden text-[11px] text-sage sm:inline">по ценам меню {fmtMoney(groupTotal)}</span></div>
                <div className="overflow-hidden rounded-[16px] border border-line bg-pine-850">
                  {group.map((r, i) => {
                    const inEvents = usageInEvents(r.id);
                    const costPer = recipePerPortion(r, state.products);
                    return (
                      <div key={r.id} role="button" tabIndex={0} onClick={() => { setEditing(r); setOpen(true); }} onKeyDown={(e) => { if (e.key === "Enter") { setEditing(r); setOpen(true); } }} className={`reveal group flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-pine-800/70 ${i > 0 ? "border-t border-line/70" : ""}`} style={{ animationDelay: `${Math.min(i * 40, 320)}ms` }}>
                        <div className="min-w-0 grow">
                          <div className="flex items-center gap-2"><p className="truncate text-[13.5px] font-semibold text-cream">{r.name}</p><ServingBadge serving={r.serving} /></div>
                          <p className="mt-0.5 truncate text-[11.5px] text-sage">выход {r.servingWeight} г · общий вес {fmtNum(recipeTotalWeight(r, state.products))} г · рассчитано на {r.portions} чел-к в эталоне · {r.ingredients.length} ингр.{inEvents > 0 && ` · в ${inEvents} событ.`}</p>
                        </div>
                        <div className="hidden shrink-0 text-right sm:block">
                          <p className="font-display text-[15px] font-bold leading-tight text-saffron">{fmtMoney(recipeFinalPerPortion(r, state.products))}</p>
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-sage">цена с чел-ка</p>
                          <p className="text-[9.5px] text-sage">себест. {fmtMoney(costPer)} · {r.markupMode === "fixed" ? "фикс. цена" : `наценка +${r.markupValue}%`}</p>
                        </div>
                        <div className="w-[92px] shrink-0 text-right">
                          <p className="font-display text-[13px] leading-tight text-mint">{fmtMoney(recipeFinalTotal(r, state.products))}</p>
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-sage">блюдо</p>
                        </div>
                        <div className="shrink-0 opacity-40 transition-opacity group-hover:opacity-100" onClick={(e) => e.stopPropagation()}><DangerConfirm onConfirm={() => { deleteRecipe(r.id); toast("Рецепт удалён", "del"); }} /></div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <RecipeSheet open={open} onClose={() => setOpen(false)} editing={editing} />
      <RecipesPricePreview open={priceOpen} onClose={() => setPriceOpen(false)} />
      <CategoriesManager open={categoriesOpen} onClose={() => setCategoriesOpen(false)} />
    </section>
  );
}

interface RowDraft { productId: string; amount: number; }

function RecipeSheet({ open, onClose, editing }: { open: boolean; onClose: () => void; editing: Recipe | null }) {
  const { state, saveRecipe, deleteRecipe } = useStore();
  const toast = useToast();
  const [name, setName] = useState("");
  const [category, setCategory] = useState<Category>("Горячие блюда");
  const [description, setDescription] = useState("");
  const [techNote, setTechNote] = useState("");
  const [serving, setServing] = useState<ServingStyle>("per-person");
  const [portions, setPortions] = useState(8);
  const [servingWeight, setServingWeight] = useState("250");
  const [markupMode, setMarkupMode] = useState<MarkupMode>("percent");
  const [markupValueStr, setMarkupValueStr] = useState("60");
  const [rows, setRows] = useState<RowDraft[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickQ, setPickQ] = useState("");
  useEffect(() => {
    if (open) {
      setName(editing?.name ?? "");
      setCategory(editing?.category ?? "Горячие блюда");
      setDescription(editing?.description ?? "");
      setTechNote(editing?.techNote ?? "");
      setServing(editing?.serving ?? "per-person");
      setPortions(editing?.portions ?? 8);
      setServingWeight(editing ? String(editing.servingWeight) : "250");
      setMarkupMode(editing?.markupMode ?? "percent");
      setMarkupValueStr(editing ? String(editing.markupValue).replace(".", ",") : "60");
      setRows((editing?.ingredients ?? []).map((i) => ({ productId: i.productId, amount: i.amount })));
      setPickQ("");
    }
  }, [open, editing]);
  const parsed = rows.filter((r) => r.amount > 0);
  const markupValue = parseNum(markupValueStr);
  const draft: Recipe = { id: editing?.id ?? "draft", name, category, description, techNote, serving, portions, servingWeight: parseNum(servingWeight), markupMode, markupValue, ingredients: parsed };
  const total = recipeCost(draft, state.products);
  const pp = portions > 0 ? total / portions : 0;
  const pricePer = markupMode === "fixed" ? (portions > 0 ? markupValue / portions : 0) : pp * (1 + markupValue / 100);
  const valid = name.trim().length > 0 && parsed.length > 0 && portions >= 1;
  const updateAmount = (idx: number, v: number) => setRows((rs) => rs.map((r, i) => (i === idx ? { ...r, amount: v } : r)));
  const removeRow = (idx: number) => setRows((rs) => rs.filter((_, i) => i !== idx));
  const addRow = (productId: string) => { const p = state.products.find((x) => x.id === productId); if (!p) return; const def = p.unit === "кг" ? 500 : p.unit === "л" ? 200 : 1; setRows((rs) => [...rs, { productId, amount: def }]); setPickerOpen(false); };
  const save = () => {
    if (!valid) return;
    saveRecipe({ id: editing?.id ?? uid(), name: name.trim(), category, description: description.trim(), techNote: techNote.trim(), serving, portions, servingWeight: Math.max(1, parseNum(servingWeight)), markupMode, markupValue: round2(markupValue), ingredients: parsed.map((p) => ({ productId: p.productId, amount: round2(p.amount) })) });
    toast(editing ? "Рецепт сохранён" : "Рецепт добавлен");
    onClose();
  };
  const pickerList = state.products.filter((p) => p.name.toLowerCase().includes(pickQ.trim().toLowerCase())).sort((a, b) => a.name.localeCompare(b.name, "ru"));
  const fillStyle = { "--fill": `${(Math.min(markupValue, 300) / 300) * 100}%` } as CSSProperties;
  return (
    <>
      <Modal open={open} onClose={onClose} title={editing ? "Рецепт" : "Новый рецепт"} subtitle="Себестоимость пересчитывается на лету при каждом изменении состава" maxW="max-w-[640px]" footer={
        <div>
          <div className="mb-3 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
            <div><p className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-sage">Себестоимость блюда</p><p className="font-display text-[18px] leading-tight text-cream">{fmtMoney(total)}</p></div>
            <div><p className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-sage">Себест. порции</p><p className="font-display text-[15px] leading-tight text-mint">{fmtMoney(pp)}</p></div>
            <div><p className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-sage">Общий вес</p><p className="font-display text-[15px] leading-tight text-glacier">{fmtNum(recipeTotalWeight(draft, state.products))} г</p></div>
            <div className="text-right"><p className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-sage">Цена с чел-ка · {markupMode === "fixed" ? "фикс. цена" : `+${fmtNum(markupValue)}%`}</p><p className="font-display text-[21px] leading-tight text-saffron">{fmtMoney(pricePer)}</p></div>
          </div>
          <div className="flex items-center gap-3">
            {editing && <DangerConfirm hint="удалить?" onConfirm={() => { deleteRecipe(editing.id); toast("Рецепт удалён", "del"); onClose(); }} />}
            <button onClick={onClose} className="tap shrink-0 rounded-[14px] border border-line px-5 py-3 font-display text-[13px] font-bold text-sage transition-colors hover:border-pine-400 hover:text-cream">Отмена</button>
            <button onClick={save} disabled={!valid} className="tap grow rounded-[14px] bg-saffron py-3 font-display text-[13px] font-bold text-pine-950 transition-opacity disabled:opacity-35">Сохранить</button>
          </div>
        </div>
      }>
        <div className="space-y-5">
          <Field label="Название блюда"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Например, Судак, запечённый с овощами" className={inputCls} autoFocus={!editing} /></Field>
          <Field label="Категория" hint="строго из справочника — влияет на группировку в документах"><select value={category} onChange={(e) => setCategory(e.target.value as Category)} className={selectCls}>{state.categories.map((c) => (<option key={c.id} value={c.name}>{c.name}</option>))}</select></Field>
          <Field label="Описание для клиентского меню"><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Пара фраз, которые увидит гость в печатном меню…" className={textareaCls} /></Field>
          <Field label="Способ подачи" hint={serving === "shared" ? "блюдо выносится целиком на стол — торт, кувшин морса, ассорти" : "каждому гостю — отдельная порция на тарелке"}>
            <div className="grid grid-cols-2 gap-2">
              {([{ v: "per-person", label: "Порционно", Icon: IcPlate }, { v: "shared", label: "Общим на стол", Icon: IcTable }] as const).map(({ v, label, Icon }) => { const active = serving === v; return (<button key={v} onClick={() => setServing(v)} className={`tap flex items-center justify-center gap-2 rounded-[12px] border py-2.5 text-[12.5px] font-semibold transition-colors ${active ? (v === "shared" ? "border-saffron/70 bg-saffron/12 text-saffron" : "border-mint/60 bg-mint/12 text-mint") : "border-line bg-pine-800 text-sage hover:text-cream"}`}><Icon size={15} />{label}</button>); })}
            </div>
          </Field>
          <Field label="Описание для тех. карты" hint="технологические нюансы для поваров: температуры, время, порядок операций"><textarea value={techNote} onChange={(e) => setTechNote(e.target.value)} rows={2} placeholder="Например: запекать при 180 °C 25 минут, соус не кипятить…" className={textareaCls} /></Field>
          <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2">
            <Field label="Рассчитано на чел-к в эталоне"><Stepper value={portions} onChange={setPortions} min={1} /></Field>
            <Field label="Выход порции, г"><input value={servingWeight} onChange={(e) => setServingWeight(e.target.value)} inputMode="numeric" className={inputCls + " font-display font-semibold"} /></Field>
          </div>
          <div>
            <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.08em] text-sage">Наценка блюда</span>
            <div className="flex flex-wrap items-center gap-3">
              <Segmented options={[{ value: "percent" as MarkupMode, label: "Процент" }, { value: "fixed" as MarkupMode, label: "Фикс. цена" }]} value={markupMode} onChange={setMarkupMode} />
              {markupMode === "percent" ? (<div className="min-w-[220px] grow"><input type="range" min={0} max={300} step={5} value={Math.min(markupValue, 300)} onChange={(e) => setMarkupValueStr(e.target.value)} style={fillStyle} className="w-full" /></div>) : null}
              <div className="relative w-[130px]"><input value={markupValueStr} onChange={(e) => setMarkupValueStr(e.target.value)} inputMode="decimal" placeholder="0" className={inputCls + " pr-9 py-2 text-right font-display font-semibold"} /><span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[12px] font-bold text-saffron">{markupMode === "percent" ? "%" : "₽"}</span></div>
            </div>
            <p className="mt-1.5 text-[11px] text-sage">{markupMode === "percent" ? "цена с чел-ка = себестоимость порции × (1 + наценка)" : "фиксированная конечная цена блюда за весь эталонный выход; цена с чел-ка = цена ÷ человек в эталоне"}</p>
          </div>
          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-sage">Ингредиенты · {rows.length}</p>
            {rows.length === 0 && <p className="rounded-[12px] border border-dashed border-pine-500/70 px-4 py-4 text-center text-[12.5px] text-sage">Состав пуст — добавьте ингредиенты ниже</p>}
            <div className="space-y-2">
              {rows.map((r, i) => { const p = state.products.find((x) => x.id === r.productId); if (!p) return null; return (<div key={p.id} className="reveal rounded-[13px] border border-line bg-pine-700/70 p-3"><div className="flex items-center justify-between gap-2"><p className="min-w-0 truncate text-[13.5px] font-semibold text-cream">{p.name}</p><button onClick={() => removeRow(i)} aria-label="Убрать ингредиент" className="tap grid h-6 w-6 shrink-0 place-items-center rounded-full text-sage hover:text-coral"><IcX size={13} /></button></div><div className="mt-2 flex flex-wrap items-center gap-2"><AmountEditor product={p} value={r.amount} onChange={(v) => updateAmount(i, v)} /><span className="ml-auto whitespace-nowrap font-display text-[13px] font-semibold text-saffron">{fmtMoney(ingredientCost({ productId: p.id, amount: r.amount }, state.products))}</span></div><p className="mt-1 text-[10.5px] text-sage">{fmtMoney(p.price)} / {p.unit}</p></div>); })}
            </div>
            {state.products.length === 0 ? (<p className="mt-3 rounded-[12px] border border-dashed border-coral/40 px-4 py-3 text-center text-[12.5px] text-coral">Сначала заведите продукты на вкладке «Продукты»</p>) : (<button onClick={() => { setPickQ(""); setPickerOpen(true); }} className="tap mt-2.5 flex w-full items-center justify-center gap-2 rounded-[12px] border border-dashed border-pine-500 py-3 text-[13px] font-semibold text-sage hover:border-saffron/50 hover:text-cream"><IcPlus size={16} /> Добавить ингредиент</button>)}
          </div>
        </div>
      </Modal>
      <Modal open={pickerOpen} onClose={() => setPickerOpen(false)} title="Выбрать продукт" subtitle="Цены подтянутся из базы автоматически">
        <div className="relative"><IcSearch size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sage" /><input value={pickQ} onChange={(e) => setPickQ(e.target.value)} placeholder="Поиск по базе…" className={inputCls + " pl-10"} autoFocus /></div>
        <div className="mt-3 space-y-2 pb-2">
          {pickerList.map((p) => { const added = rows.some((r) => r.productId === p.id); return (<button key={p.id} disabled={added} onClick={() => addRow(p.id)} className={`tap flex w-full items-center gap-3 rounded-[12px] border px-3.5 py-2.5 text-left transition-colors ${added ? "border-mint/25 bg-mint/6 opacity-60" : "border-line bg-pine-800 hover:border-saffron/40"}`}><span className="min-w-0 grow"><span className="block truncate text-[13.5px] font-semibold text-cream">{p.name}</span><span className="text-[11px] text-sage">{fmtMoney(p.price)} / {p.unit} · {p.category}</span></span>{added ? (<span className="shrink-0 text-[11px] font-bold text-mint">добавлен</span>) : (<IcPlus size={16} className="shrink-0 text-saffron" />)}</button>); })}
          {pickerList.length === 0 && <p className="py-6 text-center text-[13px] text-sage">Ничего не нашлось</p>}
        </div>
      </Modal>
    </>
  );
}

function CategoriesManager({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, saveCategory, deleteCategory } = useStore();
  const toast = useToast();
  const [editing, setEditing] = useState<CategoryInfo | null>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#f4a83a");
  const COLORS = ["#f4a83a", "#85c9e8", "#7ed9b0", "#8fd0c9", "#eb9cc3", "#aebfd2", "#e9684f", "#f07358", "#6ee7b7", "#7dd3fc", "#f0abcf", "#b8c9db"];
  const openNew = () => { setEditing(null); setName(""); setColor("#f4a83a"); };
  const openEdit = (c: CategoryInfo) => { setEditing(c); setName(c.name); setColor(c.color); };
  const save = () => {
    if (!name.trim()) return;
    saveCategory({ id: editing?.id ?? uid(), name: name.trim(), color, isDefault: editing?.isDefault ?? false });
    toast(editing ? "Категория обновлена" : "Категория добавлена");
    setEditing(null);
    setName("");
  };
  const del = (id: string) => { deleteCategory(id); toast("Категория удалена", "del"); };
  return (
    <>
      <Modal open={open} onClose={onClose} title="Управление категориями" subtitle="Создавайте и редактируйте категории рецептов" maxW="max-w-[600px]">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-[13px] font-semibold text-cream">Категории</h3>
            <button onClick={openNew} className="tap flex items-center gap-1.5 rounded-[10px] bg-saffron px-3 py-1.5 text-[11px] font-bold text-pine-950 hover:brightness-110"><IcPlus size={13} /> Новая</button>
          </div>
          <div className="space-y-2">
            {state.categories.map((c) => (
              <div key={c.id} className="flex items-center gap-3 rounded-[12px] border border-line bg-pine-800 px-3.5 py-2.5">
                <span className="h-3 w-3 rounded-full" style={{ background: c.color }} />
                <span className="min-w-0 grow text-[13px] font-semibold text-cream">{c.name}</span>
                {c.isDefault && <span className="text-[10px] font-semibold text-sage">системная</span>}
                <button onClick={() => openEdit(c)} className="tap text-[11px] font-semibold text-sage hover:text-saffron">Изменить</button>
                {!c.isDefault && <DangerConfirm onConfirm={() => del(c.id)} hint="удалить?" />}
              </div>
            ))}
          </div>
        </div>
      </Modal>
      {editing !== null && (
        <Modal open onClose={() => setEditing(null)} title={editing ? "Редактировать категорию" : "Новая категория"} footer={
          <div className="flex items-center gap-3">
            <button onClick={() => setEditing(null)} className="tap shrink-0 rounded-[14px] border border-line px-5 py-3 font-display text-[13px] font-bold text-sage transition-colors hover:border-pine-400 hover:text-cream">Отмена</button>
            <button onClick={save} disabled={!name.trim()} className="tap grow rounded-[14px] bg-saffron py-3 font-display text-[13px] font-bold text-pine-950 transition-opacity disabled:opacity-35">Сохранить</button>
          </div>
        }>
          <div className="space-y-5">
            <Field label="Название категории"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Например, Закуски" className={inputCls} autoFocus /></Field>
            <Field label="Цвет"><div className="grid grid-cols-6 gap-2">{COLORS.map((c) => (<button key={c} onClick={() => setColor(c)} className={`tap h-10 w-10 rounded-[10px] border-2 transition-all ${color === c ? "border-saffron scale-110" : "border-line hover:border-sage"}`} style={{ background: c }} />))}</div></Field>
          </div>
        </Modal>
      )}
    </>
  );
}
