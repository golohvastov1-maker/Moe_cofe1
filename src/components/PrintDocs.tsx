import { useState, useEffect } from "react";
import type { ReactNode } from "react";
import type { DocKind, EventPlan } from "../types";
import { CHEF_ORDER, EVENT_TYPE_STYLE, MENU_ORDER, PRODUCT_CATEGORIES, SERVING_LABEL, amountUnitLabel, catStyle, isPieceUnit, isWeighed } from "../types";
import { useStore } from "../store";
import { amountLabel, buildMultiShopping, buildShopping, eventSummary, fmtDateLong, fmtMoney, fmtNum, pieceAmountLabel, plural, recipeFinalPerPortion, recipeTotalWeight, todayISO } from "../utils";
import { IcPrinter, IcX } from "./Icons";
import { ServingBadge } from "./UI";
import * as XLSX from "xlsx";

const INK = "#3d3530";
const SOFT = "#8a7f75";
const RULE = "#e0d5c8";
const GOLD = "#d4a017";

function DocHeader({ note }: { note: string }) {
  const { state } = useStore();
  const r = state.requisites;
  return (
    <div className="mb-6 flex items-start justify-between gap-6">
      <div>
        <p className="font-display text-[15px] tracking-[0.02em] text-[#1a1512]">Мое кафе</p>
        <p className="mt-1 max-w-[300px] text-[10px] leading-relaxed" style={{ color: SOFT }}>{r.org} · {r.inn}<br />{r.address} · {r.phone}</p>
      </div>
      <div className="text-right">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: GOLD }}>{note}</p>
        <p className="mt-1 text-[10px]" style={{ color: SOFT }}>от {fmtDateLong(todayISO())}</p>
      </div>
    </div>
  );
}

function ChefDoc({ ev }: { ev: EventPlan }) {
  const { state } = useStore();
  const sum = eventSummary(ev, state.recipes, state.products);
  const totalRows = sum.dishes.reduce((s, d) => s + d.rows.length, 0);
  return (
    <div className="px-10 py-12" style={{ background: "#fefdfb" }}>
      <DocHeader note="технологическая карта" />
      <div className="flex items-end justify-between gap-4 border-b-2 pb-4" style={{ borderColor: INK }}>
        <div>
          <h1 className="font-display text-[24px] leading-tight">Задание для поваров</h1>
          <p className="mt-1 text-[12.5px]" style={{ color: SOFT }}>{ev.name} · {fmtDateLong(ev.date)} · {ev.guests} {plural(ev.guests, ["гость", "гостя", "гостей"])}</p>
        </div>
        <p className="shrink-0 text-right text-[11.5px]" style={{ color: SOFT }}>{sum.dishes.length} {plural(sum.dishes.length, ["блюдо", "блюда", "блюд"])} · {sum.portions} порций</p>
      </div>
      {CHEF_ORDER.map((cat) => {
        const group = sum.dishes.filter((d) => d.recipe.category === cat);
        if (group.length === 0) return null;
        return (
          <div key={cat} className="mt-7">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: GOLD }}>{cat}</p>
            {group.map((d) => (
              <div key={d.recipe.id} className="mt-3">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="flex flex-wrap items-center gap-2 font-display text-[14px]">
                    {d.recipe.name}
                    <ServingBadge serving={d.recipe.serving} light />
                    {d.overridden && <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "#b3541e" }}>состав изменён</span>}
                  </p>
                  <p className="shrink-0 text-[11.5px]" style={{ color: SOFT }}>
                    {d.recipe.serving === "shared" 
                      ? `${Math.ceil(ev.guests / d.recipe.portions)} подач × ${d.recipe.servingWeight * d.recipe.portions} г`
                      : `${ev.guests} гостей × ${d.recipe.servingWeight} г`}
                  </p>
                </div>
                {d.recipe.techNote && <p className="mt-1 border-l-2 py-0.5 pl-2.5 text-[10.5px] italic leading-relaxed" style={{ borderColor: GOLD, color: SOFT }}>{d.recipe.techNote}</p>}
                <table className="mt-2 w-full border-collapse text-[11.5px]">
                  <thead>
                    <tr className="text-left text-[9.5px] uppercase tracking-[0.1em]" style={{ color: SOFT, background: "#f5f0e8" }}>
                      <th className="border-b py-1 pr-2 font-semibold" style={{ borderColor: RULE }}>Ингредиент</th>
                      {d.recipe.serving === "shared" && <th className="border-b py-1 pr-2 text-right font-semibold" style={{ borderColor: RULE }}>на 1 чел.</th>}
                      <th className="border-b py-1 pr-2 text-right font-semibold" style={{ borderColor: RULE }}>
                        {d.recipe.serving === "shared" ? `на ${d.recipe.portions} чел.` : "на 1 чел."}
                      </th>
                      <th className="border-b py-1 text-right font-semibold" style={{ borderColor: RULE }}>всего</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.rows.map((row, idx) => {
                      const p = state.products.find((x) => x.id === row.productId);
                      if (!p) return null;
                      const perPerson = row.amount / d.recipe.portions;
                      const total = perPerson * ev.guests;
                      const displayAmount = d.recipe.serving === "shared" ? row.amount : perPerson;
                      return (
                        <tr key={p.id} style={{ background: idx % 2 === 0 ? "#fefdfb" : "#faf6f0" }}>
                          <td className="border-b py-1.5 pr-2" style={{ borderColor: RULE }}>{p.name}</td>
                          {d.recipe.serving === "shared" && (
                            <td className="border-b py-1.5 pr-2 text-right tabular-nums" style={{ borderColor: RULE }}>
                              {isWeighed(p.unit) ? amountLabel(perPerson, p.unit) : `${fmtNum(perPerson)} ${p.unit}`}
                            </td>
                          )}
                          <td className="border-b py-1.5 pr-2 text-right tabular-nums" style={{ borderColor: RULE }}>
                            {isWeighed(p.unit) ? amountLabel(displayAmount, p.unit) : `${fmtNum(displayAmount)} ${p.unit}`}
                          </td>
                          <td className="border-b py-1.5 text-right font-semibold tabular-nums" style={{ borderColor: RULE }}>
                            {isWeighed(p.unit) ? amountLabel(total, p.unit) : pieceAmountLabel(p, total)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {d.dish.comment && (
                  <p className="mt-2 border-l-2 py-0.5 pl-2.5 text-[10.5px] italic leading-relaxed" style={{ borderColor: "#b3541e", color: SOFT }}>
                    * {d.dish.comment}
                  </p>
                )}
              </div>
            ))}
          </div>
        );
      })}
      <p className="mt-8 text-[10.5px]" style={{ color: SOFT }}>Позиций в работе: {totalRows} · гостей: {ev.guests}</p>
    </div>
  );
}

