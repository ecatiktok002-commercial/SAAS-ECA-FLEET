const fs = require('fs');

let content = fs.readFileSync('pages/AgentDashboard.tsx', 'utf8');

const actionQueueLogic = `
  const actionQueueTasks = useMemo(() => {
    if (!dashboardData) return [];
    const queue: any[] = [];
    
    // Priority 1: Overdue Returns
    dashboardData.overdueReturns.forEach(item => {
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
    dashboardData.pendingDeliveries.forEach(item => {
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
    dashboardData.unpaidForms.forEach(form => {
      queue.push({
        id: \`unpaid-\${form.id}\`,
        priority: 3,
        color: 'violet',
        icon: Receipt,
        title: \`Verify Payment Receipt for Customer \${form.customer_name || 'Unknown'}\`,
        subtitle: \`Form #\${form.reference_number || 'N/A'} - Total: \${currencyFormatter.format(Number(form.total_price) || 0)}\`,
        actionText: 'View Receipt',
        onClick: () => {
          setSelectedDigitalForm(form);
        }
      });
    });

    // Priority 4: Signature Pending
    dashboardData.unsignedForms.forEach(form => {
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

    return queue.sort((a, b) => a.priority - b.priority);
  }, [dashboardData, navigate]);

  return (
`;

content = content.replace('  return (', actionQueueLogic);

const startIndex = content.indexOf('{/* Enhanced Daily Mission Log & Action Center */}');
const endIndex = content.indexOf('{/* Financial & Commission Hub: My Pocket */}');

if (startIndex === -1 || endIndex === -1) {
  console.log("Sections not found!");
  process.exit(1);
}

const actionQueueUI = `
        {/* ACTION-QUEUE UX (Zero Cognitive Load) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600" /> Smart Action-Queue
              </h2>
              <p className="text-slate-500 text-sm mt-0.5">Your intelligent assistant. Tasks are sorted by priority automatically.</p>
            </div>
            <div className="bg-slate-900 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-sm">
              {actionQueueTasks.length} Task{actionQueueTasks.length !== 1 && 's'} Pending
            </div>
          </div>
          
          <div className="space-y-3">
            {actionQueueTasks.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center shadow-sm">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">All caught up!</h3>
                <p className="text-slate-500 mt-1">There are no pending actions in your queue.</p>
              </div>
            ) : (
              actionQueueTasks.map((task, index) => {
                const Icon = task.icon;
                const isTopTask = index === 0;
                
                // Colors based on priority
                const colorMap: any = {
                  rose: 'bg-rose-50 border-rose-200 text-rose-900',
                  blue: 'bg-blue-50 border-blue-200 text-blue-900',
                  violet: 'bg-violet-50 border-violet-200 text-violet-900',
                  amber: 'bg-amber-50 border-amber-200 text-amber-900'
                };
                
                const iconBgMap: any = {
                  rose: 'bg-rose-100 text-rose-600',
                  blue: 'bg-blue-100 text-blue-600',
                  violet: 'bg-violet-100 text-violet-600',
                  amber: 'bg-amber-100 text-amber-600'
                };

                const buttonMap: any = {
                  rose: 'bg-rose-600 hover:bg-rose-700 text-white',
                  blue: 'bg-blue-600 hover:bg-blue-700 text-white',
                  violet: 'bg-violet-600 hover:bg-violet-700 text-white',
                  amber: 'bg-amber-600 hover:bg-amber-700 text-white'
                };

                return (
                  <div 
                    key={task.id} 
                    className={\`rounded-2xl border \${isTopTask ? 'shadow-md border-indigo-200 bg-white ring-1 ring-indigo-100 scale-100' : 'shadow-sm bg-white/60 border-slate-200 scale-[0.99] opacity-80'} transition-all overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 gap-4\`}
                  >
                    <div className="flex items-start sm:items-center gap-4">
                      <div className={\`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 \${iconBgMap[task.color]}\`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <div>
                        {isTopTask && (
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-800 mb-1">
                            Focus Priority
                          </span>
                        )}
                        <h3 className={\`font-bold \${isTopTask ? 'text-lg text-slate-900' : 'text-base text-slate-700'}\`}>{task.title}</h3>
                        <p className={\`text-sm mt-0.5 \${isTopTask ? 'text-slate-600' : 'text-slate-500'}\`}>{task.subtitle}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 mt-2 sm:mt-0 shrink-0 self-start sm:self-auto">
                      {task.secondaryActionText && (
                        <button
                          onClick={task.secondaryOnClick}
                          className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm transition-colors shadow-xs cursor-pointer"
                        >
                          {task.secondaryActionText}
                        </button>
                      )}
                      <button
                        onClick={task.onClick}
                        className={\`px-6 py-2.5 rounded-xl font-bold text-sm transition-colors shadow-sm cursor-pointer \${buttonMap[task.color]}\`}
                      >
                        {task.actionText}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

`;

content = content.substring(0, startIndex) + actionQueueUI + content.substring(endIndex);

fs.writeFileSync('pages/AgentDashboard.tsx', content);
console.log('Successfully patched AgentDashboard.tsx');
