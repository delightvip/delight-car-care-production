
import React, { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import InventoryService from '@/services/InventoryService';
import { motion } from 'framer-motion';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#6366F1'];

interface InventoryDistributionProps {
  data?: { name: string; value: number }[];
}

const InventoryDistribution: React.FC<InventoryDistributionProps> = ({ data: propData }) => {
  const inventoryService = InventoryService.getInstance();
  const data = propData || inventoryService.getInventoryDistributionData();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  
  const total = data.reduce((sum, item) => sum + item.value, 0);
  
  const onPieEnter = (_, index: number) => {
    setActiveIndex(index);
  };
  
  const onPieLeave = () => {
    setActiveIndex(null);
  };
  
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    
    const isActive = index === activeIndex;
    
    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        className={`font-medium transition-all duration-300 ${isActive ? 'font-bold text-lg' : ''}`}
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };
  
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <motion.g
            animate={{ 
              rotate: [0, 360],
              scale: [0.9, 1]
            }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
          >
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={80}
              innerRadius={40}
              paddingAngle={5}
              dataKey="value"
              label={renderCustomizedLabel}
              onMouseEnter={onPieEnter}
              onMouseLeave={onPieLeave}
              animationDuration={800}
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={COLORS[index % COLORS.length]} 
                  strokeWidth={index === activeIndex ? 2 : 1}
                  stroke={index === activeIndex ? '#fff' : 'none'}
                />
              ))}
            </Pie>
          </motion.g>
          <Tooltip
            formatter={(value: number) => [`${value.toLocaleString()} ج.م (${((value / total) * 100).toFixed(1)}%)`, 'القيمة']}
            contentStyle={{
              backgroundColor: 'white',
              borderRadius: '8px',
              border: 'none',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
            }}
          />
          <Legend 
            wrapperStyle={{ paddingTop: '10px' }}
            formatter={(value) => {
              const itemData = data.find(item => item.name === value);
              const percentage = itemData ? ((itemData.value / total) * 100).toFixed(1) : '0';
              return (
                <HoverCard>
                  <HoverCardTrigger asChild>
                    <span className="text-sm font-medium cursor-pointer">
                      {value}
                    </span>
                  </HoverCardTrigger>
                  <HoverCardContent className="w-48">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{value}</p>
                      <p className="text-sm text-muted-foreground">
                        {itemData?.value.toLocaleString()} ج.م ({percentage}%)
                      </p>
                    </div>
                  </HoverCardContent>
                </HoverCard>
              );
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default InventoryDistribution;
