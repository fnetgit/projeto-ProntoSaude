document.addEventListener('DOMContentLoaded', () => {
    const tabButtons = document.querySelectorAll('.tab-button');
    const registrationForm = document.getElementById('register-patient-form');
    const searchForm = document.getElementById('search-patient-form');

    if (registrationForm && searchForm) {
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                tabButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                const tab = button.getAttribute('data-tab');
                if (tab === 'register') {
                    registrationForm.style.display = 'block';
                    searchForm.style.display = 'none';
                } else {
                    registrationForm.style.display = 'none';
                    searchForm.style.display = 'block';
                }
            });
        });
    }

    const searchInput = document.querySelector('.search-bar input');
    if (searchInput) {
        searchInput.addEventListener('input', (event) => {
            console.log('Searching for:', event.target.value);
        });
    }

    const cpfInput = document.getElementById('cpf');
    const susCardInput = document.getElementById('sus_card');
    const phoneInput = document.getElementById('phone');

    if (cpfInput) {
        cpfInput.addEventListener('input', (event) => {
            let value = event.target.value.replace(/\D/g, '').substring(0, 11);
            value = value.replace(/(\d{3})(\d)/, '$1.$2');
            value = value.replace(/(\d{3})\.(\d{3})(\d)/, '$1.$2.$3');
            value = value.replace(/(\d{3})\.(\d{3})\.(\d{3})(\d{1,2})/, '$1.$2.$3-$4');
            event.target.value = value;
        });
    }

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


document.addEventListener('DOMContentLoaded', () => {
    const userNameElement = document.getElementById('loggedInUserName');
    const userRoleElement = document.getElementById('loggedInUserRole');
    const userDataString = sessionStorage.getItem('loggedInUser');

    if (userDataString) {
        try {
            const userData = JSON.parse(userDataString);
            if (userNameElement) {
                userNameElement.textContent = userData.username;
            }
            if (userRoleElement) {
                userRoleElement.textContent = userData.role;
            }
        } catch (e) {
            console.error('Erro ao fazer parse dos dados do usuário do sessionStorage:', e);
            sessionStorage.removeItem('loggedInUser');
        }
    } else {
        console.warn('Nenhum dado de usuário encontrado no sessionStorage.');
        if (userNameElement) userNameElement.textContent = 'Visitante';
        if (userRoleElement) userRoleElement.textContent = 'Desconhecido';
    }
});