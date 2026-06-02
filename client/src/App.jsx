import React, { useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import Providers from './app/providers';
import AppRoutes from './app/routes';
import SplashScreen from './components/ui/SplashScreen';

function App() {
  const [splashComplete, setSplashComplete] = useState(false);

  return (
    <Providers>
      {!splashComplete ? (
        <SplashScreen onComplete={() => setSplashComplete(true)} />
      ) : (
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      )}
    </Providers>
  );
}

export default App;

