export type Unit = "кг" | "л" | "шт" | "упак" | "пучок" | "зубчик";
export const UNITS: Unit[] = ["кг", "л", "шт", "упак", "пучок", "зубчик"];

export const isWeighed = (u: Unit) => u === "кг" || u === "л";
export const amountUnitLabel = (u: Unit) => (isWeighed(u) ? (u === "кг" ? "г" : "мл") : u);

export type Category = string;

export interface CategoryInfo {
  id: string;
  name: string;
  color: string;
  isDefault: boolean;
}

export const DEFAULT_CATEGORIES: CategoryInfo[] = [
  { id: "hot", name: "Горячие блюда", color: "#f4a83a", isDefault: true },
  { id: "cold", name: "Холодные закуски", color: "#85c9e8", isDefault: true },
  { id: "salad", name: "Салаты", color: "#7ed9b0", isDefault: true },
  { id: "drink", name: "Напитки", color: "#8fd0c9", isDefault: true },
  { id: "dessert", name: "Десерты", color: "#eb9cc3", isDefault: true },
  { id: "memorial", name: "Поминки", color: "#aebfd2", isDefault: true },
];

export const CHEF_ORDER: Category[] = [
  "Горячие блюда",
  "Салаты",
  "Холодные закуски",
  "Поминки",
  "Напитки",
  "Десерты",
];

export const MENU_ORDER: Category[] = [
  "Горячие блюда",
  "Холодные закуски",
  "Салаты",
  "Поминки",
  "Десерты",
  "Напитки",
];

export const CAT_STYLE: Record<string, { fg: string; bg: string }> = {
  "Горячие блюда": { fg: "#f4a83a", bg: "rgba(244,168,58,0.13)" },
  "Холодные закуски": { fg: "#85c9e8", bg: "rgba(133,201,232,0.13)" },
  Салаты: { fg: "#7ed9b0", bg: "rgba(126,217,176,0.13)" },
  Напитки: { fg: "#8fd0c9", bg: "rgba(143,208,201,0.13)" },
  Десерты: { fg: "#eb9cc3", bg: "rgba(235,156,195,0.13)" },
  Поминки: { fg: "#aebfd2", bg: "rgba(174,191,210,0.13)" },
};

export const catStyle = (c: Category): { fg: string; bg: string } => {
  return CAT_STYLE[c] ?? { fg: "#8fb3a2", bg: "rgba(143,179,162,0.13)" };
};

export type ServingStyle = "per-person" | "shared";
export const SERVING_LABEL: Record<ServingStyle, string> = {
  "per-person": "Порционно",
  shared: "Общим на стол",
};

export type EventType = "Торжество" | "Поминки";
export const EVENT_TYPES: EventType[] = ["Торжество", "Поминки"];

export const EVENT_TYPE_STYLE: Record<EventType, { fg: string; bg: string }> = {
  Торжество: { fg: "#f4a83a", bg: "rgba(244,168,58,0.13)" },
  Поминки: { fg: "#aebfd2", bg: "rgba(174,191,210,0.13)" },
};

export type ProductCategory =
  | "Овощи"
  | "Фрукты"
  | "Мясо"
  | "Рыба"
  | "Консерванты"
  | "Молочное"
  | "Бакалея"
  | "Специи"
  | "Масло и соусы"
  | "Зелень"
  | "Прочие";

export const PRODUCT_CATEGORIES: ProductCategory[] = [
  "Овощи",
  "Фрукты",
  "Мясо",
  "Рыба",
  "Консерванты",
  "Молочное",
  "Бакалея",
  "Специи",
  "Масло и соусы",
  "Зелень",
  "Прочие",
];

export const productCatColor = (c: ProductCategory): string => {
  switch (c) {
    case "Овощи": return "#7ed9b0";
    case "Фрукты": return "#e8b04b";
    case "Мясо": return "#e9684f";
    case "Рыба": return "#85c9e8";
    case "Консерванты": return "#d3a86a";
    case "Молочное": return "#e9e2c8";
    case "Бакалея": return "#cdbd92";
    case "Специи": return "#eb9cc3";
    case "Масло и соусы": return "#f4a83a";
    case "Зелень": return "#9ad08a";
    default: return "#8fb3a2";
  }
};

export const isPieceUnit = (u: Unit) => u === "шт" || u === "упак" || u === "пучок";

export interface Product {
  id: string;
  name: string;
  unit: Unit;
  category: ProductCategory;
  price: number;
  netWeight: number | null;
  updatedAt: string;
}

export interface PriceLogEntry {
  id: string;
  productId: string;
  name: string;
  oldPrice: number | null;
  newPrice: number;
  date: string;
}

export interface IngredientRow {
  productId: string;
  amount: number;
  clientProvided?: boolean;
}

export type MarkupMode = "percent" | "fixed";

export interface Recipe {
  id: string;
  name: string;
  category: Category;
  description: string;
  techNote: string;
  serving: ServingStyle;
  portions: number;
  servingWeight: number;
  markupMode: MarkupMode;
  markupValue: number;
  ingredients: IngredientRow[];
}

export interface Service {
  id: string;
  name: string;
  unit: string;
  price: number;
}

export interface EventDish {
  recipeId: string;
  portions: number;
  discount: number;
  overrides: IngredientRow[] | null;
  comment?: string;
}

export interface EventService {
  id: string;
  serviceId: string | null;
  name: string;
  unit: string;
  quantity: number;
  price: number;
}

export interface ClientItem {
  id: string;
  name: string;
  amount: number;
  unit: string;
  note?: string;
}

export interface EventPlan {
  id: string;
  name: string;
  type: EventType;
  date: string;
  guests: number;
  guestsPerTable: number;
  tablesCount: number;
  discount: number;
  dishes: EventDish[];
  services: EventService[];
  clientItems: ClientItem[];
  bought: string[];
  inStock: string[];
  comment?: string;
}

export interface Task {
  id: string;
  title: string;
  eventId: string | null;
  dueDate: string;
  done: boolean;
  createdAt: string;
}

export interface Requisites {
  org: string;
  inn: string;
  address: string;
  phone: string;
  account: string;
}

export interface AppState {
  products: Product[];
  priceLog: PriceLogEntry[];
  categories: CategoryInfo[];
  recipes: Recipe[];
  services: Service[];
  events: EventPlan[];
  tasks: Task[];
  requisites: Requisites;
}

export type Tab = "dashboard" | "events" | "tasks" | "recipes" | "products" | "services" | "requisites";
export type DocKind = "chef" | "shopping" | "invoice";
