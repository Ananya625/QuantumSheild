import React, { useState, useEffect } from 'react';
import { useTransaction } from '../context/TransactionContext';
import { 
  ChevronDown, ChevronUp, Terminal, ShieldCheck, Cpu, Key, FileLock2, Lock, AlertTriangle
} from 'lucide-react';
import LiveTimeline from './LiveTimeline';

interface AccordionItemProps {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  status: 'pending' | 'active' | 'completed' | 'failed';
  statusLabel: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}

const AccordionItem: React.FC<AccordionItemProps> = ({
  title, isOpen, onToggle, status, statusLabel, icon, children
}) => {
  let statusBadgeColor = 'bg-slate-100 text-slate-500 border border-slate-200/50';
  let borderClass = 'border-slate-100';
  let headerBg = 'bg-white hover:bg-slate-50/50';

  if (status === 'active') {
    statusBadgeColor = 'bg-blue-50 text-blue-700 border border-blue-200 animate-pulse';
    borderClass = 'border-blue-400 ring-2 ring-blue-100';
    headerBg = 'bg-blue-50/10';
  } else if (status === 'completed') {
    statusBadgeColor = 'bg-emerald-50 text-emerald-700 border border-emerald-200';
    borderClass = 'border-slate-200';
  } else if (status === 'failed') {
    statusBadgeColor = 'bg-rose-50 text-rose-700 border border-rose-200';
    borderClass = 'border-rose-300';
  }

  return (
    <div className={`border rounded-xl mb-3 overflow-hidden transition-all duration-300 shadow-sm ${borderClass}`}>
      <button
        onClick={onToggle}
        className={`w-full px-5 py-4 flex items-center justify-between font-bold text-left select-none transition-colors ${headerBg}`}
      >
        <div className="flex items-center space-x-3 text-slate-800">
          <div className={`${status === 'completed' ? 'text-emerald-600' : status === 'active' ? 'text-blue-600' : 'text-slate-400'}`}>
            {icon}
          </div>
          <span className="text-xs tracking-tight uppercase">{title}</span>
        </div>
        <div className="flex items-center space-x-3">
          <span className={`text-[9px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${statusBadgeColor}`}>
            {statusLabel}
          </span>
          {isOpen ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
        </div>
      </button>

      {isOpen && (
        <div className="px-5 pb-5 pt-3 bg-white border-t border-slate-50 text-slate-600 text-xs leading-relaxed space-y-4">
          {children}
        </div>
      )}
    </div>
  );
};

export const SecurityInspector: React.FC = () => {
  const { pipelineStatus, crypto, activeSimulation } = useTransaction();
  
  const simStatus = activeSimulation.status;
  const isShorActive = activeSimulation.algorithm === 'shor' && ['completed', 'decrypted', 'analyzed'].includes(simStatus);
  const isShorDecrypted = activeSimulation.algorithm === 'shor' && ['decrypted', 'analyzed'].includes(simStatus);
  const isShorAnalyzed = activeSimulation.algorithm === 'shor' && simStatus === 'analyzed';
  

  
  // Track which single section is open
  const [activeSection, setActiveSection] = useState<string | null>('application');

  // Auto-expand and collapse stages sequentially
  useEffect(() => {
    // Only auto-expand during an active transaction processing flow
    if (pipelineStatus === 'PENDING') {
      setActiveSection('application');
    } else if (pipelineStatus === 'AUTHENTICATING') {
      setActiveSection('application');
    } else if (pipelineStatus === 'TLS_HANDSHAKE' || pipelineStatus === 'TLS_ESTABLISHED') {
      setActiveSection('transport');
    } else if (pipelineStatus === 'KEY_EXCHANGE') {
      setActiveSection('keyExchange');
    } else if (pipelineStatus === 'DERIVING_KEY') {
      setActiveSection('sessionKey');
    } else if (pipelineStatus === 'ENCRYPTING') {
      setActiveSection('encryption');
    } else if (pipelineStatus === 'SIGNING') {
      setActiveSection('signature');
    } else if (pipelineStatus === 'COMPLETED' || pipelineStatus === 'FAILED') {
      // Collapse everything upon transaction completion to keep drawer neat
      setActiveSection(null);
    }
  }, [pipelineStatus]);

  const handleToggle = (section: string) => {
    // Toggle: open the clicked one, close others
    setActiveSection(prev => (prev === section ? null : section));
  };

  const getStatus = (section: string): { state: 'pending' | 'active' | 'completed' | 'failed'; label: string } => {
    // Override status when simulation has completed (only in Classical mode)
    if (crypto.securityMode !== 'quantumshield') {
      if (isShorActive) {
        if (section === 'keyExchange') return { state: 'failed', label: 'Key Exchange Compromised' };
        if (section === 'sessionKey') return { state: 'failed', label: 'Session Key Recovered' };
      }
      if (isShorDecrypted) {
        if (section === 'encryption') return { state: 'failed', label: 'Payload Decrypted' };
      }
      if (isShorAnalyzed) {
        if (section === 'transport') return { state: 'completed', label: 'Protocol Secure (⚠️ Underlying vulnerable)' };
        if (section === 'signature') return { state: 'failed', label: 'Signature Vulnerable' };
      }
    }

    if (pipelineStatus === 'FAILED') {
      // Check if it failed on this stage
      if (section === 'application' && pipelineStatus === 'FAILED') return { state: 'failed', label: 'Aborted' };
    }

    switch (section) {
      case 'application':
        if (pipelineStatus === 'PENDING') return { state: 'pending', label: 'Idle' };
        if (pipelineStatus === 'AUTHENTICATING') return { state: 'active', label: 'Verifying' };
        return { state: 'completed', label: 'Verified' };

      case 'transport':
        if (['PENDING', 'AUTHENTICATING'].includes(pipelineStatus)) {
          return { state: 'pending', label: 'Pending' };
        }
        if (pipelineStatus === 'TLS_HANDSHAKE') return { state: 'active', label: 'Negotiating' };
        return { state: 'completed', label: 'TLS 1.3 Active' };

      case 'keyExchange':
        if (['PENDING', 'AUTHENTICATING', 'TLS_HANDSHAKE', 'TLS_ESTABLISHED'].includes(pipelineStatus)) {
          return { state: 'pending', label: 'Pending' };
        }
        if (pipelineStatus === 'KEY_EXCHANGE') return { state: 'active', label: 'Exchanging' };
        return { 
          state: 'completed', 
          label: crypto.securityMode === 'quantumshield' ? 'PQC Hybrid Complete' : 'ECDHE Complete' 
        };

      case 'sessionKey':
        if (['PENDING', 'AUTHENTICATING', 'TLS_HANDSHAKE', 'TLS_ESTABLISHED', 'KEY_EXCHANGE'].includes(pipelineStatus)) {
          return { state: 'pending', label: 'Pending' };
        }
        if (pipelineStatus === 'DERIVING_KEY') return { state: 'active', label: 'Deriving' };
        return { state: 'completed', label: 'Key Derived' };

      case 'encryption':
        if (['PENDING', 'AUTHENTICATING', 'TLS_HANDSHAKE', 'TLS_ESTABLISHED', 'KEY_EXCHANGE', 'DERIVING_KEY'].includes(pipelineStatus)) {
          return { state: 'pending', label: 'Pending' };
        }
        if (pipelineStatus === 'ENCRYPTING') return { state: 'active', label: 'Encrypting' };
        return { state: 'completed', label: 'AES-256-GCM' };

      case 'signature':
        if (['SIGNING'].includes(pipelineStatus)) return { state: 'active', label: 'Signing' };
        if (crypto.signature || crypto.mldsaSignature) {
          return { 
            state: 'completed', 
            label: crypto.securityMode === 'quantumshield' ? 'ML-DSA Signed' : 'ECDSA Signed' 
          };
        }
        return { state: 'pending', label: 'Pending' };

      default:
        return { state: 'pending', label: 'Pending' };
    }
  };

  const isQuantum = crypto.securityMode === 'quantumshield';

  return (
    <div className="px-6 py-4 space-y-2">
      {/* 1. APPLICATION LAYER */}
      <AccordionItem
        title="Application Layer"
        isOpen={activeSection === 'application'}
        onToggle={() => handleToggle('application')}
        status={getStatus('application').state}
        statusLabel={getStatus('application').label}
        icon={<Terminal className="h-4.5 w-4.5" />}
      >
        <div className="space-y-2">
          <div className="flex justify-between border-b border-slate-50 py-1">
            <span className="text-slate-400">Layer Protocol</span>
            <span className="font-semibold text-slate-800 font-mono">HTTPS (JSON Request)</span>
          </div>
          <div className="flex justify-between border-b border-slate-50 py-1">
            <span className="text-slate-400">Authentication</span>
            <span className="font-semibold text-slate-700">Credential Auth & Passcode</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-slate-400">Device Integrity</span>
            <span className="font-semibold text-slate-700">MAC Verification Handshake</span>
          </div>
        </div>
      </AccordionItem>

      {/* 2. TRANSPORT LAYER (TLS 1.3) */}
      <AccordionItem
        title="Transport Layer"
        isOpen={activeSection === 'transport'}
        onToggle={() => handleToggle('transport')}
        status={getStatus('transport').state}
        statusLabel={getStatus('transport').label}
        icon={<Lock className="h-4.5 w-4.5" />}
      >
        <div className="space-y-3">
          {crypto.securityMode !== 'quantumshield' && isShorAnalyzed && (
            <div className="bg-rose-50 border border-rose-100 text-rose-700 p-2.5 rounded-xl text-[10px] leading-normal font-semibold space-y-1">
              <div className="flex items-center gap-1 font-bold text-rose-800">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                Underlying Algorithms Vulnerable
              </div>
              <p>TLS 1.3 protocol itself remains secure today, but its underlying public-key exchange (ECDHE) and signature verification (ECDSA) algorithms face future quantum vulnerability from Shor's algorithm.</p>
            </div>
          )}
          <div className="flex justify-between border-b border-slate-50 py-1">
            <span className="text-slate-400">TLS Standard</span>
            <span className="font-bold text-slate-800 font-mono">TLS 1.3 (RFC 8446)</span>
          </div>
          <div className="flex justify-between border-b border-slate-50 py-1">
            <span className="text-slate-400">Cipher Negotiated</span>
            <span className="font-semibold text-blue-600 font-mono">TLS_AES_256_GCM_SHA384</span>
          </div>
          {crypto.tlsServerCert && (
            <div className="space-y-2 pt-1">
              <div>
                <span className="block text-[10px] text-slate-400 mb-1 font-semibold uppercase tracking-wider">X.509 Server Certificate</span>
                <pre className="font-mono text-[9px] bg-slate-50 border border-slate-100 p-2.5 rounded-lg max-h-24 overflow-y-auto select-all text-slate-500 leading-3 whitespace-pre-wrap">
                  {crypto.tlsServerCert}
                </pre>
              </div>
              <div>
                <span className="block text-[10px] text-slate-400 mb-1 font-semibold uppercase tracking-wider">Root CA Certificate Chain</span>
                <pre className="font-mono text-[9px] bg-slate-50 border border-slate-100 p-2.5 rounded-lg max-h-24 overflow-y-auto select-all text-slate-500 leading-3 whitespace-pre-wrap">
                  {crypto.tlsCaCert}
                </pre>
              </div>
            </div>
          )}
        </div>
      </AccordionItem>

      {/* 3. KEY EXCHANGE (ECDHE OR BB84 + ML-KEM) */}
      <AccordionItem
        title={isQuantum ? "Quantum Key Exchange" : "Key Exchange"}
        isOpen={activeSection === 'keyExchange'}
        onToggle={() => handleToggle('keyExchange')}
        status={getStatus('keyExchange').state}
        statusLabel={getStatus('keyExchange').label}
        icon={<Key className="h-4.5 w-4.5" />}
      >
        {isQuantum ? (
          // QuantumShield post-quantum visual telemetry
          <div className="space-y-4">
            <div className="border-b border-slate-100 pb-2">
              <span className="block text-[10px] text-purple-600 font-bold uppercase tracking-wider mb-2">1. BB84 Quantum Channel Sim</span>
              <div className="space-y-2.5 bg-slate-50 border border-slate-100 p-3 rounded-xl font-mono text-[10px]">
                <div>
                  <span className="text-slate-400 block font-semibold text-[8px] uppercase tracking-wider">Alice's Raw Qubits (256-bit)</span>
                  <div className="text-slate-800 break-all leading-tight tracking-wider bg-white border border-slate-100 p-1.5 rounded max-h-12 overflow-y-auto">
                    {crypto.bb84AliceBits}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-400 block font-semibold text-[8px] uppercase tracking-wider">Alice's Bases</span>
                    <div className="text-slate-700 break-all tracking-wider bg-white border border-slate-100 p-1.5 rounded max-h-12 overflow-y-auto">
                      {crypto.bb84AliceBases}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-semibold text-[8px] uppercase tracking-wider">Bob's Bases</span>
                    <div className="text-slate-700 break-all tracking-wider bg-white border border-slate-100 p-1.5 rounded max-h-12 overflow-y-auto">
                      {crypto.bb84BobBases}
                    </div>
                  </div>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-slate-200/50">
                  <span className="text-[8px] font-bold text-slate-400 uppercase">Quantum Bit Error Rate (QBER)</span>
                  <span className="font-extrabold text-purple-600 bg-purple-50 px-2 py-0.5 rounded border border-purple-100">
                    {crypto.bb84Qber?.toFixed(2)}%
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold text-[8px] uppercase tracking-wider">Reconciled BB84 Shared Secret</span>
                  <div className="text-purple-700 break-all font-extrabold select-all bg-white border border-slate-100 p-1.5 rounded mt-0.5">
                    {crypto.bb84Secret}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <span className="block text-[10px] text-indigo-600 font-bold uppercase tracking-wider mb-2">2. ML-KEM-768 (Kyber) Encap</span>
              <div className="space-y-2">
                <div>
                  <span className="block text-[9px] text-slate-400 font-semibold uppercase tracking-wider">Client Kyber Public Key</span>
                  <pre className="font-mono text-[9px] bg-slate-50 border border-slate-100 p-2 rounded-lg max-h-16 overflow-y-auto select-all text-slate-500 break-all leading-normal">
                    {crypto.mlkemPublicKey}
                  </pre>
                </div>
                <div>
                  <span className="block text-[9px] text-slate-400 font-semibold uppercase tracking-wider">Encapsulated Ciphertext (1088 bytes)</span>
                  <pre className="font-mono text-[9px] bg-slate-50 border border-slate-100 p-2 rounded-lg max-h-16 overflow-y-auto select-all text-slate-500 break-all leading-normal">
                    {crypto.mlkemCiphertext}
                  </pre>
                </div>
                <div>
                  <span className="block text-[9px] text-slate-400 font-semibold uppercase tracking-wider">ML-KEM Shared Secret</span>
                  <pre className="font-mono text-[9.5px] bg-indigo-50 border border-indigo-100 p-2 rounded-lg select-all text-indigo-700 font-bold break-all">
                    {crypto.mlkemSecret}
                  </pre>
                </div>
              </div>
            </div>
            
            {/* Visual hybrid key agreement concept diagram */}
            <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl space-y-2 mt-3 select-none">
              <span className="block text-[8px] text-purple-650 font-bold uppercase tracking-wider text-center">Hybrid Key Agreement (QuantumShield Mode)</span>
              <div className="flex items-center justify-between text-[9px] text-slate-500 font-semibold leading-none">
                <div className="bg-white border border-slate-200 px-2 py-1.5 rounded shadow-sm text-center font-bold">
                  QKD (BB84 Entropy)
                </div>
                <span className="text-slate-400 font-bold text-xs">+</span>
                <div className="bg-white border border-slate-200 px-2 py-1.5 rounded shadow-sm text-center font-bold">
                  KEM (ML-KEM-768)
                </div>
                <span className="text-slate-400 font-bold text-xs">→</span>
                <div className="bg-purple-100 border border-purple-200 text-purple-800 font-bold px-2 py-1.5 rounded shadow-sm text-center">
                  AES-256 Session Key
                </div>
              </div>
              <p className="text-[8.5px] text-slate-450 text-center leading-normal">
                QKD establishes physical channel secrecy, and ML-KEM secures key encapsulation. HKDF combines both into a single quantum-safe session key.
              </p>
            </div>
          </div>
        ) : (
          // Classical ECDHE exchange
          <div className="space-y-3">
            <div className="flex justify-between border-b border-slate-50 py-1">
              <span className="text-slate-400">Asymmetric Curve</span>
              <span className="font-bold text-slate-800 font-mono">ECDHE (SECP256R1)</span>
            </div>
            {crypto.clientDhPublicKey && (
              <div className="space-y-2 pt-1">
                <div>
                  <span className="block text-[10px] text-slate-400 mb-1 font-semibold uppercase tracking-wider">Client Public DH Key</span>
                  <pre className="font-mono text-[9px] bg-slate-50 border border-slate-100 p-2.5 rounded-lg max-h-20 overflow-y-auto select-all text-slate-500 leading-3 whitespace-pre-wrap">
                    {crypto.clientDhPublicKey}
                  </pre>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400 mb-1 font-semibold uppercase tracking-wider">Server Public DH Key</span>
                  <pre className="font-mono text-[9px] bg-slate-50 border border-slate-100 p-2.5 rounded-lg max-h-20 overflow-y-auto select-all text-slate-500 leading-3 whitespace-pre-wrap">
                    {crypto.serverDhPublicKey}
                  </pre>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400 mb-1 font-semibold uppercase tracking-wider">Diffie-Hellman Shared Secret</span>
                  <pre className="font-mono text-[9.5px] bg-slate-50 border border-slate-100 p-2.5 rounded-lg select-all text-blue-700 font-bold break-all">
                    {crypto.sharedSecret}
                  </pre>
                </div>
              </div>
            )}
            
            {/* Visual ECDH key agreement concept diagram */}
            {crypto.clientDhPublicKey && (
              <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl space-y-2 mt-3 select-none">
                <span className="block text-[8px] text-blue-650 font-bold uppercase tracking-wider text-center">Elliptic Curve Diffie-Hellman Agreement</span>
                <div className="flex items-center justify-between text-[9px] text-slate-500 font-semibold leading-none">
                  <div className="bg-white border border-slate-200 px-2 py-1.5 rounded shadow-sm text-center font-bold">
                    Client Ephemeral Key
                  </div>
                  <span className="text-slate-400 font-bold text-xs">+</span>
                  <div className="bg-white border border-slate-200 px-2 py-1.5 rounded shadow-sm text-center font-bold">
                    Server Ephemeral Key
                  </div>
                  <span className="text-slate-400 font-bold text-xs">→</span>
                  <div className="bg-blue-100 border border-blue-200 text-blue-800 font-bold px-2 py-1.5 rounded shadow-sm text-center">
                    DH Shared Secret
                  </div>
                </div>
                <p className="text-[8.5px] text-slate-450 text-center leading-normal">
                  Each side computes the same shared secret by multiplying their own private exponent with the opponent's public point on the SECP256R1 curve.
                </p>
              </div>
            )}
            {crypto.securityMode !== 'quantumshield' && isShorActive && (
              <div className="bg-rose-50 border border-rose-100 text-rose-700 p-2.5 rounded-xl text-[10px] leading-normal font-semibold space-y-1 mt-3">
                <div className="flex items-center gap-1 font-bold text-rose-800 animate-pulse">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-rose-600" />
                  Key Exchange Compromised
                </div>
                <p>Future quantum computers running Shor's algorithm threaten the elliptic curve discrete logarithm problem used by ECDHE, allowing adversaries to calculate the shared secret from public keys.</p>
              </div>
            )}
          </div>
        )}
      </AccordionItem>

      {/* 4. SESSION KEY DERIVATION (HKDF) */}
      <AccordionItem
        title="Session Key"
        isOpen={activeSection === 'sessionKey'}
        onToggle={() => handleToggle('sessionKey')}
        status={getStatus('sessionKey').state}
        statusLabel={getStatus('sessionKey').label}
        icon={<Cpu className="h-4.5 w-4.5" />}
      >
        <div className="space-y-3">
          {crypto.securityMode !== 'quantumshield' && isShorDecrypted && (
            <div className="bg-rose-50 border border-rose-100 text-rose-700 p-2.5 rounded-xl text-[10px] leading-normal font-semibold space-y-1">
              <div className="flex items-center gap-1 font-bold text-rose-800">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                Historical Session Confidentiality Compromised
              </div>
              <p>Adversaries utilizing a "Harvest Now, Decrypt Later" strategy can now retroactively decrypt this captured TLS session because the key exchange was compromised.</p>
            </div>
          )}
          <div className="flex justify-between border-b border-slate-50 py-1">
            <span className="text-slate-400">Derivation KDF</span>
            <span className="font-bold text-slate-800 font-mono">
              {isQuantum ? "HKDF-SHA256 (Quantum Hybrid)" : "HKDF-SHA256"}
            </span>
          </div>
          <div className="flex justify-between border-b border-slate-50 py-1">
            <span className="text-slate-400">Symmetric Entropy Input</span>
            <span className="font-mono text-[9px] text-slate-600 truncate max-w-[200px]" title={isQuantum ? "BB84 Key + ML-KEM Key" : "ECDHE Shared Secret"}>
              {isQuantum ? "BB84 secret + ML-KEM secret" : "ECDHE shared secret"}
            </span>
          </div>
          <div className="flex justify-between border-b border-slate-50 py-1">
            <span className="text-slate-400">HKDF Info Info</span>
            <span className="font-mono text-[9px] text-slate-700 font-semibold">
              {isQuantum ? "quantumshield-hybrid" : "quantumshield-aes-gcm-key-encryption"}
            </span>
          </div>
          {crypto.sessionKey && (
            <div>
              <span className="block text-[10px] text-slate-400 mb-1 font-semibold uppercase tracking-wider">Derived Symmetric Session Key (AES-256)</span>
              <pre className={`font-mono text-[9.5px] border p-2.5 rounded-lg select-all font-bold break-all ${isQuantum ? 'bg-purple-50 border-purple-100 text-purple-700' : 'bg-slate-50 border-slate-100 text-emerald-700'}`}>
                {crypto.sessionKey}
              </pre>
            </div>
          )}
        </div>
      </AccordionItem>

      {/* 5. AES ENCRYPTION & INTEGRITY */}
      <AccordionItem
        title="Symmetric Encryption"
        isOpen={activeSection === 'encryption'}
        onToggle={() => handleToggle('encryption')}
        status={getStatus('encryption').state}
        statusLabel={getStatus('encryption').label}
        icon={<FileLock2 className="h-4.5 w-4.5" />}
      >
        <div className="space-y-3">

          {crypto.securityMode !== 'quantumshield' && isShorDecrypted && (
            <div className="bg-rose-50 border border-rose-100 text-rose-700 p-2.5 rounded-xl text-[10px] leading-normal font-semibold space-y-1">
              <div className="flex items-center gap-1 font-bold text-rose-850">
                <AlertTriangle className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                Payload Confidentiality Compromised
              </div>
              <p>The AES-256 encrypted payload is fully readable because its session key was recovered from the compromised key exchange.</p>
            </div>
          )}
          {crypto.securityMode !== 'quantumshield' && isShorActive && !isShorDecrypted && (
            <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 p-2.5 rounded-xl text-[10px] leading-normal font-semibold space-y-1">
              <div className="flex items-center gap-1 font-bold text-emerald-800">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                Algorithm Secure (Shor Resistant)
              </div>
              <p>AES symmetric algorithm itself is not broken by Shor's algorithm, but confidentiality depends on protecting the session key from exchange compromise.</p>
            </div>
          )}
          <div className="flex justify-between border-b border-slate-50 py-1">
            <span className="text-slate-400">Encryption Standard</span>
            <span className="font-bold text-slate-800 font-mono">AES-256-GCM (Authenticated)</span>
          </div>
          {crypto.ciphertext && (
            <div className="space-y-2">
              <div className="flex justify-between border-b border-slate-50 py-1">
                <span className="text-slate-400">Initialization Vector (Nonce)</span>
                <span className="font-mono text-slate-700 font-semibold">{crypto.nonce}</span>
              </div>
              <div className="flex justify-between border-b border-slate-50 py-1">
                <span className="text-slate-400">Authentication Tag</span>
                <span className="font-mono text-indigo-700 font-semibold">{crypto.tag}</span>
              </div>
              <div className="flex justify-between border-b border-slate-50 py-1">
                <span className="text-slate-400">Payload SHA-256 Digest</span>
                <span className="font-mono text-slate-700 font-semibold truncate max-w-[200px]" title={crypto.sha256Hash}>{crypto.sha256Hash}</span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-400 mb-1 font-semibold uppercase tracking-wider">Encrypted Ciphertext Block</span>
                <pre className="font-mono text-[9px] bg-slate-50 border border-slate-100 p-2.5 rounded-lg max-h-20 overflow-y-auto select-all text-slate-600 break-all leading-normal">
                  {crypto.ciphertext}
                </pre>
              </div>
            </div>
          )}
        </div>
      </AccordionItem>

      {/* 6. DIGITAL SIGNATURE (ECDSA OR ML-DSA) */}
      <AccordionItem
        title={isQuantum ? "Post-Quantum Signature" : "Digital Signature"}
        isOpen={activeSection === 'signature'}
        onToggle={() => handleToggle('signature')}
        status={getStatus('signature').state}
        statusLabel={getStatus('signature').label}
        icon={<ShieldCheck className="h-4.5 w-4.5" />}
      >
        {isQuantum ? (
          // QuantumShield ML-DSA signatures
          <div className="space-y-3">
            <div className="flex justify-between border-b border-slate-50 py-1">
              <span className="text-slate-400">Signature Standard</span>
              <span className="font-bold text-slate-800 font-mono">ML-DSA-65 (Dilithium-65)</span>
            </div>
            {crypto.mldsaSignature && (
              <div className="space-y-2">
                <div>
                  <span className="block text-[10px] text-slate-400 mb-1 font-semibold uppercase tracking-wider">Client Public Dilithium Key</span>
                  <pre className="font-mono text-[9px] bg-slate-50 border border-slate-100 p-2.5 rounded-lg max-h-20 overflow-y-auto select-all text-slate-500 leading-3 whitespace-pre-wrap">
                    {crypto.mldsaPublicKey}
                  </pre>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400 mb-1 font-semibold uppercase tracking-wider">ML-DSA-65 Signature Block</span>
                  <pre className="font-mono text-[9px] bg-purple-50 border border-purple-100 p-2.5 rounded-lg max-h-24 overflow-y-auto select-all text-purple-800 break-all leading-normal">
                    {crypto.mldsaSignature}
                  </pre>
                </div>
              </div>
            )}
          </div>
        ) : (
          // Classical ECDSA signatures
          <div className="space-y-3">
            {crypto.securityMode !== 'quantumshield' && isShorAnalyzed && (
              <div className="bg-rose-50 border border-rose-100 text-rose-700 p-2.5 rounded-xl text-[10px] leading-normal font-semibold space-y-1 mb-2">
                <div className="flex items-center gap-1 font-bold text-rose-800">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  ECDSA Quantum Vulnerability Identified
                </div>
                <p>Future quantum computers running Shor's algorithm threaten the elliptic curve discrete logarithm problem used by ECDSA, enabling signature forgery and transaction authentication spoofing.</p>
              </div>
            )}
            <div className="flex justify-between border-b border-slate-50 py-1">
              <span className="text-slate-400">Signature Standard</span>
              <span className="font-bold text-slate-800 font-mono">ECDSA (SECP256R1)</span>
            </div>
            {crypto.signature && (
              <div className="space-y-2">
                <div>
                  <span className="block text-[10px] text-slate-400 mb-1 font-semibold uppercase tracking-wider">Client Public Signing Key</span>
                  <pre className="font-mono text-[9px] bg-slate-50 border border-slate-100 p-2.5 rounded-lg max-h-20 overflow-y-auto select-all text-slate-500 leading-3 whitespace-pre-wrap">
                    {crypto.clientSigningPublicKey}
                  </pre>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400 mb-1 font-semibold uppercase tracking-wider">ECDSA Signature (R component)</span>
                  <pre className="font-mono text-[9px] bg-slate-50 border border-slate-100 p-2 py-1 rounded select-all text-slate-600 break-all">
                    {crypto.signatureR}
                  </pre>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400 mb-1 font-semibold uppercase tracking-wider">ECDSA Signature (S component)</span>
                  <pre className="font-mono text-[9px] bg-slate-50 border border-slate-100 p-2 py-1 rounded select-all text-slate-600 break-all">
                    {crypto.signatureS}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}
      </AccordionItem>
      
      {/* Integrated Security & Operational Audit Log */}
      <div className="border-t border-slate-200 mt-6 pt-4 h-[240px] flex flex-col shrink-0">
        <LiveTimeline />
      </div>
    </div>
  );
};

export default SecurityInspector;
