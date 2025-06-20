document.addEventListener('DOMContentLoaded', () => {
    const formCadastrarPacientes = document.querySelector('#cadastrar-pacientes-form form');
    const tbodyPacienteTable = document.querySelector('#patient-list-body'); // Agora usando o ID correto
    const tabButtons = document.querySelectorAll('.tab-button');
    const formSections = document.querySelectorAll('.form-section');
    const phoneInput = document.getElementById('phone');

    // --- Funções de Formatação (já existentes) ---
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
        return phone;
    }

    // Event listener para o campo de telefone para permitir apenas dígitos
    if (phoneInput) {
        phoneInput.addEventListener('input', (event) => {
            event.target.value = event.target.value.replace(/\D/g, '');
        });
    }

    // Função para lidar com o clique do botão "Consulta" e enviar para a fila de serviço
    async function handleConsultButtonClick(patientId) {
        console.log('Botão Consulta clicado para o paciente ID:', patientId);
        
        // Assumindo um attendant_id fixo por enquanto. Em uma aplicação real, viria de um login/sessão.
        const attendantId = 1; // ID do atendente logado (exemplo)

        try {
            const response = await fetch('/api/service', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    patient_id: patientId,
                    attendant_id: attendantId,
                    datetime: new Date().toISOString() // Data e hora atuais
                })
            });

            if (response.ok) {
                alert('Paciente enviado para a fila de triagem com sucesso!');
                // Opcional: Remover paciente da lista de "Pacientes Cadastrados" ou mudar seu status
                // Para este fluxo, o paciente ainda pode aparecer na lista geral.
            } else {
                const errorData = await response.json();
                alert(`Erro ao enviar paciente para a fila de serviço: ${errorData.message || response.statusText}`);
            }
        } catch (error) {
            console.error('Erro na requisição para fila de serviço:', error);
            alert('Erro de conexão ao enviar paciente para a fila de serviço.');
        }
    }

    // Função assíncrona para buscar e renderizar pacientes na tabela
    async function fetchAndRenderPatients() {
        if (!tbodyPacienteTable) {
            console.error('Elemento <tbody> da tabela de pacientes não encontrado.');
            return;
        }

        tbodyPacienteTable.innerHTML = '';

        try {
            const response = await fetch('/api/pacientes');
            if (!response.ok) {
                throw new Error(`Erro HTTP: ${response.status}`);
            }
            const patients = await response.json();

            if (patients.length === 0) {
                const row = tbodyPacienteTable.insertRow();
                const cell = row.insertCell();
                cell.colSpan = 6;
                cell.textContent = 'Nenhum paciente cadastrado.';
                cell.className = 'text-center text-gray-500 py-4';
                return;
            }

            patients.forEach(patient => {
                const row = tbodyPacienteTable.insertRow();
                // Armazena o patient_id na linha da tabela
                row.dataset.patientId = patient.patient_id; 

                row.insertCell().textContent = patient.patient_name;
                row.insertCell().textContent = formatCpf(patient.cpf);
                row.insertCell().textContent = formatSusCard(patient.sus_card);
                row.insertCell().textContent = formatPhone(patient.phone);
                row.insertCell().textContent = patient.birth_date;

                const actionCell = row.insertCell();
                actionCell.className = 'action-buttons';
                actionCell.innerHTML = `
                    <button class="edit-btn">
                        <img src="https://img.icons8.com/ios-filled/16/000000/edit--v1.png" alt="Edit" />
                    </button>
                    <button class="consult-btn">Consulta</button>
                `;
                
                // Adiciona o event listener ao botão "Consulta"
                const consultButton = actionCell.querySelector('.consult-btn');
                if (consultButton) {
                    consultButton.addEventListener('click', () => handleConsultButtonClick(patient.patient_id));
                }
            });
        } catch (error) {
            console.error('Erro ao buscar e renderizar pacientes:', error);
            const row = tbodyPacienteTable.insertRow();
            const cell = row.insertCell();
            cell.colSpan = 6;
            cell.textContent = 'Erro ao carregar pacientes. Verifique o console para detalhes.';
            cell.className = 'text-center text-red-500 py-4';
        }
    }

    // --- Lógica do formulário de cadastro (já existente) ---
    if (formCadastrarPacientes) {
        formCadastrarPacientes.addEventListener('submit', async (event) => {
            event.preventDefault();

            const patient_name = document.getElementById('patient_name').value;
            const birth_date = document.getElementById('birth_date').value;
            const cpf = document.getElementById('cpf').value;
            const birthplace = document.getElementById('birthplace').value;
            const sus_card = document.getElementById('sus_card').value;
            const address = document.getElementById('address').value;
            const mother_name = document.getElementById('mother_name').value;
            const gender = document.getElementById('gender').value;
            const phone = document.getElementById('phone').value;
            const nationality = document.getElementById('nationality').value;

            const dadosPaciente = {
                patient_name: patient_name,
                birth_date: birth_date,
                cpf: cpf,
                birthplace: birthplace,
                sus_card: sus_card,
                address: address,
                mother_name: mother_name,
                gender: parseInt(gender),
                phone: phone,
                nationality: nationality
            };

            console.log('Dados do paciente a serem enviados:', dadosPaciente);

            try {
                const response = await fetch('/api/pacientes', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(dadosPaciente)
                });

                if (response.ok) {
                    alert('Paciente cadastrado com sucesso!');
                    formCadastrarPacientes.reset();
                    fetchAndRenderPatients(); // Atualiza a tabela após o cadastro
                } else {
                    const errorData = await response.json();
                    alert(`Erro ao cadastrar paciente: ${errorData.message || response.statusText}`);
                }
            } catch (error) {
                console.error('Erro na requisição POST:', error);
                alert('Erro de conexão ao tentar cadastrar paciente.');
            }
        });
    }

    // --- Lógica para alternar entre as abas ---
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            tabButtons.forEach(btn => btn.classList.remove('active'));
            formSections.forEach(section => section.style.display = 'none');

            button.classList.add('active');

            const targetTab = button.dataset.tab;
            if (targetTab === 'cadastrar') {
                document.getElementById('cadastrar-pacientes-form').style.display = 'block';
            } else if (targetTab === 'procurar') {
                document.getElementById('procurar-paciente-form').style.display = 'block';
                fetchAndRenderPatients(); // Busca e renderiza pacientes quando a aba "Procurar Paciente" é ativada
            }
        });
    });

    // Ativa a aba "PROCURAR PACIENTE" por padrão ao carregar a página
    document.querySelector('.tab-button[data-tab="procurar"]').click();
});
