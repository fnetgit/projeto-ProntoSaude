import express from "express";
import { openDb } from "../utils/db";

const router = express.Router();

router.post("/api/admin/create-user", async (req, res) => {
    const { username, password, role, name, specialty, crm } = req.body;

    try {
        const db = await openDb();

        const existingUser = await db.get(
            "SELECT * FROM User WHERE username = ?",
            username
        );
        if (existingUser) {
            return res.status(400).json({ error: "Nome de usuário já existe." });
        }

        const userResult = await db.run(
            "INSERT INTO User (username, password, role) VALUES (?, ?, ?)",
            username,
            password,
            role
        );
        const userId = userResult.lastID;

        if (role === "attendant") {
            await db.run(
                "INSERT INTO Attendant (attendant_name, user_id) VALUES (?, ?)",
                name,
                userId
            );
        } else if (role === "triager") {
            await db.run(
                "INSERT INTO TriageOfficer (triage_officer_name, user_id) VALUES (?, ?)",
                name,
                userId
            );
        } else if (role === "doctor") {
            await db.run(
                "INSERT INTO Doctor (doctor_name, specialty, crm, user_id) VALUES (?, ?, ?, ?)",
                name,
                specialty,
                crm,
                userId
            );
        }

        res.status(201).json({ message: "Usuário cadastrado com sucesso!" });
    } catch (error) {
        if ((error as Error).message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ error: "Nome de usuário já existe." });
        }
        if ((error as Error).message.includes('NOT NULL constraint failed')) {
            return res.status(400).json({ error: "Erro no cadastro: falta campo obrigatório." });
        }
        res.status(500).json({ error: (error as Error).message });
    }
});

export default router;