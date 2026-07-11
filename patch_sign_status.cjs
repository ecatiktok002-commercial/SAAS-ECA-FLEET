const fs = require('fs');
let content = fs.readFileSync('pages/digital-forms/SignAgreement.tsx', 'utf8');

const search = `      // Follow original rule: once signed, it is completed
      const finalStatus = 'completed';`;

const replace = `      // Determine status based on payment receipt
      const hasReceipt = !!agreement.payment_receipt && agreement.payment_receipt !== '[]' && agreement.payment_receipt !== 'null';
      const finalStatus = hasReceipt ? 'completed' : 'signed';`;

if (content.indexOf(search) !== -1) {
    content = content.replace(search, replace);
    fs.writeFileSync('pages/digital-forms/SignAgreement.tsx', content);
    console.log("Replaced sign status logic successfully");
} else {
    console.log("Could not find search string in SignAgreement.tsx");
}
