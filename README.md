# p99

[![Releases](https://img.shields.io/github/v/release/aeee78/p99?label=releases)](https://github.com/aeee78/p99/releases)

> **p99** — это форк проекта Podkop / Forkop для OpenWrt (24.10 / 25.12+) с гибридной оркестрацией **sing-box**, **zapret** и **byedpi**, свободный от сторонних зеркал и искусственных ограничений на провайдеров подписок.

---

### 🚀 Установка в 1 команду

```sh
wget -qO- https://raw.githubusercontent.com/aeee78/p99/main/install.sh | sh
```

---

### ✨ Особенности и отличия

- 🌐 **Поддержка любых подписок**: полная свобода выбора провайдеров и форматов (VLESS Reality/WS/gRPC/xHTTP, VMess, Trojan, Shadowsocks/SIP002, Hysteria2, Xray JSON, Clash/sing-box configs, base64-списки).
- 📦 **Прямая установка и обновления с GitHub**: релизы, пакеты и списки загружаются напрямую с GitHub (`aeee78/p99`) и официальных репозиториев без подмены системных `distfeeds` OpenWrt на сторонние приватные зеркала.
- ⚡ **Отказоустойчивые fallback-источники**: автоматическое переключение на jsDelivr CDN и GitHub Raw в случае недоступности основных адресов для ruleset и списков.
- 🛡️ **Интеграция Zapret-Manager**: возможность установки и управления `zapret-manager` (stressozz) прямо из веб-интерфейса LuCI с официального источника.
- 🎛️ **Выбор сборки sing-box**: поддержка `sing-box tiny` по умолчанию (для экономии flash-памяти), `stable` и `extended` (для протоколов xHTTP).
- 🔄 **Плавная миграция**: автоматическое сохранение и перенос конфигураций с `Podkop`, `Podkop Plus` и `Forkop`.
- 📊 **URLTest и мониторинг**: отображение текущего активного узла, задержек и статусов служб в реальном времени.
- 🎮 **Расширенные списки сервисов**: готовые списки для Discord, YouTube, Telegram, Meta, Twitter, Cloudflare, игровых сервисов (Blizzard, Sony PlayStation, Riot, Roblox, Supercell) и защита от рекламы (HaGeZi).

---

### 🛠️ Требования

- **OpenWrt**: 24.10 (пакеты `.ipk`) или 25.12+ (пакеты `.apk`).
- Доступ в интернет для загрузки пакетов и зависимостей.

---

### 📄 Лицензия

GPL-2.0-or-later
