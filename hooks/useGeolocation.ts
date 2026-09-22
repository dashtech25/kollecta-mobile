import { useState, useEffect } from 'react';
import * as Location from 'expo-location';

interface LocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  error: string | null;
  loading: boolean;
}

export function useGeolocation() {
  const [location, setLocation] = useState<LocationState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    error: null,
    loading: true,
  });

  const requestLocation = async () => {
    setLocation((prev) => ({ ...prev, loading: true, error: null }));

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setLocation((prev) => ({
        ...prev,
        loading: false,
        error: 'Permission de localisation refusée',
      }));
      return;
    }

    try {
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        accuracy: loc.coords.accuracy,
        error: null,
        loading: false,
      });
    } catch (err) {
      setLocation((prev) => ({
        ...prev,
        loading: false,
        error: 'Impossible de récupérer la position',
      }));
    }
  };

  useEffect(() => {
    requestLocation();
  }, []);

  return { ...location, refresh: requestLocation };
}
