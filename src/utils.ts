import type {
  EventPlan,
  EventService,
  IngredientRow,
  Product,
  ProductCategory,
  Recipe,
  Unit,
} from "./types";
import { PRODUCT_CATEGORIES, isWeighed } from "./types";

export const uid = () =>
  Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);

export const round2 = (n: number) => Math.round(n * 100) / 100;

export const fmtMoney = (n: number, digits = 0): string =>
  new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  }).format(round2(n)) +
  "\u00A0₽";

export const fmtNum = (n: number): string =>
  new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: n < 10 ? 2 : n < 100 ? 1 : 0,
  }).format(round2(n));

export const comparePurchasePlaces = (a: string | null | undefined, b: string | null | undefined): number => {
  const placeA = a?.trim() ?? "";
  const placeB = b?.trim() ?? "";
  if (!placeA) return placeB ? 1 : 0;
  if (!placeB) return -1;
  return placeA.localeCompare(placeB, "ru");
};

export const parseNum = (s: string): number => {
  const n = parseFloat(s.replace(",", "."));
  return isNaN(n) ? 0 : n;
};

export const todayISO = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
};

export const addDaysISO = (n: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
};

export const fmtDateShort = (iso: string): string => {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" }).replace(".", "");
};

export const fmtDateLong = (iso: string): string => {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
};

export const daysUntil = (iso: string): number => {
  const a = new Date(todayISO() + "T00:00:00").getTime();
  const b = new Date(iso + "T00:00:00").getTime();
  return Math.round((b - a) / 86400000);
};

export const daysUntilLabel = (iso: string): string => {
  const n = daysUntil(iso);
  if (n === 0) return "сегодня";
  if (n === 1) return "завтра";
  if (n === -1) return "вчера";
  if (n > 1) return `через ${n} дн.`;
  return `${-n} дн. назад`;
};

export const plural = (n: number, forms: [string, string, string]): string => {
  const abs = Math.abs(n) % 100;
  const d = abs % 10;
  if (abs > 10 && abs < 20) return forms[2];
  if (d === 1) return forms[0];
  if (d >= 2 && d <= 4) return forms[1];
  return forms[2];
};

export const ingredientCost = (row: IngredientRow, products: Product[]): number => {
  const p = products.find((x) => x.id === row.productId);
  if (!p) return 0;
  if (isWeighed(p.unit)) return (row.amount / 1000) * p.price;
  return row.amount * p.price;
};

export const amountLabel = (amount: number, unit: Unit): string => {
  if (isWeighed(unit) && amount >= 1000) {
    return `${fmtNum(amount / 1000)} ${unit}`;
  }
  return `${fmtNum(amount)} ${unit === "кг" ? "г" : unit === "л" ? "мл" : unit}`;
};

export const pieceAmountLabel = (product: Product, amount: number): string => {
  const base = `${fmtNum(amount)} ${product.unit}`;
  if (product.netWeight && product.netWeight > 0) {
    const totalGrams = amount * product.netWeight;
    return `${base} · ${totalGrams >= 1000 ? `${fmtNum(totalGrams / 1000)} кг` : `${fmtNum(totalGrams)} г`}`;
  }
  return base;
};

export const recipeCost = (r: Recipe, products: Product[]): number =>
  r.ingredients.reduce((s, i) => s + ingredientCost(i, products), 0);

export const recipePerPortion = (r: Recipe, products: Product[]): number =>
  r.portions > 0 ? recipeCost(r, products) / r.portions : 0;

export const recipeFinalTotal = (r: Recipe, products: Product[]): number =>
  (r.markupMode ?? "percent") === "fixed"
    ? r.markupValue ?? 0
    : recipeCost(r, products) * (1 + (r.markupValue ?? 0) / 100);

export const recipeFinalPerPortion = (r: Recipe, products: Product[]): number =>
  r.portions > 0 ? recipeFinalTotal(r, products) / r.portions : 0;

