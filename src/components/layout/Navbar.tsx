
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Bell, Menu, Search, X } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import Sidebar from './Sidebar';

const Navbar: React.FC = () => {
  const [showSearch, setShowSearch] = useState(false);
  
  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-200 px-4 h-16 flex items-center justify-between">
      <div className="flex items-center">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu size={20} />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="p-0 w-72">
            <Sidebar />
          </SheetContent>
        </Sheet>
        
        <Link to="/" className="flex items-center ml-4">
          <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
            DELIGHT
          </span>
        </Link>
      </div>
      
      <div className="hidden md:flex flex-1 max-w-xs mx-auto relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
        <Input 
          placeholder="بحث..."
          className="pl-10 pr-4 bg-gray-50"
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
        
        {showSearch && (
          <div className="absolute top-16 left-0 right-0 p-2 bg-white border-b border-gray-200 md:hidden">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <Input 
                placeholder="بحث..."
                className="pl-10 pr-4 bg-gray-50"
                autoFocus
              />
            </div>
          </div>
        )}
        
        <Button variant="ghost" size="icon" className="relative">
          <Bell size={20} />
          <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs">3</Badge>
        </Button>
        
        <Avatar className="h-8 w-8">
          <AvatarImage src="" />
          <AvatarFallback className="bg-primary text-primary-foreground">إد</AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
};

export default Navbar;
