import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Users, Plus, Shield, Hammer, Star } from 'lucide-react';
import { toast } from 'sonner';

const ROLE_META = {
  Owner:     { icon: Star,    color: 'text-amber-600  bg-amber-50',  desc: 'Full access to everything'           },
  Manager:   { icon: Shield,  color: 'text-blue-600   bg-blue-50',   desc: 'Create/edit records, run reports'    },
  RanchHand: { icon: Hammer,  color: 'text-emerald-600 bg-emerald-50', desc: 'Log calves and perform sorting'   },
};

export default function UserManagementSection() {
  const [showAdd, setShowAdd] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('RanchHand');
  const [inviting, setInviting] = useState(false);

  const { data: users = [], refetch } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => base44.entities.User.list(),
    initialData: [],
  });

  const handleInvite = async () => {
    if (!inviteEmail.trim()) { toast.error('Enter an email address'); return; }
    setInviting(true);
    const role = inviteRole === 'Owner' ? 'admin' : 'user';
    await base44.users.inviteUser(inviteEmail.trim(), role);
    toast.success(`Invitation sent to ${inviteEmail}`);
    setInviteEmail('');
    setInviteRole('RanchHand');
    setInviting(false);
    setShowAdd(false);
    refetch();
  };

  return (
    <div className="space-y-4">
      <Button
        onClick={() => setShowAdd(true)}
        className="w-full h-14 text-base font-bold rounded-xl"
      >
        <Plus className="w-5 h-5 mr-2" /> Add New Ranch Hand
      </Button>

      {/* Users list */}
      <div className="space-y-2">
        {users.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">No users yet. Invite your crew above.</p>
        )}
        {users.map(u => {
          const roleName = u.role === 'admin' ? 'Owner' : 'RanchHand';
          const meta = ROLE_META[roleName] ?? ROLE_META['RanchHand'];
          const Icon = meta.icon;
          return (
            <div key={u.id} className="flex items-center gap-3 bg-muted/40 rounded-xl p-4">
              <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                <span className="font-bold text-primary text-sm">
                  {u.full_name?.[0]?.toUpperCase() ?? u.email?.[0]?.toUpperCase() ?? '?'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{u.full_name || '—'}</p>
                <p className="text-xs text-muted-foreground truncate">{u.email}</p>
              </div>
              <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold ${meta.color}`}>
                <Icon className="w-3 h-3" />
                {roleName}
              </div>
            </div>
          );
        })}
      </div>

      {/* Role legend */}
      <div className="bg-muted rounded-xl p-4 space-y-2">
        <p className="text-xs font-bold text-foreground mb-2">Permission Levels</p>
        {Object.entries(ROLE_META).map(([role, { icon: Icon, color, desc }]) => (
          <div key={role} className="flex items-start gap-2 text-xs text-muted-foreground">
            <span className={`mt-0.5 p-1 rounded-md ${color}`}><Icon className="w-3 h-3" /></span>
            <span><strong className="text-foreground">{role}:</strong> {desc}</span>
          </div>
        ))}
      </div>

      {/* Invite Sheet */}
      <Sheet open={showAdd} onOpenChange={setShowAdd}>
        <SheetContent side="bottom" className="rounded-t-3xl">
          <SheetHeader className="mb-4">
            <SheetTitle className="font-heading text-xl">Invite Ranch Hand</SheetTitle>
          </SheetHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-semibold">Email Address</Label>
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="rancher@example.com"
                className="h-14 text-lg mt-1"
                onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
              />
            </div>
            <div>
              <Label className="text-sm font-semibold">Role</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger className="h-14 text-base mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Owner">Owner — Full Access</SelectItem>
                  <SelectItem value="Manager">Manager — Edit & Reports</SelectItem>
                  <SelectItem value="RanchHand">Ranch Hand — Log & Sort Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleInvite} disabled={inviting} className="w-full h-14 text-base font-bold">
              {inviting ? 'Sending...' : '✉️ Send Invitation'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}