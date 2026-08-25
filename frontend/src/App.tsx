import React, { useState, useEffect } from 'react';
import { TransactionProvider, useTransaction } from './context/TransactionContext';
import { BankingDashboard } from './components/BankingDashboard';
import { TransferForm } from './components/TransferForm';
import { SecurityInspector } from './components/SecurityInspector';
import { PacketInspector } from './components/PacketInspector';
import { QuantumThreatDemoModal } from './components/QuantumThreatDemoModal';
import { EveTerminalModal } from './components/EveTerminalModal';
import { 
  LayoutDashboard, ArrowRightLeft, Shield, LogOut, Keyboard,
  Lock, Eye, EyeOff, FileSearch, ShieldCheck, CheckCircle2, Activity, ShieldAlert, X, Check
} from 'lucide-react';

function AppContent() {
  const { 
    screenA, setScreenA, screenB, setScreenB,
    loginA, loginB, quickDemoLogin,
    sessionIdA, sessionIdB,
    accountNumberA,
    logs,
    crypto,
    resetTransferState,
    registerUser,
    pipelineStatus,
    isBb84ModalOpen, setIsBb84ModalOpen,
    isEavesdropping,
    bb84SimulationResult, setBb84SimulationResult
  } = useTransaction();

  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    if (bb84SimulationResult) {
      setShowToast(true);
      const timer = setTimeout(() => setShowToast(false), 15000);
      return () => clearTimeout(timer);
    } else {
      setShowToast(false);
    }
  }, [bb84SimulationResult]);

  // Tab controls for inner app shell (A is JPMorgan, B is HDFC)
  const [activeTabA, setActiveTabA] = useState<'dashboard' | 'transfer'>('dashboard');
  const [activeTabB, setActiveTabB] = useState<'dashboard'>('dashboard');

  // Global Portal Switcher (JPMorgan tab vs HDFC tab)
  const [activePortalTab, setActivePortalTab] = useState<'jpmorgan' | 'hdfc'>('jpmorgan');

  // Sync activeTabA/B states with screens (for flow routing redirects)
  useEffect(() => {
    if (screenA === 'TRANSFER') {
      setActiveTabA('transfer');
    } else if (screenA === 'DASHBOARD') {
      setActiveTabA('dashboard');
    }
  }, [screenA]);

  // Local login form states
  const [selectedUserA, setSelectedUserA] = useState<'Alice' | 'Bob'>('Alice');
  const [passA, setPassA] = useState('password123');
  const [showPassA, setShowPassA] = useState(false);
  const [loginMethodA, setLoginMethodA] = useState<'id' | 'card'>('id');
  const [errA, setErrA] = useState<string | null>(null);

  const [selectedUserB, setSelectedUserB] = useState<'Alice' | 'Bob'>('Bob');
  const [passB, setPassB] = useState('password123');
  const [showPassB, setShowPassB] = useState(false);
  const [loginMethodB, setLoginMethodB] = useState<'id' | 'card'>('id');
  const [errB, setErrB] = useState<string | null>(null);

  // User and Device Registration states
  const [isRegisteringA, setIsRegisteringA] = useState(false);
  const [regUsernameA, setRegUsernameA] = useState('Alice');
  const [regAccNumberA, setRegAccNumberA] = useState('123456789');
  const [regBankA, setRegBankA] = useState('JPMorgan');
  const [regDeviceA, setRegDeviceA] = useState("Alice's iPhone (Registered)");
  const [regErrA, setRegErrA] = useState<string | null>(null);
  const [regSuccessA, setRegSuccessA] = useState<string | null>(null);

  const [isRegisteringB, setIsRegisteringB] = useState(false);
  const [regUsernameB, setRegUsernameB] = useState('Bob');
  const [regAccNumberB, setRegAccNumberB] = useState('987654321');
  const [regBankB, setRegBankB] = useState('HDFC');
  const [regDeviceB, setRegDeviceB] = useState("Bob's iPad (Registered)");
  const [regErrB, setRegErrB] = useState<string | null>(null);
  const [regSuccessB, setRegSuccessB] = useState<string | null>(null);

  // Security drawers and modal controls
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [isPacketOpen, setIsPacketOpen] = useState(false);
  const [isQuantumDemoOpen, setIsQuantumDemoOpen] = useState(false);

  // High-precision stopwatch for WebSocket pipeline progress
  const [elapsedTimeSec, setElapsedTimeSec] = useState<number>(0);
  const isProcessing = screenA === 'PROCESSING' || screenB === 'PROCESSING';

  useEffect(() => {
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

  // Login handler overrides
  const handleLoginA = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrA(null);
    if (passA !== 'password123') {
      setErrA('Incorrect passcode credentials.');
      return;
    }
    await loginA(selectedUserA);
  };

  const handleLoginB = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrB(null);
    if (passB !== 'password123') {
      setErrB('Incorrect passcode credentials.');
      return;
    }
    await loginB(selectedUserB);
  };

  // Registration handler overrides
  const handleRegisterA = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegErrA(null);
    setRegSuccessA(null);
    if (!regUsernameA || !regAccNumberA || !regDeviceA) {
      setRegErrA("All fields marked with * are required.");
      return;
    }
    const success = await registerUser(regUsernameA, regAccNumberA, regBankA, regDeviceA);
    if (success) {
      setRegSuccessA("Registration successful! Device authorized.");
      setTimeout(() => {
        setIsRegisteringA(false);
        setRegSuccessA(null);
      }, 2500);
    } else {
      setRegErrA("Registration failed. Username or account may already exist.");
    }
  };

  const handleRegisterB = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegErrB(null);
    setRegSuccessB(null);
    if (!regUsernameB || !regAccNumberB || !regDeviceB) {
      setRegErrB("All fields marked with * are required.");
      return;
    }
    const success = await registerUser(regUsernameB, regAccNumberB, regBankB, regDeviceB);
    if (success) {
      setRegSuccessB("Registration successful! Device authorized.");
      setTimeout(() => {
        setIsRegisteringB(false);
        setRegSuccessB(null);
      }, 2500);
    } else {
      setRegErrB("Registration failed. Username or account may already exist.");
    }
  };

  const handleLogoutA = () => {
    resetTransferState();
    useTransaction().logoutA();
  };

  const handleLogoutB = () => {
    resetTransferState();
    useTransaction().logoutB();
  };

  const showQuickLogin = !sessionIdA || !sessionIdB;

  // Render Horizontal Stepper
  const renderStepperA = () => {
    if (!['TRANSFER', 'PROCESSING', 'RECEIPT'].includes(screenA)) return null;
    
    const steps = [
      { id: 1, label: 'Add Details' },
      { id: 2, label: 'Confirm Details' },
      { id: 3, label: 'Receipt' }
    ];
    
    let currentStep = 1;
    if (screenA === 'PROCESSING') currentStep = 2;
    if (screenA === 'RECEIPT') currentStep = 3;
    
    return (
      <div className="w-full bg-white border-b border-slate-200 py-3 px-6 flex justify-center select-none shrink-0 font-sans">
        <div className="flex items-center space-x-4 max-w-md w-full font-sans">
          {steps.map((s, idx) => {
            const isActive = s.id === currentStep;
            const isCompleted = s.id < currentStep;
            
            return (
              <React.Fragment key={s.id}>
                <div className="flex items-center space-x-1.5 font-sans">
                  <div className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    isActive 
                      ? 'bg-[#98144D] text-white font-extrabold' 
                      : isCompleted 
                      ? 'bg-emerald-600 text-white' 
                      : 'bg-slate-200 text-slate-400'
                  }`}>
                    {s.id}
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${
                    isActive ? 'text-[#98144D]' : 'text-slate-450'
                  }`}>
                    {s.label}
                  </span>
                </div>
                {idx < steps.length - 1 && (
                  <div className="flex-1 h-0.5 bg-slate-200" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans select-none w-full overflow-hidden">
      
      {/* Slim Global Status/Config Strip */}
      <header className="bg-white border-b border-slate-200 px-6 py-2.5 flex items-center justify-between shadow-sm shrink-0">
        <div className="flex items-center space-x-2">
          <div className="bg-[#98144D] text-white p-1 rounded-lg">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <span className="font-extrabold text-xs tracking-tight text-slate-800 uppercase">
            QuantumShield™
          </span>
        </div>
        
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setIsQuantumDemoOpen(true)}
            className="border border-purple-300 hover:bg-purple-50 text-purple-700 px-3 py-1 rounded-lg text-[9px] font-extrabold uppercase tracking-wider transition duration-200 cursor-pointer flex items-center gap-1 shadow-sm font-sans"
          >
            <Activity className="h-3 w-3 text-purple-600 animate-pulse" />
            ⚛ Run Quantum Threat Analysis
          </button>

          {showQuickLogin ? (
            <button
              onClick={quickDemoLogin}
              className="bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition shadow-sm animate-bounce cursor-pointer"
            >
              Quick Seeding Auto Login
            </button>
          ) : (
            <div className="flex items-center space-x-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                WS Channel Link Secure
              </span>
            </div>
          )}
        </div>
      </header>

      {/* Global Tab Switcher (JPMorgan Tab vs HDFC Tab - Styled with expected Crimson/Burgundy Hex #98144D) */}
      <div className="bg-white border-b border-slate-200 flex select-none shrink-0 w-full shadow-sm">
        <button
          onClick={() => setActivePortalTab('jpmorgan')}
          className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 flex items-center justify-center space-x-2 cursor-pointer ${
            activePortalTab === 'jpmorgan'
              ? 'border-[#98144D] text-[#98144D] bg-red-50/10 font-extrabold'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50/50'
          }`}
        >
          <Shield className="h-4 w-4 text-[#98144D]" />
          <span>JPMorgan Internet Banking</span>
          {sessionIdA && (
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 ml-1.5 animate-pulse" />
          )}
        </button>
        
        <button
          onClick={() => setActivePortalTab('hdfc')}
          className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 flex items-center justify-center space-x-2 cursor-pointer relative ${
            activePortalTab === 'hdfc'
              ? 'border-[#98144D] text-[#98144D] bg-red-50/10 font-extrabold'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50/50'
          }`}
        >
          <Shield className="h-4 w-4 text-[#98144D]" />
          <span>HDFC Internet Banking</span>
          {sessionIdB && (
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 ml-1.5 animate-pulse" />
          )}
          {/* Animated wire alert dot */}
          {pipelineStatus !== 'PENDING' && pipelineStatus !== 'COMPLETED' && pipelineStatus !== 'FAILED' && (
            <span className="absolute right-4 h-2 w-2 rounded-full bg-amber-500 animate-ping" />
          )}
        </button>
      </div>

      {/* Workspace Panel Render (Without horizontal pipeline at the top) */}
      <div className="flex-1 flex flex-col min-h-0 w-full overflow-hidden bg-slate-50">
        
        {/* ==========================================
            JPMorgan Tab Workspace
           ========================================== */}
        {activePortalTab === 'jpmorgan' && (
          <div className="flex-1 flex flex-col overflow-y-auto w-full h-full">
            {screenA === 'LOGIN' ? (
              <div className="flex-1 flex items-center justify-center p-6 bg-slate-50">
                <div className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl shadow-md overflow-hidden animate-fadeIn">
                  
                  {/* Curved Brand Header Bar (Axis Style with #98144D) */}
                  <div className="bg-slate-50 border-b border-slate-100 flex items-center justify-between shadow-sm select-none">
                    <div className="bg-[#98144D] text-white rounded-r-full px-5 py-3.5 flex items-center space-x-2 shrink-0">
                      <Shield className="h-5 w-5 text-white" />
                      <span className="font-extrabold text-xs tracking-wider uppercase">JPMorgan</span>
                    </div>
                    <div className="text-[#98144D] font-extrabold text-[10px] pr-4 uppercase tracking-wider font-serif italic">
                      open | INTERNET BANKING
                    </div>
                  </div>
                  
                  <div className="p-6 space-y-5">
                    {isRegisteringA ? (
                      /* User/Device Registration Form */
                      <div className="space-y-4">
                        <div className="text-center space-y-1">
                          <h3 className="text-slate-800 font-bold text-xs uppercase tracking-wider">Device Registration</h3>
                          <p className="text-[9px] text-slate-400">Authorize user accounts & trusted devices in database</p>
                        </div>

                        <form onSubmit={handleRegisterA} className="space-y-3.5">
                          <div>
                            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                              User Login ID <span className="text-[#98144D]">*</span>
                            </label>
                            <input
                              type="text"
                              value={regUsernameA}
                              onChange={(e) => setRegUsernameA(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-850 font-semibold focus:outline-none focus:ring-2 focus:ring-[#98144D]/20"
                              placeholder="e.g. Alice"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                              Home Bank Branch <span className="text-[#98144D]">*</span>
                            </label>
                            <select
                              value={regBankA}
                              onChange={(e) => setRegBankA(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#98144D]/20 appearance-none font-sans"
                            >
                              <option value="JPMorgan">JPMorgan Bank</option>
                              <option value="HDFC">HDFC Bank</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                              Account Number <span className="text-[#98144D]">*</span>
                            </label>
                            <input
                              type="text"
                              value={regAccNumberA}
                              onChange={(e) => setRegAccNumberA(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-850 font-semibold focus:outline-none focus:ring-2 focus:ring-[#98144D]/20"
                              placeholder="e.g. 123456789"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                              Hardware Device ID <span className="text-[#98144D]">*</span>
                            </label>
                            <input
                              type="text"
                              value={regDeviceA}
                              onChange={(e) => setRegDeviceA(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-850 font-semibold focus:outline-none focus:ring-2 focus:ring-[#98144D]/20"
                              placeholder="e.g. Alice's iPhone"
                              required
                            />
                          </div>

                          {regErrA && <div className="bg-rose-50 text-rose-700 text-[10px] p-2 rounded-lg font-bold">{regErrA}</div>}
                          {regSuccessA && <div className="bg-emerald-50 text-emerald-700 text-[10px] p-2 rounded-lg font-bold">{regSuccessA}</div>}

                          <button type="submit" className="w-full bg-[#98144D] hover:bg-[#700d36] text-white font-bold py-2.5 rounded-full text-xs shadow transition">
                            Register User & Device
                          </button>
                        </form>

                        <div className="text-center pt-2">
                          <button
                            onClick={() => setIsRegisteringA(false)}
                            className="text-[10px] text-[#98144D] hover:underline font-bold"
                          >
                            Already have an account? LOGIN HERE
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Axis-style Login View */
                      <div className="space-y-4">
                        <div className="text-center space-y-1">
                          <h3 className="text-slate-850 font-bold text-xs uppercase tracking-wider">Login using</h3>
                        </div>
                        
                        {/* Segmented Toggle */}
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            onClick={() => setLoginMethodA('id')}
                            className={`px-4 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-wider transition-all border ${
                              loginMethodA === 'id' 
                                ? 'bg-[#98144D] text-white border-transparent shadow font-extrabold' 
                                : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            Login ID / Customer ID
                          </button>
                          <button
                            onClick={() => setLoginMethodA('card')}
                            className={`px-4 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-wider transition-all border ${
                              loginMethodA === 'card' 
                                ? 'bg-[#98144D] text-white border-transparent shadow font-extrabold' 
                                : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            Debit Card No.
                          </button>
                        </div>

                        <form onSubmit={handleLoginA} className="space-y-4">
                          <div>
                            <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                              Login ID / Customer ID <span className="text-red-500">*</span>
                            </label>
                            <select
                              value={selectedUserA}
                              onChange={(e) => setSelectedUserA(e.target.value as 'Alice' | 'Bob')}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#98144D]/20 font-semibold appearance-none font-sans"
                            >
                              <option value="Alice">Alice (Primary / JPMorgan)</option>
                            </select>
                            <div className="flex justify-start space-x-2 text-[9px] text-[#98144D] font-semibold mt-1">
                              <a href="#" className="hover:underline">Forgot customer ID</a>
                              <span>|</span>
                              <a href="#" className="hover:underline">Enable login ID</a>
                            </div>
                          </div>

                          <div>
                            <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                              Password <span className="text-red-500">*</span>
                            </label>
                            <div className="relative flex items-center">
                              <input
                                type={showPassA ? "text" : "password"}
                                value={passA}
                                onChange={(e) => setPassA(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-16 py-2 text-xs text-slate-850 focus:outline-none focus:ring-2 focus:ring-[#98144D]/20 font-semibold"
                                placeholder="Enter Password"
                                required
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassA(!showPassA)}
                                className="absolute right-9 text-slate-400 hover:text-slate-650 p-1 cursor-pointer"
                              >
                                {showPassA ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                              <div className="absolute right-2 border-l border-slate-200 pl-2 text-slate-400 hover:text-slate-600 cursor-pointer">
                                <Keyboard className="h-4 w-4 text-[#98144D]" />
                              </div>
                            </div>
                            <div className="text-[9px] text-[#98144D] font-semibold mt-1">
                              <a href="#" className="hover:underline">Forgot password</a>
                            </div>
                          </div>

                          {errA && <div className="bg-rose-50 text-rose-700 text-[10px] p-2 rounded-lg font-bold">{errA}</div>}
                          
                          <button type="submit" className="w-full bg-[#98144D] hover:bg-[#700d36] text-white font-bold py-2.5 rounded-xl text-xs shadow transition cursor-pointer">
                            Login
                          </button>
                        </form>

                        <div className="text-center pt-2 text-[10px] text-slate-500 font-medium">
                          First time user?{' '}
                          <button
                            onClick={() => setIsRegisteringA(true)}
                            className="text-[#98144D] hover:underline font-extrabold uppercase tracking-wide cursor-pointer"
                          >
                            REGISTER HERE
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* JPMorgan App Shell */
              <div className="flex-1 flex flex-row min-h-0 w-full bg-slate-100">
                
                {/* Fixed Left Sidebar (Axis Style) */}
                <aside className="w-16 md:w-36 bg-slate-50 border-r border-slate-200 flex flex-col justify-between py-4 shrink-0 font-sans">
                  <div className="space-y-6">
                    <div className="px-3 flex items-center space-x-1.5 text-[#98144D]">
                      <Shield className="h-4.5 w-4.5" />
                      <span className="hidden md:inline font-extrabold text-[10px] uppercase tracking-wider font-sans">JPMorgan</span>
                    </div>
                    <nav className="flex flex-col space-y-1">
                      <button
                        onClick={() => {
                          if (!isProcessing) {
                            setScreenA('DASHBOARD');
                            setActiveTabA('dashboard');
                          }
                        }}
                        disabled={isProcessing}
                        className={`px-3 py-2.5 flex items-center space-x-2 text-left text-xs font-bold transition-all border-l-4 ${
                          activeTabA === 'dashboard' && screenA === 'DASHBOARD'
                            ? 'border-[#98144D] text-[#98144D] bg-[#98144D]/5 font-extrabold'
                            : 'border-transparent text-slate-450 hover:text-slate-700 hover:bg-slate-100/50 font-semibold'
                        }`}
                      >
                        <LayoutDashboard className="h-4 w-4 shrink-0" />
                        <span className="hidden md:inline">Dashboard</span>
                      </button>
                      <button
                        onClick={() => {
                          if (!isProcessing) {
                            setScreenA('TRANSFER');
                            setActiveTabA('transfer');
                          }
                        }}
                        disabled={isProcessing}
                        className={`px-3 py-2.5 flex items-center space-x-2 text-left text-xs font-bold transition-all border-l-4 ${
                          activeTabA === 'transfer' || screenA === 'TRANSFER' || screenA === 'PROCESSING' || screenA === 'RECEIPT'
                            ? 'border-[#98144D] text-[#98144D] bg-[#98144D]/5 font-extrabold'
                            : 'border-transparent text-slate-450 hover:text-slate-700 hover:bg-slate-100/50 font-semibold'
                        }`}
                      >
                        <ArrowRightLeft className="h-4 w-4 shrink-0" />
                        <span className="hidden md:inline">Payments & Transfers</span>
                      </button>
                      <button
                        onClick={() => setIsInspectorOpen(true)}
                        className="px-3 py-2.5 flex items-center space-x-2 text-left text-xs font-bold transition-all border-l-4 border-transparent text-slate-450 hover:text-slate-700 hover:bg-slate-100/50 font-semibold cursor-pointer"
                      >
                        <Eye className="h-4 w-4 shrink-0" />
                        <span className="hidden md:inline">Audit Records</span>
                      </button>
                    </nav>
                  </div>

                  <div className="px-3">
                    <button
                      onClick={handleLogoutA}
                      disabled={isProcessing}
                      className="w-full flex items-center space-x-2 py-2 text-slate-400 hover:text-rose-700 text-xs font-bold transition disabled:opacity-40"
                    >
                      <LogOut className="h-4 w-4 shrink-0" />
                      <span className="hidden md:inline">Logout</span>
                    </button>
                  </div>
                </aside>

                {/* Central Main Viewport */}
                <div className="flex-1 flex flex-col min-w-0">
                  {/* Top User Bar */}
                  <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shrink-0 select-none">
                    <div>
                      <span className="text-[10px] text-slate-400 font-semibold block leading-none uppercase">JPMorgan Retail Portal</span>
                      <span className="text-xs font-bold text-slate-805">Welcome, Alice</span>
                    </div>
                    <div className="text-right text-[9px] text-slate-400 font-semibold uppercase tracking-wider">
                      Last login: Aug 19, 2026 19:42
                    </div>
                  </div>

                  {/* Flow Stepper Indicator */}
                  {renderStepperA()}

                  {/* Main scrollable body */}
                  <div className="flex-1 overflow-y-auto bg-slate-50 min-h-0">
                    {screenA === 'DASHBOARD' && <BankingDashboard party="A" />}
                    {screenA === 'TRANSFER' && <TransferForm />}
                    {screenA === 'PROCESSING' && (
                      <div className="w-full p-6 select-none flex justify-center">
                        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 max-w-sm w-full text-center space-y-6 animate-zoomIn">
                          <div className="relative flex items-center justify-center">
                            <div className="animate-ping absolute inline-flex h-12 w-12 rounded-full bg-red-400/20 opacity-75"></div>
                            <div className="relative rounded-full bg-red-50 border border-red-200 p-3 text-[#98144D] shadow-sm">
                              <Lock className="h-6 w-6 animate-pulse" />
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <h3 className="font-extrabold text-sm text-slate-800 tracking-tight uppercase">Processing Fund Transfer</h3>
                            <p className="text-[10px] text-slate-400 font-medium leading-normal">
                              Encrypting wire instructions and routing through security protocols...
                            </p>
                          </div>

                          <div className="inline-block px-3 py-1 bg-red-50 border border-red-100 rounded-xl text-[10px] font-bold font-mono text-[#98144D] select-all">
                            Elapsed Time: {elapsedTimeSec.toFixed(2)}s
                          </div>

                          <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl text-[10px] text-slate-600 font-mono text-left max-h-16 overflow-y-auto leading-normal">
                            &gt; {logs[logs.length - 1]?.message || "Starting secure pipeline..."}
                          </div>


                          <div className="flex items-center justify-center space-x-3 select-none pt-2">
                            <button
                              onClick={() => setIsInspectorOpen(true)}
                              className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 px-3 py-1.5 rounded-xl font-bold text-[10px] shadow-sm flex items-center gap-1 transition active:scale-95 duration-200 cursor-pointer"
                            >
                              <Eye className="h-3.5 w-3.5" /> Track Security
                            </button>
                            <button
                              onClick={() => setIsPacketOpen(true)}
                              disabled={!crypto.packetData}
                              className="bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-40 text-slate-600 px-3 py-1.5 rounded-xl font-bold text-[10px] shadow-sm flex items-center gap-1 transition active:scale-95 duration-200 cursor-pointer"
                            >
                              <FileSearch className="h-3.5 w-3.5" /> Inspect Packet
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                    {screenA === 'RECEIPT' && (
                      <div className="w-full p-6 flex flex-col justify-center max-w-sm mx-auto animate-zoomIn">
                        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 text-center space-y-4 w-full animate-zoomIn">
                          <div className="flex flex-col items-center space-y-2 select-none">
                            <div className="bg-emerald-50 text-emerald-600 p-3 rounded-full border border-emerald-100 shadow-sm">
                              <CheckCircle2 className="h-8 w-8" />
                            </div>
                            <h3 className="font-extrabold text-sm text-slate-800 tracking-tight uppercase">Transfer Settled</h3>
                            <span className="text-[8px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Debit Cleared</span>
                          </div>
                          <div className="border-t border-b border-slate-50 py-3 text-[10px] text-slate-600 space-y-2 select-text font-medium text-left">
                            <div className="flex justify-between">
                              <span className="text-slate-400">Debit Institution</span>
                              <span className="font-bold text-slate-800">JPMorgan Bank</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Source Account</span>
                              <span className="font-mono text-slate-700 font-semibold">{accountNumberA}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Dispatched Amount</span>
                              <span className="font-extrabold text-rose-600 font-sans">-${crypto.settlementDetails?.amount_transferred?.toFixed(2) || '0.00'}</span>
                            </div>
                            {crypto.elapsedTime && (
                              <div className="flex justify-between">
                                <span className="text-slate-405">Security Pipeline Duration</span>
                                <span className="font-mono text-[#98144D] font-bold">{crypto.elapsedTime.toFixed(3)}s</span>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center justify-center space-x-3 select-none">
                            <button
                              onClick={() => setIsInspectorOpen(true)}
                              className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 px-3 py-1.5 rounded-xl font-bold text-[10px] shadow-sm flex items-center gap-1 transition active:scale-95 duration-200 cursor-pointer"
                            >
                              <Eye className="h-3.5 w-3.5" /> Audit Cryptography
                            </button>
                            <button
                              onClick={() => setIsPacketOpen(true)}
                              disabled={!crypto.packetData}
                              className="bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-40 text-slate-600 px-3 py-1.5 rounded-xl font-bold text-[10px] shadow-sm flex items-center gap-1 transition active:scale-95 duration-200 cursor-pointer"
                            >
                              <FileSearch className="h-3.5 w-3.5" /> Inspect Packet
                            </button>
                          </div>

                          {/* Security Simulation Result Section */}
                          {bb84SimulationResult && bb84SimulationResult.eavesdropping_detected && (
                            <div className="mt-4 border border-rose-200 bg-rose-50 rounded-xl p-3 text-left animate-zoomIn">
                              <h4 className="text-[10px] text-rose-600 font-extrabold uppercase tracking-wider mb-2">Security Status</h4>
                              <div className="flex items-center gap-2 mb-1 text-rose-700">
                                <ShieldAlert className="h-4 w-4" />
                                <span className="font-bold text-xs uppercase tracking-tight">⚠ Eavesdropping Detected</span>
                              </div>
                              <p className="text-[10px] text-rose-600/80 font-medium">Session automatically recovered through QuantumShield.</p>
                            </div>
                          )}

                          <button
                            onClick={() => {
                              resetTransferState();
                              setScreenA('DASHBOARD');
                            }}
                            className="w-full bg-[#98144D] hover:bg-[#700d36] text-white font-semibold py-2 rounded-xl text-xs shadow transition cursor-pointer"
                          >
                            Return to JPMorgan Portal
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            )}
          </div>
        )}

        {/* ==========================================
            HDFC Tab Workspace
           ========================================== */}
        {activePortalTab === 'hdfc' && (
          <div className="flex-1 flex flex-col overflow-y-auto w-full h-full">
            {screenB === 'LOGIN' ? (
              <div className="flex-1 flex items-center justify-center p-6 bg-slate-50">
                <div className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl shadow-md overflow-hidden animate-fadeIn">
                  
                  {/* Curved Brand Header Bar (Axis Style with #98144D) */}
                  <div className="bg-slate-50 border-b border-slate-100 flex items-center justify-between shadow-sm select-none">
                    <div className="bg-[#98144D] text-white rounded-r-full px-5 py-3.5 flex items-center space-x-2 shrink-0">
                      <Shield className="h-5 w-5 text-white" />
                      <span className="font-extrabold text-xs tracking-wider uppercase">HDFC</span>
                    </div>
                    <div className="text-[#98144D] font-extrabold text-[10px] pr-4 uppercase tracking-wider font-serif italic">
                      open | INTERNET BANKING
                    </div>
                  </div>
                  
                  <div className="p-6 space-y-5">
                    {isRegisteringB ? (
                      /* User/Device Registration Form */
                      <div className="space-y-4">
                        <div className="text-center space-y-1">
                          <h3 className="text-slate-800 font-bold text-xs uppercase tracking-wider">Device Registration</h3>
                          <p className="text-[9px] text-slate-400">Authorize user accounts & trusted devices in database</p>
                        </div>

                        <form onSubmit={handleRegisterB} className="space-y-3.5">
                          <div>
                            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                              User Login ID <span className="text-[#98144D]">*</span>
                            </label>
                            <input
                              type="text"
                              value={regUsernameB}
                              onChange={(e) => setRegUsernameB(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-850 font-semibold focus:outline-none focus:ring-2 focus:ring-[#98144D]/20"
                              placeholder="e.g. Bob"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                              Home Bank Branch <span className="text-[#98144D]">*</span>
                            </label>
                            <select
                              value={regBankB}
                              onChange={(e) => setRegBankB(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#98144D]/20 appearance-none font-sans"
                            >
                              <option value="HDFC">HDFC Bank</option>
                              <option value="JPMorgan">JPMorgan Bank</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                              Account Number <span className="text-[#98144D]">*</span>
                            </label>
                            <input
                              type="text"
                              value={regAccNumberB}
                              onChange={(e) => setRegAccNumberB(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-855 font-semibold focus:outline-none focus:ring-2 focus:ring-[#98144D]/20"
                              placeholder="e.g. 987654321"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                              Hardware Device ID <span className="text-[#98144D]">*</span>
                            </label>
                            <input
                              type="text"
                              value={regDeviceB}
                              onChange={(e) => setRegDeviceB(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-850 font-semibold focus:outline-none focus:ring-2 focus:ring-[#98144D]/20"
                              placeholder="e.g. Bob's iPad"
                              required
                            />
                          </div>

                          {regErrB && <div className="bg-rose-50 text-rose-700 text-[10px] p-2 rounded-lg font-bold">{regErrB}</div>}
                          {regSuccessB && <div className="bg-emerald-50 text-emerald-700 text-[10px] p-2 rounded-lg font-bold">{regSuccessB}</div>}

                          <button type="submit" className="w-full bg-[#98144D] hover:bg-[#700d36] text-white font-bold py-2.5 rounded-full text-xs shadow transition">
                            Register User & Device
                          </button>
                        </form>

                        <div className="text-center pt-2">
                          <button
                            onClick={() => setIsRegisteringB(false)}
                            className="text-[10px] text-[#98144D] hover:underline font-bold"
                          >
                            Already have an account? LOGIN HERE
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Axis-style Login View */
                      <div className="space-y-4 font-sans">
                        <div className="text-center space-y-1">
                          <h3 className="text-slate-800 font-bold text-xs uppercase tracking-wider">Login using</h3>
                        </div>
                        
                        {/* Segmented Toggle */}
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            onClick={() => setLoginMethodB('id')}
                            className={`px-4 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-wider transition-all border ${
                              loginMethodB === 'id' 
                                ? 'bg-[#98144D] text-white border-transparent shadow font-extrabold' 
                                : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            Login ID / Customer ID
                          </button>
                          <button
                            onClick={() => setLoginMethodB('card')}
                            className={`px-4 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-wider transition-all border ${
                              loginMethodB === 'card' 
                                ? 'bg-[#98144D] text-white border-transparent shadow font-extrabold' 
                                : 'bg-white text-slate-505 border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            Debit Card No.
                          </button>
                        </div>

                        <form onSubmit={handleLoginB} className="space-y-4">
                          <div>
                            <label className="block text-[9px] font-bold text-slate-550 uppercase tracking-wider mb-1">
                              Login ID / Customer ID <span className="text-red-500">*</span>
                            </label>
                            <select
                              value={selectedUserB}
                              onChange={(e) => setSelectedUserB(e.target.value as 'Alice' | 'Bob')}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#98144D]/20 font-semibold appearance-none"
                            >
                              <option value="Bob">Bob (Secondary / HDFC)</option>
                            </select>
                            <div className="flex justify-start space-x-2 text-[9px] text-[#98144D] font-semibold mt-1">
                              <a href="#" className="hover:underline">Forgot customer ID</a>
                              <span>|</span>
                              <a href="#" className="hover:underline">Enable login ID</a>
                            </div>
                          </div>

                          <div>
                            <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                              Password <span className="text-red-500">*</span>
                            </label>
                            <div className="relative flex items-center">
                              <input
                                type={showPassB ? "text" : "password"}
                                value={passB}
                                onChange={(e) => setPassB(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-3 pr-16 py-2 text-xs text-slate-850 focus:outline-none focus:ring-2 focus:ring-[#98144D]/20 font-semibold"
                                placeholder="Enter Password"
                                required
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassB(!showPassB)}
                                className="absolute right-9 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                              >
                                {showPassB ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                              <div className="absolute right-2 border-l border-slate-200 pl-2 text-slate-400 hover:text-slate-600 cursor-pointer">
                                <Keyboard className="h-4 w-4 text-[#98144D]" />
                              </div>
                            </div>
                            <div className="text-[9px] text-[#98144D] font-semibold mt-1">
                              <a href="#" className="hover:underline">Forgot password</a>
                            </div>
                          </div>

                          {errB && <div className="bg-rose-50 text-rose-700 text-[10px] p-2 rounded-lg font-bold">{errB}</div>}
                          
                          <button type="submit" className="w-full bg-[#98144D] hover:bg-[#700d36] text-white font-bold py-2.5 rounded-xl text-xs shadow transition cursor-pointer font-sans">
                            Login
                          </button>
                        </form>

                        <div className="text-center pt-2 text-[10px] text-slate-500 font-medium">
                          First time user?{' '}
                          <button
                            onClick={() => setIsRegisteringB(true)}
                            className="text-[#98144D] hover:underline font-extrabold uppercase tracking-wide cursor-pointer"
                          >
                            REGISTER HERE
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* HDFC App Shell */
              <div className="flex-1 flex flex-row min-h-0 w-full bg-slate-100">
                
                {/* Fixed Left Sidebar (Axis Style) */}
                <aside className="w-16 md:w-36 bg-slate-50 border-r border-slate-200 flex flex-col justify-between py-4 shrink-0">
                  <div className="space-y-6">
                    <div className="px-3 flex items-center space-x-1.5 text-[#98144D]">
                      <Shield className="h-4.5 w-4.5" />
                      <span className="hidden md:inline font-extrabold text-[10px] uppercase tracking-wider">HDFC</span>
                    </div>
                    <nav className="flex flex-col space-y-1">
                      <button
                        onClick={() => {
                          if (!isProcessing) {
                            setScreenB('DASHBOARD');
                            setActiveTabB('dashboard');
                          }
                        }}
                        disabled={isProcessing}
                        className={`px-3 py-2.5 flex items-center space-x-2 text-left text-xs font-bold transition-all border-l-4 ${
                          activeTabB === 'dashboard' && screenB === 'DASHBOARD'
                            ? 'border-[#98144D] text-[#98144D] bg-[#98144D]/5 font-extrabold'
                            : 'border-transparent text-slate-450 hover:text-slate-700 hover:bg-slate-100/50 font-semibold'
                        }`}
                      >
                        <LayoutDashboard className="h-4 w-4 shrink-0" />
                        <span className="hidden md:inline">Dashboard</span>
                      </button>
                      <button
                        disabled
                        className="px-3 py-2.5 flex items-center space-x-2 text-left text-xs font-bold transition-all border-l-4 border-transparent text-slate-350 cursor-not-allowed"
                        title="Transfer is configured for sending node only"
                      >
                        <ArrowRightLeft className="h-4 w-4 shrink-0 text-slate-300" />
                        <span className="hidden md:inline text-slate-300 font-semibold">Payments & Transfers</span>
                      </button>
                      <button
                        onClick={() => setIsInspectorOpen(true)}
                        className="px-3 py-2.5 flex items-center space-x-2 text-left text-xs font-bold transition-all border-l-4 border-transparent text-slate-455 hover:text-slate-700 hover:bg-slate-100/50 font-semibold cursor-pointer"
                      >
                        <Eye className="h-4 w-4 shrink-0" />
                        <span className="hidden md:inline">Audit Records</span>
                      </button>
                    </nav>
                  </div>

                  <div className="px-3">
                    <button
                      onClick={handleLogoutB}
                      disabled={isProcessing}
                      className="w-full flex items-center space-x-2 py-2 text-slate-400 hover:text-rose-700 text-xs font-bold transition disabled:opacity-40"
                    >
                      <LogOut className="h-4 w-4 shrink-0" />
                      <span className="hidden md:inline">Logout</span>
                    </button>
                  </div>
                </aside>

                {/* Central Main Viewport */}
                <div className="flex-1 flex flex-col min-w-0">
                  {/* Top User Bar */}
                  <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shrink-0 select-none">
                    <div>
                      <span className="text-[10px] text-slate-400 font-semibold block leading-none uppercase">HDFC Retail Portal</span>
                      <span className="text-xs font-bold text-slate-800">Welcome, Bob</span>
                    </div>
                    <div className="text-right text-[9px] text-slate-400 font-semibold uppercase tracking-wider">
                      Last login: Aug 19, 2026 19:45
                    </div>
                  </div>

                  {/* Main scrollable body */}
                  <div className="flex-1 overflow-y-auto bg-slate-50 min-h-0 font-sans">
                    <BankingDashboard party="B" />
                  </div>
                </div>

              </div>
            )}
          </div>
        )}

      </div>

      {/* ==========================================
          SHARED SECURITY AUDIT & INSPECTOR DRAWER
         ========================================== */}
      {isInspectorOpen && (
        <div className="absolute inset-0 bg-slate-900/40 z-50 flex justify-end font-sans">
          <div className="flex-1" onClick={() => setIsInspectorOpen(false)} />
          <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col animate-slideLeft">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-extrabold text-xs text-slate-800 tracking-tight uppercase">Live Inter-bank Security Inspector</h3>
              <button
                onClick={() => setIsInspectorOpen(false)}
                className="text-xs font-semibold border border-slate-200 hover:bg-slate-50 text-slate-500 px-3 py-1.5 rounded-lg cursor-pointer font-sans"
              >
                Close Audit
              </button>
            </div>
            <div className="flex-1 overflow-y-auto min-h-0 bg-slate-50">
              <SecurityInspector />
            </div>
          </div>
        </div>
      )}

      {/* Quantum Threat Demo Modal */}
      <QuantumThreatDemoModal
        isOpen={isQuantumDemoOpen}
        onClose={() => setIsQuantumDemoOpen(false)}
      />

      {/* Wireshark Packet Inspector Modal */}
      {isPacketOpen && (
        <div className="absolute inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-6 font-sans">
          <div className="w-full max-w-2xl bg-white border border-slate-200 shadow-2xl rounded-2xl h-[520px] flex flex-col overflow-hidden animate-zoomIn">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between select-none">
              <h3 className="font-extrabold text-xs text-slate-800 tracking-tight uppercase">Wireshark Gateway Packet Capture</h3>
              <button
                onClick={() => setIsPacketOpen(false)}
                className="text-xs font-semibold border border-slate-200 hover:bg-slate-50 text-slate-500 px-3 py-1.5 rounded-lg cursor-pointer"
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

      {/* Global BB84 Terminal Modal */}
      <EveTerminalModal 
        isOpen={isBb84ModalOpen}
        onClose={() => setIsBb84ModalOpen(false)}
        eveEnabled={isEavesdropping}
        qubits={128}
      />

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
