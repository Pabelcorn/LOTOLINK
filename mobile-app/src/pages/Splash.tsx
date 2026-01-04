import React, { useEffect, useState } from 'react';
import { IonPage, IonContent, IonSpinner } from '@ionic/react';
import './Splash.css';

interface SplashProps {
  onComplete: () => void;
}

const Splash: React.FC<SplashProps> = ({ onComplete }) => {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // Show splash for 2.5 seconds
    const timer = setTimeout(() => {
      setFadeOut(true);
      // Call onComplete after fade animation completes
      setTimeout(() => {
        onComplete();
      }, 500);
    }, 2500);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <IonPage>
      <IonContent fullscreen className={`splash-screen ${fadeOut ? 'fade-out' : ''}`}>
        <div className="splash-container">
          <div className="splash-logo-wrapper">
            <img
              src="/lotolink-logo.png"
              alt="LotoLink"
              className="splash-logo"
            />
            <h1 className="splash-title">LotoLink</h1>
            <p className="splash-subtitle">Tu lotería favorita</p>
          </div>
          <div className="splash-loader">
            <IonSpinner name="crescent" color="light" />
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Splash;
