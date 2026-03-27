import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if Blauw Cattle Company already exists
    const existingRanches = await base44.entities.Ranch.filter({
      ranch_name: 'Blauw Cattle Company',
    });

    let ranch;
    if (existingRanches.length > 0) {
      ranch = existingRanches[0];
    } else {
      // Create Blauw Cattle Company
      ranch = await base44.entities.Ranch.create({
        ranch_name: 'Blauw Cattle Company',
        owner_id: user.id,
        owner_email: user.email,
        status: 'active',
      });
    }

    // Check if user is already assigned to this ranch
    const existingUser = await base44.entities.RanchUser.filter({
      ranch_id: ranch.id,
      user_email: user.email,
    });

    if (existingUser.length === 0) {
      // Assign user as admin to the ranch
      await base44.entities.RanchUser.create({
        ranch_id: ranch.id,
        user_email: user.email,
        role: 'admin',
        status: 'active',
      });
    }

    return Response.json({ 
      ranch_id: ranch.id,
      ranch_name: ranch.ranch_name,
      success: true 
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});