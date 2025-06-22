// public/_js/doctor.js

document.addEventListener('DOMContentLoaded', () => {
    // Referências aos elementos da UI
    const doctorQueueBody = document.getElementById('doctor-queue-body');
    const patientQueueSection = document.getElementById('patient-queue');
    const medicalConsultationSection = document.getElementById('medical-consultation');

    // Elementos da seção de dados do paciente
    const displayPatientName = document.getElementById('display-patient-name');
    const displayPatientDob = document.getElementById('display-patient-dob');
    const displayPatientGender = document.getElementById('display-patient-gender');

    // Elementos da seção de dados da triagem
    const triageWeight = document.getElementById('triage-weight');
    const triageTemperature = document.getElementById('triage-temperature');
    const triageOxygenSaturation = document.getElementById('triage-oxygen-saturation');
    const triageBloodPressure = document.getElementById('triage-blood-pressure');
    const triageGlucose = document.getElementById('triage-glucose');
    const triageSymptoms = document.getElementById('triage-symptoms');

    // Elementos do formulário de parecer médico
    const medicalOpinionTextarea = document.getElementById('medical-opinion');
    const startConsultationBtn = document.getElementById('start-consultation-btn');
    const callAgainBtn = document.getElementById('call-again-btn');
    const noShowBtn = document.getElementById('no-show-btn');
    const endConsultationBtn = document.getElementById('end-consultation-btn');
    const medicalReportForm = document.querySelector('.medical-report-form');

    let currentPatientData = null; // Armazena os dados do paciente atualmente em consulta
    let isConsultationActive = false; // Flag para controlar se uma consulta está ativa
    const DOCTOR_ID = 1; // ID fixo do médico por enquanto (substituir por um sistema de login real)

    // --- Funções Auxiliares ---

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

    // Formatar data de nascimento para DD/MM/AAAA
    function formatDate(isoDateString) {
        if (!isoDateString) return '';
        const date = new Date(isoDateString);
        return date.toLocaleDateString('pt-BR');
    }

    // NOVO: Mapeamento de gênero de numérico para texto
    function getGenderText(genderCode) {
        switch (String(genderCode)) { // Converter para string para garantir comparação
            case '1': return 'Masculino';
            case '2': return 'Feminino';
            case '3': return 'Outro';
            default: return 'Não Informado';
        }
    }

    // --- Funções de Requisição ao Backend ---

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
            doctorQueueBody.innerHTML = '<tr><td colspan="6">Erro ao carregar a fila de atendimento.</td></tr>';
        }
    }

    async function fetchTriageDetails(patientId, triageId) {
        try {
            const response = await fetch(`/api/triage-details/${patientId}/${triageId}`);
            if (!response.ok) {
                throw new Error(`Erro HTTP! Status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Erro ao buscar detalhes da triagem:', error);
            alert('Não foi possível carregar os detalhes da triagem.');
            return null;
        }
    }

    async function updatePatientStatusInQueue(queueId, status) {
        try {
            const response = await fetch(`/api/priority-queue/${queueId}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: status })
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Erro ao atualizar status: ${response.status} - ${errorData.message}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Erro ao atualizar status do paciente na fila:', error);
            alert('Não foi possível atualizar o status do paciente.');
            return null;
        }
    }

    async function registerAppointment(patientId, doctorId, observations) {
        try {
            const response = await fetch('/api/appointment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    patient_id: patientId,
                    doctor_id: doctorId,
                    datetime: new Date().toISOString(),
                    observations: observations
                })
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Erro ao registrar atendimento: ${response.status} - ${errorData.message}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Erro ao registrar atendimento:', error);
            alert('Não foi possível registrar o atendimento.');
            return null;
        }
    }

    // --- Funções de Renderização da UI ---

    // Exibe os pacientes na tabela da fila
    function displayQueue(patients) {
        doctorQueueBody.innerHTML = ''; // Limpa o conteúdo atual da tabela

        if (patients.length === 0) {
            doctorQueueBody.innerHTML = '<tr><td colspan="6">Nenhum paciente na fila de atendimento.</td></tr>';
            return;
        }

        patients.forEach((patient, index) => {
            const row = document.createElement('tr');
            const triageDate = new Date(patient.triage_datetime);
            const formattedTriageDate = triageDate.toLocaleDateString('pt-BR');
            const formattedTriageTime = triageDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

            // Armazena dados essenciais no dataset da linha para fácil acesso
            row.dataset.patientId = patient.patient_id;
            row.dataset.queueId = patient.queue_id;
            row.dataset.triageId = patient.triage_id;
            row.dataset.queueStatus = patient.queue_status; // Adiciona o status da fila ao dataset

            let actionButtonHtml = '';
            let buttonClass = 'action-button';
            let buttonText = '';
            let isDisabled = false;

            if (isConsultationActive) { // Se uma consulta está ativa
                if (currentPatientData && currentPatientData.queue_id === patient.queue_id) {
                    // É o paciente que está em consulta
                    buttonText = 'Visualizar Consulta';
                    buttonClass += ' active';
                    isDisabled = false; // Deve ser clicável para reabrir
                } else {
                    // Outros pacientes enquanto uma consulta está ativa
                    buttonText = getStatusText(patient.queue_status); // Mostra o status real
                    buttonClass += ' inactive';
                    isDisabled = true; // Desabilita outros botões "Chamar"
                }
            } else { // Nenhuma consulta ativa
                if (patient.queue_status === 0) { // Aguardando
                    buttonText = 'Chamar Paciente';
                    buttonClass += ' call-patient-btn';
                    isDisabled = false;
                } else if (patient.queue_status === 1) { // Em Atendimento (alguém estava atendendo, mas não esta sessão)
                    buttonText = 'Visualizar Consulta';
                    buttonClass += ' active';
                    isDisabled = false; // Sempre clicável para o médico pegar a consulta
                } else { // Outros status (Atendido, Não Compareceu) - não deveriam aparecer com a query atual, mas para segurança
                    buttonText = getStatusText(patient.queue_status);
                    buttonClass += ' disabled-btn';
                    isDisabled = true;
                }
            }

            actionButtonHtml = `<button class="${buttonClass}" ${isDisabled ? 'disabled' : ''}>${buttonText}</button>`;

            row.innerHTML = `
                <td>${(index + 1).toString().padStart(3, '0')}</td>
                <td>${patient.patient_name}</td>
                <td><span class="priority-badge ${getPriorityBadgeClass(patient.color_name)}">${getPriorityText(patient.color_name)}</span></td>
                <td>${formattedTriageDate} ${formattedTriageTime}</td>
                <td>${getStatusText(patient.queue_status)}</td>
                <td>${actionButtonHtml}</td>
            `;
            doctorQueueBody.appendChild(row);
        });

        // Adiciona event listeners aos novos botões "Chamar Paciente" ou "Visualizar Consulta"
        document.querySelectorAll('.action-button:not(.disabled-btn)').forEach(button => {
            button.addEventListener('click', handleActionButtonClick);
        });
    }

    // Preenche a seção de consulta com os dados do paciente e triagem
    function populateConsultationSection(patientData, triageData) {
        // --- DEPURANDO O NOME UNDEFINED ---
        console.log('Dados do paciente recebidos para preenchimento:', patientData);
        console.log('Dados da triagem recebidos para preenchimento:', triageData);
        // --- FIM DA DEPURAGEM ---

        // Dados do paciente
        displayPatientName.textContent = patientData.patient_name || 'Nome Indisponível'; // Fallback para "Nome Indisponível"
        displayPatientDob.textContent = `Data de Nascimento: ${formatDate(patientData.birth_date)}`;
        displayPatientGender.textContent = `Gênero: ${getGenderText(patientData.gender)}`; // Usar a função auxiliar aqui

        // Dados da triagem
        triageWeight.textContent = triageData.weight !== null && triageData.weight !== undefined ? `${triageData.weight}kg` : 'N/A';
        triageTemperature.textContent = triageData.temperature !== null && triageData.temperature !== undefined ? `${triageData.temperature}°C` : 'N/A';
        triageOxygenSaturation.textContent = triageData.oxygen_saturation !== null && triageData.oxygen_saturation !== undefined ? `${triageData.oxygen_saturation}%` : 'N/A';
        triageBloodPressure.textContent = triageData.blood_pressure || 'N/A';
        triageGlucose.textContent = triageData.glucose !== null && triageData.glucose !== undefined ? `${triageData.glucose} mg/dL` : 'N/A';
        triageSymptoms.textContent = triageData.symptoms || 'N/A';

        // Resetar e gerenciar botões e textarea
        medicalOpinionTextarea.value = '';
        medicalOpinionTextarea.readOnly = true;
        startConsultationBtn.style.display = 'block';
        callAgainBtn.style.display = 'none';
        noShowBtn.style.display = 'none';
        endConsultationBtn.style.display = 'none';
    }

    // Limpa a seção de consulta
    function clearConsultationSection() {
        displayPatientName.textContent = '';
        displayPatientDob.textContent = '';
        displayPatientGender.textContent = '';
        triageWeight.textContent = '';
        triageTemperature.textContent = '';
        triageOxygenSaturation.textContent = '';
        triageBloodPressure.textContent = '';
        triageGlucose.textContent = '';
        triageSymptoms.textContent = '';
        medicalOpinionTextarea.value = '';
        medicalOpinionTextarea.readOnly = true;
        startConsultationBtn.style.display = 'block';
        callAgainBtn.style.display = 'none';
        noShowBtn.style.display = 'none';
        endConsultationBtn.style.display = 'none';
    }

    // --- Handlers de Eventos ---

    // Lida com o clique nos botões de ação da fila (Chamar Paciente / Visualizar Consulta)
    async function handleActionButtonClick(event) {
        const row = event.target.closest('tr');
        const patientId = row.dataset.patientId;
        const queueId = row.dataset.queueId;
        const triageId = row.dataset.triageId;
        const queueStatus = parseInt(row.dataset.queueStatus); // Obter o status da fila

        // Armazena os dados do paciente atual para uso em outras funções
        currentPatientData = { patient_id: patientId, queue_id: queueId, triage_id: triageId, queue_status: queueStatus };

        // 1. Mudar status para "Em Atendimento" (status 1) SOMENTE se o paciente estava "Aguardando" (status 0)
        if (queueStatus === 0) {
            const updateStatusRes = await updatePatientStatusInQueue(queueId, 1);
            if (!updateStatusRes) {
                currentPatientData = null; // Limpa o paciente atual se a atualização falhar
                fetchPriorityQueue(); // Recarrega a fila para o estado anterior
                return;
            }
            // Atualiza o status localmente para refletir a mudança
            currentPatientData.queue_status = 1;
        }

        // 2. Buscar dados da triagem e do paciente
        const triageDetails = await fetchTriageDetails(patientId, triageId);
        if (triageDetails) {
            // 3. Preencher a seção de consulta
            populateConsultationSection(triageDetails, triageDetails); // Ambos usam triageDetails para preencher

            // 4. Mudar a visibilidade das seções
            patientQueueSection.style.display = 'none'; // Esconde a fila
            medicalConsultationSection.style.display = 'block'; // Mostra a seção de consulta
            isConsultationActive = true; // Define que há uma consulta ativa
            fetchPriorityQueue(); // Recarrega a fila para atualizar o estado dos botões
        } else {
            // Caso não consiga carregar os detalhes, reverte o status se foi alterado
            if (queueStatus === 0) { // Se o status foi alterado para 1, reverter para 0
                await updatePatientStatusInQueue(queueId, 0);
            }
            currentPatientData = null;
            isConsultationActive = false;
            fetchPriorityQueue();
        }
    }

    // Lida com o clique no botão "Iniciar Consulta"
    startConsultationBtn.addEventListener('click', () => {
        medicalOpinionTextarea.readOnly = false;
        medicalOpinionTextarea.focus();
        startConsultationBtn.style.display = 'none';
        endConsultationBtn.style.display = 'block';
        callAgainBtn.style.display = 'block';
        noShowBtn.style.display = 'block';
    });

    // Lida com o clique no botão "Encerrar Consulta"
    endConsultationBtn.addEventListener('click', async (event) => {
        event.preventDefault();

        if (!currentPatientData) {
            // Substituir por modal personalizado
            alert('Nenhum paciente selecionado para encerrar consulta.');
            return;
        }

        const medicalOpinion = medicalOpinionTextarea.value.trim();
        if (!medicalOpinion) {
            // Substituir por modal personalizado
            alert('Por favor, insira o parecer do médico antes de encerrar a consulta.');
            return;
        }

        // 1. Registrar o atendimento
        const appointmentRes = await registerAppointment(currentPatientData.patient_id, DOCTOR_ID, medicalOpinion);
        if (!appointmentRes) return;

        // 2. Mudar status do paciente na fila para "Atendido" (status 3)
        const updateStatusRes = await updatePatientStatusInQueue(currentPatientData.queue_id, 3);
        if (!updateStatusRes) return;

        // 3. Limpar e reverter a UI
        clearConsultationSection();
        medicalConsultationSection.style.display = 'none';
        patientQueueSection.style.display = 'block';
        currentPatientData = null; // Limpa o paciente atual
        isConsultationActive = false; // Nenhuma consulta ativa
        fetchPriorityQueue(); // Recarrega a fila
    });

    // Lida com o clique no botão "Não Compareceu"
    noShowBtn.addEventListener('click', async () => {
        if (!currentPatientData) {
            // Substituir por modal personalizado
            alert('Nenhum paciente selecionado.');
            return;
        }

        // Substituir por modal de confirmação personalizado
        const confirmNoShow = confirm('Tem certeza que deseja marcar este paciente como "Não Compareceu"? Ele será removido da fila.');
        if (!confirmNoShow) return;

        // Mudar status do paciente na fila para "Não Compareceu" (status 4)
        const updateStatusRes = await updatePatientStatusInQueue(currentPatientData.queue_id, 4);
        if (!updateStatusRes) return;

        // Limpar e reverter a UI
        clearConsultationSection();
        medicalConsultationSection.style.display = 'none';
        patientQueueSection.style.display = 'block';
        currentPatientData = null;
        isConsultationActive = false;
        fetchPriorityQueue();
    });

    // Lida com o clique no botão "Chamar Novamente"
    callAgainBtn.addEventListener('click', async () => {
        if (!currentPatientData) {
            alert('Nenhum paciente selecionado para chamar novamente.');
            return;
        }
        // Substituir por notificação mais robusta
        alert('Chamando paciente novamente!');
    });


    // --- Inicialização ---
    fetchPriorityQueue(); // Carrega a fila quando a página é carregada
    setInterval(fetchPriorityQueue, 15000); // Atualiza a fila a cada 15 segundos
});