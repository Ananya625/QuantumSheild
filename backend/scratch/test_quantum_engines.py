import sys
import os

# Set Python path to find app module
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.quantum.engines.grover_engine import GroverEngine
from app.quantum.engines.shor_engine import ShorEngine

def test_grover():
    print("========================================")
    print("Testing Grover's 4-Qubit Search Engine...")
    target = "1010"
    res = GroverEngine.run_grover(target)
    print(f"Target State: {res['target']}")
    print(f"Located State: {res['located']}")
    print(f"Success: {res['success']}")
    print(f"Qubits: {res['qubits']}, Iterations: {res['iterations']}")
    print(f"Execution Time: {res['execution_time_sec']:.4f}s")
    print(f"Measurement Counts: {res['counts']}")
    assert res['success'] == True, "Grover search failed to locate target!"
    print("Grover Test passed successfully!")
    print("========================================")

def test_shor():
    print("========================================")
    print("Testing Shor's Factorization Engine...")
    N = 15
    a = 7
    res = ShorEngine.run_shor(N, a)
    print(f"Integer to Factor: {res['N']}")
    print(f"Base a: {res['a']}")
    print(f"Success: {res['success']}")
    print(f"Period found: {res['period']}")
    print(f"Factors: {res['factors']}")
    print(f"Qubits: {res['qubits']}")
    print(f"Execution Time: {res['execution_time_sec']:.4f}s")
    assert res['success'] == True, "Shor factorization failed!"
    assert set(res['factors']) == {3, 5}, f"Factors found: {res['factors']} are incorrect!"
    print("Shor Test passed successfully!")
    print("========================================")

if __name__ == "__main__":
    test_grover()
    test_shor()
    print("All Quantum Engine tests passed successfully!")
