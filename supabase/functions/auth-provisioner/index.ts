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
