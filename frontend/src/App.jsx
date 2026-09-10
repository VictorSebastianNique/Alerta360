import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { 
  Menu, Home, ShieldCheck, History, Settings,
  Bell, Battery, BatteryWarning, Activity, Wifi, WifiOff,
  Phone, Save
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Manejo de pestañas
  const [activeTab, setActiveTab] = useState('estado');

  useEffect(() => {
    socket.on('connect', () => setBackendConnected(true));
    socket.on('disconnect', () => setBackendConnected(false));
    
    socket.on('initialState', (data) => {
      setState(data.currentState);
      setHistory(data.eventHistory || []);
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
  const lastUpdate = new Date(state.timestamp).toLocaleString();

  // Componentes de las Pestañas
  const renderTabContent = () => {
    switch (activeTab) {
      case 'inicio':
        return (
          <div className="bg-card p-8 rounded-2xl border border-card-border shadow-sm text-center max-w-2xl mx-auto mt-10">
            <ShieldCheck size={64} className="text-primary mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-foreground mb-4">Bienvenido a ALERTA360</h2>
            <p className="text-text-muted text-lg mb-6">
              El sistema inteligente de alerta, comunicación y monitoreo energético para emergencias. 
              Mantén tu mochila siempre lista y protegida.
            </p>
            <button 
              onClick={() => setActiveTab('estado')}
              className="bg-primary text-white px-6 py-3 rounded-lg font-medium shadow-md hover:bg-blue-600 transition"
            >
              Ir al Panel de Estado
            </button>
          </div>
        );

      case 'estado':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
              {/* CARD 1: ESTADO DE ALARMA */}
              <div className="bg-card p-6 rounded-2xl border border-card-border shadow-sm flex flex-col items-center justify-center text-center">
                <h3 className="text-xs font-bold text-text-muted tracking-wider uppercase mb-4">ESTADO DE ALARMA</h3>
                <Bell size={48} className={isEmergency ? "text-alert-red animate-bounce" : "text-gray-300"} />
                <div className="mt-4">
                  {isEmergency ? (
                    <>
                      <h2 className="text-3xl font-black text-alert-red uppercase">ACTIVA</h2>
                      <p className="text-alert-red text-sm font-medium mt-1">Origen: {state.origen_sos_manual ? 'Botón SOS' : 'Vibración'}</p>
                    </>
                  ) : (
                    <>
                      <h2 className="text-3xl font-black text-alert-green uppercase">NORMAL</h2>
                      <p className="text-alert-green text-sm font-medium mt-1">Sin alertas activas</p>
                    </>
                  )}
                </div>
              </div>

              {/* CARD 2: BATERÍA */}
              <div className="bg-card p-6 rounded-2xl border border-card-border shadow-sm flex flex-col items-center justify-center text-center">
                <h3 className="text-xs font-bold text-text-muted tracking-wider uppercase mb-4">BATERÍA</h3>
                {isBatteryLow ? (
                  <BatteryWarning size={48} className="text-alert-red" />
                ) : (
                  <Battery size={48} className="text-alert-green" />
                )}
                <div className="mt-4">
                  <h2 className={`text-4xl font-black ${isBatteryLow ? 'text-alert-red' : 'text-alert-green'}`}>
                    {state.nivel_bateria_porcentaje}%
                  </h2>
                  <p className={`text-sm font-medium mt-1 ${isBatteryLow ? 'text-alert-red' : 'text-alert-green'}`}>
                    {isBatteryLow ? 'Recargar ahora' : 'Carga suficiente'}
                  </p>
                </div>
              </div>

              {/* CARD 3: VIBRACIÓN */}
              <div className="bg-card p-6 rounded-2xl border border-card-border shadow-sm flex flex-col items-center justify-center text-center">
                <h3 className="text-xs font-bold text-text-muted tracking-wider uppercase mb-4">VIBRACIÓN</h3>
                <Activity size={48} className={state.vibracion_detectada ? "text-alert-blue animate-pulse" : "text-gray-300"} />
                <div className="mt-4">
                  <h2 className={`text-2xl font-black uppercase ${state.vibracion_detectada ? 'text-alert-blue' : 'text-text-muted'}`}>
                    {state.vibracion_detectada ? 'DETECTADA' : 'NORMAL'}
                  </h2>
                </div>
              </div>

              {/* CARD 4: CONECTIVIDAD */}
              <div className="bg-card p-6 rounded-2xl border border-card-border shadow-sm flex flex-col items-center justify-center text-center">
                <h3 className="text-xs font-bold text-text-muted tracking-wider uppercase mb-4">CONECTIVIDAD</h3>
                {state.conexion_wifi ? (
                  <Wifi size={48} className="text-alert-green" />
                ) : (
                  <WifiOff size={48} className="text-gray-300" />
                )}
                <div className="mt-4">
                  <h2 className={`text-2xl font-black uppercase ${state.conexion_wifi ? 'text-alert-green' : 'text-text-muted'}`}>
                    {state.conexion_wifi ? 'CONECTADO' : 'DESCONECTADO'}
                  </h2>
                </div>
              </div>
            </div>

            {/* LAST UPDATE FOOTER */}
            <div className="text-center bg-gray-200 py-3 rounded-xl">
              <p className="text-xs font-bold text-text-muted uppercase tracking-widest">
                ÚLTIMA ACTUALIZACIÓN: {lastUpdate !== 'Invalid Date' ? lastUpdate : 'Esperando datos...'}
              </p>
            </div>
          </div>
        );

      case 'historial':
        return (
          <div className="space-y-6">
            <div className="bg-card p-6 rounded-2xl border border-card-border shadow-sm">
              <h3 className="text-lg font-bold text-foreground mb-4">Gráfico de Batería</h3>
              <div className="w-full h-64">
                {batteryHistory.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={batteryHistory}>
                      <XAxis dataKey="time" stroke="#9ca3af" fontSize={11} tickMargin={10} />
                      <YAxis stroke="#9ca3af" fontSize={11} domain={[0, 100]} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', color: '#1f2937' }}
                        itemStyle={{ color: '#22c55e' }}
                      />
                      <Line type="monotone" dataKey="nivel" stroke="#22c55e" strokeWidth={3} dot={{ fill: '#22c55e', strokeWidth: 2, r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-gray-400 italic">Acumulando datos...</div>
                )}
              </div>
            </div>

            <div className="bg-card p-6 rounded-2xl border border-card-border shadow-sm">
              <h3 className="text-lg font-bold text-foreground mb-4">Registro de Alertas</h3>
              {history.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-gray-600">
                    <thead className="text-xs uppercase bg-gray-100 text-gray-700">
                      <tr>
                        <th className="px-4 py-3 rounded-tl-lg">Tipo de Evento</th>
                        <th className="px-4 py-3 rounded-tr-lg">Fecha y Hora</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((event, i) => (
                        <tr key={i} className="border-b last:border-0 border-gray-100 hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-alert-red">{event.type}</td>
                          <td className="px-4 py-3">{new Date(event.timestamp).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 italic text-sm text-center py-4">No se han registrado emergencias.</p>
              )}
            </div>
          </div>
        );

      case 'configuracion':
        return (
          <div className="bg-card p-6 rounded-2xl border border-card-border shadow-sm max-w-2xl mx-auto">
             <h3 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
                <Settings size={24} className="text-primary" /> Ajustes del Sistema
              </h3>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Token de Seguridad (API KEY)</label>
                  <input 
                    type="password" 
                    defaultValue="ALERTA360_SECRET_TOKEN_2026"
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-700 focus:outline-none focus:border-primary"
                    disabled
                  />
                  <p className="text-xs text-gray-500 mt-1">El token está configurado en las variables de entorno.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Contacto de Emergencia Principal</label>
                  <div className="flex relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Phone size={16} className="text-gray-400" />
                    </div>
                    <input 
                      type="tel" 
                      placeholder="+51 999 888 777"
                      className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-700 focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <button className="w-full flex justify-center items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg font-medium shadow-sm hover:bg-blue-600 transition">
                  <Save size={18} /> Guardar Cambios
                </button>
              </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground font-sans">
      
      {/* SIDEBAR */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-card-border transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-full flex flex-col">
          <div className="p-6 border-b border-card-border flex items-center justify-between">
            <h1 className="text-2xl font-bold text-primary tracking-tight">ALERTA360</h1>
            <button className="md:hidden" onClick={() => setSidebarOpen(false)}>
               <Menu size={24} className="text-text-muted" />
            </button>
          </div>
          
          <nav className="flex-1 p-4 space-y-2">
            <button 
              onClick={() => { setActiveTab('inicio'); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'inicio' ? 'bg-primary text-white shadow-md' : 'text-text-muted hover:bg-gray-50 hover:text-foreground'}`}
            >
              <Home size={20} /> <span className="font-medium">Inicio</span>
            </button>
            <button 
              onClick={() => { setActiveTab('estado'); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'estado' ? 'bg-primary text-white shadow-md' : 'text-text-muted hover:bg-gray-50 hover:text-foreground'}`}
            >
              <ShieldCheck size={20} /> <span className="font-medium">Estado</span>
            </button>
            <button 
              onClick={() => { setActiveTab('historial'); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'historial' ? 'bg-primary text-white shadow-md' : 'text-text-muted hover:bg-gray-50 hover:text-foreground'}`}
            >
              <History size={20} /> <span className="font-medium">Historial</span>
            </button>
            <button 
              onClick={() => { setActiveTab('configuracion'); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'configuracion' ? 'bg-primary text-white shadow-md' : 'text-text-muted hover:bg-gray-50 hover:text-foreground'}`}
            >
              <Settings size={20} /> <span className="font-medium">Configuración</span>
            </button>
          </nav>
        </div>
      </aside>

      {/* OVERLAY FOR MOBILE SIDEBAR */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/20 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col h-screen overflow-y-auto">
        <header className="bg-card border-b border-card-border px-4 py-4 md:px-8 flex justify-between items-center sticky top-0 z-30 shadow-sm">
          <div className="flex items-center gap-4">
            <button className="md:hidden p-2 -ml-2" onClick={() => setSidebarOpen(true)}>
              <Menu size={24} className="text-text-muted" />
            </button>
            <h2 className="text-lg md:text-xl font-bold text-foreground md:hidden">ALERTA360</h2>
            <h2 className="text-xl font-bold text-foreground hidden md:block">
              {activeTab === 'estado' && 'Monitoreo Web en Tiempo Real'}
              {activeTab === 'inicio' && 'Inicio'}
              {activeTab === 'historial' && 'Historial de Eventos'}
              {activeTab === 'configuracion' && 'Configuración'}
            </h2>
          </div>
          
          <div className="flex items-center gap-2">
            {backendConnected ? (
              <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-alert-green opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-alert-green"></span>
                </span>
                Conectado
              </span>
            ) : (
              <span className="flex items-center gap-2 text-sm font-semibold text-text-muted">
                <span className="w-3 h-3 rounded-full bg-gray-400"></span>
                Desconectado
              </span>
            )}
          </div>
        </header>

        <div className="p-4 md:p-8 w-full max-w-5xl mx-auto">
          {renderTabContent()}
        </div>
      </main>
    </div>
  );
}

export default App;
