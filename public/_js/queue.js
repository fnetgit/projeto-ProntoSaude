// _js/queue.js

document.addEventListener('DOMContentLoaded', () => {
    console.log('Service Queue page loaded.');

    // Here you can add the logic to fetch data from the queue
    // and dynamically populate the table.
    // Example:
    // fetch('/api/queue')
    //   .then(response => response.json())
    //   .then(data => {
    //       const tbody = document.getElementById('queue-body');
    //       tbody.innerHTML = ''; // Clear the table
    //       data.forEach(patient => {
    //           const tr = document.createElement('tr');
    //           tr.innerHTML = `
    //               <td>${patient.id}</td>
    //               <td>${patient.name}</td>
    //               <td><span class="priority-badge priority-${patient.priority.toLowerCase()}">${patient.priorityText}</span></td>
    //               <td>${patient.status}</td>
    //               <td>${new Date(patient.time).toLocaleTimeString('pt-BR')}</td>
    //           `;
    //           tbody.appendChild(tr);
    //       });
    //   });
});