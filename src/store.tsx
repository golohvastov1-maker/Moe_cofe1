import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type {
  AppState,
  CategoryInfo,
  EventPlan,
  EventTypeInfo,
  PriceLogEntry,
  Product,
  Recipe,
  Requisites,
  Service,
  Task,
  ProductCategory,
} from "./types";
import { DEFAULT_EVENT_TYPES, PRODUCT_CATEGORIES, isWeighed } from "./types";
import { seedState } from "./data";
import { getRemoteSyncEnabled, loadRemoteSnapshot, saveRemoteSnapshot } from "./sync";
import type { PriceRowInput } from "./utils";
import { ceilPurchaseAmount, ingredientCost, round2, todayISO, uid } from "./utils";

const KEY = "moe-cafe-v8";
const LEGACY_KEY = "moe-cafe-v7";
export type SyncStatus = "local" | "connecting" | "synced" | "syncing" | "error";

function readLocal(): AppState {
  for (const key of [KEY, LEGACY_KEY]) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<AppState>;
        return normalize(parsed);
      }
    } catch (error) {
      console.error(`Не удалось загрузить данные из ${key}.`, error);
    }
  }
  return seedState;
}

function normalize(raw: Partial<AppState>): AppState {
  const base = seedState;
  const products = Array.isArray(raw.products)
    ? raw.products.map((p) => ({
        ...p,
        category: p.category ?? "Прочие",
        netWeight: p.netWeight ?? null,
        packageContent: p.packageContent ?? (p.netWeight ? { amount: p.netWeight, unit: "г" } : null),
      }))
    : base.products;
  const productCategories = [...new Set([
    ...(Array.isArray(raw.productCategories) ? raw.productCategories : PRODUCT_CATEGORIES),
    ...products.map((product) => product.category),
  ])];
  const eventTypes = Array.isArray(raw.eventTypes)
    ? raw.eventTypes.map((eventType) => ({
        ...eventType,
        defaultGuestsPerTable: Math.max(1, eventType.defaultGuestsPerTable || 1),
        excludedDishCategories: Array.isArray(eventType.excludedDishCategories) ? eventType.excludedDishCategories : [],
        hiddenInvoiceDishCategories: Array.isArray(eventType.hiddenInvoiceDishCategories) ? eventType.hiddenInvoiceDishCategories : [],
      }))
    : DEFAULT_EVENT_TYPES.map((eventType) => ({
        ...eventType,
        excludedDishCategories: [...eventType.excludedDishCategories],
        hiddenInvoiceDishCategories: [],
      }));
  return {
    products,
    productCategories,
    categories: Array.isArray(raw.categories) ? raw.categories : base.categories,
    eventTypes,
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
        const defaultGuestsPerTable = eventTypes.find((eventType) => eventType.name === e.type)?.defaultGuestsPerTable
          ?? (e.type === "Торжество" ? 6 : 8);
          return {
            ...e,
            discount: e.discount ?? 0,
            guestsPerTable: e.guestsPerTable ?? defaultGuestsPerTable,
            tablesCount: e.tablesCount ?? Math.ceil((e.guests ?? 0) / defaultGuestsPerTable),
            clientItems: e.clientItems ?? [],
            additionalShoppingItems: e.additionalShoppingItems ?? [],
            bought: e.bought ?? [],
            inStock: e.inStock ?? [],
            purchasePlaces: e.purchasePlaces ?? {},
            comment: e.comment ?? "",
            dishes: (e.dishes ?? []).map((d) => ({ ...d, discount: d.discount ?? 0, comment: d.comment ?? "" })),
          };
        })
      : base.events,
    tasks: Array.isArray(raw.tasks) ? raw.tasks : base.tasks,
    combinedShoppingLists: Array.isArray(raw.combinedShoppingLists)
      ? raw.combinedShoppingLists.map((list) => ({
          ...list,
          items: (Array.isArray(list.items) ? list.items : []).map((item) => {
            const product = products.find((entry) => entry.id === item.productId) ?? item.customProduct;
            const requiredAmount = item.requiredAmount ?? item.amount;
            if (!product || isWeighed(product.unit)) return { ...item, requiredAmount };
            const amount = ceilPurchaseAmount(item.amount);
            return {
              ...item,
              amount,
              requiredAmount,
              cost: ingredientCost({ productId: item.productId, amount }, [product, ...products]),
            };
          }),
        }))
      : [],
    requisites: { ...base.requisites, ...(raw.requisites ?? {}) },
  };
}

function snapshotsEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function mergeArrayItemKey(value: unknown): string | null {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? null;
  const record = value as Record<string, unknown>;
  for (const field of ["id", "productId", "recipeId", "eventId", "recipeName", "name"]) {
    const key = record[field];
    if (typeof key === "string" || typeof key === "number") return `${field}:${key}`;
  }
  return null;
}

// Merge independent edits; when both sides changed the same value, prefer local.
function mergeConcurrentValue(base: unknown, local: unknown, remote: unknown): unknown {
  if (snapshotsEqual(local, base)) return remote;
  if (snapshotsEqual(remote, base)) return local;
  if (snapshotsEqual(local, remote)) return local;

  if (Array.isArray(base) && Array.isArray(local) && Array.isArray(remote)) {
    const entries = new Map<string, { base?: unknown; local?: unknown; remote?: unknown }>();
    const addEntries = (values: unknown[], source: "base" | "local" | "remote") => {
      values.forEach((value) => {
        const key = mergeArrayItemKey(value);
        if (key === null) throw new Error("Не удалось объединить запись без идентификатора.");
        const entry = entries.get(key) ?? {};
        if (entry[source] !== undefined) {
          throw new Error(`Не удалось объединить повторяющийся идентификатор "${key}".`);
        }
        entry[source] = value;
        entries.set(key, entry);
      });
    };
    addEntries(base, "base");
    addEntries(local, "local");
    addEntries(remote, "remote");

    const orderedKeys = [
      ...remote.map(mergeArrayItemKey),
      ...local.map(mergeArrayItemKey),
      ...base.map(mergeArrayItemKey),
    ].filter((key): key is string => key !== null);
    const merged: unknown[] = [];
    for (const key of new Set(orderedKeys)) {
      const entry = entries.get(key);
      if (!entry) continue;
      const value = mergeConcurrentValue(entry.base, entry.local, entry.remote);
      if (value !== undefined) merged.push(value);
    }
    return merged;
  }

  if (
    base !== null && typeof base === "object" && !Array.isArray(base) &&
    local !== null && typeof local === "object" && !Array.isArray(local) &&
    remote !== null && typeof remote === "object" && !Array.isArray(remote)
  ) {
    const baseRecord = base as Record<string, unknown>;
    const localRecord = local as Record<string, unknown>;
    const remoteRecord = remote as Record<string, unknown>;
    const merged: Record<string, unknown> = {};
    for (const key of new Set([
      ...Object.keys(baseRecord),
      ...Object.keys(localRecord),
      ...Object.keys(remoteRecord),
    ])) {
      const value = mergeConcurrentValue(baseRecord[key], localRecord[key], remoteRecord[key]);
      if (value !== undefined) merged[key] = value;
    }
    return merged;
  }

  return local;
}

function mergeConcurrentState(base: AppState, local: AppState, remote: AppState): AppState {
  return normalize(mergeConcurrentValue(base, local, remote) as Partial<AppState>);
}

import type { CombinedShoppingList } from "./types";

