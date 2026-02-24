const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
        env[parts[0].trim()] = parts.slice(1).join('=').trim();
    }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function checkDb() {
    const { data: profiles, error: err1 } = await supabase.from('user_profiles').select('id, email, role');
    const { data: authUsers, error: err2 } = await supabase.auth.admin.listUsers();

    fs.writeFileSync('output-profiles.json', JSON.stringify({
        profiles,
        authUsers: authUsers.users.map(u => ({ id: u.id, email: u.email }))
    }, null, 2));
}

checkDb();
