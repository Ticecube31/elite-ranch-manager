import React from 'react';
import { TreePine, Construction } from 'lucide-react';

export default function PastureManagement() {
  return (
    <div className="px-4 py-6 max-w-2xl mx-auto">
      <div className="text-center py-16 space-y-6">
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-amber-100">
          <TreePine className="w-12 h-12 text-amber-700" />
        </div>
        <div className="space-y-2">
          <h1 className="font-heading font-black text-3xl text-foreground">
            Pasture Management
          </h1>
          <p className="text-muted-foreground text-lg max-w-sm mx-auto">
            Coming Soon — We'll Build This Together
          </p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-6 max-w-sm mx-auto text-left space-y-3">
          <div className="flex items-center gap-3">
            <Construction className="w-5 h-5 text-amber-600" />
            <h3 className="font-heading font-bold">What's Coming</h3>
          </div>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold mt-0.5">•</span>
              Move herds between pastures with one tap
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold mt-0.5">•</span>
              Track grass condition and rotation schedules
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold mt-0.5">•</span>
              Map view of all pastures with animal counts
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold mt-0.5">•</span>
              Water and fence status tracking
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}