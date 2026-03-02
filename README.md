# langchain_js_02
langchain.js 를 활용한 간단한 F&amp;Q 챗봇

# LangChain JS 02 챗봇 구현

## 개요
- 대상: 간단한 LangChain.js 활용 챗봇 구현(프론트엔드 + RAG 기반 QA 시스템).
- 목적: Next.js 앱과 LangChain 기반 RAG 파이프라인을 이해하고 직접 실행/변경할 수 있도록 안내.

## 준비 및 실행
- 요구사항: Node.js 18+, npm/yarn, OpenAI API 키

설치 및 실행:
```bash
# 프로젝트 루트에서
npm install
npm run dev
```
- 브라우저 열기: http://localhost:3000
- OpenAI 키: `OPENAI_API_KEY` 환경 변수로 설정

## 프로젝트 구조 (주요 파일)
- 앱 엔트리: [app/page.tsx](langchain_js_02/app/page.tsx)
- 레이아웃: [app/layout.tsx](langchain_js_02/app/layout.tsx)
- 문서 인제스트 API: [app/api/ingest/route.ts](langchain_js_02/app/api/ingest/route.ts)
- 벡터/QA 로직: [lib/faq_bot_lcel.ts](langchain_js_02/lib/faq_bot_lcel.ts)
- 데이터(예제 FAQ): [data/faq.txt](langchain_js_02/data/faq.txt)
- 설정: [package.json](langchain_js_02/package.json), [next.config.ts](langchain_js_02/next.config.ts)

## 작동 흐름 (요약)
1. 사용자가 페이지에서 "문서 로드(📄 문서 로드)" 버튼을 클릭하면 `/api/ingest`로 POST 요청.
   - 엔드포인트: [app/api/ingest/route.ts](langchain_js_02/app/api/ingest/route.ts)
   - 내부에서 `UniversityFaqBot` 인스턴스를 생성하고 `data/faq.txt` 파일을 읽어 인덱싱함.
2. 인덱싱이 완료되면 프론트엔드가 질문을 받아 `/api/chat`(프로젝트에선 클라이언트가 POST /api/chat)로 전송.
3. 서버(또는 전역 인스턴스)의 `UniversityFaqBot.askQuestion`이 검색(retriever)으로 관련 청크를 찾아 RAG 파이프라인으로 답변 생성.
4. 생성된 답변을 프론트엔드에 반환하고 채팅 UI에 출력.

---

## 폴더 구조
프로젝트의 주요 파일/폴더 구조는 아래와 같습니다. 강의자료나 과제 제출 안내 시 이 구조를 참고하세요.

```
langchain_js_02/
├─ app/
│  ├─ page.tsx
│  ├─ layout.tsx
│  ├─ globals.css
│  ├─ page.module.css
│  └─ api/
│     └─ ingest/
│        └─ route.ts
├─ data/
│  └─ faq.txt (수강 F&Q 파일)
├─ lib/
│  └─ faq_bot_lcel.ts (LangChain.js 활용한 RAG)
```



## 코드 핵심 포인트
### `UniversityFaqBot` ([lib/faq_bot_lcel.ts](langchain_js_02/lib/faq_bot_lcel.ts))
- LLM: `ChatOpenAI` (model: `gpt-4o-mini`, temperature: 0)
- 임베딩: `OpenAIEmbeddings` (model: `text-embedding-3-small`)
- 벡터 저장소: `MemoryVectorStore` (문서를 청크로 나누어 인메모리 인덱싱)
- RAG 구성:
  - 질문 재구성(rephrase) 체인: 이전 대화 히스토리를 참고하여 벡터 검색에 적합한 독립 질문 생성
  - 검색(retriever)을 통해 관련 문맥을 조합
  - 최종 답변 생성 체인: 제공된 문맥만 사용하여 답변, 근거 없으면 명시적으로 불가 선언
- 주요 패턴: `RunnableSequence`, `RunnableParallel`, `RunnableLambda`를 사용해 안전한 this 바인딩 및 병렬/시퀀스 처리

### 프론트엔드 ([app/page.tsx](langchain_js_02/app/page.tsx))
- 버튼 `문서 로드` → `/api/ingest` 호출 (인덱싱 수행)
- 질문 전송 → `/api/chat` 호출 (질문 전달 및 답변 수신)
- 간단한 상태관리: `ready`, `busy`, `msgs`로 진행상태/메시지 표시
