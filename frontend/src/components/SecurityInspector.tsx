import React, { useState, useEffect } from 'react';
import { useTransaction } from '../context/TransactionContext';
import { 
  ChevronDown, ChevronUp, Terminal, ShieldCheck, Cpu, Key, FileLock2, Lock
} from 'lucide-react';

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
  const { pipelineStatus, crypto } = useTransaction();
  
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
        return { state: 'completed', label: 'ECDHE Complete' };

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
        if (crypto.signature) return { state: 'completed', label: 'ECDSA Signed' };
        return { state: 'pending', label: 'Pending' };

      default:
        return { state: 'pending', label: 'Pending' };
    }
  };

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

      {/* 3. KEY EXCHANGE (ECDHE) */}
      <AccordionItem
        title="Key Exchange"
        isOpen={activeSection === 'keyExchange'}
        onToggle={() => handleToggle('keyExchange')}
        status={getStatus('keyExchange').state}
        statusLabel={getStatus('keyExchange').label}
        icon={<Key className="h-4.5 w-4.5" />}
      >
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
        </div>
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
          <div className="flex justify-between border-b border-slate-50 py-1">
            <span className="text-slate-400">Derivation KDF</span>
            <span className="font-bold text-slate-800 font-mono">HKDF-SHA256</span>
          </div>
          <div className="flex justify-between border-b border-slate-50 py-1">
            <span className="text-slate-400">HKDF Salt Used</span>
            <span className="font-mono text-slate-600">quantumshield-tls-salt-2026</span>
          </div>
          {crypto.sessionKey && (
            <div>
              <span className="block text-[10px] text-slate-400 mb-1 font-semibold uppercase tracking-wider">Derived Symmetric Session Key</span>
              <pre className="font-mono text-[9.5px] bg-slate-50 border border-slate-100 p-2.5 rounded-lg select-all text-emerald-700 font-bold break-all">
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

      {/* 6. DIGITAL SIGNATURE (ECDSA) */}
      <AccordionItem
        title="Digital Signature"
        isOpen={activeSection === 'signature'}
        onToggle={() => handleToggle('signature')}
        status={getStatus('signature').state}
        statusLabel={getStatus('signature').label}
        icon={<ShieldCheck className="h-4.5 w-4.5" />}
      >
        <div className="space-y-3">
          <div className="flex justify-between border-b border-slate-50 py-1">
            <span className="text-slate-400">Signature Standard</span>
            <span className="font-bold text-slate-800 font-mono">ECDSA (SECP256R1)</span>
          </div>
          {crypto.signature && (
            <div className="space-y-2">
              <div>
                <span className="block text-[10px] text-slate-400 mb-1 font-semibold uppercase tracking-wider">Client Public signing Key</span>
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
      </AccordionItem>
    </div>
  );
};
export default SecurityInspector;
