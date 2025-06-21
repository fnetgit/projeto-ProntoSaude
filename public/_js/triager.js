document.addEventListener('DOMContentLoaded', () => {
    // Elementos da UI
    const triageQueueList = document.getElementById('triage-queue-list');
    const triageDataFormSection = document.getElementById('triage-data-form');
    const triageQueueBody = document.getElementById('triage-queue-body');
    // Busca o elemento pelo ID CORRETO que está no HTML
    const prioritySelect = document.getElementById('priority_classification');
    const triageForm = document.getElementById('triage-form-element');
    const displayPatientName = document.getElementById('display-patient-name');
    const displayPatientDob = document.getElementById('display-patient-dob');
    const patientIdInput = document.getElementById('patient_id');
    const serviceIdInput = document.getElementById('service_id');
    const backButton = document.querySelector('.back-button');

    // Mapa para exibir textos mais amigáveis no select
    const classificationTextMap = {
        'Vermelho': 'Vermelho (Emergência)',
        'Laranja': 'Laranja (Muito Urgente)',
        'Amarelo': 'Amarelo (Urgente)',
        'Verde': 'Verde (Pouco Urgente)',
        'Azul': 'Azul (Não Urgente)'
    };

    // Função que aplica a cor no select ao mudar a opção
    const applyColorToSelect = () => {
        if (!prioritySelect || prioritySelect.selectedIndex === -1) return;

        const selectedOptionText = prioritySelect.options[prioritySelect.selectedIndex].textContent.toLowerCase();
        const colorMap = {
            'vermelho': 'priority-red', 'laranja': 'priority-orange',
            'amarelo': 'priority-yellow', 'verde': 'priority-green',
            'azul': 'priority-blue'
        };

        // Remove todas as classes de cor anteriores
        prioritySelect.classList.remove(...Object.values(colorMap));

        // Adiciona a classe de cor correta
        for (const colorName in colorMap) {
            if (selectedOptionText.includes(colorName)) {
                prioritySelect.classList.add(colorMap[colorName]);
                break;
            }
        }
    };

    // Adiciona o "ouvinte" de evento para mudar a cor
    if (prioritySelect) {
        prioritySelect.addEventListener('change', applyColorToSelect);
    }

    // Carrega as classificações do banco de dados
    async function loadClassifications() {
        if (!prioritySelect) return;
        try {
            const response = await fetch('/api/classifications');
            if (!response.ok) throw new Error('Falha ao buscar classificações.');
            const classifications = await response.json();
            prioritySelect.innerHTML = '<option value="" disabled selected>Selecione a prioridade</option>';
            classifications.forEach(cls => {
                const option = document.createElement('option');
                option.value = cls.classification_id;
                option.textContent = classificationTextMap[cls.color_name] || cls.color_name;
                prioritySelect.appendChild(option);
            });
        } catch (error) {
            console.error('Erro ao carregar classificações:', error);
            prioritySelect.innerHTML = '<option value="" disabled>Erro ao carregar</option>';
        }
    }

    // Carrega os pacientes na fila de triagem
    async function loadTriageQueue() {
        try {
            const response = await fetch('/api/queue-patients');
            if (!response.ok) throw new Error('Falha ao buscar pacientes.');
            const patients = await response.json();
            renderTriageQueue(patients);
        } catch (error) {
            console.error('Erro ao carregar fila de triagem:', error);
            triageQueueBody.innerHTML = `<tr><td colspan="6">Erro ao carregar a fila.</td></tr>`;
        }
    }

    // Renderiza a tabela de pacientes
    function renderTriageQueue(patients) {
        triageQueueBody.innerHTML = '';
        if (patients.length === 0) {
            triageQueueBody.innerHTML = `<tr><td colspan="6">Nenhum paciente aguardando triagem.</td></tr>`;
            return;
        }
        patients.forEach(patient => {
            const birthDate = new Date(patient.birth_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${patient.patient_name}</td>
                <td>${patient.cpf}</td>
                <td>${patient.sus_card}</td>
                <td>${patient.phone || 'N/A'}</td>
                <td>${birthDate}</td>
                <td>
                    <button class="initiate-button active" data-patient-id="${patient.patient_id}" data-service-id="${patient.service_id}" data-patient-name="${patient.patient_name}" data-birth-date="${birthDate}">Triar</button>
                    <button class="remove-button" data-service-id="${patient.service_id}">Remover</button>
                </td>
            `;
            triageQueueBody.appendChild(row);
        });
    }

    // Alterna entre a lista e o formulário
    function showTriageForm(show) {
        triageQueueList.style.display = show ? 'none' : 'block';
        triageDataFormSection.style.display = show ? 'block' : 'none';
        if (!show) {
            triageForm.reset();
            // Reseta a cor do select ao voltar
            if (prioritySelect) {
                prioritySelect.classList.remove('priority-red', 'priority-orange', 'priority-yellow', 'priority-green', 'priority-blue');
            }
        }
    }

    // Lida com cliques nos botões da tabela
    triageQueueBody.addEventListener('click', async (event) => {
        const target = event.target;
        if (target.classList.contains('initiate-button')) {
            patientIdInput.value = target.dataset.patientId;
            serviceIdInput.value = target.dataset.serviceId;
            displayPatientName.textContent = target.dataset.patientName;
            displayPatientDob.textContent = `Nascimento: ${target.dataset.birthDate}`;
            showTriageForm(true);
        }
        if (target.classList.contains('remove-button')) {
            const serviceId = target.dataset.serviceId;
            if (confirm('Marcar este paciente como "Não Compareceu"?')) {
                try {
                    const response = await fetch(`/api/queue/${serviceId}`, { method: 'DELETE' });
                    const result = await response.json();
                    if (!response.ok) throw new Error(result.message);
                    alert(result.message);
                    loadTriageQueue();
                } catch (error) {
                    alert(`Erro: ${error.message}`);
                }
            }
        }
    });

    // Lida com a submissão do formulário de triagem
    triageForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const formData = new FormData(triageForm);
        const triageData = Object.fromEntries(formData.entries());
        try {
            const response = await fetch('/api/triage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(triageData),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);
            alert(result.message);
            showTriageForm(false);
            loadTriageQueue();
        } catch (error) {
            alert(`Erro ao registrar triagem: ${error.message}`);
        }
    });

    // Botão de voltar
    backButton.addEventListener('click', () => showTriageForm(false));

    // Inicialização da página
    loadClassifications();
    loadTriageQueue();
});
