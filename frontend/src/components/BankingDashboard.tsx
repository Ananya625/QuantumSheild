import React, { useEffect } from 'react';
import { useTransaction } from '../context/TransactionContext';
import { LogOut, ArrowRightLeft, CreditCard, Clock, TrendingDown, TrendingUp } from 'lucide-react';

interface BankingDashboardProps {
  party: 'A' | 'B';
}

export const BankingDashboard: React.FC<BankingDashboardProps> = ({ party }) => {
  const { 
    usernameA, accountNumberA, balanceA, historyA, setScreenA, logoutA, fetchAccountDataA,
    usernameB, accountNumberB, balanceB, historyB, logoutB, fetchAccountDataB
  } = useTransaction();

  // Bind values based on party
  const isA = party === 'A';
  const username = isA ? usernameA : usernameB;
  const accountNumber = isA ? accountNumberA : accountNumberB;
  const balance = isA ? balanceA : balanceB;
  const history = isA ? historyA : historyB;
  const logout = isA ? logoutA : logoutB;
  const fetchAccountData = isA ? fetchAccountDataA : fetchAccountDataB;
  const setScreen = isA ? setScreenA : undefined;

  useEffect(() => {
    fetchAccountData();
  }, [fetchAccountData]);

  return (
    <div className="bg-slate-50 min-h-screen flex flex-col font-sans select-none w-full">
      {/* Banking Navbar */}
      <nav className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-2">
          <div className={`p-1.5 rounded-lg text-white ${isA ? 'bg-blue-600' : 'bg-teal-600'}`}>
            <ArrowRightLeft className="h-4.5 w-4.5" />
          </div>
          <span className="font-extrabold text-sm tracking-tight text-slate-900">
            {isA ? 'JPMorgan Retail Portal' : 'HDFC Retail Portal'}
          </span>
        </div>
        <div className="flex items-center space-x-3">
          <div className="text-right">
            <p className="text-[10px] text-slate-500 font-medium">Account User</p>
            <p className="text-xs font-semibold text-slate-800">{username}</p>
          </div>
          <button
            onClick={logout}
            className="text-slate-400 hover:text-rose-600 p-1.5 hover:bg-slate-50 rounded-lg transition duration-200"
            title="Log Out"
          >
            <LogOut className="h-4.5 w-4.5" />
          </button>
        </div>
      </nav>

      {/* Main dashboard content */}
      <div className="w-full px-4 py-6 space-y-5">
        
        {/* Balance Card */}
        <div className={`rounded-xl p-5 text-white shadow-md relative overflow-hidden bg-gradient-to-br ${
          isA ? 'from-blue-600 to-indigo-700' : 'from-teal-600 to-cyan-700'
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
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <button
              onClick={() => setScreen('TRANSFER')}
              className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold py-2.5 px-4 rounded-lg shadow-sm transition duration-200 text-center flex items-center justify-center gap-1.5 text-xs"
            >
              <ArrowRightLeft className="h-4 w-4" />
              Transfer Funds to Bob (HDFC)
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
    </div>
  );
};
export default BankingDashboard;
