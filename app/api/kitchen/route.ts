import { NextResponse } from "next/server";
import { z } from "zod";
import { formatSlot } from "@/lib/campusbite";
import { getSupabase } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const statusUpdateSchema = z.object({
  order_id: z.number().int().positive(),
  status: z.enum(["placed", "preparing", "ready", "collected", "cancelled"]),
});

const nextStatus: Record<string, string> = {
  placed: "preparing",
  preparing: "ready",
  ready: "collected",
};

function firstRelation<T>(relation: T | T[] | null): T | null {
  return Array.isArray(relation) ? relation[0] ?? null : relation;
}

export async function GET() {
  const { data, error } = await getSupabase()
    .from("orders")
    .select("id, status, total, created_at, wallets(name), pickup_slots(slot_time), order_items(quantity, price, menu_items(name))")
    .in("status", ["placed", "preparing", "ready"])
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[GET /api/kitchen]", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const orders = data.map((order) => {
    const student = firstRelation(order.wallets);
    const pickupSlot = firstRelation(order.pickup_slots);
    const items = order.order_items.map((item) => ({
      name: firstRelation(item.menu_items)?.name ?? "Unknown item",
      quantity: item.quantity,
      price: item.price,
    }));

    return {
      id: order.id,
      status: order.status,
      total: order.total,
      created_at: order.created_at,
      student_name: student?.name ?? "Unknown student",
      pickup_time: pickupSlot?.slot_time ? formatSlot(pickupSlot.slot_time) : null,
      items,
    };
  });

  return NextResponse.json({ orders });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = statusUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid status update", details: parsed.error.issues }, { status: 400 });
  }

  const { data: order, error: lookupError } = await getSupabase()
    .from("orders")
    .select("id, status")
    .eq("id", parsed.data.order_id)
    .maybeSingle();

  if (lookupError) {
    console.error("[POST /api/kitchen lookup]", lookupError.message);
    return NextResponse.json({ error: lookupError.message }, { status: 500 });
  }
  if (!order) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }
  if (nextStatus[order.status] !== parsed.data.status) {
    return NextResponse.json({ error: `Cannot change order status from ${order.status} to ${parsed.data.status}.` }, { status: 409 });
  }

  const { data, error } = await getSupabase()
    .from("orders")
    .update({ status: parsed.data.status })
    .eq("id", order.id)
    .eq("status", order.status)
    .select("id, status")
    .maybeSingle();

  if (error) {
    console.error("[POST /api/kitchen update]", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Order status changed concurrently. Refresh and try again." }, { status: 409 });
  }

  return NextResponse.json({ order: data });
}
