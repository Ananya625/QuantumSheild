import React, { useEffect } from 'react';
import { Zap, Play, ShieldAlert, X, Check } from 'lucide-react';
import { useTransaction } from '../context/TransactionContext';

export const BB84Simulator: React.FC = () => {
  const { 
    isEavesdropping, setIsEavesdropping,
    setIsBb84ModalOpen,
    bb84SimulationResult, setBb84SimulationResult
  } = useTransaction();

  const handleSimulate = () => {
    setIsBb84ModalOpen(true);
    setBb84SimulationResult(null); // Clear previous results
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

  return (
    <>
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-lg overflow-hidden mt-4 text-slate-300 font-sans select-none">
        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center space-x-2">
            <Zap className="h-4 w-4 text-purple-400" />
            <h4 className="font-bold text-xs text-slate-100 tracking-tight">Isolated BB84 Simulator</h4>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Controls */}
          <div className="flex items-center justify-between">
            <label className="flex items-center space-x-2 cursor-pointer text-xs">
              <input 
                type="checkbox" 
                checked={isEavesdropping} 
                onChange={(e) => setIsEavesdropping(e.target.checked)}
                className="rounded bg-slate-800 border-slate-600 text-purple-500 focus:ring-purple-500"
              />
              <span>Enable Eve (Eavesdropper)</span>
            </label>

            <button
              onClick={handleSimulate}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-1.5 px-3 rounded shadow transition duration-200 text-xs flex items-center gap-1"
            >
              <Play className="h-3 w-3" />
              ⚡ Simulate Eavesdropping
            </button>
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
              className="text-rose-300 hover:text-white transition-colors"
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

