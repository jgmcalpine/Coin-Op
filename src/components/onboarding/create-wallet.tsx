import { useState } from 'react';
import { sendMessage } from '../../lib/rpc';
import type { GenerateWalletResponse } from '../../types/messages';
import { inputStyles, buttonStyles, labelStyles, errorStyles } from '../ui/styles';

interface CreateWalletProps {
  onSuccess: () => void;
}

function CreateWallet({ onSuccess }: CreateWalletProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      const response = await sendMessage<GenerateWalletResponse>({
        type: 'GenerateWallet',
        payload: { password },
      });

      if (response.success) {
        onSuccess();
      } else {
        setError(response.error || 'Failed to create wallet');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-4">
      <div className="p-6 w-[350px] min-h-[400px] flex flex-col justify-center bg-zinc-950 text-white">
        <h1 className="text-2xl font-bold mb-6 text-center">Create your Vault</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label htmlFor="password" className={labelStyles}>
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputStyles}
              placeholder="Enter your password"
              disabled={isLoading}
              required
            />
          </div>
          <div>
            <label htmlFor="confirmPassword" className={labelStyles}>
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={inputStyles}
              placeholder="Confirm your password"
              disabled={isLoading}
              required
            />
          </div>
          {error && (
            <div className={errorStyles}>
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={isLoading}
            className={`${buttonStyles} ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isLoading ? 'Creating Wallet...' : 'Create Wallet'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default CreateWallet;

