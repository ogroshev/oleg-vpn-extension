const $ = (id) => document.getElementById(id);
const u = $("username"),
      p = $("password"),
      btn = $("toggle"),
      status = $("status"),
      statusText = $("statusText"),
      powerLabel = $("powerLabel"),
      reveal = $("reveal");

// загрузить сохранённое
chrome.storage.local.get(["username", "password", "connected"]).then((s) => {
  if (s.username) u.value = s.username;
  if (s.password) p.value = s.password;
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
  status.className = "status error";
  statusText.textContent = text;
}

// сохранять креды при вводе
u.addEventListener("input", () => chrome.storage.local.set({ username: u.value.trim() }));
p.addEventListener("input", () => chrome.storage.local.set({ password: p.value }));

// показать/скрыть пароль
reveal.addEventListener("click", () => {
  const hidden = p.type === "password";
  p.type = hidden ? "text" : "password";
  reveal.title = hidden ? "Скрыть пароль" : "Показать пароль";
  reveal.setAttribute("aria-label", reveal.title);
});

btn.addEventListener("click", async () => {
  const s = await chrome.storage.local.get("connected");
  if (!s.connected) {
    if (!u.value.trim() || !p.value) {
      showError("Введите логин и пароль");
      return;
    }
    await chrome.storage.local.set({ username: u.value.trim(), password: p.value });
    chrome.runtime.sendMessage({ action: "connect" }, () => render(true));
  } else {
    chrome.runtime.sendMessage({ action: "disconnect" }, () => render(false));
  }
});
