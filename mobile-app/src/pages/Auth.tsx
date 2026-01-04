import React, { useState } from 'react';
import {
  IonPage,
  IonContent,
  IonButton,
  IonInput,
  IonItem,
  IonLabel,
  IonSegment,
  IonSegmentButton,
  IonText,
  IonIcon,
  IonDatetime,
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonSpinner,
  IonToast,
} from '@ionic/react';
import { logoGoogle, logoApple, logoFacebook, eyeOutline, eyeOffOutline } from 'ionicons/icons';
import { useAuth } from '../contexts/AuthContext';
import './Auth.css';

const Auth: React.FC = () => {
  const [segment, setSegment] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState<string>('');
  const [adminCode, setAdminCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdminField, setShowAdminField] = useState(false);

  const { login, register, oauthLogin } = useAuth();

  const calculateAge = (birthDate: string): number => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const handleLogin = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!phone || !password) {
        setError('Por favor completa todos los campos');
        return;
      }

      await login(phone, password, adminCode || undefined);
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!phone || !password || !dateOfBirth) {
        setError('Por favor completa todos los campos requeridos');
        return;
      }

      // Validate age
      const age = calculateAge(dateOfBirth);
      if (age < 18) {
        setError('Debes tener al menos 18 años para registrarte');
        return;
      }

      await register({
        phone,
        password,
        email: email || undefined,
        name: name || undefined,
        dateOfBirth,
      });
    } catch (err: any) {
      setError(err.message || 'Error al registrarse');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthLogin = async (provider: 'google' | 'apple' | 'facebook') => {
    try {
      setLoading(true);
      setError(null);
      
      // This would typically open a native OAuth flow
      // For now, we'll show a placeholder message
      setError(`OAuth con ${provider} - Implementación pendiente en el SDK nativo`);
    } catch (err: any) {
      setError(err.message || `Error al iniciar sesión con ${provider}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <IonPage>
      <IonContent fullscreen className="auth-content">
        <div className="auth-container">
          <div className="auth-header">
            <img src="/lotolink-logo.png" alt="LotoLink" className="auth-logo" />
            <h1 className="auth-title">Bienvenido</h1>
            <p className="auth-subtitle">Inicia sesión o crea una cuenta para continuar</p>
          </div>

          <div className="auth-segment-wrapper">
            <IonSegment
              value={segment}
              onIonChange={(e) => setSegment(e.detail.value as 'login' | 'register')}
              className="auth-segment"
            >
              <IonSegmentButton value="login">
                <IonLabel>Iniciar Sesión</IonLabel>
              </IonSegmentButton>
              <IonSegmentButton value="register">
                <IonLabel>Registrarse</IonLabel>
              </IonSegmentButton>
            </IonSegment>
          </div>

          <div className="auth-form">
            {segment === 'register' && (
              <IonItem className="auth-input-item">
                <IonLabel position="floating">Nombre (opcional)</IonLabel>
                <IonInput
                  type="text"
                  value={name}
                  onIonChange={(e) => setName(e.detail.value!)}
                  placeholder="Tu nombre"
                />
              </IonItem>
            )}

            <IonItem className="auth-input-item">
              <IonLabel position="floating">Teléfono *</IonLabel>
              <IonInput
                type="tel"
                value={phone}
                onIonChange={(e) => setPhone(e.detail.value!)}
                placeholder="8091234567"
              />
            </IonItem>

            {segment === 'register' && (
              <IonItem className="auth-input-item">
                <IonLabel position="floating">Email (opcional)</IonLabel>
                <IonInput
                  type="email"
                  value={email}
                  onIonChange={(e) => setEmail(e.detail.value!)}
                  placeholder="tu@email.com"
                />
              </IonItem>
            )}

            <IonItem className="auth-input-item">
              <IonLabel position="floating">Contraseña *</IonLabel>
              <IonInput
                type={showPassword ? 'text' : 'password'}
                value={password}
                onIonChange={(e) => setPassword(e.detail.value!)}
                placeholder="Mínimo 8 caracteres"
              />
              <IonButton
                fill="clear"
                slot="end"
                onClick={() => setShowPassword(!showPassword)}
              >
                <IonIcon icon={showPassword ? eyeOffOutline : eyeOutline} />
              </IonButton>
            </IonItem>

            {segment === 'register' && (
              <IonItem
                className="auth-input-item"
                button
                onClick={() => setShowDatePicker(true)}
              >
                <IonLabel position="floating">Fecha de Nacimiento *</IonLabel>
                <IonInput
                  value={dateOfBirth ? new Date(dateOfBirth).toLocaleDateString() : ''}
                  placeholder="Selecciona tu fecha de nacimiento"
                  readonly
                />
              </IonItem>
            )}

            {segment === 'login' && (
              <div className="admin-code-toggle">
                <IonButton
                  fill="clear"
                  size="small"
                  onClick={() => setShowAdminField(!showAdminField)}
                >
                  {showAdminField ? 'Ocultar' : 'Mostrar'} campo de administrador
                </IonButton>
              </div>
            )}

            {segment === 'login' && showAdminField && (
              <IonItem className="auth-input-item">
                <IonLabel position="floating">Código de Administrador (opcional)</IonLabel>
                <IonInput
                  type="password"
                  value={adminCode}
                  onIonChange={(e) => setAdminCode(e.detail.value!)}
                  placeholder="Código de acceso admin"
                />
              </IonItem>
            )}

            <IonButton
              expand="block"
              className="auth-submit-button"
              onClick={segment === 'login' ? handleLogin : handleRegister}
              disabled={loading}
            >
              {loading ? (
                <IonSpinner name="crescent" />
              ) : segment === 'login' ? (
                'Iniciar Sesión'
              ) : (
                'Registrarse'
              )}
            </IonButton>

            {segment === 'register' && (
              <IonText className="age-disclaimer">
                * Debes tener al menos 18 años para usar esta aplicación
              </IonText>
            )}
          </div>

          <div className="auth-divider">
            <span>O continúa con</span>
          </div>

          <div className="auth-oauth-buttons">
            <IonButton
              expand="block"
              fill="outline"
              className="oauth-button google"
              onClick={() => handleOAuthLogin('google')}
              disabled={loading}
            >
              <IonIcon icon={logoGoogle} slot="start" />
              Google
            </IonButton>

            <IonButton
              expand="block"
              fill="outline"
              className="oauth-button apple"
              onClick={() => handleOAuthLogin('apple')}
              disabled={loading}
            >
              <IonIcon icon={logoApple} slot="start" />
              Apple
            </IonButton>

            <IonButton
              expand="block"
              fill="outline"
              className="oauth-button facebook"
              onClick={() => handleOAuthLogin('facebook')}
              disabled={loading}
            >
              <IonIcon icon={logoFacebook} slot="start" />
              Facebook
            </IonButton>
          </div>
        </div>

        {/* Date Picker Modal */}
        <IonModal
          isOpen={showDatePicker}
          onDidDismiss={() => setShowDatePicker(false)}
        >
          <IonHeader>
            <IonToolbar>
              <IonTitle>Selecciona tu fecha de nacimiento</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setShowDatePicker(false)}>Cerrar</IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent>
            <IonDatetime
              presentation="date"
              value={dateOfBirth}
              onIonChange={(e) => {
                setDateOfBirth(e.detail.value as string);
                setShowDatePicker(false);
              }}
              max={new Date().toISOString()}
              min="1920-01-01"
            />
          </IonContent>
        </IonModal>

        {/* Error Toast */}
        <IonToast
          isOpen={!!error}
          onDidDismiss={() => setError(null)}
          message={error || ''}
          duration={3000}
          color="danger"
        />
      </IonContent>
    </IonPage>
  );
};

export default Auth;
