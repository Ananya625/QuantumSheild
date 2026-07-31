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
}

// Router screens for icici/hdfc-style shell
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
  screen: AppScreen;
  setScreen: (scr: AppScreen) => void;
  sessionId: string | null;
  username: string | null;
  accountNumber: string | null;
  balance: number;
  history: TransactionHistoryItem[];
  
  // Active transfer state
  activeTxId: number | null;
  pipelineStatus: PipelineStatus;
  logs: LogEntry[];
  crypto: CryptoState;
  errorMessage: string | null;
  
  // Actions
  login: (username: string) => Promise<boolean>;
  logout: () => void;
  initiateTransfer: (beneficiaryAcct: string, amount: number, description: string) => Promise<void>;
  fetchAccountData: () => Promise<void>;
  resetTransferState: () => void;
}

const TransactionContext = createContext<TransactionContextType | undefined>(undefined);

export const TransactionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [screen, setScreen] = useState<AppScreen>('LOGIN');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [accountNumber, setAccountNumber] = useState<string | null>(null);
  const [balance, setBalance] = useState<number>(5000);
  const [history, setHistory] = useState<TransactionHistoryItem[]>([]);
  
  // Processing States
  const [activeTxId, setActiveTxId] = useState<number | null>(null);
  const [pipelineStatus, setPipelineStatus] = useState<PipelineStatus>('PENDING');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [crypto, setCrypto] = useState<CryptoState>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);

  // Close websocket on unmount
  useEffect(() => {
    return () => {
      if (ws) ws.close();
    };
  }, [ws]);

  const fetchAccountData = useCallback(async () => {
    if (!username) return;
    try {
      // 1. Fetch balances
      const accsRes = await api.getAccounts();
      const userAcc = accsRes.data.find((a: any) => a.owner_name === username);
      if (userAcc) {
        setAccountNumber(userAcc.account_number);
        setBalance(userAcc.balance);
        
        // 2. Fetch history
        const histRes = await api.getTransactionHistory(userAcc.account_number);
        setHistory(histRes.data);
      }
    } catch (e) {
      console.error("Error fetching account logs:", e);
    }
  }, [username]);

  const login = async (user: string): Promise<boolean> => {
    try {
      const res = await api.login({ username: user, password: 'password123' });
      setSessionId(res.data.session_id);
      setUsername(user);
      
      // Seed initial local details
      const accsRes = await api.getAccounts();
      const userAcc = accsRes.data.find((a: any) => a.owner_name === user);
      if (userAcc) {
        setAccountNumber(userAcc.account_number);
        setBalance(userAcc.balance);
      }
      
      setScreen('DASHBOARD');
      return true;
    } catch (e) {
      console.error("Login call failed:", e);
      return false;
    }
  };

  const logout = () => {
    setSessionId(null);
    setUsername(null);
    setAccountNumber(null);
    setBalance(5000);
    setHistory([]);
    resetTransferState();
    setScreen('LOGIN');
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
  }, [ws]);

  const initiateTransfer = async (beneficiaryAcct: string, amount: number, description: string) => {
    if (!sessionId || !accountNumber) return;
    
    resetTransferState();
    setScreen('PROCESSING');
    setPipelineStatus('PENDING');
    
    try {
      // 1. Initiate transfer REST call
      const payload: TransferPayload = {
        session_id: sessionId,
        sender_account: accountNumber,
        receiver_account: beneficiaryAcct,
        amount,
        description
      };
      
      const res = await api.transfer(payload);
      const txId = res.data.transaction_id;
      setActiveTxId(txId);
      
      // 2. Connect WebSocket to follow the background thread
      const socket = new WebSocket(`ws://localhost:8000/ws/transaction/${sessionId}`);
      setWs(socket);
      
      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          
          // Append timeline log entries
          setLogs((prev) => [...prev, {
            event: payload.event,
            timestamp: payload.timestamp,
            message: payload.message,
            data: payload.data
          }]);
          
          // Parse status from backend pipeline updates
          if (payload.event === 'AUTH_VERIFYING') {
            setPipelineStatus('AUTHENTICATING');
          } else if (payload.event === 'AUTH_SUCCESS') {
            setPipelineStatus('TLS_HANDSHAKE'); // advance to TLS handshake
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
            // Update local balance immediately
            if (username === 'Alice') {
              setBalance(payload.data.sender_new_balance);
            } else {
              setBalance(payload.data.receiver_new_balance);
            }
          } else if (payload.event === 'TRANSACTION_SUCCESS') {
            setPipelineStatus('COMPLETED');
            setScreen('RECEIPT');
          } else if (payload.event === 'PIPELINE_FAILED') {
            setPipelineStatus('FAILED');
            setErrorMessage(payload.message);
            setScreen('RECEIPT');
          }
        } catch (error) {
          console.error("Error decoding websocket broadcast:", error);
        }
      };

      socket.onerror = (e) => {
        console.error("WebSocket socket error:", e);
      };
      
    } catch (err: any) {
      console.error("Refined transfer failed:", err);
      setPipelineStatus('FAILED');
      setErrorMessage(err.response?.data?.detail || err.message || 'System communication error');
      setScreen('RECEIPT');
    }
  };

  // Sync historical logging on dashboard loads
  useEffect(() => {
    if (screen === 'DASHBOARD') {
      fetchAccountData();
    }
  }, [screen, fetchAccountData]);

  return (
    <TransactionContext.Provider
      value={{
        screen,
        setScreen,
        sessionId,
        username,
        accountNumber,
        balance,
        history,
        activeTxId,
        pipelineStatus,
        logs,
        crypto,
        errorMessage,
        login,
        logout,
        initiateTransfer,
        fetchAccountData,
        resetTransferState,
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
