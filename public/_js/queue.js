// public/_js/queue.js

document.addEventListener('DOMContentLoaded', () => {

    // --- LÓGICA PARA EXIBIR NOME E FUNÇÃO DO USUÁRIO LOGADO E AJUSTAR LINK PRINCIPAL ---
    const userNameElement = document.getElementById('loggedInUserName');
    const userRoleElement = document.getElementById('loggedInUserRole');
    // Adicione um ID ao link "Principal" na sua queue.html, por exemplo: <a id="homeLink" href="#" ...>
    const homeLink = document.getElementById('homeLink'); 

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

            // --- Lógica para ajustar o link "Principal" usando userData do sessionStorage ---
            if (homeLink) {
                let homePath;
                // Use userData.role (que vem do backend como 'Atendente', 'Triador', 'Médico')
                switch(userData.role) {
                    case 'Atendente':
                        homePath = '/atendente';
                        break;
                    case 'Triador':
                        homePath = '/triador';
                        break;
                    case 'Médico':
                        homePath = '/medico';
                        break;
                    default:
                        homePath = '/'; // Fallback para a página de login ou uma página padrão
                }
                homeLink.href = homePath;
                // Remover a classe 'active' do link atual e adicionar ao 'Fila' se for o caso
                // Isso já está no seu HTML, mas é bom ter em mente para futuras navegações dinâmicas
                // Por exemplo: homeLink.classList.remove('active');
                // document.querySelector('.sidebar-nav a[href="/fila"]').classList.add('active');
            }

        } catch (e) {
            console.error('Erro ao fazer parse dos dados do usuário do sessionStorage na fila:', e);
            sessionStorage.removeItem('loggedInUser'); // Limpa dados inválidos
            // Opcional: Redirecionar para o login se os dados estiverem corrompidos
            // window.location.href = '/'; 
        }
    } else {
        console.warn('Nenhum dado de usuário encontrado no sessionStorage na fila. Redirecionando para o login.');
        // Se não houver dados no sessionStorage, assume que o usuário não está logado
        // E direciona para a página de login
        window.location.href = '/'; 
    }
    // --- FIM DA LÓGICA DE USUÁRIO LOGADO E LINK PRINCIPAL ---


    // --- Início do código da fila de atendimento (queue.js) ---
    const queueBody = document.getElementById('queue-body');

    // Só executa a lógica da fila se o elemento #queue-body existir na página
    if (queueBody) {

        // Mapeamento de cores para classes CSS
        function getPriorityBadgeClass(colorName) {
            switch (colorName.toLowerCase()) {
                case 'vermelho': return 'priority-red';
                case 'laranja': return 'priority-orange';
                case 'amarelo': return 'priority-yellow';
                case 'verde': return 'priority-green';
                case 'azul': return 'priority-blue';
                default: return 'priority-grey';
            }
        }

        // Mapeamento de cores para texto de prioridade
        function getPriorityText(colorName) {
            switch (colorName.toLowerCase()) {
                case 'vermelho': return 'Emergência';
                case 'laranja': return 'Muito Urgente';
                case 'amarelo': return 'Urgente';
                case 'verde': return 'Pouco Urgente';
                case 'azul': return 'Não Urgente';
                default: return 'Desconhecido';
            }
        }

        // Mapeamento de status para texto (mantido do seu código)
        function getStatusText(statusCode) {
            switch (statusCode) {
                case 0: return 'Aguardando Atendimento';
                case 1: return 'Em Atendimento';
                case 3: return 'Atendido'; // Verifique se este status 3 é o correto para "Atendido"
                case 4: return 'Não Compareceu';
                default: return 'Desconhecido';
            }
        }

        async function fetchPriorityQueue() {
            try {
                const response = await fetch('/api/priority-queue');
                if (!response.ok) {
                    throw new Error(`Erro HTTP! Status: ${response.status}`);
                }
                const patients = await response.json();
                displayQueue(patients);
            } catch (error) {
                console.error('Erro ao buscar a fila de prioridade:', error);
                queueBody.innerHTML = '<tr><td colspan="5">Erro ao carregar a fila de atendimento.</td></tr>';
            }
        }

        function displayQueue(patients) {
            queueBody.innerHTML = ''; // Limpa o conteúdo atual da tabela

            if (patients.length === 0) {
                queueBody.innerHTML = '<tr><td colspan="5">Nenhum paciente na fila de atendimento.</td></tr>';
                return;
            }

            patients.forEach((patient, index) => {
                const row = document.createElement('tr');
                const date = new Date(patient.queue_datetime);
                const formattedDate = date.toLocaleDateString('pt-BR');
                const formattedTime = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

                row.innerHTML = `
                    <td>${(index + 1).toString().padStart(3, '0')}</td>
                    <td>${patient.patient_name}</td>
                    <td>
                        <span class="priority-badge ${getPriorityBadgeClass(patient.color_name)}">
                            ${getPriorityText(patient.color_name)}
                        </span>
                    </td>
                    <td>${getStatusText(patient.queue_status)}</td>
                    <td>${formattedDate} ${formattedTime}</td>
                `;
                queueBody.appendChild(row);
            });
        }

        // Carrega a fila quando a página é carregada
        fetchPriorityQueue();

        // Habilitar a atualização automática da fila a cada 5 segundos
        setInterval(fetchPriorityQueue, 5000);
    }
    // --- Fim do código da fila de atendimento ---
});