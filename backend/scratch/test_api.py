import http.client
import json

def test_endpoint(algorithm, payload):
    print(f"\nTesting endpoint for algorithm: {algorithm}...")
    conn = http.client.HTTPConnection("localhost", 8000)
    headers = {'Content-Type': 'application/json'}
    conn.request("POST", "/api/quantum/run", json.dumps(payload), headers)
    response = conn.getresponse()
    print(f"Status Code: {response.status}")
    
    data = response.read().decode('utf-8')
    res_json = json.loads(data)
    
    if response.status == 200:
        print("Logs from simulation:")
        for log in res_json.get("logs", []):
            msg = log['message'].encode('ascii', 'replace').decode()
            print(f"  [{log['offset_ms']}ms] {msg}")
            
        print("\nMetadata:")
        print(f"  {res_json.get('metadata')}")
        print("\nKey Recovery:")
        print(f"  {res_json.get('key_recovery')}")
        print("\nDecryption:")
        print(f"  {res_json.get('decryption')}")
        print("\nThreat Assessment Summary:")
        print(f"  {res_json.get('threat_assessment', {}).get('summary')}")
        print("\nThreat Assessment Primitives:")
        for prim in res_json.get('threat_assessment', {}).get('primitives', []):
            print(f"  - {prim['name']}: {prim['status']} -> {prim['reason'][:80]}...")
    else:
        print(f"Error Response: {res_json}")

if __name__ == "__main__":
    try:
        import sys
        import os
        sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
        from app.database import SessionLocal
        from app.models import Transaction
        db = SessionLocal()
        tx = db.query(Transaction).order_by(Transaction.id.desc()).first()
        tx_id = tx.id if tx else 1
        db.close()
        test_endpoint("shor", {"algorithm": "shor", "tx_id": tx_id})
        
        # Test demonstrate endpoint
        print("\nTesting endpoint /api/quantum/demonstrate...")
        conn = http.client.HTTPConnection("localhost", 8000)
        conn.request("POST", "/api/quantum/demonstrate", "")
        resp = conn.getresponse()
        print(f"Status Code: {resp.status}")
        resp_data = resp.read().decode('utf-8')
        resp_json = json.loads(resp_data)
        if resp.status == 200:
            print("[OK] Demonstration ran successfully!")
            print(f"  Curve: {resp_json.get('curve', {}).get('equation')}")
            print(f"  Recovered Scalar: {resp_json.get('attack', {}).get('recovered_scalar')}")
            print(f"  Decrypted Plaintext: {resp_json.get('decryption', {}).get('plaintext')}")
        else:
            print(f"[FAIL] Demonstrate API error: {resp_json}")
            
    except Exception as e:
        print(f"Error testing API: {e}")
        # Fall back to 1
        test_endpoint("shor", {"algorithm": "shor", "tx_id": 1})
