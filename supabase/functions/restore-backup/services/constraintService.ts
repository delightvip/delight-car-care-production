
export async function disableForeignKeyConstraints(supabaseAdmin: any) {
  try {
    await supabaseAdmin.rpc('disable_foreign_key_constraints');
    console.log('Foreign key constraints disabled successfully');
    return true;
  } catch (err) {
    console.warn('Failed to disable foreign key constraints:', err);
    return false;
  }
}

export async function enableForeignKeyConstraints(supabaseAdmin: any) {
  try {
    await supabaseAdmin.rpc('enable_foreign_key_constraints');
    console.log('Foreign key constraints re-enabled successfully');
    return true;
  } catch (err) {
    console.warn('Failed to re-enable foreign key constraints:', err);
    return false;
  }
}
