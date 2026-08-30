const form = document.querySelector("#chat-form");
const prompt = document.querySelector("#prompt");
const messagesElement = document.querySelector("#messages");
const history = [];

function scrollMessagesToBottom() {
  messagesElement.scrollTop = messagesElement.scrollHeight;
}

function addMessage(role, content = "") {
  const article = document.createElement("article");
  article.className = `message ${role}`;
  article.innerHTML = `<span class="avatar">${role === "user" ? "YOU" : "AI"}</span><div><small>${role === "user" ? "You" : "LangGraph assistant"}</small><p></p></div>`;
  const paragraph = article.querySelector("p");
  paragraph.textContent = content;
  messagesElement.append(article);
  scrollMessagesToBottom();
  return paragraph;
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

    if (!result.ok) {
      const errorText = await result.text();
      throw new Error(errorText || "Request failed");
    }

    const reader = result.body.getReader();
    const decoder = new TextDecoder();
    const assistantParagraph = addMessage("assistant");
    let assistantMessage = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      assistantMessage += chunk;
      assistantParagraph.textContent = assistantMessage;
      scrollMessagesToBottom();
    }

    history.push({ role: "assistant", content: assistantMessage });
  } catch (error) {
    const errorParagraph = addMessage("assistant", `Error: ${error.message}`);
    if (history[history.length - 1]?.role === "assistant") {
      history.pop();
    }
    errorParagraph.scrollIntoView({ behavior: "instant", block: "end" });
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
