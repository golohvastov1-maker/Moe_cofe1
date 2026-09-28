import { useState } from "react";
import type { DocKind, EventPlan } from "../types";
import { useStore } from "../store";
import { IcPrinter, IcX } from "./Icons";

export function RecipesPricePreview({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state } = useStore();
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  
  if (!open) return null;
  
  const defaultCategories = state.categories
    .filter((c) => c.isDefault && c.name !== "Поминки")
    .map((c) => c.name);
  
  const handlePrint = () => {
    // В реальном приложении здесь будет генерация PDF
    alert("Печать прайс-листа для категорий: " + (selectedCategories.length > 0 ? selectedCategories.join(", ") : defaultCategories.join(", ")));
    onClose();
  };
  
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
              <button
                key={cat.id}
                onClick={() => {
                  setSelectedCategories((prev) =>
                    prev.includes(cat.name) ? prev.filter((c) => c !== cat.name) : [...prev, cat.name]
                  );
                }}
                className={`tap flex items-center gap-3 rounded-[12px] border p-3 text-left transition-all ${
                  isSelected
                    ? "border-saffron/60 bg-saffron/10"
                    : "border-line bg-pine-800 hover:border-sage/40"
                }`}
              >
                <div
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-[6px] border-2 transition-all ${
                    isSelected ? "border-saffron bg-saffron" : "border-sage/40"
                  }`}
                >
                  {isSelected && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m5 12.5 4.5 4.5L19 7.5" />
                    </svg>
                  )}
                </div>
                <div className="min-w-0 grow">
                  <p className={`text-[13px] font-semibold ${isSelected ? "text-saffron" : "text-cream"}`}>
                    {cat.name}
                  </p>
                  <p className="text-[11px] text-sage">
                    {recipesCount} {recipesCount === 1 ? "блюдо" : recipesCount < 5 ? "блюда" : "блюд"}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="tap rounded-[12px] border border-line px-5 py-2.5 font-display text-[13px] font-bold text-sage transition-colors hover:border-pine-400 hover:text-cream"
          >
            Отмена
          </button>
          <button
            onClick={handlePrint}
            className="tap flex items-center gap-2 rounded-[12px] bg-saffron px-5 py-2.5 font-display text-[13px] font-bold text-pine-950 transition-opacity hover:brightness-110"
          >
            <IcPrinter size={16} /> Печать / PDF
          </button>
        </div>
      </div>
    </div>
  );
}

export function EventDocPreview({ kind, event, onClose }: { kind: DocKind; event: EventPlan; onClose: () => void }) {
  if (!event) return null;
  
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#04100c]/97 backdrop-blur-md">
      <div className="w-full max-w-[800px] rounded-[16px] border border-line bg-pine-900 p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-[20px] text-cream">
            {kind === "chef" ? "Задание для поваров" : kind === "shopping" ? "Список закупок" : "Счёт для клиента"}
          </h2>
          <button onClick={onClose} className="tap grid h-9 w-9 place-items-center rounded-full border border-line text-sage hover:text-cream">
            <IcX size={16} />
          </button>
        </div>
        <div className="mb-4 text-[13px] text-sage">
          <p>Мероприятие: {event.name}</p>
          <p>Дата: {event.date}</p>
          <p>Гостей: {event.guests}</p>
        </div>
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="tap rounded-[12px] border border-line px-5 py-2.5 font-display text-[13px] font-bold text-sage transition-colors hover:border-pine-400 hover:text-cream"
          >
            Закрыть
          </button>
          <button
            onClick={() => {
              alert("Экспорт в Excel для: " + event.name);
              onClose();
            }}
            className="tap flex items-center gap-2 rounded-[12px] border border-line bg-pine-800 px-3.5 py-2.5 text-[12px] font-semibold text-sage transition-all hover:border-mint/50 hover:text-mint hover:bg-pine-800"
          >
            Сохранить в Excel
          </button>
          <button
            onClick={() => {
              alert("Печать/сохранение в PDF для: " + event.name);
              onClose();
            }}
            className="tap flex items-center gap-2 rounded-[11px] bg-saffron px-3.5 py-2 font-display text-[11.5px] font-bold text-pine-950 hover:brightness-110"
          >
            <IcPrinter size={15} /> Сохранить в PDF
          </button>
        </div>
      </div>
    </div>
  );
}

export function MultiShoppingPreview({ events, onClose }: { events: EventPlan[]; onClose: () => void }) {
  if (!events || events.length === 0) return null;
  
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#04100c]/97 backdrop-blur-md">
      <div className="w-full max-w-[800px] rounded-[16px] border border-line bg-pine-900 p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-[20px] text-cream">Общий список закупок</h2>
          <button onClick={onClose} className="tap grid h-9 w-9 place-items-center rounded-full border border-line text-sage hover:text-cream">
            <IcX size={16} />
          </button>
        </div>
        <div className="mb-4 text-[13px] text-sage">
          <p>Мероприятий: {events.length}</p>
          <p>Общее количество гостей: {events.reduce((sum, e) => sum + e.guests, 0)}</p>
        </div>
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="tap rounded-[12px] border border-line px-5 py-2.5 font-display text-[13px] font-bold text-sage transition-colors hover:border-pine-400 hover:text-cream"
          >
            Закрыть
          </button>
          <button
            onClick={() => {
              alert("Экспорт в Excel для общего списка закупок");
              onClose();
            }}
            className="tap flex items-center gap-2 rounded-[12px] border border-line bg-pine-800 px-3.5 py-2.5 text-[12px] font-semibold text-sage transition-all hover:border-mint/50 hover:text-mint hover:bg-pine-800"
          >
            Сохранить в Excel
          </button>
          <button
            onClick={() => {
              alert("Печать/сохранение в PDF для общего списка закупок");
              onClose();
            }}
            className="tap flex items-center gap-2 rounded-[11px] bg-saffron px-3.5 py-2 font-display text-[11.5px] font-bold text-pine-950 hover:brightness-110"
          >
            <IcPrinter size={15} /> Сохранить в PDF
          </button>
        </div>
      </div>
    </div>
  );
}
