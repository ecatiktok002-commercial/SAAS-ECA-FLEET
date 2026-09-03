const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://czurhanyrjgeicnbrnev.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6dXJoYW55cmpnZWljbmJybmV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4NTExMDEsImV4cCI6MjA4NzQyNzEwMX0.LV4hsQEazpbv8AcLDrEASg8s3uGKmvMJ0FrvMOX6AWQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const refNumber = '290726-WNYMCP';
  console.log('Fetching audit_records for:', refNumber);
  
  const { data, error } = await supabase
    .from('audit_records')
    .select('*')
    .eq('reference_number', refNumber);
  
  if (error) {
    console.error('Error fetching audit_records:', error);
    return;
  }
  
  console.log('Found records:', data);
  
  if (data && data.length > 0) {
    for (const record of data) {
      if (record.payout_status === 'approved' || record.payout_status === 'paid') {
         const { error: updateError } = await supabase
           .from('audit_records')
           .update({ payout_status: 'pending_review' })
           .eq('id', record.id);
           
         if (updateError) {
           console.error('Failed to update record:', record.id, updateError);
         } else {
           console.log('Successfully reverted record:', record.id, 'to pending_review');
         }
      } else {
         console.log('Record is already in pending/pending_review state:', record.payout_status);
      }
    }
  } else {
    console.log('No audit records found for this reference.');
  }
}
run();
