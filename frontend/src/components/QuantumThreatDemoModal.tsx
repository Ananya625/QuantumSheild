import React, { useState, useEffect } from 'react';
import { 
  X, Play, AlertTriangle, RefreshCw, Activity, CheckCircle2
} from 'lucide-react';
import { api } from '../services/api';
import type { ToyQuantumThreatDemoResponse } from '../services/api';
import { useTransaction } from '../context/TransactionContext';

interface QuantumThreatDemoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QuantumThreatDemoModal: React.FC<QuantumThreatDemoModalProps> = ({ isOpen, onClose }) => {
  const { sessionIdA, accountNumberA, quickDemoLogin } = useTransaction();

  const formatAmount = (amount: number, currency: string) => {
    const symbol = currency === 'INR' ? '₹' : currency === 'USD' ? '$' : currency;
    const formattedVal = Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `${symbol}${formattedVal}`;
  };

  // Multi-step demo states
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-login status
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

  // Step 1: Initiate Transaction States
  const [amount, setAmount] = useState<string>('150');
  const [memo, setMemo] = useState<string>('Invoice Payment');
  const [txId, setTxId] = useState<number | null>(null);
  const [txStatus, setTxStatus] = useState<string>('IDLE');
  const [demoSecurityMode, setDemoSecurityMode] = useState<'classical' | 'quantumshield'>('classical');
  
  // Step 2: Capture Transaction States
  const [capturedTxDetails, setCapturedTxDetails] = useState<any>(null);
  const [logs, setLogs] = useState<string[]>([]);

  // Step 3: Analyze Quantum Threat States

  // Step 4 & 5: Isolated Demonstration & Decrypted Payload States
  const [demoResult, setDemoResult] = useState<ToyQuantumThreatDemoResponse | null>(null);

