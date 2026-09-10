import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { 
  Wifi, WifiOff, Battery, BatteryWarning, 
  AlertTriangle, ShieldCheck, Activity, Phone 
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
const socket = io(BACKEND_URL);

function App() {
  const [state, setState] = useState({
    alarma_activa: false,
    origen_sos_manual: false,
    vibracion_detectada: false,
    nivel_bateria_porcentaje: 0,
    conexion_wifi: false,
    timestamp: new Date().toISOString()
  });
  
  const [history, setHistory] = useState([]);
  const [batteryHistory, setBatteryHistory] = useState([]);
  const [backendConnected, setBackendConnected] = useState(false);

  useEffect(() => {
    socket.on('connect', () => setBackendConnected(true));
    socket.on('disconnect', () => setBackendConnected(false));
    
    socket.on('initialState', (data) => {
      setState(data.currentState);
      setHistory(data.eventHistory);
      if (data.batteryHistory) setBatteryHistory(data.batteryHistory);
    });

    socket.on('stateUpdate', (newState) => {
      setState(newState);
    });

    socket.on('historyUpdate', (newHistory) => {
      setHistory(newHistory);
    });

    socket.on('batteryUpdate', (newBatteryHistory) => {
      setBatteryHistory(newBatteryHistory);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('initialState');
      socket.off('stateUpdate');
      socket.off('historyUpdate');
      socket.off('batteryUpdate');
    };
  }, []);

  const isEmergency = state.alarma_activa || state.origen_sos_manual || state.vibracion_detectada;
  const isBatteryLow = state.nivel_bateria_porcentaje <= 25;

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col items-center">
      <div className="w-full max-w-4xl flex flex-col gap-6">
        
        {/* Header */}
        <header className="flex justify-between items-center bg-card p-6 rounded-2xl border border-card-border shadow-lg">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">ALERTA360</h1>
            <p className="text-sm text-gray-400 mt-1">Monitoreo de Mochila Inteligente</p>
          </div>
          <div className="flex items-center gap-2">
            {backendConnected && state.conexion_wifi ? (
              <span className="flex items-center gap-2 text-alert-green bg-alert-green/10 px-4 py-2 rounded-full text-sm font-medium">
                <Wifi size={18} /> Conectado
              </span>
            ) : (
              <span className="flex items-center gap-2 text-gray-400 bg-gray-800 px-4 py-2 rounded-full text-sm font-medium">
                <WifiOff size={18} /> Sin Conexión
              </span>
            )}
          </div>
        </header>

        {/* Main Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Status Card */}
          <div className={`p-6 rounded-2xl border flex flex-col items-center justify-center text-center transition-colors duration-500 ${
            isEmergency 
              ? 'bg-alert-red/10 border-alert-red/30' 
              : 'bg-card border-card-border'
          }`}>
            {isEmergency ? (
              <>
                <AlertTriangle size={64} className="text-alert-red mb-4 animate-pulse" />
                <h2 className="text-2xl font-bold text-alert-red">¡EMERGENCIA!</h2>
                <p className="text-gray-300 mt-2">
                  {state.origen_sos_manual ? 'SOS Activado Manualmente' : 'Vibración Fuerte Detectada'}
                </p>
              </>
            ) : (
              <>
                <ShieldCheck size={64} className="text-alert-green mb-4" />
                <h2 className="text-2xl font-bold text-alert-green">Sistema Seguro</h2>
                <p className="text-gray-400 mt-2">Monitoreo activo y estable.</p>
              </>
            )}
          </div>

          {/* Battery Card */}
          <div className="p-6 rounded-2xl border border-card-border bg-card flex flex-col justify-between">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Battery size={24} /> Batería ESP32
              </h2>
              <span className={`text-2xl font-bold ${isBatteryLow ? 'text-alert-red' : 'text-foreground'}`}>
                {state.nivel_bateria_porcentaje}%
              </span>
            </div>
            
            <div className="w-full bg-gray-800 rounded-full h-4 overflow-hidden mb-2">
              <div 
                className={`h-4 rounded-full transition-all duration-1000 ${isBatteryLow ? 'bg-alert-red' : 'bg-alert-green'}`}
                style={{ width: `${Math.max(0, Math.min(100, state.nivel_bateria_porcentaje))}%` }}
              ></div>
            </div>
            
            <p className="text-sm text-gray-400">
              {isBatteryLow ? 'Requiere recarga inmediata.' : 'Estado de batería óptimo.'}
            </p>
          </div>
          
          {/* Contacts Card */}
          <div className="p-6 rounded-2xl border border-card-border bg-card flex flex-col">
             <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Phone size={24} /> Contactos de Emergencia
              </h2>
              <div className="flex flex-col gap-3">
                <a href="tel:119" className="flex justify-between items-center p-3 rounded-lg bg-gray-800 hover:bg-gray-700 transition">
                  <span>Defensa Civil (119)</span>
                  <Phone size={18} className="text-gray-400" />
                </a>
                <a href="tel:105" className="flex justify-between items-center p-3 rounded-lg bg-gray-800 hover:bg-gray-700 transition">
                  <span>Policía Nacional (105)</span>
                  <Phone size={18} className="text-gray-400" />
                </a>
              </div>
          </div>

          {/* History Card */}
          <div className="p-6 rounded-2xl border border-card-border bg-card flex flex-col">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Activity size={24} /> Historial de Eventos
            </h2>
            <div className="flex-1 overflow-y-auto pr-2 max-h-48 space-y-3">
              {history.length === 0 ? (
                <p className="text-gray-500 text-sm italic">No hay eventos registrados.</p>
              ) : (
                history.map((event, index) => (
                  <div key={index} className="flex justify-between items-center text-sm p-3 bg-gray-800/50 rounded-lg">
                    <span className="font-medium text-alert-red">{event.type}</span>
                    <span className="text-gray-400">{new Date(event.timestamp).toLocaleTimeString()}</span>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* Battery Chart */}
        <div className="p-6 rounded-2xl border border-card-border bg-card w-full mt-2">
          <h2 className="text-xl font-semibold mb-4 text-foreground">
            Tendencia de Batería
          </h2>
          <div className="w-full h-64">
            {batteryHistory.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={batteryHistory}>
                  <XAxis dataKey="time" stroke="#52525b" fontSize={12} tickMargin={10} />
                  <YAxis stroke="#52525b" fontSize={12} domain={[0, 100]} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px', color: '#fafafa' }}
                    itemStyle={{ color: '#10b981' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="nivel" 
                    stroke="#10b981" 
                    strokeWidth={3} 
                    dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, fill: '#fafafa' }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-gray-500 italic text-sm">
                Esperando datos de la batería...
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

export default App;
