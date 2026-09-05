const form = document.querySelector("#chat-form");
const prompt = document.querySelector("#prompt");
const messagesElement = document.querySelector("#messages");
const conversationList = document.querySelector("#conversation-list");
const conversationTitle = document.querySelector("#conversation-title");
const newChatButton = document.querySelector("#new-chat");

let activeConversationId = crypto.randomUUID();
let activeTitle = "New conversation";
let history = [];

function scrollMessagesToBottom() {
  messagesElement.scrollTop = messagesElement.scrollHeight;
}

async function responseError(response, fallback) {
  try {
    const data = await response.json();
    return data.error || fallback;
  } catch {
    return fallback;
  }
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

function resetChat() {
  activeConversationId = crypto.randomUUID();
  activeTitle = "New conversation";
  history = [];
  conversationTitle.textContent = activeTitle;
  messagesElement.innerHTML = "";
  addMessage("assistant", "Hello. Ask me anything to start a new conversation.");
  prompt.focus();
}

function formatDate(dateValue) {
  const date = new Date(dateValue);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return "Today";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function renderConversationList(conversations) {
  conversationList.innerHTML = "";
  if (!conversations.length) {
    conversationList.innerHTML = '<p class="empty-history">Your conversations will appear here.</p>';
    return;
  }

  let lastDate = "";
  conversations.forEach((conversation) => {
    const dateLabel = formatDate(conversation.updated_at);
    if (dateLabel !== lastDate) {
      const heading = document.createElement("p");
      heading.className = "date-heading";
      heading.textContent = dateLabel;
      conversationList.append(heading);
      lastDate = dateLabel;
    }

    const button = document.createElement("button");
    button.className = `conversation-item${conversation.id === activeConversationId ? " active" : ""}`;
    button.type = "button";
    button.textContent = conversation.title;
    button.addEventListener("click", () => loadConversation(conversation.id));
    conversationList.append(button);
  });
}

async function loadConversations() {
  const result = await fetch("/api/conversations");
  if (!result.ok) throw new Error(await responseError(result, "Could not load conversation history."));
  const data = await result.json();
  renderConversationList(data.conversations || []);
}

async function loadConversation(id) {
  const result = await fetch(`/api/conversation?id=${encodeURIComponent(id)}`);
  if (!result.ok) throw new Error(await responseError(result, "Could not open that conversation."));
  const { conversation } = await result.json();
  activeConversationId = conversation.id;
  activeTitle = conversation.title;
  history = conversation.messages.map(({ role, content }) => ({ role, content }));
  conversationTitle.textContent = activeTitle;
  messagesElement.innerHTML = "";
  history.forEach((message) => addMessage(message.role, message.content));
  await loadConversations();
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const content = prompt.value.trim();
  if (!content) return;
  prompt.value = "";
  history.push({ role: "user", content });
  addMessage("user", content);

  if (activeTitle === "New conversation") {
    activeTitle = content.slice(0, 80);
    conversationTitle.textContent = activeTitle;
  }

  const button = form.querySelector("button");
  button.disabled = true;
  button.textContent = "...";

  try {
    const result = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId: activeConversationId, title: activeTitle, messages: history }),
    });
    if (!result.ok) throw new Error(await responseError(result, "Request failed"));

    const reader = result.body.getReader();
    const decoder = new TextDecoder();
    const assistantParagraph = addMessage("assistant");
    let assistantMessage = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      assistantMessage += decoder.decode(value, { stream: true });
      assistantParagraph.textContent = assistantMessage;
      scrollMessagesToBottom();
    }
    assistantMessage += decoder.decode();
    assistantParagraph.textContent = assistantMessage;
    history.push({ role: "assistant", content: assistantMessage });
    await loadConversations();
  } catch (error) {
    addMessage("assistant", `Error: ${error.message}`);
    history.pop();
  } finally {
    button.disabled = false;
    button.innerHTML = "Send <span>↗</span>";
    prompt.focus();
  }
});

newChatButton.addEventListener("click", resetChat);
prompt.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    form.requestSubmit();
  }
});

loadConversations().catch((error) => {
  conversationList.innerHTML = `<p class="empty-history">${error.message}</p>`;
});
