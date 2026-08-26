import React, { useEffect } from 'react';
import { Zap, Play, ShieldAlert, X, Check } from 'lucide-react';
import { useTransaction } from '../context/TransactionContext';

interface BB84SimulatorProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BB84Simulator: React.FC<BB84SimulatorProps> = ({ isOpen, onClose }) => {
  const { 
    isEavesdropping, setIsEavesdropping,
    setIsBb84ModalOpen,
    bb84SimulationResult
  } = useTransaction();

  const handleSimulate = () => {
    onClose(); // Close controls modal
    setIsBb84ModalOpen(true); // Open live terminal modal
  };

  const [showToast, setShowToast] = React.useState(false);

  // Auto-hide notification after 15 seconds
  useEffect(() => {
    if (bb84SimulationResult) {
      setShowToast(true);
      const timer = setTimeout(() => setShowToast(false), 15000);
      return () => clearTimeout(timer);
    } else {
      setShowToast(false);
    }
  }, [bb84SimulationResult]);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-slate-905/40 z-50 flex items-center justify-center p-6 font-sans select-none">
        <div className="w-full max-w-md bg-white border border-slate-200 shadow-2xl rounded-2xl overflow-hidden animate-zoomIn flex flex-col">
          {/* Header */}
          <div className="px-6 py-4 bg-[#98144D] text-white flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Zap className="h-5 w-5 text-pink-200 animate-pulse" />
              <h3 className="font-extrabold text-sm uppercase tracking-wider">Isolated QKD Simulator</h3>
            </div>
            <button
              onClick={onClose}
              className="text-pink-100 hover:text-white transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-5">
            <div>
              <h4 className="font-bold text-slate-800 text-xs uppercase tracking-tight mb-1">BB84 QKD Protocol</h4>
              <p className="text-[10px] text-slate-500 leading-normal font-medium">
                Simulate quantum key distribution over a dedicated fiber link. Intercept states with Eve to observe the spike in QBER.
              </p>
            </div>

            {/* Checkbox Controls */}
            <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-4 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">Simulate Eavesdropping</span>
              <label className="relative flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={isEavesdropping}
                  onChange={(e) => setIsEavesdropping(e.target.checked)}
                />
                <div className={`block w-9 h-5 rounded-full transition-colors ${isEavesdropping ? 'bg-[#98144D]' : 'bg-slate-350'}`}></div>
                <div className={`dot absolute left-0.5 top-0.5 bg-white w-4 h-4 rounded-full transition-transform ${isEavesdropping ? 'transform translate-x-4' : ''}`}></div>
              </label>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-2">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-slate-200 rounded-xl text-slate-550 hover:bg-slate-50 font-bold text-xs uppercase tracking-wider transition active:scale-95 duration-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSimulate}
                className="bg-[#98144D] hover:bg-[#700d36] text-white px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-wider shadow-md transition active:scale-95 duration-200 cursor-pointer flex items-center gap-1"
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                Run Simulation
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Global Security Alert Toast */}
      {showToast && bb84SimulationResult && (
        <div className="fixed top-6 right-6 z-[60] w-96 max-w-[calc(100vw-3rem)] bg-rose-950 border border-rose-600 rounded-xl shadow-2xl shadow-rose-900/50 overflow-hidden font-sans animate-in slide-in-from-top-5 fade-in duration-300">
          <div className="bg-rose-900/80 px-4 py-3 flex items-center justify-between border-b border-rose-800">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-white animate-pulse" />
              <h3 className="text-white font-extrabold text-sm tracking-wider">
                SECURITY ALERT
              </h3>
            </div>
            <button 
              onClick={() => setShowToast(false)}
              className="text-rose-300 hover:text-white transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          
          <div className="p-4 space-y-3">
            <h4 className="text-rose-100 font-bold text-base leading-tight">
              ⚠ EAVESDROPPING DETECTED
            </h4>
            <p className="text-rose-200/90 text-xs">
              Potential interception detected on the BB84 quantum channel.
            </p>
            
            <div className="bg-rose-950/50 rounded-lg p-3 border border-rose-800/50 space-y-1.5 text-xs text-rose-100 font-mono">
              <div className="flex justify-between">
                <span className="text-rose-400/80">Transaction:</span>
                <span className="font-semibold">TX{bb84SimulationResult.simulation_id?.substring(0, 5).toUpperCase() || '10245'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-rose-400/80">QBER:</span>
                <span className="font-semibold">{bb84SimulationResult.qber.toFixed(2)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-rose-400/80">Threshold:</span>
                <span className="font-semibold">{(bb84SimulationResult.threshold * 100).toFixed(0)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-rose-400/80">Detection time:</span>
                <span className="font-semibold">{new Date().toLocaleTimeString()}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-rose-800/50 space-y-1.5">
              <span className="text-rose-300 font-semibold text-[10px] uppercase tracking-wider block mb-1">
                Security response:
              </span>
              <div className="flex items-center gap-2 text-rose-100 text-xs">
                <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span>Compromised session identified</span>
              </div>
              <div className="flex items-center gap-2 text-rose-100 text-xs">
                <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span>Security alert generated</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
