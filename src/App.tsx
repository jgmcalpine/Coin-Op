import { useState, useEffect } from 'react';
import { sendMessage } from './lib/rpc';
import type { GetWalletStatusResponse } from './types/messages';
import CreateWallet from './components/onboarding/create-wallet';
import Login from './components/onboarding/login';
import Dashboard from './components/dashboard/home';

type View = 'loading' | 'onboarding' | 'login' | 'dashboard';

function App() {
  const [view, setView] = useState<View>('loading');

  useEffect(() => {
    const checkWalletStatus = async () => {
      try {
        const response = await sendMessage<GetWalletStatusResponse>({ type: 'GetWalletStatus' });
        if (response.success && response.data) {
          if (!response.data.initialized) {
            setView('onboarding');
          } else {
            setView('login');
          }
        }
      } catch (error) {
        console.error('Failed to check wallet status:', error);
        setView('onboarding');
      }
    };

    checkWalletStatus();
  }, []);

  if (view === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-950 text-white">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (view === 'onboarding') {
    return <CreateWallet onSuccess={() => setView('dashboard')} />;
  }

  if (view === 'login') {
    return <Login onSuccess={() => setView('dashboard')} />;
  }

  return <Dashboard onLock={() => setView('login')} />;
}

export default App;
