const fs = require('fs');
let content = fs.readFileSync('services/apiService.ts', 'utf8');

const revokeStr = `
  async revokeAuditRecord(formId: string, bookingId: string | null, subscriberId: string): Promise<void> {
    const targetSubscriberId = await getTenantId();
    return withRetry(async () => {
      // Revert Agreement
      const { error: formError } = await supabase
        .from('agreements')
        .update({ 
          payout_status: 'pending_review', 
          is_receipt_verified: false
        })
        .eq('id', formId)
        .eq('subscriber_id', targetSubscriberId);
      
      if (formError) {
        logSupabaseError('revokeAuditRecord:form', formError);
        throw new Error('Failed to revoke agreement payout status');
      }
    });
  },
`;

content = content.replace(
  "async approveAuditRecord(", 
  revokeStr + "\n  async approveAuditRecord("
);
fs.writeFileSync('services/apiService.ts', content);
