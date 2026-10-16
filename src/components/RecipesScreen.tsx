import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import type { Category, CategoryInfo, MarkupMode, Product, Recipe, ServingStyle } from "../types";
import { SERVING_LABEL, amountUnitLabel, catStyle, isWeighed } from "../types";
import { useStore } from "../store";
import { amountLabel, downloadText, fmtMoney, fmtNum, ingredientCost, parseNum, pieceAmountLabel, recipeCost, recipeFinalPerPortion, recipePerPortion, recipeTotalWeight, round2, uid } from "../utils";
import { AmountEditor, DangerConfirm, EmptyState, Field, Modal, Segmented, ServingBadge, Stepper, inputCls, selectCls, textareaCls, useToast } from "./UI";
import { IcDownload, IcHat, IcPlate, IcPlus, IcPrinter, IcSearch, IcTable, IcX } from "./Icons";
import { CategoriesManager } from "./Screens";
import { RecipesPricePreview } from "./PrintDocs";

function compositionStr(r: Recipe, products: Product[]): string {
  return r.ingredients.map((i) => { const p = products.find((x) => x.id === i.productId); return p ? `${p.name} — ${fmtNum(i.amount)} ${amountUnitLabel(p.unit)} (${fmtMoney(ingredientCost(i, products))})` : null; }).filter(Boolean).join("; ");
}

