// public/_js/queue.js

document.addEventListener('DOMContentLoaded', () => {
    // --- Início do código para alterar o link do atendente ---
    const principalLink = document.querySelector('.sidebar-nav a[href*="/atendente"]');

    if (principalLink && document.referrer) {
        // Verifica se a página anterior (referrer) termina com '/triador'
        if (document.referrer.endsWith('/triador')) {
            // Se sim, muda o link "Principal" para voltar para o triador
            principalLink.href = '/triador';
        }
    }
    // --- Fim do código para alterar o link do atendente ---


    // --- Início do código da fila de atendimento (queue.js) ---
    const queueBody = document.getElementById('queue-body');

    // Só executa a lógica da fila se o elemento #queue-body existir na página
    if (queueBody) {
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
                    <td>${patient.patientName}</td>
                    <td>
                        <span class="priority-badge ${getPriorityBadgeClass(patient.color_name)}">
                            ${getPriorityText(patient.color_name)}
                        </span>
                    </td>
                    <td>Aguardando Atendimento</td>
                    <td>${formattedDate} ${formattedTime}</td>
                `;
                queueBody.appendChild(row);
            });
        }

        // Carrega a fila quando a página é carregada
        fetchPriorityQueue();

        // Opcional: Atualizar a fila a cada X segundos
        // setInterval(fetchPriorityQueue, 15000);
    }
    // --- Fim do código da fila de atendimento ---
});