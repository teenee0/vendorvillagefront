import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

export const useLocation = () => {
  const { business_slug } = useParams();
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedLocation = localStorage.getItem(`business_${business_slug}_location`);
    setSelectedLocation(savedLocation);
    setLoading(false);
  }, [business_slug]);

  const updateLocation = (locationId) => {
    setSelectedLocation(locationId);
    localStorage.setItem(`business_${business_slug}_location`, locationId);
  };

  const getLocationParam = () => {
    if (!selectedLocation || selectedLocation === 'all') {
      return null;
    }
    return { location: selectedLocation };
  };

  const getLocationQueryString = () => {
    const param = getLocationParam();
    if (!param) return '';
    return `?${new URLSearchParams(param).toString()}`;
  };

  return {
    selectedLocation,
    updateLocation,
    getLocationParam,
    getLocationQueryString,
    loading,
    isAllLocations: selectedLocation === 'all'
  };
};
