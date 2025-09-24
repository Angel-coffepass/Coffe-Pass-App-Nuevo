// Importa los módulos necesarios
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');

const app = express();
const port = process.env.PORT || 8080;

// Middleware
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

let pool;

const connectToDatabase = async () => {
    try {
        const dbUrl = process.env.DATABASE_URL || process.env.MYSQL_URL;
        if (!dbUrl) {
            throw new Error('No se encontró la URL de la base de datos.');
        }
        pool = mysql.createPool(dbUrl);
        await pool.getConnection();
        console.log('¡Conexión a la base de datos exitosa!');
    } catch (error) {
        console.error('Error al conectar con la base de datos:', error);
        throw error;
    }
};

// Rutas
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const [rows] = await pool.execute('SELECT id, nombre, usuario FROM usuarios WHERE usuario = ? AND clave = ?', [email, password]);
        if (rows.length > 0) {
            const user = rows[0];
            res.json({ success: true, nombre: user.nombre, usuario: user.usuario });
        } else {
            res.status(401).json({ success: false, message: 'Credenciales incorrectas' });
        }
    } catch (error) {
        console.error('Error en el login:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

app.post('/api/registro', async (req, res) => {
    try {
        const { nombre, apellido, correo, usuario, clave } = req.body;
        const [existingUsers] = await pool.execute('SELECT id FROM usuarios WHERE correo = ? OR usuario = ?', [correo, usuario]);
        if (existingUsers.length > 0) {
            return res.status(409).json({ success: false, message: 'Correo o usuario ya existen' });
        }
        const [result] = await pool.execute('INSERT INTO usuarios (nombre, apellido, correo, usuario, clave) VALUES (?, ?, ?, ?, ?)', [nombre, apellido, correo, usuario, clave]);
        res.status(201).json({ success: true, userId: result.insertId });
    } catch (error) {
        console.error('Error en el registro:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

// Inicia el servidor solo si la conexión a la base de datos es exitosa
connectToDatabase().then(() => {
    app.listen(port, '0.0.0.0', () => {
        console.log(`Servidor escuchando en el puerto ${port}`);
    });
}).catch(err => {
    console.error('El servidor no se pudo iniciar debido a un error de conexión a la base de datos.');
});