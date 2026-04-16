// =============================================
//  Moneyspace — server.js
//  Бекенд: Node.js + Express + MongoDB
// =============================================

require('dotenv').config();
const express    = require('express');
const mongoose   = require('mongoose');
const cors       = require('cors');
const path       = require('path');

const app = express();

// --- Middleware ---
app.use(cors());
app.use(express.json());

// Роздача статичних файлів фронтенду (папка frontend поряд з backend/)
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// =============================================
//  МОДЕЛЬ ТРАНЗАКЦІЇ
// =============================================

const transactionSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['income', 'expense'],
        required: [true, 'Тип обов\'язковий']
    },
    amount: {
        type: Number,
        required: [true, 'Сума обов\'язкова'],
        min: [0.01, 'Сума має бути більше 0']
    },
    category: {
        type: String,
        required: [true, 'Категорія обов\'язкова'],
        trim: true
    },
    date: {
        type: Date,
        required: [true, 'Дата обов\'язкова']
    }
}, {
    timestamps: true // автоматично додає createdAt і updatedAt
});

const Transaction = mongoose.model('Transaction', transactionSchema);

// =============================================
//  МАРШРУТИ API
// =============================================

// GET /api/transactions — отримати всі транзакції (найновіші першими)
app.get('/api/transactions', async (req, res) => {
    try {
        const transactions = await Transaction.find().sort({ date: -1 });
        res.json(transactions);
    } catch (err) {
        res.status(500).json({ message: 'Помилка сервера', error: err.message });
    }
});

// POST /api/transactions — зберегти нову транзакцію
app.post('/api/transactions', async (req, res) => {
    try {
        const { type, amount, category, date } = req.body;

        const transaction = new Transaction({ type, amount, category, date });
        const saved = await transaction.save();

        res.status(201).json(saved);
    } catch (err) {
        // Обробка помилок валідації Mongoose
        if (err.name === 'ValidationError') {
            const messages = Object.values(err.errors).map(e => e.message);
            return res.status(400).json({ message: messages.join(', ') });
        }
        res.status(500).json({ message: 'Помилка сервера', error: err.message });
    }
});

// DELETE /api/transactions/:id — видалити транзакцію за ID
app.delete('/api/transactions/:id', async (req, res) => {
    try {
        const deleted = await Transaction.findByIdAndDelete(req.params.id);
        if (!deleted) {
            return res.status(404).json({ message: 'Транзакцію не знайдено' });
        }
        res.json({ message: 'Видалено успішно' });
    } catch (err) {
        res.status(500).json({ message: 'Помилка сервера', error: err.message });
    }
});

// =============================================
//  ПІДКЛЮЧЕННЯ ДО MONGODB І ЗАПУСК СЕРВЕРА
// =============================================

const PORT     = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
    console.error('❌  MONGO_URI не задано у файлі .env');
    process.exit(1);
}

mongoose.connect(MONGO_URI, {
    serverSelectionTimeoutMS: 5000,
    family: 4
})
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