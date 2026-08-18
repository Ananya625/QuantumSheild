import numpy as np
import math
from qiskit import QuantumCircuit, transpile
from qiskit.circuit.library import QFT, UnitaryGate
from qiskit_aer import AerSimulator

def mod_inverse(n, p):
    return pow(n, p - 2, p)

# Construct 9-qubit unitary gate
def get_ecdlp_gate(d, r=5):
    # qubits 0..2: x1
    # qubits 3..5: x2
    # qubits 6..8: y
    dim = 2**9
    matrix = np.zeros((dim, dim))
    for i1 in range(8):
        for i2 in range(8):
            for j in range(8):
                # i1: qubits 0..2
                # i2: qubits 3..5
                # j: qubits 6..8
                src_idx = (j << 6) | (i2 << 3) | i1
                
                # If within valid group order
                if i1 < r and i2 < r:
                    val = (i1 - d * i2) % r
                    if j < r:
                        dest_j = (j + val) % r
                    else:
                        dest_j = j
                else:
                    dest_j = j
                
                dest_idx = (dest_j << 6) | (i2 << 3) | i1
                matrix[dest_idx, src_idx] = 1.0
    return UnitaryGate(matrix, label="U_ecdlp")

def run_simulation():
    d_actual = 3
    r = 5
    
    # Create the initialization state vector for the 6 control qubits
    # 6 qubits -> 64 states
    state_vector = np.zeros(64)
    for i1 in range(r):
        for i2 in range(r):
            idx = (i2 << 3) | i1
            state_vector[idx] = 1.0 / r  # amplitude is 1/r, so prob is 1/r^2 = 1/25
            
    # Check normalization
    assert math.isclose(np.sum(np.abs(state_vector)**2), 1.0)
    
    qc = QuantumCircuit(9, 9)
    
    # Initialize control register (qubits 0..5) to the uniform superposition of only 0..4
    qc.initialize(state_vector, list(range(6)))
    
    # Apply ECDLP evaluation gate
    ec_gate = get_ecdlp_gate(d_actual, r)
    qc.append(ec_gate, list(range(9)))
    
    # Measure target register first to collapse the state
    qc.measure([6, 7, 8], [6, 7, 8])
    
    # Applying Inverse QFT on x1 (0..2) and x2 (3..5)
    qc.append(QFT(3, inverse=True).to_gate(), [0, 1, 2])
    qc.append(QFT(3, inverse=True).to_gate(), [3, 4, 5])
    
    # Measure control registers
    qc.measure(list(range(6)), list(range(6)))
    
    simulator = AerSimulator()
    transpiled = transpile(qc, simulator)
    job = simulator.run(transpiled, shots=1024)
    counts = job.result().get_counts()
    
    print("Top counts:")
    sorted_counts = sorted(counts.items(), key=lambda x: x[1], reverse=True)[:15]
    for binary_str, count in sorted_counts:
        # binary_str has length 9
        # y_target is binary_str[0:3]
        # y2 is binary_str[3:6]
        # y1 is binary_str[6:9]
        y_target = int(binary_str[0:3], 2)
        y2_val = int(binary_str[3:6], 2)
        y1_val = int(binary_str[6:9], 2)
        
        y1_mod = y1_val % r
        y2_mod = y2_val % r
        
        if y1_mod != 0:
            d_recovered = (-y2_mod * mod_inverse(y1_mod, r)) % r
            print(f"Outcome: {binary_str} (y1={y1_val}, y2={y2_val}, target={y_target}) -> d_recovered = {d_recovered} | Count: {count}")
        else:
            print(f"Outcome: {binary_str} (y1={y1_val}, y2={y2_val}, target={y_target}) -> y1 mod 5 is 0. Cannot recover. | Count: {count}")

run_simulation()
