import { useEffect, useState } from 'react';
import { sendMessage } from '../../lib/rpc';
import type {
  LockWalletResponse,
  GetBalanceResponse,
  GetNetworkResponse,
  SetNetworkResponse,
  GetAddressesResponse,
  OnboardResponse,
} from '../../types/messages';
import { ReceiveModal } from './receive-modal';

interface DashboardProps {
  onLock: () => void;
}

function Dashboard({ onLock }: DashboardProps) {
  const [balances, setBalances] = useState<{ onchain: number; offchain: number } | null>(null);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [network, setNetwork] = useState<'signet' | 'mainnet'>('signet');
  const [isLoadingNetwork, setIsLoadingNetwork] = useState(true);
  const [addresses, setAddresses] = useState<{ onchain: string } | null>(null);
  const [showReceive, setShowReceive] = useState(false);
  const [isOnboarding, setIsOnboarding] = useState(false);

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
        setBalances(response.data);
        setBalanceError(null);
      } else {
        setBalanceError(response.error || 'Failed to fetch balance');
      }
    } catch (error) {
      setBalanceError(error instanceof Error ? error.message : 'Failed to fetch balance');
    }
  };

  const handleOnboard = async () => {
    console.log("Clicked Lift. Balance:", balances?.onchain);
    if (!balances || balances.onchain <= 500) {
      return;
    }

    setIsOnboarding(true);
    try {
      const amount = balances.onchain - 500; // Safety buffer for fees
      const response = await sendMessage<OnboardResponse>({
        type: 'Onboard',
        payload: { amount },
      });

      if (response.success) {
        // Refresh balance after successful onboarding
        await fetchBalance();
      } else {
        console.error('Onboard failed:', response.error);
      }
    } catch (error) {
      console.error('Failed to onboard:', error);
    } finally {
      setIsOnboarding(false);
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

  // Fetch addresses on mount
  useEffect(() => {
    const loadAddresses = async () => {
      try {
        const response = await sendMessage<GetAddressesResponse>({ type: 'GetAddresses' });
        console.log("UI Received Addresses:", response);
        if (response.success && response.data) {
          setAddresses({ onchain: response.data.onchain });
        }
      } catch (error) {
        console.error('Failed to fetch addresses:', error);
      }
    };
    loadAddresses();
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

  const totalBalance = balances ? balances.onchain + balances.offchain : 0;
  const canSwap = balances && balances.onchain > 500;

  return (
    <div className="min-h-screen bg-zinc-900 text-white p-4">
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

        {/* Hero Card: Total Balance */}
        <div className="bg-zinc-800 rounded-lg p-6 border border-zinc-700">
          <h2 className="text-sm font-medium text-zinc-400 mb-2">Total Balance</h2>
          {balanceError ? (
            <div className="text-red-400 text-sm">{balanceError}</div>
          ) : balances ? (
            <div className="text-4xl font-bold text-white">
              {formatBalance(totalBalance)} sats
            </div>
          ) : (
            <div className="text-zinc-400 text-sm">Loading balance...</div>
          )}
        </div>

        {/* Layer Breakdown */}
        <div className="bg-zinc-800 rounded-lg p-6 border border-zinc-700 space-y-4">
          <h2 className="text-sm font-medium text-zinc-400 mb-4">Layer Breakdown</h2>

          {/* Row 1: Bitcoin (L1) */}
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="text-sm font-medium text-white mb-1">Bitcoin (L1)</div>
              {balances ? (
                <div className="text-lg font-semibold text-zinc-300">
                  {formatBalance(balances.onchain)} sats
                </div>
              ) : (
                <div className="text-sm text-zinc-500">Loading...</div>
              )}
            </div>
            <button
              onClick={() => {
                console.log("Clicked Receive. Current Address:", addresses?.onchain);
                setShowReceive(true);
              }}
              className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg font-medium text-white transition-colors"
            >
              Receive
            </button>
          </div>

          {/* Row 2: Ark (L2) */}
          <div className="flex items-center justify-between pt-4 border-t border-zinc-700">
            <div className="flex-1">
              <div className="text-sm font-medium text-white mb-1">Ark (L2)</div>
              {balances ? (
                <div className="text-lg font-semibold text-zinc-300">
                  {formatBalance(balances.offchain)} sats
                </div>
              ) : (
                <div className="text-sm text-zinc-500">Loading...</div>
              )}
            </div>
            <button
              onClick={handleOnboard}
              disabled={!canSwap || isOnboarding}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium text-white transition-colors"
            >
              {isOnboarding ? 'Broadcasting...' : 'Swap/Lift'}
            </button>
          </div>
        </div>

        {/* Lock Button */}
        <button
          onClick={handleLock}
          className="w-full px-6 py-3 bg-zinc-700 hover:bg-zinc-600 rounded-lg font-medium transition-colors"
        >
          Lock Wallet
        </button>
      </div>

      {/* Receive Modal */}
      {showReceive && addresses && (
        <ReceiveModal
          address={addresses.onchain}
          onClose={() => setShowReceive(false)}
        />
      )}
    </div>
  );
}

export default Dashboard;

