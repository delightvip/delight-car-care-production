import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  Package2, 
  TrendingDown, 
  TrendingUp, 
  AlertTriangle, 
  BarChart3, 
  CircleDollarSign, 
  List, 
  Info 
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface DetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'inventory-value' | 'average-value' | 'low-stock' | 'out-of-stock';
  data: any;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const DetailModal: React.FC<DetailModalProps> = ({ isOpen, onClose, type, data }) => {
  
  // عناوين وأوصاف حسب نوع البطاقة
  const getTitleAndDescription = () => {
    switch (type) {
      case 'inventory-value':
        return {
          title: 'تفاصيل قيمة المخزون',
          description: 'تحليل مفصل لقيمة المخزون حسب نوع العناصر'
        };
      case 'average-value':
        return {
          title: 'متوسط قيمة الصنف',
          description: 'تحليل متوسط تكلفة الأصناف حسب النوع'
        };
      case 'low-stock':
        return {
          title: 'عناصر المخزون المنخفضة',
          description: 'تفاصيل الأصناف التي وصلت لمستوى منخفض'
        };
      case 'out-of-stock':
        return {
          title: 'عناصر نفذت من المخزون',
          description: 'تفاصيل الأصناف التي نفذت من المخزون'
        };
      default:
        return {
          title: 'تفاصيل المخزون',
          description: 'معلومات تفصيلية عن المخزون'
        };
    }
  };
  
  // الأيقونة المناسبة حسب نوع البطاقة
  const getIcon = () => {
    switch (type) {
      case 'inventory-value':
        return <Package2 className="h-5 w-5 text-blue-500" />;
      case 'average-value':
        return <BarChart3 className="h-5 w-5 text-purple-500" />;
      case 'low-stock':
        return <TrendingDown className="h-5 w-5 text-amber-500" />;
      case 'out-of-stock':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      default:
        return <Info className="h-5 w-5" />;
    }
  };
  
  // محتوى تفصيلي حسب نوع البطاقة
  const renderDetailContent = () => {
    switch (type) {
      case 'inventory-value':
        return renderInventoryValueDetails();
      case 'average-value':
        return renderAverageValueDetails();
      case 'low-stock':
        return renderLowStockDetails();
      case 'out-of-stock':
        return renderOutOfStockDetails();
      default:
        return <p>لا توجد تفاصيل متاحة</p>;
    }
  };
  
  // عرض تفاصيل قيمة المخزون
  const renderInventoryValueDetails = () => {
    // إعداد البيانات للرسوم البيانية
    const pieChartData = [
      { name: 'المواد الخام', value: data.rawMaterialsValue || 0 },
      { name: 'المنتجات النصف مصنعة', value: data.semiFinishedValue || 0 },
      { name: 'مواد التعبئة', value: data.packagingValue || 0 },
      { name: 'المنتجات النهائية', value: data.finishedValue || 0 }
    ];
    
    const barChartData = [
      { name: 'المواد الخام', value: data.rawMaterialsValue || 0 },
      { name: 'المنتجات النصف مصنعة', value: data.semiFinishedValue || 0 },
      { name: 'مواد التعبئة', value: data.packagingValue || 0 },
      { name: 'المنتجات النهائية', value: data.finishedValue || 0 }
    ];
    
    const tableData = [
      { category: 'المواد الخام', value: data.rawMaterialsValue || 0, count: data.rawMaterialsCount || 0, avgValue: data.rawMaterialsCount ? (data.rawMaterialsValue / data.rawMaterialsCount).toFixed(2) : 0 },
      { category: 'المنتجات النصف مصنعة', value: data.semiFinishedValue || 0, count: data.semiFinishedCount || 0, avgValue: data.semiFinishedCount ? (data.semiFinishedValue / data.semiFinishedCount).toFixed(2) : 0 },
      { category: 'مواد التعبئة', value: data.packagingValue || 0, count: data.packagingCount || 0, avgValue: data.packagingCount ? (data.packagingValue / data.packagingCount).toFixed(2) : 0 },
      { category: 'المنتجات النهائية', value: data.finishedValue || 0, count: data.finishedCount || 0, avgValue: data.finishedCount ? (data.finishedValue / data.finishedCount).toFixed(2) : 0 },
      { category: 'الإجمالي', value: data.totalValue || 0, count: data.totalCount || 0, avgValue: data.totalCount ? (data.totalValue / data.totalCount).toFixed(2) : 0 }
    ];
    
    return (
      <Tabs defaultValue="chart">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="chart">رسم بياني</TabsTrigger>
          <TabsTrigger value="table">جدول</TabsTrigger>
          <TabsTrigger value="summary">ملخص</TabsTrigger>
        </TabsList>
        
        <TabsContent value="chart" className="p-4">
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4">
                <h3 className="text-lg font-medium mb-4 text-center">توزيع قيمة المخزون</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `${Number(value).toLocaleString('ar-EG')} ج.م`} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <h3 className="text-lg font-medium mb-4 text-center">مقارنة قيم المخزون</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={barChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => `${Number(value).toLocaleString('ar-EG')} ج.م`} />
                    <Bar dataKey="value" name="القيمة" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="table" className="p-4">
          <Card>
            <CardContent className="p-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الفئة</TableHead>
                    <TableHead>القيمة (ج.م)</TableHead>
                    <TableHead>عدد العناصر</TableHead>
                    <TableHead>متوسط القيمة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tableData.map((row, index) => (
                    <TableRow key={index} className={index === tableData.length - 1 ? "font-bold bg-muted/30" : ""}>
                      <TableCell>{row.category}</TableCell>
                      <TableCell>{Number(row.value).toLocaleString('ar-EG')}</TableCell>
                      <TableCell>{row.count}</TableCell>
                      <TableCell>{Number(row.avgValue).toLocaleString('ar-EG')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="summary" className="p-4">
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">إجمالي قيمة المخزون:</span>
                <span className="text-xl font-bold">{Number(data.totalValue || 0).toLocaleString('ar-EG')} ج.م</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium">إجمالي عناصر المخزون:</span>
                <span className="text-xl font-bold">{Number(data.totalCount || 0).toLocaleString('ar-EG')} عنصر</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium">متوسط قيمة العنصر:</span>
                <span className="text-xl font-bold">{data.totalCount ? Number((data.totalValue / data.totalCount).toFixed(2)).toLocaleString('ar-EG') : 0} ج.م</span>
              </div>
              
              <div className="mt-6">
                <h3 className="font-medium mb-2">ملاحظات وتوصيات:</h3>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  <li>نسبة المواد الخام تمثل {pieChartData[0].value ? ((pieChartData[0].value / data.totalValue) * 100).toFixed(1) : 0}% من إجمالي قيمة المخزون</li>
                  <li>نسبة المنتجات النهائية تمثل {pieChartData[3].value ? ((pieChartData[3].value / data.totalValue) * 100).toFixed(1) : 0}% من إجمالي قيمة المخزون</li>
                  {pieChartData[3].value / data.totalValue > 0.5 && (
                    <li className="text-amber-500">نسبة المنتجات النهائية عالية جدًا، ننصح بزيادة جهود التسويق والمبيعات</li>
                  )}
                  {pieChartData[0].value / data.totalValue > 0.6 && (
                    <li className="text-amber-500">نسبة المواد الخام عالية جدًا، ننصح بتحسين خطط الإنتاج</li>
                  )}
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    );
  };
  
  // عرض تفاصيل متوسط قيمة الصنف
  const renderAverageValueDetails = () => {
    const chartData = [
      { name: 'المواد الخام', value: data.rawMaterialsCount ? (data.rawMaterialsValue / data.rawMaterialsCount) : 0 },
      { name: 'المنتجات النصف مصنعة', value: data.semiFinishedCount ? (data.semiFinishedValue / data.semiFinishedCount) : 0 },
      { name: 'مواد التعبئة', value: data.packagingCount ? (data.packagingValue / data.packagingCount) : 0 },
      { name: 'المنتجات النهائية', value: data.finishedCount ? (data.finishedValue / data.finishedCount) : 0 }
    ];
    
    return (
      <Tabs defaultValue="chart">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="chart">رسم بياني</TabsTrigger>
          <TabsTrigger value="analysis">تحليل</TabsTrigger>
        </TabsList>
        
        <TabsContent value="chart" className="p-4">
          <Card>
            <CardContent className="p-4">
              <h3 className="text-lg font-medium mb-4 text-center">مقارنة متوسط قيمة العناصر حسب النوع</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => `${Number(value).toLocaleString('ar-EG')} ج.م`} />
                  <Legend />
                  <Bar dataKey="value" name="متوسط القيمة" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="analysis" className="p-4">
          <Card>
            <CardContent className="p-4 space-y-6">
              <div>
                <h3 className="font-medium mb-2">ملخص متوسط قيمة العناصر:</h3>
                <ul className="space-y-2">
                  <li className="flex justify-between items-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                    <span>المواد الخام:</span>
                    <span className="font-bold">{data.rawMaterialsCount ? Number((data.rawMaterialsValue / data.rawMaterialsCount).toFixed(2)).toLocaleString('ar-EG') : 0} ج.م</span>
                  </li>
                  <li className="flex justify-between items-center p-2 bg-purple-50 dark:bg-purple-900/20 rounded-md">
                    <span>المنتجات النصف مصنعة:</span>
                    <span className="font-bold">{data.semiFinishedCount ? Number((data.semiFinishedValue / data.semiFinishedCount).toFixed(2)).toLocaleString('ar-EG') : 0} ج.م</span>
                  </li>
                  <li className="flex justify-between items-center p-2 bg-green-50 dark:bg-green-900/20 rounded-md">
                    <span>مواد التعبئة:</span>
                    <span className="font-bold">{data.packagingCount ? Number((data.packagingValue / data.packagingCount).toFixed(2)).toLocaleString('ar-EG') : 0} ج.م</span>
                  </li>
                  <li className="flex justify-between items-center p-2 bg-amber-50 dark:bg-amber-900/20 rounded-md">
                    <span>المنتجات النهائية:</span>
                    <span className="font-bold">{data.finishedCount ? Number((data.finishedValue / data.finishedCount).toFixed(2)).toLocaleString('ar-EG') : 0} ج.م</span>
                  </li>
                  <li className="flex justify-between items-center p-2 bg-gray-100 dark:bg-gray-800 rounded-md font-medium">
                    <span>المتوسط العام:</span>
                    <span className="font-bold">{data.totalCount ? Number((data.totalValue / data.totalCount).toFixed(2)).toLocaleString('ar-EG') : 0} ج.م</span>
                  </li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-medium mb-2">تحليل وتوصيات:</h3>
                <div className="p-3 border rounded-md text-sm text-muted-foreground">
                  <p className="mb-2">• أعلى متوسط قيمة هو للمنتجات النهائية، وهذا منطقي بسبب القيمة المضافة في التصنيع</p>
                  <p className="mb-2">• متوسط قيمة مواد التعبئة هو الأقل، مما يشير إلى أن تكلفتها منخفضة نسبيًا</p>
                  <p className="mb-2">• المتوسط العام للمخزون يمثل رأس المال المستثمر في كل صنف</p>
                  
                  {chartData[3].value > chartData[0].value * 3 && (
                    <p className="text-green-600 dark:text-green-400">• الفرق بين متوسط قيمة المنتجات النهائية والمواد الخام كبير، مما يشير إلى هامش ربح جيد</p>
                  )}
                  
                  {chartData[3].value < chartData[0].value * 1.5 && (
                    <p className="text-amber-600 dark:text-amber-400">• الفرق بين متوسط قيمة المنتجات النهائية والمواد الخام منخفض، قد تحتاج لمراجعة تكاليف الإنتاج</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    );
  };
  
  // عرض تفاصيل العناصر منخفضة المخزون
  const renderLowStockDetails = () => {
    // ترتيب البيانات تصاعديًا حسب الكمية المتبقية
    const lowStockItems = data.items || [];
    
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">عناصر المخزون المنخفضة</h3>
            <div className="bg-amber-100 text-amber-800 px-2 py-1 rounded-md text-sm">
              إجمالي العناصر: {lowStockItems.length}
            </div>
          </div>
          
          <ScrollArea className="h-[400px] pr-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الكود</TableHead>
                  <TableHead>الاسم</TableHead>
                  <TableHead>النوع</TableHead>
                  <TableHead>الكمية المتبقية</TableHead>
                  <TableHead>الحد الأدنى</TableHead>
                  <TableHead>نسبة النقص</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lowStockItems.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{item.code}</TableCell>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs
                        ${item.type === 'raw' ? 'bg-blue-100 text-blue-800' : 
                        item.type === 'semi' ? 'bg-purple-100 text-purple-800' :
                        item.type === 'packaging' ? 'bg-green-100 text-green-800' :
                        'bg-amber-100 text-amber-800'}`}>
                        {item.type === 'raw' ? 'مواد خام' :
                        item.type === 'semi' ? 'نصف مصنعة' :
                        item.type === 'packaging' ? 'مواد تعبئة' :
                        'منتج نهائي'}
                      </span>
                    </TableCell>
                    <TableCell>{item.quantity} {item.unit}</TableCell>
                    <TableCell>{item.minStock || 10} {item.unit}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs
                        ${item.quantity < (item.minStock || 10) / 3 ? 'bg-red-100 text-red-800' : 
                        'bg-amber-100 text-amber-800'}`}>
                        {item.quantity < (item.minStock || 10) / 3 ? 'حرج' : 'منخفض'}
                        ({Math.round((1 - item.quantity / (item.minStock || 10)) * 100)}%)
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
          
          <div className="mt-4 p-3 border rounded-md bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <Info size={16} />
              توصيات للمتابعة:
            </h4>
            <ul className="list-disc list-inside text-sm">
              <li>يوصى بإضافة هذه العناصر إلى قائمة الطلبيات القادمة</li>
              <li>العناصر ذات الحالة "حرج" تحتاج إلى متابعة فورية</li>
              <li>ينصح بمراجعة استهلاك هذه العناصر ومعدل دورانها لتحسين سياسة إعادة الطلب</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    );
  };
  
  // عرض تفاصيل العناصر النافذة من المخزون
  const renderOutOfStockDetails = () => {
    const outOfStockItems = data.items || [];
    
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">عناصر نفذت من المخزون</h3>
            <div className="bg-red-100 text-red-800 px-2 py-1 rounded-md text-sm">
              إجمالي العناصر: {outOfStockItems.length}
            </div>
          </div>
          
          <ScrollArea className="h-[400px] pr-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الكود</TableHead>
                  <TableHead>الاسم</TableHead>
                  <TableHead>النوع</TableHead>
                  <TableHead>آخر طلب</TableHead>
                  <TableHead>تأثير النفاذ</TableHead>
                  <TableHead>الإجراء المقترح</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {outOfStockItems.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{item.code}</TableCell>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs
                        ${item.type === 'raw' ? 'bg-blue-100 text-blue-800' : 
                        item.type === 'semi' ? 'bg-purple-100 text-purple-800' :
                        item.type === 'packaging' ? 'bg-green-100 text-green-800' :
                        'bg-amber-100 text-amber-800'}`}>
                        {item.type === 'raw' ? 'مواد خام' :
                        item.type === 'semi' ? 'نصف مصنعة' :
                        item.type === 'packaging' ? 'مواد تعبئة' :
                        'منتج نهائي'}
                      </span>
                    </TableCell>
                    <TableCell>{item.lastOrderDate || 'غير متوفر'}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs
                        ${item.impact === 'high' ? 'bg-red-100 text-red-800' : 
                        item.impact === 'medium' ? 'bg-amber-100 text-amber-800' :
                        'bg-green-100 text-green-800'}`}>
                        {item.impact === 'high' ? 'عالي' : 
                        item.impact === 'medium' ? 'متوسط' : 'منخفض'}
                      </span>
                    </TableCell>
                    <TableCell>
                      {item.impact === 'high' ? 'طلب فوري' : 
                      item.impact === 'medium' ? 'طلب عاجل' : 'إضافة للطلبيات القادمة'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
          
          <div className="mt-4 p-3 border rounded-md bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-400">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <AlertTriangle size={16} />
              تنبيه هام:
            </h4>
            <ul className="list-disc list-inside text-sm">
              <li>يوجد {outOfStockItems.filter(i => i.impact === 'high').length} عنصر ذو تأثير عالي يتطلب إجراءً فورياً</li>
              <li>العناصر النافذة قد تؤثر على عمليات الإنتاج وقدرة المصنع على تلبية الطلبات</li>
              <li>يُقترح مراجعة سياسة الحد الأدنى للمخزون وإعادة الطلب لتجنب نفاذ المخزون مستقبلاً</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    );
  };
  
  // المكون الرئيسي
  const { title, description } = getTitleAndDescription();
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="p-1.5 rounded-full bg-primary/10 text-primary">
              {getIcon()}
            </span>
            <span>{title}</span>
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden">
          {renderDetailContent()}
        </div>
        
        <DialogFooter>
          <Button onClick={onClose}>إغلاق</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DetailModal;
