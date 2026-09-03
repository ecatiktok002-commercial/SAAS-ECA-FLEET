const fs = require('fs');
let content = fs.readFileSync('pages/AuditPayoutManagement.tsx', 'utf8');

// Ensure Undo is imported
if (!content.includes('Undo,')) {
    content = content.replace("from 'lucide-react';", "Undo, from 'lucide-react';".replace(", from", " from"));
}

// Add handleRevoke method
const handleRevokeCode = `
  const handleRevoke = async (record: AuditRecord) => {
    if (!subscriberId) return;
    
    // Optimistic UI update
    setProcessing(record.form_id);
    
    try {
      await apiService.revokeAuditRecord(record.form_id, record.booking_id || null, subscriberId);
      toast.success(\`Reverted \${record.reference_number || 'booking'} to pending\`);
      
      // We need to refresh the current tab data
      fetchRecords();
      
      // Update selectedAgentBookings to remove it
      setSelectedAgentBookings(prev => {
        if (!prev) return prev;
        const newRecords = prev.records.filter(r => r.form_id !== record.form_id);
        if (newRecords.length === 0) return null; // close modal if empty
        
        // Recalculate totals
        const newBookings = newRecords.length;
        const newRevenue = newRecords.reduce((sum, r) => sum + (Number(r.form_price) || 0), 0);
        return {
          ...prev,
          total_bookings: newBookings,
          total_revenue: newRevenue,
          records: newRecords
        };
      });
      
    } catch (error) {
      console.error("Error revoking record:", error);
      toast.error("Failed to revoke record");
    } finally {
      setProcessing(null);
    }
  };
`;

// Insert the method right before handleOverride
if (!content.includes('const handleRevoke = async')) {
    content = content.replace("const handleOverride =", handleRevokeCode + "\n  const handleOverride =");
}

// Update the table header
const headerRegex = /<th className="py-3 px-4 text-right">Commission<\/th>\s*<\/tr>/;
content = content.replace(headerRegex, 
  '<th className="py-3 px-4 text-right">Commission</th>\n                      <th className="py-3 px-4 text-center">Action</th>\n                    </tr>'
);

// Update the table row
const rowRegex = /<td className="py-3 px-4 text-right font-bold text-emerald-600">\s*RM \{\(Number\(r\.commission_earned\)[^<]*<\/td>\s*<\/tr>/;
const match = content.match(rowRegex);
if (match) {
    const replacement = match[0].replace('</tr>', 
      `<td className="py-3 px-4 text-center">
        <button
          onClick={() => handleRevoke(r)}
          disabled={!!processing}
          title="Revoke Approval"
          className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50 inline-flex items-center justify-center"
        >
          {processing === r.form_id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Undo className="w-4 h-4" />}
        </button>
      </td>
      </tr>`
    );
    content = content.replace(rowRegex, replacement);
}

fs.writeFileSync('pages/AuditPayoutManagement.tsx', content);
