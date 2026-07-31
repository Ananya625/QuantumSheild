import React, { useState } from 'react';
import { TransactionProvider, useTransaction } from './context/TransactionContext';
import { BankingDashboard } from './components/BankingDashboard';
import { TransferForm } from './components/TransferForm';
import { TransactionPipeline } from './components/TransactionPipeline';
import { SecurityInspector } from './components/SecurityInspector';
import { PacketInspector } from './components/PacketInspector';
import { LiveTimeline } from './components/LiveTimeline';
import { 
  Lock, User, ShieldCheck, CheckCircle2, 
  XCircle, AlertCircle, FileSearch, RefreshCw, Eye
} from 'lucide-react';

function AppContent() {
  const { 
    screen, setScreen, login, activeTxId,
    pipelineStatus, errorMessage, resetTransferState, crypto
  } = useTransaction();

  // Local Login state
  const [selectedUser, setSelectedUser] = useState<'Alice' | 'Bob'>('Alice');
  const [loginPass, setLoginPass] = useState('password123');
  const [loginError, setLoginError] = useState<string | null>(null);

  // Inspector panel toggles
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [isPacketOpen, setIsPacketOpen] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    if (loginPass !== 'password123') {
      setLoginError('Incorrect password. Use `password123` for this demo.');
      return;
    }
    const ok = await login(selectedUser);
    if (!ok) {
      setLoginError('Authentication service failed.');
    }
  };

  // ==========================================
  // SCREEN 1: LOGIN VIEW
  // ==========================================
  if (screen === 'LOGIN') {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6 font-sans select-none">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-premium p-8 text-center space-y-6">
          <div className="flex flex-col items-center space-y-2">
            <div className="bg-blue-600 text-white p-3 rounded-2xl shadow-md shadow-blue-500/10">
              <ShieldCheck className="h-8 w-8" />
            </div>
            <h1 className="font-extrabold text-2xl text-slate-900 tracking-tight">Quantum Trust Portal</h1>
            <p className="text-xs text-slate-500 font-medium">Please authenticate to access retail banking services</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4 text-left">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Username</label>
              <div className="relative">
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value as 'Alice' | 'Bob')}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium appearance-none transition"
                >
                  <option value="Alice">Alice (Primary Account)</option>
                  <option value="Bob">Bob (Secondary Account)</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-slate-400">
                  <User className="h-4 w-4" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Password</label>
              <input
                type="password"
                value={loginPass}
                onChange={(e) => setLoginPass(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium transition"
                placeholder="********"
              />
            </div>

            {loginError && (
              <div className="bg-rose-50 border border-rose-100 text-rose-700 text-xs px-4 py-2.5 rounded-xl font-medium">
                {loginError}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 transition duration-200 text-center"
            >
              Sign In Securely
            </button>
          </form>

          <div className="pt-4 border-t border-slate-100 text-[10px] text-slate-400 font-medium leading-relaxed">
            <span className="text-slate-500 font-bold block mb-1">Educational Simulator Notice</span>
            This application is a secure demonstration. Cryptographic computations are fully executed in the backend, but accounts and balances represent sandbox seed files.
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // SCREEN 2: ACCOUNT DASHBOARD
  // ==========================================
  if (screen === 'DASHBOARD') {
    return <BankingDashboard />;
  }

  // ==========================================
  // SCREEN 3: TRANSFER INITIATOR FORM
  // ==========================================
  if (screen === 'TRANSFER') {
    return <TransferForm />;
  }

  // ==========================================
  // SCREEN 4: PROCESSING CONSOLE (DOMINANT VIEW)
  // ==========================================
  if (screen === 'PROCESSING') {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans relative overflow-hidden select-none">
        
        {/* Simple Processing Header */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-2.5">
            <RefreshCw className="h-5 w-5 text-blue-600 animate-spin" />
            <h2 className="font-extrabold text-sm text-slate-900 tracking-tight uppercase">Processing Encrypted Fund Routing</h2>
          </div>
          <div className="text-xs bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg border border-slate-200 font-semibold">
            Transaction ID: {activeTxId ? `#TX-${activeTxId}` : 'Allocating...'}
          </div>
        </header>

        <div className="flex-1 max-w-4xl mx-auto w-full px-6 py-10 flex flex-col justify-between space-y-6">
          
          {/* Dominant Center Card */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-premium p-8 text-center space-y-6 flex flex-col items-center justify-center flex-1">
            <div className="relative flex items-center justify-center">
              <div className="animate-ping absolute inline-flex h-16 w-16 rounded-full bg-blue-400/20 opacity-75"></div>
              <div className="relative rounded-2xl bg-blue-50 border border-blue-200 p-4 text-blue-600 shadow-md">
                <Lock className="h-8 w-8 animate-pulse" />
              </div>
            </div>

            <div className="space-y-2 max-w-md">
              <h3 className="font-extrabold text-lg text-slate-800 tracking-tight">Inter-bank Ledger Syncing...</h3>
              <p className="text-xs text-slate-400 font-medium">
                Executing multi-layered packet encryption protocols to secure routing over public internet interfaces.
              </p>
            </div>

            {/* Stepper progress indicator */}
            <div className="w-full border-t border-b border-slate-100 py-6 my-2">
              <TransactionPipeline />
            </div>

            {/* Floating audit controls */}
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setIsInspectorOpen(true)}
                className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 px-4 py-2.5 rounded-xl font-bold text-xs shadow-sm hover:text-slate-800 flex items-center gap-1.5 transition active:scale-95 duration-200"
              >
                <Eye className="h-4 w-4" />
                Audit Cryptography
              </button>
              
              <button
                onClick={() => setIsPacketOpen(true)}
                disabled={!crypto.packetData}
                className="bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-40 text-slate-600 px-4 py-2.5 rounded-xl font-bold text-xs shadow-sm hover:text-slate-800 flex items-center gap-1.5 transition active:scale-95 duration-200"
              >
                <FileSearch className="h-4 w-4" />
                Inspect Packet
              </button>
            </div>
          </div>

          {/* Audit Logging Stepper Terminal at Bottom */}
          <div className="shrink-0 h-[180px]">
            <LiveTimeline />
          </div>

        </div>

        {/* 1. Collapsible slide-out Security Inspector Drawer */}
        {isInspectorOpen && (
          <div className="absolute inset-0 bg-slate-900/40 z-50 flex justify-end">
            {/* Click outside to close */}
            <div className="flex-1" onClick={() => setIsInspectorOpen(false)} />
            <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col animate-slideLeft">
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                <h3 className="font-extrabold text-sm text-slate-800 tracking-tight uppercase">Live Security Inspector</h3>
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
            <div className="w-full max-w-2xl bg-white border border-slate-200 shadow-2xl rounded-2xl h-[550px] flex flex-col overflow-hidden animate-zoomIn">
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between select-none">
                <h3 className="font-extrabold text-sm text-slate-800 tracking-tight uppercase">Wireshark Packet Capture</h3>
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

  // ==========================================
  // SCREEN 5: TRANSACTION RECEIPT (SUCCESS/FAIL)
  // ==========================================
  if (screen === 'RECEIPT') {
    const isSuccess = pipelineStatus === 'COMPLETED';

    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans select-none">
        {/* Simple receipt Header */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 shadow-sm select-none">
          <div className="max-w-xl mx-auto w-full flex items-center justify-between">
            <span className="font-extrabold text-sm tracking-tight text-slate-900">Quantum Trust Receipt</span>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Audit Verified</span>
          </div>
        </header>

        <div className="flex-1 max-w-xl mx-auto w-full px-6 py-12 flex flex-col space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-premium p-8 text-center space-y-6">
            
            {/* Status Icon */}
            <div className="flex flex-col items-center space-y-3">
              {isSuccess ? (
                <>
                  <div className="bg-emerald-50 text-emerald-600 p-4 rounded-full border border-emerald-100 shadow-sm animate-pulse">
                    <CheckCircle2 className="h-10 w-10" />
                  </div>
                  <h2 className="font-extrabold text-xl text-slate-800 tracking-tight">Payment Successfully Routed</h2>
                  <p className="text-xs text-emerald-600 font-bold bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full uppercase tracking-wider">
                    Ledger Settled
                  </p>
                </>
              ) : (
                <>
                  <div className="bg-rose-50 text-rose-600 p-4 rounded-full border border-rose-100 shadow-sm">
                    <XCircle className="h-10 w-10" />
                  </div>
                  <h2 className="font-extrabold text-xl text-slate-800 tracking-tight">Payment Routing Rejected</h2>
                  <p className="text-xs text-rose-600 font-bold bg-rose-50 border border-rose-100 px-3 py-1 rounded-full uppercase tracking-wider">
                    Pipeline Aborted
                  </p>
                </>
              )}
            </div>

            {/* Receipt Parameters Grid */}
            <div className="border-t border-b border-slate-100 py-5 text-xs text-slate-600 space-y-3 font-medium select-text">
              <div className="flex justify-between">
                <span className="text-slate-400">Transaction Reference</span>
                <span className="font-semibold text-slate-800 font-mono">TX-{activeTxId || 'ALLOCATING'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Settled Transfer Amount</span>
                <span className="font-bold text-slate-800 text-sm">${crypto.settlementDetails?.amount_transferred?.toFixed(2) || '0.00'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Debit Account</span>
                <span className="text-slate-700 font-mono">{crypto.settlementDetails?.sender_account || 'Alice (Primary)'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Credit Beneficiary</span>
                <span className="text-slate-700 font-mono">{crypto.settlementDetails?.receiver_account || 'Bob (Secondary)'}</span>
              </div>
              {!isSuccess && errorMessage && (
                <div className="bg-rose-50 border border-rose-100 text-rose-700 p-3 rounded-xl text-left flex items-start gap-2.5">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
                  <span className="font-semibold leading-normal">{errorMessage}</span>
                </div>
              )}
            </div>

            {/* Post-transaction Audit Toggles */}
            {isSuccess && (
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex justify-around select-none">
                <button
                  onClick={() => setIsInspectorOpen(true)}
                  className="flex items-center gap-1 text-slate-600 hover:text-blue-600 font-bold text-xs"
                >
                  <Eye className="h-4 w-4" /> Audit Cryptography
                </button>
                <div className="border-l border-slate-200 h-4" />
                <button
                  onClick={() => setIsPacketOpen(true)}
                  className="flex items-center gap-1 text-slate-600 hover:text-blue-600 font-bold text-xs"
                >
                  <FileSearch className="h-4 w-4" /> Inspect Packet
                </button>
              </div>
            )}

            {/* Action buttons */}
            <div className="pt-2">
              <button
                onClick={() => {
                  resetTransferState();
                  setScreen('DASHBOARD');
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold py-3 px-4 rounded-xl shadow-md transition duration-200 text-center"
              >
                Return to Account Dashboard
              </button>
            </div>

          </div>
        </div>

        {/* Audit drawer (post-transaction) */}
        {isInspectorOpen && (
          <div className="absolute inset-0 bg-slate-900/40 z-50 flex justify-end">
            <div className="flex-1" onClick={() => setIsInspectorOpen(false)} />
            <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col animate-slideLeft">
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                <h3 className="font-extrabold text-sm text-slate-800 tracking-tight uppercase">Cryptography Post-Audit</h3>
                <button
                  onClick={() => setIsInspectorOpen(false)}
                  className="text-xs font-semibold border border-slate-200 hover:bg-slate-50 text-slate-500 px-3 py-1.5 rounded-lg"
                >
                  Close
                </button>
              </div>
              <div className="flex-1 overflow-y-auto min-h-0">
                <SecurityInspector />
              </div>
            </div>
          </div>
        )}

        {/* Capture modal (post-transaction) */}
        {isPacketOpen && (
          <div className="absolute inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-6">
            <div className="w-full max-w-2xl bg-white border border-slate-200 shadow-2xl rounded-2xl h-[550px] flex flex-col overflow-hidden animate-zoomIn">
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                <h3 className="font-extrabold text-sm text-slate-800 tracking-tight uppercase">Packet Capture Post-Audit</h3>
                <button
                  onClick={() => setIsPacketOpen(false)}
                  className="text-xs font-semibold border border-slate-200 hover:bg-slate-50 text-slate-500 px-3 py-1.5 rounded-lg"
                >
                  Close
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

  return null;
}

export default function App() {
  return (
    <TransactionProvider>
      <AppContent />
    </TransactionProvider>
  );
}