export const recipeTotalWeight = (r: Recipe, products: Product[]): number => {
  return r.ingredients.reduce((sum, row) => {
    const p = products.find((x) => x.id === row.productId);
    if (!p) return sum;
    if (isWeighed(p.unit)) {
      return sum + row.amount;
    }
    if (p.netWeight && p.netWeight > 0) {
      return sum + row.amount * p.netWeight;
    }
    return sum;
  }, 0);
};

export const servicesTotal = (rows: EventService[]): number =>
  rows.reduce((s, r) => s + r.price * r.quantity, 0);

export interface DishSummary {
  recipe: Recipe;
  dish: EventPlan["dishes"][number];
  rows: IngredientRow[];
  overridden: boolean;
  costPerPortion: number;
  clientPerPortion: number;
  perPortion: number;
}

export interface EventSummary {
  dishes: DishSummary[];
  foodCost: number;
  foodListTotal: number;
  dishDiscountSum: number;
  foodRevenue: number;
  eventDiscountSum: number;
  foodAfterDiscount: number;
  services: number;
  grand: number;
  portions: number;
  perGuest: number;
}

export function eventSummary(ev: EventPlan, recipes: Recipe[], products: Product[]): EventSummary {
  const dishes: DishSummary[] = [];
  for (const dish of ev.dishes) {
    const recipe = recipes.find((r) => r.id === dish.recipeId);
    if (!recipe) continue;
    const overridden = dish.overrides !== null;
    const rows = dish.overrides ?? recipe.ingredients;
    const cost =
      rows.reduce((s, row) => s + ingredientCost(row, products), 0) / Math.max(1, recipe.portions);
    const pricePer = recipeFinalPerPortion(recipe, products);
    const clientPerPortion = pricePer * (1 - (dish.discount ?? 0) / 100);
    dishes.push({
      recipe,
      dish,
      rows,
      overridden,
      costPerPortion: cost,
      clientPerPortion,
      perPortion: cost,
    });
  }
  const foodCost = dishes.reduce((s, d) => s + d.costPerPortion * d.dish.portions, 0);
  const foodListTotal = dishes.reduce(
    (s, d) => s + recipeFinalPerPortion(d.recipe, products) * d.dish.portions,
    0,
  );
  const foodRevenue = dishes.reduce((s, d) => s + d.clientPerPortion * d.dish.portions, 0);
  const eventDiscountSum = (foodRevenue * (ev.discount ?? 0)) / 100;
  const foodAfterDiscount = foodRevenue - eventDiscountSum;
  const services = servicesTotal(ev.services);
  const grand = foodAfterDiscount + services;
  const portions = dishes.reduce((s, d) => s + d.dish.portions, 0);
  return {
    dishes,
    foodCost,
    foodListTotal,
    dishDiscountSum: foodListTotal - foodRevenue,
    foodRevenue,
    eventDiscountSum,
    foodAfterDiscount,
    services,
    grand,
    portions,
    perGuest: ev.guests > 0 ? grand / ev.guests : 0,
  };
}

export interface ShoppingRow {
  product: Product;
  amount: number;
  cost: number;
  clientAmount?: number;
  clientNotes?: string;
  usedInDishes?: { name: string; amount: string }[];
}

