import { useState, useEffect } from "react";
import type { ReactNode } from "react";
import type { CombinedShoppingList, DocKind, EventPlan } from "../types";
import { CHEF_ORDER, MENU_ORDER, SERVING_LABEL, amountUnitLabel, catStyle, compareProductCategories, eventTypeStyle, isPieceUnit, isWeighed, orderedRecipeCategories } from "../types";
import { useStore } from "../store";
import { amountLabel, buildCombinedShoppingList, buildMultiShopping, buildShopping, comparePurchasePlaces, eventSummary, fmtDateLong, fmtMoney, fmtNum, pieceAmountLabel, plural, productPackageContentLabel, recipeFinalPerPortion, recipeTotalWeight, roundedPieceAmountLabel, shoppingPieceAmountLabel, todayISO } from "../utils";
import { IcDownload, IcPrinter, IcX } from "./Icons";
import { ServingBadge, inputCls, useToast } from "./UI";

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
  const sum = eventSummary(ev, state.recipes, state.products, state.eventTypes);
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
      {orderedRecipeCategories(state.categories, sum.dishes.map((dish) => dish.recipe.category), CHEF_ORDER).map((cat) => {
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
                              {row.toTaste ? "По вкусу" : isWeighed(p.unit) ? amountLabel(perPerson, p.unit) : roundedPieceAmountLabel(p, perPerson)}
                            </td>
                          )}
                          <td className="border-b py-1.5 pr-2 text-right tabular-nums" style={{ borderColor: RULE }}>
                            {row.toTaste ? "По вкусу" : isWeighed(p.unit) ? amountLabel(displayAmount, p.unit) : roundedPieceAmountLabel(p, displayAmount)}
                          </td>
                          <td className="border-b py-1.5 text-right font-semibold tabular-nums" style={{ borderColor: RULE }}>
                            {row.toTaste ? "По вкусу" : isWeighed(p.unit) ? amountLabel(total, p.unit) : roundedPieceAmountLabel(p, total)}
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

function ShoppingDoc({ ev, sortMode }: { ev: EventPlan; sortMode: "category" | "place" }) {
  const { state, setShoppingStatus } = useStore();
  const rows = buildShopping(ev, state.recipes, state.products, state.productCategories);
  const bought = ev.bought ?? [];
  const inStock = ev.inStock ?? [];
  const toggle = (pid: string, kind: "bought" | "stock") => {
    const field = kind === "bought" ? "bought" : "inStock";
    setShoppingStatus([ev.id], pid, field, !ev[field]?.includes(pid));
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
        const groups = new Map<string, typeof rows>();
        for (const r of rows) {
          const place = ev.purchasePlaces?.[r.product.id]?.trim();
          const key = sortMode === "category" ? r.product.category : place ?? "";
          const group = groups.get(key);
          if (group) group.push(r);
          else groups.set(key, [r]);
        }
        const sortedGroups = Array.from(groups.keys()).sort((a, b) => sortMode === "category"
          ? compareProductCategories(a, b, state.productCategories)
          : comparePurchasePlaces(a, b));
        return sortedGroups.map((groupName) => {
          const items = groups.get(groupName)!;
          const categoryTotal = items.reduce((s, r) => s + r.cost, 0);
          const categoryToBuy = items.filter((r) => !bought.includes(r.product.id) && !inStock.includes(r.product.id));
          return (
            <div key={groupName} className="mt-5">
              <div className="mb-2 flex items-center gap-2 border-b-2 pb-1" style={{ borderColor: GOLD }}>
                <span className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: GOLD }}>{groupName || "Место не указано"}</span>
                <span className="text-[10px]" style={{ color: SOFT }}>· {items.length} {items.length === 1 ? "позиция" : items.length < 5 ? "позиции" : "позиций"}</span>
                <span className="h-px grow" style={{ background: RULE }} />
                <span className="text-[10px]" style={{ color: SOFT }}>к закупке {categoryToBuy.length} · {fmtMoney(categoryTotal)}</span>
              </div>
              <table className="w-full border-collapse text-[11.5px]">
                <thead>
                  <tr className="text-left text-[9.5px] uppercase tracking-[0.1em]" style={{ color: SOFT, background: "#f5f0e8" }}>
                    <th className="border-b py-1.5 pr-2 font-semibold" style={{ borderColor: RULE }}>Продукт</th>
                    <th className="border-b py-1.5 pr-2 text-right font-semibold" style={{ borderColor: RULE }}>Нужно</th>
                    <th className="border-b py-1.5 pr-2 font-semibold" style={{ borderColor: RULE }}>Место покупки</th>
                    <th className="border-b py-1.5 pr-2 font-semibold" style={{ borderColor: RULE }}>В каком блюде используется</th>
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
                        </td>
                        <td className="border-b py-1.5 pr-2 text-right font-semibold tabular-nums" style={{ borderColor: RULE }}>
                          {isWeighed(r.product.unit) ? amountLabel(r.amount, r.product.unit) : shoppingPieceAmountLabel(r.product, r.amount, r.requiredAmount)}
                        </td>
                        <td className="border-b py-1.5 pr-2 text-[9.5px]" style={{ borderColor: RULE }}>
                          {ev.purchasePlaces?.[r.product.id] || "—"}
                        </td>
                        <td className="border-b py-1.5 pr-2 text-[9.5px]" style={{ borderColor: RULE }}>
                          {r.usedInDishes?.length
                            ? r.usedInDishes.map((dish) => `${dish.name} — ${dish.amount}`).join(", ")
                            : "—"}
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
  const sum = eventSummary(ev, state.recipes, state.products, state.eventTypes);
  const st = eventTypeStyle(ev.type);
  const isFuneral = ev.type === "Поминки";
  const invoiceTotal = sum.grand;
  const servicesTable = ev.services.length > 0 && (
    <div className={isFuneral ? "mt-2" : "mt-6"}>
      {!isFuneral && <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: GOLD }}>Услуги</p>}
      <table className={`${isFuneral ? "" : "mt-2 "}w-full border-collapse text-[11.5px]`}>
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
  );
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
      {isFuneral && <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: GOLD }}>Организация поминального стола</p>}
      {isFuneral && servicesTable}
      {!isFuneral ? (
        <div className="mt-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: GOLD }}>Блюда по меню</p>
          {orderedRecipeCategories(state.categories, sum.dishes.map((dish) => dish.recipe.category), MENU_ORDER).map((cat) => {
            const group = sum.dishes.filter((d) => d.showInClientInvoice && d.recipe.category === cat);
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
                        <td className="border-b py-1.5 text-right font-semibold tabular-nums" style={{ borderColor: RULE }}>{d.includedInEventTotal ? fmtMoney(d.clientPerPortion * d.dish.portions) : "Не входит в итог"}</td>
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
        <div className={ev.services.length > 0 ? "mt-5" : "mt-6"}>
          {(() => {
            const additionalDishes = sum.dishes.filter((dish) => dish.showInClientInvoice);
            return (
              <>
                {additionalDishes.length > 0 && (
                  <div className="mt-5">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: SOFT }}>Дополнительные блюда</p>
                    <table className="mt-1 w-full border-collapse text-[11.5px]">
                      <thead>
                        <tr className="text-left text-[9.5px] uppercase tracking-[0.1em]" style={{ color: SOFT, background: "#f5f0e8" }}>
                          <th className="border-b py-1.5 pr-2 font-semibold" style={{ borderColor: RULE }}>Блюдо</th>
                          <th className="border-b py-1.5 pr-2 text-right font-semibold" style={{ borderColor: RULE }}>Порций</th>
                          <th className="border-b py-1.5 pr-2 text-right font-semibold" style={{ borderColor: RULE }}>Цена за порцию</th>
                          <th className="border-b py-1.5 text-right font-semibold" style={{ borderColor: RULE }}>Стоимость</th>
                        </tr>
                      </thead>
                      <tbody>
                        {additionalDishes.map((dish, index) => (
                          <tr key={dish.recipe.id} style={{ background: index % 2 === 0 ? "#fefdfb" : "#faf6f0" }}>
                            <td className="border-b py-1.5 pr-2" style={{ borderColor: RULE }}>
                              {dish.recipe.name}
                              {dish.dish.discount > 0 && <span className="ml-2 text-[9px] font-bold" style={{ color: "#ef4444" }}>скидка −{dish.dish.discount}%</span>}
                            </td>
                            <td className="border-b py-1.5 pr-2 text-right tabular-nums" style={{ borderColor: RULE }}>{dish.dish.portions}</td>
                            <td className="border-b py-1.5 pr-2 text-right tabular-nums" style={{ borderColor: RULE }}>{fmtMoney(dish.clientPerPortion)}</td>
                            <td className="border-b py-1.5 text-right font-semibold tabular-nums" style={{ borderColor: RULE }}>{dish.includedInEventTotal ? fmtMoney(dish.clientPerPortion * dish.dish.portions) : "Не входит в итог"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}
      {!isFuneral && servicesTable}
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
            <p className="font-display text-[24px]">{fmtMoney(invoiceTotal)}</p>
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
    <div className="print-host fixed inset-0 z-[80] overflow-y-auto bg-[#04100c]/97 scroll-thin print:static print:overflow-visible print:bg-white">
      <div className="no-print sticky top-0 z-10 border-b border-line bg-pine-900/95 backdrop-blur-md">
        <div className="mx-auto flex min-h-[54px] max-w-[860px] flex-wrap items-center gap-2 px-3 py-2 sm:flex-nowrap sm:gap-3 sm:px-4">
          <button onClick={onClose} className="tap grid h-9 w-9 place-items-center rounded-full border border-line text-sage hover:text-cream" aria-label="Закрыть"><IcX size={16} /></button>
          <div className="min-w-0 grow"><p className="truncate font-display text-[14px] leading-tight">{title}</p><p className="truncate text-[10.5px] text-sage">{subtitle}</p></div>
          {onExportExcel && <button onClick={onExportExcel} className="tap flex shrink-0 items-center gap-1.5 rounded-[11px] border border-line bg-pine-800 px-2.5 py-2 font-display text-[10.5px] font-bold text-sage hover:text-mint sm:gap-2 sm:px-3.5 sm:text-[11.5px]"><IcDownload size={14} /><span className="hidden min-[400px]:inline">Сохранить в Excel</span><span className="min-[400px]:hidden">Excel</span></button>}
          <button onClick={() => window.print()} className="tap flex shrink-0 items-center gap-1.5 rounded-[11px] bg-saffron px-2.5 py-2 font-display text-[10.5px] font-bold text-pine-950 hover:brightness-110 sm:gap-2 sm:px-3.5 sm:text-[11.5px]"><IcPrinter size={14} /><span className="hidden min-[400px]:inline">Сохранить в PDF</span><span className="min-[400px]:hidden">PDF</span></button>
        </div>
      </div>
      <div className="mx-auto max-w-[860px] px-3 py-6 md:px-6 print:max-w-none print:px-0 print:py-0">
        <div id="print-root" className="print-sheet overflow-hidden rounded-[6px] shadow-[0_30px_90px_rgba(0,0,0,0.6)] print:overflow-visible print:rounded-none print:shadow-none" style={{ fontFamily: "var(--font-body)", background: "#fefdfb", color: "#2d2420" }}>{children}</div>
        <p className="no-print mt-4 pb-4 text-center text-[11px] text-sage">Формат А4 · для PDF выберите «Сохранить как PDF» в диалоге печати</p>
      </div>
    </div>
  );
}

export function EventDocPreview({ kind, event, sortMode = "category", onClose }: { kind: DocKind; event: EventPlan; sortMode?: "category" | "place"; onClose: () => void }) {
  const { state } = useStore();
  const toast = useToast();
  const titles: Record<DocKind, string> = { chef: "Задание для поваров", shopping: "Сводный список закупок", invoice: "Счёт для клиента" };
  
  const exportToExcel = async () => {
    const XLSX = await import("xlsx").catch((error: unknown) => {
      console.error("Не удалось загрузить модуль экспорта Excel.", error);
      toast("Не удалось создать файл Excel", "del");
      return null;
    });
    if (!XLSX) return;
    const wb = XLSX.utils.book_new();
    const wsData: any[][] = [];
    
    if (kind === "chef") {
      const chefSummary = eventSummary(event, state.recipes, state.products, state.eventTypes);
      wsData.push(["Задание для поваров"]);
      wsData.push([event.name, fmtDateLong(event.date), `${event.guests} гостей`]);
      wsData.push([]);
      
      orderedRecipeCategories(state.categories, chefSummary.dishes.map((dish) => dish.recipe.category), CHEF_ORDER).forEach((cat) => {
        const group = chefSummary.dishes.filter((d) => d.recipe.category === cat);
        if (group.length === 0) return;
        
        wsData.push([cat]);
        group.forEach((d) => {
          wsData.push([d.recipe.name, `${d.dish.portions} порций`]);
          d.rows.forEach((row) => {
            const p = state.products.find((x) => x.id === row.productId);
            if (p) {
              if (row.toTaste) {
                wsData.push(["", p.name, "По вкусу"]);
                return;
              }
              const perPerson = row.amount / d.recipe.portions;
              const total = perPerson * event.guests;
              wsData.push(["", p.name, isWeighed(p.unit) ? amountLabel(total, p.unit) : roundedPieceAmountLabel(p, total)]);
            }
          });
          if (d.dish.comment) {
            wsData.push(["", `* ${d.dish.comment}`]);
          }
          wsData.push([]);
        });
      });
    } else if (kind === "shopping") {
      const rows = buildShopping(event, state.recipes, state.products, state.productCategories).sort((a, b) =>
        sortMode === "place"
          ? comparePurchasePlaces(event.purchasePlaces?.[a.product.id], event.purchasePlaces?.[b.product.id])
            || a.product.name.localeCompare(b.product.name, "ru")
          : compareProductCategories(a.product.category, b.product.category, state.productCategories)
            || a.product.name.localeCompare(b.product.name, "ru"),
      );
      wsData.push(["Сводный список закупок"]);
      wsData.push([event.name, fmtDateLong(event.date)]);
      wsData.push([]);
      wsData.push(["Продукт", "Категория", "Нужно", "Содержимое", "Место покупки", "Цена/ед.", "Сумма", "В блюдах"]);
      
      rows.forEach((r) => {
        const totalContent = isWeighed(r.product.unit)
          ? amountLabel(r.amount, r.product.unit)
          : productPackageContentLabel(r.product, r.requiredAmount) ?? "";
        wsData.push([
          r.product.name,
          r.product.category,
          isWeighed(r.product.unit) ? amountLabel(r.amount, r.product.unit) : shoppingPieceAmountLabel(r.product, r.amount, r.requiredAmount),
          totalContent,
          event.purchasePlaces?.[r.product.id] ?? "",
          `${fmtMoney(r.product.price)}/${r.product.unit}`,
          fmtMoney(r.cost),
          r.usedInDishes ? r.usedInDishes.map((d) => `${d.name} — ${d.amount}`).join(", ") : ""
        ]);
      });
      
      const total = rows.reduce((s, r) => s + r.cost, 0);
      wsData.push([]);
      wsData.push(["", "", "", "", "", "", "ИТОГО:", fmtMoney(total)]);
    } else if (kind === "invoice") {
      const sum = eventSummary(event, state.recipes, state.products, state.eventTypes);
      wsData.push(["Счёт для клиента"]);
      wsData.push([event.name, fmtDateLong(event.date), event.type]);
      wsData.push([]);
      
      if (event.type !== "Поминки") {
        wsData.push(["Блюда по меню"]);
        orderedRecipeCategories(state.categories, sum.dishes.map((dish) => dish.recipe.category), MENU_ORDER).forEach((cat) => {
          const group = sum.dishes.filter((d) => d.showInClientInvoice && d.recipe.category === cat);
          if (group.length === 0) return;
          
          wsData.push([cat]);
          wsData.push(["Блюдо", "Порций", "Цена с чел-ка", "Сумма"]);
          group.forEach((d) => {
            wsData.push([
              d.recipe.name + (d.dish.discount > 0 ? ` (скидка -${d.dish.discount}%)` : ""),
              d.dish.portions,
              fmtMoney(d.clientPerPortion),
              d.includedInEventTotal ? fmtMoney(d.clientPerPortion * d.dish.portions) : "Не входит в итог"
            ]);
          });
          wsData.push([]);
        });
        
        wsData.push(["", "", "Итого блюда:", fmtMoney(sum.foodAfterDiscount)]);
      } else {
        const additionalDishes = sum.dishes.filter((dish) => dish.showInClientInvoice);
        wsData.push(["Организация поминального стола"]);
        if (event.services.length > 0) {
          wsData.push(["Наименование", "Кол-во", "Цена", "Сумма"]);
          event.services.forEach((s) => {
            wsData.push([s.name, `${fmtNum(s.quantity)} ${s.unit}`, fmtMoney(s.price), fmtMoney(s.price * s.quantity)]);
          });
        }
        if (additionalDishes.length > 0) {
          if (event.services.length > 0) wsData.push([]);
          wsData.push(["Дополнительные блюда"]);
          wsData.push(["Блюдо", "Порций", "Цена за порцию", "Стоимость"]);
          additionalDishes.forEach((dish) => {
            wsData.push([
              dish.recipe.name + (dish.dish.discount > 0 ? ` (скидка -${dish.dish.discount}%)` : ""),
              dish.dish.portions,
              fmtMoney(dish.clientPerPortion),
              dish.includedInEventTotal ? fmtMoney(dish.clientPerPortion * dish.dish.portions) : "Не входит в итог",
            ]);
          });
        }
      }
      
      if (event.type !== "Поминки" && event.services.length > 0) {
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
      {kind === "shopping" && <ShoppingDoc ev={event} sortMode={sortMode} />}
      {kind === "invoice" && <InvoiceDoc ev={event} />}
    </PreviewShell>
  );
}

export function MultiShoppingPreview({ events, onClose }: { events: EventPlan[]; onClose: () => void }) {
  const { state, saveCombinedShoppingList } = useStore();
  const toast = useToast();
  const [listName, setListName] = useState(`Список закупок ${todayISO()}`);
  const [showNameInput, setShowNameInput] = useState(true);
  
  const handleCreate = () => {
    const list = buildCombinedShoppingList(listName, events, state.recipes, state.products, undefined, state.productCategories);
    saveCombinedShoppingList(list);
    setShowNameInput(false);
  };
  
  const exportToExcel = async () => {
    const XLSX = await import("xlsx").catch((error: unknown) => {
      console.error("Не удалось загрузить модуль экспорта Excel.", error);
      toast("Не удалось создать файл Excel", "del");
      return null;
    });
    if (!XLSX) return;
    const list = buildCombinedShoppingList(listName, events, state.recipes, state.products, undefined, state.productCategories);
    
    const wsData: any[][] = [
      [list.name],
      [`Объединено ${events.length} ${plural(events.length, ["мероприятие", "мероприятия", "мероприятий"])}`],
      [],
      ["Продукт", "Категория", "Всего нужно", "Цена/ед.", "Сумма", "Использование"]
    ];
    
    list.items.forEach((item) => {
      const product = state.products.find((p) => p.id === item.productId) ?? item.customProduct;
      if (!product) return;
      
      const usageList = item.usedIn.map((u) => {
        const dishesList = u.dishes.map((d) => {
          const amountStr = isWeighed(product.unit) ? amountLabel(d.amount, product.unit) : pieceAmountLabel(product, d.amount);
          return `${d.recipeName} — ${amountStr}`;
        }).join(", ");
        return `${u.eventName} (${dishesList})`;
      }).join("; ");
      
      wsData.push([
        product.name,
        product.category,
        isWeighed(product.unit) ? amountLabel(item.amount, product.unit) : shoppingPieceAmountLabel(product, item.amount, item.requiredAmount ?? item.amount),
        `${fmtMoney(product.price)}/${product.unit}`,
        fmtMoney(item.cost),
        usageList
      ]);
    });
    
    const total = list.items.reduce((s, item) => s + item.cost, 0);
    wsData.push([]);
    wsData.push(["", "", "", "", "ИТОГО:", fmtMoney(total)]);
    
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Общий список");
    
    XLSX.writeFile(wb, `${list.name}.xlsx`);
  };
  
  if (showNameInput) {
    return (
      <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#04100c]/97 backdrop-blur-md">
        <div className="w-full max-w-[500px] rounded-[16px] border border-line bg-pine-900 p-6 shadow-2xl">
          <h2 className="font-display text-[20px] text-cream mb-4">Создать общий список закупок</h2>
          <p className="text-[13px] text-sage mb-4">
            Объединено {events.length} {plural(events.length, ["мероприятие", "мероприятия", "мероприятий"])}
          </p>
          <div className="mb-6">
            <label className="block text-[11px] font-bold uppercase tracking-[0.08em] text-sage mb-2">
              Название списка
            </label>
            <input
              type="text"
              value={listName}
              onChange={(e) => setListName(e.target.value)}
              className={inputCls}
              autoFocus
            />
          </div>
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={onClose}
              className="tap rounded-[12px] border border-line px-5 py-2.5 font-display text-[13px] font-bold text-sage transition-colors hover:border-pine-400 hover:text-cream"
            >
              Отмена
            </button>
            <button
              onClick={handleCreate}
              disabled={!listName.trim()}
              className="tap flex items-center gap-2 rounded-[12px] bg-saffron px-5 py-2.5 font-display text-[13px] font-bold text-pine-950 transition-opacity hover:brightness-110 disabled:opacity-35"
            >
              <IcPrinter size={16} /> Создать и просмотреть
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  const list = buildCombinedShoppingList(listName, events, state.recipes, state.products, undefined, state.productCategories);
  
  return (
    <PreviewShell title={list.name} subtitle={`${events.length} ${plural(events.length, ["мероприятие", "мероприятия", "мероприятий"])} · ингредиенты суммированы`} onClose={onClose} onExportExcel={exportToExcel}>
      <CombinedShoppingDoc list={list} />
    </PreviewShell>
  );
}

function CombinedShoppingDoc({ list }: { list: CombinedShoppingList }) {
  const { state } = useStore();
  const total = list.items.reduce((s, item) => s + item.cost, 0);
  
  return (
    <div className="px-10 py-12" style={{ background: "#fefdfb" }}>
      <DocHeader note="объединённая ведомость" />
      <div className="flex items-end justify-between gap-4 border-b-2 pb-4" style={{ borderColor: INK }}>
        <div>
          <h1 className="font-display text-[24px] leading-tight">{list.name}</h1>
          <p className="mt-1 text-[12.5px]" style={{ color: SOFT }}>Объединено {list.eventIds.length} {plural(list.eventIds.length, ["мероприятие", "мероприятия", "мероприятий"])}</p>
        </div>
        <p className="shrink-0 text-right text-[11.5px]" style={{ color: SOFT }}>всего {list.items.length} позиций</p>
      </div>
      {(() => {
        const byCategory = new Map<string, typeof list.items>();
        for (const item of list.items) {
          const product = state.products.find((p) => p.id === item.productId) ?? item.customProduct;
          if (!product) continue;
          const cat = product.category;
          const arr = byCategory.get(cat);
          if (arr) arr.push(item);
          else byCategory.set(cat, [item]);
        }
        const sortedCategories = Array.from(byCategory.keys()).sort((a, b) => {
          return compareProductCategories(a, b, state.productCategories);
        });
        return sortedCategories.map((category) => {
          const items = byCategory.get(category)!;
          const categoryTotal = items.reduce((s, item) => s + item.cost, 0);
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
                  {items.map((item, idx) => {
                    const product = state.products.find((p) => p.id === item.productId) ?? item.customProduct;
                    if (!product) return null;
                    return (
                      <tr key={item.productId} style={{ background: idx % 2 === 0 ? "#fefdfb" : "#faf6f0" }}>
                        <td className="border-b py-1.5 pr-2" style={{ borderColor: RULE }}>
                          {product.name}
                          <div className="mt-1 text-[9px] leading-relaxed" style={{ color: SOFT }}>
                            {item.usedIn.map((u, i) => {
                              const dishesList = u.dishes.map((d) => {
                                const amountStr = isWeighed(product.unit) ? amountLabel(d.amount, product.unit) : pieceAmountLabel(product, d.amount);
                                return `${d.recipeName} — ${amountStr}`;
                              }).join(", ");
                              return (
                                <div key={i}>
                                  <span className="font-semibold">{u.eventName}</span> — {dishesList}
                                </div>
                              );
                            })}
                          </div>
                        </td>
                        <td className="border-b py-1.5 pr-2 text-right font-semibold tabular-nums" style={{ borderColor: RULE }}>
                          {isWeighed(product.unit) ? amountLabel(item.amount, product.unit) : shoppingPieceAmountLabel(product, item.amount, item.requiredAmount ?? item.amount)}
                        </td>
                        <td className="border-b py-1.5 pr-2 text-right tabular-nums" style={{ borderColor: RULE }}>
                          {fmtMoney(product.price)}/{product.unit}
                        </td>
                        <td className="border-b py-1.5 pr-3 text-right tabular-nums" style={{ borderColor: RULE }}>
                          {fmtMoney(item.cost)}
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
          <p className="text-[10.5px] uppercase tracking-[0.14em]" style={{ color: SOFT }}>Итого</p>
          <p className="font-display text-[22px]">{fmtMoney(total)}</p>
        </div>
      </div>
    </div>
  );
}

export function RecipesPricePreview({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state } = useStore();
  const toast = useToast();
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
  
  const exportToExcel = async () => {
    const XLSX = await import("xlsx").catch((error: unknown) => {
      console.error("Не удалось загрузить модуль экспорта Excel.", error);
      toast("Не удалось создать файл Excel", "del");
      return null;
    });
    if (!XLSX) return;
    const wsData: any[][] = [
      ["Прайс-лист блюд"],
      [`Конечные цены с наценкой · ${fmtDateLong(todayISO())}`],
      []
    ];
    
    orderedRecipeCategories(state.categories, state.recipes.map((recipe) => recipe.category), MENU_ORDER).forEach((cat) => {
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
      {orderedRecipeCategories(state.categories, state.recipes.map((recipe) => recipe.category), MENU_ORDER).map((cat) => {
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
                      <p className="font-display text-[13.5px]">{r.name}</p>
                      <div className="mt-1"><ServingBadge serving={r.serving} light /></div>
                      {r.description && <p className="mt-1 text-[10.5px] italic leading-relaxed" style={{ color: SOFT }}>{r.description}</p>}
                    </td>
                    <td className="w-[120px] border-b py-2.5 pr-3 text-right align-top tabular-nums" style={{ borderColor: RULE }}>
                      <p className="font-display text-[14px] font-semibold">{fmtMoney(recipeFinalPerPortion(r, state.products))}</p>
                      <p className="text-[9.5px]" style={{ color: SOFT }}>цена с чел-ка</p>
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
