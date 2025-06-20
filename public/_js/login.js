// _js/login.js

document.addEventListener('DOMContentLoaded', () => {

    // Seleciona os elementos do formulário
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const loginButton = document.getElementById('loginBtn');
    const usernameError = document.getElementById('username-error');
    const passwordError = document.getElementById('password-error');

    // --- Dados de exemplo ---
    // Em um sistema real, isso viria de um banco de dados.
    const mockUsers = {
        'atendente': 'senha123',
        'triador': 'senha123'
    };

    // Adiciona o evento de clique ao botão de login
    loginButton.addEventListener('click', () => {
        // 1. Limpa mensagens de erro antigas
        usernameError.textContent = '';
        passwordError.textContent = '';

        // 2. Coleta os valores dos inputs
        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();

        // 3. Validação dos campos
        let isValid = true;
        if (username === '') {
            usernameError.textContent = 'Por favor, insira o nome de usuário.';
            isValid = false;
        }
        if (password === '') {
            passwordError.textContent = 'Por favor, insira a senha.';
            isValid = false;
        }

        if (!isValid) {
            return; // Interrompe a função se a validação falhar
        }

        // 4. Simula a autenticação
        loginButton.disabled = true;
        loginButton.textContent = 'ENTRANDO...';

        setTimeout(() => {
            // Verifica se o usuário existe e se a senha está correta
            if (mockUsers[username] && mockUsers[username] === password) {
                // 5. Redirecionamento em caso de sucesso
                alert('Login bem-sucedido!');

                switch (username) {
                    case 'atendente':
                        window.location.href = 'atendente.html';
                        break;
                    case 'triador':
                        window.location.href = 'home_triador.html';
                        break;
                    default:
                        // Caso de segurança, embora improvável de acontecer aqui
                        passwordError.textContent = 'Perfil de usuário desconhecido.';
                }
            } else {
                // 6. Exibe erro de credenciais inválidas
                passwordError.textContent = 'Usuário ou senha inválidos.';
                loginButton.disabled = false;
                loginButton.textContent = 'ENTRAR';
            }
        }, 1000); // Atraso de 1 segundo para simular uma chamada de rede
    });
});