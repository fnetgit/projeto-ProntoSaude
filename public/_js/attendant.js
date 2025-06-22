// _js/attendant.js (Completo e Correto)
// RESPONSABILIDADE: Interatividade da página e Máscaras do formulário.

document.addEventListener('DOMContentLoaded', () => {
    // --- LÓGICA DAS ABAS ---
    const tabButtons = document.querySelectorAll('.tab-button');
    const registrationForm = document.getElementById('register-patient-form');
    const searchForm = document.getElementById('search-patient-form');
    const editform = document.getElementById('edit-patient-form');

    // Oculta/mostra os formulários ao clicar nas abas
    if (registrationForm && searchForm) {
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                tabButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                const tab = button.getAttribute('data-tab');
                if (tab === 'register') {
                    registrationForm.style.display = 'block';
                    searchForm.style.display = 'none';
                    editform.style.display = 'none'
                } else {
                    registrationForm.style.display = 'none';
                    searchForm.style.display = 'block';
                    editform.style.display = 'none';
                }
            });
        });
    }

    // --- LÓGICA DA BARRA DE PESQUISA ---
    const searchInput = document.querySelector('.search-bar input');
    if (searchInput) {
        searchInput.addEventListener('input', (event) => {
            console.log('Searching for:', event.target.value);
            // Futuramente, a lógica de filtro da tabela pode vir aqui.
        });
    }

    // --- LÓGICA DAS MÁSCARAS DE INPUT ---
    const cpfInput = document.getElementById('cpf');
    const susCardInput = document.getElementById('sus_card');
    const phoneInput = document.getElementById('phone');

    // Máscara para CPF
    if (cpfInput) {
        cpfInput.addEventListener('input', (event) => {
            let value = event.target.value.replace(/\D/g, '').substring(0, 11);
            value = value.replace(/(\d{3})(\d)/, '$1.$2');
            value = value.replace(/(\d{3})\.(\d{3})(\d)/, '$1.$2.$3');
            value = value.replace(/(\d{3})\.(\d{3})\.(\d{3})(\d{1,2})/, '$1.$2.$3-$4');
            event.target.value = value;
        });
    }

    // Máscara para Cartão do SUS
    if (susCardInput) {
        susCardInput.addEventListener('input', (event) => {
            let value = event.target.value.replace(/\D/g, '').substring(0, 15);
            if (value.length > 11) {
                value = value.replace(/(\d{3})(\d{4})(\d{4})(\d{1,4})/, '$1 $2 $3 $4');
            } else if (value.length > 7) {
                value = value.replace(/(\d{3})(\d{4})(\d{1,4})/, '$1 $2 $3');
            } else if (value.length > 3) {
                value = value.replace(/(\d{3})(\d{1,4})/, '$1 $2');
            }
            event.target.value = value;
        });
    }

    // Máscara para Telefone
    if (phoneInput) {
        phoneInput.addEventListener('input', (event) => {
            let value = event.target.value.replace(/\D/g, '');
            value = value.substring(0, 11);

            if (value.length > 10) {
                value = value.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
            } else if (value.length > 6) {
                value = value.replace(/^(\d{2})(\d{4})(.*)/, '($1) $2-$3');
            } else if (value.length > 2) {
                value = value.replace(/^(\d{2})(.*)/, '($1) $2');
            } else if (value.length > 0) {
                value = value.replace(/^(\d*)/, '($1');
            }
            event.target.value = value;
        });
    }
});