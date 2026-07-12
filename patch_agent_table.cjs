const fs = require('fs');
let content = fs.readFileSync('pages/AgentDashboard.tsx', 'utf8');

const search = `        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <DollarSign className="w-5 h-5 text-emerald-600" />
              <h2 className="font-bold text-slate-900 uppercase tracking-tight">Recent Earnings Table</h2>
            </div>
            <Link to="/agreements" className="text-sm font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1">
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-widest">
                <tr>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Vehicle</th>
                  <th className="px-6 py-4 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentAgreements.length > 0 ? recentAgreements.map((agreement) => (
                  <tr key={agreement.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {formatInMYT(new Date(agreement.created_at).getTime(), 'dd/MM/yyyy')}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-900">
                      {agreement.customer_name}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {agreement.car_plate_number || agreement.car_model}
                    </td>
                    <td className="px-6 py-4 text-sm font-black text-emerald-600 text-right">
                      {currencyFormatter.format(Number(agreement.total_price) || 0)}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-slate-500 italic">
                      No transactions found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>`;

if (content.indexOf(search) !== -1) {
    content = content.replace(search, '');
    fs.writeFileSync('pages/AgentDashboard.tsx', content);
    console.log("Patched AgentDashboard.tsx successfully");
} else {
    console.log("Could not find the target table string");
}
