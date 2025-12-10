import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonCard,
  IonCardContent,
  IonList,
  IonItem,
  IonLabel,
  IonIcon,
  IonButton,
  IonToggle,
  IonAvatar
} from '@ionic/react';
import { 
  person, 
  card, 
  notifications, 
  moon, 
  fingerPrint,
  language,
  informationCircle,
  logOut,
  chevronForward
} from 'ionicons/icons';
import { APP_INFO } from '../constants';

const Profile: React.FC = () => {
  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar className="premium-header">
          <IonTitle style={{ fontWeight: '700' }}>Perfil</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        {/* User Info Card */}
        <div style={{ padding: '16px' }}>
          <IonCard className="glass-card">
            <IonCardContent>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <IonAvatar style={{ width: '72px', height: '72px' }}>
                  <div style={{
                    width: '100%',
                    height: '100%',
                    background: 'linear-gradient(135deg, #0071e3 0%, #5856d6 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '32px',
                    color: 'white',
                    fontWeight: '700'
                  }}>
                    JD
                  </div>
                </IonAvatar>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '20px', fontWeight: '700', marginBottom: '4px' }}>
                    Juan Díaz
                  </div>
                  <div style={{ fontSize: '14px', color: 'var(--ion-color-medium)' }}>
                    +1 809-555-0123
                  </div>
                  <div className="premium-badge" style={{ marginTop: '8px' }}>
                    ✓ Verificado
                  </div>
                </div>
              </div>
            </IonCardContent>
          </IonCard>
        </div>

        {/* Wallet Card */}
        <div style={{ padding: '0 16px 16px' }}>
          <IonCard className="premium-card" style={{
            background: 'linear-gradient(135deg, #34c759 0%, #30d158 100%)',
            color: 'white'
          }}>
            <IonCardContent>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '4px' }}>
                    Balance Disponible
                  </div>
                  <div style={{ fontSize: '32px', fontWeight: '700' }}>
                    RD$ 1,250.00
                  </div>
                </div>
                <IonIcon icon={card} style={{ fontSize: '48px', opacity: 0.3 }} />
              </div>
              <IonButton 
                expand="block" 
                color="light" 
                style={{ marginTop: '16px', '--border-radius': '12px' }}
              >
                Recargar Wallet
              </IonButton>
            </IonCardContent>
          </IonCard>
        </div>

        {/* Settings List */}
        <div style={{ padding: '0 16px 100px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '12px', marginLeft: '4px' }}>
            Configuración
          </h3>
          
          <IonCard className="premium-card">
            <IonList lines="full">
              <IonItem button detail={false}>
                <IonIcon icon={person} slot="start" color="primary" />
                <IonLabel>Información Personal</IonLabel>
                <IonIcon icon={chevronForward} slot="end" color="medium" />
              </IonItem>
              
              <IonItem button detail={false}>
                <IonIcon icon={fingerPrint} slot="start" color="primary" />
                <IonLabel>
                  <h2>Autenticación Biométrica</h2>
                  <p>Face ID / Touch ID / Huella</p>
                </IonLabel>
                <IonToggle slot="end" checked />
              </IonItem>
              
              <IonItem button detail={false}>
                <IonIcon icon={notifications} slot="start" color="primary" />
                <IonLabel>
                  <h2>Notificaciones Push</h2>
                  <p>Recibe alertas de sorteos y premios</p>
                </IonLabel>
                <IonToggle slot="end" checked />
              </IonItem>
              
              <IonItem button detail={false}>
                <IonIcon icon={moon} slot="start" color="primary" />
                <IonLabel>
                  <h2>Modo Oscuro</h2>
                  <p>Automático según el sistema</p>
                </IonLabel>
                <IonToggle slot="end" />
              </IonItem>
              
              <IonItem button detail={false}>
                <IonIcon icon={language} slot="start" color="primary" />
                <IonLabel>Idioma</IonLabel>
                <div slot="end" style={{ color: 'var(--ion-color-medium)' }}>
                  Español
                </div>
                <IonIcon icon={chevronForward} slot="end" color="medium" />
              </IonItem>
            </IonList>
          </IonCard>

          {/* Help Section */}
          <h3 style={{ fontSize: '16px', fontWeight: '700', marginTop: '24px', marginBottom: '12px', marginLeft: '4px' }}>
            Ayuda y Soporte
          </h3>
          
          <IonCard className="premium-card">
            <IonList lines="full">
              <IonItem button detail={false}>
                <IonIcon icon={informationCircle} slot="start" color="primary" />
                <IonLabel>Preguntas Frecuentes</IonLabel>
                <IonIcon icon={chevronForward} slot="end" color="medium" />
              </IonItem>
              
              <IonItem button detail={false}>
                <IonIcon icon={informationCircle} slot="start" color="primary" />
                <IonLabel>Términos y Condiciones</IonLabel>
                <IonIcon icon={chevronForward} slot="end" color="medium" />
              </IonItem>
              
              <IonItem button detail={false}>
                <IonIcon icon={informationCircle} slot="start" color="primary" />
                <IonLabel>Política de Privacidad</IonLabel>
                <IonIcon icon={chevronForward} slot="end" color="medium" />
              </IonItem>
            </IonList>
          </IonCard>

          {/* Logout Button */}
          <IonButton
            expand="block"
            color="danger"
            fill="outline"
            style={{ marginTop: '24px', '--border-radius': '12px' }}
          >
            <IonIcon slot="start" icon={logOut} />
            Cerrar Sesión
          </IonButton>
          
          <div style={{ 
            textAlign: 'center', 
            marginTop: '24px',
            color: 'var(--ion-color-medium)',
            fontSize: '12px'
          }}>
            Version {APP_INFO.VERSION} • {APP_INFO.NAME} © {APP_INFO.COPYRIGHT_YEAR}
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Profile;
