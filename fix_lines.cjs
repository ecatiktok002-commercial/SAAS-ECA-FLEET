const fs = require('fs');
let content = fs.readFileSync('pages/AgentDashboard.tsx', 'utf8');

// Fix line 100 duplicate
content = content.replace('    return () => clearInterval(timer);\n) => clearInterval(timer);\n  }, []);', '    return () => clearInterval(timer);\n  }, []);');

// Fix line 928 literal \n
content = content.replace('\\n  return (\\n    <div className="min-h-screen bg-slate-50 p-4 md:p-8">', '\n  return (\n    <div className="min-h-screen bg-slate-50 p-4 md:p-8">');

fs.writeFileSync('pages/AgentDashboard.tsx', content);
