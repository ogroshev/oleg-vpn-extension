// OlegVPN — браузерный прокси. Весь трафик Chrome идёт через ваш HTTPS-прокси.
//
// ┌─────────────────────────────────────────────────────────────────────┐
// │  НАСТРОЙКА: укажите адрес своего прокси-сервера в двух строках ниже.  │
// │  Это единственное, что нужно поменять. Логин и пароль вводятся в      │
// │  окне расширения, в коде их нет.                                      │
// └─────────────────────────────────────────────────────────────────────┘
const PROXY_HOST = "your-proxy.example.com"; // ← адрес вашего прокси
const PROXY_PORT = 443;                      // ← порт (обычно 443)

async function getCreds() {
  const s = await chrome.storage.local.get(["username", "password"]);
  return { username: s.username || "", password: s.password || "" };
}

async function connect() {
  const config = {
    mode: "fixed_servers",
    rules: {
      singleProxy: { scheme: "https", host: PROXY_HOST, port: PROXY_PORT },
      bypassList: ["localhost", "127.0.0.1", "[::1]", "<local>"]
    }
  };
  await chrome.proxy.settings.set({ value: config, scope: "regular" });
  await chrome.storage.local.set({ connected: true });
  setBadge(true);
}

async function disconnect() {
  await chrome.proxy.settings.set({ value: { mode: "direct" }, scope: "regular" });
  await chrome.storage.local.set({ connected: false });
  setBadge(false);
}

function setBadge(on) {
  chrome.action.setBadgeText({ text: on ? "ON" : "" });
  chrome.action.setBadgeBackgroundColor({ color: on ? "#2ea043" : "#888888" });
}

// Подставляем логин/пароль прокси автоматически
chrome.webRequest.onAuthRequired.addListener(
  (details, callback) => {
    if (details.isProxy) {
      getCreds().then(({ username, password }) => {
        callback({ authCredentials: { username, password } });
      });
    } else {
      callback({});
    }
  },
  { urls: ["<all_urls>"] },
  ["asyncBlocking"]
);

// Команды из попапа
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.action === "connect") connect().then(() => sendResponse({ ok: true }));
  else if (msg.action === "disconnect") disconnect().then(() => sendResponse({ ok: true }));
  else if (msg.action === "status") {
    chrome.storage.local.get("connected").then((s) => sendResponse({ connected: !!s.connected }));
  }
  return true; // async sendResponse
});

// Восстановить состояние при запуске браузера
chrome.runtime.onStartup.addListener(() => {
  chrome.storage.local.get("connected").then((s) => { if (s.connected) connect(); else setBadge(false); });
});
chrome.storage.local.get("connected").then((s) => setBadge(!!s.connected));
