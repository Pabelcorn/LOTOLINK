# Web Authentication Implementation Guide

## Overview
This document describes how to implement the complete authentication flow in the LOTOLINK web application (index.html).

## Required Changes to index.html

### 1. Add Splash Screen (lines ~1600, before main app)

Add this CSS in the `<style>` section:

```css
/* Splash Screen Styles */
.splash-screen {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #0071e3 0%, #005bb5 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  transition: opacity 0.5s ease-out;
}

.splash-screen.fade-out {
  opacity: 0;
  pointer-events: none;
}

.splash-content {
  text-align: center;
  animation: fadeInUp 0.8s ease-out;
}

.splash-logo {
  width: 120px;
  height: 120px;
  margin-bottom: 2rem;
  filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.2));
  animation: pulse 2s ease-in-out infinite;
}

.splash-title {
  font-size: 3rem;
  font-weight: 700;
  color: white;
  margin: 0 0 0.5rem 0;
}

.splash-subtitle {
  font-size: 1.2rem;
  color: rgba(255, 255, 255, 0.9);
}

.splash-loader {
  margin-top: 2rem;
}

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}
```

Add splash screen HTML at the start of `<body>`:

```html
<div id="splash-screen" class="splash-screen">
  <div class="splash-content">
    <img src="./lotolink-logo.png" alt="LotoLink" class="splash-logo" />
    <h1 class="splash-title">LotoLink</h1>
    <p class="splash-subtitle">Tu lotería favorita</p>
    <div class="splash-loader">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
    </div>
  </div>
</div>
```

Add splash screen logic in JavaScript:

```javascript
// Show splash screen for 2.5 seconds
setTimeout(() => {
  const splash = document.getElementById('splash-screen');
  if (splash) {
    splash.classList.add('fade-out');
    setTimeout(() => {
      splash.style.display = 'none';
    }, 500);
  }
}, 2500);
```

### 2. Update Authentication Modal (Replace lines ~5967-6200)

**CRITICAL SECURITY FIX:** Remove all hardcoded admin credentials from the frontend code!

Replace the existing authentication modal with this secure implementation:

```javascript
const [authTab, setAuthTab] = useState('login'); // 'login' or 'register'
const [authData, setAuthData] = useState({
  name: '',
  email: '',
  phone: '',
  password: '',
  dateOfBirth: '',
  adminCode: ''
});
const [showAdminField, setShowAdminField] = useState(false);
const [showPassword, setShowPassword] = useState(false);

// API configuration
const API_BASE = window.location.hostname === 'localhost' 
  ? 'http://localhost:3000' 
  : 'https://api.lotolink.com';  // Update with your production API URL

// Calculate age from date of birth
function calculateAge(birthDate) {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

// Handle login
async function handleLogin() {
  if (!authData.phone || !authData.password) {
    alert('Por favor completa todos los campos requeridos');
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: authData.phone,
        password: authData.password,
        adminCode: authData.adminCode || undefined
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Error al iniciar sesión');
    }

    const data = await response.json();
    
    // Store tokens securely
    localStorage.setItem('ll_access_token', data.accessToken);
    localStorage.setItem('ll_refresh_token', data.refreshToken);
    
    // Store user data
    setUser(data.user);
    localStorage.setItem('ll_user', JSON.stringify(data.user));
    
    setShowAuthModal(false);
    
    // Show success message
    if (data.user.isAdmin) {
      alert('✅ Bienvenido, Administrador!\n\nAhora puedes acceder al Panel de Administración.');
    }
  } catch (error) {
    console.error('Login error:', error);
    alert(error.message || 'Error al iniciar sesión');
  }
}

// Handle registration
async function handleRegister() {
  if (!authData.phone || !authData.password || !authData.dateOfBirth) {
    alert('Por favor completa todos los campos requeridos');
    return;
  }

  if (authData.password.length < 8) {
    alert('La contraseña debe tener al menos 8 caracteres');
    return;
  }

  // Validate age (18+)
  const age = calculateAge(authData.dateOfBirth);
  if (age < 18) {
    alert('Debes tener al menos 18 años para registrarte');
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: authData.phone,
        password: authData.password,
        email: authData.email || undefined,
        name: authData.name || undefined,
        dateOfBirth: authData.dateOfBirth
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Error al registrarse');
    }

    const data = await response.json();
    
    // Store tokens securely
    localStorage.setItem('ll_access_token', data.accessToken);
    localStorage.setItem('ll_refresh_token', data.refreshToken);
    
    // Store user data
    setUser(data.user);
    localStorage.setItem('ll_user', JSON.stringify(data.user));
    
    setShowAuthModal(false);
  } catch (error) {
    console.error('Register error:', error);
    alert(error.message || 'Error al registrarse');
  }
}

// OAuth login handlers
async function handleOAuthLogin(provider) {
  alert(`OAuth con ${provider} - Implementación pendiente\n\nPor favor contacta al administrador para habilitar esta funcionalidad.`);
  // TODO: Implement OAuth flow with Google/Apple/Facebook SDKs
}
```

