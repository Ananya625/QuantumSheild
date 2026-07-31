from pydantic import BaseModel, Field
from typing import Optional, Dict, Any

class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    session_id: str
    username: str
    status: str

class VerifyDeviceRequest(BaseModel):
    session_id: str
    device_id: str

class AuthenticateRequest(BaseModel):
    session_id: str
    password: str

class CreateSessionRequest(BaseModel):
    session_id: str

class TlsHandshakeRequest(BaseModel):
    session_id: str

class KeyExchangeRequest(BaseModel):
    session_id: str
    client_public_key_pem: str

class DeriveSessionKeyRequest(BaseModel):
    session_id: str

class EncryptTransactionRequest(BaseModel):
    session_id: str
    sender: str
    receiver: str
    amount: float
    description: str

class DigitallySignRequest(BaseModel):
    session_id: str

class SendTransactionRequest(BaseModel):
    session_id: str

class VerifySignatureRequest(BaseModel):
    session_id: str

class DecryptTransactionRequest(BaseModel):
    session_id: str

class SettlementRequest(BaseModel):
    session_id: str

class ConfirmationRequest(BaseModel):
    session_id: str

class StandardResponse(BaseModel):
    success: bool
    status: str
    message: str
    data: Optional[Dict[str, Any]] = None

class TransferRequest(BaseModel):
    session_id: str
    sender_account: str
    receiver_account: str
    amount: float
    description: str
