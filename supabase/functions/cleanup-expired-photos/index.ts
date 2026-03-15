import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Environment Variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 7);
    const cutoffIso = cutoffDate.toISOString();

    console.log(`[Cleanup] Starting cleanup for agreements older than ${cutoffIso}`);

    const { data: records, error: fetchError } = await supabase
      .from('agreements')
      .select('id, photos_url')
      .eq('status', 'completed')
      .lt('end_date', cutoffIso)
      .not('photos_url', 'is', null);

    if (fetchError) {
      throw new Error(`Fetch Error: ${fetchError.message}`);
    }

    if (!records || records.length === 0) {
      console.log('[Cleanup] No records found eligible for cleanup.');
      return new Response(JSON.stringify({ message: 'No records to clean.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[Cleanup] Found ${records.length} records to process.`);

    const results = {
      processed: 0,
      errors: 0,
      filesDeleted: 0,
    };

    for (const record of records) {
      try {
        const photos = record.photos_url;
        let pathsToDelete: string[] = [];

        if (Array.isArray(photos)) {
          pathsToDelete = photos.map((url: string) => extractPathFromUrl(url)).filter(Boolean) as string[];
        } else if (typeof photos === 'string') {
          try {
             const parsed = JSON.parse(photos);
             if (Array.isArray(parsed)) {
               pathsToDelete = parsed.map((url: string) => extractPathFromUrl(url)).filter(Boolean) as string[];
             } else {
               const path = extractPathFromUrl(photos);
               if (path) pathsToDelete.push(path);
             }
          } catch {
             const path = extractPathFromUrl(photos);
             if (path) pathsToDelete.push(path);
          }
        }

        if (pathsToDelete.length > 0) {
          const { data: storageData, error: storageError } = await supabase
            .storage
            .from('handover_images')
            .remove(pathsToDelete);

          if (storageError) {
            console.error(`[Cleanup] Storage Delete Error for Record ${record.id}:`, storageError);
          } else {
            results.filesDeleted += pathsToDelete.length;
          }
        }

        const { error: updateError } = await supabase
          .from('agreements')
          .update({ photos_url: null })
          .eq('id', record.id);

        if (updateError) {
          console.error(`[Cleanup] DB Update Error for Record ${record.id}:`, updateError);
          results.errors++;
        } else {
          results.processed++;
        }

      } catch (err) {
        console.error(`[Cleanup] Unexpected Error processing record ${record.id}:`, err);
        results.errors++;
      }
    }

    console.log(`[Cleanup] Completed. Processed: ${results.processed}, Files Deleted: ${results.filesDeleted}, Errors: ${results.errors}`);

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error('[Cleanup] Fatal Error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function extractPathFromUrl(url: string): string | null {
  if (!url) return null;
  const parts = url.split('/handover_images/');
  if (parts.length > 1) {
    return decodeURIComponent(parts[1]);
  }
  return null;
}
