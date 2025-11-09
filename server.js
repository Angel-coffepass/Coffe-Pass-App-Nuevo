require('dotenv').config();

// Importa los módulos necesarios
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken'); // Importante: Asegúrate de que jwt esté importado
const multer = require('multer');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json()); 
app.use(cors()); 
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

            // --- CORRECCIÓN 1: 'rol:user.rol' estaba duplicado y mal escrito ---
            res.json({ 
                success: true, 
                token: token, 
                usuario: user.usuario
                // El rol ya va dentro del token, pero si el frontend lo necesita
                // para la redirección inicial (como lo tenías antes), 
                // puedes añadir 'rol: user.rol' aquí también.
                // Lo añadiré para que coincida con tu lógica de frontend anterior.
                , rol: user.rol 
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
        // Asegúrate de que la tabla 'usuarios' tenga la columna 'rol' si la creaste
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
        const sql = 'SELECT id, nombre, direccion, latitud, longitud, imagen_url FROM cafeterias';
        const [rows] = await pool.execute(sql);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error al cargar cafeterías desde la DB:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor al obtener cafeterías' });
    }
});

// Ruta para registrar cafeterías (Protegida)
// AÑADIMOS EL MIDDLEWARE 'upload.single('imagen')'
app.post('/api/registrar-cafeteria', verificarToken, upload.single('imagen'), async (req, res) => {
    
    // (Verificación de Admin - sin cambios)
    if (req.user.rol !== 'admin') {
        return res.status(403).json({ success: false, message: 'No tienes permisos.' });
    }
    
    try {
        // 1. Los datos de texto ahora vienen en req.body
        const { nombre, direccion, latitud, longitud } = req.body; 
        
        // 2. Los datos del archivo vienen en req.file
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No se subió ningún archivo de imagen.' });
        }
        
        // 3. Esta es la URL pública de la imagen
        const imagen_url = `/uploads/${req.file.filename}`; // ej: /uploads/12345-cafeteria.jpg

        if (!nombre || !latitud || !longitud) {
            return res.status(400).json({ success: false, message: 'Nombre, latitud y longitud son requeridos.' });
        }

        // 4. Guardamos la URL en la base de datos
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
// RUTA PUT (Para actualizar la cafetería) (Protegida)
// AÑADIMOS EL MIDDLEWARE DE MULTER: upload.single('imagen')
app.put('/api/cafeterias/:id', verificarToken, upload.single('imagen'), async (req, res) => {
    
    // Verificación de Admin
    if (req.user.rol !== 'admin') {
        return res.status(403).json({ success: false, message: 'No tienes permisos de administrador.' });
    }
    
    try {
        const { id } = req.params;
        const { nombre, direccion, latitud, longitud } = req.body; 

        // --- LÓGICA DE ACTUALIZACIÓN DE IMAGEN ---
        
        // 1. Prepara la consulta SQL base
        let sql = `
            UPDATE cafeterias 
            SET nombre = ?, direccion = ?, latitud = ?, longitud = ? 
        `;
        const params = [nombre, direccion, latitud, longitud];

        // 2. Verifica si se subió una NUEVA imagen
        if (req.file) {
            // Si hay un archivo nuevo, añade la imagen_url a la consulta
            const imagen_url = `/uploads/${req.file.filename}`;
            sql += ', imagen_url = ?';
            params.push(imagen_url);
        }

        // 3. Termina la consulta
        sql += ' WHERE id = ?';
        params.push(id);
        
        // --- FIN DE LA LÓGICA ---

        await pool.execute(sql, params); // Ejecuta la consulta SQL dinámica

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
// Ruta para "Sellar" (POST)
// (Protegida por el guardia 'verificarToken')
app.post('/api/pasaporte/sellar', verificarToken, async (req, res) => {
    try {
        const id_usuario = req.user.id; // ID del usuario (viene del token)
        const { id_cafeteria } = req.body; // ID de la cafetería (vendrá del QR)

        if (!id_cafeteria) {
            return res.status(400).json({ success: false, message: 'ID de cafetería no proporcionado.' });
        }

        // Insertamos el sello en la nueva tabla 'pasaporte'
        const sql = "INSERT INTO pasaporte (id_usuario, id_cafeteria) VALUES (?, ?)";
        await pool.execute(sql, [id_usuario, id_cafeteria]);

        res.status(201).json({ success: true, message: '¡Pasaporte sellado!' });

    } catch (error) {
        // Manejar el error si el sello ya existe (UNIQUE KEY)
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ success: false, message: 'Ya has sellado esta cafetería.' });
        }
        console.error('Error al sellar pasaporte:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
});

// Ruta para "Mostrar el Libro" (GET)
// (Protegida por el guardia 'verificarToken')
app.get('/api/pasaporte', verificarToken, async (req, res) => {
    try {
        const id_usuario = req.user.id;

        // Consulta SQL (LEFT JOIN)
        // 1. Selecciona TODAS las cafeterías (c)
        // 2. Une la tabla 'pasaporte' (p) SÓLO si coincide el ID de usuario
        const sql = `
            SELECT 
                c.id, 
                c.nombre, 
                c.direccion, 
                c.imagen_url,
                -- Si p.id_usuario no es NULO, significa que SÍ la visitó (1 = true, 0 = false)
                CASE WHEN p.id_usuario IS NOT NULL THEN 1 ELSE 0 END AS visitado 
            FROM 
                cafeterias c
            LEFT JOIN 
                pasaporte p ON c.id = p.id_cafeteria AND p.id_usuario = ?
        `;
        
        const [cafeterias] = await pool.execute(sql, [id_usuario]);
        
        res.json({ success: true, data: cafeterias });
    } catch (error) {
        console.error('Error al obtener pasaporte:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor.' });
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