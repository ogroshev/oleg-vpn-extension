const $ = (id) => document.getElementById(id);
const link = $("sublink"),
      btn = $("toggle"),
      status = $("status"),
      statusText = $("statusText"),
      powerLabel = $("powerLabel"),
      modesEl = $("modes");

// Достаём короткий код (shortUuid) из ссылки подписки — последний сегмент пути.
function extractShort(input) {
  let v = (input || "").trim();
  if (!v) return "";
  try {
    const u = new URL(v);
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts.length) return parts[parts.length - 1];
  } catch (e) { /* не полный URL — разберём как строку */ }
  v = v.replace(/[?#].*$/, "").replace(/\/+$/, "");
  const seg = v.split("/").filter(Boolean);
  return seg.length ? seg[seg.length - 1] : v;
}

function renderMode(m) {
  [...modesEl.querySelectorAll(".mode")].forEach((b) =>
    b.classList.toggle("active", b.dataset.mode === m));
}

// загрузить сохранённое
chrome.storage.local.get(["sublink", "connected", "mode"]).then((s) => {
  if (s.sublink) link.value = s.sublink;
  renderMode(s.mode || "all");
  render(!!s.connected);
});

function render(on) {
  if (on) {
    btn.className = "power on";
    btn.setAttribute("aria-pressed", "true");
    btn.title = "Выключить VPN";
    powerLabel.textContent = "Нажми, чтобы выключить";
    status.className = "status on";
    statusText.textContent = "Подключено — трафик через VPN";
  } else {
    btn.className = "power off";
    btn.setAttribute("aria-pressed", "false");
    btn.title = "Включить VPN";
    powerLabel.textContent = "Нажми, чтобы включить";
    status.className = "status off";
    statusText.textContent = "Отключено";
  }
}

function showError(text) {
  btn.className = "power off";
  status.className = "status error";
  statusText.textContent = text;
}

function showChecking() {
  status.className = "status off";
  statusText.textContent = "Проверяем ссылку…";
}

// сохранять ссылку при вводе
link.addEventListener("input", () => chrome.storage.local.set({ sublink: link.value.trim() }));

// выбор режима (весь браузер / только заблокированные)
modesEl.addEventListener("click", async (e) => {
  const b = e.target.closest(".mode");
  if (!b) return;
  const m = b.dataset.mode;
  renderMode(m);
  await chrome.storage.local.set({ mode: m });
  const s = await chrome.storage.local.get("connected");
  if (s.connected) chrome.runtime.sendMessage({ action: "connect" }); // переприменить на лету
});

btn.addEventListener("click", async () => {
  const s = await chrome.storage.local.get("connected");
  if (!s.connected) {
    const short = extractShort(link.value);
    if (!short) { showError("Вставьте ссылку подписки"); return; }
    // login = password = короткий код из ссылки (его ждёт прокси в background.js)
    await chrome.storage.local.set({ sublink: link.value.trim(), username: short, password: short });
    showChecking();
    chrome.runtime.sendMessage({ action: "connect" }, (r) => {
      if (r && r.ok) render(true);
      else showError((r && r.error) || "Не удалось подключиться");
    });
  } else {
    chrome.runtime.sendMessage({ action: "disconnect" }, () => render(false));
  }
});
