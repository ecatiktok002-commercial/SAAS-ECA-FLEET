const fs = require('fs');
let content = fs.readFileSync('pages/AuditPayoutManagement.tsx', 'utf8');

const thToReplace = '<th className="py-3 px-4 text-center">Action</th>';
const newTh = '{activeTab !== \'history\' && <th className="py-3 px-4 text-center">Action</th>}';
content = content.replace(thToReplace, newTh);

const tdToReplace = `<td className="py-3 px-4 text-center">
        <button
          onClick={() => handleRevoke(r)}
          disabled={!!processing}
          title="Revoke Approval"
          className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50 inline-flex items-center justify-center"
        >
          {processing === r.form_id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Undo className="w-4 h-4" />}
        </button>
      </td>`;

const newTd = `{activeTab !== 'history' && (
      <td className="py-3 px-4 text-center">
        <button
          onClick={() => handleRevoke(r)}
          disabled={!!processing}
          title="Revoke Approval"
          className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50 inline-flex items-center justify-center"
        >
          {processing === r.form_id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Undo className="w-4 h-4" />}
        </button>
      </td>
      )}`;

content = content.replace(tdToReplace, newTd);

fs.writeFileSync('pages/AuditPayoutManagement.tsx', content);
