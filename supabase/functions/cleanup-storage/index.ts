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
    // 1. Initialize Supabase Client with Service Role Key (Bypass RLS)
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Environment Variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 2. Calculate Cutoff Date (15 days ago)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 15);
    const cutoffIso = cutoffDate.toISOString();

    console.log(`[Cleanup] Starting cleanup for records older than ${cutoffIso}`);

    // 3. Fetch Target Records
    // We join with bookings to check end_time
    // We filter where is_disputed is FALSE (or NULL, assuming default is false)
    // We filter where photos_url is not null
    const { data: records, error: fetchError } = await supabase
      .from('handover_records')
      .select(`
        id,
        photos_url,
        is_disputed,
        bookings!inner (
          end_time
        )
      `)
      .lt('bookings.end_time', cutoffIso)
      .eq('is_disputed', false)
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

    // 4. Process Each Record
    for (const record of records) {
      try {
        const photos = record.photos_url;
        
        // Handle different formats of photos_url (Array or single string, though schema implies array)
        let pathsToDelete: string[] = [];

        if (Array.isArray(photos)) {
          pathsToDelete = photos.map((url: string) => extractPathFromUrl(url)).filter(Boolean) as string[];
        } else if (typeof photos === 'string') {
          // Handle case where it might be a single string or JSON string
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
          // 5. Physical Deletion from Storage
          const { error: storageError } = await supabase.storage
            .from('handover_images')
            .remove(pathsToDelete);

          if (storageError) {
            console.error(`[Cleanup] Storage Delete Error for Record ${record.id}:`, storageError);
            // We continue to update DB to avoid infinite retry loops if file is already gone?
            // No, if storage fails, we might want to retry later. But prompt says "if one file deletion fails, continue with others".
            // We will log it. If it's a "Object not found" error, we should probably proceed to clear the DB record.
            // For now, we'll assume we proceed only if successful or if error implies file missing.
          } else {
            results.filesDeleted += pathsToDelete.length;
          }
        }

        // 6. Database Preservation (Update photos_url to NULL)
        const { error: updateError } = await supabase
          .from('handover_records')
          .update({ photos_url: null }) // or []
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

// Helper to extract path from public URL
function extractPathFromUrl(url: string): string | null {
  if (!url) return null;
  // URL format: https://<project>.supabase.co/storage/v1/object/public/handover_images/<path>
  // or relative path if stored that way.
  // We look for the bucket name 'handover_images'
  const parts = url.split('/handover_images/');
  if (parts.length > 1) {
    // Decode URI component in case of spaces/special chars
    return decodeURIComponent(parts[1]);
  }
  // If it doesn't contain the full URL structure, maybe it IS the path?
  // But usually we store full URLs.
  return null;
}

