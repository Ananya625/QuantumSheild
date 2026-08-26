import React, { useEffect } from 'react';
import { useTransaction } from '../context/TransactionContext';
import { ArrowRightLeft, CreditCard, Clock, TrendingDown, TrendingUp, RefreshCw, CheckCircle2 } from 'lucide-react';

interface BankingDashboardProps {
  party: 'A' | 'B';
}

export const BankingDashboard: React.FC<BankingDashboardProps> = ({ party }) => {
  const { 
    accountNumberA, balanceA, historyA, setScreenA, fetchAccountDataA,
    accountNumberB, balanceB, historyB, fetchAccountDataB,
    pipelineStatus, crypto
  } = useTransaction();

  // Bind values based on party
  const isA = party === 'A';
  const accountNumber = isA ? accountNumberA : accountNumberB;
  const balance = isA ? balanceA : balanceB;
  const history = isA ? historyA : historyB;
  const fetchAccountData = isA ? fetchAccountDataA : fetchAccountDataB;
  const setScreen = isA ? setScreenA : undefined;

  useEffect(() => {
    fetchAccountData();
  }, [fetchAccountData]);

  return (
    <div className="w-full p-4 space-y-5 select-none font-sans">
      
      {/* Bob's Live Incoming Transfer Alert (Progressive Notification with embedded Network Pipeline) */}
      {!isA && pipelineStatus !== 'PENDING' && pipelineStatus !== 'COMPLETED' && pipelineStatus !== 'FAILED' && (
        <div className="bg-amber-50 border border-amber-250 p-4 rounded-xl flex items-center space-x-3 text-amber-900 animate-pulse select-none">
          <RefreshCw className="h-4 w-4 text-amber-600 animate-spin shrink-0" />
          <div className="flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wider">Incoming Wire Transfer Routing</p>
            <p className="text-[9px] text-amber-750 leading-normal">
              JPMorgan is routing a secure wire transfer. Current status: <span className="font-mono font-bold text-amber-955">{pipelineStatus.replace('_', ' ')}</span>
            </p>
          </div>
        </div>
      )}

      {!isA && pipelineStatus === 'COMPLETED' && crypto.settlementDetails && (
        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex items-center space-x-3 text-emerald-950 select-none">
          <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 shrink-0 animate-bounce" />
          <div className="flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wider">Funds Credited Successfully</p>
            <p className="text-[9px] text-emerald-700 leading-normal">
              Received +${crypto.settlementDetails.amount_transferred?.toFixed(2)} from JPMorgan. Bob's ledger updated.
            </p>
          </div>
        </div>
      )}
      
      {/* Balance Card */}
      <div className={`rounded-xl p-5 text-white shadow-md relative overflow-hidden bg-gradient-to-br ${
        isA ? 'from-[#98144D] to-[#5d0c2f]' : 'from-[#98144D] to-[#5d0c2f]'
      }`}>
        <div className="absolute right-[-15px] bottom-[-15px] opacity-10 text-white pointer-events-none">
          <CreditCard className="h-28 w-28" />
        </div>
        
        <p className="text-[10px] text-blue-100 uppercase tracking-widest font-bold">Ledger Balance</p>
        <h3 className="text-2xl font-extrabold mt-1 tracking-tight">
          ${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </h3>
        
        <div className="mt-6 flex justify-between items-end">
          <div>
            <p className="text-[9px] text-blue-200 font-semibold uppercase tracking-wider">Account Number</p>
            <p className="font-mono text-xs tracking-wider font-medium mt-0.5">
              {accountNumber ? accountNumber.replace(/(.{4})/g, '$1 ') : '---'}
            </p>
          </div>
          <span className="text-[9px] bg-white/20 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Online</span>
        </div>
      </div>

      {/* Transfer Funds CTA (Only for Sender A) */}
      {isA && setScreen && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm font-sans">
          <button
            onClick={() => setScreen('TRANSFER')}
            className="w-full bg-[#98144D] hover:bg-[#700d36] active:bg-[#500925] text-white font-bold py-2.5 px-4 rounded-lg shadow-sm transition duration-200 text-center flex items-center justify-center gap-1.5 text-xs cursor-pointer"
          >
            <ArrowRightLeft className="h-4 w-4" />
            Transaction
          </button>
        </div>
      )}

      {/* Recent Transactions Log */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center space-x-1.5">
          <Clock className="h-4 w-4 text-slate-500" />
          <h4 className="font-bold text-xs text-slate-800 tracking-tight">Statement History</h4>
        </div>

        <div className="max-h-[220px] overflow-y-auto">
          {history.length === 0 ? (
            <div className="text-slate-400 text-[10px] text-center py-10 select-none">
              No transaction statements recorded.
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-[10px]">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100 text-slate-400 font-semibold select-none">
                  <th className="px-4 py-2">Date</th>
                  <th className="px-4 py-2">Memo</th>
                  <th className="px-4 py-2 text-right">Amount</th>
                  <th className="px-4 py-2 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600 font-medium">
                {history.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/30 transition-colors">
                    <td className="px-4 py-2.5 whitespace-nowrap text-slate-400 font-semibold">
                      {tx.date.substring(5)} {/* truncate year for space */}
                    </td>
                    <td className="px-4 py-2.5 text-slate-800 truncate max-w-[80px]" title={tx.description}>
                      {tx.description}
                    </td>
                    <td className="px-4 py-2.5 text-right whitespace-nowrap">
                      <span className={`font-bold flex items-center justify-end gap-0.5 ${
                        tx.type === 'CREDIT' ? 'text-emerald-600' : 'text-rose-600'
                      }`}>
                        {tx.type === 'CREDIT' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        {tx.type === 'CREDIT' ? '+' : '-'}${tx.amount.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-center">
                      <span className={`inline-flex items-center gap-0.5 text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase ${
                        tx.status === 'SUCCESS' || tx.status === 'COMPLETED' || tx.status === 'SETTLED'
                          ? 'bg-emerald-50 text-emerald-700' 
                          : tx.status === 'FAILED' 
                          ? 'bg-rose-50 text-rose-700' 
                          : 'bg-amber-50 text-amber-700'
                      }`}>
                        {tx.status === 'SUCCESS' || tx.status === 'COMPLETED' || tx.status === 'SETTLED' ? 'Settled' : tx.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>


      
    </div>
  );
};

export default BankingDashboard;
