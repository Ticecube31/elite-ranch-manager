import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (user?.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const animals = await base44.asServiceRole.entities.Animals.list();
  let updated = 0;

  for (const animal of animals) {
    if (animal.date_of_birth && !animal.birth_year) {
      const year = new Date(animal.date_of_birth).getFullYear();
      await base44.asServiceRole.entities.Animals.update(animal.id, { birth_year: year });
      updated++;
    }
  }

  return Response.json({ message: `Backfilled birth_year for ${updated} animals.`, total: animals.length, updated });
});