export function buildShopping(
  ev: EventPlan,
  recipes: Recipe[],
  products: Product[],
): ShoppingRow[] {
  const map = new Map<string, { amount: number; clientAmount: number; notes: string[]; dishes: Map<string, number> }>();
  for (const dish of ev.dishes) {
    const recipe = recipes.find((r) => r.id === dish.recipeId);
    if (!recipe || recipe.portions <= 0) continue;
    const k = dish.portions / recipe.portions;
    const rows = dish.overrides ?? recipe.ingredients;
    for (const row of rows) {
      const existing = map.get(row.productId);
      const entry = existing ?? { amount: 0, clientAmount: 0, notes: [], dishes: new Map<string, number>() };
      const totalAmount = row.amount * k;
      if (row.clientProvided) {
        entry.clientAmount += totalAmount;
        entry.notes.push(`${recipe.name}: ${amountLabel(totalAmount, products.find((p) => p.id === row.productId)?.unit ?? "шт")} (клиент)`);
      } else {
        entry.amount += totalAmount;
      }
      const currentDishAmount = entry.dishes.get(recipe.name) ?? 0;
      entry.dishes.set(recipe.name, currentDishAmount + totalAmount);
      map.set(row.productId, entry);
    }
  }
  for (const item of ev.additionalShoppingItems ?? []) {
    const product = products.find((p) => p.id === item.productId);
    if (!product) continue;
    const entry = map.get(item.productId) ?? { amount: 0, clientAmount: 0, notes: [], dishes: new Map<string, number>() };
    entry.amount += item.amount;
    entry.dishes.set("Дополнительная закупка", (entry.dishes.get("Дополнительная закупка") ?? 0) + item.amount);
    map.set(item.productId, entry);
  }
  const out: ShoppingRow[] = [];
  for (const [pid, entry] of map) {
    const product = products.find((p) => p.id === pid);
    if (product) {
      const usedInDishes = Array.from(entry.dishes.entries()).map(([name, amount]) => ({
        name,
        amount: isWeighed(product.unit) ? amountLabel(amount, product.unit) : pieceAmountLabel(product, amount),
      }));
      out.push({
        product,
        amount: entry.amount,
        cost: ingredientCost({ productId: pid, amount: entry.amount }, products),
        clientAmount: entry.clientAmount,
        clientNotes: entry.notes.length > 0 ? entry.notes.join("; ") : undefined,
        usedInDishes,
      });
    }
  }
  return out.sort((a, b) => {
    const catOrder = PRODUCT_CATEGORIES.indexOf(a.product.category) - PRODUCT_CATEGORIES.indexOf(b.product.category);
    if (catOrder !== 0) return catOrder;
    return a.product.name.localeCompare(b.product.name, "ru");
  });
}

export interface MultiShoppingRow {
  product: Product;
  amount: number;
  cost: number;
  perEvent: { eventId: string; eventName: string; amount: number }[];
}

export function buildMultiShopping(
  events: EventPlan[],
  recipes: Recipe[],
  products: Product[],
): MultiShoppingRow[] {
  const map = new Map<string, { amount: number; perEvent: Map<string, number> }>();
  for (const ev of events) {
    for (const dish of ev.dishes) {
      const recipe = recipes.find((r) => r.id === dish.recipeId);
      if (!recipe || recipe.portions <= 0) continue;
      const k = dish.portions / recipe.portions;
      const rows = dish.overrides ?? recipe.ingredients;
      for (const row of rows) {
        let entry = map.get(row.productId);
        if (!entry) {
          entry = { amount: 0, perEvent: new Map() };
          map.set(row.productId, entry);
        }
        entry.amount += row.amount * k;
        entry.perEvent.set(ev.id, (entry.perEvent.get(ev.id) ?? 0) + row.amount * k);
      }
    }
    for (const item of ev.additionalShoppingItems ?? []) {
      if (!products.some((product) => product.id === item.productId)) continue;
      let entry = map.get(item.productId);
      if (!entry) {
        entry = { amount: 0, perEvent: new Map() };
        map.set(item.productId, entry);
      }
      entry.amount += item.amount;
      entry.perEvent.set(ev.id, (entry.perEvent.get(ev.id) ?? 0) + item.amount);
    }
  }
  const out: MultiShoppingRow[] = [];
  for (const [pid, entry] of map) {
    const product = products.find((p) => p.id === pid);
    if (!product) continue;
    out.push({
      product,
      amount: entry.amount,
      cost: ingredientCost({ productId: pid, amount: entry.amount }, products),
      perEvent: [...entry.perEvent.entries()].map(([eventId, amount]) => ({
        eventId,
        eventName: events.find((ev) => ev.id === eventId)?.name ?? "",
        amount,
      })),
    });
  }
  return out.sort((a, b) => {
    const catOrder = PRODUCT_CATEGORIES.indexOf(a.product.category) - PRODUCT_CATEGORIES.indexOf(b.product.category);
    if (catOrder !== 0) return catOrder;
    return a.product.name.localeCompare(b.product.name, "ru");
  });
}

import type { CombinedShoppingItem, CombinedShoppingList } from "./types";