Replace the auth modal JSX (around line 5967):

```jsx
{showAuthModal && (
  <div className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop p-4">
    <div className="premium-card w-full max-w-md p-8 animate-fade-in max-h-[90vh] overflow-y-auto">
      {/* Close button */}
      <button 
        onClick={() => setShowAuthModal(false)}
        className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
      >
        ✕
      </button>

      {/* Header */}
      <div className="text-center mb-6">
        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-4 text-4xl shadow-lg shadow-blue-500/30">
          👋
        </div>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Bienvenido a LotoLink
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          {authTab === 'login' ? 'Inicia sesión para continuar' : 'Crea tu cuenta para empezar'}
        </p>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-2 mb-6 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
        <button
          onClick={() => setAuthTab('login')}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
            authTab === 'login'
              ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-sm'
              : 'text-gray-600 dark:text-gray-400'
          }`}
        >
          Iniciar Sesión
        </button>
        <button
          onClick={() => setAuthTab('register')}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
            authTab === 'register'
              ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-sm'
              : 'text-gray-600 dark:text-gray-400'
          }`}
        >
          Registrarse
        </button>
      </div>

      {/* Form Fields */}
      <div className="space-y-4">
        {authTab === 'register' && (
          <input
            value={authData.name}
            onChange={(e) => setAuthData({...authData, name: e.target.value})}
            className="w-full border border-gray-200 dark:border-white/10 p-4 rounded-xl bg-gray-50 dark:bg-white/5 dark:text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
            placeholder="Nombre (opcional)"
          />
        )}

        <input
          value={authData.phone}
          onChange={(e) => setAuthData({...authData, phone: e.target.value})}
          className="w-full border border-gray-200 dark:border-white/10 p-4 rounded-xl bg-gray-50 dark:bg-white/5 dark:text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
          placeholder="Teléfono *"
          type="tel"
        />

        {authTab === 'register' && (
          <>
            <input
              value={authData.email}
              onChange={(e) => setAuthData({...authData, email: e.target.value})}
              className="w-full border border-gray-200 dark:border-white/10 p-4 rounded-xl bg-gray-50 dark:bg-white/5 dark:text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
              placeholder="Email (opcional)"
              type="email"
            />

            <input
              value={authData.dateOfBirth}
              onChange={(e) => setAuthData({...authData, dateOfBirth: e.target.value})}
              className="w-full border border-gray-200 dark:border-white/10 p-4 rounded-xl bg-gray-50 dark:bg-white/5 dark:text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
              placeholder="Fecha de Nacimiento *"
              type="date"
              max={new Date().toISOString().split('T')[0]}
            />
            <p className="text-xs text-gray-500 -mt-2">* Debes tener al menos 18 años</p>
          </>
        )}

        <div className="relative">
          <input
            value={authData.password}
            onChange={(e) => setAuthData({...authData, password: e.target.value})}
            className="w-full border border-gray-200 dark:border-white/10 p-4 rounded-xl bg-gray-50 dark:bg-white/5 dark:text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all pr-12"
            placeholder="Contraseña * (mín. 8 caracteres)"
            type={showPassword ? 'text' : 'password'}
          />
          <button
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showPassword ? '👁️' : '👁️‍🗨️'}
          </button>
        </div>

        {authTab === 'login' && (
          <>
            <button
              onClick={() => setShowAdminField(!showAdminField)}
              className="text-sm text-blue-600 hover:underline"
            >
              {showAdminField ? 'Ocultar' : 'Mostrar'} campo de administrador
            </button>

            {showAdminField && (
              <input
                value={authData.adminCode}
                onChange={(e) => setAuthData({...authData, adminCode: e.target.value})}
                className="w-full border border-gray-200 dark:border-white/10 p-4 rounded-xl bg-gray-50 dark:bg-white/5 dark:text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                placeholder="Código de Administrador (opcional)"
                type="password"
              />
            )}
          </>
        )}

        {/* Submit Button */}
        <button
          onClick={authTab === 'login' ? handleLogin : handleRegister}
          className="btn-apple-primary w-full py-4 text-lg"
        >
          {authTab === 'login' ? 'Iniciar Sesión' : 'Registrarse'}
        </button>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white dark:bg-gray-800 text-gray-500">
              O continúa con
            </span>
          </div>
        </div>

        {/* OAuth Buttons */}
        <div className="space-y-2">
          <button
            onClick={() => handleOAuthLogin('Google')}
            className="w-full border border-gray-200 dark:border-gray-700 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all flex items-center justify-center gap-2"
          >
            <span className="text-xl">🔵</span> Google
          </button>

          <button
            onClick={() => handleOAuthLogin('Apple')}
            className="w-full border border-gray-200 dark:border-gray-700 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all flex items-center justify-center gap-2"
          >
            <span className="text-xl">🍎</span> Apple
          </button>

          <button
            onClick={() => handleOAuthLogin('Facebook')}
            className="w-full border border-gray-200 dark:border-gray-700 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all flex items-center justify-center gap-2"
          >
            <span className="text-xl">🔵</span> Facebook
          </button>
        </div>
      </div>
    </div>
  </div>
)}
```

