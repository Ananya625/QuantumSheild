import React, { useEffect, useRef } from 'react';
import { useTransaction } from '../context/TransactionContext';
import { 
  Terminal, ShieldAlert, X, Radio
} from 'lucide-react';

export const EveConsole: React.FC = () => {
  const {
    securityMode, 
    isEavesdropping: simulateAttack, 
    setIsEavesdropping: setSimulateAttack,
    pipelineStatus, 
    crypto
  } = useTransaction();

  const isQuantum = securityMode === 'quantumshield';
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll hacker terminal to bottom when new logs stream in
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [pipelineStatus]);

  // Compute status badge
  let statusText = 'Listening...';
  let statusBadgeColor = 'bg-slate-800 text-slate-400 border-slate-700';

  if (simulateAttack) {
    if (!isQuantum) {
      statusText = 'Passive Monitoring Active';
      statusBadgeColor = 'bg-amber-950 text-amber-400 border-amber-800 animate-pulse';
    } else {
      if (pipelineStatus === 'KEY_EXCHANGE') {
        statusText = 'Attempting to measure BB84 qubits...';
        statusBadgeColor = 'bg-purple-950 text-purple-400 border-purple-800 animate-pulse';
      } else if ((crypto.bb84Qber !== undefined && crypto.bb84Qber > 11)) {
        statusText = 'Active Interception Failed';
        statusBadgeColor = 'bg-rose-950 text-rose-400 border-rose-800';
      } else {
        statusText = 'Active Interception Monitoring';
        statusBadgeColor = 'bg-purple-950 text-purple-400 border-purple-800';
      }
    }
  }

  // Check captured packets checklist status based on pipeline status / crypto state
  const hasTls = ['TLS_HANDSHAKE', 'TLS_ESTABLISHED', 'KEY_EXCHANGE', 'DERIVING_KEY', 'ENCRYPTING', 'SIGNING', 'TRANSMITTING', 'VERIFYING_SIGNATURE', 'DECRYPTING', 'SETTLING', 'COMPLETED', 'FAILED'].includes(pipelineStatus) || !!crypto.tlsServerCert;
  const hasPublicKeys = ['KEY_EXCHANGE', 'DERIVING_KEY', 'ENCRYPTING', 'SIGNING', 'TRANSMITTING', 'VERIFYING_SIGNATURE', 'DECRYPTING', 'SETTLING', 'COMPLETED', 'FAILED'].includes(pipelineStatus) || !!crypto.clientDhPublicKey || !!crypto.mlkemPublicKey;
  const hasCiphertext = ['ENCRYPTING', 'SIGNING', 'TRANSMITTING', 'VERIFYING_SIGNATURE', 'DECRYPTING', 'SETTLING', 'COMPLETED', 'FAILED'].includes(pipelineStatus) || !!crypto.ciphertext;
  const hasNonce = ['ENCRYPTING', 'SIGNING', 'TRANSMITTING', 'VERIFYING_SIGNATURE', 'DECRYPTING', 'SETTLING', 'COMPLETED', 'FAILED'].includes(pipelineStatus) || !!crypto.nonce;
  const hasTag = ['ENCRYPTING', 'SIGNING', 'TRANSMITTING', 'VERIFYING_SIGNATURE', 'DECRYPTING', 'SETTLING', 'COMPLETED', 'FAILED'].includes(pipelineStatus) || !!crypto.tag;

  return (
    <>
      {/* Floating Collapsible Button when collapsed */}
      {!simulateAttack ? (
        <aside aria-label="Eve Monitoring Console Toggle" className="fixed right-4 bottom-6 z-40 flex flex-col items-end select-none">
          <button
            onClick={() => setSimulateAttack(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl shadow-xl font-bold text-xs bg-slate-900 hover:bg-slate-800 text-white border border-slate-700 transition-all duration-300 transform hover:scale-105"
          >
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>🟢 Secure Network</span>
            <span className="text-[10px] text-slate-400 font-normal ml-1">(Click to Attack)</span>
          </button>
        </aside>
      ) : (
        /* Expanded Hacker Panel when Under Attack */
        <aside aria-label="Eve Attack Console" className="fixed right-4 bottom-6 z-40 w-96 max-w-[calc(100vw-2rem)] bg-slate-950 border-2 border-rose-600/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col transition-all duration-300 animate-zoomIn font-mono text-xs select-none">
          
          {/* Header */}
          <div className="bg-rose-950/90 border-b border-rose-800/80 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-rose-300">
              <Terminal className="h-4.5 w-4.5 animate-pulse text-rose-500" />
              <h3 className="font-extrabold text-xs tracking-wider uppercase text-rose-100">
                EVE ATTACK CONSOLE
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSimulateAttack(false)}
                className="bg-rose-600 hover:bg-rose-700 text-white px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition flex items-center gap-1"
              >
                <span>🔴 Under Attack</span>
                <X className="h-3.5 w-3.5 ml-1" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="p-4 space-y-3 bg-slate-950 text-slate-300 font-mono">
            
            {/* Status Section */}
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-slate-500 font-bold uppercase tracking-wider">Status:</span>
              <span className={`px-2.5 py-0.5 rounded border text-[10px] font-bold uppercase ${statusBadgeColor}`}>
                {statusText}
              </span>
            </div>

            {/* Hacker Terminal Logs Display */}
            <div className="bg-black/90 border border-slate-800 rounded-xl p-3 h-44 overflow-y-auto font-mono text-[10.5px] leading-relaxed custom-scrollbar space-y-1 select-text">
              <div className="text-slate-500 font-semibold">// Live Packet Sniffer Active...</div>
              
              {crypto.bb84Qber !== undefined && crypto.bb84Qber > 11 && (
                  <div className="whitespace-pre-wrap text-rose-400">
                    <span className="text-slate-600 mr-1.5">&gt;</span>
                    Intercepted BB84 Qubits: QBER spiked to {crypto.bb84Qber.toFixed(2)}%. Link terminated.
                  </div>
              )}
              {crypto.bb84Qber === undefined && (
                <div className="text-slate-600 flex items-center gap-1.5 pt-4 justify-center">
                  <Radio className="h-4 w-4 animate-spin text-slate-500" />
                  <span>Waiting for inter-bank transaction...</span>
                </div>
              )}
              <div ref={terminalEndRef} />
            </div>

            {/* Captured Packets Checklist */}
            <div className="border-t border-slate-900 pt-2.5 text-[10px] space-y-1">
              <span className="text-slate-500 font-bold uppercase tracking-wider block mb-1">
                Captured Packets Checklist
              </span>
              <div className="grid grid-cols-2 gap-1.5 text-slate-400 font-semibold">
                <div className={`flex items-center gap-1 ${hasTls ? 'text-emerald-400' : 'text-slate-600'}`}>
                  <span>{hasTls ? '✓' : '○'}</span> TLS Handshake
                </div>
                <div className={`flex items-center gap-1 ${hasPublicKeys ? 'text-emerald-400' : 'text-slate-600'}`}>
                  <span>{hasPublicKeys ? '✓' : '○'}</span> Public Keys
                </div>
                <div className={`flex items-center gap-1 ${hasCiphertext ? 'text-emerald-400' : 'text-slate-600'}`}>
                  <span>{hasCiphertext ? '✓' : '○'}</span> Ciphertext
                </div>
                <div className={`flex items-center gap-1 ${hasNonce ? 'text-emerald-400' : 'text-slate-600'}`}>
                  <span>{hasNonce ? '✓' : '○'}</span> AES Nonce
                </div>
                <div className={`flex items-center gap-1 ${hasTag ? 'text-emerald-400' : 'text-slate-600'}`}>
                  <span>{hasTag ? '✓' : '○'}</span> Auth Tag
                </div>
              </div>
            </div>

            {/* Detection Summary Section */}
            <div className="border-t border-slate-900 pt-2 text-[10px]">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-bold uppercase tracking-wider">Detection:</span>
                {isQuantum && (crypto.bb84Qber !== undefined && crypto.bb84Qber > 11) ? (
                  <span className="text-rose-400 font-extrabold bg-rose-950/80 border border-rose-800 px-2 py-0.5 rounded flex items-center gap-1 animate-pulse">
                    <ShieldAlert className="h-3 w-3 text-rose-500" />
                    ATTACK FAILED (QBER {crypto.bb84Qber.toFixed(2)}%)
                  </span>
                ) : (
                  <span className="text-emerald-400 font-bold bg-emerald-950/50 border border-emerald-900 px-2 py-0.5 rounded">
                    None (Passively Intercepted)
                  </span>
                )}
              </div>
            </div>

          </div>
        </aside>
      )}
    </>
  );
};
export default EveConsole;
