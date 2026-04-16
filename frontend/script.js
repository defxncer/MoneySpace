// =============================================
//  Moneyspace — script.js
//  Повний клієнтський скрипт з API-інтеграцією
// =============================================

const API_URL = 'http://localhost:3000/api';

// --- DOM елементи ---
const modalOverlay   = document.getElementById('modalOverlay');
const modalTitle     = document.getElementById('modalTitle');
const modalSubmitBtn = document.getElementById('modalSubmitBtn');
const closeBtn       = document.getElementById('closeModal');
const dateInput      = document.getElementById('date');
const modalForm      = document.querySelector('.modal-form');

const balanceEl      = document.querySelector('.balance-card h2');
const incomeEl       = document.querySelector('.income-card h2');
const expenseEl      = document.querySelector('.expense-card h2');
const transactionList = document.querySelector('.transactions');

// Зберігаємо поточний тип операції ('income' або 'expense')
let currentType = 'income';

// =============================================
//  УТИЛІТИ
// =============================================

// Встановити сьогоднішню дату у полі форми
function setTodayDate() {
    const today = new Date().toISOString().split('T')[0];
    dateInput.value = today;
}

// Форматувати число як валюту: 12000 → "12 000 ₴"
function formatCurrency(amount) {
    return new Intl.NumberFormat('uk-UA', {
        style: 'currency',
        currency: 'UAH',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    }).format(amount);
}

// Форматувати дату: "2026-04-15" → "15.04.2026"
function formatDate(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('uk-UA');
}

// Показати повідомлення про помилку або успіх (тост)
function showToast(message, isError = false) {
    // Видалити попередній тост якщо є
    const existing = document.getElementById('toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'toast';
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed; bottom: 30px; right: 30px;
        background: ${isError ? '#ee5d50' : '#05cd99'};
        color: #fff; padding: 14px 22px;
        border-radius: 12px; font-size: 15px; font-weight: 600;
        box-shadow: 0 8px 24px rgba(0,0,0,0.12);
        z-index: 9999; opacity: 0;
        transition: opacity 0.3s ease;
    `;
    document.body.appendChild(toast);

    // Анімація появи → зникнення
    requestAnimationFrame(() => { toast.style.opacity = '1'; });
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// =============================================
//  МОДАЛЬНЕ ВІКНО
// =============================================

function openModal(type) {
    currentType = type;
    modalOverlay.classList.add('active');
    setTodayDate();
    // Очистити поля попереднього введення
    document.getElementById('amount').value = '';
    document.getElementById('category').value = '';

    if (type === 'income') {
        modalTitle.innerText = 'Додати дохід';
        modalSubmitBtn.innerText = 'Зберегти дохід';
        modalSubmitBtn.className = 'btn btn-block btn-income';
    } else {
        modalTitle.innerText = 'Додати витрату';
        modalSubmitBtn.innerText = 'Зберегти витрату';
        modalSubmitBtn.className = 'btn btn-block btn-expense';
    }
}

function closeModal() {
    modalOverlay.classList.remove('active');
}

// Кнопки відкриття модалки
document.querySelector('.btn-income').addEventListener('click', () => openModal('income'));
document.querySelector('.btn-expense').addEventListener('click', () => openModal('expense'));

// Закрити по хрестику, кліку на фон або Escape
closeBtn.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
});
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalOverlay.classList.contains('active')) closeModal();
});

// =============================================
//  API — ЗАПИТИ ДО БЕКЕНДУ
// =============================================

// GET /api/transactions — отримати всі транзакції
async function fetchTransactions() {
    try {
        const res = await fetch(`${API_URL}/transactions`);
        if (!res.ok) throw new Error('Помилка завантаження');
        return await res.json();
    } catch (err) {
        showToast('Не вдалося завантажити транзакції', true);
        return [];
    }
}

// POST /api/transactions — зберегти нову транзакцію
async function saveTransaction(transactionData) {
    const res = await fetch(`${API_URL}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transactionData)
    });

    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Помилка збереження');
    }

    return await res.json(); // повертає збережений об'єкт з _id
}

