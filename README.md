<div align="center">

<img src="icons/icon128.png" width="96" height="96" alt="OlegVPN">

# OlegVPN — браузерный прокси для Chrome

**Весь трафик браузера через ваш собственный HTTPS-прокси. Ничего не ставится в систему.**

![manifest](https://img.shields.io/badge/Manifest-V3-blue) ![license](https://img.shields.io/badge/License-MIT-green) ![platform](https://img.shields.io/badge/Chrome-browser%20only-success)

</div>

> **EN:** A minimal Chrome extension (Manifest V3) that routes the whole browser
> through **your own** self-hosted HTTPS proxy. No system VPN, no drivers —
> just a browser extension. Point it at your proxy, enter login/password, click
> connect. Credentials are stored only in the browser; there are **no servers,
> domains or secrets hardcoded** in this repo.

---

## Зачем это

Иногда системный VPN поставить нельзя (например, на рабочем компьютере), а
расширения для браузера — можно. Это расширение включает проксирование **только
внутри Chrome**: один тумблер — и весь трафик браузера идёт через ваш сервер.

- 🔒 Ничего не устанавливается в ОС — только расширение браузера.
- 🧩 Один файл настройки: адрес вашего прокси в `background.js`.
- 🙈 Логин и пароль вводятся в окне расширения и хранятся только в браузере
  (`chrome.storage.local`). В коде их нет.
- 🌗 Светлая и тёмная темы, аккуратный UI.

## Как это работает

```
Chrome ──TLS──▶  ваш HTTPS-прокси (CONNECT + Basic auth)  ──▶  интернет
```

Расширение через `chrome.proxy` направляет весь трафик в прокси по схеме
`https` (HTTP-прокси поверх TLS). Прокси запрашивает логин/пароль — расширение
подставляет их автоматически через `onAuthRequired`.

## Установка расширения

1. Открыть `chrome://extensions`.
2. Включить **«Режим разработчика»** (справа сверху).
3. **«Загрузить распакованное расширение»** → выбрать папку с этим репозиторием.
4. Закрепить значок 🛡 на панели.

## Настройка (обязательно)

Откройте `background.js` и укажите адрес своего прокси:

```js
const PROXY_HOST = "your-proxy.example.com"; // ← адрес вашего прокси
const PROXY_PORT = 443;                      // ← порт (обычно 443)
```

После правки — на `chrome://extensions` нажать «Обновить» у расширения.

## Использование

1. Клик по значку 🛡 на панели.
2. Ввести логин и пароль (их выдаёт владелец прокси).
3. **«Подключить»** — на значке загорится `ON`, весь трафик браузера идёт через прокси.
4. **«Отключить»** — прямое соединение.

## Серверная часть

Подойдёт любой HTTPS-прокси, понимающий `CONNECT` и Basic-авторизацию поверх TLS
(валидный сертификат обязателен — Chrome не пустит в прокси с самоподписанным).
Минимальный пример на [sing-box](https://sing-box.sagernet.org/):

```json
{
  "inbounds": [{
    "type": "http",
    "listen": "::",
    "listen_port": 443,
    "users": [{ "username": "alice", "password": "change-me" }],
    "tls": {
      "enabled": true,
      "server_name": "your-proxy.example.com",
      "acme": { "domain": ["your-proxy.example.com"], "email": "you@example.com" }
    }
  }],
  "outbounds": [{ "type": "direct" }]
}
```

Для скрытности прокси удобно поставить **вход в России, а выход — за границей**
(каскад), либо спрятать прокси за SNI-роутером (HAProxy/sing-box) на одном `:443`
рядом с обычным сайтом.

## Приватность и безопасность

- Логин/пароль хранятся только в вашем браузере (`chrome.storage.local`), никуда
  не отправляются, кроме самого прокси при авторизации.
- Расширение не собирает статистику и не обращается ни к каким сторонним серверам.
- Разрешения: `proxy` (переключение прокси), `storage` (хранить логин/пароль и
  состояние), `webRequest`+`webRequestAuthProvider` (подставлять пароль прокси).

## Состав

| Файл | Назначение |
|------|-----------|
| `manifest.json` | Манифест расширения (MV3) |
| `background.js` | Service worker: включение/выключение прокси, авторизация |
| `popup.html` / `popup.js` | Окно расширения (UI + логика) |
| `icon.svg`, `icons/` | Иконки |

## Лицензия

[MIT](LICENSE)
