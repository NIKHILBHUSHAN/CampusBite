"use client";

import { useEffect, useState } from "react";

type Wallet = { name: string; balance: number };
type Order = {
  id: number;
  status: string;
  total: number;
  pickup_time: string | null;
  items: string[];
};

const STATUS_STYLES: Record<string, string> = {
  placed: "bg-amber-100 text-amber-900",
  preparing: "bg-sky-100 text-sky-900",
  ready: "bg-emerald-100 text-emerald-900",
  collected: "bg-slate-200 text-slate-700",
  cancelled: "bg-rose-100 text-rose-800",
};

export default function WalletOrders({ refreshKey }: { refreshKey: number }) {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    async function load() {
      try {
        const response = await fetch("/api/me", { cache: "no-store", signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Could not load wallet and orders.");
        if (!active) return;
        setWallet(data.wallet);
        setOrders(data.orders);
        setError("");
      } catch (err) {
        if (active && !controller.signal.aborted) {
          setError(err instanceof Error ? err.message : "Could not load wallet and orders.");
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
    <div className="space-y-3">
      <section className="rounded-lg bg-slate-950 p-4 text-white">
        <p className="text-xs font-medium uppercase text-slate-400">Wallet balance</p>
        <div className="mt-2 flex items-end justify-between gap-3">
          <p className="min-w-0 truncate text-sm text-slate-200">{wallet?.name ?? (loading ? "Loading..." : "Student")}</p>
          <p className="shrink-0 text-2xl font-semibold text-emerald-300">
            {wallet ? `Rs ${wallet.balance}` : "--"}
          </p>
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="font-semibold">My orders today</h2>
        </div>
        {error && <p className="px-4 py-3 text-sm text-rose-700">{error}</p>}
        {!error && loading && orders.length === 0 && (
          <p className="px-4 py-3 text-sm text-slate-500">Loading orders...</p>
        )}
        {!error && !loading && orders.length === 0 && (
          <p className="px-4 py-3 text-sm text-slate-500">No orders yet today.</p>
        )}
        <ul className="divide-y divide-slate-100">
          {orders.map((order) => (
            <li key={order.id} className="space-y-2 px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold">Order #{order.id}</span>
                <span
                  className={`rounded px-2 py-0.5 text-xs font-medium ${
                    STATUS_STYLES[order.status] ?? "bg-slate-100 text-slate-700"
                  }`}
                >
                  {order.status}
                </span>
              </div>
              <p className="text-xs text-slate-600">Pickup {order.pickup_time ?? "time unavailable"}</p>
              <p className="text-sm text-slate-700">
                {order.items.length > 0 ? order.items.join(", ") : "Items unavailable"}
              </p>
              <p className="text-sm font-medium">Total: Rs {order.total}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}