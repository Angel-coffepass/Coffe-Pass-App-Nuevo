require('dotenv').config();

// Importa los módulos necesarios
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json()); // Permite a Express entender JSON
app.use(cors()); // Permite peticiones de otros dominios
app.use(express.static(path.join(__dirname, 'public'))); // Sirve tus archivos (HTML, CSS, index.js de frontend)

let pool;

// --- FUNCIÓN DE CONEXIÓN A LA BASE DE DATOS ---
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

// --- RUTAS DE TU APLICACIÓN ---

// Ruta para la página principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Ruta para el login de usuarios
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // --- CAMBIO 1: Se añade 'rol' al SELECT ---
        // (Asegúrate de que tu columna se llame 'rol' en la tabla 'usuarios')
        const [rows] = await pool.execute(
            'SELECT id, nombre, usuario, rol FROM usuarios WHERE usuario = ? AND clave = ?', 
            [email, password]
        );
        
        if (rows.length > 0) {
            const user = rows[0];
            
            // --- CAMBIO 2: Se envía el 'rol' en la respuesta JSON ---
            res.json({ 
                success: true, 
                nombre: user.nombre, 
                usuario: user.usuario, 
                role: user.rol // <-- ¡Esta es la pieza clave!
            });
            
        } else {
            res.status(401).json({ success: false, message: 'Credenciales incorrectas' });
        }
    } catch (error) {
        console.error('Error en el login:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

// Ruta para el registro de nuevos usuarios
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

// Ruta para obtener cafeterías (para tu mapa)
app.get('/api/cafeterias-cercanas', async (req, res) => {
    try {
        const sql = 'SELECT nombre, direccion, latitud, longitud FROM cafeterias';
        const [rows] = await pool.execute(sql);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error al cargar cafeterías desde la DB:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor al obtener cafeterías' });
    }
});

// Ruta para registrar cafeterías (desde el form de admin)
app.post('/api/registrar-cafeteria', async (req, res) => {
    try {
        // Obtenemos los datos del formulario (del fetch que viene de admin.html)
        const { nombre_cafeteria, direccion, latitud, longitud } = req.body;

        // Validamos que los datos necesarios estén
        if (!nombre_cafeteria || !latitud || !longitud) {
            return res.status(400).json({ success: false, message: 'Nombre, latitud y longitud son requeridos.' });
        }

        // Preparamos el SQL
        const sql = "INSERT INTO cafeterias (nombre, direccion, latitud, longitud) VALUES (?, ?, ?, ?)";
        
        // Ejecutamos la consulta
        await pool.execute(sql, [nombre_cafeteria, direccion, latitud, longitud]);

        // Enviamos respuesta de éxito (201 = Creado)
        res.status(201).json({ success: true, message: 'Cafetería registrada exitosamente' });

    } catch (error) {
        console.error('Error al registrar cafetería:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});
// --------------------------------------------------------------------

// --- INICIAR EL SERVIDOR ---
connectToDatabase().then(() => {
    const port = process.env.PORT || 3000;
    app.listen(port, '0.0.0.0', () => {
        console.log(`Servidor escuchando en el puerto ${port}`);
    });
}).catch(err => {
    console.error('El servidor no se pudo iniciar debido a un error de conexión a la base de datos.');
});