from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from ..database import get_db
from ..models import Transaction
from .execution_service import QuantumExecutionService

router = APIRouter(prefix="/api/quantum", tags=["quantum"])

class QuantumRunRequest(BaseModel):
    algorithm: str
    tx_id: int

class DemonstrateRequest(BaseModel):
    tx_id: Optional[int] = None

@router.post("/run")
def run_quantum_simulation(payload: QuantumRunRequest, db: Session = Depends(get_db)):
    """
    POST /api/quantum/run
    Executes the quantum threat simulation on the specific captured transaction (tx_id).
    Queries transaction parameters from the ledger database and passes them to the simulation.
    """
    tx = db.query(Transaction).filter(Transaction.id == payload.tx_id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction record not found in ledger database.")
        
    params = {
        "tx_id": tx.id,
        "sender": f"Alice ({tx.sender_bank})" if tx.sender_bank else "Alice (JPMorgan)",
        "receiver": f"Bob ({tx.receiver_bank})" if tx.receiver_bank else "Bob (HDFC)",
        "amount": f"${tx.amount:.2f}",
        "memo": tx.description or "Inter-bank Transfer",
        "reference_id": f"TX-{tx.id:06d}",
        "timestamp": tx.created_at.strftime("%Y-%m-%d %H:%M:%S") if tx.created_at else "2026-08-06 12:00:00",
        
        # Captured cryptographic artifacts
        "tls_cert_pem": tx.tls_cert_pem,
        "tls_ca_cert_pem": tx.tls_ca_cert_pem,
        "client_dh_public_pem": tx.client_dh_public_pem,
        "server_dh_public_pem": tx.server_dh_public_pem,
        "encrypted_payload_hex": tx.encrypted_payload_hex,
        "nonce_hex": tx.nonce_hex,
        "tag_hex": tx.tag_hex,
        "integrity_hash_hex": tx.integrity_hash_hex,
        "client_signing_public_pem": tx.client_signing_public_pem,
        "signature_hex": tx.signature_hex,
        "security_mode": tx.security_mode
    }
    
    result = QuantumExecutionService.execute_simulation(payload.algorithm, params)
    return result

from .threat_demo_service import ToyQuantumThreatDemoService

@router.post("/demonstrate")
def run_quantum_threat_demonstration(payload: Optional[DemonstrateRequest] = None, db: Session = Depends(get_db)):
    """
    POST /api/quantum/demonstrate
    Executes a genuine, isolated quantum threat demonstration on a toy elliptic curve,
    or handles ML-KEM/hybrid transaction algorithm routing if a tx_id is supplied.
    """
    tx_id = payload.tx_id if payload else None
    result = ToyQuantumThreatDemoService.execute_demonstration(tx_id=tx_id, db=db)
    if not result.get("success", False):
        raise HTTPException(status_code=400, detail=result.get("error", "Demonstration failed."))
    return result

import uuid
from ..services.pqc_service import PqcService

class Bb84SimulateRequest(BaseModel):
    eve_enabled: bool = False
    qubits: int = 128

@router.post("/threat/bb84/simulate")
def simulate_bb84_endpoint(payload: Bb84SimulateRequest):
    if payload.qubits < 1 or payload.qubits > 8192:
        raise HTTPException(status_code=400, detail="Invalid qubit count.")
        
    try:
        res = PqcService.simulate_bb84(num_bits=payload.qubits, noise_rate=0.015, eavesdrop=payload.eve_enabled)
        qber_percent = res["qber"]
        
        matching_indices_str = res.get("matching_indices", "")
        tested_bits = len(matching_indices_str.split(",")) if matching_indices_str else 0
        errors = int(tested_bits * (qber_percent / 100.0))
        intercepted_qubits = payload.qubits if payload.eve_enabled else 0
        
        eavesdropping_detected = qber_percent > 11.0
        
        return {
            "simulation_id": str(uuid.uuid4()),
            "eve_enabled": payload.eve_enabled,
            "total_qubits": payload.qubits,
            "intercepted_qubits": intercepted_qubits,
            "tested_bits": tested_bits,
            "errors": errors,
            "qber": qber_percent,
            "threshold": 0.11,
            "eavesdropping_detected": eavesdropping_detected,
            "key_compromised": eavesdropping_detected
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Simulation failed: {str(e)}")
