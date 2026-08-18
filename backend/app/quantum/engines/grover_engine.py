import time
from qiskit import QuantumCircuit, transpile
from qiskit_aer import AerSimulator

class GroverEngine:
    @staticmethod
    def run_grover(target_state: str) -> dict:
        """
        Executes Grover's search algorithm over a 4-qubit symmetric key space.
        
        Args:
            target_state (str): A 4-bit binary string representing the target key state.
            
        Returns:
            dict: The cryptanalysis simulation results including quantum execution metrics and measurements.
        """
        start_time = time.time()
        
        # Validation: ensure target state is a valid 4-bit string
        if not isinstance(target_state, str) or len(target_state) != 4 or not all(c in '01' for c in target_state):
            target_state = "1010"
            
        num_qubits = 4
        iterations = 3 # pi/4 * sqrt(16) = 3.14
        
        # 1. Initialize circuit
        qc = QuantumCircuit(num_qubits)
        
        # 2. Put qubits in superposition
        for i in range(num_qubits):
            qc.h(i)
            
        # Helper function to apply target state oracle
        def apply_oracle(circuit, target):
            # Reverse for Qiskit endianness (qubit 0 is LSB)
            for i, bit in enumerate(reversed(target)):
                if bit == '0':
                    circuit.x(i)
            
            # Apply Multi-Controlled-Z (using H-MCX-H)
            circuit.h(num_qubits - 1)
            circuit.mcx(list(range(num_qubits - 1)), num_qubits - 1)
            circuit.h(num_qubits - 1)
            
            # Undo X gates
            for i, bit in enumerate(reversed(target)):
                if bit == '0':
                    circuit.x(i)
                    
        # Helper function to apply diffuser
        def apply_diffuser(circuit):
            for i in range(num_qubits):
                circuit.h(i)
            for i in range(num_qubits):
                circuit.x(i)
                
            # Multi-Controlled-Z
            circuit.h(num_qubits - 1)
            circuit.mcx(list(range(num_qubits - 1)), num_qubits - 1)
            circuit.h(num_qubits - 1)
            
            for i in range(num_qubits):
                circuit.x(i)
            for i in range(num_qubits):
                circuit.h(i)

        # 3. Apply Oracle and Diffuser iterations
        for _ in range(iterations):
            apply_oracle(qc, target_state)
            apply_diffuser(qc)
            
        # 4. Measure
        qc.measure_all()
        
        # 5. Run simulator
        simulator = AerSimulator()
        transpiled_qc = transpile(qc, simulator)
        
        shots = 1024
        job = simulator.run(transpiled_qc, shots=shots)
        result = job.result()
        counts = result.get_counts()
        
        # 6. Locate target key (highest measurement count)
        located_state = max(counts, key=counts.get)
        success = (located_state == target_state)
        
        execution_time = time.time() - start_time
        
        return {
            "success": success,
            "target": target_state,
            "located": located_state,
            "iterations": iterations,
            "qubits": num_qubits,
            "depth": transpiled_qc.depth(),
            "shots": shots,
            "top_count": counts.get(located_state, 0),
            "counts": counts,
            "execution_time_sec": execution_time
        }
