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
        
        for (const log of backendLogs) {
          setLogs(prev => [...prev, `> ${log.message}`]);
          await new Promise(resolve => setTimeout(resolve, 200));
        }

        await new Promise(resolve => setTimeout(resolve, 500));
        setDemoResult(demoRes.data);
        setCurrentStep(5); // Go to State 5 (Result Screen)
      } else {
        setError(demoRes.data?.error || 'Quantum demonstration returned success: False.');
      }
    } catch (err: any) {
      console.error('Error executing Shor analysis:', err);
      setError(err.response?.data?.detail || err.message || 'Quantum threat analysis failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none">
      
      {/* Modal Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-zoomIn">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <Activity className="h-5 w-5 text-purple-600 animate-pulse" />
            <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-800">
              QUANTUM THREAT DEMONSTRATION
            </h3>
          </div>
          <button 
            onClick={onClose}
            disabled={loading}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/50 transition duration-150"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 min-h-0 custom-scrollbar text-slate-650 text-xs">
          
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-900 p-4 rounded-xl flex items-start space-x-3 shadow-inner">
              <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1 leading-relaxed font-semibold">
                <p className="font-bold text-[11px] uppercase tracking-wide text-rose-800">Error Occurred</p>
                <p>{error}</p>
              </div>
            </div>
          )}

          {isLoggingIn && (
            <div className="flex flex-col items-center justify-center py-10 space-y-3">
              <RefreshCw className="h-6 w-6 text-purple-600 animate-spin" />
              <p className="font-bold text-[10px] text-slate-400 uppercase tracking-widest">Preparing demo credentials...</p>
            </div>
          )}

          {/* ==========================================
              STATE 1: TRANSACTION FORM
             ========================================== */}
          {currentStep === 1 && !isLoggingIn && (
            <div className="space-y-5 animate-fadeIn">
              <form onSubmit={handleInitiateTransfer} className="bg-slate-50 border border-slate-200/60 rounded-xl p-5 space-y-4">
                
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
                      className={`p-3 rounded-xl border text-left transition duration-200 ${
                        demoSecurityMode === 'classical'
                          ? 'border-blue-500 bg-blue-50/30 text-blue-900 shadow-sm'
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
                      className={`p-3 rounded-xl border text-left transition duration-200 ${
                        demoSecurityMode === 'quantumshield'
                          ? 'border-purple-500 bg-purple-50/30 text-purple-900 shadow-sm'
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
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 font-sans text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 font-sans">Amount (USD)</label>
                    <input 
                      type="number" 
                      value={amount} 
                      onChange={(e) => setAmount(e.target.value)} 
                      disabled={loading || txStatus !== 'IDLE'}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 font-sans text-xs"
                      min="1"
                    />
                  </div>
                </div>

                {txStatus !== 'IDLE' && txStatus !== 'SUCCESS' && txStatus !== 'SETTLED' && (
                  <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2.5">
                    <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-slate-400 font-sans">
                      <span>Gateway Pipeline Status</span>
                      <span className="text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full font-sans font-bold">
                        {txStatus}
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-purple-600 transition-all duration-350"
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
                    className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-blue-400 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl shadow-md transition flex items-center justify-center gap-1.5 active:scale-[0.99] cursor-pointer uppercase tracking-wider text-xs font-sans"
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
              STATE 2: TRANSACTION CAPTURED
             ========================================== */}
          {currentStep === 2 && (
            <div className="space-y-6 text-center py-8 animate-fadeIn">
              <h4 className="font-extrabold text-sm uppercase tracking-wider text-slate-800">TRANSACTION CAPTURED</h4>
              <button
                type="button"
                onClick={() => setCurrentStep(3)} // Transition to State 3
                className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold py-3 rounded-xl shadow-md transition flex items-center justify-center gap-1.5 active:scale-[0.99] cursor-pointer uppercase tracking-wider text-xs font-sans"
              >
                CAPTURE TRANSACTION
              </button>
            </div>
          )}

          {/* ==========================================
              STATE 3: CAPTURED CRYPTOGRAPHIC MATERIAL
             ========================================== */}
          {currentStep === 3 && capturedTxDetails && (
            <div className="space-y-5 animate-fadeIn">
              
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4 select-text font-mono text-[10.5px]">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="font-extrabold font-sans text-xs text-slate-800 uppercase tracking-wider">CAPTURED CRYPTOGRAPHIC MATERIAL</span>
                </div>

                <div className="space-y-3 font-sans">
                  {capturedTxDetails.security_mode === 'quantumshield' ? (
                    <>
                      {/* Key Exchange Algorithm */}
                      <div>
                        <div className="text-slate-400 mb-1 font-sans font-bold text-[10px] uppercase tracking-wider">
                          Key Exchange Algorithm
                        </div>
                        <div className="bg-white border border-slate-200 p-2 rounded-lg text-purple-700 font-extrabold text-xs">
                          ML-KEM (ML-KEM-768)
                        </div>
                      </div>

                      {/* ML-KEM Public Key */}
                      <div>
                        <div className="text-slate-400 mb-1 font-sans font-bold text-[10px] uppercase tracking-wider">
                          ML-KEM Public Key
                        </div>
                        <div className="bg-white border border-slate-200 p-2.5 rounded-lg text-slate-650 overflow-x-auto max-h-24 overflow-y-auto custom-scrollbar whitespace-pre-wrap leading-relaxed break-all font-mono text-[10.5px]">
                          {capturedTxDetails.mlkem?.public_key}
                        </div>
                      </div>

                      {/* ML-KEM Encapsulation/Ciphertext */}
                      <div>
                        <div className="text-slate-400 mb-1 font-sans font-bold text-[10px] uppercase tracking-wider">
                          ML-KEM Encapsulation Ciphertext
                        </div>
                        <div className="bg-white border border-slate-200 p-2.5 rounded-lg text-slate-650 overflow-x-auto max-h-24 overflow-y-auto custom-scrollbar whitespace-pre-wrap leading-relaxed break-all font-mono text-[10.5px]">
                          {capturedTxDetails.mlkem?.ciphertext}
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Key Exchange Curve */}
                      <div>
                        <div className="text-slate-400 mb-1 font-sans font-bold text-[10px] uppercase tracking-wider">
                          Key Exchange Curve
                        </div>
                        <div className="bg-white border border-slate-200 p-2 rounded-lg text-blue-700 font-extrabold text-xs">
                          SECP256R1 / NIST P-256
                        </div>
                      </div>

                      {/* Client DH Public Key */}
                      <div>
                        <div className="text-slate-400 mb-1 font-sans font-bold text-[10px] uppercase tracking-wider">
                          Client DH Public Key
                        </div>
                        <div className="bg-white border border-slate-200 p-2.5 rounded-lg text-slate-650 overflow-x-auto max-h-24 overflow-y-auto custom-scrollbar whitespace-pre-wrap leading-relaxed break-all font-mono text-[10.5px]">
                          {capturedTxDetails.dh?.client_dh_public}
                        </div>
                      </div>

                      {/* Server DH Public Key */}
                      <div>
                        <div className="text-slate-400 mb-1 font-sans font-bold text-[10px] uppercase tracking-wider">
                          Server DH Public Key
                        </div>
                        <div className="bg-white border border-slate-200 p-2.5 rounded-lg text-slate-650 overflow-x-auto max-h-24 overflow-y-auto custom-scrollbar whitespace-pre-wrap leading-relaxed break-all font-mono text-[10.5px]">
                          {capturedTxDetails.dh?.server_dh_public}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Encrypted Payload */}
                  <div>
                    <div className="text-slate-400 mb-1 font-sans font-bold text-[10px] uppercase tracking-wider">
                      Encrypted Payload
                    </div>
                    <div className="bg-white border border-slate-200 p-2.5 rounded-lg text-slate-650 break-all leading-normal font-mono text-[10.5px]">
                      {capturedTxDetails.encryption?.ciphertext}
                    </div>
                  </div>

                  {/* Nonce and Tag */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="block text-slate-400 mb-1 font-sans font-bold text-[10px] uppercase tracking-wider font-sans">Nonce</span>
                      <div className="bg-white border border-slate-200 p-2.5 rounded-lg text-slate-750 font-bold break-all font-mono text-[10.5px]">
                        {capturedTxDetails.encryption?.nonce}
                      </div>
                    </div>
                    <div>
                      <span className="block text-slate-400 mb-1 font-sans font-bold text-[10px] uppercase tracking-wider font-sans">Authentication Tag</span>
                      <div className="bg-white border border-slate-200 p-2.5 rounded-lg text-slate-750 font-bold break-all font-mono text-[10.5px]">
                        {capturedTxDetails.encryption?.tag}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleRunQuantumThreat}
                  className="w-full bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white font-bold py-3 rounded-xl shadow-md transition flex items-center justify-center gap-1.5 active:scale-[0.99] cursor-pointer uppercase tracking-wider text-xs font-sans"
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
            <div className="space-y-5 animate-fadeIn">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 font-mono text-emerald-400 min-h-[250px] flex flex-col justify-between shadow-inner">
                <div className="space-y-2 text-[11px] leading-relaxed select-text">
                  <div className="text-slate-450 font-sans font-extrabold uppercase tracking-wider text-[10px] pb-1 border-b border-slate-800 mb-3">
                    QUANTUM EXECUTION CONSOLE
                  </div>
                  {logs.map((log, idx) => (
                    <div key={idx} className="whitespace-pre-wrap">{log}</div>
                  ))}
                  {loading && (
                    <div className="flex items-center gap-2 text-purple-400 mt-3 font-sans font-bold text-[10px]">
                      <RefreshCw className="h-3 w-3 animate-spin" />
                      <span>RUNNING QUANTUM ANALYSIS...</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ==========================================
              STATE 5: RESULT
             ========================================== */}
          {currentStep === 5 && demoResult && (
            <div className="space-y-6 animate-fadeIn">
              
              {demoResult.demo_type === 'quantumshield_mlkem_check' ? (
                /* QUANTUMSHIELD RESULT */
                <div className="space-y-6">
                  <div className="border border-purple-200 bg-purple-50/20 rounded-xl p-6 text-center space-y-4 shadow-sm">
                    <div className="flex justify-center mb-1">
                      <div className="bg-purple-100 text-purple-700 p-2.5 rounded-full">
                        <Activity className="h-6 w-6" />
                      </div>
                    </div>
                    <h4 className="font-extrabold text-sm text-purple-900 tracking-wider uppercase font-sans">
                      QUANTUM THREAT RESULT
                    </h4>
                    
                    <div className="border-t border-purple-200/60 pt-4 text-left font-sans text-xs space-y-3.5">
                      <div className="flex justify-between items-center py-0.5 border-b border-slate-100/60 pb-2">
                        <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider font-sans">Attack Attempt</span>
                        <span className="font-extrabold text-rose-600 uppercase">Not Executed</span>
                      </div>
                      <div className="flex justify-between items-center py-0.5 border-b border-slate-100/60 pb-2">
                        <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider font-sans">Reason</span>
                        <span className="font-extrabold text-slate-700">Shor attack not applicable for ML-KEM</span>
                      </div>
                      <div className="flex justify-between items-center py-0.5 border-b border-slate-100/60 pb-2">
                        <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider font-sans">Key Exchange</span>
                        <span className="font-extrabold text-purple-700">ML-KEM DETECTED</span>
                      </div>
                      <div className="flex justify-between items-center py-0.5 border-b border-slate-100/60 pb-2">
                        <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider font-sans">Shor/ECDLP Attack</span>
                        <span className="font-extrabold text-slate-700 uppercase">NOT APPLICABLE</span>
                      </div>
                      <div className="flex justify-between items-center py-0.5 border-b border-slate-100/60 pb-2">
                        <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider font-sans">Key Recovery</span>
                        <span className="font-extrabold text-rose-600 uppercase font-mono">FAILED</span>
                      </div>
                      <div className="flex justify-between items-center py-0.5">
                        <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider font-sans">Security Status</span>
                        <span className="inline-block bg-emerald-100 border border-emerald-250 text-emerald-850 font-extrabold text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full mt-0.5">
                          QUANTUM-RESISTANT
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* CURRENT BANKING RESULT */
                <div className="space-y-6">
                  {/* ✓ QUANTUM THREAT RESULT */}
                  <div className="border border-purple-200 bg-purple-50/20 rounded-xl p-6 text-center space-y-4 shadow-sm">
                    <div className="flex justify-center mb-1">
                      <div className="bg-emerald-100 text-emerald-700 p-2.5 rounded-full">
                        <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                      </div>
                    </div>
                    <h4 className="font-extrabold text-sm text-purple-900 tracking-wider uppercase font-sans">
                      ✓ QUANTUM THREAT RESULT
                    </h4>
                    
                    <div className="border-t border-purple-200/60 pt-4 text-left font-sans text-xs space-y-3.5">
                      <div className="flex justify-between items-center py-0.5 border-b border-slate-100/60 pb-2">
                        <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider font-sans">Key Exchange Curve</span>
                        <span className="font-extrabold text-slate-800">SECP256R1 (NIST P-256)</span>
                      </div>
                      <div className="flex justify-between items-center py-0.5 border-b border-slate-100/60 pb-2">
                        <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider font-sans">ECDLP Attack</span>
                        <span className="font-extrabold text-slate-700 uppercase font-sans">EXECUTED</span>
                      </div>
                      <div className="flex justify-between items-center py-0.5 border-b border-slate-100/60 pb-2">
                        <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider font-sans">Key Recovery</span>
                        <span className="font-extrabold text-emerald-700 uppercase font-sans">Successful</span>
                      </div>
                      <div className="flex justify-between items-center py-0.5">
                        <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider font-sans">Payload Recovery</span>
                        <span className="font-extrabold text-emerald-700 uppercase font-sans">Successful</span>
                      </div>
                    </div>
                  </div>

                  {/* RECOVERED PAYLOAD CARD */}
                  {demoResult.decryption?.plaintext && (
                    <div className="border border-slate-200 bg-white rounded-2xl p-6 space-y-4 shadow-md font-sans">
                      <div className="text-center space-y-1">
                        <div className="flex justify-center mb-1 text-purple-700 font-extrabold text-lg">
                          [ ✓ ]
                        </div>
                        <h4 className="font-extrabold text-xs text-slate-800 tracking-wider uppercase font-sans">
                          RECOVERED PAYLOAD
                        </h4>
                        <div className="text-[10px] text-slate-400 font-medium">
                          These are the transaction contents recovered after the quantum threat demonstration.
                        </div>
                      </div>

                      <div className="border-t border-slate-200/80 pt-4 text-slate-700 font-medium font-sans text-xs space-y-3.5">
                        <div className="flex justify-between items-center py-0.5 border-b border-slate-100/60 pb-2">
                          <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider font-sans">Sender</span>
                          <span className="font-extrabold text-slate-850">{demoResult.decryption.plaintext.sender}</span>
                        </div>
                        <div className="flex justify-between items-center py-0.5 border-b border-slate-100/60 pb-2">
                          <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider font-sans">Receiver</span>
                          <span className="font-extrabold text-slate-850">{demoResult.decryption.plaintext.receiver}</span>
                        </div>
                        <div className="flex justify-between items-center py-0.5 border-b border-slate-100/60 pb-2">
                          <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider font-sans">Amount</span>
                          <span className="font-extrabold text-purple-750 text-sm">
                            {formatAmount(demoResult.decryption.plaintext.amount, demoResult.decryption.plaintext.currency)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-0.5 border-b border-slate-100/60 pb-2">
                          <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider font-sans">Currency</span>
                          <span className="font-bold text-slate-650">{demoResult.decryption.plaintext.currency}</span>
                        </div>
                        <div className="flex justify-between items-center py-0.5">
                          <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider font-sans">Memo / Reference</span>
                          <span className="font-bold text-slate-650 text-right max-w-[220px] truncate">{demoResult.decryption.plaintext.memo}</span>
                        </div>
                      </div>
                    </div>
                  )}
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
                  className="flex-1 bg-purple-650 text-white font-bold py-2.5 rounded-xl shadow transition text-center cursor-pointer font-sans uppercase tracking-wider text-[10px] border border-transparent"
                >
                  Start New Demonstration
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 bg-slate-800 text-white font-bold py-2.5 rounded-xl shadow-sm transition text-center cursor-pointer font-sans uppercase tracking-wider text-[10px] border border-transparent"
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
