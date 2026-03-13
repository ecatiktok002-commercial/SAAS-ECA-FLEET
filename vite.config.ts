
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, (process as any).cwd(), '');

  // Helper to check various naming conventions
  const getEnvVar = (names: string[]) => {
    for (const name of names) {
      if (env[name]) return env[name];
      if ((process.env as any)[name]) return (process.env as any)[name];
    }
    return undefined; 
  };

  // Resolve Supabase Key: Check specific Supabase keys first.
  // REMOVED generic API_KEY/VITE_API_KEY to avoid conflict with AI service keys.
  // REMOVED service keys to prevent accidental exposure.
  const supabaseKey = getEnvVar([
    'VITE_SUPABASE_ANON_KEY',
    'SUPABASE_ANON_KEY',
    'VITE_SUPABASE_KEY',
    'SUPABASE_KEY'
  ]);

  // Resolve Supabase URL
  const supabaseUrl = getEnvVar([
    'VITE_SUPABASE_URL',
    'SUPABASE_URL'
  ]);

  // Generic API Key (for other services if needed)
  const apiKey = getEnvVar(['API_KEY', 'VITE_API_KEY']);

  return {
    plugins: [react()],
    // Explicitly define process.env variables so they get replaced by actual values during build
    define: {
      'process.env.SUPABASE_ANON_KEY': JSON.stringify(supabaseKey || ''),
      'process.env.SUPABASE_URL': JSON.stringify(supabaseUrl || ''),
      'process.env.API_KEY': JSON.stringify(apiKey || ''),
    },
    server: {
      port: 3000,
    },
    build: {
      outDir: 'dist',
    }
  };
});
