
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// This is a redirect component - the actual Analytics page has been moved to /src/pages/analytics/Analytics.tsx
const AnalyticsRedirect = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    navigate('/analytics');
  }, [navigate]);
  
  return null;
};

export default AnalyticsRedirect;
