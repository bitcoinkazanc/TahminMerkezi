import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "TahminMerkezi API çalışıyor",
    time: new Date().toISOString(),
  });
}