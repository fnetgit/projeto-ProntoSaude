// _js/atendente.js

document.addEventListener('DOMContentLoaded', () => {
    const tabButtons = document.querySelectorAll('.tab-button');
    const cadastrarForm = document.getElementById('cadastrar-pacientes-form');
    const procurarForm = document.getElementById('procurar-paciente-form');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            const tab = button.getAttribute('data-tab');
            const cadastrarButton = cadastrarForm.querySelector('.submit-button');

            if (tab === 'cadastrar') {
                cadastrarForm.style.display = 'block';
                procurarForm.style.display = 'none';
                if (cadastrarButton) cadastrarButton.style.display = 'block';
            } else {
                cadastrarForm.style.display = 'none';
                procurarForm.style.display = 'block';
                if (cadastrarButton) cadastrarButton.style.display = 'none';
            }
        });
    });

    const form = document.querySelector('#cadastrar-pacientes-form form');
    if (form) {
        form.addEventListener('submit', (event) => {
            event.preventDefault();
            alert('Formulário de Cadastro enviado! (Este é apenas um exemplo de JS)');
        });
    }

    const searchInput = document.querySelector('.search-bar input');
    if (searchInput) {
        searchInput.addEventListener('input', (event) => {
            console.log('Searching for:', event.target.value);
        });
    }

    const initialActiveTab = document.querySelector('.tab-button.active').getAttribute('data-tab');
    const cadastrarButton = cadastrarForm.querySelector('.submit-button');
    if (initialActiveTab === 'cadastrar') {
        if (cadastrarButton) cadastrarButton.style.display = 'block';
    } else {
        if (cadastrarButton) cadastrarButton.style.display = 'none';
    }
});