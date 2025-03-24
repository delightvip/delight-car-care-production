
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Bell, Menu, Search, X, Moon, Sun } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';

const Navbar = () => {
  const [showSearch, setShowSearch] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  
  // Listen for scroll events
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    // Here you would implement actual dark mode logic
  };
  
  return (
    <header className={`fixed top-0 left-0 right-0 z-40 backdrop-blur-md border-b transition-all duration-300 px-4 h-16 flex items-center justify-between ${
      scrolled ? 'bg-white/90 shadow-sm' : 'bg-white/80'
    }`}>
      <div className="flex items-center">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu size={20} />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="p-0 w-72">
            <ScrollArea className="h-full pt-10">
              <div className="px-4 py-6">
                <div className="text-xl font-bold mb-8 text-center">
                  DELIGHT
                </div>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-medium mb-3">الرئيسية</h3>
                    <div className="space-y-1">
                      <Link to="/" className="flex items-center gap-2 text-sm p-2 rounded-md hover:bg-muted">
                        <span>لوحة التحكم</span>
                      </Link>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium mb-3">المخزون</h3>
                    <div className="space-y-1">
                      <Link to="/inventory/raw-materials" className="flex items-center gap-2 text-sm p-2 rounded-md hover:bg-muted">
                        <span>المواد الأولية</span>
                      </Link>
                      <Link to="/inventory/semi-finished" className="flex items-center gap-2 text-sm p-2 rounded-md hover:bg-muted">
                        <span>المنتجات النصف مصنعة</span>
                      </Link>
                      <Link to="/inventory/packaging" className="flex items-center gap-2 text-sm p-2 rounded-md hover:bg-muted">
                        <span>مستلزمات التعبئة</span>
                      </Link>
                      <Link to="/inventory/finished-products" className="flex items-center gap-2 text-sm p-2 rounded-md hover:bg-muted">
                        <span>المنتجات النهائية</span>
                      </Link>
                      <Link to="/inventory/low-stock" className="flex items-center gap-2 text-sm p-2 rounded-md hover:bg-muted">
                        <span>المخزون المنخفض</span>
                      </Link>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium mb-3">الإنتاج</h3>
                    <div className="space-y-1">
                      <Link to="/production/orders" className="flex items-center gap-2 text-sm p-2 rounded-md hover:bg-muted">
                        <span>أوامر الإنتاج</span>
                      </Link>
                      <Link to="/production/packaging" className="flex items-center gap-2 text-sm p-2 rounded-md hover:bg-muted">
                        <span>أوامر التعبئة</span>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </SheetContent>
        </Sheet>
        
        <SidebarTrigger className="hidden md:flex mr-2" />
        
        <Link to="/" className="flex items-center ml-4">
          <motion.span 
            initial={{ opacity: 0, y: -10 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.3 }}
            className="text-xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent"
          >
            DELIGHT
          </motion.span>
        </Link>
      </div>
      
      <div className="hidden md:flex flex-1 max-w-xs mx-auto relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
        <Input 
          placeholder="بحث..."
          className="pl-10 pr-4 bg-gray-50/80 transition-all duration-300 focus:bg-white"
        />
      </div>
      
      <div className="flex items-center gap-2">
        <Button 
          variant="ghost" 
          size="icon" 
          className="md:hidden"
          onClick={() => setShowSearch(!showSearch)}
        >
          {showSearch ? <X size={20} /> : <Search size={20} />}
        </Button>
        
        <AnimatePresence>
          {showSearch && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="absolute top-16 left-0 right-0 p-2 bg-white border-b border-gray-200 md:hidden z-30"
            >
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <Input 
                  placeholder="بحث..."
                  className="pl-10 pr-4 bg-gray-50"
                  autoFocus
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={toggleDarkMode}
              className="hidden md:flex"
            >
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{darkMode ? 'وضع النهار' : 'وضع الليل'}</TooltipContent>
        </Tooltip>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell size={20} />
              <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs">3</Badge>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <ScrollArea className="max-h-[80vh]">
              <div className="p-4 border-b">
                <h3 className="font-medium">الإشعارات</h3>
                <p className="text-xs text-muted-foreground">لديك 3 إشعارات جديدة</p>
              </div>
              <div>
                <DropdownMenuItem className="p-3 cursor-pointer hover:bg-muted flex flex-col items-start">
                  <div className="font-medium text-sm">طلب إنتاج جديد</div>
                  <div className="text-xs text-muted-foreground">تم إنشاء طلب إنتاج جديد بواسطة محمد</div>
                  <div className="text-xs text-muted-foreground mt-1">منذ 5 دقائق</div>
                </DropdownMenuItem>
                <DropdownMenuItem className="p-3 cursor-pointer hover:bg-muted flex flex-col items-start">
                  <div className="font-medium text-sm">تنبيه مخزون منخفض</div>
                  <div className="text-xs text-muted-foreground">كحول إيثيلي وصل للحد الأدنى</div>
                  <div className="text-xs text-muted-foreground mt-1">منذ ساعة</div>
                </DropdownMenuItem>
                <DropdownMenuItem className="p-3 cursor-pointer hover:bg-muted flex flex-col items-start">
                  <div className="font-medium text-sm">اكتمال طلب التعبئة</div>
                  <div className="text-xs text-muted-foreground">تم الانتهاء من طلب تعبئة ملمع تابلوه</div>
                  <div className="text-xs text-muted-foreground mt-1">منذ 3 ساعات</div>
                </DropdownMenuItem>
              </div>
              <div className="p-2 border-t">
                <Button variant="outline" size="sm" className="w-full">عرض كل الإشعارات</Button>
              </div>
            </ScrollArea>
          </DropdownMenuContent>
        </DropdownMenu>
        
        <Avatar className="h-8 w-8 transition-transform hover:scale-110">
          <AvatarImage src="" />
          <AvatarFallback className="bg-primary text-primary-foreground">أح</AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
};

export default Navbar;
