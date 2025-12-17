import { sendMessage } from '../../lib/rpc';
import type { LockWalletResponse } from '../../types/messages';

interface DashboardProps {
  onLock: () => void;
}

function Dashboard({ onLock }: DashboardProps) {
  const handleLock = async () => {
    try {
      await sendMessage<LockWalletResponse>({ type: 'LockWallet' });
      onLock();
    } catch (error) {
      console.error('Failed to lock wallet:', error);
      onLock();
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center space-y-6">
        <h1 className="text-3xl font-bold">Wallet Unlocked</h1>
        <button
          onClick={handleLock}
          className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-colors"
        >
          Lock
        </button>
      </div>
    </div>
  );
}

export default Dashboard;

