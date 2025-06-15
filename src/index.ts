import { Patient } from "./entities/patient";
import { Triage } from "./entities/triage";
import { ManchesterQueue } from "./queues/manchester-queue";
import { Doctor } from "./users/doctor";
import { Trier } from "./users/trier";
import { Attendant } from "./users/attendant";

const attendant = new Attendant("Maria");
const triager = new Trier("Juliana");
const doctor = new Doctor("Dr. Souza");

const queue = new ManchesterQueue();

function triageAndEnqueue(
  patient: Patient,
  symptoms: string,
  temperature: number,
  weight: number,
  oxygenSaturation: number,
  glucose: number,
  bloodPressure: string,
  wristbandColor: string
): number {
  const { triageId, triagerName } = triager.setPriority(
    patient,
    symptoms,
    temperature,
    weight,
    oxygenSaturation,
    glucose,
    bloodPressure,
    wristbandColor
  );

  queue.insert({
    patientName: patient.patientName,
    priority: Triage.colorToPriority(wristbandColor),
  });

  console.log(
    `→ Paciente ${patient.patientName} triado como ${wristbandColor} por ${triagerName}`
  );

  return triageId;
}

const p1 = attendant.registerPatient(
  "Teresina",
  "João",
  "9999-9999",
  "M",
  "000.000.000-00",
  new Date("2000-01-01"),
  "123456789",
  "Maria",
  "Rua A"
);
const p2 = attendant.registerPatient(
  "Teresina",
  "Ana",
  "9888-8888",
  "F",
  "111.111.111-11",
  new Date("1995-06-15"),
  "987654321",
  "Joana",
  "Rua B"
);
const p3 = attendant.registerPatient(
  "Parnaíba",
  "Pedro",
  "9777-7777",
  "M",
  "222.222.222-22",
  new Date("1992-04-10"),
  "123459876",
  "Paula",
  "Rua C"
);

const p4 = attendant.registerPatient(
  "Parnaíba",
  "Luisa",
  "9777-7777",
  "M",
  "222.222.222-22",
  new Date("1992-04-10"),
  "123459876",
  "Hibiapina",
  "Rua C"
);

triageAndEnqueue(
  p1,
  "Dor no peito e falta de ar",
  37.5,
  70,
  95,
  90,
  "120/80",
  "azul"
);

triageAndEnqueue(
  p2,
  "Dor no peito e falta de ar",
  37.5,
  70,
  95,
  90,
  "120/80",
  "amarelo"
);

triageAndEnqueue(
  p3,
  "Dor no peito e falta de ar",
  37.5,
  70,
  95,
  90,
  "120/80",
  "laranja"
);

triageAndEnqueue(
  p4,
  "Dor no peito e falta de ar",
  37.5,
  70,
  95,
  90,
  "120/80",
  "amarelo"
);

console.log("\n=== Fila de atendimento ===");
queue.list().forEach((item, idx) => {
  console.log(
    `${idx + 1}° → ${item.patientName} (${Triage.priorityToColor(
      item.priority
    )})`
  );
});

console.log("\n=== Atendimentos ===");
let next;
while ((next = queue.remove())) {
  console.log(`\nMédico ${doctor.getName()} está chamando o próximo`);
  doctor.performService(next);
  console.log(
    `${doctor.getName()} atendeu ${next.patientName} (${Triage.priorityToColor(
      next.priority
    )})`
  );
  if (queue.list().length) {
    console.log("\n=== Fila de atendimento ===");
    queue.list().forEach((item, idx) => {
      console.log(
        `${idx + 1}° → ${item.patientName} (${Triage.priorityToColor(
          item.priority
        )})`
      );
    });
  }
}

if (queue.list().length === 0) {
  console.log("\nTodos os pacientes foram atendidos. A fila está vazia.");
}
