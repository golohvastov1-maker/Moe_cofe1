import { useEffect, useMemo, useRef, useState } from "react";
import type { CategoryInfo, Product, ProductCategory, Unit } from "../types";
import { PRODUCT_CATEGORIES, UNITS, amountUnitLabel, productCatColor } from "../types";
import { useStore } from "../store";
import { downloadText, fmtDateShort, fmtMoney, fmtNum, parseNum, parsePriceFile, productsToCsv, round2, todayISO, uid } from "../utils";
import { DangerConfirm, EmptyState, Field, Modal, Segmented, inputCls, selectCls, useToast } from "./UI";
import { IcBasket, IcBriefcase, IcClock, IcDoc, IcDownload, IcPlus, IcSearch, IcUpload } from "./Icons";

// ===== PRODUCTS SCREEN =====
export function ProductsScreen() {
  const { state, saveProduct, deleteProduct, importProducts, usageInRecipes } = useStore();
  const toast = useToast();
  const [q, setQ] = useState("");
  const [catFilter, setCatFilter] = useState<ProductCategory | "все">("все");
  const [unitFilter, setUnitFilter] = useState<Unit | "все">("все");
  const [sortMode, setSortMode] = useState<"abc" | "cat">("abc");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const sorted = useMemo(() => [...state.products].sort((a, b) => a.name.localeCompare(b.name, "ru")), [state.products]);
  const filtered = sorted.filter((p) => {
    const okQ = !q || p.name.toLowerCase().includes(q.trim().toLowerCase());
    const okU = unitFilter === "все" || p.unit === unitFilter;
    const okC = catFilter === "все" || p.category === catFilter;
    return okQ && okU && okC;
  });
  const catCounts = useMemo(() => {
    const m = new Map<ProductCategory, number>();
    for (const p of sorted) m.set(p.category, (m.get(p.category) ?? 0) + 1);
    return m;
  }, [sorted]);
  const handleFile = async (file: File) => {
    setImporting(true);
    try {
      const rows = await parsePriceFile(file);
      if (rows.length === 0) toast("В файле не нашлось строк с ценами", "del");
      else { const res = importProducts(rows); toast(`Импорт: ${res.added} новых, ${res.updated} обновлено`); }
    } catch { toast("Не удалось прочитать файл", "del"); }
    finally { setImporting(false); if (fileRef.current) fileRef.current.value = ""; }
  };
  const hasFilters = q !== "" || catFilter !== "все" || unitFilter !== "все";
  return (
    <section className="px-5 pb-8 pt-6 md:px-8">
      <header className="reveal flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-[26px] leading-none text-cream">Продукты</h1>
          <p className="mt-2 text-[13px] text-sage">{state.products.length} позиций по {catCounts.size} {catCounts.size === 1 ? "категории" : "категориям"} · история цен ведётся автоматически</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); }} />
          <button onClick={() => fileRef.current?.click()} disabled={importing} className="tap flex items-center gap-2 rounded-[12px] border border-line bg-pine-800/80 px-2.5 py-2.5 text-[12px] font-semibold text-sage hover:border-mint/50 hover:text-mint disabled:opacity-50 sm:px-3.5"><IcUpload size={15} /> <span className="hidden md:inline">{importing ? "Читаем…" : "Импорт CSV/XLSX"}</span></button>
          <button onClick={() => { downloadText("price-list.csv", productsToCsv(sorted)); toast("Прайс-лист выгружен"); }} className="tap flex items-center gap-2 rounded-[12px] border border-line bg-pine-800/80 px-2.5 py-2.5 text-[12px] font-semibold text-sage hover:border-mint/50 hover:text-mint sm:px-3.5"><IcDownload size={15} /> <span className="hidden md:inline">Экспорт</span></button>
          <button onClick={() => { downloadText("price-template.csv", "Название;Ед.;Цена;Категория\nКартофель;кг;45;Овощи\nЯйца;шт;14;Молочное"); }} className="tap flex items-center gap-2 rounded-[12px] border border-line bg-pine-800/80 px-2.5 py-2.5 text-[12px] font-semibold text-sage hover:text-cream sm:px-3.5"><IcDoc size={15} /> <span className="hidden md:inline">Шаблон</span></button>
          <button onClick={() => { setEditing(null); setSheetOpen(true); }} className="tap flex items-center gap-2 rounded-[12px] bg-gradient-to-br from-saffron to-amber-500 px-4 py-2.5 font-display text-[12px] font-bold text-pine-950 shadow-lg shadow-saffron/20 hover:scale-105"><IcPlus size={16} /> Продукт</button>
        </div>
      </header>
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[190px] grow sm:max-w-[280px]">
          <IcSearch size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sage" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск по продуктам…" className={inputCls + " pl-10"} />
        </div>
        <Segmented options={[{ value: "abc" as const, label: "По алфавиту" }, { value: "cat" as const, label: "По категориям" }]} value={sortMode} onChange={setSortMode} />
        <select value={catFilter} onChange={(e) => setCatFilter(e.target.value as ProductCategory | "все")} className={inputCls + " w-[190px] py-2.5 text-[12.5px]"}><option value="все">Все категории</option>{PRODUCT_CATEGORIES.map((c) => (<option key={c} value={c}>{c} · {catCounts.get(c) ?? 0}</option>))}</select>
        <div className="flex flex-wrap gap-1.5">{(["все", ...UNITS] as const).map((u) => (<button key={u} onClick={() => setUnitFilter(u)} className={`tap rounded-full border px-3 py-1.5 text-[11.5px] font-semibold transition-colors ${unitFilter === u ? "border-saffron/60 bg-saffron/15 text-saffron" : "border-line bg-pine-800 text-sage hover:text-cream"}`}>{u}</button>))}</div>
        {hasFilters && <button onClick={() => { setQ(""); setCatFilter("все"); setUnitFilter("все"); }} className="tap rounded-full border border-line px-3 py-1.5 text-[11.5px] font-semibold text-sage hover:text-coral">Сбросить</button>}
      </div>
      {state.products.length === 0 ? (
        <EmptyState icon={<IcBasket size={24} />} title="База продуктов пуста" text="Заведите продукты вручную или импортируйте прайс из CSV/XLSX." action={<button onClick={() => { setEditing(null); setSheetOpen(true); }} className="tap rounded-full bg-saffron px-5 py-2.5 font-display text-[12px] font-bold text-pine-950">Добавить продукт</button>} />
      ) : filtered.length === 0 ? (
        <p className="reveal mt-10 text-center text-[13px] text-sage">По запросу ничего не нашлось</p>
      ) : sortMode === "cat" ? (
        <div className="mt-5 space-y-6">
          {PRODUCT_CATEGORIES.map((c) => {
            const items = filtered.filter((p) => p.category === c);
            if (items.length === 0) return null;
            const color = productCatColor(c);
            return (
              <div key={c} className="reveal">
                <div className="mb-2.5 flex items-center gap-2.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: color }} />
                  <h2 className="font-display text-[14px] font-bold" style={{ color }}>{c}</h2>
                  <span className="text-[11px] font-semibold text-sage">{items.length} поз.</span>
                  <span className="h-px grow bg-line" />
                </div>
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {items.map((p) => (
                    <div key={p.id} role="button" tabIndex={0} onClick={() => { setEditing(p); setSheetOpen(true); }} className="reveal group flex cursor-pointer items-center gap-2.5 rounded-[13px] border border-line bg-pine-800 px-3.5 py-2.5 hover:border-pine-400">
                      <div className="min-w-0 grow">
                        <p className="truncate text-[13px] font-semibold text-cream">{p.name}</p>
                        <p className="mt-0.5 text-[10.5px] text-sage">{p.unit}{p.netWeight ? ` · нетто ${fmtNum(p.netWeight)} г` : ""} · {fmtDateShort(p.updatedAt)}</p>
                      </div>
                      <p className="whitespace-nowrap font-display text-[13.5px] font-bold text-saffron">{fmtMoney(p.price)}</p>
                      <div className="shrink-0 opacity-40 group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
                        <DangerConfirm onConfirm={() => { deleteProduct(p.id); toast("Продукт удалён", "del"); }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {filtered.map((p) => (
            <div key={p.id} role="button" tabIndex={0} onClick={() => { setEditing(p); setSheetOpen(true); }} className="reveal rounded-[14px] border border-line bg-pine-800 p-3.5 hover:bg-pine-700/70">
              <div className="flex items-center gap-2">
                <p className="min-w-0 grow truncate text-[13.5px] font-semibold text-cream">{p.name}</p>
                <div onClick={(e) => e.stopPropagation()}><DangerConfirm onConfirm={() => { deleteProduct(p.id); toast("Продукт удалён", "del"); }} /></div>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-pine-850 px-2 py-0.5 text-[10.5px] font-semibold" style={{ color: productCatColor(p.category) }}>
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: productCatColor(p.category) }} />{p.category}
                </span>
                <span className="text-[10.5px] text-sage">{amountUnitLabel(p.unit)} / {p.unit}{p.netWeight ? ` · нетто ${fmtNum(p.netWeight)} г` : ""} · {fmtDateShort(p.updatedAt)}</span>
              </div>
              <div className="mt-2.5 flex items-center justify-between border-t border-line pt-2.5">
                <span className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-sage">за 1 {p.unit}</span>
                <span className="font-display text-[15px] font-bold text-saffron">{fmtMoney(p.price)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
      <ProductSheet open={sheetOpen} onClose={() => setSheetOpen(false)} editing={editing} onSave={saveProduct} />
    </section>
  );
}

function ProductSheet({ open, onClose, editing, onSave }: { open: boolean; onClose: () => void; editing: Product | null; onSave: (p: Product) => void }) {
  const { state, deleteProduct, usageInRecipes } = useStore();
  const toast = useToast();
  const [name, setName] = useState("");
  const [unit, setUnit] = useState<Unit>("кг");
  const [category, setCategory] = useState<ProductCategory>("Прочие");
  const [price, setPrice] = useState("");
  const [netWeight, setNetWeight] = useState("");
  const piece = unit === "шт" || unit === "упак" || unit === "пучок";
  useEffect(() => {
    if (open) {
      setName(editing?.name ?? ""); setUnit(editing?.unit ?? "кг");
      setCategory(editing?.category ?? "Прочие");
      setPrice(editing ? String(editing.price).replace(".", ",") : "");
      setNetWeight(editing?.netWeight ? String(editing.netWeight) : "");
    }
  }, [open, editing]);
  const priceN = parseNum(price);
  const netN = parseNum(netWeight);
  const valid = name.trim().length > 0 && priceN > 0;
  const used = editing ? usageInRecipes(editing.id) : 0;
  const history = editing ? state.priceLog.filter((l) => l.productId === editing.id).slice(0, 5) : [];
  const save = () => {
    if (!valid) return;
    onSave({ id: editing?.id ?? uid(), name: name.trim(), unit, category, price: round2(priceN), netWeight: piece && netN > 0 ? round2(netN) : null, updatedAt: editing?.updatedAt ?? todayISO() });
    toast(editing ? "Продукт обновлён" : "Продукт добавлен");
    onClose();
  };
  return (
    <Modal open={open} onClose={onClose} title={editing ? "Продукт" : "Новый продукт"} subtitle={editing ? (used > 0 ? `Используется в рецептах: ${used}.` : "Ещё не используется в рецептах") : "Название, категория, единица измерения и цена"} footer={
      <div className="flex items-center gap-3">
        {editing && <DangerConfirm hint="удалить?" onConfirm={() => { deleteProduct(editing.id); toast("Продукт удалён", "del"); onClose(); }} />}
        <button onClick={onClose} className="tap shrink-0 rounded-[14px] border border-line px-5 py-3 font-display text-[13px] font-bold text-sage hover:text-cream">Отмена</button>
        <button onClick={save} disabled={!valid} className="tap grow rounded-[14px] bg-saffron py-3 font-display text-[13px] font-bold text-pine-950 disabled:opacity-35">Сохранить</button>
      </div>
    }>
      <div className="space-y-5 pt-1">
        <Field label="Название"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Например, Куриное филе" className={inputCls} autoFocus={!editing} /></Field>
        <Field label="Категория"><div className="flex flex-wrap gap-1.5">{PRODUCT_CATEGORIES.map((c) => (<button key={c} onClick={() => setCategory(c)} className={`tap rounded-full border px-3 py-1.5 text-[11.5px] font-semibold transition-colors ${category === c ? "" : "border-line bg-pine-700 text-sage hover:text-cream"}`} style={category === c ? { borderColor: productCatColor(c), background: `${productCatColor(c)}1f`, color: productCatColor(c) } : undefined}>{c}</button>))}</div></Field>
        <Field label="Единица измерения" hint={`цена за 1 ${unit}`}><div className="grid grid-cols-3 gap-2">{UNITS.map((u) => (<button key={u} onClick={() => setUnit(u)} className={`tap rounded-[11px] border py-2 text-[13px] font-semibold transition-colors ${u === unit ? "border-saffron bg-saffron text-pine-950" : "border-line bg-pine-700 text-sage hover:text-cream"}`}>{u}</button>))}</div></Field>
        {piece && (<Field label="Масса нетто, г" hint="вес одной штуки/упаковки"><div className="relative"><input value={netWeight} onChange={(e) => setNetWeight(e.target.value)} placeholder="Например, 400" inputMode="numeric" className={inputCls + " pr-10 font-display font-semibold"} /><span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[12px] font-bold text-sage">г</span></div>{netN > 0 && (<span className="mt-1.5 block text-[11.5px] text-mint">1 {unit} = {netN >= 1000 ? `${fmtNum(netN / 1000)} кг` : `${netN} г`}</span>)}</Field>)}
        <Field label="Цена"><div className="relative"><input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0" inputMode="decimal" className={inputCls + " pr-10 font-display font-semibold"} /><span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 font-display text-[13px] font-bold text-saffron">₽</span></div>{priceN > 0 && (<span className="mt-1.5 block text-[11.5px] text-mint">{fmtMoney(priceN)} за 1 {unit}</span>)}</Field>
        {history.length > 0 && (<div><p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-sage"><IcClock size={13} /> История цены</p><div className="space-y-1.5">{history.map((h) => { const up = h.oldPrice !== null && h.newPrice > h.oldPrice; const down = h.oldPrice !== null && h.newPrice < h.oldPrice; return (<div key={h.id} className="flex items-center justify-between rounded-[10px] border border-line bg-pine-700/60 px-3 py-2 text-[12.5px]"><span className="text-sage">{fmtDateShort(h.date)}</span><span className={up ? "font-semibold text-coral" : down ? "font-semibold text-mint" : "text-sage"}>{h.oldPrice === null ? "создание" : `${fmtMoney(h.oldPrice)} →`} <span className="font-display font-bold text-cream">{fmtMoney(h.newPrice)}</span></span></div>); })}</div></div>)}
      </div>
    </Modal>
  );
}

// ===== SERVICES SCREEN =====
export function ServicesScreen() {
  const { state, deleteService } = useStore();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<{ id: string; name: string; unit: string; price: number } | null>(null);
  const usageCount = (id: string) => state.events.filter((e) => e.services.some((s) => s.serviceId === id)).length;
  return (
    <section className="px-5 pb-8 pt-6 md:px-8">
      <header className="reveal flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="font-display text-[26px] leading-none text-cream">Услуги</h1><p className="mt-2 text-[13px] text-sage">Аренда, повара, оформление — всё, что попадает в счёт помимо блюд</p></div>
        <button onClick={() => { setEditing(null); setOpen(true); }} className="tap flex items-center gap-2 rounded-[12px] bg-gradient-to-br from-saffron to-amber-500 px-4 py-2.5 font-display text-[12px] font-bold text-pine-950 shadow-lg shadow-saffron/20 hover:scale-105"><IcPlus size={16} /> Услуга</button>
      </header>
      {state.services.length === 0 ? (<EmptyState icon={<IcBriefcase size={24} />} title="Справочник услуг пуст" text="Заведите типовые услуги, чтобы в один клик добавлять их в сметы мероприятий." action={<button onClick={() => { setEditing(null); setOpen(true); }} className="tap rounded-full bg-saffron px-5 py-2.5 font-display text-[12px] font-bold text-pine-950">Добавить услугу</button>} />) : (
        <div className="mt-5 grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
          {state.services.map((s) => (
            <div key={s.id} role="button" tabIndex={0} onClick={() => { setEditing(s); setOpen(true); }} className="reveal card-hover cursor-pointer rounded-[16px] border border-line bg-pine-800 p-4">
              <div className="flex items-start justify-between gap-2"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-pine-700 text-mist"><IcBriefcase size={19} /></div><DangerConfirm onConfirm={() => { deleteService(s.id); toast("Услуга удалена", "del"); }} /></div>
              <p className="mt-3 text-[14px] font-semibold leading-snug text-cream">{s.name}</p>
              <p className="mt-1 text-[11.5px] text-sage">за 1 «{s.unit}»{usageCount(s.id) > 0 && ` · в ${usageCount(s.id)} событ.`}</p>
              <p className="mt-2.5 border-t border-line pt-2.5 font-display text-[16px] text-saffron">{fmtMoney(s.price)}</p>
            </div>
          ))}
        </div>
      )}
      <ServiceSheet open={open} onClose={() => setOpen(false)} editing={editing} />
    </section>
  );
}

function ServiceSheet({ open, onClose, editing }: { open: boolean; onClose: () => void; editing: { id: string; name: string; unit: string; price: number } | null }) {
  const { saveService, deleteService } = useStore();
  const toast = useToast();
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("услуга");
  const [price, setPrice] = useState("");
  useEffect(() => { if (open) { setName(editing?.name ?? ""); setUnit(editing?.unit ?? "услуга"); setPrice(editing ? String(editing.price).replace(".", ",") : ""); } }, [open, editing]);
  const priceN = parseNum(price);
  const valid = name.trim().length > 0 && unit.trim().length > 0 && priceN > 0;
  const save = () => { if (!valid) return; saveService({ id: editing?.id ?? uid(), name: name.trim(), unit: unit.trim(), price: round2(priceN) }); toast(editing ? "Услуга обновлена" : "Услуга добавлена"); onClose(); };
  return (
    <Modal open={open} onClose={onClose} title={editing ? "Услуга" : "Новая услуга"} subtitle="Например: «Работа поваров», единица — «день»" footer={
      <div className="flex items-center gap-3">
        {editing && <DangerConfirm hint="удалить?" onConfirm={() => { deleteService(editing.id); toast("Услуга удалена", "del"); onClose(); }} />}
        <button onClick={onClose} className="tap shrink-0 rounded-[14px] border border-line px-5 py-3 font-display text-[13px] font-bold text-sage hover:text-cream">Отмена</button>
        <button onClick={save} disabled={!valid} className="tap grow rounded-[14px] bg-saffron py-3 font-display text-[13px] font-bold text-pine-950 disabled:opacity-35">Сохранить</button>
      </div>
    }>
      <div className="space-y-5">
        <Field label="Название"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Например, Аренда зала" className={inputCls} autoFocus={!editing} /></Field>
        <Field label="Единица измерения"><input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="услуга / день / гость / рейс" className={inputCls} /></Field>
        <Field label="Базовая цена"><div className="relative"><input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0" inputMode="decimal" className={inputCls + " pr-10 font-display font-semibold"} /><span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 font-display text-[13px] font-bold text-saffron">₽</span></div></Field>
      </div>
    </Modal>
  );
}

// ===== REQUISITES SCREEN =====
export function RequisitesScreen() {
  const { state, saveRequisites } = useStore();
  const toast = useToast();
  const [form, setForm] = useState({ ...state.requisites });
  const [saved, setSaved] = useState(false);
  const handleSave = () => { saveRequisites(form); setSaved(true); toast("Реквизиты сохранены"); setTimeout(() => setSaved(false), 2000); };
  const hasChanges = form.org !== state.requisites.org || form.inn !== state.requisites.inn || form.address !== state.requisites.address || form.phone !== state.requisites.phone || form.account !== state.requisites.account;
  return (
    <section className="px-5 pb-8 pt-6 md:px-8">
      <header className="reveal flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="font-display text-[26px] leading-none text-cream">Реквизиты</h1><p className="mt-2 text-[13px] text-sage">Данные вашей организации для печати в документах</p></div>
      </header>
      <div className="mt-6 max-w-[700px] space-y-5">
        <div className="reveal rounded-[16px] border border-line bg-pine-800 p-5"><Field label="Название организации"><input value={form.org} onChange={(e) => setForm({ ...form, org: e.target.value })} placeholder="ООО «Ромашка» или ИП Иванов И.И." className={inputCls} /></Field></div>
        <div className="reveal grid gap-5 min-[500px]:grid-cols-2">
          <div className="rounded-[16px] border border-line bg-pine-800 p-5"><Field label="ИНН"><input value={form.inn} onChange={(e) => setForm({ ...form, inn: e.target.value })} placeholder="1234567890" className={inputCls} /></Field></div>
          <div className="rounded-[16px] border border-line bg-pine-800 p-5"><Field label="Телефон"><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+7 (999) 123-45-67" className={inputCls} /></Field></div>
        </div>
        <div className="reveal rounded-[16px] border border-line bg-pine-800 p-5"><Field label="Адрес"><input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="г. Москва, ул. Примерная, д. 1" className={inputCls} /></Field></div>
        <div className="reveal rounded-[16px] border border-line bg-pine-800 p-5"><Field label="Банковские реквизиты" hint="Расчётный счёт, банк, БИК"><textarea value={form.account} onChange={(e) => setForm({ ...form, account: e.target.value })} placeholder={"р/с 40702810000000012345\nПАО Сбербанк, г. Москва\nБИК 044525225"} rows={4} className={inputCls + " resize-none leading-relaxed"} /></Field></div>
        <div className="reveal flex items-center gap-3">
          <button onClick={handleSave} disabled={!hasChanges} className="tap flex items-center gap-2 rounded-[12px] bg-gradient-to-br from-saffron to-amber-500 px-6 py-3 font-display text-[13px] font-bold text-pine-950 shadow-lg shadow-saffron/20 hover:scale-105 disabled:opacity-40 disabled:hover:scale-100">{saved ? "✓ Сохранено" : "Сохранить реквизиты"}</button>
          {hasChanges && <span className="text-[12px] text-sage">Есть несохранённые изменения</span>}
        </div>
        <div className="reveal mt-6 rounded-[14px] border border-line bg-pine-800/50 p-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-sage">Предпросмотр</p>
          <div className="mt-3 space-y-1 text-[12px] text-cream">
            <p className="font-semibold">{form.org || "Название организации"}</p>
            {form.inn && <p className="text-sage">ИНН: {form.inn}</p>}
            <p className="text-sage">{form.address}</p>
            <p className="text-sage">{form.phone}</p>
            <p className="mt-2 whitespace-pre-line text-sage">{form.account}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ===== CATEGORIES MANAGER =====
export function CategoriesManager({ open, onClose }: { open: boolean; onClose: () => void }) {
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
    setEditing(null); setName("");
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
            <button onClick={() => setEditing(null)} className="tap shrink-0 rounded-[14px] border border-line px-5 py-3 font-display text-[13px] font-bold text-sage hover:text-cream">Отмена</button>
            <button onClick={save} disabled={!name.trim()} className="tap grow rounded-[14px] bg-saffron py-3 font-display text-[13px] font-bold text-pine-950 disabled:opacity-35">Сохранить</button>
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