export function RecipesScreen() {
  const { state, deleteRecipe } = useStore();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Recipe | null>(null);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<Category | "все">("все");
  const [priceOpen, setPriceOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [techCardPreview, setTechCardPreview] = useState<Recipe | null>(null);
  const filtered = useMemo(() => state.recipes.filter((r) => { const okQ = !q || r.name.toLowerCase().includes(q.trim().toLowerCase()); const okC = cat === "все" || r.category === cat; return okQ && okC; }), [state.recipes, q, cat]);
  const exportCsv = () => {
    const esc = (s: string) => (s.includes(";") ? `"${s}"` : s);
    const lines = ["Название;Категория;Способ подачи;Выход (г);Рассчитано на чел-к в эталоне;Себестоимость порции;Наценка;Цена с чел-ка;Блюдо (цена);Состав",
      ...state.recipes.map((r) => { const pp = recipePerPortion(r, state.products); const price = recipeFinalPerPortion(r, state.products); const markup = r.markupMode === "fixed" ? `фикс. ${String(round2(r.markupValue)).replace(".", ",")} руб.` : `${r.markupValue}%`; return [esc(r.name), r.category, SERVING_LABEL[r.serving], String(r.servingWeight), String(r.portions), String(round2(pp)).replace(".", ","), markup, String(round2(price)).replace(".", ","), String(round2(price * r.portions)).replace(".", ","), esc(compositionStr(r, state.products))].join(";"); })];
    downloadText("recipes-price-list.csv", lines.join("\r\n"));
    toast("Список блюд с ценами и составом выгружен в CSV");
  };
  return (
    <section className="px-5 pb-8 pt-6 md:px-8">
      <header className="reveal flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="font-display text-[26px] leading-none text-cream">Рецепты</h1><p className="mt-2 text-[13px] text-sage">Кулинарный справочник · себестоимость по складу, цена — с наценкой блюда</p></div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setCategoriesOpen(true)} className="tap flex items-center gap-2 rounded-[12px] border border-line bg-pine-800/80 px-3.5 py-2.5 text-[12px] font-semibold text-sage hover:border-mint/50 hover:text-mint hover:bg-pine-800">Категории</button>
          <button onClick={exportCsv} disabled={state.recipes.length === 0} className="tap flex items-center gap-2 rounded-[12px] border border-line bg-pine-800/80 px-3.5 py-2.5 text-[12px] font-semibold text-sage hover:border-mint/50 hover:text-mint hover:bg-pine-800 disabled:opacity-40"><IcDownload size={15} /> Выгрузить CSV</button>
          <button onClick={() => setPriceOpen(true)} disabled={state.recipes.length === 0} className="tap flex items-center gap-2 rounded-[12px] border border-line bg-pine-800/80 px-3.5 py-2.5 text-[12px] font-semibold text-sage hover:border-mint/50 hover:text-mint hover:bg-pine-800 disabled:opacity-40"><IcPrinter size={15} /> Прайс-лист</button>
          <button onClick={() => { setEditing(null); setOpen(true); }} className="tap flex items-center gap-2 rounded-[12px] bg-gradient-to-br from-saffron to-amber-500 px-4 py-2.5 font-display text-[12px] font-bold text-pine-950 shadow-lg shadow-saffron/20 hover:scale-105"><IcPlus size={16} /> Рецепт</button>
        </div>
      </header>
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] grow sm:max-w-[320px]"><IcSearch size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sage" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск рецепта…" className={inputCls + " pl-10"} /></div>
        <div className="flex flex-wrap gap-1.5">
          <button onClick={() => setCat("все")} className={`tap rounded-full border px-3 py-1.5 text-[11.5px] font-semibold transition-colors ${cat === "все" ? "border-saffron/60 bg-saffron/15 text-saffron" : "border-line bg-pine-800 text-sage hover:text-cream"}`}>Все · {state.recipes.length}</button>
          {state.categories.map((c) => { const st = catStyle(c.name); const active = cat === c.name; const n = state.recipes.filter((r) => r.category === c.name).length; return (<button key={c.id} onClick={() => setCat(c.name)} className="tap rounded-full border px-3 py-1.5 text-[11.5px] font-semibold transition-colors" style={active ? { borderColor: st.fg, background: st.bg, color: st.fg } : { borderColor: "var(--color-line)", color: "var(--color-sage)" }}>{c.name} · {n}</button>); })}
        </div>
      </div>
      {state.recipes.length === 0 ? (<EmptyState icon={<IcHat size={24} />} title="Справочник пуст" text="Создайте первый рецепт: состав подтянется со склада, себестоимость посчитается сама." action={<button onClick={() => { setEditing(null); setOpen(true); }} className="tap rounded-full bg-saffron px-5 py-2.5 font-display text-[12px] font-bold text-pine-950">Новый рецепт</button>} />) : filtered.length === 0 ? (<p className="reveal mt-10 text-center text-[13px] text-sage">Ничего не нашлось</p>) : (
        <div className="mt-5 space-y-6">
          {state.categories.map((c) => {
            const group = filtered.filter((r) => r.category === c.name).sort((a, b) => a.name.localeCompare(b.name, "ru"));
            if (group.length === 0) return null;
            const st = catStyle(c.name);
            return (
              <div key={c.id} className="reveal">
                <div className="mb-2.5 flex items-center gap-2.5"><span className="h-2 w-2 rounded-full" style={{ background: st.fg }} /><h2 className="font-display text-[14px] font-bold" style={{ color: st.fg }}>{c.name}</h2><span className="text-[11px] font-semibold text-sage">{group.length} {group.length === 1 ? "блюдо" : group.length < 5 ? "блюда" : "блюд"}</span><span className="h-px grow bg-line" /></div>
                <div className="overflow-hidden rounded-[16px] border border-line bg-pine-850">
                  {group.map((r, i) => {
                    return (
                      <div key={r.id} role="button" tabIndex={0} onClick={() => { setEditing(r); setOpen(true); }} className={`reveal group flex flex-wrap cursor-pointer items-center gap-2 px-3 py-3 hover:bg-pine-800/70 sm:flex-nowrap sm:gap-3 sm:px-4 ${i > 0 ? "border-t border-line/70" : ""}`}>
                        <div className="min-w-0 grow basis-[65%]">
                          <p className="truncate text-[13.5px] font-semibold text-cream">{r.name}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            <ServingBadge serving={r.serving} />
                            {r.hideFromPriceList && <span className="shrink-0 rounded-full border border-coral/30 bg-coral/10 px-2 py-0.5 text-[9px] font-bold uppercase text-coral">скрыто из прайса</span>}
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="font-display text-[15px] font-bold leading-tight text-saffron">{fmtMoney(recipeFinalPerPortion(r, state.products))}</p>
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-sage">цена с чел-ка</p>
                        </div>
                        <div className="ml-auto flex shrink-0 items-center gap-1 opacity-60 group-hover:opacity-100 sm:ml-0" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => setTechCardPreview(r)} aria-label="Печать тех.карты" className="tap grid h-8 w-8 place-items-center rounded-[10px] border border-line text-sage hover:border-mint/50 hover:text-mint" title="Печать тех.карты"><IcPrinter size={14} /></button>
                          <DangerConfirm onConfirm={() => { deleteRecipe(r.id); toast("Рецепт удалён", "del"); }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <RecipeSheet open={open} onClose={() => setOpen(false)} editing={editing} onPreviewTechCard={setTechCardPreview} />
      <RecipesPricePreview open={priceOpen} onClose={() => setPriceOpen(false)} />
      <CategoriesManager open={categoriesOpen} onClose={() => setCategoriesOpen(false)} />
      {techCardPreview && <TechCardPreview recipe={techCardPreview} onClose={() => setTechCardPreview(null)} />}
    </section>
  );
}

interface RowDraft { productId: string; amount: number; }

function RecipeSheet({ open, onClose, editing, onPreviewTechCard }: { open: boolean; onClose: () => void; editing: Recipe | null; onPreviewTechCard: (recipe: Recipe) => void }) {
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
  const [hideFromPriceList, setHideFromPriceList] = useState(false);
  useEffect(() => {
    if (open) {
      setName(editing?.name ?? ""); setCategory(editing?.category ?? "Горячие блюда");
      setDescription(editing?.description ?? ""); setTechNote(editing?.techNote ?? "");
      setServing(editing?.serving ?? "per-person"); setPortions(editing?.portions ?? 8);
      setServingWeight(editing ? String(editing.servingWeight) : "250");
      setMarkupMode(editing?.markupMode ?? "percent");
      setMarkupValueStr(editing ? String(editing.markupValue).replace(".", ",") : "60");
      setRows((editing?.ingredients ?? []).map((i) => ({ productId: i.productId, amount: i.amount })));
      setHideFromPriceList(editing?.hideFromPriceList ?? false);
      setPickQ("");
    }
  }, [open, editing]);
  const parsed = rows.filter((r) => r.amount > 0);
  const markupValue = parseNum(markupValueStr);
  const draft: Recipe = { id: editing?.id ?? "draft", name, category, description, techNote, serving, portions, servingWeight: parseNum(servingWeight), markupMode, markupValue, hideFromPriceList, ingredients: parsed };
  const total = recipeCost(draft, state.products);
  const pp = portions > 0 ? total / portions : 0;
  const pricePer = markupMode === "fixed" ? (portions > 0 ? markupValue / portions : 0) : pp * (1 + markupValue / 100);
  const valid = name.trim().length > 0 && parsed.length > 0 && portions >= 1;
  const updateAmount = (idx: number, v: number) => setRows((rs) => rs.map((r, i) => (i === idx ? { ...r, amount: v } : r)));
  const removeRow = (idx: number) => setRows((rs) => rs.filter((_, i) => i !== idx));
  const addRow = (productId: string) => { const p = state.products.find((x) => x.id === productId); if (!p) return; const def = p.unit === "кг" ? 500 : p.unit === "л" ? 200 : 1; setRows((rs) => [...rs, { productId, amount: def }]); setPickerOpen(false); };
  const save = () => {
    if (!valid) return;
    saveRecipe({ id: editing?.id ?? uid(), name: name.trim(), category, description: description.trim(), techNote: techNote.trim(), serving, portions, servingWeight: Math.max(1, parseNum(servingWeight)), markupMode, markupValue: round2(markupValue), hideFromPriceList, ingredients: parsed.map((p) => ({ productId: p.productId, amount: round2(p.amount) })) });
    toast(editing ? "Рецепт сохранён" : "Рецепт добавлен"); onClose();
  };
  const pickerList = state.products.filter((p) => p.name.toLowerCase().includes(pickQ.trim().toLowerCase())).sort((a, b) => a.name.localeCompare(b.name, "ru"));
  const fillStyle = { "--fill": `${(Math.min(markupValue, 300) / 300) * 100}%` } as CSSProperties;
  return (
    <>
      <Modal open={open} onClose={onClose} title={editing ? "Рецепт" : "Новый рецепт"} subtitle="Себестоимость пересчитывается на лету" maxW="max-w-[640px]" footer={
        <div>
          <div className="mb-3 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
            <div><p className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-sage">Себестоимость блюда</p><p className="font-display text-[18px] leading-tight text-cream">{fmtMoney(total)}</p></div>
            <div><p className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-sage">Себест. порции</p><p className="font-display text-[15px] leading-tight text-mint">{fmtMoney(pp)}</p></div>
            <div><p className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-sage">Общий вес</p><p className="font-display text-[15px] leading-tight text-glacier">{fmtNum(recipeTotalWeight(draft, state.products))} г</p></div>
            <div className="text-right"><p className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-sage">Цена с чел-ка · {markupMode === "fixed" ? "фикс." : `+${fmtNum(markupValue)}%`}</p><p className="font-display text-[21px] leading-tight text-saffron">{fmtMoney(pricePer)}</p></div>
          </div>
          <div className="flex items-center gap-3">
            {editing && <DangerConfirm hint="удалить?" onConfirm={() => { deleteRecipe(editing.id); toast("Рецепт удалён", "del"); onClose(); }} />}
            {editing && <button onClick={() => { onPreviewTechCard(editing); }} aria-label="Печать тех.карты" className="tap grid h-9 w-9 shrink-0 place-items-center rounded-[11px] border border-line text-sage hover:border-mint/50 hover:text-mint" title="Печать тех.карты"><IcPrinter size={16} /></button>}
            <button onClick={onClose} className="tap shrink-0 rounded-[14px] border border-line px-5 py-3 font-display text-[13px] font-bold text-sage hover:text-cream">Отмена</button>
            <button onClick={save} disabled={!valid} className="tap grow rounded-[14px] bg-saffron py-3 font-display text-[13px] font-bold text-pine-950 disabled:opacity-35">Сохранить</button>
          </div>
        </div>
      }>
        <div className="space-y-5">
          <Field label="Название блюда"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Например, Судак, запечённый с овощами" className={inputCls} autoFocus={!editing} /></Field>
          <Field label="Категория" hint="влияет на группировку в документах"><select value={category} onChange={(e) => setCategory(e.target.value as Category)} className={selectCls}>{state.categories.map((c) => (<option key={c.id} value={c.name}>{c.name}</option>))}</select></Field>
          <Field label="Описание для клиентского меню"><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Пара фраз, которые увидит гость в печатном меню…" className={textareaCls} /></Field>
          <Field label="Способ подачи" hint={serving === "shared" ? "блюдо выносится целиком на стол" : "каждому гостю — отдельная порция"}>
            <div className="grid grid-cols-2 gap-2">
              {([{ v: "per-person", label: "Порционно", Icon: IcPlate }, { v: "shared", label: "Общим на стол", Icon: IcTable }] as const).map(({ v, label, Icon }) => { const active = serving === v; return (<button key={v} onClick={() => setServing(v)} className={`tap flex items-center justify-center gap-2 rounded-[12px] border py-2.5 text-[12.5px] font-semibold transition-colors ${active ? (v === "shared" ? "border-saffron/70 bg-saffron/12 text-saffron" : "border-mint/60 bg-mint/12 text-mint") : "border-line bg-pine-800 text-sage hover:text-cream"}`}><Icon size={15} />{label}</button>); })}
            </div>
          </Field>
          <Field label="Описание для тех. карты" hint="технологические нюансы для поваров"><textarea value={techNote} onChange={(e) => setTechNote(e.target.value)} rows={2} placeholder="Например: запекать при 180 °C 25 минут…" className={textareaCls} /></Field>
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
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="hideFromPriceList" checked={hideFromPriceList} onChange={(e) => setHideFromPriceList(e.target.checked)} className="h-4 w-4 rounded border-line bg-pine-800 accent-saffron" />
            <label htmlFor="hideFromPriceList" className="text-[12px] text-sage cursor-pointer">Не показывать в прайс-листе</label>
          </div>
          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-sage">Ингредиенты · {rows.length}</p>
            {rows.length === 0 && <p className="rounded-[12px] border border-dashed border-pine-500/70 px-4 py-4 text-center text-[12.5px] text-sage">Состав пуст</p>}
            <div className="space-y-2">
              {rows.map((r, i) => { const p = state.products.find((x) => x.id === r.productId); if (!p) return null; return (<div key={p.id} className="reveal rounded-[13px] border border-line bg-pine-700/70 p-3"><div className="flex items-center justify-between gap-2"><p className="min-w-0 truncate text-[13.5px] font-semibold text-cream">{p.name}</p><button onClick={() => removeRow(i)} className="tap grid h-6 w-6 shrink-0 place-items-center rounded-full text-sage hover:text-coral"><IcX size={13} /></button></div><div className="mt-2 flex flex-wrap items-center gap-2"><AmountEditor product={p} value={r.amount} onChange={(v) => updateAmount(i, v)} /><span className="ml-auto whitespace-nowrap font-display text-[13px] font-semibold text-saffron">{fmtMoney(ingredientCost({ productId: p.id, amount: r.amount }, state.products))}</span></div><p className="mt-1 text-[10.5px] text-sage">{fmtMoney(p.price)} / {p.unit}</p></div>); })}
            </div>
            {state.products.length === 0 ? (<p className="mt-3 rounded-[12px] border border-dashed border-coral/40 px-4 py-3 text-center text-[12.5px] text-coral">Сначала заведите продукты</p>) : (<button onClick={() => { setPickQ(""); setPickerOpen(true); }} className="tap mt-2.5 flex w-full items-center justify-center gap-2 rounded-[12px] border border-dashed border-pine-500 py-3 text-[13px] font-semibold text-sage hover:border-saffron/50 hover:text-cream"><IcPlus size={16} /> Добавить ингредиент</button>)}
          </div>
        </div>
      </Modal>
      <Modal open={pickerOpen} onClose={() => setPickerOpen(false)} title="Выбрать продукт" subtitle="Цены подтянутся из базы">
        <div className="relative"><IcSearch size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sage" /><input value={pickQ} onChange={(e) => setPickQ(e.target.value)} placeholder="Поиск по базе…" className={inputCls + " pl-10"} autoFocus /></div>
        <div className="mt-3 space-y-2 pb-2">
          {pickerList.map((p) => { const added = rows.some((r) => r.productId === p.id); return (<button key={p.id} disabled={added} onClick={() => addRow(p.id)} className={`tap flex w-full items-center gap-3 rounded-[12px] border px-3.5 py-2.5 text-left transition-colors ${added ? "border-mint/25 bg-mint/6 opacity-60" : "border-line bg-pine-800 hover:border-saffron/40"}`}><span className="min-w-0 grow"><span className="block truncate text-[13.5px] font-semibold text-cream">{p.name}</span><span className="text-[11px] text-sage">{fmtMoney(p.price)} / {p.unit} · {p.category}</span></span>{added ? (<span className="shrink-0 text-[11px] font-bold text-mint">добавлен</span>) : (<IcPlus size={16} className="shrink-0 text-saffron" />)}</button>); })}
          {pickerList.length === 0 && <p className="py-6 text-center text-[13px] text-sage">Ничего не нашлось</p>}
        </div>
      </Modal>
    </>
  );
}

function TechCardPreview({ recipe, onClose }: { recipe: Recipe; onClose: () => void }) {
  const { state } = useStore();
  const toast = useToast();
  const totalWeight = recipeTotalWeight(recipe, state.products);
  const exportToExcel = async () => {
    try {
      const XLSX = await import("xlsx");
      const worksheet = XLSX.utils.aoa_to_sheet([
        [`Технологическая карта: ${recipe.name}`],
        ["Категория", recipe.category],
        ["Выход порции", `${recipe.servingWeight} г`],
        ["Рассчитано на", `${recipe.portions} порций`],
        ["Способ подачи", SERVING_LABEL[recipe.serving]],
        ...(recipe.description ? [["Описание", recipe.description]] : []),
        ...(recipe.techNote ? [["Технология приготовления", recipe.techNote]] : []),
        [],
        ["Ингредиент", "На 1 порцию", "Всего"],
        ...recipe.ingredients.flatMap((row) => {
          const product = state.products.find((item) => item.id === row.productId);
          if (!product) return [];
          const perPortion = row.amount / recipe.portions;
          return [[
            product.name,
            isWeighed(product.unit) ? amountLabel(perPortion, product.unit) : `${fmtNum(perPortion)} ${product.unit}`,
            isWeighed(product.unit) ? amountLabel(row.amount, product.unit) : pieceAmountLabel(product, row.amount),
          ]];
        }),
        [],
        ["Общий вес", `${fmtNum(totalWeight)} г`],
      ]);
      worksheet["!cols"] = [{ wch: 36 }, { wch: 22 }, { wch: 22 }];
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Техкарта");
      XLSX.writeFile(workbook, `Техкарта - ${recipe.name.replace(/[\\/:*?"<>|]/g, "-")}.xlsx`);
    } catch (error) {
      console.error("Не удалось экспортировать технологическую карту в Excel.", error);
      toast("Не удалось сохранить файл Excel", "del");
    }
  };
  
  return (
    <div className="print-host print-tech-card-host fixed inset-0 z-[80] flex items-center justify-center bg-[#04100c]/97 backdrop-blur-md">
      <div className="print-tech-card-modal w-full max-w-[800px] max-h-[90vh] overflow-y-auto rounded-[16px] border border-line bg-pine-900 shadow-2xl">
        <div className="no-print sticky top-0 z-10 flex items-center justify-between border-b border-line bg-pine-900 px-6 py-4">
          <h2 className="font-display text-[18px] text-cream">Тех. карта: {recipe.name}</h2>
          <button onClick={onClose} className="tap grid h-9 w-9 place-items-center rounded-full border border-line text-sage hover:text-cream"><IcX size={16} /></button>
        </div>
        <div id="print-root" className="print-tech-card-content print-sheet p-6" style={{ background: "#fefdfb", color: "#2d2420" }}>
          <div className="mb-6 border-b-2 pb-4" style={{ borderColor: "#3d3530" }}>
            <h1 className="font-display text-[24px] leading-tight">{recipe.name}</h1>
            <p className="mt-2 text-[12px]" style={{ color: "#8a7f75" }}>
              Категория: {recipe.category} · Выход: {recipe.servingWeight} г · Рассчитано на {recipe.portions} чел.
            </p>
            <div className="mt-2">
              <ServingBadge serving={recipe.serving} />
            </div>
            {recipe.description && <p className="mt-2 text-[11px] italic" style={{ color: "#8a7f75" }}>{recipe.description}</p>}
          </div>
          
          {recipe.techNote && (
            <div className="mb-6">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: "#d4a017" }}>Технология приготовления</p>
              <p className="mt-2 text-[12px] leading-relaxed whitespace-pre-line">{recipe.techNote}</p>
            </div>
          )}
          
          <div className="mb-6">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: "#d4a017" }}>Ингредиенты</p>
            <table className="mt-2 w-full border-collapse text-[11px]">
              <thead>
                <tr className="text-left text-[9.5px] uppercase tracking-[0.1em]" style={{ color: "#8a7f75" }}>
                  <th className="border-b py-1.5 pr-2 font-semibold" style={{ borderColor: "#e0d5c8" }}>Продукт</th>
                  <th className="border-b py-1.5 pr-2 text-right font-semibold" style={{ borderColor: "#e0d5c8" }}>На 1 чел.</th>
                  <th className="border-b py-1.5 text-right font-semibold" style={{ borderColor: "#e0d5c8" }}>Всего</th>
                </tr>
              </thead>
              <tbody>
                {recipe.ingredients.map((row, idx) => {
                  const p = state.products.find((x) => x.id === row.productId);
                  if (!p) return null;
                  const perPerson = row.amount / recipe.portions;
                  return (
                    <tr key={row.productId} style={{ background: idx % 2 === 0 ? "#fefdfb" : "#faf6f0" }}>
                      <td className="border-b py-1.5 pr-2" style={{ borderColor: "#e0d5c8" }}>{p.name}</td>
                      <td className="border-b py-1.5 pr-2 text-right tabular-nums" style={{ borderColor: "#e0d5c8" }}>
                        {isWeighed(p.unit) ? amountLabel(perPerson, p.unit) : `${fmtNum(perPerson)} ${p.unit}`}
                      </td>
                      <td className="border-b py-1.5 text-right font-semibold tabular-nums" style={{ borderColor: "#e0d5c8" }}>
                        {isWeighed(p.unit) ? amountLabel(row.amount, p.unit) : pieceAmountLabel(p, row.amount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          <div className="border-t-2 pt-4" style={{ borderColor: "#3d3530" }}>
            <p className="text-[10px] uppercase tracking-[0.14em]" style={{ color: "#8a7f75" }}>Общий вес</p>
            <p className="mt-1 font-display text-[18px]">{fmtNum(totalWeight)} г</p>
          </div>
        </div>
        <div className="no-print sticky bottom-0 flex flex-wrap gap-2 border-t border-line bg-pine-900 px-6 py-4">
          <button onClick={() => void exportToExcel()} className="tap flex items-center gap-2 rounded-[11px] border border-line px-4 py-2 font-display text-[12px] font-bold text-sage hover:text-mint">
            <IcDownload size={15} /> Сохранить в Excel
          </button>
          <button onClick={() => window.print()} className="tap flex items-center gap-2 rounded-[11px] bg-saffron px-4 py-2 font-display text-[12px] font-bold text-pine-950 hover:brightness-110">
            <IcPrinter size={15} /> Сохранить в PDF
          </button>
        </div>
      </div>
    </div>
  );
}
