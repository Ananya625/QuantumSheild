import React from 'react';
import { useTransaction } from '../context/TransactionContext';
import type { PipelineStatus } from '../context/TransactionContext';
import { 
  User, ShieldCheck, Globe, Server, CheckCircle2
} from 'lucide-react';

interface Stage {
  name: string;
  label: string;
  icon: React.ReactNode;
  statuses: PipelineStatus[];
}

export const TransactionPipeline: React.FC = () => {
  const { pipelineStatus } = useTransaction();

  // Define 5 simplified network gateway checkpoints
  const stages: Stage[] = [
    {
      name: 'Customer',
      label: 'Customer (Auth)',
      icon: <User className="h-4 w-4" />,
      statuses: ['AUTHENTICATING']
    },
    {
      name: 'BankA',
      label: 'JPMorgan (TLS)',
      icon: <ShieldCheck className="h-4 w-4" />,
      statuses: ['TLS_HANDSHAKE', 'TLS_ESTABLISHED']
    },
    {
      name: 'Internet',
      label: 'Internet Route',
      icon: <Globe className="h-4 w-4" />,
      statuses: ['KEY_EXCHANGE', 'DERIVING_KEY', 'ENCRYPTING', 'SIGNING', 'TRANSMITTING']
    },
    {
      name: 'BankB',
      label: 'HDFC (Gateway)',
      icon: <Server className="h-4 w-4" />,
      statuses: ['VERIFYING_SIGNATURE', 'DECRYPTING']
    },
    {
      name: 'Receiver',
      label: 'Crediting Balance',
      icon: <CheckCircle2 className="h-4 w-4" />,
      statuses: ['SETTLING', 'COMPLETED']
    }
  ];

  // Helper function to check if a stage is pending, active, or complete
  const getStageState = (index: number): 'pending' | 'active' | 'completed' | 'failed' => {
    if (pipelineStatus === 'FAILED') {
      // Find where it failed based on current index
      const activeIndex = stages.findIndex(s => s.statuses.includes(pipelineStatus));
      if (index === activeIndex) return 'failed';
    }
    
    // Find active stage index
    const activeIndex = stages.findIndex(s => s.statuses.includes(pipelineStatus));
    
    if (pipelineStatus === 'COMPLETED') {
      return 'completed';
    }

    if (activeIndex === -1) {
      return index === 0 && pipelineStatus !== 'PENDING' ? 'active' : 'pending';
    }

    if (index < activeIndex) return 'completed';
    if (index === activeIndex) return 'active';
    return 'pending';
  };

  return (
    <div className="w-full select-none">
      {/* Horizontal Flex Grid Wrapper */}
      <div className="flex flex-col md:flex-row items-center justify-between w-full max-w-3xl mx-auto px-4 md:space-y-0 space-y-4">
        {stages.map((stage, idx) => {
          const state = getStageState(idx);
          
          let circleColor = 'border-slate-200 bg-white text-slate-400';
          let textColor = 'text-slate-400';
          let lineBg = 'bg-slate-200';
          
          if (state === 'completed') {
            circleColor = 'border-emerald-500 bg-emerald-50 text-emerald-600 shadow-sm shadow-emerald-500/10';
            textColor = 'text-emerald-700 font-semibold';
            lineBg = 'bg-emerald-500';
          } else if (state === 'active') {
            circleColor = 'border-blue-600 bg-blue-50 text-blue-600 shadow-md shadow-blue-500/20 scale-110 ring-4 ring-blue-500/10 animate-pulse';
            textColor = 'text-blue-700 font-extrabold';
            lineBg = 'bg-slate-200';
          } else if (state === 'failed') {
            circleColor = 'border-rose-500 bg-rose-50 text-rose-600 shadow-sm animate-bounce';
            textColor = 'text-rose-700 font-bold';
            lineBg = 'bg-slate-200';
          }

          return (
            <React.Fragment key={stage.name}>
              {/* Stepper Node */}
              <div className="flex flex-row md:flex-col items-center md:space-y-2 md:space-x-0 space-x-3 w-full md:w-auto">
                <div className={`h-9 w-9 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${circleColor}`}>
                  {state === 'completed' && stage.name !== 'Receiver' ? <CheckCircle2 className="h-4 w-4" /> : stage.icon}
                </div>
                <div className="md:text-center text-left">
                  <p className={`text-[10px] uppercase tracking-wider ${textColor}`}>{stage.label}</p>
                </div>
              </div>

              {/* Connecting line (Only between nodes, hidden on last item) */}
              {idx < stages.length - 1 && (
                <div className="hidden md:block flex-1 h-0.5 mx-2 relative min-w-[30px]">
                  <div className={`absolute inset-0 transition-colors duration-500 ${lineBg}`} />
                  {state === 'completed' && (
                    <div className="absolute top-[-2px] left-0 h-1.5 w-1.5 rounded-full bg-emerald-600 animate-ping" />
                  )}
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
export default TransactionPipeline;
