// src/utils/db.ts

import sqlite3 from "sqlite3";
import { open, Database } from "sqlite";

// Função utilitária para abrir conexão com o banco
export async function openDb(): Promise<Database> {
    return open({
        filename: "./database/database.sqlite",
        driver: sqlite3.Database,
    });
}