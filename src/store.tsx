import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import type {
  AppState,
  CategoryInfo,
  EventPlan,
  PriceLogEntry,
  Product,
  Recipe,
  Requisites,
  Service,
  Task,
} from "./types";
import { seedState } from "./data";
import type { PriceRowInput } from "./utils";
import { round2, todayISO, uid } from "./utils";

const KEY = "moe-cafe-v7";

function normalize(raw: Partial<AppState>): AppState {
  const base = seedState;
  return {
    products: Array.isArray(raw.products)
      ? raw.products.map((p) => ({
          ...p,
          category: p.category ?? ("Прочие" as const),
          netWeight: p.netWeight ?? null,
        }))
      : base.products,
    categories: Array.isArray(raw.categories) ? raw.categories : base.categories,
    recipes: Array.isArray(raw.recipes)
      ? raw.recipes.map((r) => ({
          ...r,
          techNote: r.techNote ?? "",
          serving: r.serving ?? "per-person",
          markupMode: r.markupMode ?? "percent",
          markupValue: r.markupValue ?? (r as { markup?: number }).markup ?? 0,
          hideFromPriceList: r.hideFromPriceList ?? false,
        }))
      : base.recipes,
    priceLog: Array.isArray(raw.priceLog) ? raw.priceLog : [],
    services: Array.isArray(raw.services) ? raw.services : base.services,
    events: Array.isArray(raw.events)
      ? raw.events.map((e) => {
          const defaultGuestsPerTable = e.type === "Торжество" ? 6 : 8;
          return {
            ...e,
            discount: e.discount ?? 0,
            guestsPerTable: e.guestsPerTable ?? defaultGuestsPerTable,
            tablesCount: e.tablesCount ?? Math.ceil((e.guests ?? 0) / defaultGuestsPerTable),
            clientItems: e.clientItems ?? [],
            bought: e.bought ?? [],
            inStock: e.inStock ?? [],
            comment: e.comment ?? "",
            dishes: (e.dishes ?? []).map((d) => ({ ...d, discount: d.discount ?? 0, comment: d.comment ?? "" })),
          };
        })
      : base.events,
    tasks: Array.isArray(raw.tasks) ? raw.tasks : base.tasks,
    requisites: { ...base.requisites, ...(raw.requisites ?? {}) },
  };
}

function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AppState>;
      return normalize(parsed);
    }
  } catch {
    /* повреждённые данные — используем демо */
  }
  return seedState;
}

interface StoreApi {
  state: AppState;
  saveProduct: (p: Product) => void;
  deleteProduct: (id: string) => void;
  importProducts: (rows: PriceRowInput[]) => { added: number; updated: number };
  saveCategory: (c: CategoryInfo) => void;
  deleteCategory: (id: string) => void;
  saveRecipe: (r: Recipe) => void;
  deleteRecipe: (id: string) => void;
  saveService: (s: Service) => void;
  deleteService: (id: string) => void;
  saveEvent: (e: EventPlan) => void;
  deleteEvent: (id: string) => void;
  saveTask: (t: Task) => void;
  deleteTask: (id: string) => void;
  toggleTask: (id: string) => void;
  saveRequisites: (r: Requisites) => void;
  usageInRecipes: (productId: string) => number;
  usageInEvents: (recipeId: string) => number;
}

