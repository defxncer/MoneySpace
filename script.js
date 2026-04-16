const modalOverlay = document.getElementById('modalOverlay');
const modalTitle = document.getElementById('modalTitle');
const modalSubmitBtn = document.getElementById('modalSubmitBtn');
const closeBtn = document.getElementById('closeModal');
const dateInput = document.getElementById('date');

function setTodayDate() {
    const today = new Date().toISOString().split('T')[0];
    dateInput.value = today;
}

function openModal(type) {
    modalOverlay.classList.add('active');
    setTodayDate();

    if (type === 'income') {
        modalTitle.innerText = 'Додати дохід';
        modalSubmitBtn.innerText = 'Зберегти дохід';
        modalSubmitBtn.className = 'btn btn-block btn-income'; 
    } else if (type === 'expense') {
        modalTitle.innerText = 'Додати витрату';
        modalSubmitBtn.innerText = 'Зберегти витрату';
        modalSubmitBtn.className = 'btn btn-block btn-expense';
    }
}

function closeModal() {
    modalOverlay.classList.remove('active');
}

document.querySelector('.btn-income').addEventListener('click', () => openModal('income'));
document.querySelector('.btn-expense').addEventListener('click', () => openModal('expense'));

closeBtn.addEventListener('click', closeModal);

modalOverlay.addEventListener('click', (event) => {
    if (event.target === modalOverlay) {
        closeModal();
    }
});

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modalOverlay.classList.contains('active')) {
        closeModal();
    }
});