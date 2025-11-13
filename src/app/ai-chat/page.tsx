"use client";
import React from "react";

function getDefaultUser() {
  // For dev, fallback to a test user
  return { id: "dev-user-1", name: "Test User" };
}

export default function AIChatPage() {
  const [messages, setMessages] = React.useState([
    { role: "assistant", content: "Hi! I’m your UniLink ride assistant. How can I help you today?" }
  ]);
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const user = getDefaultUser();

  async function sendMessage(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!input.trim()) return;
    setLoading(true);
    setError(null);
    setMessages(msgs => [...msgs, { role: "user", content: input }]);
    try {
      const res = await fetch("/api/ai/ride-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input, userId: user.id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unknown error");
      setMessages(msgs => [...msgs, { role: "assistant", content: data.reply }]);
      setInput("");
    } catch (err: any) {
      setError(err.message || "Failed to send message");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 500, margin: "40px auto", padding: 16, border: "1px solid #eee", borderRadius: 8, background: "#fafcff" }}>
      <h2 style={{ marginBottom: 16 }}>AI Ride Assistant</h2>
      <div style={{ minHeight: 200, marginBottom: 16 }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ marginBottom: 12, textAlign: msg.role === "user" ? "right" : "left" }}>
            <span style={{
              display: "inline-block",
              background: msg.role === "user" ? "#e0f7fa" : "#e8eaf6",
              color: "#333",
              padding: "8px 12px",
              borderRadius: 6,
              maxWidth: "80%"
            }}>{msg.content}</span>
          </div>
        ))}
        {loading && <div style={{ color: "#888" }}>Assistant is typing…</div>}
      </div>
      <form onSubmit={sendMessage} style={{ display: "flex", gap: 8 }}>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask for a ride…"
          style={{ flex: 1, padding: 8, borderRadius: 6, border: "1px solid #ccc" }}
          disabled={loading}
        />
        <button type="submit" disabled={loading || !input.trim()} style={{ padding: "8px 16px", borderRadius: 6, background: "#1976d2", color: "#fff", border: "none" }}>
          Send
        </button>
      </form>
      {error && <div style={{ color: "#d32f2f", marginTop: 12 }}>{error}</div>}
    </div>
  );
}
