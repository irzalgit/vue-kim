export default function Dashboard() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0a0a0a",
        color: "#fff",
        padding: "40px",
      }}
    >
      <h1>Vue-Kim Dashboard</h1>

      <p>Fullstack Agentic AI Platform</p>

      <hr />

      <h2>Status</h2>

      <ul>
        <li>✅ React</li>
        <li>✅ Vite</li>
        <li>✅ Agent Engine</li>
        <li>⚠ Gemini Quota</li>
      </ul>
    </div>
  );
}
