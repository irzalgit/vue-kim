export default function Agent() {
  return (
    <section
      id="agent"
      style={{
        padding: "100px 24px",
        background: "#0f172a",
        color: "#fff",
      }}
    >
      <div
        style={{
          maxWidth: "900px",
          margin: "0 auto",
        }}
      >
        <h2
          style={{
            fontSize: "42px",
            marginBottom: "16px",
          }}
        >
          AI Agent
        </h2>

        <p
          style={{
            color: "#94a3b8",
            marginBottom: "32px",
          }}
        >
          Welcome to KIM AI Agent. This assistant will help build applications,
          answer questions, and execute intelligent workflows.
        </p>

        <div
          style={{
            background: "#111827",
            padding: "24px",
            borderRadius: "16px",
          }}
        >
          <input
            placeholder="Ask anything..."
            style={{
              width: "100%",
              padding: "16px",
              borderRadius: "12px",
              border: "none",
              marginBottom: "16px",
            }}
          />

          <button
            style={{
              padding: "14px 28px",
              borderRadius: "12px",
              cursor: "pointer",
            }}
          >
            Send
          </button>
        </div>
      </div>
    </section>
  );
}
