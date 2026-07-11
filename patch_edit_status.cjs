const fs = require('fs');
let content = fs.readFileSync('pages/digital-forms/EditAgreement.tsx', 'utf8');

const search = `      if (receiptData !== undefined) {
        updates.payment_receipt = receiptData;
        updates.updated_at = getNowMYT().toISOString();
      }`;

const replace = `      if (receiptData !== undefined) {
        updates.payment_receipt = receiptData;
        updates.updated_at = getNowMYT().toISOString();
        
        // Auto-update status based on receipt presence
        const hasReceipt = !!receiptData && receiptData !== '[]' && receiptData !== 'null';
        const currentStatus = agreement.status?.toLowerCase().trim();
        
        if (hasReceipt && currentStatus === 'signed') {
          updates.status = 'completed';
        } else if (!hasReceipt && currentStatus === 'completed') {
          // If receipt is removed and it was completed, revert to signed (if it has signature) or pending
          updates.status = agreement.signature_data ? 'signed' : 'pending';
        }
      }`;

if (content.indexOf(search) !== -1) {
    content = content.replace(search, replace);
    fs.writeFileSync('pages/digital-forms/EditAgreement.tsx', content);
    console.log("Replaced edit status logic successfully");
} else {
    console.log("Could not find search string in EditAgreement.tsx");
}