// DELETE /api/transactions/:id — видалити транзакцію
async function deleteTransaction(id) {
    const res = await fetch(`${API_URL}/transactions/${id}`, {
        method: 'DELETE'
    });
    if (!res.ok) throw new Error('Помилка видалення');
}

// =============================================
//  РЕНДЕР — ВІДОБРАЖЕННЯ ДАНИХ НА СТОРІНЦІ
// =============================================

// Оновити картки балансу / доходів / витрат
function updateSummary(transactions) {
    const income  = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);

    const expense = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

    const balance = income - expense;

    balanceEl.textContent = formatCurrency(balance);
    incomeEl.textContent  = `+ ${formatCurrency(income)}`;
    expenseEl.textContent = `- ${formatCurrency(expense)}`;
}

// Намалювати список транзакцій
function renderTransactions(transactions) {
    // Зберегти заголовок
    transactionList.innerHTML = '<h3>Останні транзакції</h3>';

    if (transactions.length === 0) {
        transactionList.innerHTML += `
            <p style="color:#a3aed0; text-align:center; padding: 30px 0;">
                Транзакцій ще немає. Додайте першу!
            </p>`;
        return;
    }

    transactions.forEach(t => {
        const item = document.createElement('div');
        item.classList.add('transaction-item');
        item.dataset.id = t._id;

        const sign   = t.type === 'income' ? '+' : '-';
        const color  = t.type === 'income' ? '#05cd99' : '#ee5d50';

        item.innerHTML = `
            <div>
                <strong>${t.category}</strong>
                <div class="date">${formatDate(t.date)}</div>
            </div>
            <div style="display:flex; align-items:center; gap:16px;">
                <span style="color:${color}; font-weight:700; font-size:18px;">
                    ${sign} ${formatCurrency(t.amount)}
                </span>
                <button
                    class="delete-btn"
                    data-id="${t._id}"
                    title="Видалити"
                    style="background:none; border:none; cursor:pointer;
                           color:#a3aed0; font-size:20px; line-height:1;
                           transition: color 0.2s;">
                    &times;
                </button>
            </div>
        `;
        transactionList.appendChild(item);
    });

    // Делегування кліків на кнопки видалення
    transactionList.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('mouseenter', () => { btn.style.color = '#ee5d50'; });
        btn.addEventListener('mouseleave', () => { btn.style.color = '#a3aed0'; });
        btn.addEventListener('click', handleDelete);
    });
}

// =============================================
//  ОБРОБНИКИ ПОДІЙ
// =============================================

// Сабміт форми — додати транзакцію
modalForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const amount   = parseFloat(document.getElementById('amount').value);
    const category = document.getElementById('category').value.trim();
    const date     = document.getElementById('date').value;

    // Базова валідація
    if (!amount || amount <= 0) {
        showToast('Введіть коректну суму', true);
        return;
    }
    if (!category) {
        showToast('Введіть категорію', true);
        return;
    }

    // Заблокувати кнопку на час запиту
    modalSubmitBtn.disabled = true;
    modalSubmitBtn.textContent = 'Збереження...';

    try {
        await saveTransaction({ type: currentType, amount, category, date });
        closeModal();
        showToast(currentType === 'income' ? 'Дохід додано!' : 'Витрату додано!');
        await loadAll(); // оновити список і баланс
    } catch (err) {
        showToast(err.message, true);
    } finally {
        modalSubmitBtn.disabled = false;
        // Текст кнопки відновить openModal при наступному кліку
    }
});

// Видалення транзакції
async function handleDelete(e) {
    const id = e.currentTarget.dataset.id;
    if (!confirm('Видалити цю транзакцію?')) return;

    try {
        await deleteTransaction(id);
        showToast('Транзакцію видалено');
        await loadAll();
    } catch (err) {
        showToast('Не вдалося видалити', true);
    }
}

// =============================================
//  ІНІЦІАЛІЗАЦІЯ
// =============================================

// Завантажити всі дані і відрендерити сторінку
async function loadAll() {
    const transactions = await fetchTransactions();
    updateSummary(transactions);
    renderTransactions(transactions);
}

// Запуск при завантаженні сторінки
document.addEventListener('DOMContentLoaded', loadAll);