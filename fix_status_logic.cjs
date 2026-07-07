const fs = require('fs');

// 1. Fix SignAgreement.tsx
let signContent = fs.readFileSync('pages/digital-forms/SignAgreement.tsx', 'utf8');
const signTargetStr = `      // Determine if it should be completed based on payment receipt
      const hasReceipt = !!agreement?.payment_receipt && agreement.payment_receipt !== '[]' && agreement.payment_receipt !== 'null';
      const finalStatus = hasReceipt ? 'completed' : 'signed';`;
const signNewStr = `      // Follow original rule: once signed, it is completed
      const finalStatus = 'completed';`;
signContent = signContent.replace(signTargetStr, signNewStr);
fs.writeFileSync('pages/digital-forms/SignAgreement.tsx', signContent);

// 2. Fix apiService.ts
let apiContent = fs.readFileSync('services/apiService.ts', 'utf8');
const apiTargetBlock = `      // ROLLBACK & RESTORE LOGIC FOR PAYMENT RECEIPTS:
      const isRemovingReceipt = finalUpdates.payment_receipt === null || finalUpdates.payment_receipt === '' || finalUpdates.payment_receipt === '[]' || finalUpdates.payment_receipt === 'null';
      const isAddingReceipt = finalUpdates.payment_receipt && finalUpdates.payment_receipt !== '' && finalUpdates.payment_receipt !== '[]' && finalUpdates.payment_receipt !== 'null';

      if (isRemovingReceipt && currentStatus === 'completed') {
        // Downgrade to 'signed' if receipt is removed from a completed agreement
        finalUpdates.status = 'signed';
      } else if (isAddingReceipt && currentStatus === 'signed') {
        // If adding a receipt back to a signed agreement, mark as completed
        finalUpdates.status = 'completed';
      }

      // Ensure we don't set status to 'completed' if there is no valid receipt
      if (finalUpdates.status === 'completed') {
        const receiptToCheck = finalUpdates.payment_receipt !== undefined ? finalUpdates.payment_receipt : currentAgreement?.payment_receipt;
        const hasValidReceipt = !!receiptToCheck && receiptToCheck !== '' && receiptToCheck !== '[]' && receiptToCheck !== 'null';
        if (!hasValidReceipt) {
          finalUpdates.status = 'signed';
        }
      }`;
apiContent = apiContent.replace(apiTargetBlock, `      // Original rule: we don't strictly downgrade to signed based on IC/License or Receipt absence anymore.`);
fs.writeFileSync('services/apiService.ts', apiContent);

// 3. Fix AgreementDashboard.tsx frontend filters to align with original rule
let dashContent = fs.readFileSync('pages/digital-forms/AgreementDashboard.tsx', 'utf8');
dashContent = dashContent.replace(/const isPaid = hasReceipt;/g, "const isPaid = true; // Original rule doesn't mandate receipt for completed");
dashContent = dashContent.replace(/isSigned && !isPaid/g, "status === 'signed'"); // for pending/signed filter
dashContent = dashContent.replace(/isSigned && isPaid/g, "status === 'completed'"); 
fs.writeFileSync('pages/digital-forms/AgreementDashboard.tsx', dashContent);

console.log("Patched status logic.");
