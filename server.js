const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// Ruta raíz
app.get('/', (req, res) => res.send('Servidor funcionando 🚀'));

// Función para obtener pool MySQL bajo demanda
    const getPool = () => {
    if (!global.pool) {
        if (process.env.DATABASE_URL) {
        global.pool = mysql.createPool(process.env.DATABASE_URL);
        } else {
        global.pool = mysql.createPool({
            host: 'centerbeam.proxy.rlwy.net',
            port: 53067,
            user: 'root',
            password: 'lwIWoRNVXBHfwxbTWKkLfItzTDWigkbN',
            database: 'railway'
        });
        }
    }
    return global.pool;
    };

    // Login
    app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const pool = getPool();
        const [rows] = await pool.execute(
        'SELECT id, nombre, usuario FROM usuarios WHERE usuario = ? AND clave = ?',
        [email, password]
        );

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

    // Registro
    app.post('/api/registro', async (req, res) => {
    const { nombre, apellido, correo, usuario, clave } = req.body;
    try {
        const pool = getPool();
        const [existingUsers] = await pool.execute(
        'SELECT id FROM usuarios WHERE correo = ? OR usuario = ?', 
        [correo, usuario]
        );

        if (existingUsers.length > 0) {
        return res.status(409).json({ success: false, message: 'Correo o usuario ya existen' });
        }

        const [result] = await pool.execute(
        'INSERT INTO usuarios (nombre, apellido, correo, usuario, clave) VALUES (?, ?, ?, ?, ?)',
        [nombre, apellido, correo, usuario, clave]
        );

        res.status(201).json({ success: true, userId: result.insertId });
    } catch (error) {
        console.error('Error en registro:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
    });

    // Inicia el servidor
    app.listen(port, '0.0.0.0', () => {
    console.log(`Servidor escuchando en puerto ${port}`);
    });
