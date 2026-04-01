import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get the service role key from environment variables
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Parse request body
    const { uid, subscriber_id, pin_code } = await req.json()

    if (!uid || !subscriber_id || !pin_code) {
      throw new Error('Missing uid, subscriber_id, or pin_code')
    }

    // 🔐 --- NEW SECURITY GATE --- 🔐
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Missing Authorization header')
    const token = authHeader.replace('Bearer ', '')

    // Ask Supabase to verify who owns this token
    const { data: { user: caller }, error: callerError } = await supabaseAdmin.auth.getUser(token)
    if (callerError || !caller) throw new Error('Invalid or expired token')

    // Only allow Master Admin OR the Owner of the specific subscriber_id
    const isSuperAdmin = caller.email === 'superadmin@ecafleet.com'
    const isOwner = caller.id === subscriber_id

    if (!isSuperAdmin && !isOwner) {
      throw new Error('Forbidden: You can only provision staff for your own company.')
    }
    // 🔐 --- END SECURITY GATE --- 🔐

    const email = `${uid}@ecafleet.com`
    // Secure the password by combining it with a system salt and their PIN
    const password = `EcaFleet!${uid}${pin_code}`

    // 1. Check if user already exists in Auth
    const { data: userList, error: listError } = await supabaseAdmin.auth.admin.listUsers()
    if (listError) throw listError

    let user = userList.users.find(u => u.email === email)

    if (!user) {
      // 2. Create user if not exists
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { 
          role: 'staff',
          subscriber_id: subscriber_id,
          designated_uid: uid
        }
      })
      if (createError) throw createError
      user = newUser.user
    } else {
      // 3. Update existing user metadata just in case
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
        user_metadata: { 
          role: 'staff',
          subscriber_id: subscriber_id,
          designated_uid: uid
        }
      })
      if (updateError) throw updateError
    }

    return new Response(
      JSON.stringify({ user }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})
