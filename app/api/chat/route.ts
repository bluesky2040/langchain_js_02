import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  if (!global.faqBot)
    return NextResponse.json({ error: "먼저 문서를 로드하세요." }, { status: 400 });

  const { question } = await req.json();
  const answer = await global.faqBot.askQuestion(question);
  return NextResponse.json({ answer });
}