function ShoppingDoc({ ev }: { ev: EventPlan }) {
  const { state, saveEvent } = useStore();
  const rows = buildShopping(ev, state.recipes, state.products);
  const bought = ev.bought ?? [];
  const inStock = ev.inStock ?? [];
  const toggle = (pid: string, kind: "bought" | "stock") => {
    const arr = kind === "bought" ? bought : inStock;
    const other = kind === "bought" ? inStock : bought;
    const next = arr.includes(pid) ? arr.filter((x) => x !== pid) : [...arr, pid];
    saveEvent({ ...ev, bought: kind === "bought" ? next : other.filter((x) => x !== pid), inStock: kind === "stock" ? next : other.filter((x) => x !== pid) });
  };
  const total = rows.reduce((s, r) => s + r.cost, 0);
  return (
    <div className="px-10 py-12" style={{ background: "#fefdfb" }}>
      <DocHeader note="складская ведомость" />
      <div className="flex items-end justify-between gap-4 border-b-2 pb-4" style={{ borderColor: INK }}>
        <div>
          <h1 className="font-display text-[24px] leading-tight">Сводный список закупок</h1>
          <p className="mt-1 text-[12.5px]" style={{ color: SOFT }}>{ev.name} · {fmtDateLong(ev.date)} · {ev.guests} {plural(ev.guests, ["гость", "гостя", "гостей"])} · {ev.tablesCount} {plural(ev.tablesCount, ["стол", "стола", "столов"])}</p>
        </div>
        <p className="shrink-0 text-right text-[11.5px]" style={{ color: SOFT }}>куплено {bought.length} · на складе {inStock.length} · всего {rows.length}</p>
      </div>
      {(() => {
        const byCategory = new Map<string, typeof rows>();
        for (const r of rows) {
          const cat = r.product.category;
          const arr = byCategory.get(cat);
          if (arr) arr.push(r);
          else byCategory.set(cat, [r]);
        }
        const sortedCategories = Array.from(byCategory.keys()).sort((a, b) => {
          const orderA = PRODUCT_CATEGORIES.indexOf(a as any);
          const orderB = PRODUCT_CATEGORIES.indexOf(b as any);
          return orderA - orderB;
        });
        return sortedCategories.map((category) => {
          const items = byCategory.get(category)!;
          const categoryTotal = items.reduce((s, r) => s + r.cost, 0);
          const categoryToBuy = items.filter((r) => !bought.includes(r.product.id) && !inStock.includes(r.product.id));
          return (
            <div key={category} className="mt-5">
              <div className="mb-2 flex items-center gap-2 border-b-2 pb-1" style={{ borderColor: GOLD }}>
                <span className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: GOLD }}>{category}</span>
                <span className="text-[10px]" style={{ color: SOFT }}>· {items.length} {items.length === 1 ? "позиция" : items.length < 5 ? "позиции" : "позиций"}</span>
                <span className="h-px grow" style={{ background: RULE }} />
                <span className="text-[10px]" style={{ color: SOFT }}>к закупке {categoryToBuy.length} · {fmtMoney(categoryTotal)}</span>
              </div>
              <table className="w-full border-collapse text-[11.5px]">
                <thead>
                  <tr className="text-left text-[9.5px] uppercase tracking-[0.1em]" style={{ color: SOFT, background: "#f5f0e8" }}>
                    <th className="border-b py-1.5 pr-2 font-semibold" style={{ borderColor: RULE }}>Продукт</th>
                    <th className="border-b py-1.5 pr-2 text-right font-semibold" style={{ borderColor: RULE }}>Нужно</th>
                    <th className="border-b py-1.5 pr-2 text-right font-semibold" style={{ borderColor: RULE }}>Цена/ед.</th>
                    <th className="border-b py-1.5 pr-3 text-right font-semibold" style={{ borderColor: RULE }}>Сумма</th>
                    <th className="no-print border-b py-1.5 text-right font-semibold" style={{ borderColor: RULE }}>Отметка</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((r, idx) => {
                    const isBought = bought.includes(r.product.id);
                    const isStock = inStock.includes(r.product.id);
                    const done = isBought || isStock;
                    return (
                      <tr key={r.product.id} style={{ opacity: done ? 0.55 : 1, background: idx % 2 === 0 ? "#fefdfb" : "#faf6f0" }}>
                        <td className="border-b py-1.5 pr-2" style={{ borderColor: RULE }}>
                          <span style={{ textDecoration: done ? "line-through" : "none" }}>{r.product.name}</span>
                          {isStock && <span className="ml-2 text-[9px] font-bold uppercase" style={{ color: "#3b82f6" }}>есть на складе</span>}
                          {isBought && <span className="ml-2 text-[9px] font-bold uppercase" style={{ color: "#22c55e" }}>куплено</span>}
                          {(r.clientAmount ?? 0) > 0 && (
                            <div className="mt-1 text-[9px]" style={{ color: "#0891b2" }}>
                              <span className="font-bold">Клиент: </span>
                              {isWeighed(r.product.unit) ? amountLabel(r.clientAmount!, r.product.unit) : pieceAmountLabel(r.product, r.clientAmount!)}
                              {r.clientNotes && <span className="ml-1 italic">({r.clientNotes})</span>}
                            </div>
                          )}
                          {r.usedInDishes && r.usedInDishes.length > 0 && (
                            <div className="mt-1 text-[9px]" style={{ color: SOFT }}>
                              <span className="font-bold">В блюдах: </span>
                              {r.usedInDishes.map((d) => `${d.name} — ${d.amount}`).join(", ")}
                            </div>
                          )}
                        </td>
                        <td className="border-b py-1.5 pr-2 text-right font-semibold tabular-nums" style={{ borderColor: RULE }}>
                          {isWeighed(r.product.unit) ? amountLabel(r.amount, r.product.unit) : pieceAmountLabel(r.product, r.amount)}
                          {!isWeighed(r.product.unit) && !isPieceUnit(r.product.unit) && r.product.netWeight && (
                            <div className="text-[9px] font-normal" style={{ color: SOFT }}>
                              общий вес: {(r.amount * r.product.netWeight) >= 1000 ? `${fmtNum((r.amount * r.product.netWeight) / 1000)} кг` : `${fmtNum(r.amount * r.product.netWeight)} г`}
                            </div>
                          )}
                        </td>
                        <td className="border-b py-1.5 pr-2 text-right tabular-nums" style={{ borderColor: RULE }}>{fmtMoney(r.product.price)}/{r.product.unit}</td>
                        <td className="border-b py-1.5 pr-3 text-right tabular-nums" style={{ borderColor: RULE }}>{fmtMoney(r.cost)}</td>
                        <td className="no-print border-b py-1.5 text-right" style={{ borderColor: RULE }}>
                          <span className="inline-flex gap-1">
                            <button onClick={() => toggle(r.product.id, "bought")} className={`tap rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide transition-colors ${isBought ? "" : "opacity-45"}`} style={isBought ? { borderColor: "#22c55e", background: "rgba(34,197,94,0.12)", color: "#22c55e" } : { borderColor: RULE, color: SOFT }}>куплено</button>
                            <button onClick={() => toggle(r.product.id, "stock")} className={`tap rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide transition-colors ${isStock ? "" : "opacity-45"}`} style={isStock ? { borderColor: "#3b82f6", background: "rgba(59,130,246,0.12)", color: "#3b82f6" } : { borderColor: RULE, color: SOFT }}>на складе</button>
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        });
      })()}
      <div className="mt-6 flex justify-end">
        <div className="text-right">
          <p className="text-[10.5px] uppercase tracking-[0.14em]" style={{ color: SOFT }}>Итого к закупке</p>
          <p className="font-display text-[22px]">{fmtMoney(total)}</p>
          <p className="mt-1 text-[10px]" style={{ color: SOFT }}>без учёта позиций «куплено» и «есть на складе»</p>
        </div>
      </div>
    </div>
  );
}

function InvoiceDoc({ ev }: { ev: EventPlan }) {
  const { state } = useStore();
  const sum = eventSummary(ev, state.recipes, state.products);
  const st = EVENT_TYPE_STYLE[ev.type];
  const isFuneral = ev.type === "Поминки";
  return (
    <div className="px-10 py-12" style={{ background: "#fefdfb" }}>
      <DocHeader note="финансовый документ" />
      <div className="flex items-end justify-between gap-4 border-b-2 pb-4" style={{ borderColor: INK }}>
        <div>
          <h1 className="font-display text-[24px] leading-tight">Счёт для клиента</h1>
          <p className="mt-1 text-[12.5px]" style={{ color: SOFT }}>{ev.name} · {fmtDateLong(ev.date)} · {ev.guests} {plural(ev.guests, ["гость", "гостя", "гостей"])}</p>
        </div>
        <span className="shrink-0 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: st.fg === "#aebfd2" ? "#5c6b80" : GOLD, background: "rgba(0,0,0,0.04)", border: `1px solid ${RULE}` }}>{ev.type}</span>
      </div>
      {!isFuneral ? (
        <div className="mt-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: GOLD }}>Блюда по меню</p>
          {MENU_ORDER.map((cat) => {
            const group = sum.dishes.filter((d) => d.recipe.category === cat);
            if (group.length === 0) return null;
            return (
              <div key={cat} className="mt-4">
                <p className="border-b pb-1 text-[10px] font-bold uppercase tracking-[0.14em]" style={{ borderColor: RULE, color: SOFT }}>{cat}</p>
                <table className="mt-1 w-full border-collapse text-[11.5px]">
                  <thead>
                    <tr className="text-left text-[9.5px] uppercase tracking-[0.1em]" style={{ color: SOFT, background: "#f5f0e8" }}>
                      <th className="border-b py-1.5 pr-2 font-semibold" style={{ borderColor: RULE }}>Блюдо</th>
                      <th className="border-b py-1.5 pr-2 text-right font-semibold" style={{ borderColor: RULE }}>Порций</th>
                      <th className="border-b py-1.5 pr-2 text-right font-semibold" style={{ borderColor: RULE }}>Цена с чел-ка</th>
                      <th className="border-b py-1.5 text-right font-semibold" style={{ borderColor: RULE }}>Сумма</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.map((d, idx) => (
                      <tr key={d.recipe.id} style={{ background: idx % 2 === 0 ? "#fefdfb" : "#faf6f0" }}>
                        <td className="border-b py-1.5 pr-2" style={{ borderColor: RULE }}>
                          <span className="inline-flex flex-wrap items-center gap-1.5">{d.recipe.name}<ServingBadge serving={d.recipe.serving} light /></span>
                          {d.dish.discount > 0 && <span className="ml-2 text-[9.5px] font-bold" style={{ color: "#ef4444" }}>скидка −{d.dish.discount}%</span>}
                        </td>
                        <td className="border-b py-1.5 pr-2 text-right tabular-nums" style={{ borderColor: RULE }}>{d.dish.portions}</td>
                        <td className="border-b py-1.5 pr-2 text-right tabular-nums" style={{ borderColor: RULE }}>{fmtMoney(d.clientPerPortion)}</td>
                        <td className="border-b py-1.5 text-right font-semibold tabular-nums" style={{ borderColor: RULE }}>{fmtMoney(d.clientPerPortion * d.dish.portions)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
          <div className="mt-3 flex justify-end">
            <table className="w-[300px] text-[11.5px]">
              <tbody>
                <tr><td className="py-1" style={{ color: SOFT }}>Блюда по меню</td><td className="py-1 text-right font-semibold tabular-nums">{fmtMoney(sum.foodListTotal)}</td></tr>
                {sum.dishDiscountSum > 0 && <tr><td className="py-1" style={{ color: "#ef4444" }}>Скидки на блюда</td><td className="py-1 text-right tabular-nums" style={{ color: "#ef4444" }}>−{fmtMoney(sum.dishDiscountSum)}</td></tr>}
                {sum.eventDiscountSum > 0 && <tr><td className="py-1" style={{ color: "#ef4444" }}>Общая скидка {ev.discount}%</td><td className="py-1 text-right tabular-nums" style={{ color: "#ef4444" }}>−{fmtMoney(sum.eventDiscountSum)}</td></tr>}
                <tr><td className="border-t py-1.5 font-semibold" style={{ borderColor: INK }}>Итого блюда</td><td className="border-t py-1.5 text-right font-display text-[15px]" style={{ borderColor: INK }}>{fmtMoney(sum.foodAfterDiscount)}</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="mt-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: GOLD }}>Организация поминального стола</p>
          <table className="mt-2 w-full border-collapse text-[11.5px]">
            <tbody>
              <tr>
                <td className="border-b py-2 pr-2" style={{ borderColor: RULE }}>
                  Блюда по согласованному меню ({sum.portions} порций, {ev.guests} {plural(ev.guests, ["гость", "гостя", "гостей"])})
                  <p className="mt-0.5 text-[10px]" style={{ color: SOFT }}>детальный состав меню — в приложении к счёту</p>
                </td>
                <td className="border-b py-2 text-right font-semibold tabular-nums" style={{ borderColor: RULE }}>{fmtMoney(sum.foodAfterDiscount)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
      {ev.services.length > 0 && (
        <div className="mt-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: GOLD }}>Услуги</p>
          <table className="mt-2 w-full border-collapse text-[11.5px]">
            <thead>
              <tr className="text-left text-[9.5px] uppercase tracking-[0.1em]" style={{ color: SOFT, background: "#f5f0e8" }}>
                <th className="border-b py-1.5 pr-2 font-semibold" style={{ borderColor: RULE }}>Наименование</th>
                <th className="border-b py-1.5 pr-2 text-right font-semibold" style={{ borderColor: RULE }}>Кол-во</th>
                <th className="border-b py-1.5 pr-2 text-right font-semibold" style={{ borderColor: RULE }}>Цена</th>
                <th className="border-b py-1.5 text-right font-semibold" style={{ borderColor: RULE }}>Сумма</th>
              </tr>
            </thead>
            <tbody>
              {ev.services.map((s, idx) => (
                <tr key={s.id} style={{ background: idx % 2 === 0 ? "#fefdfb" : "#faf6f0" }}>
                  <td className="border-b py-1.5 pr-2" style={{ borderColor: RULE }}>{s.name}</td>
                  <td className="border-b py-1.5 pr-2 text-right tabular-nums" style={{ borderColor: RULE }}>{fmtNum(s.quantity)} {s.unit}</td>
                  <td className="border-b py-1.5 pr-2 text-right tabular-nums" style={{ borderColor: RULE }}>{fmtMoney(s.price)}</td>
                  <td className="border-b py-1.5 text-right font-semibold tabular-nums" style={{ borderColor: RULE }}>{fmtMoney(s.price * s.quantity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {(ev.clientItems?.length ?? 0) > 0 && (
        <div className="mt-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: GOLD }}>Привозит/готовит клиент</p>
          <table className="mt-2 w-full border-collapse text-[11.5px]">
            <tbody>
              {ev.clientItems!.map((item, idx) => (
                <tr key={item.id} style={{ background: idx % 2 === 0 ? "#fefdfb" : "#faf6f0" }}>
                  <td className="border-b py-1.5 pr-2" style={{ borderColor: RULE }}>{item.name}</td>
                  <td className="border-b py-1.5 pr-2 text-right tabular-nums" style={{ borderColor: RULE }}>{item.amount} {item.unit}</td>
                  <td className="border-b py-1.5 text-right" style={{ borderColor: RULE }}>{item.note ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="mt-6 flex justify-end">
        <div className="w-[300px]">
          <div className="flex items-baseline justify-between border-t-2 pt-2.5" style={{ borderColor: INK }}>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: SOFT }}>Итого к оплате</p>
            <p className="font-display text-[24px]">{fmtMoney(sum.grand)}</p>
          </div>
          {ev.guests > 0 && <p className="mt-1 text-right text-[10.5px]" style={{ color: SOFT }}>≈ {fmtMoney(sum.perGuest)} на гостя</p>}
        </div>
      </div>
      <div className="mt-10 grid grid-cols-2 gap-10 text-[11px]" style={{ color: SOFT }}>
        <div className="border-t pt-2" style={{ borderColor: INK }}>Исполнитель</div>
        <div className="border-t pt-2" style={{ borderColor: INK }}>Заказчик</div>
      </div>
      <p className="mt-6 text-[9.5px] leading-relaxed" style={{ color: SOFT }}>{state.requisites.org} · {state.requisites.inn} · {state.requisites.account}</p>
    </div>
  );
}

function PreviewShell({ title, subtitle, onClose, children, onExportExcel }: { title: string; subtitle: string; onClose: () => void; children: ReactNode; onExportExcel?: () => void }) {
  return (
    <div className="print-host fixed inset-0 z-[80] overflow-y-auto bg-[#04100c]/97 scroll-thin">
      <div className="no-print sticky top-0 z-10 border-b border-line bg-pine-900/95 backdrop-blur-md">
        <div className="mx-auto flex h-[54px] max-w-[860px] items-center gap-3 px-4">
          <button onClick={onClose} className="tap grid h-9 w-9 place-items-center rounded-full border border-line text-sage hover:text-cream" aria-label="Закрыть"><IcX size={16} /></button>
          <div className="min-w-0 grow"><p className="truncate font-display text-[14px] leading-tight">{title}</p><p className="truncate text-[10.5px] text-sage">{subtitle}</p></div>
          {onExportExcel && <button onClick={onExportExcel} className="tap flex items-center gap-2 rounded-[11px] border border-line bg-pine-800 px-3.5 py-2 font-display text-[11.5px] font-bold text-sage hover:text-mint">Сохранить в Excel</button>}
          <button onClick={() => window.print()} className="tap flex items-center gap-2 rounded-[11px] bg-saffron px-3.5 py-2 font-display text-[11.5px] font-bold text-pine-950 hover:brightness-110"><IcPrinter size={15} /> Сохранить в PDF</button>
        </div>
      </div>
      <div className="mx-auto max-w-[860px] px-3 py-6 md:px-6">
        <div id="print-root" className="print-sheet overflow-hidden rounded-[6px] shadow-[0_30px_90px_rgba(0,0,0,0.6)]" style={{ fontFamily: "var(--font-body)", background: "#fefdfb", color: "#2d2420" }}>{children}</div>
        <p className="no-print mt-4 pb-4 text-center text-[11px] text-sage">Формат А4 · для PDF выберите «Сохранить как PDF» в диалоге печати</p>
      </div>
    </div>
  );
}

export function EventDocPreview({ kind, event, onClose }: { kind: DocKind; event: EventPlan; onClose: () => void }) {
  const { state } = useStore();
  const titles: Record<DocKind, string> = { chef: "Задание для поваров", shopping: "Сводный список закупок", invoice: "Счёт для клиента" };
  
  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();
    const wsData: any[][] = [];
    
    if (kind === "chef") {
      wsData.push(["Задание для поваров"]);
      wsData.push([event.name, fmtDateLong(event.date), `${event.guests} гостей`]);
      wsData.push([]);
      
      CHEF_ORDER.forEach((cat) => {
        const group = eventSummary(event, state.recipes, state.products).dishes.filter((d) => d.recipe.category === cat);
        if (group.length === 0) return;
        
        wsData.push([cat]);
        group.forEach((d) => {
          wsData.push([d.recipe.name, `${d.dish.portions} порций`]);
          d.rows.forEach((row) => {
            const p = state.products.find((x) => x.id === row.productId);
            if (p) {
              const perPerson = row.amount / d.recipe.portions;
              const total = perPerson * event.guests;
              wsData.push(["", p.name, isWeighed(p.unit) ? amountLabel(total, p.unit) : pieceAmountLabel(p, total)]);
            }
          });
          if (d.dish.comment) {
            wsData.push(["", `* ${d.dish.comment}`]);
          }
          wsData.push([]);
        });
      });
    } else if (kind === "shopping") {
      const rows = buildShopping(event, state.recipes, state.products);
      wsData.push(["Сводный список закупок"]);
      wsData.push([event.name, fmtDateLong(event.date)]);
      wsData.push([]);
      wsData.push(["Продукт", "Категория", "Нужно", "Общий вес", "Цена/ед.", "Сумма", "В блюдах"]);
      
      rows.forEach((r) => {
        const totalWeight = isWeighed(r.product.unit) ? r.amount : (r.product.netWeight ? r.amount * r.product.netWeight : null);
        wsData.push([
          r.product.name,
          r.product.category,
          isWeighed(r.product.unit) ? amountLabel(r.amount, r.product.unit) : pieceAmountLabel(r.product, r.amount),
          totalWeight !== null ? (totalWeight >= 1000 ? `${fmtNum(totalWeight / 1000)} кг` : `${fmtNum(totalWeight)} г`) : "",
          `${fmtMoney(r.product.price)}/${r.product.unit}`,
          fmtMoney(r.cost),
          r.usedInDishes ? r.usedInDishes.map((d) => `${d.name} — ${d.amount}`).join(", ") : ""
        ]);
      });
      
      const total = rows.reduce((s, r) => s + r.cost, 0);
      wsData.push([]);
      wsData.push(["", "", "", "", "", "ИТОГО:", fmtMoney(total)]);
    } else if (kind === "invoice") {
      const sum = eventSummary(event, state.recipes, state.products);
      wsData.push(["Счёт для клиента"]);
      wsData.push([event.name, fmtDateLong(event.date), event.type]);
      wsData.push([]);
      
      if (event.type !== "Поминки") {
        wsData.push(["Блюда по меню"]);
        MENU_ORDER.forEach((cat) => {
          const group = sum.dishes.filter((d) => d.recipe.category === cat);
          if (group.length === 0) return;
          
          wsData.push([cat]);
          wsData.push(["Блюдо", "Порций", "Цена с чел-ка", "Сумма"]);
          group.forEach((d) => {
            wsData.push([
              d.recipe.name + (d.dish.discount > 0 ? ` (скидка -${d.dish.discount}%)` : ""),
              d.dish.portions,
              fmtMoney(d.clientPerPortion),
              fmtMoney(d.clientPerPortion * d.dish.portions)
            ]);
          });
          wsData.push([]);
        });
        
        wsData.push(["", "", "Итого блюда:", fmtMoney(sum.foodAfterDiscount)]);
      }
      
      if (event.services.length > 0) {
        wsData.push([]);
        wsData.push(["Услуги"]);
        wsData.push(["Наименование", "Кол-во", "Цена", "Сумма"]);
        event.services.forEach((s) => {
          wsData.push([s.name, `${fmtNum(s.quantity)} ${s.unit}`, fmtMoney(s.price), fmtMoney(s.price * s.quantity)]);
        });
      }
      
      wsData.push([]);
      wsData.push(["", "", "ИТОГО К ОПЛАТЕ:", fmtMoney(sum.grand)]);
    }
    
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, titles[kind]);
    XLSX.writeFile(wb, `${titles[kind]} - ${event.name}.xlsx`);
  };
  
  return (
    <PreviewShell title={titles[kind]} subtitle={event.name} onClose={onClose} onExportExcel={exportToExcel}>
      {kind === "chef" && <ChefDoc ev={event} />}
      {kind === "shopping" && <ShoppingDoc ev={event} />}
      {kind === "invoice" && <InvoiceDoc ev={event} />}
    </PreviewShell>
  );
}

export function MultiShoppingPreview({ events, onClose }: { events: EventPlan[]; onClose: () => void }) {
  const { state } = useStore();
  
  const exportToExcel = () => {
    const rows = buildMultiShopping(events, state.recipes, state.products);
    const wsData: any[][] = [
      ["Общий список закупок"],
      [`Объединено ${events.length} ${plural(events.length, ["мероприятие", "мероприятия", "мероприятий"])}`],
      [],
      ["Продукт", "Категория", "Всего нужно", "Общий вес", "Цена/ед.", "Сумма", "По мероприятиям"]
    ];
    
    rows.forEach((r) => {
      const eventsList = r.perEvent.map((pe) => `${pe.eventName}: ${isWeighed(r.product.unit) ? amountLabel(pe.amount, r.product.unit) : pieceAmountLabel(r.product, pe.amount)}`).join("; ");
      const totalWeight = isWeighed(r.product.unit) ? r.amount : (r.product.netWeight ? r.amount * r.product.netWeight : null);
      wsData.push([
        r.product.name,
        r.product.category,
        isWeighed(r.product.unit) ? amountLabel(r.amount, r.product.unit) : pieceAmountLabel(r.product, r.amount),
        totalWeight !== null ? (totalWeight >= 1000 ? `${fmtNum(totalWeight / 1000)} кг` : `${fmtNum(totalWeight)} г`) : "",
        `${fmtMoney(r.product.price)}/${r.product.unit}`,
        fmtMoney(r.cost),
        eventsList
      ]);
    });
    
    const total = rows.reduce((s, r) => s + r.cost, 0);
    wsData.push([]);
    wsData.push(["", "", "", "", "", "ИТОГО:", fmtMoney(total)]);
    
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Общий список");
    XLSX.writeFile(wb, `Общий список закупок.xlsx`);
  };
  
  return (
    <PreviewShell title="Общий список закупок" subtitle={`${events.length} ${plural(events.length, ["мероприятие", "мероприятия", "мероприятий"])} · ингредиенты суммированы`} onClose={onClose} onExportExcel={exportToExcel}>
      <MultiShoppingDoc events={events} />
    </PreviewShell>
  );
}

function MultiShoppingDoc({ events }: { events: EventPlan[] }) {
  const { state } = useStore();
  const rows = buildMultiShopping(events, state.recipes, state.products);
  const total = rows.reduce((s, r) => s + r.cost, 0);
  
  return (
    <div className="px-10 py-12" style={{ background: "#fefdfb" }}>
      <DocHeader note="объединённая ведомость" />
      <div className="flex items-end justify-between gap-4 border-b-2 pb-4" style={{ borderColor: INK }}>
        <div>
          <h1 className="font-display text-[24px] leading-tight">Общий список закупок</h1>
          <p className="mt-1 text-[12.5px]" style={{ color: SOFT }}>Объединено {events.length} {plural(events.length, ["мероприятие", "мероприятия", "мероприятий"])}: {events.map((e) => `${e.name} (${fmtDateLong(e.date)})`).join(" · ")}</p>
        </div>
        <p className="shrink-0 text-right text-[11.5px]" style={{ color: SOFT }}>всего {rows.length} позиций</p>
      </div>
      {(() => {
        const byCategory = new Map<string, typeof rows>();
        for (const r of rows) {
          const cat = r.product.category;
          const arr = byCategory.get(cat);
          if (arr) arr.push(r);
          else byCategory.set(cat, [r]);
        }
        const sortedCategories = Array.from(byCategory.keys()).sort((a, b) => {
          const orderA = PRODUCT_CATEGORIES.indexOf(a as any);
          const orderB = PRODUCT_CATEGORIES.indexOf(b as any);
          return orderA - orderB;
        });
        return sortedCategories.map((category) => {
          const items = byCategory.get(category)!;
          const categoryTotal = items.reduce((s, r) => s + r.cost, 0);
          return (
            <div key={category} className="mt-5">
              <div className="mb-2 flex items-center gap-2 border-b-2 pb-1" style={{ borderColor: GOLD }}>
                <span className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: GOLD }}>{category}</span>
                <span className="text-[10px]" style={{ color: SOFT }}>· {items.length} {items.length === 1 ? "позиция" : items.length < 5 ? "позиции" : "позиций"}</span>
                <span className="h-px grow" style={{ background: RULE }} />
                <span className="text-[10px]" style={{ color: SOFT }}>{fmtMoney(categoryTotal)}</span>
              </div>
              <table className="w-full border-collapse text-[11.5px]">
                <thead>
                  <tr className="text-left text-[9.5px] uppercase tracking-[0.1em]" style={{ color: SOFT, background: "#f5f0e8" }}>
                    <th className="border-b py-1.5 pr-2 font-semibold" style={{ borderColor: RULE }}>Продукт</th>
                    <th className="border-b py-1.5 pr-2 text-right font-semibold" style={{ borderColor: RULE }}>Всего нужно</th>
                    <th className="border-b py-1.5 pr-2 text-right font-semibold" style={{ borderColor: RULE }}>Цена/ед.</th>
                    <th className="border-b py-1.5 pr-3 text-right font-semibold" style={{ borderColor: RULE }}>Сумма</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((r, idx) => (
                    <tr key={r.product.id} style={{ background: idx % 2 === 0 ? "#fefdfb" : "#faf6f0" }}>
                      <td className="border-b py-1.5 pr-2" style={{ borderColor: RULE }}>
                        {r.product.name}
                        <p className="mt-0.5 text-[9px] leading-relaxed" style={{ color: SOFT }}>
                          {r.perEvent.map((pe) => `${pe.eventName}: ${isWeighed(r.product.unit) ? amountLabel(pe.amount, r.product.unit) : pieceAmountLabel(r.product, pe.amount)}`).join(" · ")}
                        </p>
                      </td>
                      <td className="border-b py-1.5 pr-2 text-right font-semibold tabular-nums" style={{ borderColor: RULE }}>
                        {isWeighed(r.product.unit) ? amountLabel(r.amount, r.product.unit) : pieceAmountLabel(r.product, r.amount)}
                        {!isWeighed(r.product.unit) && !isPieceUnit(r.product.unit) && r.product.netWeight && (
                          <div className="text-[9px] font-normal" style={{ color: SOFT }}>
                            общий вес: {(r.amount * r.product.netWeight) >= 1000 ? `${fmtNum((r.amount * r.product.netWeight) / 1000)} кг` : `${fmtNum(r.amount * r.product.netWeight)} г`}
                          </div>
                        )}
                      </td>
                      <td className="border-b py-1.5 pr-2 text-right tabular-nums" style={{ borderColor: RULE }}>{fmtMoney(r.product.price)}/{r.product.unit}</td>
                      <td className="border-b py-1.5 pr-3 text-right tabular-nums" style={{ borderColor: RULE }}>{fmtMoney(r.cost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        });
      })()}
      <div className="mt-6 flex justify-end">
        <div className="text-right">
          <p className="text-[10.5px] uppercase tracking-[0.14em]" style={{ color: SOFT }}>Итого</p>
          <p className="font-display text-[22px]">{fmtMoney(total)}</p>
        </div>
      </div>
    </div>
  );
}

export function RecipesPricePreview({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state } = useStore();
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [showSelection, setShowSelection] = useState(true);

  useEffect(() => {
    if (open) {
      const defaultCategories = state.categories.filter((c) => c.isDefault && c.name !== "Поминки").map((c) => c.name);
      setSelectedCategories(defaultCategories);
      setShowSelection(true);
    }
  }, [open, state.categories]);

  if (!open) return null;

  const toggleCategory = (catName: string) => {
    setSelectedCategories((prev) => prev.includes(catName) ? prev.filter((c) => c !== catName) : [...prev, catName]);
  };

  const handlePrint = () => { setShowSelection(false); };
  
  const exportToExcel = () => {
    const wsData: any[][] = [
      ["Прайс-лист блюд"],
      [`Конечные цены с наценкой · ${fmtDateLong(todayISO())}`],
      []
    ];
    
    [...MENU_ORDER, ...state.categories.filter((c) => !MENU_ORDER.includes(c.name)).map((c) => c.name)].forEach((cat) => {
      if (!selectedCategories.includes(cat)) return;
      const group = state.recipes.filter((r) => r.category === cat).sort((a, b) => a.name.localeCompare(b.name, "ru"));
      if (group.length === 0) return;
      
      wsData.push([cat]);
      wsData.push(["Название", "Способ подачи", "Выход (г)", "Общий вес (г)", "Рассчитано на чел-к", "Цена с чел-ка", "Блюдо целиком"]);
      
      group.forEach((r) => {
        wsData.push([
          r.name,
          SERVING_LABEL[r.serving],
          r.servingWeight,
          recipeTotalWeight(r, state.products),
          r.portions,
          fmtMoney(recipeFinalPerPortion(r, state.products)),
          fmtMoney(recipeFinalPerPortion(r, state.products) * r.portions)
        ]);
      });
      wsData.push([]);
    });
    
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Прайс-лист");
    XLSX.writeFile(wb, `Прайс-лист блюд.xlsx`);
  };

  if (showSelection) {
    return (
      <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#04100c]/97 backdrop-blur-md">
        <div className="w-full max-w-[600px] rounded-[16px] border border-line bg-pine-900 p-6 shadow-2xl">
          <div className="mb-6">
            <h2 className="font-display text-[20px] text-cream">Выберите категории для печати</h2>
            <p className="mt-2 text-[13px] text-sage">Отметьте категории блюд, которые нужно включить в прайс-лист</p>
          </div>
          <div className="mb-6 grid grid-cols-2 gap-3">
            {state.categories.map((cat) => {
              const isSelected = selectedCategories.includes(cat.name);
              const recipesCount = state.recipes.filter((r) => r.category === cat.name).length;
              return (
                <button key={cat.id} onClick={() => toggleCategory(cat.name)} className={`tap flex items-center gap-3 rounded-[12px] border p-3 text-left transition-all ${isSelected ? "border-saffron/60 bg-saffron/10" : "border-line bg-pine-800 hover:border-sage/40"}`}>
                  <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-[6px] border-2 transition-all ${isSelected ? "border-saffron bg-saffron" : "border-sage/40"}`}>
                    {isSelected && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>}
                  </div>
                  <div className="min-w-0 grow">
                    <p className={`text-[13px] font-semibold ${isSelected ? "text-saffron" : "text-cream"}`}>{cat.name}</p>
                    <p className="text-[11px] text-sage">{recipesCount} {recipesCount === 1 ? "блюдо" : recipesCount < 5 ? "блюда" : "блюд"}</p>
                  </div>
                </button>
              );
            })}
          </div>
          <div className="flex items-center justify-between gap-3">
            <button onClick={onClose} className="tap rounded-[12px] border border-line px-5 py-2.5 font-display text-[13px] font-bold text-sage hover:text-cream">Отмена</button>
            <button onClick={handlePrint} disabled={selectedCategories.length === 0} className="tap flex items-center gap-2 rounded-[12px] bg-saffron px-5 py-2.5 font-display text-[13px] font-bold text-pine-950 disabled:opacity-35"><IcPrinter size={16} /> Печать / PDF</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <PreviewShell title="Прайс-лист блюд" subtitle="Конечные цены по кулинарному справочнику" onClose={onClose} onExportExcel={exportToExcel}>
      <RecipesPriceDoc selectedCategories={selectedCategories} />
    </PreviewShell>
  );
}

function RecipesPriceDoc({ selectedCategories }: { selectedCategories: string[] }) {
  const { state } = useStore();
  return (
    <div className="px-10 py-12" style={{ background: "#fefdfb" }}>
      <DocHeader note="кулинарный справочник" />
      <div className="border-b-2 pb-4" style={{ borderColor: INK }}>
        <h1 className="font-display text-[24px] leading-tight">Прайс-лист блюд</h1>
        <p className="mt-1 text-[12.5px]" style={{ color: SOFT }}>Конечные цены с наценкой · {fmtDateLong(todayISO())}</p>
      </div>
      {[...MENU_ORDER, ...state.categories.filter((c) => !MENU_ORDER.includes(c.name)).map((c) => c.name)].map((cat) => {
        if (!selectedCategories.includes(cat)) return null;
        const group = state.recipes.filter((r) => r.category === cat && !r.hideFromPriceList).sort((a, b) => a.name.localeCompare(b.name, "ru"));
        if (group.length === 0) return null;
        return (
          <div key={cat} className="mt-6">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: GOLD }}>{cat} · {group.length}</p>
            <table className="mt-2 w-full border-collapse text-[11.5px]">
              <tbody>
                {group.map((r, idx) => (
                  <tr key={r.id} style={{ background: idx % 2 === 0 ? "#fefdfb" : "#faf6f0" }}>
                    <td className="border-b py-2.5 pr-4 align-top" style={{ borderColor: RULE }}>
                      <p className="flex flex-wrap items-center gap-2 font-display text-[13.5px]">
                        {r.name}
                        <ServingBadge serving={r.serving} light />
                      </p>
                      <p className="mt-0.5 text-[10px]" style={{ color: SOFT }}>
                        выход {r.servingWeight} г · общий вес {fmtNum(recipeTotalWeight(r, state.products))} г · рассчитано на {r.portions} чел.
                      </p>
                      {r.description && <p className="mt-1 text-[10.5px] italic leading-relaxed" style={{ color: SOFT }}>{r.description}</p>}
                    </td>
                    <td className="w-[120px] border-b py-2.5 pr-3 text-right align-top tabular-nums" style={{ borderColor: RULE }}>
                      <p className="font-display text-[14px] font-semibold">{fmtMoney(recipeFinalPerPortion(r, state.products))}</p>
                      <p className="text-[9.5px]" style={{ color: SOFT }}>цена с чел-ка</p>
                    </td>
                    <td className="w-[110px] border-b py-2.5 text-right align-top tabular-nums" style={{ borderColor: RULE }}>
                      <p className="font-semibold">{fmtMoney(recipeFinalPerPortion(r, state.products) * r.portions)}</p>
                      <p className="text-[9.5px] font-normal" style={{ color: SOFT }}>блюдо целиком</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
      <p className="mt-8 text-[10px] leading-relaxed" style={{ color: SOFT }}>Цены указаны с учётом наценки и могут корректироваться скидками при формировании счёта на мероприятие.</p>
    </div>
  );
}
