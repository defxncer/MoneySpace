==Технології==
- Node.js + Express
- MongoDB (локальна)
- JS
==Інструкція Встановлення==
1. Клонувати репозиторій:
   git clone https://github.com/твій-нікнейм/moneyspace.git

2. Встановити залежності:
   cd backend
   npm install

3. Створити файл .env в папці backend:
   MONGO_URI=mongodb://127.0.0.1:27017/moneyspace
   JWT_SECRET=будь-який-секретний-рядок
   ADMIN_KEY=будь-який-ключ

4. Запустити MongoDB на своєму комп'ютері

5. Створити користувача (замінити значення на свої):
   Invoke-WebRequest -Uri "http://localhost:3000/api/auth/create-user" -Method POST -ContentType "application/json" -Body '{"username":"admin","password":"123456","adminKey":"твій_ADMIN_KEY"}'

6. Запустити сервер:
   node server.js

7. Відкрити в браузері: http://localhost:3000
