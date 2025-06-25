// public/_js/queue.js

document.addEventListener('DOMContentLoaded', () => {

    // --- LÓGICA PARA EXIBIR NOME E FUNÇÃO DO USUÁRIO LOGADO E AJUSTAR LINK PRINCIPAL --- Verificar isso !!!!!!!!!
    const userNameElement = document.getElementById('loggedInUserName');
    const userRoleElement = document.getElementById('loggedInUserRole');
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

            if (homeLink) {
                let homePath;
                switch (userData.role) {
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
                        homePath = '/';
                }
                homeLink.href = homePath;
            }

        } catch (e) {
            console.error('Erro ao fazer parse dos dados do usuário do sessionStorage na fila:', e);
            sessionStorage.removeItem('loggedInUser');

        }
    } else {
        console.warn('Nenhum dado de usuário encontrado no sessionStorage na fila. Redirecionando para o login.');
        window.location.href = '/';
    }


    const queueBody = document.getElementById('queue-body');

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

        // Mapeamento de status para texto
        function getStatusText(statusCode) {
            switch (statusCode) {
                case 0: return 'Aguardando Atendimento';
                case 1: return 'Em Atendimento';
                case 3: return 'Atendido';
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
            queueBody.innerHTML = '';

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
});