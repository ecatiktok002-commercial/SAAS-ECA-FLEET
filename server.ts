import express from 'express';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Supabase Admin Client
  // Try both VITE_ and standard prefixes
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log('Initializing Supabase Admin with URL:', supabaseUrl ? 'Found' : 'Missing');
  console.log('Service Role Key:', supabaseServiceKey ? 'Found' : 'Missing');

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('CRITICAL: Missing Supabase environment variables for provisioning.');
  }

  let supabaseAdmin: any = null;
  
  try {
    if (supabaseUrl && supabaseServiceKey) {
      supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      });
    }
  } catch (err) {
    console.error('Failed to initialize Supabase Admin client:', err);
  }

  // API Routes
  app.post('/api/provision-subscriber', async (req, res) => {
    console.log('Received provisioning request:', req.body);
    const { email, companyName, tier, isTrial, expiryDate } = req.body;

    if (!email || !companyName || !tier) {
      return res.status(400).json({ error: 'Missing required fields (email, companyName, tier)' });
    }

    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Server configuration error: Supabase keys missing or invalid' });
    }

    const password = email.split('@')[0];

    try {
      // Step A: Create the user account in Supabase Auth
      console.log('Creating auth user for:', email);
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { company_name: companyName }
      });

      if (authError) {
        console.error('Auth Provisioning Error:', authError);
        return res.status(400).json({ error: authError.message });
      }

      const userId = authData.user.id;
      console.log('Auth user created successfully. ID:', userId);

      // Step B: Database Sync - Insert into subscribers table
      console.log('Inserting into subscribers table...');
      const { error: dbError } = await supabaseAdmin
        .from('subscribers')
        .insert([{ 
          id: userId, 
          name: companyName, 
          tier, 
          is_active: true, 
          status: 'ACTIVE', 
          is_trial: isTrial || false,
          expiry_date: expiryDate || null,
          subscription_start_date: new Date().toISOString()
        }]);

      if (dbError) {
        console.error('Database Sync Error:', dbError);
        // Rollback: Delete the auth user if DB insert fails
        console.log('Rolling back auth user creation...');
        await supabaseAdmin.auth.admin.deleteUser(userId);
        return res.status(400).json({ error: `Database error: ${dbError.message}` });
      }

      console.log('Provisioning complete for:', email);
      res.json({ 
        success: true, 
        subscriberId: userId,
        email,
        password,
        message: `Subscriber ${password} provisioned successfully.`
      });

    } catch (err: any) {
      console.error('Unexpected Provisioning Error:', err);
      res.status(500).json({ error: err.message || 'Internal server error during provisioning' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
