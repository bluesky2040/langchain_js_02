import { promises as fs } from "fs";
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import {
  RunnableSequence,
  RunnableParallel,
  RunnableLambda,             // ✅ RunnablePassthrough 제거
} from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { BaseMessage, HumanMessage, AIMessage } from "@langchain/core/messages";
import { Document } from "@langchain/core/documents";

type ChainInput = { input: string; chat_history: BaseMessage[] };

export class UniversityFaqBot {
  private vectorStore: MemoryVectorStore | null = null;
  private chatHistory: BaseMessage[] = [];
  private llm: ChatOpenAI;
  private embeddings: OpenAIEmbeddings;

  constructor(apiKey: string) {
    this.llm = new ChatOpenAI({ apiKey, model: "gpt-4o-mini", temperature: 0 });
    this.embeddings = new OpenAIEmbeddings({ apiKey, model: "text-embedding-3-small" });
  }

  private splitText(text: string, chunkSize = 1000, chunkOverlap = 200): string[] {
    const chunks: string[] = [];
    let start = 0;
    while (start < text.length) {
      chunks.push(text.slice(start, Math.min(start + chunkSize, text.length)));
      start += chunkSize - chunkOverlap;
    }
    return chunks;
  }

  public async ingestDocument(filePath: string): Promise<void> {
    console.log(`[시스템] 문서를 로딩하고 있습니다: ${filePath}`);
    const content = await fs.readFile(filePath, "utf-8");
    const chunks = this.splitText(content, 1000, 200);
    const splitDocuments = chunks.map((c) => new Document({ pageContent: c }));
    console.log(`[시스템] 문서를 ${splitDocuments.length}개의 청크로 분할 완료.`);
    this.vectorStore = await MemoryVectorStore.fromDocuments(splitDocuments, this.embeddings);
    console.log(`[시스템] 임베딩 변환 및 인메모리 벡터 데이터베이스 색인 완료.\n`);
  }

  public async askQuestion(userQuery: string): Promise<string> {
    if (!this.vectorStore) {
      throw new Error("학습된 벡터 스토어가 존재하지 않습니다. ingestDocument를 먼저 호출하십시오.");
    }

    const retriever = this.vectorStore.asRetriever(3);

    // ── STEP 1: 질문 재구성 체인 ─────────────────────────────
    const rephrasePrompt = ChatPromptTemplate.fromMessages([
      ["system",
        `아래 대화 이력과 후속 질문을 보고, 후속 질문을 벡터 검색에 적합한
독립적인 질문으로 재구성하십시오. 대화 이력이 없으면 원문 그대로 반환하십시오.`],
      new MessagesPlaceholder("chat_history"),
      ["user", "{input}"],
    ]);

    const rephraseChain = rephrasePrompt
      .pipe(this.llm)
      .pipe(new StringOutputParser());

    // ── STEP 2: 답변 생성 체인 ──────────────────────────────
    const answerPrompt = ChatPromptTemplate.fromMessages([
      ["system",
        `당신은 대학교 학사 행정 및 규정을 안내하는 전문적이고 친절한 FAQ 어시스턴트입니다.
반드시 아래 제공된 문맥(Context) 정보만을 사용하여 사용자의 질문에 답변하십시오.
만약 제공된 문맥에서 답변의 근거를 찾을 수 없다면, 무리하게 추론하지 말고
"해당 정보는 학습된 학사 문서에서 찾을 수 없습니다."라고 명확하게 선언하십시오.

문맥: {context}`],
      new MessagesPlaceholder("chat_history"),
      ["user", "{input}"],
    ]);

    const answerChain = answerPrompt
      .pipe(this.llm)
      .pipe(new StringOutputParser());

    // ── STEP 3: 전체 RAG 파이프라인 ─────────────────────────
    const ragChain = RunnableSequence.from([

      // 1단계: 질문 재구성 + 원본 입력 병렬 보존
      RunnableParallel.from({
        rephrased:    rephraseChain,
        input:        RunnableLambda.from((x: ChainInput) => x.input),
        chat_history: RunnableLambda.from((x: ChainInput) => x.chat_history),
      }),

      // 2단계: 재구성된 질문으로 문서 검색 → 포맷
      RunnableParallel.from({
        context: RunnableLambda.from((x: any) => x.rephrased)
          .pipe(retriever)
          .pipe(RunnableLambda.from(                         // ✅ 익명함수로 this 바인딩 안전
            (docs: Document[]) => docs.map(d => d.pageContent).join("\n\n")
          )),
        input:        RunnableLambda.from((x: any) => x.input),
        chat_history: RunnableLambda.from((x: any) => x.chat_history),
      }),

      // 3단계: 최종 답변 생성
      answerChain,
    ]);

    console.log(`\n[사용자] ${userQuery}`);

    const answer = await ragChain.invoke({
      input: userQuery,
      chat_history: this.chatHistory,
    });

    this.chatHistory.push(new HumanMessage(userQuery));
    this.chatHistory.push(new AIMessage(answer));

    return answer;
  }
}