  // Technical evidence display states
  const [showFullKey, setShowFullKey] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<boolean>(false);

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key).then(() => {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    });
  };

  // Automatically trigger quick demo login if session does not exist
  useEffect(() => {
    if (isOpen && !sessionIdA && !isLoggingIn) {
      setIsLoggingIn(true);
      quickDemoLogin().finally(() => {
        setIsLoggingIn(false);
      });
    }
  }, [isOpen, sessionIdA, quickDemoLogin, isLoggingIn]);

  // Clean state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
      setLoading(false);
      setError(null);
      setTxId(null);
      setTxStatus('IDLE');
      setCapturedTxDetails(null);
      setDemoResult(null);
      setLogs([]);
      setDemoSecurityMode('classical');
      setShowFullKey(false);
      setCopiedKey(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Step 1: Transfer money calling real API
  const handleInitiateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionIdA || !accountNumberA) {
      setError('Active user session is required. Please wait for auto-login.');
      return;
    }

    const amtVal = parseFloat(amount);
    if (isNaN(amtVal) || amtVal <= 0) {
      setError('Please enter a valid positive transfer amount.');
      return;
    }

    setLoading(true);
    setError(null);
    setTxStatus('PENDING');

    try {
      const payload = {
        session_id: sessionIdA,
        sender_account: accountNumberA,
        receiver_account: '987654321', // Bob's HDFC Account
        amount: amtVal,
        description: memo,
        security_mode: demoSecurityMode
      };

      const res = await api.transfer(payload);
      const transactionId = res.data.transaction_id;
      setTxId(transactionId);

      // Start polling status
      let pollInterval = setInterval(async () => {
        try {
          const detailsRes = await api.getTransactionDetails(transactionId);
          const status = detailsRes.data.status;
          setTxStatus(status);

          if (status === 'SUCCESS' || status === 'SETTLED') {
            clearInterval(pollInterval);
            setCapturedTxDetails(detailsRes.data);
            setLoading(false);
            setCurrentStep(2); // Go to State 2 (Transaction Captured screen)
          } else if (status === 'FAILED') {
            clearInterval(pollInterval);
            setError('The production pipeline failed.');
            setLoading(false);
          }
        } catch (pollErr) {
          clearInterval(pollInterval);
          console.error('Error polling transaction status:', pollErr);
          setError('Lost connection while polling transaction status.');
          setLoading(false);
        }
      }, 500);

    } catch (err: any) {
      console.error('Error initiating transfer:', err);
      setError(err.response?.data?.detail || err.message || 'Failed to submit transfer.');
      setLoading(false);
    }
  };
  // Step 4: Run quantum threat analysis via backend
  const handleRunQuantumThreat = async () => {
    if (!txId) return;

    setCurrentStep(4); // Go to State 4 (Quantum Execution Console)
    setLoading(true);
    setError(null);
    setLogs([]);

    try {
      const demoRes = await api.runQuantumThreatDemonstration(txId);
      
      if (demoRes.data && demoRes.data.success) {
        const backendLogs = demoRes.data.logs || [];
        setLogs(backendLogs.map(log => `> ${log.message}`));
        setDemoResult(demoRes.data);
      } else {
        setError(demoRes.data?.error || 'Quantum demonstration returned success: False.');
        setCurrentStep(3);
      }
    } catch (err: any) {
      console.error('Error executing Shor analysis:', err);
      setError(err.response?.data?.detail || err.message || 'Quantum threat analysis failed.');
      setCurrentStep(3);
    } finally {
      setLoading(false);
    }
  };

  const renderDerivedKey = () => {
    const fullKey = demoResult?.key_derivation?.derived_key_hex;
    if (!fullKey) return <span className="font-mono text-slate-400">Not available</span>;

    const displayKey = showFullKey 
      ? fullKey 
      : `${fullKey.substring(0, 6)}...${fullKey.substring(fullKey.length - 6)}`;

    return (
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono text-[11px] text-slate-700 w-full overflow-hidden select-text">
        <div className="overflow-x-auto custom-scrollbar whitespace-nowrap flex-1 py-1 pr-2">
          {displayKey}
        </div>
        <div className="flex items-center gap-1.5 shrink-0 select-none">
          <button
            type="button"
            onClick={() => setShowFullKey(!showFullKey)}
            className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded text-[9px] font-bold text-slate-500 transition cursor-pointer"
          >
            {showFullKey ? 'HIDE' : 'SHOW'}
          </button>
          <button
            type="button"
            onClick={() => handleCopyKey(fullKey)}
            className="px-2 py-1 bg-primary-600 hover:bg-primary-700 text-white rounded text-[9px] font-bold transition cursor-pointer"
          >
            {copiedKey ? 'COPIED!' : 'COPY'}
          </button>
        </div>
      </div>
    );
  };

  const renderCryptoChain = (isMLKEM: boolean) => {
    const steps = [
      { label: 'Public Point', status: isMLKEM ? 'na' : 'ok' },
      { label: 'ECDLP Solved', status: isMLKEM ? 'rejected' : 'ok' },
      { label: 'Scalar Recovered', status: isMLKEM ? 'failed' : 'ok' },
      { label: 'Shared Secret Reconstructed', status: isMLKEM ? 'failed' : 'ok' },
      { label: 'Session Key Derived', status: isMLKEM ? 'failed' : 'ok' },
      { label: 'GCM Authenticated', status: isMLKEM ? 'failed' : 'ok' },
      { label: 'Payload Recovered', status: isMLKEM ? 'failed' : 'ok' }
    ];

    return (
      <div className="bg-slate-50/80 border-2 border-primary-500 rounded-xl p-4 space-y-3 select-none shadow-sm ring-1 ring-primary-500/10">
        <span className="block text-primary-700 font-extrabold text-[10px] uppercase tracking-wider font-sans">
          Verification Pipeline Chain
        </span>
        <div className="flex flex-wrap items-center gap-1.5 font-sans font-extrabold text-[9px] uppercase">
          {steps.map((step, idx) => {
            let bgClass = 'bg-slate-100 text-slate-500 border border-slate-200';
            let label = step.label;
            let icon = '•';

            if (step.status === 'ok') {
              bgClass = 'bg-emerald-50 text-emerald-800 border border-emerald-250';
              icon = '✓';
            } else if (step.status === 'failed') {
              bgClass = 'bg-rose-50 text-rose-800 border border-rose-150';
              icon = '✗';
            } else if (step.status === 'rejected') {
              bgClass = 'bg-rose-50/50 text-rose-700 border border-rose-100';
              icon = '✗';
            } else if (step.status === 'na') {
              bgClass = 'bg-slate-100 text-slate-400 border border-slate-200';
              icon = 'N/A';
            }

            return (
              <React.Fragment key={idx}>
                {idx > 0 && <span className="text-slate-300 font-bold text-[10px]">→</span>}
                <span className={`px-2 py-0.5 rounded-full flex items-center gap-1 ${bgClass}`}>
                  <span>{icon}</span>
                  <span>{label}</span>
                </span>
              </React.Fragment>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none">
      
      {/* Modal Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-zoomIn">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <Activity className="h-5 w-5 text-primary-600 animate-pulse" />
            <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-800">
              QUANTUM THREAT DEMONSTRATION
            </h3>
          </div>
          <button 
            onClick={onClose}
            disabled={loading}
            className="text-slate-400 hover:text-slate-650 p-1.5 rounded-lg hover:bg-slate-200/50 transition duration-150 cursor-pointer"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0 custom-scrollbar text-slate-650 text-xs">
          
          {error && (
            <div className="bg-rose-50 border border-rose-250 text-rose-950 p-4 rounded-xl flex items-start space-x-3 shadow-inner font-sans">
              <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1 leading-relaxed font-semibold">
                <p className="font-bold text-[11px] uppercase tracking-wide text-rose-800">Error Occurred</p>
                <p>{error}</p>
              </div>
            </div>
          )}

          {isLoggingIn && (
            <div className="flex flex-col items-center justify-center py-10 space-y-3 font-sans">
              <RefreshCw className="h-6 w-6 text-primary-600 animate-spin" />
              <p className="font-bold text-[10px] text-slate-400 uppercase tracking-widest">Preparing demo credentials...</p>
            </div>
          )}

          {/* ==========================================
              STATE 1: TRANSACTION FORM
             ========================================== */}
          {currentStep === 1 && !isLoggingIn && (
            <div className="space-y-4 animate-fadeIn">
              <form onSubmit={handleInitiateTransfer} className="bg-slate-50 border border-slate-200/60 rounded-xl p-5 space-y-4 font-sans">
                
                {/* ARCHITECTURE SELECTOR */}
                <div className="space-y-2 border-b border-slate-200 pb-4">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider font-sans">
                    Architecture Selector
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setDemoSecurityMode('classical')}
                      disabled={loading || txStatus !== 'IDLE'}
                      className={`p-3 rounded-xl border text-left transition duration-200 cursor-pointer ${
                        demoSecurityMode === 'classical'
                          ? 'border-primary-500 bg-primary-50/30 text-primary-900 shadow-sm'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="font-extrabold text-[11px]">CURRENT BANKING</div>
                      <div className="text-[9px] text-slate-400 font-semibold mt-0.5 uppercase tracking-wide">SECP256R1 / ECDHE</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDemoSecurityMode('quantumshield')}
                      disabled={loading || txStatus !== 'IDLE'}
                      className={`p-3 rounded-xl border text-left transition duration-200 cursor-pointer ${
                        demoSecurityMode === 'quantumshield'
                          ? 'border-primary-500 bg-primary-50/30 text-primary-900 shadow-sm'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="font-extrabold text-[11px]">QUANTUMSHIELD</div>
                      <div className="text-[9px] text-slate-400 font-semibold mt-0.5 uppercase tracking-wide">ML-KEM / POST-QUANTUM KEY ESTABLISHMENT</div>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 font-sans">Sender</label>
                    <input 
                      type="text" 
                      value="Alice (JPMorgan Account: ...123456789)" 
                      disabled 
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 font-bold text-slate-500 cursor-not-allowed opacity-80 font-sans text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 font-sans">Receiver</label>
                    <input 
                      type="text" 
                      value="Bob (HDFC Account: ...987654321)" 
                      disabled 
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 font-bold text-slate-500 cursor-not-allowed opacity-80 font-sans text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 font-sans">Reference / Memo</label>
                    <input 
                      type="text" 
                      value={memo} 
                      onChange={(e) => setMemo(e.target.value)} 
                      disabled={loading || txStatus !== 'IDLE'}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 font-sans text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 font-sans">Amount (USD)</label>
                    <input 
                      type="number" 
                      value={amount} 
                      onChange={(e) => setAmount(e.target.value)} 
                      disabled={loading || txStatus !== 'IDLE'}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 font-sans text-xs"
                      min="1"
                    />
                  </div>
                </div>

                {txStatus !== 'IDLE' && txStatus !== 'SUCCESS' && txStatus !== 'SETTLED' && (
                  <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2.5">
                    <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-slate-400 font-sans">
                      <span>Gateway Pipeline Status</span>
                      <span className="text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full font-sans font-bold">
                        {txStatus}
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary-600 transition-all duration-350"
                        style={{
                          width: txStatus === 'DECRYPT_TX' ? '80%'
                                 : txStatus === 'SEND_TX' ? '60%'
                                 : txStatus === 'ENCRYPT_TX' ? '40%'
                                 : txStatus === 'KEY_EXCHANGE' ? '20%' : '5%'
                        }}
                      />
                    </div>
                  </div>
                )}

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-primary-600 hover:bg-primary-700 active:bg-primary-800 disabled:bg-primary-400 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl shadow-md transition flex items-center justify-center gap-1.5 active:scale-[0.99] cursor-pointer uppercase tracking-wider text-xs font-sans"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin text-white" />
                        <span>TRANSFERRING...</span>
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 text-white" />
                        <span>TRANSFER MONEY</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ==========================================
              STATE 2: TRANSACTION SUCCESSFUL
             ========================================== */}
          {currentStep === 2 && (
            <div className="space-y-4 text-center py-6 animate-fadeIn font-sans">
              <h4 className="font-extrabold text-sm uppercase tracking-wider text-slate-800">TRANSACTION SUCCESSFUL</h4>
              <button
                type="button"
                onClick={() => setCurrentStep(3)} // Transition to State 3
                className="w-full bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white font-bold py-3 rounded-xl shadow-md transition flex items-center justify-center gap-1.5 active:scale-[0.99] cursor-pointer uppercase tracking-wider text-xs font-sans"
              >
                CAPTURE TRANSACTION
              </button>
            </div>
          )}

          {/* ==========================================
              STATE 3: CAPTURED CRYPTOGRAPHIC MATERIAL
             ========================================== */}
          {currentStep === 3 && capturedTxDetails && (
            <div className="space-y-4 animate-fadeIn">
              
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4 select-text font-mono text-[10.5px]">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="font-extrabold font-sans text-xs text-slate-800 uppercase tracking-wider">CAPTURED CRYPTOGRAPHIC MATERIAL</span>
                </div>

                <div className="space-y-3 font-sans">
                  {/* Transaction ID */}
                  <div>
                    <div className="text-slate-400 mb-1 font-sans font-bold text-[10px] uppercase tracking-wider">
                      Transaction ID
                    </div>
                    <div className="bg-white border border-slate-200 p-2 rounded-lg text-slate-800 font-extrabold text-xs">
                      TX-{capturedTxDetails.id?.toString().padStart(6, '0')}
                    </div>
                  </div>

                  {capturedTxDetails.security_mode === 'quantumshield' ? (
                    <>
                      {/* Key Exchange Algorithm */}
                      <div>
                        <div className="text-slate-400 mb-1 font-sans font-bold text-[10px] uppercase tracking-wider">
                          Key Exchange Algorithm
                        </div>
                        <div className="bg-white border border-slate-200 p-2 rounded-lg text-primary-700 font-extrabold text-xs">
                          ML-KEM (ML-KEM-768)
                        </div>
                      </div>

                      {/* ML-KEM Public Key */}
                      <div>
                        <div className="text-slate-400 mb-1 font-sans font-bold text-[10px] uppercase tracking-wider">
                          ML-KEM Public Key
                        </div>
                        <div className="bg-white border border-slate-200 p-2.5 rounded-lg text-slate-650 overflow-x-auto max-h-20 overflow-y-auto custom-scrollbar whitespace-pre-wrap leading-relaxed break-all font-mono text-[10px]">
                          {capturedTxDetails.mlkem?.public_key || "Not available"}
                        </div>
                      </div>

                      {/* ML-KEM Encapsulation/Ciphertext */}
                      <div>
                        <div className="text-slate-400 mb-1 font-sans font-bold text-[10px] uppercase tracking-wider">
                          ML-KEM Encapsulation Ciphertext
                        </div>
                        <div className="bg-white border border-slate-200 p-2.5 rounded-lg text-slate-650 overflow-x-auto max-h-20 overflow-y-auto custom-scrollbar whitespace-pre-wrap leading-relaxed break-all font-mono text-[10px]">
                          {capturedTxDetails.mlkem?.ciphertext || "Not available"}
                        </div>
                      </div>

                      {/* ML-DSA Public Verification Key */}
                      {capturedTxDetails.mldsa?.public_key && (
                        <div>
                          <div className="text-slate-400 mb-1 font-sans font-bold text-[10px] uppercase tracking-wider">
                            ML-DSA Public Verification Key
                          </div>
                          <div className="bg-white border border-slate-200 p-2.5 rounded-lg text-slate-650 overflow-x-auto max-h-20 overflow-y-auto custom-scrollbar whitespace-pre-wrap leading-relaxed break-all font-mono text-[10px]">
                            {capturedTxDetails.mldsa.public_key}
                          </div>
                        </div>
                      )}

                      {/* ML-DSA Signature */}
                      {capturedTxDetails.mldsa?.signature && (
                        <div>
                          <div className="text-slate-400 mb-1 font-sans font-bold text-[10px] uppercase tracking-wider">
                            ML-DSA Signature
                          </div>
                          <div className="bg-white border border-slate-200 p-2.5 rounded-lg text-slate-650 overflow-x-auto max-h-20 overflow-y-auto custom-scrollbar whitespace-pre-wrap leading-relaxed break-all font-mono text-[10px]">
                            {capturedTxDetails.mldsa.signature}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      {/* Key Exchange Curve */}
                      <div>
                        <div className="text-slate-400 mb-1 font-sans font-bold text-[10px] uppercase tracking-wider">
                          Key Exchange Curve
                        </div>
                        <div className="bg-white border border-slate-200 p-2 rounded-lg text-primary-700 font-extrabold text-xs">
                          SECP256R1 / NIST P-256
                        </div>
                      </div>

                      {/* Client DH Public Key */}
                      <div>
                        <div className="text-slate-400 mb-1 font-sans font-bold text-[10px] uppercase tracking-wider">
                          Client DH Public Key
                        </div>
                        <div className="bg-white border border-slate-200 p-2.5 rounded-lg text-slate-650 overflow-x-auto max-h-20 overflow-y-auto custom-scrollbar whitespace-pre-wrap leading-relaxed break-all font-mono text-[10px]">
                          {capturedTxDetails.dh?.client_dh_public || "Not available"}
                        </div>
                      </div>

                      {/* Server DH Public Key */}
                      <div>
                        <div className="text-slate-400 mb-1 font-sans font-bold text-[10px] uppercase tracking-wider">
                          Server DH Public Key
                        </div>
                        <div className="bg-white border border-slate-200 p-2.5 rounded-lg text-slate-650 overflow-x-auto max-h-20 overflow-y-auto custom-scrollbar whitespace-pre-wrap leading-relaxed break-all font-mono text-[10px]">
                          {capturedTxDetails.dh?.server_dh_public || "Not available"}
                        </div>
                      </div>

                      {/* Client Signature Key */}
                      {capturedTxDetails.signature?.client_signing_key && (
                        <div>
                          <div className="text-slate-400 mb-1 font-sans font-bold text-[10px] uppercase tracking-wider">
                            Client ECDSA Public Verification Key
                          </div>
                          <div className="bg-white border border-slate-200 p-2.5 rounded-lg text-slate-650 overflow-x-auto max-h-20 overflow-y-auto custom-scrollbar whitespace-pre-wrap leading-relaxed break-all font-mono text-[10px]">
                            {capturedTxDetails.signature.client_signing_key}
                          </div>
                        </div>
                      )}

                      {/* Signature Hex */}
                      {capturedTxDetails.signature?.signature_hex && (
                        <div>
                          <div className="text-slate-400 mb-1 font-sans font-bold text-[10px] uppercase tracking-wider">
                            ECDSA Signature
                          </div>
                          <div className="bg-white border border-slate-200 p-2.5 rounded-lg text-slate-650 overflow-x-auto max-h-20 overflow-y-auto custom-scrollbar whitespace-pre-wrap leading-relaxed break-all font-mono text-[10px]">
                            {capturedTxDetails.signature.signature_hex}
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* Encrypted Payload */}
                  <div>
                    <div className="text-slate-400 mb-1 font-sans font-bold text-[10px] uppercase tracking-wider">
                      Encrypted Payload (AES-256-GCM Ciphertext)
                    </div>
                    <div className="bg-white border border-slate-200 p-2.5 rounded-lg text-slate-650 break-all leading-normal font-mono text-[10.5px]">
                      {capturedTxDetails.encryption?.ciphertext || "Not available"}
                    </div>
                  </div>

                  {/* Nonce and Tag */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="block text-slate-400 mb-1 font-sans font-bold text-[10px] uppercase tracking-wider">Nonce</span>
                      <div className="bg-white border border-slate-200 p-2.5 rounded-lg text-slate-750 font-bold break-all font-mono text-[10.5px]">
                        {capturedTxDetails.encryption?.nonce || "Not available"}
                      </div>
                    </div>
                    <div>
                      <span className="block text-slate-400 mb-1 font-sans font-bold text-[10px] uppercase tracking-wider">Authentication Tag</span>
                      <div className="bg-white border border-slate-200 p-2.5 rounded-lg text-slate-750 font-bold break-all font-mono text-[10.5px]">
                        {capturedTxDetails.encryption?.tag || "Not available"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleRunQuantumThreat}
                  className="w-full bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white font-bold py-3 rounded-xl shadow-md transition flex items-center justify-center gap-1.5 active:scale-[0.99] cursor-pointer uppercase tracking-wider text-xs font-sans"
                >
                  RUN QUANTUM THREAT
                </button>
              </div>
            </div>
          )}

          {/* ==========================================
              STATE 4: QUANTUM EXECUTION CONSOLE
             ========================================== */}
          {currentStep === 4 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 font-mono text-emerald-400 min-h-[250px] flex flex-col justify-between shadow-inner">
                <div className="space-y-2 text-[11px] leading-relaxed select-text">
                  <div className="text-slate-450 font-sans font-extrabold uppercase tracking-wider text-[10px] pb-1 border-b border-slate-800 mb-3">
                    QUANTUM EXECUTION CONSOLE
                  </div>
                  {logs.map((log, idx) => (
                    <div key={idx} className="whitespace-pre-wrap">{log}</div>
                  ))}
                </div>
                {loading ? (
                  <div className="flex items-center gap-2 text-primary-400 mt-3 font-sans font-bold text-[10px]">
                    <RefreshCw className="h-3 w-3 animate-spin" />
                    <span>RUNNING QUANTUM ANALYSIS...</span>
                  </div>
                ) : (
                  <div className="pt-4 flex justify-end shrink-0">
                    <button
                      onClick={() => setCurrentStep(5)}
                      className="bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white font-bold py-2 px-4 rounded-xl shadow-md transition uppercase tracking-wider text-[10px] font-sans cursor-pointer"
                    >
                      View Analysis Result
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ==========================================
              STATE 5: RESULT
             ========================================== */}
          {currentStep === 5 && demoResult && (
            <div className="space-y-4 animate-fadeIn">
              
              {/* 1. QUANTUM THREAT RESULT */}
              {demoResult.demo_type === 'quantumshield_mlkem_check' ? (
                <div className="border border-slate-200 bg-white rounded-xl p-5 text-center space-y-4 shadow-sm font-sans">
                  <div className="flex justify-center mb-1">
                    <div className="bg-emerald-100 text-emerald-700 p-2.5 rounded-full">
                      <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                    </div>
                  </div>
                  <h4 className="font-extrabold text-sm text-slate-800 tracking-wider uppercase font-sans">
                    QUANTUM THREAT RESULT
                  </h4>
                  
                  <div className="border-t border-slate-200 pt-4 text-left font-sans text-xs space-y-3.5">
                    <div className="flex justify-between items-center py-0.5 border-b border-slate-100 pb-2">
                      <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider font-sans">Key Exchange</span>
                      <span className="font-extrabold text-primary-700 uppercase">
                        {demoResult.attack?.algorithm || 'ML-KEM'} DETECTED
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-0.5 border-b border-slate-100 pb-2">
                      <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider font-sans">ECDLP Attack</span>
                      <span className="font-extrabold text-slate-700 uppercase">
                        {demoResult.attack?.attack_applicability || 'NOT APPLICABLE'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-0.5 border-b border-slate-100 pb-2">
                      <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider font-sans">Key Recovery</span>
                      <span className="font-extrabold text-rose-600 uppercase">
                        {demoResult.attack?.key_recovery || 'FAILED'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-0.5">
                      <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider font-sans">Payload</span>
                      <span className="font-extrabold text-emerald-700 uppercase">
                        {demoResult.decryption?.plaintext_recovered ? 'DECRYPTED' : 'PROTECTED'}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="border border-slate-200 bg-white rounded-xl p-5 text-center space-y-4 shadow-sm font-sans">
                  <div className="flex justify-center mb-1">
                    <div className="bg-rose-100 text-rose-700 p-2.5 rounded-full">
                      <AlertTriangle className="h-6 w-6 text-rose-650" />
                    </div>
                  </div>
                  <h4 className="font-extrabold text-sm text-slate-800 tracking-wider uppercase font-sans">
                    QUANTUM THREAT RESULT
                  </h4>
                  
                  <div className="border-t border-slate-200 pt-4 text-left font-sans text-xs space-y-3.5">
                    <div className="flex justify-between items-center py-0.5 border-b border-slate-100 pb-2">
                      <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider font-sans">ECDLP Key Recovery</span>
                      <span className={`font-extrabold ${demoResult.attack?.scalar_verification ? 'text-rose-600' : 'text-slate-700'} uppercase`}>
                        {demoResult.attack?.scalar_verification ? 'RECOVERED' : 'FAILED'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-0.5 border-b border-slate-100 pb-2">
                      <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider font-sans">Session Key</span>
                      <span className={`font-extrabold ${demoResult.key_derivation?.verification ? 'text-rose-600' : 'text-slate-700'} uppercase`}>
                        {demoResult.key_derivation?.verification ? 'RECOVERED' : 'FAILED'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-0.5 border-b border-slate-100 pb-2">
                      <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider font-sans">Payload</span>
                      <span className={`font-extrabold ${demoResult.decryption?.plaintext_recovered ? 'text-rose-600' : 'text-slate-700'} uppercase`}>
                        {demoResult.decryption?.plaintext_recovered ? 'DECRYPTED' : 'FAILED'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-0.5">
                      <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider font-sans">Confidentiality</span>
                      <span className={`font-extrabold ${demoResult.decryption?.plaintext_recovered ? 'text-rose-600' : 'text-emerald-700'} uppercase`}>
                        {demoResult.decryption?.plaintext_recovered ? 'COMPROMISED' : 'SECURE'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. RECOVERED CRYPTOGRAPHIC MATERIAL (Only for classical/ECDLP path) */}
              {demoResult.demo_type !== 'quantumshield_mlkem_check' && (
                <div className="border border-slate-200 bg-white rounded-xl p-5 space-y-4 shadow-sm font-sans">
                  <h4 className="font-extrabold text-xs text-slate-800 tracking-wider uppercase font-sans">
                    RECOVERED CRYPTOGRAPHIC MATERIAL
                  </h4>
                  
                  <div className="border-t border-slate-200 pt-4 space-y-3.5">
                    {demoResult.key_derivation?.derived_key_hex && (
                      <div>
                        <span className="block text-slate-450 mb-1 font-sans font-bold text-[9px] uppercase tracking-wider">
                          Derived AES Key
                        </span>
                        {renderDerivedKey()}
                      </div>
                    )}
                  </div>

                  {/* Cryptographic Chain */}
                  <div className="pt-2">
                    {renderCryptoChain(false)}
                  </div>
                </div>
              )}

              {/* For ML-KEM, render the chain row separately since there's no cryptographic material card */}
              {demoResult.demo_type === 'quantumshield_mlkem_check' && (
                <div className="border border-slate-200 bg-white rounded-xl p-5 shadow-sm font-sans">
                  {renderCryptoChain(true)}
                </div>
              )}

              {/* 3. EXISTING RECOVERED PAYLOAD (Only if decrypted plaintext is present) */}
              {demoResult.decryption?.plaintext && (
                <div className="border border-slate-200 bg-white rounded-xl p-5 space-y-4 shadow-sm font-sans">
                  <div className="text-center space-y-1">
                    <h4 className="font-extrabold text-xs text-slate-800 tracking-wider uppercase font-sans">
                      RECOVERED PAYLOAD
                    </h4>
                  </div>

                  <div className="border-t border-slate-200 pt-2 font-sans text-xs">
                    <table className="w-full text-left border-collapse">
                      <tbody className="divide-y divide-slate-150 text-slate-700 font-medium">
                        <tr className="hover:bg-slate-50/30 transition-colors">
                          <td className="px-3 py-2 font-bold text-slate-400 text-[10px] uppercase tracking-wider">Sender</td>
                          <td className="px-3 py-2 text-right font-extrabold text-slate-850">{demoResult.decryption.plaintext.sender}</td>
                        </tr>
                        <tr className="hover:bg-slate-50/30 transition-colors">
                          <td className="px-3 py-2 font-bold text-slate-400 text-[10px] uppercase tracking-wider">Receiver</td>
                          <td className="px-3 py-2 text-right font-extrabold text-slate-850">{demoResult.decryption.plaintext.receiver}</td>
                        </tr>
                        <tr className="hover:bg-slate-50/30 transition-colors">
                          <td className="px-3 py-2 font-bold text-slate-400 text-[10px] uppercase tracking-wider">Amount</td>
                          <td className="px-3 py-2 text-right font-extrabold text-slate-850">
                            {formatAmount(demoResult.decryption.plaintext.amount, demoResult.decryption.plaintext.currency)}
                          </td>
                        </tr>
                        <tr className="hover:bg-slate-50/30 transition-colors">
                          <td className="px-3 py-2 font-bold text-slate-400 text-[10px] uppercase tracking-wider">Currency</td>
                          <td className="px-3 py-2 text-right font-extrabold text-slate-850">{demoResult.decryption.plaintext.currency}</td>
                        </tr>
                        <tr className="hover:bg-slate-50/30 transition-colors">
                          <td className="px-3 py-2 font-bold text-slate-400 text-[10px] uppercase tracking-wider">Memo / Reference</td>
                          <td className="px-3 py-2 text-right font-extrabold text-slate-850 max-w-[200px] truncate">{demoResult.decryption.plaintext.memo}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 4. SECURITY STATUS */}
              {demoResult.demo_type === 'quantumshield_mlkem_check' ? (
                <div className="border border-emerald-200 bg-emerald-50/20 rounded-xl p-4 space-y-3 font-sans">
                  <h4 className="font-extrabold text-xs text-emerald-800 tracking-wider uppercase font-sans">
                    SECURITY STATUS
                  </h4>
                  <div className="border-t border-emerald-150 pt-3 text-xs space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-bold text-[10px] uppercase tracking-wider">CONFIDENTIALITY</span>
                      <span className="font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 rounded-full text-[9px] tracking-wider">
                        SECURE
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-bold text-[10px] uppercase tracking-wider">PAYLOAD ACCESS</span>
                      <span className="font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 rounded-full text-[9px] tracking-wider">
                        PROTECTED
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="border border-red-200 bg-red-50/30 rounded-xl p-4 space-y-3 font-sans">
                  <h4 className="font-extrabold text-xs text-rose-800 tracking-wider uppercase font-sans">
                    SECURITY STATUS
                  </h4>
                  <div className="border-t border-red-100 pt-3 text-xs space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-bold text-[10px] uppercase tracking-wider">CONFIDENTIALITY</span>
                      <span className="font-extrabold text-rose-600 bg-rose-50 border border-rose-100 px-2.5 py-0.5 rounded-full text-[9px] tracking-wider">
                        COMPROMISED
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-bold text-[10px] uppercase tracking-wider">PAYLOAD ACCESS</span>
                      <span className="font-extrabold text-rose-600 bg-rose-50 border border-rose-100 px-2.5 py-0.5 rounded-full text-[9px] tracking-wider">
                        RECOVERED
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* ACTION BUTTONS */}
              <div className="flex items-center space-x-3 pt-2">
                <button
                  onClick={() => {
                    setCurrentStep(1);
                    setTxStatus('IDLE');
                    setTxId(null);
                    setCapturedTxDetails(null);
                    setDemoResult(null);
                  }}
                  className="flex-1 bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white font-bold py-2.5 rounded-xl shadow transition text-center cursor-pointer font-sans uppercase tracking-wider text-[10px] border border-transparent"
                >
                  Start New Demonstration
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-650 font-bold py-2.5 rounded-xl shadow-sm transition text-center cursor-pointer font-sans uppercase tracking-wider text-[10px]"
                >
                  Close
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
export default QuantumThreatDemoModal;
