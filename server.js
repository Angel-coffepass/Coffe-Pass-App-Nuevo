require('dotenv').config();

// Importa los módulos necesarios
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const multer = require('multer');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json()); 
app.use(cors()); 

// 🛑 IMPORTANTE: Configuración para archivos estáticos (hace pública la carpeta /public)
app.use(express.static(path.join(__dirname, 'public'))); 

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

// --- (NUEVO) MIDDLEWARE DE VERIFICACIÓN DE TOKEN ("Guardia") ---
function verificarToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Formato "Bearer TOKEN"

    if (token == null) {
        return res.status(401).json({ success: false, message: 'No se proporcionó token' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ success: false, message: 'Token inválido' });
        }
        req.user = user; // Guarda el usuario (id, usuario, rol) en la petición
        next(); // Continúa
    });
}

// --- Configuración de Multer (Dónde guardar las imágenes) ---
const storage = multer.diskStorage({
    // Destino: la carpeta 'public/uploads'
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/'); 
    },
    // Nombre del archivo: mantenemos el nombre original
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

// Crea la instancia de 'upload' que usaremos en la ruta
const upload = multer({ storage: storage });

// --- RUTAS DE TU APLICACIÓN ---

// Ruta para la página principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Ruta para el login de usuarios
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const [rows] = await pool.execute(
            'SELECT id, nombre, usuario, rol FROM usuarios WHERE usuario = ? AND clave = ?', 
            [email, password]
        );
        
        if (rows.length > 0) {
            const user = rows[0];
            
            const payload = {
                id: user.id,
                usuario: user.usuario,
                rol: user.rol
            };

            const token = jwt.sign(
                payload, 
                process.env.JWT_SECRET,
                { expiresIn: '1h' } 
            );

            res.json({ 
                success: true, 
                token: token, 
                usuario: user.usuario, 
                rol: user.rol 
            });
            
        } else {
            res.status(401).json({ success: false, message: 'Credenciales incorrectas' });
        }
    } catch (error) {
        console.error('Error en el login:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});//t

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

// --- (NUEVA) RUTA DE VERIFICACIÓN DE SESIÓN ---
app.get('/api/verificar-sesion', verificarToken, (req, res) => {
    res.json({
        success: true,
        usuario: req.user.usuario,
        rol: req.user.rol
    });
});

// --- RUTAS DE CAFETERÍAS (ADMIN) ---

// Ruta para obtener cafeterías (para tu mapa y admin)
app.get('/api/cafeterias-cercanas', async (req, res) => {
    try {
        const sql = `
            SELECT 
                c.id, 
                c.nombre, 
                c.direccion, 
                c.latitud, 
                c.longitud, 
                c.imagen_url,
                
                -- Calcula el promedio de calificaciones y lo redondea a 1 decimal
                CASE 
                    WHEN COUNT(o.id) > 0 THEN ROUND(AVG(o.calificacion), 1) 
                    ELSE 0 
                END AS calificacion_promedio
                
            FROM 
                cafeterias c
            LEFT JOIN 
                opiniones o ON c.id = o.id_cafeteria
            GROUP BY 
                c.id;
        `;
        const [rows] = await pool.execute(sql);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error al cargar cafeterías desde la DB:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor al obtener cafeterías' });
    }
});

// Ruta para registrar cafeterías (Protegida)
app.post('/api/registrar-cafeteria', verificarToken, upload.single('imagen'), async (req, res) => {
    
    if (req.user.rol !== 'admin') {
        return res.status(403).json({ success: false, message: 'No tienes permisos.' });
    }
    
    try {
        const { nombre, direccion, latitud, longitud } = req.body; 
        
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No se subió ningún archivo de imagen.' });
        }
        
        // ✅ CORRECCIÓN: SOLO guardamos el nombre del archivo.
        const imagen_url = req.file.filename; 

        if (!nombre || !latitud || !longitud) {
            return res.status(400).json({ success: false, message: 'Nombre, latitud y longitud son requeridos.' });
        }

        // Guardamos el nombre del archivo en la base de datos
        const sql = "INSERT INTO cafeterias (nombre, direccion, latitud, longitud, imagen_url) VALUES (?, ?, ?, ?, ?)";
        
        await pool.execute(sql, [nombre, direccion, latitud, longitud, imagen_url]);

        res.status(201).json({ success: true, message: 'Cafetería registrada exitosamente' });

    } catch (error) {
        console.error('Error al registrar cafetería:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

// Ruta para ELIMINAR una cafetería (Protegida)
app.delete('/api/cafeterias/:id', verificarToken, async (req, res) => {
    if (req.user.rol !== 'admin') {
        return res.status(403).json({ success: false, message: 'No tienes permisos de administrador.' });
    }
    
    try {
        const cafeteriaId = req.params.id; 
        const [result] = await pool.execute('DELETE FROM cafeterias WHERE id = ?', [cafeteriaId]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Cafetería no encontrada' });
        }
        res.json({ success: true, message: 'Cafetería eliminada con éxito.' });
    } catch (error) {
        console.error('Error al eliminar cafetería:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

// RUTA GET (Para obtener datos de UNA cafetería)
app.get('/api/cafeterias/:id', async (req, res) => {
    try {
        const { id } = req.params; 
        const [rows] = await pool.execute(
            'SELECT nombre, direccion, latitud, longitud FROM cafeterias WHERE id = ?',
            [id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Cafetería no encontrada' });
        }
        res.json({ success: true, data: rows[0] });
    } catch (error) {
        console.error('Error al obtener cafetería:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

// RUTA PUT (Para actualizar la cafetería) (Protegida)
app.put('/api/cafeterias/:id', verificarToken, upload.single('imagen'), async (req, res) => {
    
    // Verificación de Admin
    if (req.user.rol !== 'admin') {
        return res.status(403).json({ success: false, message: 'No tienes permisos de administrador.' });
    }
    
    try {
        const { id } = req.params;
        const { nombre, direccion, latitud, longitud } = req.body; 

        // 1. Prepara la consulta SQL base
        let sql = `
            UPDATE cafeterias 
            SET nombre = ?, direccion = ?, latitud = ?, longitud = ? 
        `;
        const params = [nombre, direccion, latitud, longitud];

        // 2. Verifica si se subió una NUEVA imagen
        if (req.file) {
            // ✅ CORRECCIÓN: SOLO guardamos el nombre del archivo.
            const imagen_url = req.file.filename;
            sql += ', imagen_url = ?';
            params.push(imagen_url);
        }

        // 3. Termina la consulta
        sql += ' WHERE id = ?';
        params.push(id);
        
        await pool.execute(sql, params); 

        res.json({ success: true, message: 'Cafetería actualizada con éxito.' });

    } catch (error) {
        console.error('Error al actualizar cafetería:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
});

// --- RUTAS DEL BLOG DE OPINIONES ---

// Ruta para CREAR una opinión (Protegida)
app.post('/api/opiniones', verificarToken, async (req, res) => {
    const id_usuario = req.user.id; 
    const { id_cafeteria, calificacion, comentario } = req.body;

    if (!id_cafeteria || !calificacion || !comentario) {
        return res.status(400).json({ success: false, message: 'Faltan datos (cafetería, calificación o comentario).' });
    }
    try {
        const sql = "INSERT INTO opiniones (id_usuario, id_cafeteria, calificacion, comentario) VALUES (?, ?, ?, ?)";
        await pool.execute(sql, [id_usuario, id_cafeteria, calificacion, comentario]);
        res.status(201).json({ success: true, message: 'Opinión registrada exitosamente' });
    } catch (error) {
        console.error('Error al registrar opinión:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

// Ruta para LEER el "blog" de una cafetería
app.get('/api/opiniones/:id_cafeteria', async (req, res) => {
    try {
        const { id_cafeteria } = req.params;
        const sql = `
            SELECT o.calificacion, o.comentario, o.fecha_creacion, u.usuario 
            FROM opiniones o
            JOIN usuarios u ON o.id_usuario = u.id
            WHERE o.id_cafeteria = ?
            ORDER BY o.fecha_creacion ASC 
        `;
        const [rows] = await pool.execute(sql, [id_cafeteria]);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error al obtener opiniones:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

// --- RUTAS DEL PASAPORTE (SELLOS) ---

// Ruta para "Sellar" (POST)
app.post('/api/pasaporte/sellar', verificarToken, async (req, res) => {
    try {
        const id_usuario = req.user.id; 
        const { id_cafeteria } = req.body; 

        if (!id_cafeteria) {
            return res.status(400).json({ success: false, message: 'ID de cafetería no proporcionado.' });
        }

        const sql = "INSERT INTO pasaporte (id_usuario, id_cafeteria) VALUES (?, ?)";
        await pool.execute(sql, [id_usuario, id_cafeteria]);

        res.status(201).json({ success: true, message: '¡Pasaporte sellado!' });

    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ success: false, message: 'Ya has sellado esta cafetería.' });
        }
        console.error('Error al sellar pasaporte:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
});

// Ruta para "Mostrar el Libro" (GET)
app.get('/api/pasaporte', verificarToken, async (req, res) => {
    try {
        const id_usuario = req.user.id; // Obtenemos el ID del token

        // ESTA ES LA CONSULTA SQL MÁGICA
        const sql = `
            SELECT 
                c.id, 
                c.nombre, 
                c.direccion, 
                c.imagen_url, 
                c.latitud, 
                c.longitud,
                CASE 
                    WHEN p.id IS NOT NULL THEN 1 
                    ELSE 0 
                END AS visitado,
                p.fecha_visita
            FROM cafeterias c
            LEFT JOIN pasaporte p 
                ON c.id = p.id_cafeteria AND p.id_usuario = ?
        `;

        const [results] = await pool.execute(sql, [id_usuario]);

        // Convertimos el 1/0 de SQL a true/false de Javascript para tu frontend
        const pasaporteData = results.map(cafe => ({
            ...cafe,
            visitado: cafe.visitado === 1
        }));

        res.json({ success: true, data: pasaporteData });

    } catch (error) {
        console.error('Error al obtener pasaporte:', error);
        res.status(500).json({ success: false, message: 'Error del servidor' });
    }
});

// 🧭 RUTA PARA OBTENER LOS DATOS DEL PERFIL DEL USUARIO
// Se requiere el middleware 'verificarToken' para asegurar que el usuario esté logueado.
app.get('/api/perfil', verificarToken, async (req, res) => {
    const userId = req.user.id; 

    try {
        // --- 1. CONSULTA DE DATOS BÁSICOS DEL USUARIO ---
        const [userRows] = await pool.query(
            'SELECT nombre, correo FROM usuarios WHERE id = ?', 
            [userId]
        );

        if (userRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
        }
        const usuario = userRows[0];
        
        // --- 2. CONSULTA DE TODOS LOS SELLOS DEL USUARIO ---
        const [sellosRows] = await pool.query(
            `SELECT 
                p.id AS id_sello,
                p.id_cafeteria,
                p.fecha_visita AS fecha_sello, 
                c.nombre AS nombre_cafeteria 
                c.imagen_url 
            FROM pasaporte p
            JOIN cafeterias c ON p.id_cafeteria = c.id
            WHERE p.id_usuario = ?
            ORDER BY p.fecha_visita DESC`,
            [userId]
        );
        
        // La lista de sellos ya viene limpia de la consulta
        const sellos = sellosRows;

        res.json({ 
            success: true, 
            message: 'Datos de perfil obtenidos exitosamente.',
            usuario: {
                nombre: usuario.nombre,
                correo: usuario.correo,
                sellos: sellos // <-- Usamos la lista de sellos directa
            }
        });

    } catch (error) {
        // ¡Si hay un Error 500, este console.error te dará la razón exacta en los logs de Railway!
        console.error('Error en la ruta /api/perfil:', error.message); 
        res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
});
// --- RUTA DE SEGUIMIENTO (SEGUIR/DEJAR DE SEGUIR) ---
app.post('/api/seguir', verificarToken, async (req, res) => {
    const id_usuario = req.user.id;
    const { id_cafeteria } = req.body;

    try {
        const [existe] = await pool.execute(
            'SELECT * FROM seguidores WHERE id_usuario = ? AND id_cafeteria = ?',
            [id_usuario, id_cafeteria]
        );

        if (existe.length > 0) {
            await pool.execute(
                'DELETE FROM seguidores WHERE id_usuario = ? AND id_cafeteria = ?',
                [id_usuario, id_cafeteria]
            );
            res.json({ success: true, estado: 'no_siguiendo', message: 'Dejaste de seguir.' });
        } else {
            await pool.execute(
                'INSERT INTO seguidores (id_usuario, id_cafeteria) VALUES (?, ?)',
                [id_usuario, id_cafeteria]
            );
            res.json({ success: true, estado: 'siguiendo', message: '¡Ahora sigues esta cafetería!' });
        }
    } catch (error) {
        console.error('Error al seguir:', error);
        res.status(500).json({ success: false, message: 'Error del servidor.' });
    }
});

// --- INICIAR EL SERVIDOR ---
connectToDatabase().then(() => {
    app.listen(port, '0.0.0.0', () => {
        console.log(`Servidor escuchando en el puerto ${port}`);
    });
}).catch(err => {
    console.error('El servidor no se pudo iniciar debido a un error de conexión a la base de datos.');
});