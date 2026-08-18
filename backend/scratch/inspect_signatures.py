import inspect
import sys
import os

# Adjust path to import app modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.quantum.engines.toy_ecdlp_engine import ToyEcdlpEngine

print("Signatures Verification:")
print("run_quantum_ecdlp signature:", inspect.signature(ToyEcdlpEngine.run_quantum_ecdlp))
print("get_ecdlp_unitary_matrix signature:", inspect.signature(ToyEcdlpEngine.get_ecdlp_unitary_matrix))
