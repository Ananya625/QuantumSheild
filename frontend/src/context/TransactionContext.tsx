import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import type { TransferPayload } from '../services/api';

export interface LogEntry {
  event: string;
  timestamp: string;
  message: string;
  data?: any;
}

export interface CryptoState {
  clientDhPublicKey?: string;
  serverDhPublicKey?: string;
  sharedSecret?: string;
  sessionKey?: string;
  plaintext?: string;
  ciphertext?: string;
  nonce?: string;
  tag?: string;
  sha256Hash?: string;
  signature?: string;
  signatureR?: string;
  signatureS?: string;
  clientSigningPublicKey?: string;
  tlsServerCert?: string;
  tlsCaCert?: string;
  packetData?: any;
  settlementDetails?: any;
  senderBank?: string;
  receiverBank?: string;
  elapsedTime?: number;
  
  // Phase II - PQC parameters
  securityMode?: 'classical' | 'quantumshield';
  bb84AliceBits?: string;
  bb84AliceBases?: string;
  bb84BobBases?: string;
  bb84Qber?: number;
  bb84Secret?: string;
  mlkemPublicKey?: string;
  mlkemCiphertext?: string;
  mlkemSecret?: string;
  mldsaPublicKey?: string;
  mldsaSignature?: string;
}

export interface QuantumSimulationState {
  algorithm: string | null;
  status: 'idle' | 'running' | 'completed' | 'decrypted' | 'analyzed' | 'failed';
  logs: { message: string; timestamp: string }[];
  result: any;
  assessment: any;
  metadata: any;
  decryption?: any;
  key_recovery?: any;
}

export type AppScreen = 
  | 'LOGIN'
  | 'DASHBOARD'
  | 'TRANSFER'
  | 'PROCESSING'
  | 'RECEIPT';

export type PipelineStatus =
  | 'PENDING'
  | 'AUTHENTICATING'
  | 'TLS_HANDSHAKE'
  | 'TLS_ESTABLISHED'
  | 'KEY_EXCHANGE'
  | 'DERIVING_KEY'
  | 'ENCRYPTING'
  | 'SIGNING'
  | 'TRANSMITTING'
  | 'VERIFYING_SIGNATURE'
  | 'DECRYPTING'
  | 'SETTLING'
  | 'COMPLETED'
  | 'FAILED';

export interface TransactionHistoryItem {
  id: number;
  date: string;
  description: string;
  amount: number;
  type: 'CREDIT' | 'DEBIT';
  other_party: string;
  status: string;
}

interface TransactionContextType {
  // Screen Router States
  screenA: AppScreen;
  setScreenA: (scr: AppScreen) => void;
  screenB: AppScreen;
  setScreenB: (scr: AppScreen) => void;

  // Session A (Bank A - JPMorgan - Sender)
  sessionIdA: string | null;
  usernameA: string | null;
  accountNumberA: string | null;
  balanceA: number;
  historyA: TransactionHistoryItem[];

  // Session B (Bank B - HDFC - Receiver)
  sessionIdB: string | null;
  usernameB: string | null;
  accountNumberB: string | null;
  balanceB: number;
  historyB: TransactionHistoryItem[];
  
  // Shared Active Transfer State
  activeTxId: number | null;
  pipelineStatus: PipelineStatus;
  logs: LogEntry[];
  crypto: CryptoState;
  errorMessage: string | null;
  
  // Security Mode Switch
  securityMode: 'classical' | 'quantumshield';
  setSecurityMode: (mode: 'classical' | 'quantumshield') => void;
  
  // Actions
  loginA: (username: string) => Promise<boolean>;
  logoutA: () => void;
  loginB: (username: string) => Promise<boolean>;
  logoutB: () => void;
  quickDemoLogin: () => Promise<void>;
  initiateTransfer: (amount: number, description: string) => Promise<void>;
  fetchAccountDataA: () => Promise<void>;
  fetchAccountDataB: () => Promise<void>;
  resetTransferState: () => void;
  
  // Quantum Simulation
  activeSimulation: QuantumSimulationState;
  runQuantumSimulation: (algorithm: string, params: object) => Promise<void>;
  decryptCapturedTransaction: () => void;
  analyzeSecurityImpact: () => void;
  resetSimulationState: () => void;
}

const TransactionContext = createContext<TransactionContextType | undefined>(undefined);

