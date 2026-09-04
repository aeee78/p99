# p99

[![Releases](https://img.shields.io/github/v/release/aeee78/p99?label=releases)](https://github.com/aeee78/p99/releases)

> **p99** — модульная система маршрутизации, избирательного проксирования трафика и обхода блокировок для OpenWrt (24.10 / 25.12+).
> Проект выполняет гибридную оркестрацию **sing-box**, **zapret** (nfqws), **zapret2** (nfqws2) и **byedpi** (ciadpi) через nftables policy routing и интеграцию с dnsmasq.

---

### 🚀 Быстрая установка в 1 команду

```sh
wget -qO- https://raw.githubusercontent.com/aeee78/p99/main/install.sh | sh
```

---

### ✨ Ключевые возможности

- 🌐 **Любые подписки и протоколы**: VLESS (Reality/WS/gRPC/xHTTP), VMess, Trojan, Shadowsocks (SIP002), Hysteria2, SOCKS5, Clash YAML, sing-box JSON, base64-списки.
- 📦 **Чистая установка без сторонних зеркал**: прямая загрузка пакетов и ruleset с GitHub (`aeee78/p99`) и официальных репозиториев OpenWrt (без подмены системных `distfeeds`).
- ⚡ **Отказоустойчивые fallback-источники**: автоматическое переключение на jsDelivr CDN и сырые GitHub Raw адреса.
- 🛡️ **Гибридная оркестрация DPI**: одновременная работа sing-box, zapret (nfqws v1), zapret2 (nfqws2) и ByeDPI (ciadpi).
- 🎛️ **Выбор сборки sing-box**: `tiny` (минимальный размер flash), `stable` (стандартная) и `extended` (поддержка xHTTP, полная совместимость с sing-box 1.14.0+ / extended 2.7.0+).
- 🔄 **Умный дельта-релоад**: конфигуратор определяет только измененные компоненты и перезапускает их без разрыва активных соединений.
- 📊 **URLTest и мониторинг**: автовыбор самого быстрого прокси, фоновые проверки задержки, Clash API (9090).
- 🎮 **Готовые списки сервисов**: Discord, YouTube, Telegram, Meta, Twitter, Cloudflare, игровые платформы (Blizzard, Sony PlayStation, Riot, Roblox, Supercell), блокировка рекламы (HaGeZi).

---

# 📚 ТЕХНИЧЕСКИЙ РУКОВОДИТЕЛЬ ДЛЯ AI И РАЗРАБОТЧИКОВ

> Данный раздел предназначен для нейросетей (LLM) и разработчиков. Он детально описывает архитектуру, структуру каталогов, потоки данных, внутренние контракты и расположение всей логики в репозитории.

```
+-----------------------------------------------------------------------------------+
|                                  ПОТОК ДАННЫХ                                     |
+-----------------------------------------------------------------------------------+
|  Пользовательский трафик (LAN / br-lan)                                            |
|       │                                                                           |
|       ├──► DNS-запросы (UDP/TCP:53) ──► dnsmasq (порт 53)                         |
|       │                                      │ (перенаправление на 127.0.0.42:53) |
|       │                                      ▼                                    |
|       │                          sing-box DNS Inbound                             |
|       │                             ├── FakeIP пул: 198.18.0.0/15 (IPv6 fc00::/18)|
|       │                             └── Прямой / DNS-Detour резолв                |
|       │                                                                           |
|       └──► TCP/UDP Трафик ──► nftables: inet P99Table                             |
|                                     │                                             |
|            ┌────────────────────────┼────────────────────────┬──────────────────┐ |
|            ▼                        ▼                        ▼                  ▼ |
|      [FakeIP / Proxy]         [Zapret DPI]             [Zapret2 DPI]        [ByeDPI]  |
|      fwmark 0x04000000        fwmark 0x01000000        fwmark 0x02000000    SOCKS5    |
|      Таблица p99 (lo)         NFQUEUE 4000+            NFQUEUE 4300+        127.0.0.1 |
|      TProxy -> sing-box:1602  nfqws                    nfqws2               :1080     |
|      (Outbound / VLESS / etc) (Desync TCP/UDP)         (Desync L7 Lua)                |
+-----------------------------------------------------------------------------------+
```

---

## 1. Карта репозитория ("Куда смотреть")

```
.
├── p99/                               # Бэкенд-пакет OpenWrt (ucode, UCI, init.d, CLI)
│   ├── Makefile                       # Сборка пакета p99, зависимости opkg/apk
│   └── files/
│       ├── etc/
│       │   ├── config/p99             # Шаблон/схема базовой конфигурации UCI
│       │   └── init.d/p99             # procd init-скрипт службы p99
│       └── usr/
│           ├── bin/p99                # Единый CLI-диспатчер команд p99 (ucode)
│           └── lib/                   # Ядро на ucode (устанавливается в /usr/lib/p99)
│               ├── core/              # Системные константы, утилиты, IP/UCI/URL хелперы
│               ├── config/            # Валидация, миграции, парсер связей UCI
│               ├── service/           # Жизненный цикл, дельта-релоад, procd-триггеры, UI RPC
│               ├── singbox/           # Генератор sing-box config.json, DNS, маршруты, URLTest
│               ├── providers/         # zapret (nfqws), zapret2 (nfqws2), byedpi (ciadpi)
│               ├── subscription/      # Парсер подписок (vless/vmess/ss/hy2), кэш узлов
│               ├── diagnostics/       # Проверки сети, nft, fakeip, логов, маскирование
│               ├── dns/               # Перехват и восстановление настроек dnsmasq
│               ├── nft/               # Генерация и применение правил nftables (P99Table)
│               ├── routing/           # Правила сопоставления доменов и rulesets (.srs/.lst)
│               └── components/        # Загрузка и обновление sing-box, zapret, списков
├── fe-app-p99/                        # Исходный код фронтенда (TypeScript + Vite + tsup)
│   ├── src/
│   │   ├── main.ts                    # Главная точка входа для бандлера tsup
│   │   ├── constants.ts               # Константы фронтенда, опции DNS, списки сервисов
│   │   ├── validators/                # Валидаторы IP, CIDR, доменов, ссылок, JSON
│   │   ├── helpers/                   # Хелперы парсинга, тостов, стилей, Clash UI URL
│   │   └── p99/                       # Вкладки и сервисы интерфейса
│   │       ├── services/              # Реактивный стор, WebSocket/RPC, uiState, логи
│   │       └── tabs/                  # Dashboard, Diagnostic, Monitoring, Updates
│   ├── tsup.config.ts                 # Сборщик: собирает в main.js и патчит в LuCI baseclass
│   └── package.json                   # Скрипты ci, test (vitest), lint (eslint), build
├── luci-app-p99/                      # LuCI Web UI пакет для OpenWrt
│   ├── Makefile                       # Сборка пакета luci-app-p99 и luci-i18n-p99-ru
│   ├── htdocs/luci-static/resources/view/p99/
│   │   ├── main.js                    # СГЕНЕРИРОВАННЫЙ БАНДЛ (не редактировать вручную!)
│   │   ├── p99.js                     # Главная страница LuCI и регистрация вкладок
│   │   ├── settings.js                # Вкладка глобальных настроек
│   │   ├── section.js                 # Вкладка правил/секций маршрутизации
│   │   ├── subscriptions.js           # Вкладка подписок
│   │   ├── dashboard.js               # Вкладка дашборда (активный узел, пинг)
│   │   ├── diagnostic.js              # Вкладка проверки здоровья системы
│   │   ├── monitoring.js              # Вкладка мониторинга sing-box
│   │   └── updates.js                 # Вкладка обновлений компонентов
│   ├── po/ru/p99.po                   # Локализация (русский язык)
│   └── root/
│       ├── etc/uci-defaults/50_luci-p99# Автонастройка LuCI после установки
│       └── usr/share/
│           ├── luci/menu.d/           # Регистрация меню LuCI ("Службы" -> "p99")
│           └── rpcd/acl.d/            # Права доступа ubus/rpcd для интерфейса
├── tests/                             # Тестовый набор (70+ bash-тестов и js-хелперов)
│   ├── helpers/                       # Хелперы семантического сравнения JSON и матриц
│   └── *.sh                           # Интеграционные тесты ядра, валидатора, nft, DNS
├── install.sh                         # Универсальный скрипт установки/обновления для роутера
├── build.sh                           # Скрипт сборки IPK (OpenWrt 24.10) и APK (OpenWrt 25.12+)
└── .github/workflows/                 # CI/CD: backend-ci.yml, frontend-ci.yml, build.yml
```

---

## 2. Подробное описание подсистем

### 2.1. Ядро службы и CLI (`p99/files/usr/bin/p99` и `usr/lib/p99/service/`)

CLI-утилита `/usr/bin/p99` написана на ucode и служит единым диспетчером:
- Таблица `command_spec` в `p99` мапит строковую команду на ucode-модуль, функцию и число аргументов.
- **Инвариант безопасности**: если загрузка модуля терпит ошибку при командах `start/stop/restart/reload/uninstall`, автоматически вызывается `restore_dnsmasq_failsafe()`, предотвращая потерю интернета у пользователя.

Ключевые команды CLI:
- `p99 start | stop | restart | reload` — управление жизненным циклом (`service/lifecycle.uc`).
- `p99 show_config | show_sing_box_config` — вывод сгенерированных JSON-конфигураций.
- `p99 subscription_update [section] [index]` — обновление подписок (`components/updates.uc`).
- `p99 subscription_update_async` / `status` — фоновое неблокирующее обновление.
- `p99 list_update` / `list_update_if_due` — обновление правил/списков доменов по таймеру cron.
- `p99 component_action` / `component_action_async` — установка/смена версий `sing-box`, `zapret`, `byedpi`.
- `p99 global_check` — глубокая диагностика здоровья всех сервисов с маскированием данных.
- `p99 get_ui_state` / `service_action_async` — асинхронные команды для LuCI UI без зависания страницы.

`service/initd.uc` и `/etc/init.d/p99`:
- Интегрируется с системным демоном OpenWrt `procd`.
- Формирует динамический план триггеров `trigger-plan` для `procd_add_config_trigger` (на изменения `/etc/config/p99`) и `procd_add_interface_trigger` (на поднятие WAN интерфейса `retry-start-on-wan-up`).

### 2.2. Умный дельта-релоад (`service/reload.uc`)

В отличие от простых решений, полностью перезапускающих демоны, `service/reload.uc` строит граф различий между прошлым (`previous`) и текущим (`current`) состоянием:
- Сравниваются хеши: `service_triggers`, `dnsmasq`, `sing_box`, `nft`, `zapret_queue`, `zapret_runtime`, `zapret2_queue`, `zapret2_runtime`, `byedpi_runtime`, `list`, `cron`.
- Формируется точечный план:
  - `sing_box_reload: true` — мягкий перезапуск sing-box через SIGHUP или graceful restart.
  - `nft_rebuild: true` — пересборка правил фаервола.
  - `zapret_restart: true` / `zapret2_restart: true` / `byedpi_restart: true` — перезапуск только измененных провайдеров.
  - `dnsmasq_configure: true` / `dnsmasq_restore: true` — синхронизация DNS.

### 2.3. Конфигурационная модель UCI (`/etc/config/p99`)

Конфигурация хранится в стандартном формате OpenWrt UCI (`/etc/config/p99`).

#### 1. Глобальная секция `config settings 'settings'`
- `config_version`: версия схемы конфига (например, `1.0.5`).
- `dns_type`: тип DNS (`udp`, `tcp`, `tls`, `https`, `quic`).
- `dns_server`: upstream DNS серверы (по умолчанию `77.88.8.8`).
- `bootstrap_dns_server`: DNS для резолва адресов самих прокси-серверов.
- `dns_strategy`: стратегия резолва (`prefer_ipv4`, `ipv4_only`, `prefer_ipv6`).
- `dns_detour_enabled` / `dns_detour_section`: перенаправление DNS через прокси-секцию.
- `source_network_interfaces`: интерфейсы-источники для перехвата (по умолчанию `br-lan`).
- `enable_badwan_interface_monitoring`: мониторинг падений WAN-интерфейсов.
- `disable_quic`: блокировка UDP:443 (QUIC/HTTP3) для принудительного использования TCP TLS.
- `latency_test_url`: адрес для проверки доступности и задержки серверов (по умолчанию `https://www.gstatic.com/generate_204`).
- `latency_test_timeout`: максимальное время ожидания ответа сервера (таймаут пинга) в миллисекундах (по умолчанию `2000`). Задает `connect_timeout` для исходящих прокси-соединений sing-box (мертвые и заблокированные узлы не висят по 15 секунд при проверке urltest/delay, ускоряя тестирование), а также используется для отсечения недоступных узлов на Дашборде (серверы с превышением таймаута отображаются как `N/A`).
- `shared_latency_pool`: единый общий пул проверки задержки для серверов из подписок (`1` или `0`, по умолчанию `0` — выключено). При включении серверы из подписок опрашиваются глобально один раз по общему расписанию вместо отдельных параллельных проверок в каждой секции, предотвращая дублирующий RTT-трафик.
- `shared_latency_interval`: интервал автоматической проверки задержки общего пула подписок (по умолчанию `20m`).
- `dont_touch_dhcp`: запрет модификации dnsmasq (для нестандартных DNS-конфигураций).
- `config_path`: путь к сгенерированному файлу sing-box (`/etc/sing-box/config.json`).
- `cache_path`: путь к базе данных кэша (`/tmp/sing-box/cache.db`).

#### 2. Секции правил `config section 'section_name'`
Каждая секция определяет правило перехвата и действие:
- `label`: понятное имя секции в UI.
- `enabled`: включено (`1` или `0`).
- `action`: тип действия:
  - `connection` (или синонимы `proxy`, `vpn`): трафик направляется через sing-box outbounds.
  - `zapret`: трафик направляется в очередь NFQUEUE zapret (nfqws).
  - `zapret2`: трафик направляется в очередь zapret2 (nfqws2).
  - `byedpi`: трафик направляется в локальный SOCKS5 ByeDPI (ciadpi:1080).
  - `bypass`: прямой трафик в обход любых прокси и DPI.
  - `block`: принудительная блокировка трафика.
  - `dns`: только подмена DNS без перехвата тела трафика.
- Источники правил (критерии попадания):
  - `community_lists`: встроенные списки (`russia_inside`, `youtube`, `discord`, `telegram`, `meta`, `twitter` и т.д.).
  - `rule_set`: URL удаленных бинарных правил `.srs` sing-box.
  - `rule_set_with_subnets`: URL списков подсетей `.json`/`.lst`.
  - `domains`: пользовательские домены (`domain:`, `full:`, `keyword:`, `regex:`).
  - `subnets`: IP-адреса и подсети в формате CIDR.
  - `ip_ports`: пары `IP:PORT`.
  - `ports`: диапазоны портов.
  - `fully_routed_ips` / `fully_routed_macs`: IP или MAC локальных устройств, чей ВЕСЬ трафик уходит в эту секцию.

#### 3. Дочерние секции:
- `config subscription_url`: подписки с автообновлением, User-Agent, HWID, сокрытием узлов.
- `config urltest`: автотест узлов по URL (выбирает минимальный RTT).
- `config section_interface`: привязка секции к отдельному сетевому интерфейсу.
- `config server`: кастомные входящие сервисы (VLESS Reality server, MTProto proxy, Tailscale endpoint).

Валидация и миграция:
- `config/validator.uc`: строгий валидатор всех полей UCI перед применением.
- `config/migration.uc`: версионированные миграции старых конфигураций Podkop/Forkop в актуальную схему p99.

### 2.4. Генератор sing-box (`p99/files/usr/lib/singbox/generator.uc`)

Модуль объемом свыше 3200 строк формирует единый валидный `config.json` для sing-box:
- **Inbounds**:
  - `tproxy-in`: TProxy inbound (TCP + UDP) на `0.0.0.0:1602` с маркой `0x08000000`.
  - `tproxy6-in`: TProxy IPv6 на `[::1]:1602`.
  - `dns-in`: DNS inbound на `127.0.0.42:53`.
  - `service-mixed-in`: локальный Mixed (HTTP/SOCKS) на `127.0.0.1:4534`.
  - Серверные инбаунды: Reality Inbound, MTProto, Tailscale.
- **DNS блок**:
  - Сервер `fakeip-server` с пулом IPv4 `198.18.0.0/15` и IPv6 `fc00::/18`.
  - Серверы `bootstrap-dns-server` и `dns-server` с failover-логикой (`singbox/dns_failover.uc`).
  - DNS-правила сопоставления доменов к правилам секций.
- **Outbounds**:
  - `direct-out` и `bypass-out`.
  - Селекторы секций (ручной выбор нод из подписок).
  - Группы `urltest` (автоматический fallback на самую быструю ноду).
  - Сгенерированные узлы прокси: VLESS (с Reality / Vision), VMess, Trojan, Shadowsocks, Hysteria2, SOCKS5.
  - Каскадные цепочки (Detours): возможность направлять трафик одной секции через другую.
- **Experimental**: Clash API контроллер на `0.0.0.0:9090` для мониторинга и переключения нод в реальном времени.
- **Совместимость с sing-box 1.14.0+ / extended 2.7.0+**:
  - **Динамическая адаптация опций DNS**: в версии 1.14.0 опция `independent_cache` признана устаревшей (кэширование теперь сегментируется по транспорту по умолчанию) и будет удалена в 1.16.0. Генератор определяет версию установленного бинарника sing-box и удаляет `config.dns.independent_cache` для версий `>= 1.14.0`, сохраняя опцию для старых сборок (1.12.x / 1.13.x).
  - **Полный перехват диагностических сообщений**: функция `sing_box_check()` в `singbox/runtime.uc` считывает весь вывод `sing-box check` вместо только первой строки. Это предотвращает маскирование фатальных ошибок (`FATAL`) предупреждениями об устаревших опциях (`WARN`).
  - **Мгновенная инвалидация кэша информации о системе**: функция `sing_box_binary_signature()` в `diagnostics/runtime.uc` вычисляет сигнатуру исполняемого файла (inode, размер, mtime, ctime). При обновлении или замене бинарника sing-box на версию 1.14+ кэш `system-info.json` автоматически сбрасывается без задержки TTL.
  - **Дедупликация алиасов аутбаундов**: функция `deduplicate_alias_outbounds()` совместно с заполнением `metadata.aliases` в `subscription.uc` обеспечивает устранение дублирующих аутбаундов одного и того же профиля при формировании URLTest групп и селекторов.

### 2.5. Провайдеры DPI (`p99/files/usr/lib/providers/`)

P99 поддерживает совместное сосуществование классических прокси и утилит обхода DPI:
- **zapret** (`providers/zapret/`):
  - Бинарник: `/opt/zapret/nfq/nfqws`.
  - Марка маршрутизации: `0x01000000`, базовый номер очереди NFQUEUE: `4000`.
  - Desync-маркировка: `0x40000000` (чтобы desync-пакеты не зацикливались).
  - Поддержка кастомных и дефолтных стратегий (`--dpi-desync=fake,multidisorder` и т.д.).
- **zapret2** (`providers/zapret2/`):
  - Бинарник: `/opt/zapret2/nfq2/nfqws2`.
  - Марка маршрутизации: `0x02000000`, базовый номер очереди NFQUEUE: `4300`.
  - Поддержка L7 Lua-фильтров и десинков.
- **byedpi** (`providers/byedpi/`):
  - Бинарник: `/usr/bin/ciadpi`.
  - Локальный SOCKS5 сервис на `127.0.0.1:1080+`.
  - Автозапуск и валидация аргументов (`-o 2 --auto=t,r,a,s -d 2`).

### 2.6. Сетевой стек и nftables (`p99/files/usr/lib/nft/apply.uc`)

Создает и обслуживает таблицу `inet P99Table`:
- **Именованные сеты**:
  - `localv4` / `localv6`: исключение локальных подсетей (RFC1918, link-local, multicast).
  - `p99_subnets` / `p99_subnets6`: подсети, подлежащие проксированию.
  - `p99_ports`: порты маршрутизации (обычно 80, 443 и порты секций).
  - `p99_interfaces`: разрешенные интерфейсы источника (`br-lan`).
- **Маркировка и Policy Routing**:
  - Трафик к FakeIP адресам (`198.18.0.0/15`) маркируется `NFT_FAKEIP_MARK = 0x04000000`.
  - Трафик zapret/zapret2 маркируется `0x01000000` / `0x02000000` и отправляется в цепочку NFQUEUE.
  - Исходящий маркированный трафик направляется правилом Linux:
    `ip rule add fwmark 0x04000000/0x04000000 table p99`
    `ip route add local default dev lo table p99`
  - Пакеты локально перехватываются TProxy сокетом sing-box на порту 1602.

### 2.7. Подсистема DNS (`p99/files/usr/lib/dns/apply.uc`)

- При старте службы P99 проверяет конфигурацию dnsmasq (`/etc/config/dhcp`).
- Сохраняет оригинальные параметры `server`, `noresolv`, `cachesize` в служебные опции `p99_server`, `p99_noresolv` и т.д.
- Устанавливает dnsmasq апстримом адрес `127.0.0.42#53` (DNS Inbound sing-box).
- При остановке, падении или удалении пакета p99 функция `failsafe-restore` **гарантированно восстанавливает** исходные параметры dnsmasq, чтобы на роутере не пропал резолв доменов.

### 2.8. Парсер подписок (`p99/files/usr/lib/subscription/`)

- `parser.uc` (свыше 3000 строк) парсит:
  - Ссылки: `vless://`, `vmess://`, `trojan://`, `ss://` (SIP002), `hysteria2://`, `hy2://`, `socks5://`.
  - Конфигурации: base64, Clash YAML, sing-box JSON, Xray JSON outbounds.
  - Поддержка передовых технологий: VLESS Reality, TLS Fingerprint (chrome, edge), XTLS Vision flow, xHTTP транспорт.
  - **Автоматическая дедупликация узлов**: автоматическое схлопывание дублирующихся аутбаундов из мультипрофильных подписок (включая несколько шаблонов/пресетов маршрутизации Remnawave/Happ) по сигнатуре подключения (протокол, сервер, порт, UUID/пароль, транспорт, SNI, Reality) с извлечением человекочитаемых названий и локаций из полей `remarks`/`name`/`ps` вместо сырых технических тегов `proxy`.
- `cache.uc`:
  - **Эмуляция Happ по умолчанию**: запросы на скачивание подписок по умолчанию отправляются с `User-Agent: Happ/3.26.1` и `X-HWID`, обеспечивая полную совместимость с панелями Remnawave и доставку расширенных конфигураций; при необходимости User-Agent можно переопределить в настройках подписки в LuCI или UCI (`option user_agent`).
  - Двухуровневый кэш: оперативный в `/var/run/p99/` и персистентный во flash-памяти `/etc/p99/subscription-cache/` (сохраняется после перезагрузки роутера).
  - Автоматическая очистка устаревших временных файлов (`.tmp`) и сборка мусора для завершившихся или аварийно прерванных заданий.
- **Управление и синхронизация подписок**:
  - Поддержка связывания глобальных подписок (`config subscription`) и прямых ссылок (`config subscription_url`).
  - Ручное обновление: кнопки обновления для каждой секции и глобальные кнопки «Обновить все подписки» на Дашборде и во вкладке LuCI «Подписки».
  - Защита от race condition: безопасный механизм захвата `acquire_runtime_dir_lock` с валидацией времени создания директории блокировки.

### 2.8.1. Подсистема URLTest и отказоустойчивость (`p99/files/usr/lib/singbox/generator.uc`)

- Автоматический выбор быстрейшего узла на основе периодических фоновых проверок задержки.
- **Общий пул проверки задержки (Shared Latency Pool)**: при включении опции `shared_latency_pool` в sing-box создается единый мастер-аутбаунд `shared-latency-pool` со всеми узлами подписок, который выполняет замеры с интервалом `shared_latency_interval`. Для секций правил создаются селекторы с индивидуально отфильтрованными серверами (по странам, регексам и исключениям), а фоновый процесс-демон `priority.uc` опрашивает замеры задержки через Clash API (9090) и переключает секцию на самый быстрый живой узел с учетом порога чувствительности (`tolerance`). Демон сохраняет активный узел (`last_active`) в кэш секции, обеспечивая мгновенный старт sing-box с проверенного сервера без разрыва соединений. На старте роутера демон использует быстрый секундный опрос (fast-poll) до получения первых замеров, а при первичном холодном старте селекторы автоматически исключают немаршрутизируемые адреса-заглушки (`ib.ob`, `0.0.0.0`) из выбора дефолтного сервера. Это исключает дублирующие пинги одних и тех же серверов при использовании подписки в нескольких секциях (например, YouTube и Telegram).
- **Приоритетное закрепление на Дашборде**: группа «Быстрейший» (`Fastest`) и группы приоритета всегда остаются закрепленными в начале списка серверов независимо от режима сортировки по пингу.
- **Отказоустойчивый fallback при фильтрации серверов**: если фильтрация серверов (включая фильтрацию по группам) отсеяла все доступные узлы, селектор sing-box автоматически откатывается к доступным аутбаундам секции, предотвращая падение службы и потерю доступа к сети. Пустые группы URLTest корректно остаются доступными только для дашборда и не попадают в конфиг sing-box.
- **Контроль таймаута проверки (connect_timeout)**: параметр `latency_test_timeout` прописывается в `connect_timeout` всех прокси-аутбаундов sing-box. Это предотвращает длительные (15-секундные) зависания urltest на недоступных узлах, позволяя тестам проходить быстро, а на Дашборде узлы с задержкой выше лимита отмечаются как недоступные (`N/A`). Фоновые вызовы curl к Clash API также снабжаются флагом `--max-time` на основе заданного таймаута.
- **Отображение активных узлов в группах Priority**: в футере карточки группы приоритета на Дашборде выводится имя выбранного активного сервера (`priorityInfo.selectedName`), аналогично группам URLTest.

### 2.9. Frontend и сборка LuCI (`fe-app-p99/` -> `luci-app-p99/`)

- Фронтенд написан на современном TypeScript в каталоге `fe-app-p99/`.
- Использует реактивный стор (`store.service.ts`), поллинг `uiState` через вызовы RPC CLI `p99 get_ui_state`.
- **Сборочный процесс**:
  - `fe-app-p99/tsup.config.ts` собирает код в один файл:
    `../luci-app-p99/htdocs/luci-static/resources/view/p99/main.js`.
  - Хук `onSuccess` производит регулярное выражение над выходным файлом, трансформируя ESM-экспорт `export { ... }` в стандартную конструкцию LuCI:
    `return baseclass.extend({ ... })`.
  - **КРИТИЧЕСКОЕ ПРАВИЛО**: никогда не вносите изменения в `luci-app-p99/.../main.js` напрямую. Всегда модифицируйте файлы в `fe-app-p99/src/` и запускайте `yarn build` в `fe-app-p99/`!

---

## 3. Таблица быстрой навигации ("Куда смотреть при...")

| Задача / Проблема | Файлы для анализа и правки | Что там находится |
|---|---|---|
| **Добавить поддержку нового протокола или параметра в URL подписок** | `p99/files/usr/lib/subscription/parser.uc`<br>`p99/files/usr/lib/subscription/share_link.uc`<br>`fe-app-p99/src/validators/` | Парсер query-параметров ссылки, декодирование base64, конвертация в sing-box outbound JSON. |
| **Изменить логику формирования sing-box config.json** | `p99/files/usr/lib/singbox/generator.uc`<br>`p99/files/usr/lib/singbox/route.uc`<br>`p99/files/usr/lib/singbox/dns.uc` | Генерация секций inbounds, outbounds, dns, route, rulesets. |
| **Поведение службы при старте/остановке/падении** | `p99/files/usr/lib/service/lifecycle.uc`<br>`p99/files/etc/init.d/p99`<br>`p99/files/usr/lib/service/initd.uc` | Запуск/стоп демонов, проверка готовности PID, обработчики ловушек аварийного завершения. |
| **Ошибки правил nftables / фаервола** | `p99/files/usr/lib/nft/apply.uc`<br>`p99/files/usr/lib/core/constants.uc` | Создание таблиц, цепочек, наборов IP, меток fwmark (0x04000000, 0x01000000 и т.д.). |
| **Интеграция или откат DNS dnsmasq** | `p99/files/usr/lib/dns/apply.uc` | Перехват `127.0.0.42#53`, бэкап настроек dnsmasq, failsafe restore. |
| **Логика работы zapret / zapret2 / byedpi** | `p99/files/usr/lib/providers/` | Аргументы командной строки `nfqws`, `nfqws2`, `ciadpi`, номера очередей и desync-марки. |
| **Новые поля в конфиге UCI или валидация** | `p99/files/etc/config/p99`<br>`p99/files/usr/lib/config/validator.uc`<br>`p99/files/usr/lib/config/connections.uc` | Схема UCI, валидация типов, связей секций и значений по умолчанию. |
| **Миграция старых конфигов (Podkop / Forkop)** | `p99/files/usr/lib/config/migration.uc` | Автоматическая трансформация устаревших ключей UCI в новые. |
| **Изменения в веб-интерфейсе LuCI** | `fe-app-p99/src/`<br>`luci-app-p99/htdocs/luci-static/resources/view/p99/` | TypeScript компоненты (Dashboard, Diagnostic, Updates) и LuCI views (`p99.js`, `settings.js`, `section.js`). |
| **Скрипт установки на роутер** | `install.sh` | Определение opkg/apk, архитектуры роутера, памяти, зависимостей, fallback источников. |
| **Сборка релизных пакетов IPK / APK** | `build.sh`<br>`p99/Makefile`<br>`luci-app-p99/Makefile` | Загрузка OpenWrt SDK (24.10 и 25.12), компиляция пакетов. |

---

## 4. Разработка, сборка и тестирование

### 4.1. Тестирование бэкенда (ucode / shell)

Для проверки синтаксиса всех ucode-модулей (требуется установленный `ucode`):
```sh
find p99/files/usr/lib -name '*.uc' -print0 | xargs -0 -n1 ucode -c -o /dev/null
find p99/files/usr/lib -name '*.uc' -print0 | xargs -0 -n1 ucode -S -c -o /dev/null
```

Для запуска интеграционных тестов:
```bash
for test_file in tests/*.sh; do
  bash "$test_file"
done
```
*Каждый тест в `tests/*.sh` изолирован и проверяет конкретный контракт (валидатор, nft, DNS failover, маркировки, парсинг ссылок).*

### 4.2. Сборка и тестирование фронтенда (`fe-app-p99`)

В каталоге `fe-app-p99`:
```sh
# Установка зависимостей
yarn install --frozen-lockfile

# Проверка форматирования и линтинг
yarn format
yarn lint

# Запуск тестов фронтенда (vitest)
yarn test --run

# Сборка бандла в luci-app-p99/htdocs/.../main.js
yarn build

# Полный CI-цикл фронтенда
yarn ci
```

### 4.3. Сборка пакетов (`build.sh`)

Сборка IPK (OpenWrt 24.10) и APK (OpenWrt 25.12+) пакетов через Docker/SDK:
```bash
./build.sh 1.0.0 ./dist/output
```

---

## 5. Инварианты и правила для AI-агентов

1. **Не трогать скомпилированные артефакты**:
   Файл `luci-app-p99/htdocs/luci-static/resources/view/p99/main.js` перезаписывается при `yarn build` в `fe-app-p99`. Все изменения в валидаторах, сторе, дашборде и методах шелла должны производиться в `fe-app-p99/src/`.
2. **Failsafe DNS**:
   Любая логика в `p99` не должна оставлять систему с неработающим DNS. Если демон аварийно завершается, dnsmasq должен восстанавливать исходные серверы (`dnsmasq-restore`).
3. **Атомарность записи**:
   Все конфигурации sing-box и файлы состояний в `/var/run/p99` должны записываться атомарно через временные файлы (`.tmp`) и `fs.rename`, чтобы предотвратить чтение битого JSON сторонними процессами.
4. **Совместимость с OpenWrt 24 (opkg) и OpenWrt 25 (apk)**:
   Любые изменения в скриптах жизненного цикла (`install.sh`, `build.sh`, `action.uc`) должны учитывать обе пакетные базы (`opkg` и `apk`).
5. **Чистые зависимости**:
   Не добавляйте зависимости, требующие приватных репозиториев или специфичных зеркал; проект рассчитан на работу исключительно с официальными пакетами OpenWrt и открытыми релизами GitHub.

---

### 📄 Лицензия

GPL-2.0-or-later