const Ctx = createContext<StoreApi | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(load);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* квота переполнена — молча пропускаем */
    }
  }, [state]);

  const saveProduct = (p: Product) => {
    setState((s) => {
      const today = todayISO();
      const existing = s.products.find((x) => x.id === p.id);
      const next: Product = {
        ...p,
        price: round2(p.price),
        updatedAt: existing && existing.price === round2(p.price) ? existing.updatedAt : today,
      };
      const products = existing
        ? s.products.map((x) => (x.id === p.id ? next : x))
        : [...s.products, next];

      let priceLog = s.priceLog;
      if (!existing || existing.price !== next.price) {
        const entry: PriceLogEntry = {
          id: uid(),
          productId: next.id,
          name: next.name,
          oldPrice: existing ? existing.price : null,
          newPrice: next.price,
          date: today,
        };
        priceLog = [entry, ...s.priceLog].slice(0, 300);
      }
      return { ...s, products, priceLog };
    });
  };

  const deleteProduct = (id: string) => {
    setState((s) => ({
      ...s,
      products: s.products.filter((p) => p.id !== id),
      recipes: s.recipes.map((r) =>
        r.ingredients.some((i) => i.productId === id)
          ? { ...r, ingredients: r.ingredients.filter((i) => i.productId !== id) }
          : r,
      ),
      events: s.events.map((e) => ({
        ...e,
        dishes: e.dishes.map((d) =>
          d.overrides && d.overrides.some((i) => i.productId === id)
            ? { ...d, overrides: d.overrides!.filter((i) => i.productId !== id) }
            : d,
        ),
      })),
    }));
  };

  const importProducts = (rows: PriceRowInput[]): { added: number; updated: number } => {
    let added = 0;
    let updated = 0;
    setState((s) => {
      const today = todayISO();
      const products = [...s.products];
      const newLog: PriceLogEntry[] = [];
      const norm = (str: string) => str.trim().toLowerCase().replace(/\s+/g, " ");

      for (const row of rows) {
        const idx = products.findIndex((p) => norm(p.name) === norm(row.name));
        if (idx >= 0) {
          const old = products[idx];
          if (old.price !== row.price) {
            newLog.push({ id: uid(), productId: old.id, name: old.name, oldPrice: old.price, newPrice: row.price, date: today });
            products[idx] = { ...old, price: row.price, category: row.category ?? old.category, updatedAt: today };
            updated++;
          }
        } else {
          const id = uid();
          newLog.push({ id: uid(), productId: id, name: row.name, oldPrice: null, newPrice: row.price, date: today });
          products.push({
            id,
            name: row.name.trim(),
            unit: row.unit,
            price: row.price,
            category: row.category ?? "Прочие",
            netWeight: null,
            updatedAt: today,
          });
          added++;
        }
      }
      return { ...s, products, priceLog: [...newLog, ...s.priceLog].slice(0, 300) };
    });
    return { added, updated };
  };

  const saveCategory = (c: CategoryInfo) => {
    setState((s) => ({
      ...s,
      categories: s.categories.some((x) => x.id === c.id)
        ? s.categories.map((x) => (x.id === c.id ? c : x))
        : [...s.categories, c],
    }));
  };

  const deleteCategory = (id: string) => {
    setState((s) => ({
      ...s,
      categories: s.categories.filter((c) => c.id !== id),
    }));
  };

  const saveRecipe = (r: Recipe) => {
    setState((s) => ({
      ...s,
      recipes: s.recipes.some((x) => x.id === r.id)
        ? s.recipes.map((x) => (x.id === r.id ? r : x))
        : [...s.recipes, r],
    }));
  };

  const deleteRecipe = (id: string) => {
    setState((s) => ({
      ...s,
      recipes: s.recipes.filter((r) => r.id !== id),
      events: s.events.map((e) => ({
        ...e,
        dishes: e.dishes.filter((d) => d.recipeId !== id),
      })),
    }));
  };

  const saveService = (sv: Service) => {
    setState((s) => ({
      ...s,
      services: s.services.some((x) => x.id === sv.id)
        ? s.services.map((x) => (x.id === sv.id ? sv : x))
        : [...s.services, sv],
    }));
  };

  const deleteService = (id: string) => {
    setState((s) => ({ ...s, services: s.services.filter((x) => x.id !== id) }));
  };

  const saveEvent = (e: EventPlan) => {
    setState((s) => ({
      ...s,
      events: s.events.some((x) => x.id === e.id)
        ? s.events.map((x) => (x.id === e.id ? e : x))
        : [...s.events, e],
    }));
  };

  const deleteEvent = (id: string) => {
    setState((s) => ({
      ...s,
      events: s.events.filter((e) => e.id !== id),
      tasks: s.tasks.map((t) => (t.eventId === id ? { ...t, eventId: null } : t)),
    }));
  };

  const saveTask = (t: Task) => {
    setState((s) => ({
      ...s,
      tasks: s.tasks.some((x) => x.id === t.id)
        ? s.tasks.map((x) => (x.id === t.id ? t : x))
        : [...s.tasks, t],
    }));
  };

  const deleteTask = (id: string) => {
    setState((s) => ({ ...s, tasks: s.tasks.filter((t) => t.id !== id) }));
  };

  const toggleTask = (id: string) => {
    setState((s) => ({
      ...s,
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
    }));
  };

  const saveRequisites = (r: Requisites) => {
    setState((s) => ({ ...s, requisites: r }));
  };

  const usageInRecipes = (productId: string) =>
    state.recipes.filter((r) => r.ingredients.some((i) => i.productId === productId)).length;

  const usageInEvents = (recipeId: string) =>
    state.events.filter((e) => e.dishes.some((d) => d.recipeId === recipeId)).length;

  const api: StoreApi = {
    state,
    saveProduct,
    deleteProduct,
    importProducts,
    saveCategory,
    deleteCategory,
    saveRecipe,
    deleteRecipe,
    saveService,
    deleteService,
    saveEvent,
    deleteEvent,
    saveTask,
    deleteTask,
    toggleTask,
    saveRequisites,
    usageInRecipes,
    usageInEvents,
  };

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useStore(): StoreApi {
  const v = useContext(Ctx);
  if (!v) throw new Error("StoreProvider отсутствует");
  return v;
}
