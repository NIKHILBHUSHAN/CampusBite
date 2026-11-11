"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type KitchenStatus = "placed" | "preparing" | "ready";
type KitchenOrder = {
  id: number;
  status: KitchenStatus;
  total: number;
  student_name: string;
  pickup_time: string | null;
  items: { name: string; quantity: number; price: number }[];
};

const LANES: { status: KitchenStatus; title: string; action: string; next: string }[] = [
  { status: "placed", title: "New orders", action: "Start preparing", next: "preparing" },
  { status: "preparing", title: "Preparing", action: "Mark ready", next: "ready" },
  { status: "ready", title: "Ready for pickup", action: "Collected", next: "collected" },
];

export default function KitchenPage() {
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [pendingId, setPendingId] = useState<number | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    async function loadOrders() {
      try {
        const response = await fetch("/api/kitchen", {
          cache: "no-store",
          signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Could not load kitchen orders.");
        if (!active) return;
        setOrders(data.orders);
        setError("");
      } catch (err) {
        if (active && !controller.signal.aborted) {
          setError(err instanceof Error ? err.message : "Could not load kitchen orders.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadOrders();
    const interval = window.setInterval(loadOrders, 3000);
    return () => {
      active = false;
      controller.abort();
      window.clearInterval(interval);
    };
  }, []);

  async function advanceOrder(orderId: number, status: string) {
    setPendingId(orderId);
    setActionError("");

    try {
      const response = await fetch("/api/kitchen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: orderId, status }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not update order status.");

      setOrders((current) => current.filter((order) => order.id !== orderId));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not update order status.");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-5 text-zinc-100 md:px-8 md:py-7">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.65)]" />
              <span className="text-xs font-semibold uppercase text-emerald-300">Live</span>
            </div>
            <h1 className="text-2xl font-semibold">Kitchen orders</h1>
            <p className="mt-1 text-sm text-zinc-400">CampusBite · SRM canteen</p>
          </div>
          <Link href="/" className="text-sm font-medium text-zinc-300 hover:text-white">
            Student ordering
          </Link>
        </header>

        {error && <p className="mb-4 rounded-md border border-rose-400/30 bg-rose-950/60 px-4 py-3 text-sm text-rose-200">{error}</p>}
        {actionError && (
          <p className="mb-4 rounded-md border border-rose-400/30 bg-rose-950/60 px-4 py-3 text-sm text-rose-200">
            {actionError}
          </p>
        )}

        <div className="grid items-start gap-4 md:grid-cols-3">
          {LANES.map((lane) => {
            const laneOrders = orders.filter((order) => order.status === lane.status);

            return (
              <section key={lane.status} className="min-h-56 rounded-lg border border-white/10 bg-white/[0.035]">
                <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                  <h2 className="font-semibold">{lane.title}</h2>
                  <span className="rounded bg-white/10 px-2 py-0.5 text-xs text-zinc-300">{laneOrders.length}</span>
                </header>
                <div className="space-y-3 p-3">
                  {laneOrders.map((order) => (
                    <article key={order.id} className="rounded-md border border-white/10 bg-zinc-900 p-4 shadow-lg shadow-black/10">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="font-semibold">Order #{order.id}</h3>
                        <span className="text-sm font-medium text-emerald-300">
                          {order.pickup_time ?? "Pickup time unavailable"}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-zinc-300">{order.student_name}</p>
                      <ul className="mt-3 space-y-1 text-sm text-zinc-400">
                        {order.items.map((item, index) => (
                          <li key={`${order.id}-${item.name}-${index}`}>
                            {item.quantity} × {item.name}
                          </li>
                        ))}
                      </ul>
                      <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3">
                        <span className="text-xs uppercase text-zinc-500">Order total</span>
                        <span className="font-semibold">Rs {order.total}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => advanceOrder(order.id, lane.next)}
                        disabled={pendingId !== null}
                        className="mt-4 w-full rounded-md bg-emerald-500 px-3 py-2 text-sm font-semibold text-zinc-950 hover:bg-emerald-400 disabled:cursor-wait disabled:opacity-50"
                      >
                        {pendingId === order.id ? "Updating..." : lane.action}
                      </button>
                    </article>
                  ))}
                  {!loading && laneOrders.length === 0 && (
                    <p className="px-2 py-5 text-center text-sm text-zinc-500">No orders</p>
                  )}
                  {loading && laneOrders.length === 0 && (
                    <p className="px-2 py-5 text-center text-sm text-zinc-500">Loading orders...</p>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </main>
  );
}
