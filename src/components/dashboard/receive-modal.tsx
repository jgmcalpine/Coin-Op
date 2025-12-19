import QRCode from 'react-qr-code';
import { X, Copy, Check } from 'lucide-react';
import { useState } from 'react';

interface ReceiveModalProps {
  address: string;
  onClose: () => void;
}

export function ReceiveModal({ address, onClose }: ReceiveModalProps) {
  const [copied, setCopied] = useState(false);
  
  const copy = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-xl p-6 relative shadow-2xl">
        <button onClick={onClose} className="absolute top-4 right-4 text-zinc-400 hover:text-white">
          <X className="w-5 h-5" />
        </button>
        
        <h2 className="text-xl font-bold text-white mb-6 text-center">Receive Bitcoin (L1)</h2>
        
        <div className="flex justify-center mb-6">
          <div className="bg-white p-3 rounded-lg">
            <QRCode value={address} size={200} />
          </div>
        </div>

        <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 flex items-center gap-3">
          <span className="text-zinc-300 font-mono text-xs truncate flex-1">{address}</span>
          <button onClick={copy} className="text-orange-500 hover:text-orange-400">
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}

