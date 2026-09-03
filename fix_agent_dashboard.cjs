const fs = require('fs');

let content = fs.readFileSync('pages/AgentDashboard.tsx', 'utf8');

// The actionQueueTasks logic
const actionQueueTasksLogic = `
  const actionQueueTasks = useMemo(() => {
    if (!dashboardData) return [];
    const queue: any[] = [];
    
    // Priority 1: Overdue Returns
    dashboardData.overdueReturns.forEach((item: any) => {
      queue.push({
        id: \`overdue-\${item.id}\`,
        priority: 1,
        color: 'rose',
        icon: Clock,
        title: \`Action Required: Vehicle \${item.carPlate} is overdue for return!\`,
        subtitle: \`Customer: \${item.customerName} - \${formatTimeDiff(item.returnTime).toUpperCase()} LATE\`,
        actionText: 'Ping Customer',
        onClick: () => {
          window.open(\`https://wa.me/?text=Hello \${item.customerName}, your vehicle \${item.carPlate} is overdue for return. Please contact us immediately.\`, '_blank');
        },
        secondaryActionText: 'Mark Returned',
        secondaryOnClick: () => {
          setConfirmReturnId(item.id);
        }
      });
    });

    // Priority 2: Pending Deliveries (Pickups)
    dashboardData.pendingDeliveries.forEach((item: any) => {
      queue.push({
        id: \`pickup-\${item.id}\`,
        priority: 2,
        color: 'blue',
        icon: ArrowRight,
        title: \`Vehicle \${item.carPlate} arriving for pickup\`,
        subtitle: \`Customer: \${item.customerName} - Scheduled: \${formatInMYT(item.pickupTime.getTime(), 'h:mm a')}\`,
        actionText: 'Start Handover',
        onClick: () => {
          navigate(\`/handover/\${item.id}\`);
        }
      });
    });

    // Priority 3: Payment Receipt Needed
    dashboardData.unpaidForms.forEach((form: any) => {
      queue.push({
        id: \`unpaid-\${form.id}\`,
        priority: 3,
        color: 'violet',
        icon: Receipt,
        title: \`Verify Payment Receipt for Customer \${form.customer_name || 'Unknown'}\`,
        subtitle: \`Form #\${form.reference_number || 'N/A'} - Total: \${currencyFormatter.format(Number(form.total_price) || 0)}\`,
        actionText: 'View Receipt',
        onClick: () => {
          navigate('/forms');
        }
      });
    });

    // Priority 4: Signature Pending
    dashboardData.unsignedForms.forEach((form: any) => {
      queue.push({
        id: \`unsigned-\${form.id}\`,
        priority: 4,
        color: 'amber',
        icon: FileSignature,
        title: \`Signature Pending for Customer \${form.customer_name || 'Unknown'}\`,
        subtitle: \`Form #\${form.reference_number || 'N/A'} - Total: \${currencyFormatter.format(Number(form.total_price) || 0)}\`,
        actionText: 'Ping Customer',
        onClick: () => {
          window.open(\`https://wa.me/?text=Hello \${form.customer_name}, please sign your rental agreement: \${window.location.origin}/forms/sign/\${form.id}\`, '_blank');
        }
      });
    });

    return queue.sort((a: any, b: any) => a.priority - b.priority);
  }, [dashboardData, navigate, currencyFormatter]);
`;

// Extract the mistakenly placed block (from line 98 to 174)
const brokenBlockRegex = /  const actionQueueTasks = useMemo\(\(\) => \{[\s\S]*?  return \(/;

const match = content.match(brokenBlockRegex);
if (match) {
  // Replace the broken block with the original `return () => clearInterval(timer);`
  content = content.replace(brokenBlockRegex, '    return () => clearInterval(timer);');
}

// Find the main return statement of AgentDashboard
const mainReturnRegex = /  return \(\s*<div className="min-h-screen bg-slate-50 p-4 md:p-8">/;

if (mainReturnRegex.test(content)) {
  content = content.replace(mainReturnRegex, actionQueueTasksLogic + '\\n  return (\\n    <div className="min-h-screen bg-slate-50 p-4 md:p-8">');
} else {
  console.log("Main return not found");
}

fs.writeFileSync('pages/AgentDashboard.tsx', content);
console.log('Fixed AgentDashboard.tsx');
