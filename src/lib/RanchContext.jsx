import React, { createContext, useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

export const RanchContext = createContext();

export function RanchProvider({ children }) {
  const [currentRanch, setCurrentRanch] = useState(null);
  const [userRanches, setUserRanches] = useState([]);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeRanch = async () => {
      try {
        const user = await base44.auth.me();
        if (!user) {
          setLoading(false);
          return;
        }

        // Fetch all ranches for this user
        const ranchUsers = await base44.entities.RanchUser.filter({
          user_email: user.email,
          status: 'active'
        });

        if (ranchUsers.length === 0) {
          setLoading(false);
          return;
        }

        // Get ranch details for each
        const ranches = await Promise.all(
          ranchUsers.map(async (ru) => {
            const ranch = await base44.entities.Ranch.read(ru.ranch_id);
            return { ...ranch, userRole: ru.role };
          })
        );

        setUserRanches(ranches);

        // Load saved ranch or default to first
        const savedRanchId = localStorage.getItem('selectedRanchId');
        const selected = savedRanchId
          ? ranches.find(r => r.id === savedRanchId) || ranches[0]
          : ranches[0];

        setCurrentRanch(selected);
        setUserRole(selected.userRole);
        localStorage.setItem('selectedRanchId', selected.id);
      } catch (error) {
        console.error('Error initializing ranch:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeRanch();
  }, []);

  const switchRanch = (ranchId) => {
    const ranch = userRanches.find(r => r.id === ranchId);
    if (ranch) {
      setCurrentRanch(ranch);
      setUserRole(ranch.userRole);
      localStorage.setItem('selectedRanchId', ranchId);
    }
  };

  return (
    <RanchContext.Provider value={{ currentRanch, userRanches, userRole, loading, switchRanch }}>
      {children}
    </RanchContext.Provider>
  );
}