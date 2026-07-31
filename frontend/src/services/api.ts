import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

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
}

export const api = {
  login: (data: { username: string; password: string }) => 
    apiClient.post('/api/auth/login', data),
    
  transfer: (data: TransferPayload) => 
    apiClient.post('/api/transaction/transfer', data),
    
  getTransactionDetails: (txId: number) => 
    apiClient.get(`/api/transaction/details/${txId}`),
    
  getTransactionHistory: (accountNumber: string) => 
    apiClient.get(`/api/transaction/history/${accountNumber}`),
    
  getAccounts: () => 
    apiClient.get('/api/accounts'),
};
