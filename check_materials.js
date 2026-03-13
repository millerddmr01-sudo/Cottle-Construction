const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://hjfdjfavfjabwabmgset.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhqZmRqZmF2ZmphYndhYm1nc2V0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTU0Mjc0NSwiZXhwIjoyMDg3MTE4NzQ1fQ._FMq1q6fwCxJqAuF6uTQYaEZPd56nrt_aWUB9_Z4yHM'
);
async function run() {
  const { data, error } = await supabase.from('project_hours').select('id, user_profiles!employee_id(full_name)').limit(1);
  if (error) console.log(error);
  else console.log(JSON.stringify(data[0], null, 2));
}
run();
