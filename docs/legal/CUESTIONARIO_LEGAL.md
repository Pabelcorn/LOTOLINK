# Cuestionario para Documentos Legales de LOTOLINK

Este documento contiene las preguntas necesarias para personalizar completamente los documentos legales de LOTOLINK (Términos y Condiciones, Política de Privacidad, y Declaración Legal).

## 📋 Información Empresarial

### 1. Entidad Legal
**Pregunta:** ¿LOTOLINK opera como una empresa registrada (ej. SRL, EIRL, S.A.) o como persona física?

- [ ] Empresa registrada
- [ ] Persona física

**Si es empresa, proporcione:**
- **Razón Social/Nombre Legal:** `[COMPLETAR]`
- **Tipo de Sociedad:** `[Ej: SRL, S.A., EIRL]`
- **RNC (Registro Nacional del Contribuyente):** `[COMPLETAR]`
- **Dirección Fiscal:** `[COMPLETAR]`
- **País de Registro:** `[República Dominicana / Otro]`

**Si es persona física:**
- **Nombre Completo:** `[COMPLETAR]`
- **Cédula de Identidad:** `[COMPLETAR]`
- **Dirección:** `[COMPLETAR]`

---

## 📧 Información de Contacto

### 2. Correo Electrónico Oficial
**Pregunta:** ¿Ya tienen un correo oficial de contacto legal o lo dejamos como ejemplo editable?

**Correo Legal/Contacto:** `[Ej: legal@lotolink.com, contacto@lotolink.com]`
**Correo Soporte:** `[Ej: soporte@lotolink.com]`
**Correo Privacidad/DPO:** `[Ej: privacidad@lotolink.com]`

### 3. Otros Contactos
**Teléfono de Contacto:** `[Ej: +1 809-XXX-XXXX]`
**Dirección de Oficinas (si aplica):** `[COMPLETAR]`
**Sitio Web:** `[Ej: https://lotolink.com]`

---

## 🗃️ Datos Recolectados

### 4. Datos de Usuario
**Pregunta:** ¿Qué datos específicos recolecta LOTOLINK de los usuarios?

Basado en el análisis del código, se identificó:

✅ **Datos Confirmados:**
- [x] Número de teléfono (obligatorio)
- [x] Correo electrónico (opcional)
- [x] Nombre (opcional)
- [x] Saldo de wallet/billetera
- [x] Historial de jugadas (números, montos, fechas)
- [x] Datos de pago (últimos 4 dígitos de tarjeta, método de pago)
- [x] Dirección IP y datos de conexión
- [x] Preferencias de usuario

**Datos Adicionales (si aplica):**
- [ ] Ubicación geográfica/GPS
- [ ] Fecha de nacimiento
- [ ] Documento de identidad
- [ ] Dirección física
- [ ] Fotografía/Selfie
- [ ] Otros: `[ESPECIFICAR]`

### 5. Uso de Cookies y Tecnologías de Rastreo
**Pregunta:** ¿La plataforma utiliza cookies u otras tecnologías de rastreo?

- [x] Sí (LocalStorage para sesiones identificado en código)
- [ ] No

**Si sí, especifique tipos:**
- [x] Cookies técnicas/esenciales
- [x] Cookies de sesión
- [ ] Cookies de análisis (Google Analytics, etc.)
- [ ] Cookies de marketing
- [ ] Otros: `[ESPECIFICAR]`

---

## 🌍 Jurisdicción y Operación

### 6. Ámbito Geográfico
**Pregunta:** ¿Solo operan en República Dominicana, o tienen pensado escalar a otros países a corto plazo?

- [ ] Solo República Dominicana
- [ ] Múltiples países (especificar)
- [ ] República Dominicana ahora, expansión planeada

**Países donde opera actualmente:**
- República Dominicana: `[SÍ/NO]`
- Otros: `[ESPECIFICAR]`

**Países donde planea operar (próximos 12 meses):**
`[COMPLETAR]`

### 7. Leyes Aplicables
**Jurisdicción legal principal:** `[Ej: República Dominicana]`
**Leyes específicas aplicables (si conoce):**
- Ley de Protección de Datos (Ley 172-13 de República Dominicana)
- Ley de Comercio Electrónico
- Reglamentaciones de juegos y apuestas
- Otras: `[ESPECIFICAR]`

---

## 💳 Procesamiento de Pagos

### 8. Métodos de Pago
**Pregunta:** ¿Incluye procesamiento de pagos o solo gestiona jugadas?

✅ **Confirmado en código:**
- [x] Procesamiento de pagos incluido
- [x] Stripe como pasarela de pago
- [x] Wallet/Billetera interna
- [x] Tarjetas de crédito/débito
- [ ] Transferencias bancarias
- [ ] Otros métodos: `[ESPECIFICAR]`