### 3. Security Improvements

**CRITICAL**: Remove these lines that contain hardcoded admin credentials:
- Line ~6009-6023: Remove admin username/password check
- Any lines containing `ADMIN_USERNAME`, `ADMIN_PASSWORD`, or hardcoded admin credentials

### 4. Token Management

Add secure token handling:

```javascript
// Get secure token for API calls
function getSecureToken() {
  return localStorage.getItem('ll_access_token');
}

// Add authorization header to all API calls
function makeAuthenticatedRequest(url, options = {}) {
  const token = getSecureToken();
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json'
    }
  });
}

// Check if user is authenticated on page load
async function checkAuth() {
  const token = getSecureToken();
  if (!token) return;

  try {
    const response = await makeAuthenticatedRequest(`${API_BASE}/api/v1/users/me`);
    if (response.ok) {
      const userData = await response.json();
      setUser(userData);
      localStorage.setItem('ll_user', JSON.stringify(userData));
    } else {
      // Token is invalid, clear it
      localStorage.removeItem('ll_access_token');
      localStorage.removeItem('ll_refresh_token');
      localStorage.removeItem('ll_user');
    }
  } catch (error) {
    console.error('Auth check failed:', error);
  }
}

// Call checkAuth on page load
checkAuth();
```

## Testing the Implementation

1. **Test Registration**:
   - Try registering with all required fields
   - Test age validation (try with age < 18)
   - Verify email is optional
   - Check password minimum length

2. **Test Login**:
   - Login with registered credentials
   - Test admin code field (ensure it calls external service)
   - Verify OAuth buttons are present (even if not fully functional)

3. **Test Security**:
   - Verify no admin credentials in source code
   - Check that tokens are stored securely
   - Ensure admin validation calls external API

## Notes

- OAuth integration requires additional SDK setup for Google, Apple, and Facebook
- SMS verification can be added as a future enhancement
- Admin code validation requires an external secure service to be deployed
- Desktop app will automatically use this same HTML file
