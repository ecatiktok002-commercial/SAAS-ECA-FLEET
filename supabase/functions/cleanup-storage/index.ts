import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const results = { agreements: 0, handovers: 0, filesDeleted: 0 };

    // --- 1. CLEANUP AGREEMENTS (7 Days) ---
    const agreementCutoff = new Date();
    agreementCutoff.setDate(agreementCutoff.getDate() - 7);
    
    const { data: agRecords } = await supabase
      .from('agreements')
      .select('id, photos_url')
      .eq('status', 'completed')
      .lt('end_date', agreementCutoff.toISOString())
      .not('photos_url', 'is', null);

    if (agRecords) {
      for (const rec of agRecords) {
        const count = await processWipe(supabase, rec.photos_url, 'agreements', rec.id);
        if (count >= 0) { results.agreements++; results.filesDeleted += count; }
      }
    }

    // --- 2. CLEANUP HANDOVERS (14 Days + No Disputes) ---
    const handoverCutoff = new Date();
    handoverCutoff.setDate(handoverCutoff.getDate() - 14); // Changed to 14 as per your request

    const { data: hoRecords } = await supabase
      .from('handover_records')
      .select(`
        id, photos_url, is_disputed,
        bookings!inner ( actual_end_time )
      `)
      .lt('bookings.actual_end_time', handoverCutoff.toISOString()) // Matches your schema column
      .eq('is_disputed', false) // THE DISPUTE SHIELD
      .not('photos_url', 'is', null);

    if (hoRecords) {
      for (const rec of hoRecords) {
        const count = await processWipe(supabase, rec.photos_url, 'handover_records', rec.id);
        if (count >= 0) { results.handovers++; results.filesDeleted += count; }
      }
    }

    return new Response(JSON.stringify(results), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});

async function processWipe(supabase: any, photos: any, table: string, id: string): Promise<number> {
  try {
    let paths: string[] = [];
    if (Array.isArray(photos)) {
      paths = photos.map((url: string) => extractPath(url)).filter(Boolean) as string[];
    } else if (typeof photos === 'string') {
      const path = extractPath(photos);
      if (path) paths.push(path);
    }

    if (paths.length > 0) {
      await supabase.storage.from('handover_images').remove(paths);
    }
    await supabase.from(table).update({ photos_url: null }).eq('id', id);
    return paths.length;
  } catch { return -1; }
}

function extractPath(url: string): string | null {
  if (!url) return null;
  const parts = url.split('/handover_images/');
  if (parts.length > 1) {
    const pathWithToken = parts[1];
    return decodeURIComponent(pathWithToken.split('?')[0]);
  }
  return null;
}