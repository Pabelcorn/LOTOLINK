import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonButton,
  IonIcon,
  IonRefresher,
  IonRefresherContent,
  RefresherEventDetail
} from '@ionic/react';
import { trophy, storefront, ticket, trendingUp } from 'ionicons/icons';
import './Home.css';

const Home: React.FC = () => {
  const handleRefresh = (event: CustomEvent<RefresherEventDetail>) => {
    setTimeout(() => {
      event.detail.complete();
    }, 2000);
  };

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar className="premium-header">
          <IonTitle>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '24px' }}>🎰</span>
              <span style={{ fontWeight: '700' }}>LotoLink</span>
            </div>
          </IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent></IonRefresherContent>
        </IonRefresher>

        {/* Hero Section */}
        <div className="hero-section glass-card" style={{
          margin: '16px',
          padding: '24px',
          background: 'linear-gradient(135deg, #0071e3 0%, #5856d6 100%)',
          color: 'white'
        }}>
          <h1 style={{ margin: '0 0 8px 0', fontSize: '28px', fontWeight: '700' }}>
            ¡Bienvenido a LotoLink!
          </h1>
          <p style={{ margin: '0 0 16px 0', opacity: 0.9 }}>
            La forma más fácil de jugar loterías en República Dominicana
          </p>
          <IonButton expand="block" color="light" routerLink="/lotteries" className="animate-fade-in">
            <IonIcon slot="start" icon={ticket} />
            Jugar Ahora
          </IonButton>
        </div>

        {/* Quick Actions */}
        <div style={{ padding: '0 16px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '12px' }}>
            Acceso Rápido
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <IonCard className="premium-card" routerLink="/lotteries" button>
              <IonCardContent style={{ textAlign: 'center', padding: '20px' }}>
                <IonIcon icon={trophy} style={{ fontSize: '40px', color: '#0071e3' }} />
                <div style={{ marginTop: '8px', fontWeight: '600' }}>Loterías</div>
              </IonCardContent>
            </IonCard>
            <IonCard className="premium-card" routerLink="/bancas" button>
              <IonCardContent style={{ textAlign: 'center', padding: '20px' }}>
                <IonIcon icon={storefront} style={{ fontSize: '40px', color: '#34c759' }} />
                <div style={{ marginTop: '8px', fontWeight: '600' }}>Bancas</div>
              </IonCardContent>
            </IonCard>
          </div>
        </div>

        {/* Results Section */}
        <div style={{ padding: '24px 16px 100px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '600', margin: 0 }}>
              Resultados Recientes
            </h2>
            <IonIcon icon={trendingUp} style={{ fontSize: '20px', color: '#0071e3' }} />
          </div>
          
          {/* Result Card - Leidsa */}
          <IonCard className="glass-card" style={{ marginBottom: '12px' }}>
            <IonCardHeader>
              <IonCardTitle>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    background: '#FFD700',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '700',
                    color: 'white'
                  }}>LD</div>
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '16px' }}>Leidsa</div>
                    <div style={{ fontSize: '12px', color: 'var(--ion-color-medium)', fontWeight: '400' }}>
                      Hoy 8:55 PM
                    </div>
                  </div>
                </div>
              </IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                {['15', '42', '08'].map((num, idx) => (
                  <div key={idx} style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #0071e3 0%, #0077ed 100%)',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '700',
                    fontSize: '18px',
                    boxShadow: '0 4px 12px rgba(0, 113, 227, 0.3)'
                  }}>
                    {num}
                  </div>
                ))}
              </div>
            </IonCardContent>
          </IonCard>

          {/* Result Card - Loteka */}
          <IonCard className="glass-card">
            <IonCardHeader>
              <IonCardTitle>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    background: '#00B0DB',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '700',
                    color: 'white'
                  }}>LK</div>
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '16px' }}>Loteka</div>
                    <div style={{ fontSize: '12px', color: 'var(--ion-color-medium)', fontWeight: '400' }}>
                      Hoy 7:55 PM
                    </div>
                  </div>
                </div>
              </IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                {['23', '67', '91'].map((num, idx) => (
                  <div key={idx} style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #34c759 0%, #30d158 100%)',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '700',
                    fontSize: '18px',
                    boxShadow: '0 4px 12px rgba(52, 199, 89, 0.3)'
                  }}>
                    {num}
                  </div>
                ))}
              </div>
            </IonCardContent>
          </IonCard>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Home;
