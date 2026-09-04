#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// ---------------------------------------------------------
// CONFIGURACIÓN DE RED Y SERVIDOR
// ---------------------------------------------------------
const char* ssid = "TU_WIFI_SSID";
const char* password = "TU_WIFI_PASSWORD";
// IP de tu computadora en la red local donde corre Node.js (ej: 192.168.1.50)
const char* serverName = "http://192.168.1.XX:3000/api/data"; 

// ---------------------------------------------------------
// DEFINICIÓN DE PINES
// ---------------------------------------------------------
const int PIN_SOS = 4;           // Pulsador SOS
const int PIN_VIBRACION = 5;     // Sensor SW-420
const int PIN_BAT_ADC = 34;      // Divisor de tensión de la batería
const int PIN_BUZZER = 18;       // Buzzer activo
const int PIN_LED_VERDE = 19;
const int PIN_LED_ROJO = 21;

// ---------------------------------------------------------
// VARIABLES DE ESTADO
// ---------------------------------------------------------
bool sosPresionado = false;
bool vibracionDetectada = false;
unsigned long lastKeepAlive = 0;
const unsigned long keepAliveInterval = 30000; // Enviar estado cada 30 segundos

// ---------------------------------------------------------
// INTERRUPCIONES (ISRs)
// ---------------------------------------------------------
void IRAM_ATTR isrSOS() {
  sosPresionado = true;
}

void IRAM_ATTR isrVibracion() {
  vibracionDetectada = true;
}

// ---------------------------------------------------------
// FUNCIONES AUXILIARES
// ---------------------------------------------------------
int calcularBateria() {
  // El ADC del ESP32 es de 12 bits (0-4095). Rango max 3.3V.
  // Con un divisor resistivo (ej. R1=100k, R2=100k) 4.2V entran como 2.1V
  int adcValue = analogRead(PIN_BAT_ADC);
  
  // Calibración aproximada (dependerá de tus resistencias reales)
  // Mapeamos el ADC a porcentaje de batería (0% a 100%)
  // Supongamos que 4.2V (llena) = ~2600 ADC, 3.0V (vacía) = ~1860 ADC
  int porcentaje = map(adcValue, 1860, 2600, 0, 100);
  porcentaje = constrain(porcentaje, 0, 100);
  return porcentaje;
}

void activarAlarmaLocal() {
  digitalWrite(PIN_LED_VERDE, LOW);
  digitalWrite(PIN_LED_ROJO, HIGH);
  tone(PIN_BUZZER, 1000); // 1KHz
}

void desactivarAlarmaLocal() {
  digitalWrite(PIN_LED_ROJO, LOW);
  noTone(PIN_BUZZER);
  digitalWrite(PIN_LED_VERDE, HIGH);
}

void enviarDatos(bool isEmergency) {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(serverName);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("x-api-key", "ALERTA360_SECRET_TOKEN_2026"); // Token de seguridad

    // Construir el JSON
    StaticJsonDocument<200> doc;
    doc["alarma_activa"] = isEmergency;
    doc["origen_sos_manual"] = sosPresionado;
    doc["vibracion_detectada"] = vibracionDetectada;
    doc["nivel_bateria_porcentaje"] = calcularBateria();

    String requestBody;
    serializeJson(doc, requestBody);

    int httpResponseCode = http.POST(requestBody);
    
    if (httpResponseCode > 0) {
      Serial.print("Código HTTP: ");
      Serial.println(httpResponseCode);
    } else {
      Serial.print("Error en POST: ");
      Serial.println(http.errorToString(httpResponseCode).c_str());
    }
    http.end();
  } else {
    Serial.println("Error en conexión WiFi");
  }
}

// ---------------------------------------------------------
// SETUP Y LOOP
// ---------------------------------------------------------
void setup() {
  Serial.begin(115200);

  // Configuración de pines
  pinMode(PIN_SOS, INPUT_PULLUP);
  pinMode(PIN_VIBRACION, INPUT);
  pinMode(PIN_BAT_ADC, INPUT);
  
  pinMode(PIN_BUZZER, OUTPUT);
  pinMode(PIN_LED_VERDE, OUTPUT);
  pinMode(PIN_LED_ROJO, OUTPUT);

  // Estado inicial
  desactivarAlarmaLocal();

  // Adjuntar interrupciones
  attachInterrupt(digitalPinToInterrupt(PIN_SOS), isrSOS, FALLING);
  attachInterrupt(digitalPinToInterrupt(PIN_VIBRACION), isrVibracion, RISING);

  // Conexión WiFi
  WiFi.begin(ssid, password);
  Serial.print("Conectando WiFi...");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi conectado!");
  Serial.print("Dirección IP: ");
  Serial.println(WiFi.localIP());

  // Enviar estado inicial
  enviarDatos(false);
}

void loop() {
  // 1. Evaluar si hay emergencia
  if (sosPresionado || vibracionDetectada) {
    activarAlarmaLocal();
    enviarDatos(true);
    
    // Mantener la alarma por 5 segundos antes de permitir resetearla
    delay(5000); 
    
    // Resetear variables (en la vida real podrías requerir reset físico)
    sosPresionado = false;
    vibracionDetectada = false;
    desactivarAlarmaLocal();
    
    // Notificar que la emergencia terminó (o actualizar estado)
    enviarDatos(false); 
  }

  // 2. Keep-Alive periódico
  if (millis() - lastKeepAlive > keepAliveInterval) {
    enviarDatos(false);
    lastKeepAlive = millis();
  }
}
