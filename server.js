const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Middleware para procesar JSON y permitir solicitudes de origen cruzado
app.use(express.json());
app.use(cors());

// Sirve archivos estáticos del frontend desde la carpeta 'public'
app.use(express.static(path.join(__dirname, 'public')));

let pool; // Definimos el pool globalmente, pero no lo inicializamos aquí

// Función para inicializar el pool de conexiones
const getPool = async () => {
    if (!pool) {
        try {
            if (!process.env.DATABASE_URL) {
                throw new Error('No DATABASE_URL found in environment variables');
            }
            pool = mysql.createPool(process.env.DATABASE_URL);
            console.log('Conexión a la base de datos establecida.');
        } catch (error) {
            console.error('Error al inicializar la base de datos:', error);
            // Si la conexión falla, no inicia el servidor para evitar que se caiga
            process.exit(1);
        }
    }
    return pool;
};

// Usa una ruta de inicio para inicializar el pool de conexiones
app.get('/', async (req, res) => {
    try {
        await getPool();
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    } catch (error) {
        res.status(500).send('Error interno del servidor. No se pudo conectar a la base de datos.');
    }
});

// Rutas del API
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const connection = await (await getPool()).getConnection();
        const [rows] = await connection.execute('SELECT id, nombre, usuario FROM usuarios WHERE usuario = ? AND clave = ?', [email, password]);
        connection.release();

        if (rows.length > 0) {
            const user = rows[0];
            res.json({ success: true, nombre: user.nombre, usuario: user.usuario });
        } else {
            res.status(401).json({ success: false, message: 'Credenciales incorrectas' });
        }
    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

app.post('/api/registro', async (req, res) => {
    try {
        const { nombre, apellido, correo, usuario, clave } = req.body;
        const connection = await (await getPool()).getConnection();
        const [existingUsers] = await connection.execute('SELECT id FROM usuarios WHERE correo = ? OR usuario = ?', [correo, usuario]);

        if (existingUsers.length > 0) {
            connection.release();
            return res.status(409).json({ success: false, message: 'Correo o usuario ya existen' });
        }

        const [result] = await connection.execute('INSERT INTO usuarios (nombre, apellido, correo, usuario, clave) VALUES (?, ?, ?, ?, ?)', [nombre, apellido, correo, usuario, clave]);
        connection.release();
        res.status(201).json({ success: true, userId: result.insertId });

    } catch (error) {
        console.error('Error en registro:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

// Inicia el servidor
app.listen(port, '0.0.0.0', () => {
    console.log(`Servidor escuchando en el puerto ${port}`);
});