"use client";
import { useState, useRef, useEffect } from "react";

type Msg = { role: "user" | "bot"; text: string };

export default function Page() {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => { bottom.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  const ingest = async () => {
    setBusy(true);
    const res = await fetch("/api/ingest", { method: "POST" });
    const data = await res.json();
    if (res.ok) {
      setReady(true);
      setMsgs([{ role: "bot", text: "✅ 문서 로딩 완료! 질문을 입력하세요." }]);
    } else {
      alert(data.error);
    }
    setBusy(false);
  };

  const send = async () => {
    if (!input.trim() || !ready || busy) return;
    const q = input.trim();
    setMsgs(m => [...m, { role: "user", text: q }]);
    setInput("");
    setBusy(true);
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: q }),
    });
    const data = await res.json();
    setMsgs(m => [...m, { role: "bot", text: res.ok ? data.answer : `❌ ${data.error}` }]);
    setBusy(false);
  };

  return (
    <div style={{ maxWidth: 700, margin: "40px auto", fontFamily: "sans-serif" }}>
      {/* 헤더 */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
        background:"#1565c0", color:"#fff", padding:"16px 20px", borderRadius:"12px 12px 0 0" }}>
        <b style={{ fontSize: 18 }}>🎓 FAQ 봇</b>
        <button onClick={ingest} disabled={busy || ready}
          style={{ background: ready ? "#43a047" : "#fff", color: ready ? "#fff" : "#1565c0",
            border:"none", borderRadius: 8, padding:"8px 14px", fontWeight:"bold",
            cursor: ready ? "default" : "pointer" }}>
          {busy && !ready ? "로딩 중..." : ready ? "✅ 로드 완료" : "📄 문서 로드"}
        </button>
      </div>

      {/* 메시지창 */}
      <div style={{ height: 460, overflowY:"auto", padding: 20, background:"#f4f6f8",
        display:"flex", flexDirection:"column", gap: 10 }}>
        {msgs.length === 0 && (
          <p style={{ color:"#aaa", textAlign:"center", marginTop: 80 }}>
            <b>문서 로드</b> 버튼을 눌러 FAQ 봇을 초기화하세요.
          </p>
        )}
        {msgs.map((m, i) => (
          <div key={i} style={{
            alignSelf: m.role === "user" ? "flex-end" : "flex-start",
            background: m.role === "user" ? "#1565c0" : "#fff",
            color: m.role === "user" ? "#fff" : "#333",
            padding:"10px 16px", borderRadius: 14, maxWidth:"75%",
            boxShadow:"0 1px 4px rgba(0,0,0,0.1)", whiteSpace:"pre-wrap",
          }}>
            {m.text}
          </div>
        ))}
        {busy && ready && (
          <div style={{ alignSelf:"flex-start", color:"#999", padding:"10px 16px" }}>
            ✏️ 답변 생성 중...
          </div>
        )}
        <div ref={bottom} />
      </div>

      {/* 입력창 */}
      <div style={{ display:"flex", gap: 8, padding:"12px 16px",
        background:"#fff", borderRadius:"0 0 12px 12px", boxShadow:"0 2px 8px rgba(0,0,0,0.1)" }}>
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && send()}
          disabled={!ready || busy}
          placeholder={ready ? "질문을 입력하세요..." : "먼저 문서를 로드하세요"}
          style={{ flex:1, padding:"10px 14px", borderRadius: 8,
            border:"1px solid #ddd", fontSize: 15, outline:"none" }}
        />
        <button onClick={send} disabled={!ready || busy || !input.trim()}
          style={{ background:"#1565c0", color:"#fff", border:"none",
            borderRadius: 8, padding:"10px 18px", fontWeight:"bold", cursor:"pointer" }}>
          전송
        </button>
      </div>
    </div>
  );
}
