// Importa los módulos necesarios
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Middleware para procesar JSON y permitir solicitudes de origen cruzado
app.use(express.json());
app.use(cors());

// **IMPORTANTE: Agregado para servir archivos estáticos (el frontend)**
app.use(express.static(path.join(__dirname, 'public')));


// Configura la conexión a tu base de datos MySQL
const pool = mysql.createPool(process.env.DATABASE_URL);

// Ruta de login
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
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

// Ruta de registro
app.post('/api/registro', async (req, res) => {
    const { nombre, apellido, correo, usuario, clave } = req.body;

    try {
        // Verifica si el correo o el nombre de usuario ya existen
        const [existingUsers] = await pool.execute(
            'SELECT id FROM usuarios WHERE correo = ? OR usuario = ?', 
            [correo, usuario]
        );

        if (existingUsers.length > 0) {
            return res.status(409).json({ success: false, message: 'El correo o el nombre de usuario ya existen.' });
        }

        // Si no existen, inserta el nuevo usuario en la base de datos
        const [result] = await pool.execute(
            'INSERT INTO usuarios (nombre, apellido, correo, usuario, clave) VALUES (?, ?, ?, ?, ?)',
            [nombre, apellido, correo, usuario, clave]
        );

        res.status(201).json({ success: true, message: 'Usuario registrado con éxito.', userId: result.insertId });

    } catch (error) {
        console.error('Error en el registro:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
});

// Inicia el servidor
app.listen(port, () => {
    console.log(`Servidor de backend escuchando en http://localhost:${port}`);
});