#!/usr/bin/env node

/**
 * Setup Demo Accounts in Supabase
 * Creates demo.client@arenah.com, demo.vip@arenah.com, demo.premium@arenah.com
 */

import { createClient } from '@supabase/supabase-js';

// L'URL du projet vient de l'environnement : rien d'identifiant ne doit être
// figé dans un fichier versionné.
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  const missing = [
    ...(!SUPABASE_URL ? ['SUPABASE_URL'] : []),
    ...(!SUPABASE_SERVICE_KEY ? ['SUPABASE_SERVICE_ROLE_KEY'] : []),
  ];
  console.error(`❌ Variable(s) d'environnement manquante(s) : ${missing.join(', ')}`);
  console.log('\n📋 Pour les renseigner :');
  console.log('1. Ouvrez https://app.supabase.com → votre projet → Settings → API');
  console.log('2. Copiez "Project URL" et "Service Role Key"');
  console.log('3. export SUPABASE_URL="https://<votre-projet>.supabase.co"');
  console.log('4. export SUPABASE_SERVICE_ROLE_KEY="<votre-cle>"');
  console.log('5. Relancez ce script\n');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const DEMO_ACCOUNTS = [
  {
    email: 'demo.client@arenah.com',
    password: 'Demo@2024Client',
    fullname: 'Démo Client',
    phone: '+229 91 23 45 67'
  },
  {
    email: 'demo.vip@arenah.com',
    password: 'Demo@2024VIP',
    fullname: 'Démo VIP',
    phone: '+229 92 34 56 78'
  },
  {
    email: 'demo.premium@arenah.com',
    password: 'Demo@2024Premium',
    fullname: 'Démo Premium',
    phone: '+229 93 45 67 89'
  }
];

async function createDemoAccounts() {
  console.log('🔧 Setting up demo accounts in Supabase...\n');

  for (const account of DEMO_ACCOUNTS) {
    try {
      console.log(`📝 Creating account: ${account.email}`);

      // 1. Create auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: account.email,
        password: account.password,
        email_confirm: true,
        user_metadata: {
          fullname: account.fullname,
          phone: account.phone
        }
      });

      if (authError) {
        if (authError.message.includes('already exists')) {
          console.log(`   ⚠️  User already exists (skipping auth creation)`);
        } else {
          throw authError;
        }
      } else {
        console.log(`   ✅ Auth user created: ${authData.user.id}`);
      }

      // 2. Get the user ID (if we created it or if it already exists)
      const { data: userData } = await supabase.auth.admin.listUsers();
      const existingUser = userData.users.find(u => u.email === account.email);
      
      if (!existingUser) {
        throw new Error(`Could not find user with email ${account.email}`);
      }

      const userId = existingUser.id;

      // 3. Create profile in users table
      const { error: profileError } = await supabase
        .from('users')
        .upsert({
          id: userId,
          email: account.email,
          fullname: account.fullname,
          phone: account.phone,
          role: 'client',
          avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${account.email}`
        }, { onConflict: 'id' });

      if (profileError) {
        throw profileError;
      }

      console.log(`   ✅ Profile created in users table`);
      console.log(`   ✅ Login credentials: ${account.email} / ${account.password}\n`);

    } catch (error) {
      console.error(`   ❌ Error: ${error.message}\n`);
    }
  }

  console.log('✅ Demo accounts setup complete!\n');
  console.log('📋 Demo accounts ready to use:');
  DEMO_ACCOUNTS.forEach(acc => {
    console.log(`   • ${acc.email}`);
  });
  console.log('\n🚀 You can now login with these credentials!\n');
}

createDemoAccounts().catch(error => {
  console.error('❌ Setup failed:', error);
  process.exit(1);
});
