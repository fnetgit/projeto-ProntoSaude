// public/_js/doctor.js

document.addEventListener('DOMContentLoaded', () => {
    // Função para exibir os dados do usuário logado no cabeçalho
    function displayUserData() {
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
                if (userNameElement) userNameElement.textContent = 'Visitante';
                if (userRoleElement) userRoleElement.textContent = 'Desconhecido';
            }
        } else {
            console.warn('Nenhum dado de usuário encontrado no sessionStorage para o médico.');
            if (userNameElement) userNameElement.textContent = 'Visitante';
            if (userRoleElement) userRoleElement.textContent = 'Desconhecido';
            // Opcional: Redirecionar para o login se o usuário não estiver logado
            // if (!window.location.pathname.includes('/login')) {
            //     window.location.href = '/';
            // }
        }
    }

    // Referências aos elementos da UI
    const doctorQueueBody = document.getElementById('doctor-queue-body');
    const patientQueueSection = document.getElementById('patient-queue');
    const medicalConsultationSection = document.getElementById('medical-consultation');
    const displayPatientName = document.getElementById('display-patient-name');
    const displayPatientDob = document.getElementById('display-patient-dob');
    const displayPatientGender = document.getElementById('display-patient-gender');
    const triageWeight = document.getElementById('triage-weight');
    const triageTemperature = document.getElementById('triage-temperature');
    const triageOxygenSaturation = document.getElementById('triage-oxygen-saturation');
    const triageBloodPressure = document.getElementById('triage-blood-pressure');
    const triageGlucose = document.getElementById('triage-glucose');
    const triageSymptoms = document.getElementById('triage-symptoms');
    const medicalOpinionTextarea = document.getElementById('medical-opinion');
    const startConsultationBtn = document.getElementById('start-consultation-btn');
    const callAgainBtn = document.getElementById('call-again-btn');
    const noShowBtn = document.getElementById('no-show-btn');
    const endConsultationBtn = document.getElementById('end-consultation-btn');
    const medicalReportForm = document.querySelector('.medical-report-form');

    let currentPatientData = null;
    let isConsultationActive = false;
    const DOCTOR_ID = 1;

    // --- Funções Auxiliares ---
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

    function getStatusText(statusCode) {
        switch (statusCode) {
            case 0: return 'Aguardando Atendimento';
            case 1: return 'Em Atendimento';
            case 3: return 'Atendido';
            case 4: return 'Não Compareceu';
            default: return 'Desconhecido';
        }
    }

    function formatDate(isoDateString) {
        if (!isoDateString) return '';
        const date = new Date(isoDateString);
        return date.toLocaleDateString('pt-BR');
    }

    function getGenderText(genderCode) {
        switch (String(genderCode)) {
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
    function displayQueue(patients) {
        doctorQueueBody.innerHTML = '';

        if (patients.length === 0) {
            doctorQueueBody.innerHTML = '<tr><td colspan="6">Nenhum paciente na fila de atendimento.</td></tr>';
            return;
        }

        patients.forEach((patient, index) => {
            const row = document.createElement('tr');
            const triageDate = new Date(patient.triage_datetime);
            const formattedTriageDate = triageDate.toLocaleDateString('pt-BR');
            const formattedTriageTime = triageDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

            row.dataset.patientId = patient.patient_id;
            row.dataset.queueId = patient.queue_id;
            row.dataset.triageId = patient.triage_id;
            row.dataset.queueStatus = patient.queue_status;

            let actionButtonHtml = '';
            let buttonClass = 'action-button';
            let buttonText = '';
            let isDisabled = false;

            if (isConsultationActive) {
                if (currentPatientData && currentPatientData.queue_id === patient.queue_id) {
                    buttonText = 'Visualizar Consulta';
                    buttonClass += ' active';
                    isDisabled = false;
                } else {
                    buttonText = getStatusText(patient.queue_status);
                    buttonClass += ' inactive';
                    isDisabled = true;
                }
            } else {
                if (patient.queue_status === 0) {
                    buttonText = 'Chamar Paciente';
                    buttonClass += ' call-patient-btn';
                    isDisabled = false;
                } else if (patient.queue_status === 1) {
                    buttonText = 'Visualizar Consulta';
                    buttonClass += ' active';
                    isDisabled = false;
                } else {
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

        document.querySelectorAll('.action-button:not(.disabled-btn)').forEach(button => {
            button.addEventListener('click', handleActionButtonClick);
        });
    }

    function populateConsultationSection(patientData, triageData) {
        console.log('Dados do paciente recebidos para preenchimento:', patientData);
        console.log('Dados da triagem recebidos para preenchimento:', triageData);

        displayPatientName.textContent = patientData.patient_name || 'Nome Indisponível';
        displayPatientDob.textContent = `Data de Nascimento: ${formatDate(patientData.birth_date)}`;
        displayPatientGender.textContent = `Gênero: ${getGenderText(patientData.gender)}`;

        triageWeight.textContent = triageData.weight !== null && triageData.weight !== undefined ? `${triageData.weight}kg` : 'N/A';
        triageTemperature.textContent = triageData.temperature !== null && triageData.temperature !== undefined ? `${triageData.temperature}°C` : 'N/A';
        triageOxygenSaturation.textContent = triageData.oxygen_saturation !== null && triageData.oxygen_saturation !== undefined ? `${triageData.oxygen_saturation}%` : 'N/A';
        triageBloodPressure.textContent = triageData.blood_pressure || 'N/A';
        triageGlucose.textContent = triageData.glucose !== null && triageData.glucose !== undefined ? `${triageData.glucose} mg/dL` : 'N/A';
        triageSymptoms.textContent = triageData.symptoms || 'N/A';

        medicalOpinionTextarea.value = '';
        medicalOpinionTextarea.readOnly = true;
        startConsultationBtn.style.display = 'block';
        callAgainBtn.style.display = 'none';
        noShowBtn.style.display = 'none';
        endConsultationBtn.style.display = 'none';
    }

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
    async function handleActionButtonClick(event) {
        const row = event.target.closest('tr');
        const patientId = row.dataset.patientId;
        const queueId = row.dataset.queueId;
        const triageId = row.dataset.triageId;
        const queueStatus = parseInt(row.dataset.queueStatus);

        currentPatientData = { patient_id: patientId, queue_id: queueId, triage_id: triageId, queue_status: queueStatus };

        if (queueStatus === 0) {
            const updateStatusRes = await updatePatientStatusInQueue(queueId, 1);
            if (!updateStatusRes) {
                currentPatientData = null;
                fetchPriorityQueue();
                return;
            }
            currentPatientData.queue_status = 1;
        }

        const triageDetails = await fetchTriageDetails(patientId, triageId);
        if (triageDetails) {
            populateConsultationSection(triageDetails, triageDetails);
            patientQueueSection.style.display = 'none';
            medicalConsultationSection.style.display = 'block';
            isConsultationActive = true;
            fetchPriorityQueue();
        } else {
            if (queueStatus === 0) {
                await updatePatientStatusInQueue(queueId, 0);
            }
            currentPatientData = null;
            isConsultationActive = false;
            fetchPriorityQueue();
        }
    }

    startConsultationBtn.addEventListener('click', () => {
        medicalOpinionTextarea.readOnly = false;
        medicalOpinionTextarea.focus();
        startConsultationBtn.style.display = 'none';
        endConsultationBtn.style.display = 'block';
        callAgainBtn.style.display = 'block';
        noShowBtn.style.display = 'block';
    });

    endConsultationBtn.addEventListener('click', async (event) => {
        event.preventDefault();

        if (!currentPatientData) {
            alert('Nenhum paciente selecionado para encerrar consulta.');
            return;
        }

        const medicalOpinion = medicalOpinionTextarea.value.trim();
        if (!medicalOpinion) {
            alert('Por favor, insira o parecer do médico antes de encerrar a consulta.');
            return;
        }

        const appointmentRes = await registerAppointment(currentPatientData.patient_id, DOCTOR_ID, medicalOpinion);
        if (!appointmentRes) return;

        const updateStatusRes = await updatePatientStatusInQueue(currentPatientData.queue_id, 3);
        if (!updateStatusRes) return;

        clearConsultationSection();
        medicalConsultationSection.style.display = 'none';
        patientQueueSection.style.display = 'block';
        currentPatientData = null;
        isConsultationActive = false;
        fetchPriorityQueue();
    });

    noShowBtn.addEventListener('click', async () => {
        if (!currentPatientData) {
            alert('Nenhum paciente selecionado.');
            return;
        }

        const confirmNoShow = confirm('Tem certeza que deseja marcar este paciente como "Não Compareceu"? Ele será removido da fila.');
        if (!confirmNoShow) return;

        const updateStatusRes = await updatePatientStatusInQueue(currentPatientData.queue_id, 4);
        if (!updateStatusRes) return;

        clearConsultationSection();
        medicalConsultationSection.style.display = 'none';
        patientQueueSection.style.display = 'block';
        currentPatientData = null;
        isConsultationActive = false;
        fetchPriorityQueue();
    });

    callAgainBtn.addEventListener('click', async () => {
        if (!currentPatientData) {
            alert('Nenhum paciente selecionado para chamar novamente.');
            return;
        }
        alert('Chamando paciente novamente!');
    });


    // --- Inicialização ---
    function initializePage() {
        displayUserData(); // <-- Exibe os dados do usuário no cabeçalho
        fetchPriorityQueue(); // Carrega a fila quando a página é carregada
        setInterval(fetchPriorityQueue, 15000); // Atualiza a fila a cada 15 segundos
    }

    initializePage(); // Chama a função de inicialização
});