interface StoreApi {
  state: AppState;
  syncStatus: SyncStatus;
  lastSyncedAt: string | null;
  syncError: string | null;
  retrySync: () => void;
  saveProduct: (p: Product) => void;
  deleteProduct: (id: string) => void;
  importProducts: (rows: PriceRowInput[]) => { added: number; updated: number };
  saveProductCategory: (oldName: ProductCategory | null, newName: ProductCategory) => void;
  deleteProductCategory: (name: ProductCategory) => void;
  moveProductCategory: (name: ProductCategory, direction: -1 | 1) => void;
  saveCategory: (c: CategoryInfo) => void;
  deleteCategory: (id: string) => void;
  moveCategory: (id: string, direction: -1 | 1) => void;
  saveEventType: (previousName: string | null, eventType: EventTypeInfo) => void;
  moveEventType: (name: string, direction: -1 | 1) => void;
  saveRecipe: (r: Recipe) => void;
  deleteRecipe: (id: string) => void;
  saveService: (s: Service) => void;
  deleteService: (id: string) => void;
  saveEvent: (e: EventPlan) => void;
  deleteEvent: (id: string) => void;
  saveTask: (t: Task) => void;
  deleteTask: (id: string) => void;
  toggleTask: (id: string) => void;
  saveCombinedShoppingList: (list: CombinedShoppingList) => void;
  deleteCombinedShoppingList: (id: string) => void;
  setShoppingStatus: (eventIds: string[], productId: string, field: "bought" | "inStock", checked: boolean) => void;
  setPurchasePlace: (eventIds: string[], productId: string, place: string) => void;
  saveRequisites: (r: Requisites) => void;
  usageInRecipes: (productId: string) => number;
  usageInEvents: (recipeId: string) => number;
}

