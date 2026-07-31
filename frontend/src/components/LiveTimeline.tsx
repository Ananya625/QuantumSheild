import React, { useEffect, useRef } from 'react';
import { useTransaction } from '../context/TransactionContext';
import { Terminal, RefreshCw, Copy, Check } from 'lucide-react';

const getLogIcon = (event: string) => {
  if (event.includes('FAIL') || event.includes('ABORT')) {
    return <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0 mt-1.5 animate-pulse" />;
  }
  if (event.includes('SUCCESS') || event.includes('CONFIRM')) {
    return <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0 mt-1.5" />;
  }
  if (event.includes('TLS')) {
    return <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0 mt-1.5" />;
  }
  if (event.includes('ECDHE') || event.includes('HKDF')) {
    return <span className="h-2 w-2 rounded-full bg-indigo-500 shrink-0 mt-1.5" />;
  }
  if (event.includes('AES') || event.includes('HASH') || event.includes('SIGN')) {
    return <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0 mt-1.5" />;
  }
  return <span className="h-2 w-2 rounded-full bg-slate-400 shrink-0 mt-1.5" />;
};

export const LiveTimeline: React.FC = () => {
  const { logs, pipelineStatus } = useTransaction();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = React.useState(false);

  // Auto-scroll logs
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const copyToClipboard = () => {
    const logText = logs.map(l => `[${l.timestamp}] [${l.event}] ${l.message}`).join('\n');
    navigator.clipboard.writeText(logText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-premium p-4 flex flex-col h-full">
      <div className="flex items-center justify-between mb-2 select-none">
        <div className="flex items-center space-x-2">
          <Terminal className="h-4 w-4 text-slate-700" />
          <h3 className="font-bold text-xs text-slate-800 tracking-tight">Security & Operational Audit Log</h3>
        </div>
        
        <div className="flex items-center space-x-2">
          {logs.length > 0 && (
            <button
              onClick={copyToClipboard}
              className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-50 rounded-lg transition duration-200"
              title="Copy log terminal content"
            >
              {copied ? <Check className="h-4.5 w-4.5 text-emerald-500" /> : <Copy className="h-4.5 w-4.5" />}
            </button>
          )}
          
          {pipelineStatus !== 'PENDING' && pipelineStatus !== 'COMPLETED' && pipelineStatus !== 'FAILED' && (
            <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 bg-slate-900 border border-slate-950 rounded-xl p-4 overflow-y-auto font-mono text-[11px] leading-5 text-slate-300 custom-scrollbar select-text select-all">
        {logs.length === 0 ? (
          <div className="text-slate-500 flex items-center justify-center h-full select-none">
            &gt; Waiting for transaction initiation...
          </div>
        ) : (
          <div className="space-y-2">
            {logs.map((log, index) => (
              <div key={index} className="flex items-start space-x-2.5 animate-fadeIn">
                {getLogIcon(log.event)}
                <div className="flex-1">
                  <span className="text-slate-500 select-none mr-2">[{log.timestamp}]</span>
                  <span className="text-slate-300">{log.message}</span>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>
    </div>
  );
};
export default LiveTimeline;
