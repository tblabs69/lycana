import { NextResponse } from "next/server";
import { logGameCost, resetTokenStats, getTokenStats } from "@/lib/llm";

export async function GET() {
  const cost = logGameCost();
  return NextResponse.json(cost);
}

export async function DELETE() {
  resetTokenStats();
  return NextResponse.json({ reset: true });
}

export async function POST() {
  const stats = getTokenStats();
  return NextResponse.json(stats);
}