export const TransactionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Screen states for dual views
  const [screenA, setScreenA] = useState<AppScreen>('LOGIN');
  const [screenB, setScreenB] = useState<AppScreen>('LOGIN');

  // Party A: JPMorgan (Alice)
  const [sessionIdA, setSessionIdA] = useState<string | null>(null);
  const [usernameA, setUsernameA] = useState<string | null>(null);
  const [accountNumberA, setAccountNumberA] = useState<string | null>(null);
  const [balanceA, setBalanceA] = useState<number>(5000);
  const [historyA, setHistoryA] = useState<TransactionHistoryItem[]>([]);

  // Party B: HDFC (Bob)
  const [sessionIdB, setSessionIdB] = useState<string | null>(null);
  const [usernameB, setUsernameB] = useState<string | null>(null);
  const [accountNumberB, setAccountNumberB] = useState<string | null>(null);
  const [balanceB, setBalanceB] = useState<number>(1000);
  const [historyB, setHistoryB] = useState<TransactionHistoryItem[]>([]);
  
  // Shared Processing Pipeline state
  const [activeTxId, setActiveTxId] = useState<number | null>(null);
  const [pipelineStatus, setPipelineStatus] = useState<PipelineStatus>('PENDING');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [crypto, setCrypto] = useState<CryptoState>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);

  // Security mode: 'classical' or 'quantumshield'
  const [securityMode, setSecurityMode] = useState<'classical' | 'quantumshield'>('classical');

  // Quantum Simulation implementation
  const [activeSimulation, setActiveSimulation] = useState<QuantumSimulationState>({
    algorithm: null,
    status: 'idle',
    logs: [],
    result: null,
    assessment: null,
    metadata: null,
    key_recovery: null
  });

  const simulationTimeoutsRef = React.useRef<any[]>([]);

  const clearSimulationTimeouts = useCallback(() => {
    simulationTimeoutsRef.current.forEach(id => clearTimeout(id));
    simulationTimeoutsRef.current = [];
  }, []);

  const resetSimulationState = useCallback(() => {
    clearSimulationTimeouts();
    setActiveSimulation({
      algorithm: null,
      status: 'idle',
      logs: [],
      result: null,
      assessment: null,
      metadata: null,
      key_recovery: null
    });
  }, [clearSimulationTimeouts]);

  useEffect(() => {
    return () => {
      if (ws) ws.close();
    };
  }, [ws]);

  // Account retrieval routines
  const fetchAccountDataA = useCallback(async () => {
    if (!usernameA) return;
    try {
      const accsRes = await api.getAccounts();
      const userAcc = accsRes.data.find((a: any) => a.owner_name === usernameA);
      if (userAcc) {
        setAccountNumberA(userAcc.account_number);
        setBalanceA(userAcc.balance);
        const histRes = await api.getTransactionHistory(userAcc.account_number);
        setHistoryA(histRes.data);
      }
    } catch (e) {
      console.error("Error fetching JPMorgan ledger logs:", e);
    }
  }, [usernameA]);

  const fetchAccountDataB = useCallback(async () => {
    if (!usernameB) return;
    try {
      const accsRes = await api.getAccounts();
      const userAcc = accsRes.data.find((a: any) => a.owner_name === usernameB);
      if (userAcc) {
        setAccountNumberB(userAcc.account_number);
        setBalanceB(userAcc.balance);
        const histRes = await api.getTransactionHistory(userAcc.account_number);
        setHistoryB(histRes.data);
      }
    } catch (e) {
      console.error("Error fetching HDFC ledger logs:", e);
    }
  }, [usernameB]);

  // Login actions
  const loginA = async (user: string): Promise<boolean> => {
    try {
      const res = await api.login({ username: user, password: 'password123' });
      setSessionIdA(res.data.session_id);
      setUsernameA(user);
      
      const accsRes = await api.getAccounts();
      const userAcc = accsRes.data.find((a: any) => a.owner_name === user);
      if (userAcc) {
        setAccountNumberA(userAcc.account_number);
        setBalanceA(userAcc.balance);
      }
      setScreenA('DASHBOARD');
      return true;
    } catch (e) {
      console.error("JPMorgan Login failed:", e);
      return false;
    }
  };

  const loginB = async (user: string): Promise<boolean> => {
    try {
      const res = await api.login({ username: user, password: 'password123' });
      setSessionIdB(res.data.session_id);
      setUsernameB(user);
      
      const accsRes = await api.getAccounts();
      const userAcc = accsRes.data.find((a: any) => a.owner_name === user);
      if (userAcc) {
        setAccountNumberB(userAcc.account_number);
        setBalanceB(userAcc.balance);
      }
      setScreenB('DASHBOARD');
      return true;
    } catch (e) {
      console.error("HDFC Login failed:", e);
      return false;
    }
  };

  const logoutA = () => {
    setSessionIdA(null);
    setUsernameA(null);
    setAccountNumberA(null);
    setBalanceA(5000);
    setHistoryA([]);
    setScreenA('LOGIN');
  };

  const logoutB = () => {
    setSessionIdB(null);
    setUsernameB(null);
    setAccountNumberB(null);
    setBalanceB(1000);
    setHistoryB([]);
    setScreenB('LOGIN');
  };

  const quickDemoLogin = async () => {
    await loginA('Alice');
    await loginB('Bob');
  };

  const resetTransferState = useCallback(() => {
    if (ws) {
      ws.close();
      setWs(null);
    }
    setActiveTxId(null);
    setPipelineStatus('PENDING');
    setLogs([]);
    setCrypto({});
    setErrorMessage(null);
    resetSimulationState();
  }, [ws, resetSimulationState]);

  const initiateTransfer = async (amount: number, description: string) => {
    if (!sessionIdA || !accountNumberA) return;
    
    resetTransferState();
    
    // Switch both screens to processing
    setScreenA('PROCESSING');
    setScreenB('PROCESSING');
    setPipelineStatus('PENDING');
    
    try {
      const payload: TransferPayload = {
        session_id: sessionIdA,
        sender_account: accountNumberA,
        receiver_account: '987654321', // Bob's HDFC account
        amount,
        description,
        security_mode: securityMode
      };
      
      const res = await api.transfer(payload);
      const txId = res.data.transaction_id;
      setActiveTxId(txId);
      
      // Connect to WebSocket gateway
      const socket = new WebSocket(`ws://localhost:8000/ws/transaction/${sessionIdA}`);
      setWs(socket);
      
      socket.onmessage = async (event) => {
        try {
          const payload = JSON.parse(event.data);
          
          setLogs((prev) => [...prev, {
            event: payload.event,
            timestamp: payload.timestamp,
            message: payload.message,
            data: payload.data
          }]);
          
          // Pipeline status mappings
          if (payload.event === 'AUTH_VERIFYING') {
            setPipelineStatus('AUTHENTICATING');
          } else if (payload.event === 'AUTH_SUCCESS') {
            setPipelineStatus('TLS_HANDSHAKE');
          } else if (payload.event === 'TLS_STARTED') {
            setPipelineStatus('TLS_HANDSHAKE');
          } else if (payload.event === 'TLS_CERT_EXCHANGED') {
            setCrypto((prev) => ({
              ...prev,
              tlsServerCert: payload.data.server_cert,
              tlsCaCert: payload.data.ca_cert
            }));
          } else if (payload.event === 'TLS_ESTABLISHED') {
            setPipelineStatus('TLS_ESTABLISHED');
          } else if (payload.event === 'ECDHE_STARTED') {
            setPipelineStatus('KEY_EXCHANGE');
          } else if (payload.event === 'ECDHE_COMPLETED') {
            setCrypto((prev) => ({
              ...prev,
              clientDhPublicKey: payload.data.client_public_key,
              serverDhPublicKey: payload.data.server_public_key,
              sharedSecret: payload.data.shared_secret
            }));
          } else if (payload.event === 'HKDF_STARTED') {
            setPipelineStatus('DERIVING_KEY');
          } else if (payload.event === 'HKDF_COMPLETED') {
            setCrypto((prev) => ({
              ...prev,
              sessionKey: payload.data.derived_session_key
            }));
          } else if (payload.event === 'ENCRYPT_STARTED') {
            setPipelineStatus('ENCRYPTING');
          } else if (payload.event === 'SHA256_HASHED') {
            setCrypto((prev) => ({
              ...prev,
              plaintext: payload.data.plaintext,
              sha256Hash: payload.data.hash
            }));
          } else if (payload.event === 'AES_ENCRYPTED') {
            setCrypto((prev) => ({
              ...prev,
              ciphertext: payload.data.ciphertext,
              nonce: payload.data.nonce,
              tag: payload.data.tag
            }));
          } else if (payload.event === 'ECDSA_STARTED') {
            setPipelineStatus('SIGNING');
          } else if (payload.event === 'ECDSA_COMPLETED') {
            setCrypto((prev) => ({
              ...prev,
              signature: payload.data.signature,
              signatureR: payload.data.r,
              signatureS: payload.data.s,
              clientSigningPublicKey: payload.data.public_key
            }));
          } else if (payload.event === 'TRANSACTION_SENT') {
            setPipelineStatus('TRANSMITTING');
            setCrypto((prev) => ({
              ...prev,
              packetData: payload.data
            }));
          } else if (payload.event === 'SIGNATURE_VERIFY_STARTED') {
            setPipelineStatus('VERIFYING_SIGNATURE');
          } else if (payload.event === 'SIGNATURE_VERIFIED') {
            setPipelineStatus('DECRYPTING');
          } else if (payload.event === 'TRANSACTION_DECRYPTED') {
            setCrypto((prev) => ({
              ...prev,
              plaintext: payload.data.plaintext
            }));
          } else if (payload.event === 'DECRYPTION_STARTED') {
            setPipelineStatus('DECRYPTING');
          } else if (payload.event === 'SETTLEMENT_STARTED') {
            setPipelineStatus('SETTLING');
          } else if (payload.event === 'TRANSACTION_SETTLED') {
            setCrypto((prev) => ({
              ...prev,
              settlementDetails: payload.data
            }));
            
            // Sync balances immediately
            setBalanceA(payload.data.sender_new_balance);
            setBalanceB(payload.data.receiver_new_balance);
            
          } else if (payload.event === 'TRANSACTION_SUCCESS') {
            setPipelineStatus('COMPLETED');
            
            // Fetch final parameters to ensure full alignment including PQC fields
            try {
              const details = await api.getTransactionDetails(txId);
              setCrypto((prev) => ({
                ...prev,
                senderBank: details.data.sender_bank,
                receiverBank: details.data.receiver_bank,
                elapsedTime: details.data.elapsed_time,
                securityMode: details.data.security_mode,
                tlsServerCert: details.data.tls?.tls_cert,
                tlsCaCert: details.data.tls?.tls_ca_cert,
                clientDhPublicKey: details.data.dh?.client_dh_public,
                serverDhPublicKey: details.data.dh?.server_dh_public,
                sharedSecret: details.data.dh?.shared_secret,
                sessionKey: details.data.session_key,
                ciphertext: details.data.encryption?.ciphertext,
                nonce: details.data.encryption?.nonce,
                tag: details.data.encryption?.tag,
                sha256Hash: details.data.encryption?.hash,
                signature: details.data.signature?.signature_hex,
                clientSigningPublicKey: details.data.signature?.client_signing_key,
                
                // PQC payload parameters
                bb84AliceBits: details.data.bb84?.alice_bits,
                bb84AliceBases: details.data.bb84?.alice_bases,
                bb84BobBases: details.data.bb84?.bob_bases,
                bb84Qber: details.data.bb84?.qber,
                bb84Secret: details.data.bb84?.secret,
                mlkemPublicKey: details.data.mlkem?.public_key,
                mlkemCiphertext: details.data.mlkem?.ciphertext,
                mlkemSecret: details.data.mlkem?.secret,
                mldsaPublicKey: details.data.mldsa?.public_key,
                mldsaSignature: details.data.mldsa?.signature
              }));
            } catch (err) {
              console.error("Error fetching final transaction parameters:", err);
            }
            
            setScreenA('RECEIPT');
            setScreenB('RECEIPT');
            
          } else if (payload.event === 'PIPELINE_FAILED') {
            setPipelineStatus('FAILED');
            setErrorMessage(payload.message);
            
            try {
              const details = await api.getTransactionDetails(txId);
              setCrypto((prev) => ({
                ...prev,
                senderBank: details.data.sender_bank,
                receiverBank: details.data.receiver_bank,
                elapsedTime: details.data.elapsed_time,
                securityMode: details.data.security_mode,
                bb84AliceBits: details.data.bb84?.alice_bits,
                bb84AliceBases: details.data.bb84?.alice_bases,
                bb84BobBases: details.data.bb84?.bob_bases,
                bb84Qber: details.data.bb84?.qber,
                bb84Secret: details.data.bb84?.secret,
                mlkemPublicKey: details.data.mlkem?.public_key,
                mlkemCiphertext: details.data.mlkem?.ciphertext,
                mlkemSecret: details.data.mlkem?.secret,
                mldsaPublicKey: details.data.mldsa?.public_key,
                mldsaSignature: details.data.mldsa?.signature
              }));
            } catch (err) {
              console.error("Error fetching failed transaction parameters:", err);
            }
            
            setScreenA('RECEIPT');
            setScreenB('RECEIPT');
          }
        } catch (error) {
          console.error("Error decoding websocket packet:", error);
        }
      };

      socket.onerror = (e) => {
        console.error("WebSocket routing socket error:", e);
      };
      
    } catch (err: any) {
      console.error("Inter-bank transfer initiation failed:", err);
      setPipelineStatus('FAILED');
      setErrorMessage(err.response?.data?.detail || err.message || 'Inter-bank socket communications abort');
      setScreenA('RECEIPT');
      setScreenB('RECEIPT');
    }
  };

  // Sync log tables on dashboards loading
  useEffect(() => {
    if (screenA === 'DASHBOARD') fetchAccountDataA();
  }, [screenA, fetchAccountDataA]);

  useEffect(() => {
    if (screenB === 'DASHBOARD') fetchAccountDataB();
  }, [screenB, fetchAccountDataB]);



  const runQuantumSimulation = async (algorithm: string, params: object) => {
    clearSimulationTimeouts();
    setActiveSimulation({
      algorithm,
      status: 'running',
      logs: [],
      result: null,
      assessment: null,
      metadata: null
    });
    
    try {
      const res = await api.runQuantumSimulation(algorithm, params);
      const data = res.data;
      
      if (data && data.success) {
        const backendLogs = data.logs || [];
        
        // 1. Playback logs sequentially based on offset_ms
        backendLogs.forEach((log: any) => {
          const timeoutId = window.setTimeout(() => {
            const timeStr = new Date().toLocaleTimeString([], { hour12: false });
            setActiveSimulation(prev => ({
              ...prev,
              logs: [...prev.logs, { message: log.message, timestamp: timeStr }]
            }));
          }, log.offset_ms);
          simulationTimeoutsRef.current.push(timeoutId);
        });
        
        // 2. Schedule completion after last log
        const lastOffset = backendLogs.length > 0 ? backendLogs[backendLogs.length - 1].offset_ms : 1000;
        const completionTimeoutId = window.setTimeout(() => {
          setActiveSimulation(prev => ({
            ...prev,
            status: 'completed',
            result: data.quantum_result,
            assessment: data.threat_assessment,
            metadata: data.metadata,
            decryption: data.decryption,
            key_recovery: data.key_recovery
          }));
        }, lastOffset + 300);
        simulationTimeoutsRef.current.push(completionTimeoutId);
        
      } else {
        setActiveSimulation(prev => ({
          ...prev,
          status: 'failed',
          logs: [{ message: "Error: Quantum simulation execution failed on backend.", timestamp: new Date().toLocaleTimeString([], { hour12: false }) }]
        }));
      }
    } catch (err: any) {
      console.error("Error executing quantum simulation:", err);
      setActiveSimulation(prev => ({
        ...prev,
        status: 'failed',
        logs: [{ message: `Exception: ${err.message || 'Server connection abort'}`, timestamp: new Date().toLocaleTimeString([], { hour12: false }) }]
      }));
    }
  };

  const decryptCapturedTransaction = () => {
    setActiveSimulation(prev => ({
      ...prev,
      status: 'decrypted'
    }));
  };

  const analyzeSecurityImpact = () => {
    setActiveSimulation(prev => ({
      ...prev,
      status: 'analyzed'
    }));
  };



  // Clean up timeouts on unmount
  useEffect(() => {
    return () => clearSimulationTimeouts();
  }, []);

  return (
    <TransactionContext.Provider
      value={{
        screenA,
        setScreenA,
        screenB,
        setScreenB,
        
        sessionIdA,
        usernameA,
        accountNumberA,
        balanceA,
        historyA,
        
        sessionIdB,
        usernameB,
        accountNumberB,
        balanceB,
        historyB,
        
        activeTxId,
        pipelineStatus,
        logs,
        crypto,
        errorMessage,
        
        securityMode,
        setSecurityMode,
        
        loginA,
        logoutA,
        loginB,
        logoutB,
        quickDemoLogin,
        initiateTransfer,
        fetchAccountDataA,
        fetchAccountDataB,
        resetTransferState,
        activeSimulation,
        runQuantumSimulation,
        decryptCapturedTransaction,
        analyzeSecurityImpact,
        resetSimulationState,
      }}
    >
      {children}
    </TransactionContext.Provider>
  );
};

export const useTransaction = () => {
  const context = useContext(TransactionContext);
  if (!context) {
    throw new Error('useTransaction must be used within a TransactionProvider');
  }
  return context;
};
