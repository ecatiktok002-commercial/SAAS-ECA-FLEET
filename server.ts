import express from 'express';
import { createServer as createViteServer } from 'vite';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Supabase Admin Client
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase environment variables');
  }

  const supabaseAdmin = createClient(supabaseUrl || '', supabaseServiceKey || '', {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  // API Routes
  app.post('/api/provision-subscriber', async (req, res) => {
    const { email, companyName, tier, isTrial, expiryDate } = req.body;

    if (!email || !companyName || !tier) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const password = email.split('@')[0];

    try {
      // Step A: Create the user account in Supabase Auth
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { company_name: companyName }
      });

      if (authError) {
        console.error('Auth Error:', authError);
        return res.status(400).json({ error: authError.message });
      }

      const userId = authData.user.id;

      // Step B: Database Sync - Insert into subscribers table
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
        console.error('DB Error:', dbError);
        // Rollback: Delete the auth user if DB insert fails
        await supabaseAdmin.auth.admin.deleteUser(userId);
        return res.status(400).json({ error: dbError.message });
      }

      res.json({ 
        success: true, 
        subscriberId: userId,
        email,
        password,
        message: `Subscriber ${password} provisioned successfully.`
      });

    } catch (err: any) {
      console.error('Provisioning Error:', err);
      res.status(500).json({ error: err.message || 'Internal server error' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
