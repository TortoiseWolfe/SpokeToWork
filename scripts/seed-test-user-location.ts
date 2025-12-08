import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function seedTestUser() {
  // Get test user ID
  const { data: users } = await supabase.auth.admin.listUsers();
  const testUser = users?.users.find((u) => u.email === 'test@example.com');

  if (!testUser) {
    console.log('Test user not found');
    return;
  }

  console.log('Test user ID:', testUser.id);

  // Set home location (Cleveland Bradley County Public Library)
  const { error } = await supabase
    .from('user_profiles')
    .update({
      home_address: '795 Church St NE, Cleveland, TN 37311',
      home_latitude: 35.1595,
      home_longitude: -84.8766,
      distance_radius_miles: 20,
    })
    .eq('id', testUser.id);

  if (error) {
    console.log('Error updating profile:', error.message);
    return;
  }

  console.log('Home location set');

  // Check if seed companies were created
  const { data: tracking, error: trackErr } = await supabase
    .from('user_company_tracking')
    .select('priority')
    .eq('user_id', testUser.id);

  if (trackErr) {
    console.log('Error checking tracking:', trackErr.message);
    return;
  }

  console.log('Companies seeded:', tracking?.length || 0);

  // Check priority distribution
  const priorities: Record<number, number> = {};
  tracking?.forEach((t) => {
    priorities[t.priority] = (priorities[t.priority] || 0) + 1;
  });
  console.log('Priority distribution:', priorities);
}

seedTestUser();
