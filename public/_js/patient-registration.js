// _js/patient-registration.js (Completo e Correto)
// RESPONSABILIDADE: Comunicação com a API e Gestão de Dados da tabela.

document.addEventListener('DOMContentLoaded', () => {
    const patientRegistrationForm = document.querySelector('#register-patient-form form');
    const patientTableTbody = document.getElementById('patient-list-body');
    const tabButtons = document.querySelectorAll('.tab-button');

    // --- FUNÇÕES AUXILIARES DE FORMATAÇÃO (APENAS PARA EXIBIÇÃO NA TABELA) ---

    function formatCpf(cpf) {
        if (!cpf) return '';
        const cleaned = cpf.replace(/\D/g, '');
        return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }

    function formatSusCard(susCard) {
        if (!susCard) return '';
        const cleaned = susCard.replace(/\D/g, '');
        return cleaned.replace(/(\d{3})(\d{4})(\d{4})(\d{4})/, '$1 $2 $3 $4');
    }

    function formatPhone(phone) {
        if (!phone) return '';
        const cleaned = phone.replace(/\D/g, '');
        if (cleaned.length === 11) {
            return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
        } else if (cleaned.length === 10) {
            return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
        }
        return phone; // Retorna o número sem formatação se não for 10 ou 11 dígitos
    }

    // --- LÓGICA DE AÇÕES E COMUNICAÇÃO COM API ---

    // Função para o botão "Consulta"
    async function handleConsultButtonClick(patientId) {
        console.log('Consult button clicked for patient ID:', patientId);
        const attendantId = 1; // ID do atendente logado (pode ser dinâmico no futuro)

        try {
            const response = await fetch('/api/service', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    patient_id: patientId,
                    attendant_id: attendantId,
                    datetime: new Date().toISOString()
                })
            });

            if (response.ok) {
                alert('Paciente enviado para a fila de triagem com sucesso!');
            } else {
                const errorData = await response.json();
                alert(`Erro ao enviar paciente para a fila: ${errorData.message || response.statusText}`);
            }
        } catch (error) {
            console.error('Error in service queue request:', error);
            alert('Erro de conexão ao enviar paciente para a fila.');
        }
    }

    // Busca os pacientes da API e os renderiza na tabela
    async function fetchAndRenderPatients() {
        if (!patientTableTbody) return;

        patientTableTbody.innerHTML = '<tr><td colspan="6" class="text-center">Carregando...</td></tr>';
        try {
            const response = await fetch('/api/pacientes');
            if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

            const patients = await response.json();
            patientTableTbody.innerHTML = '';

            if (patients.length === 0) {
                patientTableTbody.innerHTML = '<tr><td colspan="6" class="text-center">Nenhum paciente cadastrado.</td></tr>';
                return;
            }

            patients.forEach(patient => {
                const row = patientTableTbody.insertRow();
                row.dataset.patientId = patient.patient_id;

                row.insertCell().textContent = patient.patient_name;
                row.insertCell().textContent = formatCpf(patient.cpf);
                row.insertCell().textContent = formatSusCard(patient.sus_card);
                row.insertCell().textContent = formatPhone(patient.phone);
                row.insertCell().textContent = new Date(patient.birth_date).toLocaleDateString('pt-BR');

                const actionCell = row.insertCell();
                actionCell.className = 'action-buttons';
                actionCell.innerHTML = `
                    <button class="edit-btn"><img src="https://cdn-icons-png.flaticon.com/512/1159/1159633.png" widh="20px" height="20px" alt="Edit" /></button>
                    <button class="consult-btn">Consulta</button>
                `;
                actionCell.querySelector('.consult-btn').addEventListener('click', () => handleConsultButtonClick(patient.patient_id));
            });
        } catch (error) {
            console.error('Error fetching and rendering patients:', error);
            patientTableTbody.innerHTML = '<tr><td colspan="6" class="text-center">Erro ao carregar pacientes.</td></tr>';
        }
    }

    // Adiciona o evento de 'submit' ao formulário de registro
    if (patientRegistrationForm) {
        patientRegistrationForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const formData = new FormData(patientRegistrationForm);
            const patientData = Object.fromEntries(formData.entries());
            patientData.gender = parseInt(patientData.gender, 10);

            try {
                const response = await fetch('/api/pacientes', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(patientData)
                });

                if (response.ok) {
                    alert('Paciente cadastrado com sucesso!');
                    patientRegistrationForm.reset();
                    // Muda para a aba de pesquisa e atualiza a lista após o cadastro
                    document.querySelector('.tab-button[data-tab="search"]').click();
                    fetchAndRenderPatients();
                } else {
                    const errorData = await response.json();
                    alert(`Erro ao cadastrar paciente: ${errorData.message || response.statusText}`);
                }
            } catch (error) {
                console.error('POST request error:', error);
                alert('Erro de conexão ao tentar cadastrar paciente.');
            }
        });
    }

    // Carrega a lista de pacientes ao iniciar ou ao clicar na aba de pesquisa
    const searchTabButton = document.querySelector('.tab-button[data-tab="search"]');
    if (searchTabButton) {
        // Carrega a lista de pacientes quando a página é aberta pela primeira vez
        fetchAndRenderPatients();

        // Adiciona um listener para recarregar a lista caso o usuário clique na aba de pesquisa
        searchTabButton.addEventListener('click', fetchAndRenderPatients);
    }
});