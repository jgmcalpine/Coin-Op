import { useState } from 'react';
import { sendMessage } from '../../lib/rpc';
import type { UnlockWalletResponse } from '../../types/messages';
import { inputStyles, buttonStyles, labelStyles, errorStyles } from '../ui/styles';

interface LoginProps {
  onSuccess: () => void;
}

function Login({ onSuccess }: LoginProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await sendMessage<UnlockWalletResponse>({
        type: 'UnlockWallet',
        payload: { password },
      });

      if (response.success) {
        onSuccess();
      } else {
        setError(response.error || 'Failed to unlock wallet. Please check your password.');
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
        <h1 className="text-2xl font-bold mb-6 text-center">Welcome Back</h1>
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
            {isLoading ? 'Unlocking...' : 'Unlock'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;

