// =============================================
//  Moneyspace — script.js
//  З підтримкою JWT авторизації
// =============================================

const API_URL = '';  // порожньо бо фронтенд і бекенд на одному сервері

// =============================================
//  АВТОРИЗАЦІЯ — перевірка при завантаженні
// =============================================

const token    = localStorage.getItem('token');
const username = localStorage.getItem('username');

// Якщо немає токена — відправити на сторінку входу
if (!token) {
    window.location.href = 'login.html';
}

// Показати ім'я користувача в шапці
const usernameEl = document.getElementById('username-display');
if (usernameEl && username) {
    usernameEl.textContent = username;
}

// Кнопка виходу
document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    window.location.href = 'login.html';
});

// Кнопка зміни акаунту (те саме що вихід)
document.getElementById('switchBtn').addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    window.location.href = 'login.html';
});

// =============================================
//  DOM ЕЛЕМЕНТИ
// =============================================

const modalOverlay    = document.getElementById('modalOverlay');
const modalTitle      = document.getElementById('modalTitle');
const modalSubmitBtn  = document.getElementById('modalSubmitBtn');
const closeBtn        = document.getElementById('closeModal');
const dateInput       = document.getElementById('date');
const modalForm       = document.querySelector('.modal-form');
const balanceEl       = document.querySelector('.balance-card h2');
const incomeEl        = document.querySelector('.income-card h2');
const expenseEl       = document.querySelector('.expense-card h2');
const transactionList = document.querySelector('.transactions');

let currentType = 'income';

// =============================================
//  УТИЛІТИ
// =============================================

function setTodayDate() {
    dateInput.value = new Date().toISOString().split('T')[0];
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('uk-UA', {
        style: 'currency', currency: 'UAH',
        minimumFractionDigits: 0, maximumFractionDigits: 2
    }).format(amount);
}

function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('uk-UA');
}

function showToast(message, isError = false) {
    const existing = document.getElementById('toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'toast';
    toast.textContent = message;
    toast.style.cssText = `
        position:fixed; bottom:30px; right:30px;
        background:${isError ? '#ee5d50' : '#05cd99'};
        color:#fff; padding:14px 22px; border-radius:12px;
        font-size:15px; font-weight:600;
        box-shadow:0 8px 24px rgba(0,0,0,0.12);
        z-index:9999; opacity:0; transition:opacity 0.3s ease;
    `;
    document.body.appendChild(toast);
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

document.getElementById('addIncomeBtn').addEventListener('click', () => openModal('income'));
document.getElementById('addExpenseBtn').addEventListener('click', () => openModal('expense'));
closeBtn.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) closeModal(); });
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalOverlay.classList.contains('active')) closeModal();
});

// =============================================
//  API — ЗАПИТИ З ТОКЕНОМ
// =============================================

// Всі запити тепер передають токен в заголовку Authorization
function authHeaders() {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
}

async function fetchTransactions() {
    try {
        const res = await fetch(`/api/transactions`, { headers: authHeaders() });

        // Якщо токен протермінований — вийти
        if (res.status === 401) {
            localStorage.removeItem('token');
            window.location.href = 'login.html';
            return [];
        }

        if (!res.ok) throw new Error('Помилка завантаження');
        return await res.json();
    } catch (err) {
        showToast('Не вдалося завантажити транзакції', true);
        return [];
    }
}

async function saveTransaction(data) {
    const res = await fetch(`/api/transactions`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(data)
    });

    if (res.status === 401) {
        localStorage.removeItem('token');
        window.location.href = 'login.html';
        return;
    }

    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Помилка збереження');
    }

    return await res.json();
}

async function deleteTransaction(id) {
    const res = await fetch(`/api/transactions/${id}`, {
        method: 'DELETE',
        headers: authHeaders()
    });

    if (res.status === 401) {
        localStorage.removeItem('token');
        window.location.href = 'login.html';
        return;
    }

    if (!res.ok) throw new Error('Помилка видалення');
}

// =============================================
//  РЕНДЕР
// =============================================

function updateSummary(transactions) {
    const income  = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    balanceEl.textContent = formatCurrency(income - expense);
    incomeEl.textContent  = `+ ${formatCurrency(income)}`;
    expenseEl.textContent = `- ${formatCurrency(expense)}`;
}

function renderTransactions(transactions) {
    transactionList.innerHTML = '<h3>Останні транзакції</h3>';

    if (transactions.length === 0) {
        transactionList.innerHTML += `
            <p style="color:#a3aed0; text-align:center; padding:30px 0;">
                Транзакцій ще немає. Додайте першу!
            </p>`;
        return;
    }

    transactions.forEach(t => {
        const item = document.createElement('div');
        item.classList.add('transaction-item');
        const sign  = t.type === 'income' ? '+' : '-';
        const color = t.type === 'income' ? '#05cd99' : '#ee5d50';

        item.innerHTML = `
            <div>
                <strong>${t.category}</strong>
                <div class="date">${formatDate(t.date)}</div>
            </div>
            <div style="display:flex; align-items:center; gap:16px;">
                <span style="color:${color}; font-weight:700; font-size:18px;">
                    ${sign} ${formatCurrency(t.amount)}
                </span>
                <button class="delete-btn" data-id="${t._id}" title="Видалити"
                    style="background:none; border:none; cursor:pointer;
                           color:#a3aed0; font-size:20px; line-height:1;
                           transition:color 0.2s;">
                    &times;
                </button>
            </div>
        `;
        transactionList.appendChild(item);
    });

    transactionList.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('mouseenter', () => { btn.style.color = '#ee5d50'; });
        btn.addEventListener('mouseleave', () => { btn.style.color = '#a3aed0'; });
        btn.addEventListener('click', handleDelete);
    });
}

// =============================================
//  ОБРОБНИКИ ПОДІЙ
// =============================================

modalForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const amount   = parseFloat(document.getElementById('amount').value);
    const category = document.getElementById('category').value.trim();
    const date     = document.getElementById('date').value;

    if (!amount || amount <= 0) { showToast('Введіть коректну суму', true); return; }
    if (!category)              { showToast('Введіть категорію', true); return; }

    modalSubmitBtn.disabled    = true;
    modalSubmitBtn.textContent = 'Збереження...';

    try {
        await saveTransaction({ type: currentType, amount, category, date });
        closeModal();
        showToast(currentType === 'income' ? 'Дохід додано!' : 'Витрату додано!');
        await loadAll();
    } catch (err) {
        showToast(err.message, true);
    } finally {
        modalSubmitBtn.disabled = false;
    }
});

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

async function loadAll() {
    const transactions = await fetchTransactions();
    updateSummary(transactions);
    renderTransactions(transactions);
}

document.addEventListener('DOMContentLoaded', loadAll);