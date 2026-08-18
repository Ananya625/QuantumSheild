import time
import json
import math
import numpy as np
from qiskit import QuantumCircuit, transpile
from qiskit.circuit.library import QFT, UnitaryGate
from qiskit_aer import AerSimulator

from app.services.crypto_service import CryptoService

def mod_inverse(n, p):
    return pow(n, p - 2, p)

class ToyEllipticCurve:
    """
    Classical Weierstrass Elliptic Curve arithmetic: y^2 = x^3 + ax + b mod p
    """
    def __init__(self, a: int, b: int, p: int):
        self.a = a
        self.b = b
        self.p = p
        
    def is_on_curve(self, pt) -> bool:
        if pt is None:
            return True
        x, y = pt
        return (y**2 - (x**3 + self.a * x + self.b)) % self.p == 0
        
    def add(self, p1, p2):
        if p1 is None:
            return p2
        if p2 is None:
            return p1
            
        x1, y1 = p1
        x2, y2 = p2
        
        if x1 == x2 and (y1 + y2) % self.p == 0:
            return None
            
        if p1 != p2:
            num = (y2 - y1) % self.p
            den = (x2 - x1) % self.p
            if den == 0:
                return None
            lam = (num * mod_inverse(den, self.p)) % self.p
        else:
            if y1 == 0:
                return None
            num = (3 * x1**2 + self.a) % self.p
            den = (2 * y1) % self.p
            lam = (num * mod_inverse(den, self.p)) % self.p
            
        x3 = (lam**2 - x1 - x2) % self.p
        y3 = (lam * (x1 - x3) - y1) % self.p
        return (x3, y3)
        
    def multiply(self, pt, k: int):
        if pt is None:
            return None
        k = k % 5  # group order is 5
        if k == 0:
            return None
        res = None
        addend = pt
        while k > 0:
            if k & 1:
                res = self.add(res, addend)
            addend = self.add(addend, addend)
            k >>= 1
        return res

