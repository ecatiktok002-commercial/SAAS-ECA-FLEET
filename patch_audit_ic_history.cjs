const fs = require('fs');
let content = fs.readFileSync('pages/AuditPayoutManagement.tsx', 'utf8');

const search = `                          {r.payment_receipt ? (
                            <button
                              onClick={async () => {
                                try {
                                  const toastId = toast.loading('Loading receipt...');
                                  const fullAgreement = await apiService.getAgreementById(r.form_id, subscriberId!);`;

const replace = `                          <div className="flex items-center gap-2">
                          {r.payment_receipt ? (
                            <button
                              onClick={async () => {
                                try {
                                  const toastId = toast.loading('Loading receipt...');
                                  const fullAgreement = await apiService.getAgreementById(r.form_id, subscriberId!);`;

if (content.indexOf(search) !== -1) {
    console.log("Found history search string");
} else {
    console.log("Could not find history search string");
}
