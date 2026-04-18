// =============================================
//  Moneyspace — server.js
//  З авторизацією JWT
// =============================================

require('dotenv').config();
const express    = require('express');
const mongoose   = require('mongoose');
const cors       = require('cors');
const bcrypt     = require('bcryptjs');
const jwt        = require('jsonwebtoken');
const path       = require('path');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// =============================================
//  МОДЕЛІ
// =============================================

// Модель користувача
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

// Модель транзакції — тепер прив'язана до користувача
const transactionSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type:     { type: String, enum: ['income', 'expense'], required: true },
    amount:   { type: Number, required: true, min: 0.01 },
    category: { type: String, required: true, trim: true },
    date:     { type: Date, required: true }
}, { timestamps: true });

const Transaction = mongoose.model('Transaction', transactionSchema);

// =============================================
//  MIDDLEWARE — перевірка токена
// =============================================

function protect(req, res, next) {
    // Токен передається в заголовку: Authorization: Bearer <token>
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Не авторизовано' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.id; // зберігаємо ID користувача для наступних обробників
        next();
    } catch (err) {
        return res.status(401).json({ message: 'Токен недійсний або прострочений' });
    }
}

// =============================================
//  МАРШРУТИ АВТОРИЗАЦІЇ
// =============================================

// POST /api/auth/login — вхід
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ message: 'Введіть логін і пароль' });
        }

        // Знайти користувача
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(401).json({ message: 'Невірний логін або пароль' });
        }

        // Перевірити пароль
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Невірний логін або пароль' });
        }

        // Створити JWT токен (живе 7 днів)
        const token = jwt.sign(
            { id: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            token,
            username: user.username
        });

    } catch (err) {
        res.status(500).json({ message: 'Помилка сервера', error: err.message });
    }
});

// POST /api/auth/create-user — створення користувача (тільки через термінал/скрипт)
// Цей маршрут захищений секретним ключем з .env щоб ніхто не міг зареєструватись через браузер
app.post('/api/auth/create-user', async (req, res) => {
    try {
        const { username, password, adminKey } = req.body;

        if (adminKey !== process.env.ADMIN_KEY) {
            return res.status(403).json({ message: 'Доступ заборонено' });
        }

        const existing = await User.findOne({ username });
        if (existing) {
            return res.status(400).json({ message: 'Користувач вже існує' });
        }

        const hashed = await bcrypt.hash(password, 12);
        const user = await User.create({ username, password: hashed });

        res.status(201).json({ message: 'Користувача створено', username: user.username });

    } catch (err) {
        res.status(500).json({ message: 'Помилка сервера', error: err.message });
    }
});

// =============================================
//  МАРШРУТИ ТРАНЗАКЦІЙ (захищені)
// =============================================

// GET /api/transactions — тільки транзакції поточного користувача
app.get('/api/transactions', protect, async (req, res) => {
    try {
        const transactions = await Transaction.find({ user: req.userId }).sort({ date: -1 });
        res.json(transactions);
    } catch (err) {
        res.status(500).json({ message: 'Помилка сервера', error: err.message });
    }
});

// POST /api/transactions
app.post('/api/transactions', protect, async (req, res) => {
    try {
        const { type, amount, category, date } = req.body;
        const transaction = new Transaction({ user: req.userId, type, amount, category, date });
        const saved = await transaction.save();
        res.status(201).json(saved);
    } catch (err) {
        if (err.name === 'ValidationError') {
            const messages = Object.values(err.errors).map(e => e.message);
            return res.status(400).json({ message: messages.join(', ') });
        }
        res.status(500).json({ message: 'Помилка сервера', error: err.message });
    }
});

// DELETE /api/transactions/:id
app.delete('/api/transactions/:id', protect, async (req, res) => {
    try {
        // Перевіряємо що транзакція належить саме цьому користувачу
        const deleted = await Transaction.findOneAndDelete({
            _id: req.params.id,
            user: req.userId
        });
        if (!deleted) {
            return res.status(404).json({ message: 'Транзакцію не знайдено' });
        }
        res.json({ message: 'Видалено успішно' });
    } catch (err) {
        res.status(500).json({ message: 'Помилка сервера', error: err.message });
    }
});

// =============================================
//  ПІДКЛЮЧЕННЯ ДО MONGODB І ЗАПУСК
// =============================================

const PORT      = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI)      { console.error('❌  MONGO_URI не задано'); process.exit(1); }
if (!process.env.JWT_SECRET) { console.error('❌  JWT_SECRET не задано'); process.exit(1); }

mongoose.connect(MONGO_URI, { family: 4 })
    .then(() => {
        console.log('✅  MongoDB підключено');
        app.listen(PORT, () => {
            console.log(`🚀  Сервер запущено: http://localhost:${PORT}`);
        });
    })
    .catch(err => {
        console.error('❌  Помилка підключення до MongoDB:', err.message);
        process.exit(1);
    });