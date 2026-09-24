# Telegram-чат на React + GREEN-API

Тестовое задание на фронтенд-разработчика React: веб-чат для отправки и получения **текстовых** сообщений в Telegram через [GREEN-API](https://green-api.com/telegram/).

## Возможности

- вход по `idInstance`, `apiTokenInstance` и `apiUrl` из кабинета GREEN-API;
- новый чат по телефону или `@username` (`CheckAccount`);
- отправка текста методом [SendMessage](https://green-api.com/telegram/docs/api/sending/SendMessage/);
- получение сообщений через HTTP API: [ReceiveNotification](https://green-api.com/telegram/docs/api/receiving/technology-http-api/ReceiveNotification/) и [DeleteNotification](https://green-api.com/telegram/docs/api/receiving/technology-http-api/DeleteNotification/).

## Требования

- Node.js 20+
- инстанс **Telegram** в [кабинете GREEN-API](https://console.green-api.com/) в статусе `authorized`

Перед работой: в карточке инстанса **Получить QR** → в Telegram **Настройки → Устройства** → отсканировать код. Если статус «Ожидает пароль» — это облачный пароль 2FA Telegram, не пароль GREEN-API.

`webhookUrl` должен быть пустым, входящие уведомления включены. При входе приложение само проверяет это через `GetSettings` / `SetSettings`.

Не коммитьте токен и не публикуйте его в README.

## Демо

https://green-api-telegram-chat-beta.vercel.app

Войдите своими `idInstance`, `apiTokenInstance` и `apiUrl` из кабинета GREEN-API (инстанс Telegram).

## Локальный запуск

```bash
npm install
npm run dev
```

Откройте http://127.0.0.1:5173/

**Windows PowerShell:** если `npm run dev` падает с ошибкой про `npm.ps1` и Execution Policy, запускайте так:

```powershell
npm.cmd install
npm.cmd run dev
```

Запросы к GREEN-API идут через прокси (`/green-api`), чтобы обойти CORS: локально это Vite, в интернете — функция Vercel.

## Как пользоваться

1. Вставьте `idInstance`, `apiTokenInstance` и `apiUrl` из карточки инстанса в кабинете GREEN-API. Поле `apiUrl` копируйте целиком — оно своё у каждого инстанса.
2. **Новый чат** — телефон получателя (`7999…`) или `@username`.
3. Отправьте текстовое сообщение.
4. Ответ собеседника в Telegram появится в этом чате.

Учётные данные хранятся в `sessionStorage` вкладки. История чатов — в `localStorage`.

## Стек

React 19, TypeScript, Vite, CSS Modules.
