const fs = require('fs');
let content = fs.readFileSync('pages/digital-forms/SignAgreement.tsx', 'utf8');

const targetStr = `      const signatureData = sigCanvas.current?.getCanvas().toDataURL('image/png');

      const now = getNowMYT();
      const signedAt = now.toISOString();
      
      // Determine if it should be completed based on payment receipt
      const hasReceipt = !!agreement?.payment_receipt && agreement.payment_receipt !== '[]' && agreement.payment_receipt !== 'null';
      const finalStatus = hasReceipt ? 'completed' : 'signed';
      
      await apiService.updateAgreement(id!, undefined, {
        status: finalStatus,
        signed_at: signedAt,
        signature_data: signatureData
      });`;

const newStr = `      const signatureBase64 = sigCanvas.current?.getCanvas().toDataURL('image/png');
      
      // Convert base64 to File
      const res = await fetch(signatureBase64!);
      const blob = await res.blob();
      const file = new File([blob], 'signature.png', { type: 'image/png' });
      
      const signatureData = await uploadAgreementImage(agreement.subscriber_id, file, 'signatures');

      const now = getNowMYT();
      const signedAt = now.toISOString();
      
      // Determine if it should be completed based on payment receipt
      const hasReceipt = !!agreement?.payment_receipt && agreement.payment_receipt !== '[]' && agreement.payment_receipt !== 'null';
      const finalStatus = hasReceipt ? 'completed' : 'signed';
      
      await apiService.updateAgreement(id!, undefined, {
        status: finalStatus,
        signed_at: signedAt,
        signature_data: signatureData
      });`;

content = content.replace(targetStr, newStr);
fs.writeFileSync('pages/digital-forms/SignAgreement.tsx', content);
