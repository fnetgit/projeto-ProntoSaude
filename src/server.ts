// server.ts

import express from 'express';
import path from 'path';

import generalRoutes from './routes/generalRoutes';
import patientRoutes from './routes/patientRoutes';
import triageRoutes from './routes/triageRoutes';
import queueRoutes from './routes/queueRoutes';
import doctorRoutes from './routes/doctorRoutes';
import userRoutes from './routes/userRoutes';
import adminRoutes from './routes/adminRoutes';

const app = express();
const port = 3000;

app.use(express.json());

app.use('/', generalRoutes);
app.use('/', userRoutes);

const publicPath = path.join(__dirname, '..', 'public');
app.use(express.static(publicPath));

app.use('/', patientRoutes);
app.use('/', triageRoutes);
app.use('/', queueRoutes);
app.use('/', doctorRoutes);
app.use('/', adminRoutes);

app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
    console.log(`Página de Login: http://localhost:${port}/`);
    console.log(`Página do Atendente: http://localhost:${port}/atendente`);
    console.log(`Página do Triador: http://localhost:${port}/triador`);
    console.log(`Página do Médico: http://localhost:${port}/medico`);
    console.log(`Página de Admin: http://localhost:${port}/admin.html`);
});