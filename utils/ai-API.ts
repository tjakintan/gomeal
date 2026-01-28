export async function notifyMLBackend() {
  const response = await fetch("http://localhost:8000/ai/recommend", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_sub: "test_user" }), // placeholder
  });

  if (!response.ok) {
    throw new Error(`ML backend error: ${response.status}`);
  }

  const data = await response.json();
  return data;
}
