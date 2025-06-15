// _js/fila.js

document.addEventListener('DOMContentLoaded', () => {
    console.log('Página da Fila de Atendimento carregada.');

    // Aqui você pode adicionar a lógica para buscar os dados da fila
    // e preencher a tabela dinamicamente.
    // Exemplo:
    // fetch('/api/fila')
    //   .then(response => response.json())
    //   .then(data => {
    //       const tbody = document.getElementById('queue-body');
    //       tbody.innerHTML = ''; // Limpa a tabela
    //       data.forEach(paciente => {
    //           const tr = document.createElement('tr');
    //           tr.innerHTML = `
    //               <td>${paciente.id}</td>
    //               <td>${paciente.nome}</td>
    //               <td class="priority-${paciente.prioridade.toLowerCase()}">${paciente.prioridade}</td>
    //               <td>${paciente.status}</td>
    //               <td>${paciente.hora}</td>
    //           `;
    //           tbody.appendChild(tr);
    //       });
    //   });
});