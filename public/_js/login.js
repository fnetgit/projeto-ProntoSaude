// login.js

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const errorMessageDiv = document.getElementById('errorMessage');

    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const username = usernameInput.value;
        const password = passwordInput.value;

        errorMessageDiv.textContent = '';

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (response.ok) {
                sessionStorage.setItem('loggedInUser', JSON.stringify({
                    username: data.username,
                    role: data.role
                }));

                window.location.href = data.redirectUrl;
            } else {
                errorMessageDiv.textContent = data.message || 'Erro ao fazer login.';
            }
        } catch (error) {
            console.error('Erro de rede ou servidor:', error);
            errorMessageDiv.textContent = 'Não foi possível conectar ao servidor. Tente novamente.';
        }
    });
});