### 9. Proveedores de Pago
**Pasarela de Pago Principal:** Stripe ✅
**Otros Proveedores:** `[ESPECIFICAR si hay otros]`

### 10. Manejo de Fondos
**Pregunta:** ¿LOTOLINK retiene fondos de usuarios (billetera)?
- [x] Sí, mediante sistema de wallet

**Pregunta:** ¿Cobra comisiones por transacciones?
- [x] Sí (identificado en código: commission_percentage)
- [ ] No

**Porcentaje de comisión:** `[ESPECIFICAR si desean publicarlo]`

---

## 🎲 Modelo de Negocio

### 11. Descripción del Servicio
**Pregunta:** Confirme el modelo de negocio principal:

✅ **Modelo Identificado:**
LOTOLINK actúa como **intermediario/marketplace** que:
- Conecta usuarios finales con "bancas" (casas de apuestas)
- Recibe jugadas de usuarios
- Enruta las jugadas a las bancas registradas
- Gestiona confirmaciones y tickets
- Procesa pagos a través de wallet y tarjetas

**¿Es correcta esta descripción?** `[SÍ/NO]`
**Aclaraciones o correcciones:** `[COMPLETAR]`

### 12. Relación con Bancas
**Pregunta:** ¿Cómo se relacionan con las "bancas"?
- [x] Son socios/partners registrados
- [x] Tienen contrato/acuerdo comercial
- [x] LOTOLINK cobra comisión por transacción

**Responsabilidad de pago de premios:**
- [ ] LOTOLINK paga directamente a usuarios
- [ ] Las bancas pagan a los usuarios
- [ ] Modelo mixto: `[ESPECIFICAR]`

---

## 🔒 Seguridad y Privacidad

### 13. Medidas de Seguridad Implementadas
✅ **Identificadas en código:**
- [x] Autenticación JWT
- [x] HMAC para firma de mensajes
- [x] Encriptación de contraseñas
- [x] Validación de timestamps (replay protection)
- [x] HTTPS/TLS
- [x] Tokenización de tarjetas (Stripe)

### 14. Retención de Datos
**Pregunta:** ¿Cuánto tiempo retienen los datos de usuarios?
`[Ej: Mientras la cuenta esté activa + 5 años después de cierre]`

**Pregunta:** ¿Cuánto tiempo retienen el historial de jugadas?
`[Ej: 7 años por requisitos fiscales]`

---

## ⚖️ Requisitos Legales y Cumplimiento

### 15. Licencias y Permisos
**Pregunta:** ¿LOTOLINK requiere licencia para operar como intermediario de juegos?
- [ ] Sí, licencia obtenida: `[NÚMERO/TIPO]`
- [ ] Sí, en proceso de obtención
- [ ] No requiere
- [ ] Desconocido

### 16. Edad Mínima
**Pregunta:** ¿Cuál es la edad mínima para usar LOTOLINK?
`[Ej: 18 años, 21 años]`

### 17. Juego Responsable
**Pregunta:** ¿Implementan medidas de juego responsable?
- [ ] Límites de apuesta
- [ ] Auto-exclusión
- [ ] Recursos de ayuda para ludopatía
- [ ] Otros: `[ESPECIFICAR]`

---

## 📄 Documentos Adicionales

### 18. Términos para Bancas
**Pregunta:** ¿Necesitan también Términos y Condiciones específicos para las bancas asociadas?
- [ ] Sí
- [ ] No
- [ ] Pendiente

### 19. Política de Cookies
**Pregunta:** ¿Desean un documento separado de Política de Cookies?
- [ ] Sí, documento separado
- [x] No, incluir en Política de Privacidad
- [ ] No aplica

---

## ✅ Instrucciones de Uso

Una vez completado este cuestionario:

1. **Complete todos los campos marcados con `[COMPLETAR]`**
2. **Marque las casillas aplicables con `[x]`**
3. **Revise la información identificada del código y corrija si es necesario**
4. **Envíe el documento completado**

Con esta información, se generarán:
- ✅ **Términos y Condiciones** personalizados
- ✅ **Política de Privacidad** personalizada
- ✅ **Declaración Legal** personalizada
- ✅ **Aviso de Cookies** (si aplica)

---

## 📞 Contacto

Si tiene dudas sobre alguna pregunta o necesita asesoría legal profesional, recomendamos consultar con un abogado especializado en:
- Derecho Digital y Comercio Electrónico
- Protección de Datos Personales
- Regulación de Juegos y Apuestas
- Derecho del Consumidor

---

**Fecha de Creación:** Diciembre 2024
**Versión:** 1.0
