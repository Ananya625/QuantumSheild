import React, { useEffect } from 'react';
import { useTransaction } from '../context/TransactionContext';
import { LogOut, ArrowRightLeft, CreditCard, Clock, TrendingDown, TrendingUp } from 'lucide-react';

export const BankingDashboard: React.FC = () => {
  const { username, accountNumber, balance, history, setScreen, logout, fetchAccountData } = useTransaction();

  useEffect(() => {
    fetchAccountData();
  }, [fetchAccountData]);

  return (
    <div className="bg-slate-50 min-h-screen flex flex-col font-sans select-none">
      {/* Banking Navbar */}
      <nav className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-2.5">
          <div className="bg-blue-600 text-white p-2 rounded-xl">
            <ArrowRightLeft className="h-5 w-5" />
          </div>
          <span className="font-extrabold text-lg tracking-tight text-slate-900">Quantum Trust Retail</span>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <p className="text-xs text-slate-500 font-medium">Logged in as</p>
            <p className="text-sm font-semibold text-slate-800">{username}</p>
          </div>
          <button
            onClick={logout}
            className="text-slate-400 hover:text-rose-600 p-2 hover:bg-slate-50 rounded-xl transition duration-200"
            title="Log Out"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </nav>

      {/* Main dashboard content */}
      <div className="max-w-6xl mx-auto w-full px-6 py-8 grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Left Side: Balance Card and Quick Actions */}
        <div className="md:col-span-1 space-y-6">
          {/* Account Card */}
          <div className="bg-gradient-to-br from-blue-700 to-indigo-800 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
            <div className="absolute right-[-20px] bottom-[-20px] opacity-10 text-white pointer-events-none">
              <CreditCard className="h-40 w-40" />
            </div>
            
            <p className="text-xs text-blue-100 uppercase tracking-widest font-semibold">Primary Account</p>
            <h3 className="text-3xl font-extrabold mt-3 tracking-tight">${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
            
            <div className="mt-8 flex justify-between items-end">
              <div>
                <p className="text-[10px] text-blue-200 font-semibold uppercase tracking-wider">Account Number</p>
                <p className="font-mono text-sm tracking-wider font-medium mt-1">{accountNumber ? accountNumber.replace(/(.{4})/g, '$1 ') : '---'}</p>
              </div>
              <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Active</span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h4 className="font-bold text-sm text-slate-800 mb-4 tracking-tight">Quick Actions</h4>
            <button
              onClick={() => setScreen('TRANSFER')}
              className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold py-3 px-4 rounded-xl shadow-md shadow-blue-500/10 hover:shadow-blue-500/20 transition duration-200 text-center flex items-center justify-center gap-2"
            >
              <ArrowRightLeft className="h-4 w-4" />
              Transfer Funds
            </button>
          </div>
        </div>

        {/* Right Side: Recent Transactions Log */}
        <div className="md:col-span-2">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden h-full flex flex-col">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center space-x-2">
              <Clock className="h-5 w-5 text-slate-500" />
              <h4 className="font-bold text-sm text-slate-800 tracking-tight">Transaction Statement History</h4>
            </div>

            <div className="flex-1 min-h-[300px] overflow-y-auto">
              {history.length === 0 ? (
                <div className="text-slate-400 text-xs text-center py-20">
                  No transaction history recorded on this account ledger.
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100 text-slate-400 font-semibold select-none">
                      <th className="px-6 py-3.5">Date / Time</th>
                      <th className="px-6 py-3.5">Description</th>
                      <th className="px-6 py-3.5">Receiver / Sender</th>
                      <th className="px-6 py-3.5 text-right">Amount</th>
                      <th className="px-6 py-3.5 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-600 font-medium">
                    {history.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50/30 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-slate-400 font-semibold">{tx.date}</td>
                        <td className="px-6 py-4 text-slate-800">{tx.description}</td>
                        <td className="px-6 py-4">{tx.other_party}</td>
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <span className={`font-bold flex items-center justify-end gap-1 ${tx.type === 'CREDIT' ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {tx.type === 'CREDIT' ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                            {tx.type === 'CREDIT' ? '+' : '-'}${tx.amount.toFixed(2)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
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
    </div>
  );
};
export default BankingDashboard;
