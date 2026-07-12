const fs = require('fs');
let content = fs.readFileSync('pages/AuditPayoutManagement.tsx', 'utf8');

const search = `        // Ensure commissions are up-to-date before fetching
        await apiService.recalculateAllCommissions(subscriberId!);
        
        const [auditData, historyData] = await Promise.all([`;

const replace = `        // Run commission recalculation in the background without blocking the UI
        apiService.recalculateAllCommissions(subscriberId!).catch(err => 
          console.error('Background recalculation failed:', err)
        );
        
        const [auditData, historyData] = await Promise.all([`;

if (content.indexOf(search) !== -1) {
    content = content.replace(search, replace);
    fs.writeFileSync('pages/AuditPayoutManagement.tsx', content);
    console.log("Patched AuditPayoutManagement.tsx for performance");
} else {
    console.log("Could not find the target code to patch");
}
