#!/bin/bash
sed -i 's/await supabase.from(table).update({ photos_url: null }).eq('\''id'\'', id);/let updates: any = { photos_url: null };\n    if (table === '\''agreements'\'') updates.ic_license_photos = null;\n    await supabase.from(table).update(updates).eq('\''id'\'', id);/g' supabase/functions/cleanup-storage/index.ts