export function buildCombinedShoppingList(
  name: string,
  events: EventPlan[],
  recipes: Recipe[],
  products: Product[],
  existingList?: CombinedShoppingList,
): CombinedShoppingList {
  const now = todayISO();
  const items: CombinedShoppingItem[] = [];
  
  // Собираем данные по всем продуктам
  const productMap = new Map<string, {
    amount: number;
    cost: number;
    usedIn: Map<string, { eventName: string; dishes: Map<string, number> }>;
  }>();
  
  for (const ev of events) {
    for (const dish of ev.dishes) {
      const recipe = recipes.find((r) => r.id === dish.recipeId);
      if (!recipe || recipe.portions <= 0) continue;
      
      const k = dish.portions / recipe.portions;
      const rows = dish.overrides ?? recipe.ingredients;
      
      for (const row of rows) {
        if (row.clientProvided) continue; // Пропускаем продукты клиента
        
        const product = products.find((p) => p.id === row.productId);
        if (!product) continue;
        
        const totalAmount = row.amount * k;
        
        let entry = productMap.get(row.productId);
        if (!entry) {
          entry = { amount: 0, cost: 0, usedIn: new Map() };
          productMap.set(row.productId, entry);
        }
        
        entry.amount += totalAmount;
        entry.cost += ingredientCost({ productId: row.productId, amount: totalAmount }, products);
        
        let eventEntry = entry.usedIn.get(ev.id);
        if (!eventEntry) {
          eventEntry = { eventName: ev.name, dishes: new Map() };
          entry.usedIn.set(ev.id, eventEntry);
        }
        
        const currentDishAmount = eventEntry.dishes.get(recipe.name) ?? 0;
        eventEntry.dishes.set(recipe.name, currentDishAmount + totalAmount);
      }
    }
    for (const item of ev.additionalShoppingItems ?? []) {
      const product = products.find((p) => p.id === item.productId);
      if (!product) continue;
      let entry = productMap.get(item.productId);
      if (!entry) {
        entry = { amount: 0, cost: 0, usedIn: new Map() };
        productMap.set(item.productId, entry);
      }
      entry.amount += item.amount;
      entry.cost += ingredientCost({ productId: item.productId, amount: item.amount }, products);
      let eventEntry = entry.usedIn.get(ev.id);
      if (!eventEntry) {
        eventEntry = { eventName: ev.name, dishes: new Map() };
        entry.usedIn.set(ev.id, eventEntry);
      }
      eventEntry.dishes.set(
        "Дополнительная закупка",
        (eventEntry.dishes.get("Дополнительная закупка") ?? 0) + item.amount,
      );
    }
  }
  
  // Преобразуем в массив CombinedShoppingItem
  for (const [productId, data] of productMap) {
    const product = products.find((p) => p.id === productId);
    if (!product) continue;
    
    // Проверяем существующие отметки
    const existingItem = existingList?.items.find((i) => i.productId === productId);
    
    const usedIn = Array.from(data.usedIn.entries()).map(([eventId, eventData]) => ({
      eventId,
      eventName: eventData.eventName,
      dishes: Array.from(eventData.dishes.entries()).map(([recipeName, amount]) => ({
        recipeName,
        amount,
      })),
    }));
    
    items.push({
      productId,
      amount: data.amount,
      cost: data.cost,
      bought: existingItem?.bought ?? events.some((event) => event.bought?.includes(productId)),
      inStock: existingItem?.inStock ?? events.some((event) => event.inStock?.includes(productId)),
      purchasePlace: existingItem?.purchasePlace ?? [...new Set(
        events.map((event) => event.purchasePlaces?.[productId]?.trim()).filter((place): place is string => Boolean(place)),
      )].join(", "),
      usedIn,
    });
  }
  
  // Сортируем по категориям
  items.sort((a, b) => {
    const productA = products.find((p) => p.id === a.productId);
    const productB = products.find((p) => p.id === b.productId);
    if (!productA || !productB) return 0;
    
    const catOrder = PRODUCT_CATEGORIES.indexOf(productA.category) - PRODUCT_CATEGORIES.indexOf(productB.category);
    if (catOrder !== 0) return catOrder;
    return productA.name.localeCompare(productB.name, "ru");
  });
  
  return {
    id: existingList?.id ?? uid(),
    name,
    eventIds: events.map((e) => e.id),
    items,
    createdAt: existingList?.createdAt ?? now,
    updatedAt: now,
  };
}

