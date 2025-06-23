 document.addEventListener('DOMContentLoaded', () => {
            const loginForm = document.getElementById('loginForm');
            const usernameInput = document.getElementById('username');
            const passwordInput = document.getElementById('password');
            const errorMessageDiv = document.getElementById('errorMessage');

            loginForm.addEventListener('submit', async (event) => {
                event.preventDefault(); // Impede o envio padrão do formulário

                const username = usernameInput.value;
                const password = passwordInput.value;

                errorMessageDiv.textContent = ''; // Limpa mensagens de erro anteriores

                try {
                    const response = await fetch('/api/login', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ username, password })
                    });

                    const data = await response.json();

                    if (response.ok) { // Status 2xx indica sucesso
                        // Login bem-sucedido, redireciona para a URL recebida do servidor
                        window.location.href = data.redirectUrl;
                    } else {
                        // Login falhou, exibe a mensagem de erro do servidor
                        errorMessageDiv.textContent = data.message || 'Erro ao fazer login.';
                    }
                } catch (error) {
                    console.error('Erro de rede ou servidor:', error);
                    errorMessageDiv.textContent = 'Não foi possível conectar ao servidor. Tente novamente.';
                }
            });
        });
