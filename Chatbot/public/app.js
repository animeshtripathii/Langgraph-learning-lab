const form = document.querySelector("#chat-form");
const prompt = document.querySelector("#prompt");
const messagesElement = document.querySelector("#messages");
const history = [];

function addMessage(role, content) {
  const article = document.createElement("article");
  article.className = `message ${role}`;
  article.innerHTML = `<span class="avatar">${role === "user" ? "YOU" : "AI"}</span><div><small>${role === "user" ? "You" : "LangGraph assistant"}</small><p></p></div>`;
  article.querySelector("p").textContent = content;
  messagesElement.append(article);
  messagesElement.scrollTop = messagesElement.scrollHeight;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const content = prompt.value.trim();
  if (!content) return;
  prompt.value = "";
  history.push({ role: "user", content });
  addMessage("user", content);
  const button = form.querySelector("button");
  button.disabled = true;
  button.textContent = "...";

  try {
    const result = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: history, threadId: "web-user-1" }),
    });
    const data = await result.json();
    if (!result.ok) throw new Error(data.error || "Request failed");
    addMessage("assistant", data.message);
    history.push({ role: "assistant", content: data.message });
  } catch (error) {
    addMessage("assistant", `Error: ${error.message}`);
    history.pop();
  } finally {
    button.disabled = false;
    button.innerHTML = "Send <span>↗</span>";
    prompt.focus();
  }
});

prompt.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    form.requestSubmit();
  }
});
