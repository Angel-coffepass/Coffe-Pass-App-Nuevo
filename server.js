const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Middlewares
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// Ruta raíz sirve index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Configuración de MySQL
const getPool = () => {
    if (!global.pool) {
        try {
            global.pool = mysql.createPool({
                host: process.env.MYSQLHOST || 'containers-us-west-123.railway.app',
                user: process.env.MYSQLUSER || 'root',
                password: process.env.MYSQLPASSWORD || 'lwIWoRNVXBHfwxbTWKkLfItzTDWigkbN',
                database: process.env.MYSQLDATABASE || 'railway',
                port: parseInt(process.env.MYSQLPORT) || 3306,
                waitForConnections: true,
                connectionLimit: 10,
                queueLimit: 0
            });
            // Test de conexión inicial
            global.pool.getConnection()
                .then(conn => {
                    console.log('✅ MySQL conectado');
                    conn.release();
                })
                .catch(err => console.error('❌ Error conectando MySQL:', err.message));
        } catch (err) {
            console.error('❌ Error creando pool MySQL:', err.message);
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
        console.error('Error en login:', error.message);
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
        console.error('Error en registro:', error.message);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

// Inicia el servidor
app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 Servidor escuchando en puerto ${port}`);
});
