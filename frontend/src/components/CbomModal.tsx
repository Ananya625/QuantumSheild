import React, { useState, useEffect } from 'react';
import { useTransaction } from '../context/TransactionContext';
import { 
  X, Shield, ShieldAlert, FileDown, Play, Pause, RefreshCw, 
  CheckCircle2, Cpu, Database, Network, Lock, Key, FileText
} from 'lucide-react';
import { api } from '../services/api';

interface CbomModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CbomModal: React.FC<CbomModalProps> = ({ isOpen, onClose }) => {
  const { crypto, activeTxId, sessionIdA, pipelineStatus } = useTransaction();
  const [activeTab, setActiveTab] = useState<'inventory' | 'exposure' | 'replay' | 'json'>('inventory');

  // Replay animation state variables
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(-1);

  const isQuantum = crypto.securityMode === 'quantumshield';

  // Live CBOM scanner state
  const [liveCbom, setLiveCbom] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLiveCbom = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.generateCbom();
      setLiveCbom(response.data);
    } catch (err: any) {
      console.error("Error generating live CBOM:", err);
      setError("Failed to run IBM CBOMkit scanner. Ensure scanner is built and active.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLiveCbom();
    }
  }, [isOpen]);

  const getDiscoveredCertificates = () => {
    if (!liveCbom || !liveCbom.components) return [];
    return liveCbom.components.filter((c: any) => 
      c.type === 'certificate' || 
      (c.cryptoProperties && c.cryptoProperties.assetType === 'certificate')
    );
  };

  const getDiscoveredLibraries = () => {
    if (!liveCbom || !liveCbom.components) return [];
    return liveCbom.components.filter((c: any) => 
      c.type === 'library' || c.type === 'framework'
    );
  };

  // Define the 10 stages of cryptographic operations
  const replaySteps = [
    {
      title: "Zero-Trust Authentication",
      desc: "Device MAC integrity verified & interbank session credentials validated.",
      classical: "Credential & Passcode (SHA-256)",
      quantum: "Credential & Passcode (SHA-256)",
      status: "COMPLETED",
      icon: <Lock className="h-4 w-4" />
    },
    {
      title: "TLS Handshake Negotiated",
      desc: "Client-server trust established and X.509 certificate chains exchanged.",
      classical: "TLS 1.3 (ECDHE-ECDSA)",
      quantum: "TLS 1.3 (ECDHE-ECDSA)",
      status: "COMPLETED",
      icon: <Network className="h-4 w-4" />
    },
    {
      title: "Asymmetric Key Agreement",
      desc: "Session key exchange performed over public networks.",
      classical: "Classical ECDHE (SECP256R1)",
      quantum: "BB84 QKD + ML-KEM-768 (Kyber)",
      status: "COMPLETED",
      icon: <Key className="h-4 w-4" />
    },
    {
      title: "Symmetric Key Derivation",
      desc: "HKDF-SHA256 derives 256-bit AES session key from negotiated entropy.",
      classical: "HKDF-SHA256 (ECDHE secret)",
      quantum: "HKDF-SHA256 (BB84 + Kyber)",
      status: "COMPLETED",
      icon: <Cpu className="h-4 w-4" />
    },
    {
      title: "Payload Hashing",
      desc: "High-speed SHA-256 digest created to enforce message integrity.",
      classical: "SHA-256 Hash",
      quantum: "SHA-256 Hash",
      status: "COMPLETED",
      icon: <Database className="h-4 w-4" />
    },
    {
      title: "Symmetric Encryption",
      desc: "Plaintext variables encrypted using session key with authenticated GCM tag.",
      classical: "AES-256-GCM (Classical)",
      quantum: "AES-256-GCM (Kyber-Keyed)",
      status: "COMPLETED",
      icon: <Lock className="h-4 w-4" />
    },
    {
      title: "Digital Signature Generation",
      desc: "Client private key signs hash block to prove transaction authenticity.",
      classical: "ECDSA (SECP256R1)",
      quantum: "ML-DSA-65 (Dilithium)",
      status: "COMPLETED",
      icon: <FileText className="h-4 w-4" />
    },
    {
      title: "Interbank Network Transmission",
      desc: "TCP packet containing ciphertext and signature sent to destination gateway.",
      classical: "HTTPS Transport",
      quantum: "HTTPS (PQC Encapsulated)",
      status: "COMPLETED",
      icon: <Network className="h-4 w-4" />
    },
    {
      title: "Gateway Verification & Decryption",
      desc: "Signature verified, session key computed, and transaction payload decrypted.",
      classical: "ECDSA Verify / AES Decrypt",
      quantum: "ML-DSA Verify / AES Decrypt",
      status: "COMPLETED",
      icon: <Shield className="h-4 w-4" />
    },
    {
      title: "Double-Entry Atomic Settlement",
      desc: "Balances updated in SQL transaction log. Transfer committed.",
      classical: "Ledger Settlement",
      quantum: "Ledger Settlement",
      status: "COMPLETED",
      icon: <CheckCircle2 className="h-4 w-4" />
    }
  ];

  // Auto-replay logic loop
  useEffect(() => {
    let intervalId: number;
    if (isPlaying) {
      if (currentStepIndex >= replaySteps.length - 1) {
        // Loop back or stop
        setIsPlaying(false);
      } else {
        intervalId = window.setInterval(() => {
          setCurrentStepIndex(prev => {
            if (prev >= replaySteps.length - 1) {
              setIsPlaying(false);
              return prev;
            }
            return prev + 1;
          });
        }, 1200);
      }
    }
    return () => clearInterval(intervalId);
  }, [isPlaying, currentStepIndex]);

  if (!isOpen) return null;

  // JSON Export handler
  const handleExportJson = () => {
    const cbom = liveCbom || {
      bomFormat: "CBOM",
      specVersion: "1.0",
      serialNumber: `urn:uuid:${crypto.sharedSecret || crypto.mlkemSecret || 'unknown'}`,
      metadata: {
        timestamp: crypto.timestamp || new Date().toISOString(),
        bankingMode: isQuantum ? 'QuantumShield (Post-Quantum)' : 'Classical Banking',
        sessionId: sessionIdA || 'unknown',
        transactionId: activeTxId || 'unknown',
        status: pipelineStatus
      },
      components: [
        {
          type: "authentication",
          name: "Zero-Trust Device Verification",
          method: "Credential Passcode & Hardware MAC signature validation",
          status: "Active / Verified",
          vulnerability: "None detected"
        },
        {
          type: "transport-security",
          name: "TLS 1.3 Tunnel",
          cipherSuite: "TLS_AES_256_GCM_SHA384",
          vulnerability: isQuantum ? "None (Quantum-Safe)" : "High (Underlying asymmetric handshakes vulnerable to Shor's algorithm)"
        },
        {
          type: "key-exchange",
          name: isQuantum ? "QuantumShield Hybrid Key Exchange" : "Elliptic Curve Diffie-Hellman Ephemeral",
          algorithm: isQuantum ? "BB84 Quantum Key Distribution + ML-KEM-768 (Kyber)" : "ECDHE (SECP256R1)",
          metrics: isQuantum ? {
            qber: `${crypto.bb84Qber?.toFixed(2)}%`,
            alice_bits_sent: "256",
            reconciled_secret_length: `${crypto.bb84Secret ? crypto.bb84Secret.length * 4 : 256} bits`
          } : undefined,
          vulnerability: isQuantum ? "None (Quantum-Safe)" : "Critical (Vulnerable to Shor's Discrete Logarithm Solver; Harvest Now, Decrypt Later Threat)"
        },
        {
          type: "key-derivation",
          name: "HKDF Session Key Derivation",
          algorithm: isQuantum ? "HKDF-SHA256 (Quantum Hybrid combined entropy)" : "HKDF-SHA256",
          vulnerability: "None (Symmetric KDF remains quantum secure)"
        },
        {
          type: "payload-encryption",
          name: "Symmetric Payload Encryption",
          algorithm: "AES-256-GCM (Authenticated)",
          vulnerability: isQuantum ? "None" : "Indirect (Vulnerable to Harvest Now Decrypt Later if session key is compromised)"
        },
        {
          type: "digital-signature",
          name: isQuantum ? "Dilithium Digital Signature" : "Elliptic Curve Digital Signature Algorithm",
          algorithm: isQuantum ? "ML-DSA-65" : "ECDSA (SECP256R1)",
          vulnerability: isQuantum ? "None (Quantum-Safe)" : "High (Vulnerable to forgery using Shor's algorithm on SECP256R1 public key)"
        }
      ]
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(cbom, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `cbom_transaction_${activeTxId || 'unknown'}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // PDF Export handler
  const handleExportPdf = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Popup blocker prevented exporting audit report. Please enable popups.");
      return;
    }

    const timestamp = crypto.timestamp ? new Date(crypto.timestamp).toLocaleString() : new Date().toLocaleString();
    const modeName = isQuantum ? 'QuantumShield Banking' : 'Classical Banking';
    const modeBadge = isQuantum ? 'badge-quantum' : 'badge-classical';

    const certs = getDiscoveredCertificates();
    const certRows = certs.map((c: any) => {
      const props = c.cryptoProperties?.certificateProperties || {};
      return `
        <tr>
          <td><b>${c.name || 'Unknown Certificate'}</b></td>
          <td>Subject: ${props.subjectName || 'N/A'}<br>Issuer: ${props.issuerName || 'N/A'}</td>
          <td>Valid: ${props.notValidBefore?.substring(0,10) || 'N/A'} to ${props.notValidAfter?.substring(0,10) || 'N/A'}</td>
        </tr>
      `;
    }).join('');

    const libs = getDiscoveredLibraries();
    const libRows = libs.map((c: any) => {
      return `
        <tr>
          <td><b>${c.name || 'Unknown Library'}</b></td>
          <td>Type: ${c.type || 'Library'}<br>Supplier: ${c.supplier?.name || 'N/A'}</td>
          <td class="mono">${c.evidence?.occurrences?.[0]?.location || 'Discovered in source'}</td>
        </tr>
      `;
    }).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>CBOM Security Audit Report - Tx #${activeTxId}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #1e293b; background-color: #ffffff; line-height: 1.5; }
            .header-container { border-bottom: 2px solid #cbd5e1; padding-bottom: 20px; margin-bottom: 25px; display: flex; justify-content: space-between; align-items: center; }
            .title { font-size: 26px; font-weight: 800; color: #0f172a; margin: 0; text-transform: uppercase; tracking: -0.025em; }
            .subtitle { font-size: 11px; color: #64748b; margin-top: 4px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
            
            .meta-grid { display: grid; grid-template-cols: 1fr 1fr 1fr; gap: 15px; margin-bottom: 30px; }
            .meta-card { border: 1px solid #e2e8f0; padding: 12px 16px; border-radius: 8px; background-color: #f8fafc; }
            .meta-label { font-size: 9px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
            .meta-value { font-size: 12px; font-weight: 600; color: #0f172a; word-break: break-all; }
            .meta-value.mono { font-family: monospace; font-size: 11px; }

            .section-title { font-size: 14px; font-weight: 800; color: #0f172a; margin-top: 35px; margin-bottom: 12px; border-left: 4px solid ${isQuantum ? '#4f46e5' : '#b91c1c'}; padding-left: 10px; text-transform: uppercase; letter-spacing: 0.05em; }
            
            .badge { display: inline-block; padding: 4px 10px; font-size: 10px; font-weight: 700; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.05em; }
            .badge-quantum { background-color: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }
            .badge-classical { background-color: #fef3c7; color: #b45309; border: 1px solid #fde68a; }
            .badge-vulnerable { background-color: #fee2e2; color: #b91c1c; border: 1px solid #fecaca; }
            .badge-secure { background-color: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }
            
            .table { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 25px; }
            .table th, .table td { border: 1px solid #e2e8f0; padding: 10px 14px; text-align: left; font-size: 11px; }
            .table th { background-color: #f1f5f9; color: #475569; font-weight: 700; text-transform: uppercase; font-size: 9px; letter-spacing: 0.05em; }
            .table td.mono { font-family: monospace; font-size: 10px; color: #334155; }

            .exposure-box { border-radius: 8px; padding: 16px; margin-bottom: 25px; border: 1px solid #e2e8f0; }
            .exposure-box.vulnerable { background-color: #fffafb; border-color: #fca5a5; }
            .exposure-box.secure { background-color: #fcfdfc; border-color: #86efac; }
            .exposure-box-title { font-size: 12px; font-weight: bold; margin-bottom: 8px; display: flex; align-items: center; gap: 6px; }
            .exposure-box-title.vulnerable { color: #b91c1c; }
            .exposure-box-title.secure { color: #15803d; }
            .exposure-box-desc { font-size: 11px; color: #475569; }

            .bullet-list { margin: 8px 0 0 16px; padding: 0; }
            .bullet-list li { font-size: 11px; margin-bottom: 4px; color: #475569; }

            .footer { margin-top: 60px; font-size: 9px; color: #94a3b8; text-align: center; border-top: 1px solid #cbd5e1; padding-top: 15px; text-transform: uppercase; letter-spacing: 0.05em; }
          </style>
        </head>
        <body>
          <div class="header-container">
            <div>
              <h1 class="title">Cryptographic Bill of Materials</h1>
              <div class="subtitle">Live Ledger Transaction Verification Receipt</div>
            </div>
            <span class="badge ${modeBadge}">${modeName}</span>
          </div>

          <div class="meta-grid">
            <div class="meta-card">
              <div class="meta-label">Transaction ID</div>
              <div class="meta-value mono">#${activeTxId || 'unknown'}</div>
            </div>
            <div class="meta-card">
              <div class="meta-label">Audit Timestamp</div>
              <div class="meta-value">${timestamp}</div>
            </div>
            <div class="meta-card">
              <div class="meta-label">Interbank Session Key ID</div>
              <div class="meta-value mono">${crypto.sharedSecret || crypto.mlkemSecret || 'N/A'}</div>
            </div>
          </div>

          <h2 class="section-title">Cryptographic Asset Inventory</h2>
          <table class="table">
            <thead>
              <tr>
                <th style="width: 25%">Asset Domain</th>
                <th style="width: 45%">Algorithm & Specifications</th>
                <th style="width: 30%">Post-Quantum Security Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><b>Session Transport</b></td>
                <td>TLS 1.3 / Cipher: TLS_AES_256_GCM_SHA384</td>
                <td><span class="badge ${isQuantum ? 'badge-secure' : 'badge-vulnerable'}">${isQuantum ? 'Quantum-Secure' : 'VULNERABLE HANDSHAKE'}</span></td>
              </tr>
              <tr>
                <td><b>Key Exchange / Agreement</b></td>
                <td class="mono">${isQuantum ? `BB84 QKD + ML-KEM-768 (QBER: ${crypto.bb84Qber?.toFixed(2)}%)` : 'ECDHE Ephemeral (SECP256R1)'}</td>
                <td><span class="badge ${isQuantum ? 'badge-secure' : 'badge-vulnerable'}">${isQuantum ? 'Quantum-Secure' : 'CRITICAL SHOR RISK'}</span></td>
              </tr>
              <tr>
                <td><b>Symmetric Key Derivation</b></td>
                <td>HKDF-SHA256 (HMAC-based Key Derivation)</td>
                <td><span class="badge badge-secure">Secure (Symmetric Hash)</span></td>
              </tr>
              <tr>
                <td><b>Payload Encryption</b></td>
                <td>AES-256-GCM (Galois/Counter Mode Authenticated)</td>
                <td><span class="badge ${isQuantum ? 'badge-secure' : 'badge-classical'}">${isQuantum ? 'Quantum-Secure' : 'EXPOSED BY KEY EXCHANGE'}</span></td>
              </tr>
              <tr>
                <td><b>Digital Signatures</b></td>
                <td class="mono">${isQuantum ? 'ML-DSA-65 (Post-Quantum Dilithium)' : 'ECDSA (SECP256R1)'}</td>
                <td><span class="badge ${isQuantum ? 'badge-secure' : 'badge-vulnerable'}">${isQuantum ? 'Quantum-Secure' : 'CRITICAL SHOR RISK'}</span></td>
              </tr>
            </tbody>
          </table>

          <h2 class="section-title">IBM CBOMkit Discovered Certificates</h2>
          <table class="table">
            <thead>
              <tr>
                <th style="width: 30%">Certificate Name</th>
                <th style="width: 40%">Subject & Issuer</th>
                <th style="width: 30%">Validity Period</th>
              </tr>
            </thead>
            <tbody>
              ${certRows || '<tr><td colspan="3" style="text-align: center; color: #64748b;">No certificates discovered in repository scan</td></tr>'}
            </tbody>
          </table>

          <h2 class="section-title">IBM CBOMkit Discovered Libraries</h2>
          <table class="table">
            <thead>
              <tr>
                <th style="width: 30%">Library / Component Name</th>
                <th style="width: 35%">Metadata & Origin</th>
                <th style="width: 35%">Discovery Location</th>
              </tr>
            </thead>
            <tbody>
              ${libRows || '<tr><td colspan="3" style="text-align: center; color: #64748b;">No libraries discovered in repository scan</td></tr>'}
            </tbody>
          </table>

          <h2 class="section-title">Quantum Threat Exposure Analysis</h2>
          ${!isQuantum ? `
            <div class="exposure-box vulnerable">
              <div class="exposure-box-title vulnerable">
                ⚠️ Quantum Vulnerabilities Detected (Shor's Algorithm Threat)
              </div>
              <div class="exposure-box-desc">
                This transaction was completed using classical elliptic-curve algorithms. It possesses the following severe security vulnerabilities:
                <ul class="bullet-list">
                  <li><b>Shor's Algorithm Susceptibility:</b> Asymmetric algorithms (ECDHE and ECDSA) use mathematical problems (discrete logarithms) that are trivial to solve on a quantum computer of sufficient size.</li>
                  <li><b>Harvest Now, Decrypt Later Threat:</b> Adversaries can capture and archive the encrypted session payloads today, and decrypt them retroactively once quantum hardware is capable of cracking the ECDHE shared secret.</li>
                  <li><b>Symmetric AES Resilience:</b> The AES-256-GCM payload encryption remains mathematically secure (Grover's algorithm only reduces the effective search space to 128-bits), but confidentiality is nullified due to the key exchange vulnerability.</li>
                </ul>
              </div>
            </div>
          ` : `
            <div class="exposure-box secure">
              <div class="exposure-box-title secure">
                🛡️ Post-Quantum Certified (QuantumShield Mode Active)
              </div>
              <div class="exposure-box-desc">
                This transaction was completed under full post-quantum cryptographic protection:
                <ul class="bullet-list">
                  <li><b>BB84 QKD Simulation:</b> Secures key distribution physically through light/qubit polarization states, making it impossible to tap or copy keys without causing measurable error rates (QBER).</li>
                  <li><b>ML-KEM-768 Active:</b> Fully Kyber-based post-quantum key encapsulation protects session derivation against Shor's discrete logarithm solvers.</li>
                  <li><b>ML-DSA-65 Active:</b> Dilithium signatures provide mathematical proof of integrity that cannot be forged, shielding interbank transactions from quantum interception.</li>
                </ul>
              </div>
            </div>
          `}

          <h2 class="section-title">Cryptographic Execution Log</h2>
          <table class="table">
            <thead>
              <tr>
                <th style="width: 10%">Step</th>
                <th style="width: 40%">Cryptographic Operation</th>
                <th style="width: 30%">Algorithm Utilized</th>
                <th style="width: 20%">Status</th>
              </tr>
            </thead>
            <tbody>
              ${replaySteps.map((step, idx) => `
                <tr>
                  <td>#${idx + 1}</td>
                  <td><b>${step.title}</b><br/><span style="color:#64748b; font-size:10px">${step.desc}</span></td>
                  <td class="mono">${isQuantum ? step.quantum : step.classical}</td>
                  <td><span class="badge badge-secure">${step.status}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="footer">
            QuantumShield Core Banking Security Infrastructure • Transaction CBOM Audit Report
          </div>

          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-sans select-none animate-fadeIn">
      <div className="w-full max-w-3xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[650px] animate-zoomIn">
        
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center space-x-3">
            <div className={`p-2.5 rounded-2xl ${isQuantum ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-800 tracking-tight uppercase">Live Cryptographic Bill of Materials (CBOM)</h3>
              <p className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase mt-0.5">
                Session Audit ID: <span className="font-mono text-slate-500 font-bold normal-case">{crypto.sharedSecret?.substring(0, 16) || crypto.mlkemSecret?.substring(0, 16) || sessionIdA || 'N/A'}...</span>
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-xl transition duration-200 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
          <div className="flex space-x-1.5 py-2">
            {[
              { id: 'inventory', label: 'Asset Inventory', icon: <Database className="h-3.5 w-3.5" /> },
              { id: 'exposure', label: 'Quantum Exposure', icon: <ShieldAlert className="h-3.5 w-3.5" /> },
              { id: 'replay', label: 'Security Replay', icon: <Play className="h-3.5 w-3.5" /> },
              { id: 'json', label: 'Raw CBOM JSON', icon: <Cpu className="h-3.5 w-3.5" /> }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-extrabold uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === tab.id 
                    ? 'bg-slate-900 text-white shadow-sm' 
                    : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleExportJson}
              className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 px-3 py-1.5 rounded-xl font-extrabold text-[9px] uppercase tracking-wider shadow-sm flex items-center gap-1.5 transition active:scale-95 duration-200 cursor-pointer"
            >
              <FileDown className="h-3.5 w-3.5 text-slate-500" /> Export JSON
            </button>
            <button
              onClick={handleExportPdf}
              className="bg-[#98144D] hover:bg-[#700d36] text-white px-3 py-1.5 rounded-xl font-extrabold text-[9px] uppercase tracking-wider shadow transition active:scale-95 duration-200 cursor-pointer flex items-center gap-1.5"
            >
              <FileDown className="h-3.5 w-3.5 text-white/90" /> Export PDF Report
            </button>
          </div>
        </div>

        {/* Modal Main Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 min-h-0 select-text">
          
          {loading && (
            <div className="flex flex-col items-center justify-center py-12 space-y-3 select-none">
              <RefreshCw className="h-8 w-8 text-[#98144D] animate-spin" />
              <p className="text-xs font-extrabold text-slate-600 uppercase tracking-wider">
                Invoking IBM CBOMkit Scanner...
              </p>
              <p className="text-[9px] text-slate-400 font-medium">
                Scanning workspace files for certificates, libraries, and cryptographic assets
              </p>
            </div>
          )}

          {error && (
            <div className="bg-rose-50 border border-rose-100 text-rose-800 p-4 rounded-2xl space-y-2 select-none">
              <div className="flex items-center gap-2 font-bold text-xs text-rose-700">
                <ShieldAlert className="h-4 w-4" /> Live CBOM Generation Error
              </div>
              <p className="text-[10px] leading-relaxed">{error}</p>
              <button 
                onClick={fetchLiveCbom}
                className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-3 py-1 rounded-lg text-[9px] font-extrabold uppercase tracking-wider shadow-sm transition active:scale-95 duration-200 cursor-pointer"
              >
                Retry Scanner Invoke
              </button>
            </div>
          )}

          {/* TAB 1: ASSET INVENTORY */}
          {!loading && !error && activeTab === 'inventory' && (
            <div className="space-y-5">
              
              {/* Transaction Header Info Card */}
              <div className="bg-white border border-slate-200/60 rounded-2xl p-4 shadow-sm grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider">Transaction ID</span>
                  <span className="font-mono text-xs font-bold text-slate-800">#{activeTxId || 'unknown'}</span>
                </div>
                <div>
                  <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider">Banking Mode</span>
                  <span className={`text-[10px] font-bold uppercase ${isQuantum ? 'text-indigo-600' : 'text-amber-600'}`}>
                    {isQuantum ? 'QuantumShield Mode' : 'Classical Mode'}
                  </span>
                </div>
                <div>
                  <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider">Settlement Status</span>
                  <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-100 font-extrabold uppercase">
                    Settled / Verified
                  </span>
                </div>
                <div>
                  <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider">Audit Timestamp</span>
                  <span className="text-[10px] text-slate-700 font-semibold">
                    {crypto.timestamp ? new Date(crypto.timestamp).toLocaleString() : new Date().toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Dynamic Assets List */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="px-5 py-3">Asset Component</th>
                      <th className="px-5 py-3">Technical Specifications</th>
                      <th className="px-5 py-3">Quantum Resilient Status</th>
                    </tr>
                  </thead>
                  <tbody className="text-[11px] divide-y divide-slate-100">
                    {/* Component 1: Transport */}
                    <tr>
                      <td className="px-5 py-3.5 font-bold text-slate-700">Transport Security</td>
                      <td className="px-5 py-3.5 font-mono text-slate-600 font-medium">TLS 1.3 (TLS_AES_256_GCM_SHA384)</td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-block px-2.5 py-0.5 rounded font-extrabold uppercase text-[8px] ${
                          isQuantum 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                            : 'bg-rose-50 text-rose-700 border border-rose-100'
                        }`}>
                          {isQuantum ? 'Active & Secure' : 'Vulnerable handshake'}
                        </span>
                      </td>
                    </tr>
                    {/* Component 2: Key Exchange */}
                    <tr>
                      <td className="px-5 py-3.5 font-bold text-slate-700">Key Exchange Protocol</td>
                      <td className="px-5 py-3.5 font-mono text-slate-600 font-medium break-all">
                        {isQuantum 
                          ? `Kyber ML-KEM-768 Encap + BB84 Qubits (QBER: ${crypto.bb84Qber?.toFixed(2)}%)` 
                          : 'ECDHE (SECP256R1 Ephemeral curve)'}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-block px-2.5 py-0.5 rounded font-extrabold uppercase text-[8px] ${
                          isQuantum 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                            : 'bg-rose-50 text-rose-700 border border-rose-100'
                        }`}>
                          {isQuantum ? 'Active & Secure' : 'CRITICAL SHOR RISK'}
                        </span>
                      </td>
                    </tr>
                    {/* Component 3: Derivation */}
                    <tr>
                      <td className="px-5 py-3.5 font-bold text-slate-700">Key Derivation (KDF)</td>
                      <td className="px-5 py-3.5 font-mono text-slate-600 font-medium">
                        HKDF-SHA256 (256-bit symmetric entropy mix)
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="inline-block px-2.5 py-0.5 rounded font-extrabold uppercase text-[8px] bg-emerald-50 text-emerald-700 border border-emerald-100">
                          Secure (Symmetric)
                        </span>
                      </td>
                    </tr>
                    {/* Component 4: Symmetric Encryption */}
                    <tr>
                      <td className="px-5 py-3.5 font-bold text-slate-700">Payload Encryption</td>
                      <td className="px-5 py-3.5 font-mono text-slate-600 font-medium">AES-256-GCM (Galois Counter Mode)</td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-block px-2.5 py-0.5 rounded font-extrabold uppercase text-[8px] ${
                          isQuantum 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                            : 'bg-amber-50 text-amber-700 border border-amber-100'
                        }`}>
                          {isQuantum ? 'Active & Secure' : 'Exposed via Key exchange'}
                        </span>
                      </td>
                    </tr>
                    {/* Component 5: Signature */}
                    <tr>
                      <td className="px-5 py-3.5 font-bold text-slate-700">Digital Authentication Signature</td>
                      <td className="px-5 py-3.5 font-mono text-slate-600 font-medium">
                        {isQuantum ? 'ML-DSA-65 (Dilithium-65 post-quantum)' : 'ECDSA (SECP256R1 with SHA-256)'}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-block px-2.5 py-0.5 rounded font-extrabold uppercase text-[8px] ${
                          isQuantum 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                            : 'bg-rose-50 text-rose-700 border border-rose-100'
                        }`}>
                          {isQuantum ? 'Active & Secure' : 'CRITICAL SHOR RISK'}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Dynamic QKD/Kyber metrics card if Quantum Shield is active */}
              {isQuantum && (
                <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4 shadow-sm space-y-2 select-none">
                  <h4 className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Shield className="h-4 w-4" /> Telemetry QKD BB84 Channel Simulation
                  </h4>
                  <div className="grid grid-cols-3 gap-4 text-[10px] text-slate-600 font-mono">
                    <div>
                      <span className="block text-slate-400 font-bold font-sans text-[8px] uppercase tracking-wider">BB84 QBER</span>
                      <span className="font-extrabold text-indigo-700">{crypto.bb84Qber?.toFixed(2)}%</span>
                    </div>
                    <div>
                      <span className="block text-slate-400 font-bold font-sans text-[8px] uppercase tracking-wider">Bits Sent</span>
                      <span className="font-bold">256 bits</span>
                    </div>
                    <div>
                      <span className="block text-slate-400 font-bold font-sans text-[8px] uppercase tracking-wider">Post-Quantum Active Elements</span>
                      <span className="font-extrabold text-emerald-600">ML-KEM & ML-DSA ACTIVE</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Discovered Cryptographic Inventory (IBM CBOMkit Scan) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2 select-none">
                  <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-tight flex items-center gap-1.5">
                    <Shield className="h-4 w-4 text-[#98144D]" /> Auto-Discovered Cryptographic Certificates
                  </h4>
                  <span className="text-[8px] bg-slate-100 text-slate-500 font-extrabold uppercase px-2 py-0.5 rounded tracking-wide border border-slate-200">
                    IBM CBOMkit Scan
                  </span>
                </div>
                {getDiscoveredCertificates().length > 0 ? (
                  <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                    <table className="w-full border-collapse text-left">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                          <th className="px-5 py-3">Certificate Subject</th>
                          <th className="px-5 py-3">Issuer Name</th>
                          <th className="px-5 py-3">Validity Period</th>
                          <th className="px-5 py-3">Format</th>
                        </tr>
                      </thead>
                      <tbody className="text-[11px] divide-y divide-slate-100">
                        {getDiscoveredCertificates().map((c: any, idx: number) => {
                          const props = c.cryptoProperties?.certificateProperties || {};
                          return (
                            <tr key={idx}>
                              <td className="px-5 py-3 font-bold text-slate-700">{c.name || 'Unknown'}</td>
                              <td className="px-5 py-3 text-slate-600 font-medium">{props.issuerName || 'N/A'}</td>
                              <td className="px-5 py-3 text-slate-600 font-mono font-medium">
                                {props.notValidBefore?.substring(0, 10) || 'N/A'} to {props.notValidAfter?.substring(0, 10) || 'N/A'}
                              </td>
                              <td className="px-5 py-3 text-slate-500 uppercase font-bold text-[9px]">{props.certificateFormat || 'X.509'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-[10px] text-slate-400 font-medium italic p-2">
                    No certificates auto-discovered in application scan.
                  </div>
                )}
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2 select-none">
                  <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-tight flex items-center gap-1.5">
                    <Database className="h-4 w-4 text-[#98144D]" /> Auto-Discovered Cryptographic Libraries
                  </h4>
                  <span className="text-[8px] bg-slate-100 text-slate-500 font-extrabold uppercase px-2 py-0.5 rounded tracking-wide border border-slate-200">
                    IBM CBOMkit Scan
                  </span>
                </div>
                {getDiscoveredLibraries().length > 0 ? (
                  <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                    <table className="w-full border-collapse text-left">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                          <th className="px-5 py-3">Library / Package</th>
                          <th className="px-5 py-3">Type</th>
                          <th className="px-5 py-3">Scan Source Location</th>
                        </tr>
                      </thead>
                      <tbody className="text-[11px] divide-y divide-slate-100">
                        {getDiscoveredLibraries().map((c: any, idx: number) => (
                          <tr key={idx}>
                            <td className="px-5 py-3 font-bold text-slate-700">{c.name || 'Unknown'}</td>
                            <td className="px-5 py-3 text-slate-600 font-medium capitalize">{c.type || 'library'}</td>
                            <td className="px-5 py-3 text-slate-500 font-mono text-[10px] break-all">{c.evidence?.occurrences?.[0]?.location || 'Discovered in source'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-[10px] text-slate-400 font-medium italic p-2">
                    No third-party cryptographic libraries auto-discovered.
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 2: QUANTUM EXPOSURE SUMMARY */}
          {activeTab === 'exposure' && (
            <div className="space-y-4">
              {!isQuantum ? (
                <>
                  <div className="bg-rose-50 border border-rose-100 text-rose-800 p-4 rounded-2xl flex items-start gap-3">
                    <ShieldAlert className="h-5 w-5 text-rose-600 shrink-0 mt-0.5 animate-pulse" />
                    <div>
                      <h4 className="font-bold text-xs">Vulnerable Security Infrastructure Detected</h4>
                      <p className="text-[10px] text-rose-700 mt-1 leading-relaxed">
                        This ledger transfer was secured using classical ECDH/ECDSA cryptographic curves. Under cryptanalytic attacks powered by Shor's algorithm, this security profile falls completely.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 select-none">
                    {/* Vulnerable Component 1 */}
                    <div className="bg-white border border-rose-200 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
                      <div>
                        <span className="inline-block bg-rose-50 text-rose-700 text-[8px] font-bold px-2 py-0.5 rounded border border-rose-100 uppercase tracking-wider mb-2">Vulnerable to Shor's</span>
                        <h5 className="font-bold text-xs text-slate-800">Public-Key Exchange (ECDHE)</h5>
                        <p className="text-[10px] text-slate-400 leading-normal mt-1.5">
                          Shor's algorithm can calculate private keys from public keys by solving discrete elliptic-curve logarithms in polynomial time.
                        </p>
                      </div>
                      <span className="text-[9px] text-rose-600 font-extrabold uppercase mt-4 block">SECP256R1 Curve Broken</span>
                    </div>

                    {/* Vulnerable Component 2 */}
                    <div className="bg-white border border-rose-200 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
                      <div>
                        <span className="inline-block bg-rose-50 text-rose-700 text-[8px] font-bold px-2 py-0.5 rounded border border-rose-100 uppercase tracking-wider mb-2">Harvest Now Decrypt Later</span>
                        <h5 className="font-bold text-xs text-slate-800">Session Handshake Sniffing</h5>
                        <p className="text-[10px] text-slate-400 leading-normal mt-1.5">
                          Adversaries capture and archive this encrypted packet today, with the goal of cracking and decrypting the content historically when quantum hardware matures.
                        </p>
                      </div>
                      <span className="text-[9px] text-rose-600 font-extrabold uppercase mt-4 block">Confidentiality Compromised</span>
                    </div>

                    {/* Vulnerable Component 3 */}
                    <div className="bg-white border border-emerald-200 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
                      <div>
                        <span className="inline-block bg-emerald-50 text-emerald-700 text-[8px] font-bold px-2 py-0.5 rounded border border-emerald-100 uppercase tracking-wider mb-2">Remains Secure</span>
                        <h5 className="font-bold text-xs text-slate-800">Symmetric Cryptography (AES)</h5>
                        <p className="text-[10px] text-slate-400 leading-normal mt-1.5">
                          AES-256 payload encryption remains robust. Grover's algorithm only reduces the effective search space to 128-bits, keeping brute-forcing impossible.
                        </p>
                      </div>
                      <span className="text-[9px] text-emerald-600 font-extrabold uppercase mt-4 block">AES-256 Safe</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-4 select-none">
                  <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 p-4 rounded-2xl flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-xs">Post-Quantum Cryptographic Certification Active</h4>
                      <p className="text-[10px] text-emerald-700 mt-1 leading-relaxed">
                        This session is fortified against both mathematical (Shor's) and physical/brute-force decryption schemes.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-1">
                      <div className="flex items-center gap-1.5 text-indigo-600">
                        <Key className="h-4 w-4" />
                        <h5 className="font-bold text-xs text-slate-800">ML-KEM-768 Encap</h5>
                      </div>
                      <p className="text-[10px] text-slate-400 leading-normal">
                        NIST-certified lattice-based key agreement protects session secrets against Shor's discrete logarithm solver algorithms.
                      </p>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-1">
                      <div className="flex items-center gap-1.5 text-purple-600">
                        <Network className="h-4 w-4" />
                        <h5 className="font-bold text-xs text-slate-800">BB84 Quantum Entropy</h5>
                      </div>
                      <p className="text-[10px] text-slate-400 leading-normal">
                        Laser-pulsed Qubits physical channel reconciliation provides physical layer entropy preventing packet interception without detection.
                      </p>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-1">
                      <div className="flex items-center gap-1.5 text-emerald-600">
                        <Shield className="h-4 w-4" />
                        <h5 className="font-bold text-xs text-slate-800">ML-DSA-65 Signatures</h5>
                      </div>
                      <p className="text-[10px] text-slate-400 leading-normal">
                        Lattice-based Dilithium digital signatures enforce identity validation, locking out spoofing attacks or key forgery.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CRYPTOGRAPHIC REPLAY */}
          {activeTab === 'replay' && (
            <div className="space-y-4">
              
              {/* Playback Controls Panel */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center justify-between select-none">
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className={`p-2 rounded-xl transition duration-200 cursor-pointer ${isPlaying ? 'bg-amber-100 text-amber-700' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                  >
                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => {
                      setIsPlaying(false);
                      setCurrentStepIndex(-1);
                    }}
                    className="p-2 border border-slate-200 hover:bg-slate-50 rounded-xl transition duration-200 text-slate-500 cursor-pointer"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                  <div>
                    <h5 className="font-bold text-xs text-slate-800">Interactive Security Player</h5>
                    <p className="text-[9px] text-slate-400">Step through the ledger pipelines from socket authentication to settlement.</p>
                  </div>
                </div>

                <div className="text-[10px] font-mono text-slate-500">
                  Step: <span className="font-bold text-slate-800">{currentStepIndex + 1}</span> / {replaySteps.length}
                </div>
              </div>

              {/* Steps timeline display */}
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {replaySteps.map((step, idx) => {
                  const isActive = idx === currentStepIndex;
                  const isCompleted = idx < currentStepIndex;
                  
                  let borderCol = 'border-slate-200 bg-white';
                  let iconCol = 'text-slate-400';
                  let titleCol = 'text-slate-600';
                  let algCol = 'text-slate-400';

                  if (isActive) {
                    borderCol = 'border-indigo-500 bg-indigo-50/10 ring-1 ring-indigo-200 scale-[1.01]';
                    iconCol = 'text-indigo-600';
                    titleCol = 'text-indigo-900 font-extrabold';
                    algCol = 'text-indigo-700';
                  } else if (isCompleted) {
                    borderCol = 'border-emerald-200 bg-emerald-50/5';
                    iconCol = 'text-emerald-600';
                    titleCol = 'text-slate-800';
                    algCol = 'text-emerald-700';
                  }

                  return (
                    <div 
                      key={idx}
                      onClick={() => {
                        setIsPlaying(false);
                        setCurrentStepIndex(idx);
                      }}
                      className={`border rounded-xl p-3 flex items-center justify-between transition-all duration-200 cursor-pointer select-none ${borderCol}`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`p-1.5 rounded-lg bg-slate-50 ${iconCol}`}>
                          {step.icon}
                        </div>
                        <div>
                          <h5 className={`text-xs ${titleCol}`}>Step {idx + 1}: {step.title}</h5>
                          <p className="text-[9px] text-slate-400 mt-0.5 leading-normal">{step.desc}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`font-mono text-[9px] block ${algCol}`}>
                          {isQuantum ? step.quantum : step.classical}
                        </span>
                        <span className={`text-[8px] font-bold tracking-wide uppercase ${isCompleted ? 'text-emerald-600' : isActive ? 'text-indigo-600' : 'text-slate-400'}`}>
                          {isCompleted ? 'COMPLETED' : isActive ? 'PLAYING' : 'PENDING'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          )}

          {/* TAB 4: RAW CBOM JSON */}
          {activeTab === 'json' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center select-none">
                <span className="text-[10px] text-slate-400 font-semibold uppercase">JSON BOM Representation</span>
                <button
                  onClick={() => {
                    const text = JSON.stringify({
                      bomFormat: "CBOM",
                      specVersion: "1.0",
                      serialNumber: `urn:uuid:${crypto.sharedSecret || crypto.mlkemSecret || 'unknown'}`,
                      metadata: {
                        timestamp: crypto.timestamp || new Date().toISOString(),
                        bankingMode: isQuantum ? 'QuantumShield (Post-Quantum)' : 'Classical Banking',
                        sessionId: sessionIdA || 'unknown',
                        transactionId: activeTxId || 'unknown',
                        status: pipelineStatus
                      }
                    }, null, 2);
                    navigator.clipboard.writeText(text);
                  }}
                  className="text-[9px] border border-slate-200 hover:bg-slate-100 text-slate-500 px-2.5 py-1 rounded-lg transition active:scale-95 duration-200 cursor-pointer font-extrabold uppercase tracking-wide"
                >
                  Copy to Clipboard
                </button>
              </div>

              <pre className="p-4 bg-slate-900 text-slate-100 font-mono text-[10px] leading-5 rounded-2xl overflow-x-auto max-h-[350px] shadow-inner select-all">
                {JSON.stringify(liveCbom || {
                  bomFormat: "CBOM",
                  specVersion: "1.0",
                  serialNumber: `urn:uuid:${crypto.sharedSecret || crypto.mlkemSecret || 'unknown'}`,
                  metadata: {
                    timestamp: crypto.timestamp || new Date().toISOString(),
                    bankingMode: isQuantum ? 'QuantumShield (Post-Quantum)' : 'Classical Banking',
                    sessionId: sessionIdA || 'unknown',
                    transactionId: activeTxId || 'unknown',
                    status: pipelineStatus
                  },
                  components: [
                    {
                      type: "authentication",
                      name: "Zero-Trust Device Verification",
                      method: "Credential Passcode & Hardware MAC signature validation",
                      status: "Active / Verified"
                    },
                    {
                      type: "transport-security",
                      name: "TLS 1.3 Tunnel",
                      cipherSuite: "TLS_AES_256_GCM_SHA384",
                      vulnerability: isQuantum ? "None (Quantum-Safe)" : "High (Underlying asymmetric handshakes vulnerable to Shor's algorithm)"
                    },
                    {
                      type: "key-exchange",
                      name: isQuantum ? "QuantumShield Hybrid Key Exchange" : "Elliptic Curve Diffie-Hellman Ephemeral",
                      algorithm: isQuantum ? "BB84 Quantum Key Distribution + ML-KEM-768 (Kyber)" : "ECDHE (SECP256R1)",
                      vulnerability: isQuantum ? "None (Quantum-Safe)" : "Critical (Vulnerable to Shor's Discrete Logarithm Solver; Harvest Now, Decrypt Later Threat)"
                    },
                    {
                      type: "key-derivation",
                      name: "HKDF Session Key Derivation",
                      algorithm: isQuantum ? "HKDF-SHA256 (Quantum Hybrid combined entropy)" : "HKDF-SHA256",
                      vulnerability: "None (Symmetric KDF remains quantum secure)"
                    },
                    {
                      type: "payload-encryption",
                      name: "Symmetric Payload Encryption",
                      algorithm: "AES-256-GCM (Authenticated)",
                      vulnerability: isQuantum ? "None" : "Indirect (Vulnerable to Harvest Now Decrypt Later if session key is compromised)"
                    },
                    {
                      type: "digital-signature",
                      name: isQuantum ? "Dilithium Digital Signature" : "Elliptic Curve Digital Signature Algorithm",
                      algorithm: isQuantum ? "ML-DSA-65" : "ECDSA (SECP256R1)",
                      vulnerability: isQuantum ? "None (Quantum-Safe)" : "High (Vulnerable to forgery using Shor's algorithm on SECP256R1 public key)"
                    }
                  ]
                }, null, 2)}
              </pre>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0 select-none">
          <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">
            QuantumShield Core Banking Security Infrastructure
          </span>
          <button
            onClick={onClose}
            className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 px-5 rounded-xl text-xs shadow transition active:scale-95 duration-200 cursor-pointer"
          >
            Close Audit
          </button>
        </div>

      </div>
    </div>
  );
};
export default CbomModal;
