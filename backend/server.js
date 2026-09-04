const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Configurar MongoDB
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/alerta360';

mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ Conectado a MongoDB local'))
  .catch(err => console.error('❌ Error conectando a MongoDB:', err.message, '\n⚠️ Continuando en modo memoria (sin persistencia).'));

// Definir Schema y Modelo de Mongoose
const EventSchema = new mongoose.Schema({
  type: String,
  timestamp: Date,
  details: mongoose.Schema.Types.Mixed
});
const EventModel = mongoose.model('Event', EventSchema);

// Estado inicial en memoria
let currentState = {
  alarma_activa: false,
  origen_sos_manual: false,
  vibracion_detectada: false,
  nivel_bateria_porcentaje: 100,
  conexion_wifi: false,
  timestamp: new Date().toISOString()
};

let eventHistory = [];
let batteryHistory = []; // [NEW] Historial de batería

// Cargar últimos eventos de la BD al iniciar (si hay conexión)
EventModel.find().sort({ timestamp: -1 }).limit(50).then(events => {
  eventHistory = events.map(e => ({ type: e.type, timestamp: e.timestamp }));
}).catch(() => { /* Ignorar si no hay Mongo conectado */ });

io.on('connection', (socket) => {
  console.log(`Cliente conectado: ${socket.id}`);
  socket.emit('initialState', { currentState, eventHistory, batteryHistory });
  socket.on('disconnect', () => {
    console.log(`Cliente desconectado: ${socket.id}`);
  });
});


// Endpoint REST
const API_KEY = process.env.API_KEY || "ALERTA360_SECRET_TOKEN_2026";

app.post('/api/data', async (req, res) => {
  const clientApiKey = req.headers['x-api-key'];
  if (clientApiKey !== API_KEY) {
    console.log('Intento de conexión denegado (API KEY incorrecta)');
    return res.status(401).json({ error: 'No autorizado. API KEY inválida.' });
  }

  const data = req.body;
  console.log('Datos recibidos del ESP32:', data);

  currentState = {
    ...currentState,
    ...data,
    timestamp: new Date().toISOString(),
    conexion_wifi: true
  };

  // Si hay alguna alerta, registrar el evento
  if (data.alarma_activa || data.origen_sos_manual || data.vibracion_detectada) {
    const eventType = data.origen_sos_manual ? 'SOS Manual' : 'Vibración Detectada';
    const event = {
      type: eventType,
      timestamp: currentState.timestamp
    };
    
    // Actualizar array en memoria
    eventHistory.unshift(event);
    if (eventHistory.length > 50) eventHistory.pop();

    // Guardar en MongoDB (si está conectado)
    try {
      if (mongoose.connection.readyState === 1) {
        await EventModel.create({
          type: eventType,
          timestamp: new Date(currentState.timestamp),
          details: data
        });
      }
    } catch (error) {
      console.error('Error guardando en BD:', error.message);
    }
  }

  // Actualizar historial de batería
  if (data.nivel_bateria_porcentaje !== undefined) {
    batteryHistory.push({
      time: new Date(currentState.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      nivel: data.nivel_bateria_porcentaje
    });
    if (batteryHistory.length > 20) batteryHistory.shift(); // Mantener últimos 20 puntos
  }

  // Retransmitir a todos los clientes frontend conectados
  io.emit('stateUpdate', currentState);
  io.emit('historyUpdate', eventHistory);
  io.emit('batteryUpdate', batteryHistory);

  res.status(200).json({ status: 'ok', message: 'Datos procesados y persistidos' });
});

// Endpoint de salud
app.get('/health', (req, res) => {
  res.json({ 
    status: 'running', 
    service: 'ALERTA360 Backend', 
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' 
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`ALERTA360 Backend escuchando en el puerto ${PORT}`);
});
