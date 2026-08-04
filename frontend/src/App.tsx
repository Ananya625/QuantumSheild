import React, { useState } from 'react';
import { TransactionProvider, useTransaction } from './context/TransactionContext';
import { BankingDashboard } from './components/BankingDashboard';
import { TransferForm } from './components/TransferForm';
import { TransactionPipeline } from './components/TransactionPipeline';
import { SecurityInspector } from './components/SecurityInspector';
import { PacketInspector } from './components/PacketInspector';
import { LiveTimeline } from './components/LiveTimeline';
import { 
  Lock, ShieldCheck, CheckCircle2, 
  FileSearch, RefreshCw, Eye
} from 'lucide-react';

function AppContent() {
  const { 
    screenA, setScreenA, screenB, setScreenB,
    loginA, loginB, quickDemoLogin,
    sessionIdA, sessionIdB,
    accountNumberA, accountNumberB,
    resetTransferState, crypto,
    securityMode, setSecurityMode
  } = useTransaction();

  // Local logins
  const [selectedUserA, setSelectedUserA] = useState<'Alice' | 'Bob'>('Alice');
  const [passA, setPassA] = useState('password123');
  const [errA, setErrA] = useState<string | null>(null);

  const [selectedUserB, setSelectedUserB] = useState<'Alice' | 'Bob'>('Bob');
  const [passB, setPassB] = useState('password123');
  const [errB, setErrB] = useState<string | null>(null);

  // Inspector toggles
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [isPacketOpen, setIsPacketOpen] = useState(false);

  // High-precision stopwatch
  const [elapsedTimeSec, setElapsedTimeSec] = useState<number>(0);

  const isProcessing = screenA === 'PROCESSING' || screenB === 'PROCESSING';

  React.useEffect(() => {
    if (!isProcessing) {
      setElapsedTimeSec(0);
      return;
    }
    const start = performance.now();
    const interval = setInterval(() => {
      const now = performance.now();
      setElapsedTimeSec((now - start) / 1000);
    }, 40);
    return () => clearInterval(interval);
  }, [isProcessing]);

  const handleLoginA = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrA(null);
    if (passA !== 'password123') {
      setErrA('Incorrect passcode.');
      return;
    }
    await loginA(selectedUserA);
  };

  const handleLoginB = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrB(null);
    if (passB !== 'password123') {
      setErrB('Incorrect passcode.');
      return;
    }
    await loginB(selectedUserB);
  };

  const showQuickLogin = !sessionIdA || !sessionIdB;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans select-none w-full">
      {/* Top Split Header Bar */}
      <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shadow-sm shrink-0">
        <div className="flex items-center space-x-2">
          <div className="bg-blue-600 text-white p-1.5 rounded-lg">
            <ShieldCheck className="h-4.5 w-4.5" />
          </div>
          <span className="font-extrabold text-sm tracking-tight text-slate-800">
            QuantumShield™ Inter-bank Wire Security Hub
          </span>
        </div>
        
        <div className="flex items-center space-x-6">
          {/* Security Mode Selector Toggle */}
          <div className="bg-slate-100 p-0.5 rounded-xl flex items-center shadow-inner border border-slate-200">
            <button
              onClick={() => setSecurityMode('classical')}
              className={`px-3 py-1 rounded-lg text-[9px] font-extrabold uppercase tracking-wider transition-all duration-200 ${
                securityMode === 'classical'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              Current Banking
            </button>
            <button
              onClick={() => setSecurityMode('quantumshield')}
              className={`px-3 py-1 rounded-lg text-[9px] font-extrabold uppercase tracking-wider transition-all duration-200 ${
                securityMode === 'quantumshield'
                  ? 'bg-purple-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              QuantumShield
            </button>
          </div>

          {showQuickLogin ? (
            <button
              onClick={quickDemoLogin}
              className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-4 py-1.5 rounded-lg text-xs font-bold shadow-md shadow-blue-500/10 transition active:scale-95 duration-200"
            >
              Demo Auto Login (Alice & Bob)
            </button>
          ) : (
            <div className="flex items-center space-x-2.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                Secure WebSocket Node Link Active
              </span>
            </div>
          )}
        </div>
      </header>

      {/* Side-by-Side Viewport */}
      <div className="flex-1 flex flex-row divide-x divide-slate-200 min-h-0 w-full overflow-hidden">
        
        {/* ==========================================
            LEFT PANEL: SENDER BANK A (ALICE)
           ========================================== */}
        <div className="w-1/2 h-full flex flex-col overflow-y-auto">
          {screenA === 'LOGIN' && (
            <div className="flex-1 flex items-center justify-center p-6 bg-slate-50">
              <div className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl shadow-sm p-6 text-center space-y-5">
                <div className="flex flex-col items-center space-y-1.5">
                  <div className="bg-blue-50 border border-blue-200 text-blue-600 p-2.5 rounded-xl">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <h2 className="font-extrabold text-sm text-slate-900 tracking-tight uppercase">JPMorgan Login</h2>
                  <p className="text-[10px] text-slate-500">Sign in Alice's JPMorgan banking portal</p>
                </div>
                <form onSubmit={handleLoginA} className="space-y-4 text-left">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Account User</label>
                    <select
                      value={selectedUserA}
                      onChange={(e) => setSelectedUserA(e.target.value as 'Alice' | 'Bob')}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-semibold appearance-none"
                    >
                      <option value="Alice">Alice (Primary / JPMorgan)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Password</label>
                    <input
                      type="password"
                      value={passA}
                      onChange={(e) => setPassA(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-850 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-semibold"
                      placeholder="********"
                    />
                  </div>
                  {errA && <div className="bg-rose-50 text-rose-700 text-[10px] p-2 rounded-lg font-bold">{errA}</div>}
                  <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl text-xs shadow transition">
                    Secure Log In
                  </button>
                </form>
              </div>
            </div>
          )}

          {screenA === 'DASHBOARD' && <BankingDashboard party="A" />}
          {screenA === 'TRANSFER' && <TransferForm />}

          {screenA === 'PROCESSING' && (
            <div className="flex-1 bg-white p-6 flex flex-col justify-between space-y-6">
              <div className="border border-slate-100 rounded-xl p-5 flex flex-col items-center justify-center space-y-4 flex-1 text-center shadow-sm">
                <div className="relative flex items-center justify-center">
                  <div className="animate-ping absolute inline-flex h-12 w-12 rounded-full bg-blue-400/20 opacity-75"></div>
                  <div className="relative rounded-xl bg-blue-50 border border-blue-200 p-3 text-blue-600 shadow">
                    <Lock className="h-6 w-6 animate-pulse" />
                  </div>
                </div>
                <div className="space-y-1.5 max-w-sm">
                  <h3 className="font-extrabold text-sm text-slate-800 tracking-tight uppercase">JPMorgan Secure Gateway</h3>
                  <p className="text-[10px] text-slate-400 font-medium leading-normal">
                    Initiating secure handshake connection, computing key exchange secrets, and encrypting wire packets.
                  </p>
                </div>
                <div className="inline-block px-3 py-1 bg-blue-50 border border-blue-100 rounded-xl text-[10px] font-bold font-mono text-blue-600 select-all">
                  Elapsed Time: {elapsedTimeSec.toFixed(2)}s
                </div>
                <div className="w-full border-t border-b border-slate-50 py-4 my-1">
                  <TransactionPipeline />
                </div>
                <div className="flex items-center space-x-3 select-none">
                  <button
                    onClick={() => setIsInspectorOpen(true)}
                    className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 px-3 py-1.5 rounded-xl font-bold text-[10px] shadow-sm flex items-center gap-1 transition active:scale-95 duration-200"
                  >
                    <Eye className="h-3.5 w-3.5" /> Audit Cryptography
                  </button>
                  <button
                    onClick={() => setIsPacketOpen(true)}
                    disabled={!crypto.packetData}
                    className="bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-40 text-slate-600 px-3 py-1.5 rounded-xl font-bold text-[10px] shadow-sm flex items-center gap-1 transition active:scale-95 duration-200"
                  >
                    <FileSearch className="h-3.5 w-3.5" /> Inspect Packet
                  </button>
                </div>
              </div>
              <div className="h-[140px] shrink-0">
                <LiveTimeline />
              </div>
            </div>
          )}

          {screenA === 'RECEIPT' && (
            <div className="flex-1 bg-slate-50 p-6 flex flex-col justify-center">
              <div className="bg-white border border-slate-200 rounded-2xl shadow-premium p-6 text-center space-y-4 max-w-sm mx-auto w-full">
                <div className="flex flex-col items-center space-y-2 select-none">
                  <div className="bg-emerald-50 text-emerald-600 p-3 rounded-full border border-emerald-100 shadow-sm">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                  <h3 className="font-extrabold text-sm text-slate-800 tracking-tight uppercase">JPMorgan Wire Dispatched</h3>
                  <span className="text-[8px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Debit Settled</span>
                </div>
                <div className="border-t border-b border-slate-50 py-3 text-[10px] text-slate-600 space-y-2 select-text font-medium text-left">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Debit Bank</span>
                    <span className="font-bold text-slate-800">{crypto.senderBank || 'JPMorgan'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Sender Account</span>
                    <span className="font-mono text-slate-700 font-semibold">{accountNumberA}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Debit Amount</span>
                    <span className="font-extrabold text-rose-600">-${crypto.settlementDetails?.amount_transferred?.toFixed(2) || '0.00'}</span>
                  </div>
                  {crypto.elapsedTime && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Total Pipeline Time</span>
                      <span className="font-mono text-blue-600 font-bold">{crypto.elapsedTime.toFixed(2)}s</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-center space-x-3 select-none">
                  <button
                    onClick={() => setIsInspectorOpen(true)}
                    className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 px-3 py-1.5 rounded-xl font-bold text-[10px] shadow-sm flex items-center gap-1 transition active:scale-95 duration-200"
                  >
                    <Eye className="h-3.5 w-3.5" /> Audit Cryptography
                  </button>
                  <button
                    onClick={() => setIsPacketOpen(true)}
                    disabled={!crypto.packetData}
                    className="bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-40 text-slate-600 px-3 py-1.5 rounded-xl font-bold text-[10px] shadow-sm flex items-center gap-1 transition active:scale-95 duration-200"
                  >
                    <FileSearch className="h-3.5 w-3.5" /> Inspect Packet
                  </button>
                </div>

                <button
                  onClick={() => {
                    resetTransferState();
                    setScreenA('DASHBOARD');
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-xl text-xs shadow transition"
                >
                  Return to JPMorgan Portal
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ==========================================
            RIGHT PANEL: RECEIVER BANK B (BOB)
           ========================================== */}
        <div className="w-1/2 h-full flex flex-col overflow-y-auto">
          {screenB === 'LOGIN' && (
            <div className="flex-1 flex items-center justify-center p-6 bg-slate-50">
              <div className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl shadow-sm p-6 text-center space-y-5">
                <div className="flex flex-col items-center space-y-1.5">
                  <div className="bg-teal-50 border border-teal-200 text-teal-600 p-2.5 rounded-xl">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <h2 className="font-extrabold text-sm text-slate-900 tracking-tight uppercase">HDFC Login</h2>
                  <p className="text-[10px] text-slate-500">Sign in Bob's HDFC banking portal</p>
                </div>
                <form onSubmit={handleLoginB} className="space-y-4 text-left">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Account User</label>
                    <select
                      value={selectedUserB}
                      onChange={(e) => setSelectedUserB(e.target.value as 'Alice' | 'Bob')}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20 font-semibold appearance-none"
                    >
                      <option value="Bob">Bob (Secondary / HDFC)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Password</label>
                    <input
                      type="password"
                      value={passB}
                      onChange={(e) => setPassB(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-850 focus:outline-none focus:ring-2 focus:ring-teal-500/20 font-semibold"
                      placeholder="********"
                    />
                  </div>
                  {errB && <div className="bg-rose-50 text-rose-700 text-[10px] p-2 rounded-lg font-bold">{errB}</div>}
                  <button type="submit" className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2.5 rounded-xl text-xs shadow transition">
                    Secure Log In
                  </button>
                </form>
              </div>
            </div>
          )}

          {screenB === 'DASHBOARD' && <BankingDashboard party="B" />}

          {screenB === 'PROCESSING' && (
            <div className="flex-1 bg-white p-6 flex flex-col justify-between space-y-6">
              <div className="border border-slate-100 rounded-xl p-5 flex flex-col items-center justify-center space-y-4 flex-1 text-center shadow-sm">
                <div className="relative flex items-center justify-center">
                  <div className="animate-ping absolute inline-flex h-12 w-12 rounded-full bg-teal-400/20 opacity-75"></div>
                  <div className="relative rounded-xl bg-teal-50 border border-teal-200 p-3 text-teal-600 shadow">
                    <RefreshCw className="h-6 w-6 animate-spin" />
                  </div>
                </div>
                <div className="space-y-1.5 max-w-sm">
                  <h3 className="font-extrabold text-sm text-slate-800 tracking-tight uppercase">HDFC Gateway Interface</h3>
                  <p className="text-[10px] text-slate-400 font-medium leading-normal">
                    Monitoring incoming public gateway routing packets, verifying ECDSA signatures, and decrypting payload logs.
                  </p>
                </div>
                <div className="inline-block px-3 py-1 bg-teal-50 border border-teal-100 rounded-xl text-[10px] font-bold font-mono text-teal-600 select-all">
                  Elapsed Time: {elapsedTimeSec.toFixed(2)}s
                </div>
                <div className="w-full border-t border-b border-slate-50 py-4 my-1">
                  <TransactionPipeline />
                </div>
                <div className="flex items-center space-x-3 select-none">
                  <button
                    onClick={() => setIsInspectorOpen(true)}
                    className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 px-3 py-1.5 rounded-xl font-bold text-[10px] shadow-sm flex items-center gap-1 transition active:scale-95 duration-200"
                  >
                    <Eye className="h-3.5 w-3.5" /> Audit Cryptography
                  </button>
                  <button
                    onClick={() => setIsPacketOpen(true)}
                    disabled={!crypto.packetData}
                    className="bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-40 text-slate-600 px-3 py-1.5 rounded-xl font-bold text-[10px] shadow-sm flex items-center gap-1 transition active:scale-95 duration-200"
                  >
                    <FileSearch className="h-3.5 w-3.5" /> Inspect Packet
                  </button>
                </div>
              </div>
              <div className="h-[140px] shrink-0">
                <LiveTimeline />
              </div>
            </div>
          )}

          {screenB === 'RECEIPT' && (
            <div className="flex-1 bg-slate-50 p-6 flex flex-col justify-center">
              <div className="bg-white border border-slate-200 rounded-2xl shadow-premium p-6 text-center space-y-4 max-w-sm mx-auto w-full">
                <div className="flex flex-col items-center space-y-2 select-none">
                  <div className="bg-emerald-50 text-emerald-600 p-3 rounded-full border border-emerald-100 shadow-sm animate-pulse">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                  <h3 className="font-extrabold text-sm text-slate-800 tracking-tight uppercase">HDFC Funds Credited</h3>
                  <span className="text-[8px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Credit Settled</span>
                </div>
                <div className="border-t border-b border-slate-50 py-3 text-[10px] text-slate-600 space-y-2 select-text font-medium text-left">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Credit Bank</span>
                    <span className="font-bold text-slate-800">{crypto.receiverBank || 'HDFC'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Receiver Account</span>
                    <span className="font-mono text-slate-700 font-semibold">{accountNumberB}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Credit Amount</span>
                    <span className="font-extrabold text-emerald-600">+${crypto.settlementDetails?.amount_transferred?.toFixed(2) || '0.00'}</span>
                  </div>
                  {crypto.elapsedTime && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Total Decrypt Time</span>
                      <span className="font-mono text-blue-600 font-bold">{crypto.elapsedTime.toFixed(2)}s</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-center space-x-3 select-none">
                  <button
                    onClick={() => setIsInspectorOpen(true)}
                    className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 px-3 py-1.5 rounded-xl font-bold text-[10px] shadow-sm flex items-center gap-1 transition active:scale-95 duration-200"
                  >
                    <Eye className="h-3.5 w-3.5" /> Audit Cryptography
                  </button>
                  <button
                    onClick={() => setIsPacketOpen(true)}
                    disabled={!crypto.packetData}
                    className="bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-40 text-slate-600 px-3 py-1.5 rounded-xl font-bold text-[10px] shadow-sm flex items-center gap-1 transition active:scale-95 duration-200"
                  >
                    <FileSearch className="h-3.5 w-3.5" /> Inspect Packet
                  </button>
                </div>

                <button
                  onClick={() => {
                    resetTransferState();
                    setScreenB('DASHBOARD');
                  }}
                  className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2 rounded-xl text-xs shadow transition"
                >
                  Return to HDFC Portal
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* ==========================================
          SHARED DIALOGS & OVERLAYS (FULL VIEW)
         ========================================== */}

      {/* 1. Collapsible slide-out Security Inspector Drawer */}
      {isInspectorOpen && (
        <div className="absolute inset-0 bg-slate-900/40 z-50 flex justify-end">
          <div className="flex-1" onClick={() => setIsInspectorOpen(false)} />
          <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col animate-slideLeft">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-extrabold text-xs text-slate-800 tracking-tight uppercase">Live Inter-bank Security Inspector</h3>
              <button
                onClick={() => setIsInspectorOpen(false)}
                className="text-xs font-semibold border border-slate-200 hover:bg-slate-50 text-slate-500 px-3 py-1.5 rounded-lg"
              >
                Close Audit
              </button>
            </div>
            <div className="flex-1 overflow-y-auto min-h-0">
              <SecurityInspector />
            </div>
          </div>
        </div>
      )}

      {/* 2. Wireshark Packet Inspector Modal */}
      {isPacketOpen && (
        <div className="absolute inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-6">
          <div className="w-full max-w-2xl bg-white border border-slate-200 shadow-2xl rounded-2xl h-[520px] flex flex-col overflow-hidden animate-zoomIn">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between select-none">
              <h3 className="font-extrabold text-xs text-slate-800 tracking-tight uppercase">Wireshark Gateway Packet Capture</h3>
              <button
                onClick={() => setIsPacketOpen(false)}
                className="text-xs font-semibold border border-slate-200 hover:bg-slate-50 text-slate-500 px-3 py-1.5 rounded-lg"
              >
                Close Packet
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <PacketInspector />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default function App() {
  return (
    <TransactionProvider>
      <AppContent />
    </TransactionProvider>
  );
}
