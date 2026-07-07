const fs = require('fs');
let content = fs.readFileSync('pages/digital-forms/SignAgreement.tsx', 'utf8');

const search = `              <div className="grid grid-cols-2 gap-x-4 gap-y-2 print:gap-1">
                <div>
                  <p className="text-[10px] print:text-[7pt] font-bold text-slate-500 uppercase tracking-wider">Name</p>
                  <p className="text-sm print:text-[9pt] font-medium text-slate-900">{agreement.customer_name}</p>
                </div>
                <div>
                  <p className="text-[10px] print:text-[7pt] font-bold text-slate-500 uppercase tracking-wider">IC / Passport</p>
                  <p className="text-sm print:text-[9pt] font-medium text-slate-900">{agreement.identity_number}</p>
                </div>
                <div>
                  <p className="text-[10px] print:text-[7pt] font-bold text-slate-500 uppercase tracking-wider">Phone</p>
                  <p className="text-sm print:text-[9pt] font-medium text-slate-900">{agreement.customer_phone || '-'}</p>
                </div>
                <div>
                  <p className="text-[10px] print:text-[7pt] font-bold text-slate-500 uppercase tracking-wider">Billing Address</p>
                  <p className="text-sm print:text-[9pt] font-medium text-slate-900 print:leading-tight">{agreement.billing_address}</p>
                </div>`;

const replace = `              <div className="grid grid-cols-2 gap-x-4 gap-y-2 print:gap-1">
                <div className="col-span-2">
                  <p className="text-[10px] print:text-[7pt] font-bold text-slate-500 uppercase tracking-wider">Name</p>
                  <p className="text-sm print:text-[9pt] font-medium text-slate-900">{agreement.customer_name}</p>
                </div>
                <div>
                  <p className="text-[10px] print:text-[7pt] font-bold text-slate-500 uppercase tracking-wider">IC / Passport</p>
                  <p className="text-sm print:text-[9pt] font-medium text-slate-900">{agreement.identity_number}</p>
                </div>
                <div>
                  <p className="text-[10px] print:text-[7pt] font-bold text-slate-500 uppercase tracking-wider">Phone</p>
                  <p className="text-sm print:text-[9pt] font-medium text-slate-900">{agreement.customer_phone || '-'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-[10px] print:text-[7pt] font-bold text-slate-500 uppercase tracking-wider">Billing Address</p>
                  <p className="text-sm print:text-[9pt] font-medium text-slate-900 print:leading-tight">{agreement.billing_address}</p>
                </div>`;

if (content.indexOf(search) === -1) {
    console.log("Could not find search string, maybe already replaced or spacing difference");
} else {
    content = content.replace(search, replace);
    fs.writeFileSync('pages/digital-forms/SignAgreement.tsx', content);
    console.log("Replaced successfully");
}