class ToyEcdlpEngine:
    """
    Isolated controlled quantum ECDLP engine using the curve:
    y^2 = x^3 + 3x + 2 mod 5 (Group order r = 5)
    Base point G = (1, 1)
    """
    A = 3
    B = 2
    P = 5
    ORDER = 5
    BASE_POINT = (1, 1)
    
    @classmethod
    def get_curve(cls) -> ToyEllipticCurve:
        return ToyEllipticCurve(cls.A, cls.B, cls.P)
        
    @classmethod
    def get_ecdlp_unitary_matrix(cls, Q) -> np.ndarray:
        """
        Builds the 9-qubit unitary matrix that performs function evaluation:
        (x1, x2, j) -> (x1, x2, (j + (x1 * G + x2 * Q)_index) mod 5)
        This is constructed dynamically using ONLY the public generator G and target public point Q.
        No knowledge of d is utilized in construction.
        """
        curve = cls.get_curve()
        
        # 1. Map all group points (including infinity) to a unique integer index in [0..4]
        # Since r=5, we map G's multiples: k*G -> k (where k in 0..4)
        # 0*G = None -> 0
        # 1*G = (1, 1) -> 1
        # 2*G = (2, 1) -> 2
        # 3*G = (2, 4) -> 3
        # 4*G = (1, 4) -> 4
        point_to_idx = {None: 0}
        for k in range(1, cls.ORDER):
            pt = curve.multiply(cls.BASE_POINT, k)
            point_to_idx[pt] = k
            
        dim = 2**9
        matrix = np.zeros((dim, dim))
        for i1 in range(8):
            for i2 in range(8):
                for j in range(8):
                    src_idx = (j << 6) | (i2 << 3) | i1
                    
                    if i1 < cls.ORDER and i2 < cls.ORDER:
                        # Compute point addition: P = i1 * G + i2 * Q
                        pt_i1 = curve.multiply(cls.BASE_POINT, i1)
                        pt_i2 = curve.multiply(Q, i2)
                        pt_sum = curve.add(pt_i1, pt_i2)
                        
                        # Get point index on [0..4]
                        val = point_to_idx.get(pt_sum, 0)
                        
                        if j < cls.ORDER:
                            dest_j = (j + val) % cls.ORDER
                        else:
                            dest_j = j
                    else:
                        dest_j = j
                        
                    dest_idx = (dest_j << 6) | (i2 << 3) | i1
                    matrix[dest_idx, src_idx] = 1.0
        return matrix

    @classmethod
    def run_quantum_ecdlp(cls, Q) -> dict:
        """
        Runs Shor-style discrete logarithm period-finding using Qiskit Aer to recover d.
        Q is the target public point.
        """
        start_time = time.time()
        curve = cls.get_curve()
        
        # Verify public point is valid
        assert curve.is_on_curve(Q), "Public point Q must lie on the toy curve!"
        if Q is None:
            raise ValueError("Public point Q cannot be the point at infinity for ECDLP!")
            
        # 2. Build Qiskit Quantum Circuit
        # We use 9 qubits (0..2 for x1, 3..5 for x2, 6..8 for target y)
        qc = QuantumCircuit(9, 9)
        
        # Initialize control registers (0..5) to a uniform superposition of only 0..4
        state_vector = np.zeros(64)
        for i1 in range(cls.ORDER):
            for i2 in range(cls.ORDER):
                idx = (i2 << 3) | i1
                state_vector[idx] = 1.0 / cls.ORDER
        qc.initialize(state_vector, list(range(6)))
        
        # Append unitary gate
        u_matrix = cls.get_ecdlp_unitary_matrix(Q)
        u_gate = UnitaryGate(u_matrix, label="U_ecdlp")
        qc.append(u_gate, list(range(9)))
        
        # Measure target register first to project the state
        qc.measure([6, 7, 8], [6, 7, 8])
        
        # Apply Inverse QFT on x1 and x2
        qc.append(QFT(3, inverse=True).to_gate(), [0, 1, 2])
        qc.append(QFT(3, inverse=True).to_gate(), [3, 4, 5])
        
        # Measure control registers
        qc.measure(list(range(6)), list(range(6)))
        
        # 3. Simulate using AerSimulator
        simulator = AerSimulator()
        transpiled_qc = transpile(qc, simulator)
        
        shots = 1024
        job = simulator.run(transpiled_qc, shots=shots)
        result = job.result()
        counts = result.get_counts()
        
        # 4. Post-process counts to find the d candidate
        # Sort outcomes in descending order of frequency
        sorted_counts = sorted(counts.items(), key=lambda item: item[1], reverse=True)
        
        recovered_scalar = None
        success = False
        
        for binary_outcome, count in sorted_counts:
            # binary_outcome is a 9-bit string: y_target(6..8), y2(3..5), y1(0..2)
            # Parse right-to-left
            y1_val = int(binary_outcome[6:9], 2)
            y2_val = int(binary_outcome[3:6], 2)
            
            y1_mod = y1_val % cls.ORDER
            y2_mod = y2_val % cls.ORDER
            
            if y1_mod == 0:
                continue
                
            # Candidate d: d_cand = (-y2 * y1^-1) mod 5
            try:
                inv_y1 = mod_inverse(y1_mod, cls.ORDER)
                d_cand = (-y2_mod * inv_y1) % cls.ORDER
                
                # Verify candidates against public point Q
                if curve.multiply(cls.BASE_POINT, d_cand) == Q:
                    recovered_scalar = d_cand
                    success = True
                    break
            except Exception:
                continue
                
        execution_time = time.time() - start_time
        
        return {
            "success": success,
            "curve_p": cls.P,
            "curve_a": cls.A,
            "curve_b": cls.B,
            "base_point": cls.BASE_POINT,
            "public_point": Q,
            "order": cls.ORDER,
            "qubits": 9,
            "shots": shots,
            "depth": transpiled_qc.depth(),
            "counts": counts,
            "recovered_scalar": recovered_scalar,
            "execution_time_sec": execution_time
        }
