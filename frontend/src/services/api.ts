import axios from 'axios';

const API_BASE_URL = 'http://127.0.0.1:8000';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface TransferPayload {
  session_id: string;
  sender_account: string;
  receiver_account: string;
  amount: number;
  description: string;
  security_mode: 'classical' | 'quantumshield';
  eavesdrop?: boolean;
}

export interface ToyCurveInfo {
  name: string;
  equation: string;
  p: number;
  order: number;
  generator: number[];
}

export interface QuantumMetrics {
  engine: string;
  backend: string;
  qubits: number;
  inverse_qft_width: number;
  circuit_depth: number;
  shots: number;
  execution_time_seconds: number;
  measurement_counts: Record<string, number>;
}

export interface AttackDetails {
  target_public_point?: number[];
  recovered_scalar?: number;
  scalar_verification?: boolean;
  algorithm?: string;
  attack_applicability?: string;
  key_recovery?: string;
  status?: string;
}

export interface EcdhVerification {
  shared_secret_reconstruction: boolean;
  shared_secret_verification: boolean;
  shared_secret_x?: number;
  shared_secret_point?: number[];
}

export interface KeyDerivationDetails {
  algorithm: string;
  key_length: number;
  verification: boolean;
  derived_key_hex?: string;
}

export interface DecryptionDetails {
  algorithm: string;
  authentication: string;
  plaintext_recovered: boolean;
  plaintext: {
    sender: string;
    receiver: string;
    amount: number;
    currency: string;
    memo: string;
  };
}

export interface SecurityInterpretation {
  statement: string;
  production_curve: string;
  production_attack_executed: boolean;
}

export interface ToyQuantumThreatDemoResponse {
  success: boolean;
  demo_type?: string;
  curve?: ToyCurveInfo;
  quantum?: QuantumMetrics;
  attack?: AttackDetails;
  ecdh?: EcdhVerification;
  key_derivation?: KeyDerivationDetails;
  decryption?: DecryptionDetails;
  security_interpretation?: SecurityInterpretation;
  error?: string;
  logs?: { message: string; offset_ms: number }[];
}

export const api = {
  login: (data: { username: string; password: string }) => 
    apiClient.post('/api/auth/login', data),
    
  register: (data: { username: string; account_number: string; bank_name: string; device_id: string }) => 
    apiClient.post('/api/auth/register', data),
    
  transfer: (data: TransferPayload) => 
    apiClient.post('/api/transaction/transfer', data),
    
  getTransactionDetails: (txId: number) => 
    apiClient.get(`/api/transaction/details/${txId}`),
    
  getTransactionHistory: (accountNumber: string) => 
    apiClient.get(`/api/transaction/history/${accountNumber}`),
    
  getAccounts: () => 
    apiClient.get('/api/accounts'),
    
  runQuantumSimulation: (algorithm: string, params: object) => 
    apiClient.post('/api/quantum/run', { algorithm, ...params }),

  runQuantumThreatDemonstration: (txId?: number) =>
    apiClient.post<ToyQuantumThreatDemoResponse>('/api/quantum/demonstrate', { tx_id: txId }),

  simulateBb84: (data: { eve_enabled: boolean; qubits: number }) =>
    apiClient.post('/api/quantum/threat/bb84/simulate', data),

  generateCbom: () =>
    apiClient.post('/api/quantum/cbom/generate'),
};

