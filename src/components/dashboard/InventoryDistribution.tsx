
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchInventoryDistributionData, InventoryDistributionData } from './inventoryChart/InventoryChartUtils';
import InventoryPieChart from './inventoryChart/InventoryPieChart';
import { ChartLoading, ChartError, ChartEmpty } from './inventoryChart/ChartLoadingStates';

interface InventoryDistributionProps {
  data?: InventoryDistributionData[];
}

const InventoryDistribution: React.FC<InventoryDistributionProps> = ({ data: propData }) => {
  const [chartData, setChartData] = useState<InventoryDistributionData[]>([]);
  
  // استخدام React Query لجلب البيانات مباشرة من قاعدة البيانات
  const { data: databaseData, isLoading, error } = useQuery({
    queryKey: ['inventoryDistribution'],
    queryFn: fetchInventoryDistributionData,
    // تحديث كل دقيقة
    refetchInterval: 60000,
    refetchOnWindowFocus: false,
  });
  
  // تحديث البيانات عندما تتغير البيانات الخارجية أو بيانات قاعدة البيانات
  useEffect(() => {
    // Use provided data or fetched data, with proper null checks
    const dataToUse = propData || databaseData || [];
    
    if (dataToUse && dataToUse.length > 0) {
      // استبعاد العناصر التي قيمتها صفر
      const filteredData = dataToUse.filter(item => item && (item.value || 0) > 0);
      setChartData(filteredData);
    } else {
      setChartData([]);
    }
  }, [propData, databaseData]);
  
  if (isLoading && !propData) {
    return <ChartLoading height="18rem" />;
  }
  
  if (error && !propData) {
    return <ChartError height="18rem" />;
  }
  
  if (!chartData || chartData.length === 0) {
    return <ChartEmpty height="18rem" message="لا توجد بيانات توزيع المخزون لعرضها حالياً" />;
  }
  
  return (
    <div className="transition-all duration-300 hover:scale-[1.02]">
      <InventoryPieChart data={chartData} height="18rem" />
    </div>
  );
};

export default InventoryDistribution;
