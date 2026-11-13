// OlegVPN — браузерный прокси. Весь трафик Chrome идёт через ваш HTTPS-прокси.
//
// ┌─────────────────────────────────────────────────────────────────────┐
// │  НАСТРОЙКА: укажите адрес своего прокси-сервера в двух строках ниже.  │
// │  Это единственное, что нужно поменять. Доступ (ссылка подписки или    │
// │  код) вводится в окне расширения — в коде его нет.                     │
// └─────────────────────────────────────────────────────────────────────┘
const PROXY_HOST = "your-proxy.example.com"; // ← адрес вашего прокси
const PROXY_PORT = 443;                      // ← порт (обычно 443)

// Домены, которые идут через VPN в режиме «Только заблокированные».
// Всё остальное — напрямую. Добавляйте свои по аналогии (суффикс домена).
const BLOCKED = [
  "instagram.com", "cdninstagram.com", "ig.me",
  "facebook.com", "fbcdn.net", "fb.com", "fbsbx.com",
  "twitter.com", "x.com", "t.co", "twimg.com",
  "telegram.org", "t.me", "telegram.me", "telesco.pe", "tdesktop.com",
  "youtube.com", "youtu.be", "googlevideo.com", "ytimg.com", "ggpht.com",
  "linkedin.com", "licdn.com",
  "soundcloud.com", "sndcdn.com",
  "spotify.com", "scdn.co", "spotifycdn.com",
  "discord.com", "discord.gg", "discordapp.com", "discordapp.net", "discord.media",
  "signal.org",
  "openai.com", "chatgpt.com", "oaistatic.com", "oaiusercontent.com",
  "anthropic.com", "claude.ai",
  "notion.so", "notion.site",
  "medium.com", "patreon.com",
  "bbc.com", "bbc.co.uk",
  "proton.me", "protonmail.com"
];

// PAC: заблокированные домены → прокси, остальное → напрямую.
function buildPac() {
  return [
    "function FindProxyForURL(url, host) {",
    "  var B = " + JSON.stringify(BLOCKED) + ";",
    "  for (var i = 0; i < B.length; i++) {",
    "    if (host === B[i] || shExpMatch(host, '*.' + B[i]))",
    "      return 'HTTPS " + PROXY_HOST + ":" + PROXY_PORT + "';",
    "  }",
    "  return 'DIRECT';",
    "}"
  ].join("\n");
}

async function getCreds() {
  const s = await chrome.storage.local.get(["username", "password"]);
  return { username: s.username || "", password: s.password || "" };
}

// Прямая проверка: пробуем сам прокси с введённым кодом. Ставим прокси на
// весь трафик и дёргаем generate_204 — прокси пустил (резолв) → код рабочий;
// отбил по 407 (неверный код) → fetch падает. Так проверяем именно доступ.
async function probeProxy() {
  await chrome.proxy.settings.set({ value: proxyValue("all"), scope: "regular" });
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 9000);
    await fetch("https://www.gstatic.com/generate_204", { signal: ctl.signal, cache: "no-store" });
    clearTimeout(t);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: "Ссылка не принята — проверьте её" };
  }
}

function proxyValue(mode) {
  if (mode === "blocked") {
    return { mode: "pac_script", pacScript: { data: buildPac() } };
  }
  return {
    mode: "fixed_servers",
    rules: {
      singleProxy: { scheme: "https", host: PROXY_HOST, port: PROXY_PORT },
      bypassList: ["localhost", "127.0.0.1", "[::1]", "<local>"]
    }
  };
}

async function connect() {
  const s = await chrome.storage.local.get(["mode", "connected"]);
  // Проверяем доступ только на первом подключении (не при смене режима).
  if (!s.connected) {
    const v = await probeProxy();
    if (!v.ok) {
      await chrome.proxy.settings.set({ value: { mode: "direct" }, scope: "regular" });
      return v; // код не принят — остаёмся без прокси
    }
  }
  await chrome.proxy.settings.set({ value: proxyValue(s.mode), scope: "regular" });
  await chrome.storage.local.set({ connected: true });
  setBadge(true);
  return { ok: true };
}

async function disconnect() {
  await chrome.proxy.settings.set({ value: { mode: "direct" }, scope: "regular" });
  await chrome.storage.local.set({ connected: false });
  setBadge(false);
  return { ok: true };
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
  if (msg.action === "connect") connect().then((r) => sendResponse(r));
  else if (msg.action === "disconnect") disconnect().then((r) => sendResponse(r));
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
