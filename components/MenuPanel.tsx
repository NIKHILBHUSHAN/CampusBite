"use client";

import { useEffect, useState } from "react";

type MenuCategory = "meal" | "snack" | "sweet" | "drink";
type MenuItem = {
  id: number;
  name: string;
  category: MenuCategory;
  price: number;
  is_veg: boolean;
  stock: number;
};

const MENU_GROUPS: { category: MenuCategory; title: string }[] = [
  { category: "meal", title: "Meals" },
  { category: "snack", title: "Snacks" },
  { category: "sweet", title: "Sweets" },
  { category: "drink", title: "Drinks" },
];

export default function MenuPanel({ refreshKey }: { refreshKey: number }) {
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    async function load() {
      try {
        const response = await fetch("/api/menu", { cache: "no-store", signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Could not load the menu.");
        if (!active) return;
        setMenu(data.menu);
        setError("");
      } catch (err) {
        if (active && !controller.signal.aborted) {
          setError(err instanceof Error ? err.message : "Could not load the menu.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    const interval = window.setInterval(load, 5000);
    return () => {
      active = false;
      controller.abort();
      window.clearInterval(interval);
    };
  }, [refreshKey]);

  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-4 py-3">
        <h2 className="font-semibold">Today's menu</h2>
      </div>
      {error && <p className="px-4 py-3 text-sm text-rose-700">{error}</p>}
      {!error && loading && menu.length === 0 && (
        <p className="px-4 py-3 text-sm text-slate-500">Loading menu...</p>
      )}
      {!error && !loading && menu.length === 0 && (
        <p className="px-4 py-3 text-sm text-slate-500">No menu items found.</p>
      )}
      <div className="divide-y divide-slate-100">
        {MENU_GROUPS.map(({ category, title }) => {
          const items = menu.filter((item) => item.category === category);
          if (items.length === 0) return null;

          return (
            <section key={category} className="px-4 py-3">
              <h3 className="mb-2 text-xs font-semibold uppercase text-slate-500">{title}</h3>
              <ul className="space-y-2">
                {items.map((item) => (
                  <li key={item.id} className="flex items-start justify-between gap-2 text-sm">
                    <div className="flex min-w-0 items-start gap-2">
                      <span
                        aria-label={item.is_veg ? "Vegetarian" : "Non-vegetarian"}
                        title={item.is_veg ? "Vegetarian" : "Non-vegetarian"}
                        className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                          item.is_veg ? "bg-emerald-600" : "bg-rose-600"
                        }`}
                      />
                      <span className="min-w-0 break-words">{item.name}</span>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className="font-medium">Rs {item.price}</span>
                      {item.stock === 0 ? (
                        <span className="rounded bg-rose-100 px-1.5 py-0.5 text-xs text-rose-800">Sold out</span>
                      ) : item.stock <= 3 ? (
                        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-900">
                          Only {item.stock} left
                        </span>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </section>
  );
}