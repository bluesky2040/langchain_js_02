import { NextResponse } from "next/server";
import { UniversityFaqBot } from "@/lib/faq_bot_lcel";
import path from "path";

declare global {
  var faqBot: UniversityFaqBot | undefined;
}

export async function POST() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey)
    return NextResponse.json({ error: "OPENAI_API_KEY 없음" }, { status: 500 });

  global.faqBot = new UniversityFaqBot(apiKey);
  const filePath = path.join(process.cwd(), "data", "faq.txt");
  await global.faqBot.ingestDocument(filePath);

  return NextResponse.json({ message: "인덱싱 완료" });
}
