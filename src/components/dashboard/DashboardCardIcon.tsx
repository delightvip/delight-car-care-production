
import React from 'react';
import { motion } from 'framer-motion';

interface DashboardCardIconProps {
  icon: React.ReactNode;
  color: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'secondary';
}

const DashboardCardIcon: React.FC<DashboardCardIconProps> = ({ icon, color }) => {
  const getColorClass = () => {
    switch (color) {
      case 'primary': return 'bg-blue-100 text-blue-600';
      case 'success': return 'bg-emerald-100 text-emerald-600';
      case 'warning': return 'bg-amber-100 text-amber-600';
      case 'danger': return 'bg-red-100 text-red-600';
      case 'info': return 'bg-indigo-100 text-indigo-600';
      case 'secondary': return 'bg-violet-100 text-violet-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <motion.div 
      className={`w-12 h-12 rounded-lg flex items-center justify-center ${getColorClass()}`}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      {icon}
    </motion.div>
  );
};

export default DashboardCardIcon;