export interface PriceRowInput {
  name: string;
  unit: Unit;
  price: number;
  category?: ProductCategory;
}

function normalizeCategory(raw: string): ProductCategory | undefined {
  const s = raw.trim().toLowerCase();
  if (!s) return undefined;
  const found = PRODUCT_CATEGORIES.find((c) => c.toLowerCase() === s);
  if (found) return found;
  if (s.startsWith("овощ")) return "Овощи";
  if (s.startsWith("фрукт")) return "Фрукты";
  if (s.startsWith("мяс")) return "Мясо";
  if (s.startsWith("рыб")) return "Рыба";
  if (s.startsWith("консер")) return "Консерванты";
  if (s.startsWith("молоч") || s.startsWith("молоко")) return "Молочное";
  if (s.startsWith("бакал")) return "Бакалея";
  if (s.startsWith("специ")) return "Специи";
  if (s.includes("масло") || s.includes("соус")) return "Масло и соусы";
  if (s.startsWith("зелен")) return "Зелень";
  return undefined;
}

function normalizeUnit(raw: string): Unit {
  const s = raw.trim().toLowerCase().replace(".", "");
  const found = ["кг", "л", "шт", "упак", "пучок", "зубчик"].find((u) => u === s);
  if (found) return found as Unit;
  if (s.startsWith("кг") || s === "kg") return "кг";
  if (s.startsWith("л") || s === "l") return "л";
  if (s.startsWith("шт")) return "шт";
  if (s.startsWith("уп")) return "упак";
  return "кг";
}

function splitCsvLine(line: string): string[] {
  const delim = line.includes(";") ? ";" : ",";
  return line.split(delim).map((c) => c.replace(/^"|"$/g, "").trim());
}

export async function parsePriceFile(file: File): Promise<PriceRowInput[]> {
  let grid: string[][];
  const lower = file.name.toLowerCase();
  if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
    const XLSX = await import("xlsx");
    const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    grid = (XLSX.utils.sheet_to_json(ws, { header: 1 }) as unknown[][]).map((r) =>
      r.map((c) => (c === undefined || c === null ? "" : String(c))),
    );
  } else {
    const text = await file.text();
    grid = text
      .replace(/^\uFEFF/, "")
      .split(/\r?\n/)
      .filter((l) => l.trim().length > 0)
      .map(splitCsvLine);
  }

  let catIdx = 3;
  if (grid.length > 0) {
    const headerIdx = grid[0].findIndex((c) => c.toLowerCase().includes("категор"));
    if (headerIdx >= 0) catIdx = headerIdx;
  }

  const priceOf = (cells: string[]) => parseNum(cells[2] ?? "");
  if (grid.length > 1 && priceOf(grid[0]) <= 0 && priceOf(grid[1]) > 0) {
    grid = grid.slice(1);
  }

  const out: PriceRowInput[] = [];
  for (const cells of grid) {
    const name = (cells[0] ?? "").trim();
    const price = priceOf(cells);
    if (!name || price <= 0) continue;
    const category = normalizeCategory(cells[catIdx] ?? "");
    out.push({
      name,
      unit: normalizeUnit(cells[1] ?? "кг"),
      price: round2(price),
      ...(category ? { category } : {}),
    });
  }
  return out;
}

export function productsToCsv(products: Product[]): string {
  const esc = (s: string) => (s.includes(";") ? `"${s}"` : s);
  return [
    "Название;Ед.;Цена;Категория",
    ...products.map(
      (p) =>
        `${esc(p.name)};${p.unit};${String(p.price).replace(".", ",")};${esc(p.category ?? "Прочие")}`,
    ),
  ].join("\r\n");
}

export function downloadText(filename: string, text: string) {
  const blob = new Blob(["\uFEFF" + text], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