const Ctx = createContext<StoreApi | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(() => readLocal());
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(() =>
    getRemoteSyncEnabled() ? "connecting" : "local",
  );
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const latestState = useRef(state);
  const initialState = useRef(state);
  const lastSyncedState = useRef<string | null>(null);
  const lastRemoteUpdatedAt = useRef(0);
  const syncInitialized = useRef(!getRemoteSyncEnabled());
  const syncInProgress = useRef(false);
  const syncRequested = useRef(false);
  const syncNow = useRef<(() => Promise<void>) | null>(null);
  const saveTimer = useRef<number | null>(null);
  latestState.current = state;

  useEffect(() => {
    let cancelled = false;

    const synchronize = async () => {
      if (cancelled || !getRemoteSyncEnabled()) return;
      if (syncInProgress.current) {
        syncRequested.current = true;
        return;
      }
      syncInProgress.current = true;
      if (!syncInitialized.current) setSyncStatus("connecting");

      try {
        const remote = await loadRemoteSnapshot();
        if (cancelled) return;

        const current = latestState.current;
        const currentSnapshot = JSON.stringify(current);

        if (!syncInitialized.current) {
          const localChangedWhileLoading = currentSnapshot !== JSON.stringify(initialState.current);

          if (remote) {
            const remoteUpdatedAt = Date.parse(remote.updatedAt);
            if (Number.isNaN(remoteUpdatedAt)) {
              throw new Error("Supabase вернул некорректное время обновления.");
            }

            const remoteState = normalize(remote.state);
            const remoteSnapshot = JSON.stringify(remoteState);

            if (localChangedWhileLoading) {
              const mergedState = mergeConcurrentState(initialState.current, current, remoteState);
              const mergedSnapshot = JSON.stringify(mergedState);
              if (mergedSnapshot !== remoteSnapshot) {
                setSyncStatus("syncing");
                const savedAt = await saveRemoteSnapshot(mergedState);
                lastRemoteUpdatedAt.current = Date.parse(savedAt);
                lastSyncedState.current = mergedSnapshot;
                setLastSyncedAt(savedAt);
              } else {
                lastRemoteUpdatedAt.current = remoteUpdatedAt;
                lastSyncedState.current = mergedSnapshot;
                setLastSyncedAt(remote.updatedAt);
              }
              setState((value) => snapshotsEqual(value, current)
                ? mergedState
                : mergeConcurrentState(current, value, mergedState));
            } else {
              lastRemoteUpdatedAt.current = remoteUpdatedAt;
              lastSyncedState.current = remoteSnapshot;
              setLastSyncedAt(remote.updatedAt);
              setState((value) => {
                const valueSnapshot = JSON.stringify(value);
                if (valueSnapshot !== currentSnapshot && valueSnapshot !== remoteSnapshot) {
                  return mergeConcurrentState(current, value, remoteState);
                }
                return valueSnapshot === remoteSnapshot ? value : remoteState;
              });
            }
          } else {
            setSyncStatus("syncing");
            const savedAt = await saveRemoteSnapshot(current);
            lastRemoteUpdatedAt.current = Date.parse(savedAt);
            lastSyncedState.current = currentSnapshot;
            setLastSyncedAt(savedAt);
          }

          syncInitialized.current = true;
          setSyncError(null);
          setSyncStatus("synced");
          return;
        }

        const isLocallyDirty = currentSnapshot !== lastSyncedState.current;
        const remoteUpdatedAt = remote ? Date.parse(remote.updatedAt) : 0;
        if (remote && Number.isNaN(remoteUpdatedAt)) {
          throw new Error("Supabase вернул некорректное время обновления.");
        }

        const remoteState = remote ? normalize(remote.state) : null;
        const remoteSnapshot = remoteState ? JSON.stringify(remoteState) : null;
        const remoteChanged = remoteSnapshot !== null && remoteSnapshot !== lastSyncedState.current;

        if (remote && remoteState && remoteSnapshot !== null && (remoteUpdatedAt > lastRemoteUpdatedAt.current || remoteChanged)) {
          if (isLocallyDirty) {
            const baseState = lastSyncedState.current
              ? normalize(JSON.parse(lastSyncedState.current) as Partial<AppState>)
              : initialState.current;
            const mergedState = mergeConcurrentState(baseState, current, remoteState);
            const mergedSnapshot = JSON.stringify(mergedState);
            if (mergedSnapshot !== remoteSnapshot) {
              setSyncStatus("syncing");
              const savedAt = await saveRemoteSnapshot(mergedState);
              lastRemoteUpdatedAt.current = Date.parse(savedAt);
              lastSyncedState.current = mergedSnapshot;
              setLastSyncedAt(savedAt);
            } else {
              lastRemoteUpdatedAt.current = remoteUpdatedAt;
              lastSyncedState.current = mergedSnapshot;
              setLastSyncedAt(remote.updatedAt);
            }
            setState((value) => snapshotsEqual(value, current)
              ? mergedState
              : mergeConcurrentState(current, value, mergedState));
          } else {
            lastRemoteUpdatedAt.current = remoteUpdatedAt;
            const previousSnapshot = lastSyncedState.current;
            lastSyncedState.current = remoteSnapshot;
            setLastSyncedAt(remote.updatedAt);
            setState((value) => {
              const valueSnapshot = JSON.stringify(value);
              if (valueSnapshot !== previousSnapshot && valueSnapshot !== remoteSnapshot) {
                return mergeConcurrentState(current, value, remoteState);
              }
              return valueSnapshot === remoteSnapshot ? value : remoteState;
            });
          }
        } else if (!remote || isLocallyDirty) {
          setSyncStatus("syncing");
          const savedAt = await saveRemoteSnapshot(current);
          lastRemoteUpdatedAt.current = Date.parse(savedAt);
          lastSyncedState.current = currentSnapshot;
          setLastSyncedAt(savedAt);
        } else {
          lastRemoteUpdatedAt.current = Math.max(lastRemoteUpdatedAt.current, remoteUpdatedAt);
          setLastSyncedAt(remote?.updatedAt ?? null);
        }

        setSyncError(null);
        setSyncStatus("synced");
      } catch (error) {
        console.error("Ошибка синхронизации с Supabase.", error);
        setSyncError(error instanceof Error ? error.message : "Не удалось связаться с Supabase.");
        setSyncStatus("error");
      } finally {
        syncInProgress.current = false;
        if (!cancelled && syncRequested.current) {
          syncRequested.current = false;
          window.setTimeout(() => void synchronize(), 0);
        }
      }
    };

    syncNow.current = synchronize;
    void synchronize();
    const interval = window.setInterval(() => void synchronize(), 3000);
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void synchronize();
    };
    const onPageShow = () => void synchronize();
    window.addEventListener("online", synchronize);
    window.addEventListener("focus", synchronize);
    window.addEventListener("pageshow", onPageShow);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      cancelled = true;
      syncNow.current = null;
      window.clearInterval(interval);
      window.removeEventListener("online", synchronize);
      window.removeEventListener("focus", synchronize);
      window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  useEffect(() => {
    const snapshot = JSON.stringify(state);
    try {
      localStorage.setItem(KEY, snapshot);
    } catch (error) {
      console.error("Не удалось сохранить данные приложения.", error);
      window.dispatchEvent(new CustomEvent("moe-cafe-storage-error"));
    }

    if (!getRemoteSyncEnabled() || !syncInitialized.current) return;
    if (snapshot === lastSyncedState.current) return;

    if (saveTimer.current !== null) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => void syncNow.current?.(), 500);
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
      const productCategories = [...s.productCategories];
      const newLog: PriceLogEntry[] = [];
      const norm = (str: string) => str.trim().toLowerCase().replace(/\s+/g, " ");

      for (const row of rows) {
        const rowCategory = row.category;
        if (rowCategory && !productCategories.some((category) => category.toLocaleLowerCase("ru") === rowCategory.toLocaleLowerCase("ru"))) {
          productCategories.push(rowCategory);
        }
        const idx = products.findIndex((p) => norm(p.name) === norm(row.name));
        if (idx >= 0) {
          const old = products[idx];
          if (old.price !== row.price) {
            newLog.push({ id: uid(), productId: old.id, name: old.name, oldPrice: old.price, newPrice: row.price, date: today });
          }
          const nextCategory = row.category ?? old.category;
          if (old.price !== row.price || old.category !== nextCategory) {
            products[idx] = { ...old, price: row.price, category: nextCategory, updatedAt: today };
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
      return { ...s, products, productCategories, priceLog: [...newLog, ...s.priceLog].slice(0, 300) };
    });
    return { added, updated };
  };

  const saveProductCategory = (oldName: ProductCategory | null, newName: ProductCategory) => {
    const normalized = newName.trim();
    if (!normalized) return;
    setState((s) => {
      const existing = s.productCategories.find((category) =>
        category.toLocaleLowerCase("ru") === normalized.toLocaleLowerCase("ru") &&
        category !== oldName,
      );
      if (existing) return s;
      const categories = oldName
        ? s.productCategories.map((category) => category === oldName ? normalized : category)
        : [...s.productCategories, normalized];
      return {
        ...s,
        productCategories: [...new Set(categories)],
        products: oldName
          ? s.products.map((product) => product.category === oldName ? { ...product, category: normalized } : product)
          : s.products,
      };
    });
  };

  const deleteProductCategory = (name: ProductCategory) => {
    setState((s) => {
      if (s.productCategories.length <= 1) return s;
      const fallback = name === "Прочие"
        ? s.productCategories.find((category) => category !== name)!
        : s.productCategories.includes("Прочие") ? "Прочие" : s.productCategories.find((category) => category !== name)!;
      return {
        ...s,
        productCategories: s.productCategories.filter((category) => category !== name),
        products: s.products.map((product) => product.category === name ? { ...product, category: fallback } : product),
      };
    });
  };

  const moveProductCategory = (name: ProductCategory, direction: -1 | 1) => {
    setState((s) => {
      const categories = [...s.productCategories];
      const index = categories.indexOf(name);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= categories.length) return s;
      [categories[index], categories[target]] = [categories[target], categories[index]];
      return { ...s, productCategories: categories };
    });
  };

  const saveCategory = (c: CategoryInfo) => {
    setState((s) => {
      const previous = s.categories.find((category) => category.id === c.id);
      return {
        ...s,
        categories: previous
          ? s.categories.map((category) => category.id === c.id ? c : category)
          : [...s.categories, c],
        recipes: previous && previous.name !== c.name
          ? s.recipes.map((recipe) => recipe.category === previous.name ? { ...recipe, category: c.name } : recipe)
          : s.recipes,
        eventTypes: previous && previous.name !== c.name
          ? s.eventTypes.map((eventType) => ({
              ...eventType,
              excludedDishCategories: eventType.excludedDishCategories.map((name) => name === previous.name ? c.name : name),
              hiddenInvoiceDishCategories: eventType.hiddenInvoiceDishCategories?.map((name) => name === previous.name ? c.name : name),
            }))
          : s.eventTypes,
      };
    });
  };

  const deleteCategory = (id: string) => {
    setState((s) => {
      const deleted = s.categories.find((category) => category.id === id);
      return {
        ...s,
        categories: s.categories.filter((category) => category.id !== id),
        eventTypes: deleted
          ? s.eventTypes.map((eventType) => ({
              ...eventType,
              excludedDishCategories: eventType.excludedDishCategories.filter((name) => name !== deleted.name),
            }))
          : s.eventTypes,
      };
    });
  };

  const moveCategory = (id: string, direction: -1 | 1) => {
    setState((s) => {
      const categories = [...s.categories];
      const index = categories.findIndex((category) => category.id === id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= categories.length) return s;
      [categories[index], categories[target]] = [categories[target], categories[index]];
      return { ...s, categories };
    });
  };

  const saveEventType = (previousName: string | null, eventType: EventTypeInfo) => {
    const name = eventType.name.trim();
    if (!name) return;
    setState((s) => {
      const duplicate = s.eventTypes.some((item) => item.name === name && item.name !== previousName);
      if (duplicate) return s;
      const nextType = { ...eventType, name };
      return {
        ...s,
        eventTypes: previousName
          ? s.eventTypes.map((item) => item.name === previousName ? nextType : item)
          : [...s.eventTypes, nextType],
        events: previousName && previousName !== name
          ? s.events.map((event) => event.type === previousName ? { ...event, type: name } : event)
          : s.events,
      };
    });
  };

  const moveEventType = (name: string, direction: -1 | 1) => {
    setState((s) => {
      const eventTypes = [...s.eventTypes];
      const index = eventTypes.findIndex((eventType) => eventType.name === name);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= eventTypes.length) return s;
      [eventTypes[index], eventTypes[target]] = [eventTypes[target], eventTypes[index]];
      return { ...s, eventTypes };
    });
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

  const saveCombinedShoppingList = (list: CombinedShoppingList) => {
    setState((s) => {
      const exists = s.combinedShoppingLists.some((x) => x.id === list.id);
      return {
        ...s,
        combinedShoppingLists: exists
          ? s.combinedShoppingLists.map((x) => (x.id === list.id ? list : x))
          : [...s.combinedShoppingLists, list],
      };
    });
  };

  const deleteCombinedShoppingList = (id: string) => {
    setState((s) => ({
      ...s,
      combinedShoppingLists: s.combinedShoppingLists.filter((l) => l.id !== id),
    }));
  };

  const setShoppingStatus: StoreApi["setShoppingStatus"] = (eventIds, productId, field, checked) => {
    setState((s) => {
      const affectedEventIds = new Set(eventIds);
      let expanded = true;
      while (expanded) {
        expanded = false;
        for (const list of s.combinedShoppingLists) {
          const item = list.items.find((entry) => entry.productId === productId);
          const relatedEventIds = item
            ? item.usedIn.length > 0
              ? item.usedIn.map((usage) => usage.eventId)
              : list.eventIds
            : [];
          if (!item || !relatedEventIds.some((eventId) => affectedEventIds.has(eventId))) continue;
          for (const eventId of relatedEventIds) {
            if (!affectedEventIds.has(eventId)) {
              affectedEventIds.add(eventId);
              expanded = true;
            }
          }
        }
      }

      const otherField = field === "bought" ? "inStock" : "bought";
      const events = s.events.map((event) => {
        if (!affectedEventIds.has(event.id)) return event;
        const current = new Set(event[field] ?? []);
        const other = new Set(event[otherField] ?? []);
        if (checked) {
          current.add(productId);
          other.delete(productId);
        } else {
          current.delete(productId);
        }
        return { ...event, [field]: [...current], [otherField]: [...other] };
      });

      const combinedShoppingLists = s.combinedShoppingLists.map((list) => {
        const item = list.items.find((entry) => entry.productId === productId);
        const relatedEventIds = item
          ? item.usedIn.length > 0
            ? item.usedIn.map((usage) => usage.eventId)
            : list.eventIds
          : [];
        if (!item || !relatedEventIds.some((eventId) => affectedEventIds.has(eventId))) return list;
        return {
          ...list,
          items: list.items.map((entry) =>
            entry.productId === productId
              ? { ...entry, [field]: checked, [otherField]: checked ? false : entry[otherField] }
              : entry,
          ),
          updatedAt: todayISO(),
        };
      });

      return { ...s, events, combinedShoppingLists };
    });
  };

  const setPurchasePlace: StoreApi["setPurchasePlace"] = (eventIds, productId, place) => {
    setState((s) => {
      const affectedEventIds = new Set(eventIds);
      let expanded = true;
      while (expanded) {
        expanded = false;
        for (const list of s.combinedShoppingLists) {
          const item = list.items.find((entry) => entry.productId === productId);
          if (!item) continue;
          const relatedEventIds = item.usedIn.length > 0
            ? item.usedIn.map((usage) => usage.eventId)
            : list.eventIds;
          if (!relatedEventIds.some((eventId) => affectedEventIds.has(eventId))) continue;
          for (const eventId of relatedEventIds) {
            if (!affectedEventIds.has(eventId)) {
              affectedEventIds.add(eventId);
              expanded = true;
            }
          }
        }
      }

      const trimmedPlace = place.trim();
      const events = s.events.map((event) => {
        if (!affectedEventIds.has(event.id)) return event;
        const purchasePlaces = { ...event.purchasePlaces };
        if (trimmedPlace) purchasePlaces[productId] = place;
        else delete purchasePlaces[productId];
        return { ...event, purchasePlaces };
      });
      const combinedShoppingLists = s.combinedShoppingLists.map((list) => {
        const item = list.items.find((entry) => entry.productId === productId);
        if (!item) return list;
        const relatedEventIds = item.usedIn.length > 0
          ? item.usedIn.map((usage) => usage.eventId)
          : list.eventIds;
        if (!relatedEventIds.some((eventId) => affectedEventIds.has(eventId))) return list;
        return {
          ...list,
          items: list.items.map((entry) =>
            entry.productId === productId ? { ...entry, purchasePlace: place } : entry,
          ),
          updatedAt: todayISO(),
        };
      });
      return { ...s, events, combinedShoppingLists };
    });
  };

  const saveRequisites = (r: Requisites) => {
    setState((s) => ({ ...s, requisites: r }));
  };

  const retrySync = () => {
    void syncNow.current?.();
  };

  const usageInRecipes = (productId: string) =>
    state.recipes.filter((r) => r.ingredients.some((i) => i.productId === productId)).length;

  const usageInEvents = (recipeId: string) =>
    state.events.filter((e) => e.dishes.some((d) => d.recipeId === recipeId)).length;

  const api: StoreApi = {
    state,
    syncStatus,
    lastSyncedAt,
    syncError,
    retrySync,
    saveProduct,
    deleteProduct,
    importProducts,
    saveProductCategory,
    deleteProductCategory,
    moveProductCategory,
    saveCategory,
    deleteCategory,
    moveCategory,
    saveEventType,
    moveEventType,
    saveRecipe,
    deleteRecipe,
    saveService,
    deleteService,
    saveEvent,
    deleteEvent,
    saveTask,
    deleteTask,
    toggleTask,
    saveCombinedShoppingList,
    deleteCombinedShoppingList,
    setShoppingStatus,
    setPurchasePlace,
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
