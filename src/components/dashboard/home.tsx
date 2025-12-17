import { useEffect, useState } from 'react';
import { sendMessage } from '../../lib/rpc';
import type { LockWalletResponse, GetBalanceResponse, GetNetworkResponse, SetNetworkResponse } from '../../types/messages';

interface DashboardProps {
  onLock: () => void;
}

function Dashboard({ onLock }: DashboardProps) {
  const [balance, setBalance] = useState<{ onchain: number; offchain: number } | null>(null);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [network, setNetwork] = useState<'signet' | 'mainnet'>('signet');
  const [isLoadingNetwork, setIsLoadingNetwork] = useState(true);

  const handleLock = async () => {
    try {
      await sendMessage<LockWalletResponse>({ type: 'LockWallet' });
      onLock();
    } catch (error) {
      console.error('Failed to lock wallet:', error);
      onLock();
    }
  };

  const fetchBalance = async () => {
    try {
      const response = await sendMessage<GetBalanceResponse>({ type: 'GetBalance' });
      if (response.success && response.data) {
        setBalance(response.data);
        setBalanceError(null);
      } else {
        setBalanceError(response.error || 'Failed to fetch balance');
      }
    } catch (error) {
      setBalanceError(error instanceof Error ? error.message : 'Failed to fetch balance');
    }
  };

  const handleNetworkChange = async (newNetwork: 'signet' | 'mainnet') => {
    try {
      const response = await sendMessage<SetNetworkResponse>({
        type: 'SetNetwork',
        payload: { network: newNetwork },
      });
      if (response.success) {
        setNetwork(newNetwork);
        // Refresh balance after network change
        await fetchBalance();
      }
    } catch (error) {
      console.error('Failed to set network:', error);
    }
  };

  // Load initial network setting
  useEffect(() => {
    const loadNetwork = async () => {
      try {
        const response = await sendMessage<GetNetworkResponse>({ type: 'GetNetwork' });
        if (response.success && response.data) {
          setNetwork(response.data.network);
        }
        setIsLoadingNetwork(false);
      } catch (error) {
        console.error('Failed to load network:', error);
        setIsLoadingNetwork(false);
      }
    };
    loadNetwork();
  }, []);

  // Poll balance every 5 seconds
  useEffect(() => {
    // Initial fetch
    fetchBalance();

    // Set up polling interval
    const interval = setInterval(() => {
      fetchBalance();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const formatBalance = (amount: number): string => {
    return amount.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 8,
    });
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="w-full max-w-md mx-auto space-y-6">
        {/* Header with Network Dropdown */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Wallet</h1>
          <div className="flex items-center gap-2">
            <label htmlFor="network-select" className="text-sm text-zinc-400">
              Network:
            </label>
            <select
              id="network-select"
              value={network}
              onChange={(e) => handleNetworkChange(e.target.value as 'signet' | 'mainnet')}
              disabled={isLoadingNetwork}
              className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-orange-500 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="signet">Signet</option>
              <option value="mainnet">Mainnet</option>
            </select>
          </div>
        </div>

        {/* Balance Display */}
        <div className="bg-zinc-800 rounded-lg p-6 border border-zinc-700">
          <h2 className="text-sm font-medium text-zinc-400 mb-4">Balance</h2>
          {balanceError ? (
            <div className="text-red-400 text-sm">{balanceError}</div>
          ) : balance ? (
            <div className="space-y-3">
              <div>
                <div className="text-xs text-zinc-500 mb-1">On-chain</div>
                <div className="text-3xl font-bold text-white">
                  {formatBalance(balance.onchain)} sats
                </div>
              </div>
              <div className="border-t border-zinc-700 pt-3">
                <div className="text-xs text-zinc-500 mb-1">Off-chain</div>
                <div className="text-3xl font-bold text-white">
                  {formatBalance(balance.offchain)} sats
                </div>
              </div>
            </div>
          ) : (
            <div className="text-zinc-400 text-sm">Loading balance...</div>
          )}
        </div>

        {/* Lock Button */}
        <button
          onClick={handleLock}
          className="w-full px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-colors"
        >
          Lock Wallet
        </button>
      </div>
    </div>
  );
}

export default Dashboard;

