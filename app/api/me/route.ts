import { NextResponse } from "next/server";
import { CURRENT_STUDENT_ID, formatSlot } from "@/lib/campusbite";
import { getSupabase } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function firstRelation<T>(relation: T | T[] | null): T | null {
  return Array.isArray(relation) ? relation[0] ?? null : relation;
}

export async function GET() {
  const { data: wallet, error: walletError } = await getSupabase()
    .from("wallets")
    .select("name, balance")
    .eq("student_id", CURRENT_STUDENT_ID)
    .maybeSingle();

  if (walletError) {
    console.error("[GET /api/me wallet]", walletError.message);
    return NextResponse.json({ error: walletError.message }, { status: 500 });
  }
  if (!wallet) {
    return NextResponse.json({ error: "Wallet not found." }, { status: 404 });
  }

  const { data, error } = await getSupabase()
    .from("orders")
    .select("id, status, total, created_at, pickup_slots(slot_time), order_items(quantity, menu_items(name))")
    .eq("student_id", CURRENT_STUDENT_ID)
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) {
    console.error("[GET /api/me orders]", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const orders = data.map((order) => {
    const pickupSlot = firstRelation(order.pickup_slots);
    const items = order.order_items
      .map((item) => firstRelation(item.menu_items)?.name)
      .filter((name): name is string => Boolean(name));

    return {
      id: order.id,
      status: order.status,
      total: order.total,
      created_at: order.created_at,
      pickup_time: pickupSlot?.slot_time ? formatSlot(pickupSlot.slot_time) : null,
      items,
    };
  });

  return NextResponse.json({ wallet, orders });
}
