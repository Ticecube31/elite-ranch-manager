import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

export default function NotificationsSection({ settings, onSave }) {
  const [notifications, setNotifications] = useState({
    new_calf_sms: false,
    new_calf_email: false,
    weekly_report_sms: false,
    weekly_report_email: false,
    preg_check_complete_sms: false,
    preg_check_complete_email: false,
    sorting_complete_sms: false,
    sorting_complete_email: false,
    season_complete_sms: false,
    season_complete_email: false,
  });

  useEffect(() => {
    if (settings.notifications) {
      setNotifications({
        ...notifications,
        ...settings.notifications,
      });
    }
  }, [settings]);

  const handleToggle = (key) => {
    const updated = { ...notifications, [key]: !notifications[key] };
    setNotifications(updated);
  };

  const handleSave = () => {
    onSave({ notifications });
    toast.success('Notification settings saved!');
  };

  const NotificationGroup = ({ title, description, items }) => (
    <div className="border border-gray-200 rounded-2xl p-5 space-y-4">
      <div>
        <h3 className="font-heading font-bold text-base text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </div>
      <div className="space-y-3">
        {items.map(({ key, label }) => (
          <div key={key} className="flex items-center justify-between">
            <label className="text-sm font-semibold text-gray-700">{label}</label>
            <Switch
              checked={notifications[key]}
              onCheckedChange={() => handleToggle(key)}
            />
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <NotificationGroup
        title="New Calf Notifications"
        description="Get notified every time a new calf is added during calving season"
        items={[
          { key: 'new_calf_sms', label: 'Text Message' },
          { key: 'new_calf_email', label: 'Email' },
        ]}
      />

      <NotificationGroup
        title="Weekly Reports"
        description="Receive weekly summaries and metrics about your herd"
        items={[
          { key: 'weekly_report_sms', label: 'Text Message' },
          { key: 'weekly_report_email', label: 'Email' },
        ]}
      />

      <NotificationGroup
        title="Preg Checking Completion"
        description="Get notified when a pregnancy checking session is completed"
        items={[
          { key: 'preg_check_complete_sms', label: 'Text Message' },
          { key: 'preg_check_complete_email', label: 'Email' },
        ]}
      />

      <NotificationGroup
        title="Sorting Completion"
        description="Get notified when a sorting session is completed"
        items={[
          { key: 'sorting_complete_sms', label: 'Text Message' },
          { key: 'sorting_complete_email', label: 'Email' },
        ]}
      />

      <NotificationGroup
        title="Calving Season Completion"
        description="Get notified when a calving season is marked as complete"
        items={[
          { key: 'season_complete_sms', label: 'Text Message' },
          { key: 'season_complete_email', label: 'Email' },
        ]}
      />

      <Button
        onClick={handleSave}
        className="w-full h-12 text-base font-bold"
      >
        Save Notification Settings
      </Button>
    </div>
  );
}