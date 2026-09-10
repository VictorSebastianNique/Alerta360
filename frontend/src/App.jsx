import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { 
  Menu, Home, ShieldCheck, History, Settings, LogOut,
  Bell, Battery, BatteryWarning, Activity, Wifi, WifiOff,
  User, Lock, Package
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
const socket = io(BACKEND_URL, { autoConnect: false });

function App() {
  const [token, setToken] = useState(localStorage.getItem('jwtToken') || null);
  const [userInfo, setUserInfo] = useState(JSON.parse(localStorage.getItem('userInfo')) || null);
  
  // Auth Form State
  const [isLoginView, setIsLoginView] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [authError, setAuthError] = useState('');

  // App State
  const [state, setState] = useState(null);
  const [history, setHistory] = useState([]);
  const [batteryHistory, setBatteryHistory] = useState([]);
  const [backendConnected, setBackendConnected] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('estado');

  // Handle Authentication
  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    const endpoint = isLoginView ? '/api/auth/login' : '/api/auth/register';
    const body = isLoginView ? { email, password } : { email, password, deviceId };

    try {
      const res = await fetch(`${BACKEND_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Error de autenticación');
      
      localStorage.setItem('jwtToken', data.token);
      localStorage.setItem('userInfo', JSON.stringify(data.user));
      setToken(data.token);
      setUserInfo(data.user);
    } catch (err) {
      setAuthError(err.message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('jwtToken');
    localStorage.removeItem('userInfo');
    setToken(null);
    setUserInfo(null);
    socket.disconnect();
  };

  // Socket Connection
  useEffect(() => {
    if (!token) return;

    socket.auth = { token };
    socket.connect();

    const onConnect = () => setBackendConnected(true);
    const onDisconnect = () => setBackendConnected(false);
    const onConnectError = (err) => {
      if (err.message.includes('Token')) handleLogout();
    };
    
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    
    socket.on('initialState', (data) => {
      setState(data.currentState);
      setHistory(data.eventHistory || []);
      if (data.batteryHistory) setBatteryHistory(data.batteryHistory);
    });

    socket.on('stateUpdate', (newState) => setState(newState));
    socket.on('historyUpdate', (newHistory) => setHistory(newHistory));
    socket.on('batteryUpdate', (newBatteryHistory) => setBatteryHistory(newBatteryHistory));

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.off('initialState');
      socket.off('stateUpdate');
      socket.off('historyUpdate');
      socket.off('batteryUpdate');
      socket.disconnect();
    };
  }, [token]);

  // If not authenticated, show Auth Screen
  if (!token) {
    return (
      <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4">
        <div className="bg-card p-8 rounded-2xl shadow-xl w-full max-w-md border border-card-border">
          <div className="flex flex-col items-center mb-8">
             <ShieldCheck size={48} className="text-primary mb-2" />
             <h1 className="text-2xl font-bold text-foreground">ALERTA360</h1>
             <p className="text-text-muted text-sm">{isLoginView ? 'Inicia sesión en tu mochila' : 'Registra tu nueva mochila'}</p>
          </div>

          {authError && <div className="bg-alert-red/10 border border-alert-red text-alert-red p-3 rounded-lg text-sm mb-4">{authError}</div>}

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Correo Electrónico</label>
              <div className="relative">
                <User size={18} className="absolute left-3 top-3 text-gray-400" />
                <input type="email" required value={email} onChange={e=>setEmail(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:border-primary" placeholder="tu@email.com" />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-3 text-gray-400" />
                <input type="password" required value={password} onChange={e=>setPassword(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:border-primary" placeholder="••••••••" />
              </div>
            </div>

            {!isLoginView && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ID de la Mochila (Device ID)</label>
                <div className="relative">
                  <Package size={18} className="absolute left-3 top-3 text-gray-400" />
                  <input type="text" required value={deviceId} onChange={e=>setDeviceId(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:border-primary" placeholder="MOCHILA_001" />
                </div>
                <p className="text-xs text-gray-500 mt-1">Lo encuentras en la etiqueta del ESP32.</p>
              </div>
            )}

            <button type="submit" className="w-full bg-primary text-white py-2 rounded-lg font-medium hover:bg-blue-600 transition">
              {isLoginView ? 'Ingresar' : 'Registrarse'}
            </button>
          </form>

          <p className="text-center text-sm text-text-muted mt-6">
            {isLoginView ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'} 
            <button onClick={() => setIsLoginView(!isLoginView)} className="text-primary font-medium ml-1">
              {isLoginView ? 'Regístrate aquí' : 'Inicia Sesión'}
            </button>
          </p>
        </div>
      </div>
    );
  }

  // Authenticated State Variables
  const isEmergency = state?.alarma_activa || state?.origen_sos_manual || state?.vibracion_detectada;
  const isBatteryLow = state?.nivel_bateria_porcentaje <= 25;
  const lastUpdate = state?.timestamp ? new Date(state.timestamp).toLocaleString() : 'Conectando...';

  const renderTabContent = () => {
    switch (activeTab) {
      case 'inicio':
        return (
          <div className="bg-card p-8 rounded-2xl border border-card-border shadow-sm text-center max-w-2xl mx-auto mt-10">
            <ShieldCheck size={64} className="text-primary mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-foreground mb-2">¡Hola, {userInfo?.email.split('@')[0]}!</h2>
            <p className="text-text-muted text-lg mb-6">Estás conectado a la mochila: <span className="font-mono bg-gray-100 px-2 rounded">{userInfo?.deviceId}</span></p>
            <button onClick={() => setActiveTab('estado')} className="bg-primary text-white px-6 py-3 rounded-lg font-medium shadow-md hover:bg-blue-600 transition">
              Ir al Panel de Estado
            </button>
          </div>
        );

      case 'estado':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
              <div className="bg-card p-6 rounded-2xl border border-card-border shadow-sm flex flex-col items-center text-center">
                <h3 className="text-xs font-bold text-text-muted uppercase mb-4">ESTADO DE ALARMA</h3>
                <Bell size={48} className={isEmergency ? "text-alert-red animate-bounce" : "text-gray-300"} />
                <div className="mt-4">
                  {isEmergency ? (
                    <><h2 className="text-3xl font-black text-alert-red uppercase">ACTIVA</h2><p className="text-alert-red text-sm font-medium">Origen: {state?.origen_sos_manual ? 'SOS' : 'Vibración'}</p></>
                  ) : (
                    <><h2 className="text-3xl font-black text-alert-green uppercase">NORMAL</h2><p className="text-alert-green text-sm font-medium">Sin alertas</p></>
                  )}
                </div>
              </div>

              <div className="bg-card p-6 rounded-2xl border border-card-border shadow-sm flex flex-col items-center text-center">
                <h3 className="text-xs font-bold text-text-muted uppercase mb-4">BATERÍA</h3>
                {isBatteryLow ? <BatteryWarning size={48} className="text-alert-red" /> : <Battery size={48} className="text-alert-green" />}
                <div className="mt-4">
                  <h2 className={`text-4xl font-black ${isBatteryLow ? 'text-alert-red' : 'text-alert-green'}`}>{state?.nivel_bateria_porcentaje || 0}%</h2>
                  <p className={`text-sm font-medium ${isBatteryLow ? 'text-alert-red' : 'text-alert-green'}`}>{isBatteryLow ? 'Recargar ahora' : 'Carga suficiente'}</p>
                </div>
              </div>

              <div className="bg-card p-6 rounded-2xl border border-card-border shadow-sm flex flex-col items-center text-center">
                <h3 className="text-xs font-bold text-text-muted uppercase mb-4">VIBRACIÓN</h3>
                <Activity size={48} className={state?.vibracion_detectada ? "text-alert-blue animate-pulse" : "text-gray-300"} />
                <div className="mt-4">
                  <h2 className={`text-2xl font-black uppercase ${state?.vibracion_detectada ? 'text-alert-blue' : 'text-text-muted'}`}>{state?.vibracion_detectada ? 'DETECTADA' : 'NORMAL'}</h2>
                </div>
              </div>

              <div className="bg-card p-6 rounded-2xl border border-card-border shadow-sm flex flex-col items-center text-center">
                <h3 className="text-xs font-bold text-text-muted uppercase mb-4">CONECTIVIDAD</h3>
                {state?.conexion_wifi ? <Wifi size={48} className="text-alert-green" /> : <WifiOff size={48} className="text-gray-300" />}
                <div className="mt-4">
                  <h2 className={`text-2xl font-black uppercase ${state?.conexion_wifi ? 'text-alert-green' : 'text-text-muted'}`}>{state?.conexion_wifi ? 'CONECTADO' : 'DESCONECTADO'}</h2>
                </div>
              </div>
            </div>
            <div className="text-center bg-gray-200 py-3 rounded-xl">
              <p className="text-xs font-bold text-text-muted uppercase tracking-widest">ÚLTIMA ACTUALIZACIÓN: {lastUpdate}</p>
            </div>
          </div>
        );

      case 'historial':
        return (
          <div className="space-y-6">
            <div className="bg-card p-6 rounded-2xl border shadow-sm">
              <h3 className="text-lg font-bold text-foreground mb-4">Gráfico de Batería</h3>
              <div className="w-full h-64">
                {batteryHistory.length > 0 ? (
                  <ResponsiveContainer><LineChart data={batteryHistory}><XAxis dataKey="time" stroke="#9ca3af" fontSize={11} /><YAxis stroke="#9ca3af" fontSize={11} domain={[0, 100]} /><Tooltip contentStyle={{borderRadius: '8px'}}/><Line type="monotone" dataKey="nivel" stroke="#22c55e" strokeWidth={3} dot={{ fill: '#22c55e', r: 4 }} /></LineChart></ResponsiveContainer>
                ) : <div className="flex h-full items-center justify-center text-gray-400 italic">Acumulando datos...</div>}
              </div>
            </div>
          </div>
        );
      
      case 'configuracion':
        return (
          <div className="bg-card p-6 rounded-2xl border shadow-sm max-w-2xl mx-auto">
             <h3 className="text-xl font-bold mb-6 flex items-center gap-2"><Settings size={24} className="text-primary" /> Ajustes del Sistema</h3>
             <div className="space-y-4">
               <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">ID Mochila Asociada</label>
                 <input type="text" value={userInfo?.deviceId} disabled className="w-full px-4 py-2 bg-gray-100 border rounded-lg text-gray-500 cursor-not-allowed" />
               </div>
               <button onClick={handleLogout} className="w-full flex justify-center items-center gap-2 bg-red-100 text-red-600 px-4 py-2 rounded-lg font-medium hover:bg-red-200 transition mt-8">
                 <LogOut size={18} /> Cerrar Sesión
               </button>
             </div>
          </div>
        );
      default: return null;
    }
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground font-sans">
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-card-border transform transition-transform duration-300 md:translate-x-0 md:static ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-full flex flex-col">
          <div className="p-6 border-b flex items-center justify-between">
            <h1 className="text-2xl font-bold text-primary">ALERTA360</h1>
            <button className="md:hidden" onClick={() => setSidebarOpen(false)}><Menu size={24} className="text-text-muted" /></button>
          </div>
          <nav className="flex-1 p-4 space-y-2">
            {['inicio', 'estado', 'historial', 'configuracion'].map(tab => (
              <button key={tab} onClick={() => { setActiveTab(tab); setSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg capitalize transition-colors ${activeTab === tab ? 'bg-primary text-white shadow-md' : 'text-text-muted hover:bg-gray-50'}`}>
                {tab === 'inicio' && <Home size={20} />} {tab === 'estado' && <ShieldCheck size={20} />} {tab === 'historial' && <History size={20} />} {tab === 'configuracion' && <Settings size={20} />}
                <span className="font-medium">{tab}</span>
              </button>
            ))}
          </nav>
        </div>
      </aside>
      
      {sidebarOpen && <div className="fixed inset-0 bg-black/20 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />}
      
      <main className="flex-1 flex flex-col h-screen overflow-y-auto">
        <header className="bg-card border-b px-4 py-4 md:px-8 flex justify-between items-center sticky top-0 z-30 shadow-sm">
          <div className="flex items-center gap-4">
            <button className="md:hidden p-2 -ml-2" onClick={() => setSidebarOpen(true)}><Menu size={24} className="text-text-muted" /></button>
            <h2 className="text-lg md:text-xl font-bold md:hidden">ALERTA360</h2>
            <h2 className="text-xl font-bold hidden md:block capitalize">{activeTab}</h2>
          </div>
          <div className="flex items-center gap-2">
            {backendConnected ? (
              <span className="flex items-center gap-2 text-sm font-semibold"><span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-alert-green opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-alert-green"></span></span>Conectado</span>
            ) : (
              <span className="flex items-center gap-2 text-sm font-semibold text-text-muted"><span className="w-3 h-3 rounded-full bg-gray-400"></span>Desconectado</span>
            )}
          </div>
        </header>
        <div className="p-4 md:p-8 w-full max-w-5xl mx-auto">{renderTabContent()}</div>
      </main>
    </div>
  );
}

export default App;
