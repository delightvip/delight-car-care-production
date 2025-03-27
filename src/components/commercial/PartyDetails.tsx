
import React from 'react';
import { Party } from '@/services/PartyService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Phone, Mail, MapPin, User, Briefcase, Calendar } from 'lucide-react';

interface PartyDetailsProps {
  party: Party;
}

export function PartyDetails({ party }: PartyDetailsProps) {
  const createdAt = party.created_at ? new Date(party.created_at).toLocaleDateString() : 'غير محدد';
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>تفاصيل {party.type === 'customer' ? 'العميل' : party.type === 'supplier' ? 'المورد' : 'الطرف'}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">الاسم</p>
                <p className="font-medium">{party.name}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Briefcase className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">النوع</p>
                <p className="font-medium">
                  {party.type === 'customer' ? 'عميل' :
                  party.type === 'supplier' ? 'مورد' : 'آخر'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">تاريخ الإضافة</p>
                <p className="font-medium">{createdAt}</p>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            {party.phone && (
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">الهاتف</p>
                  <p className="font-medium">{party.phone}</p>
                </div>
              </div>
            )}
            
            {party.email && (
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">البريد الإلكتروني</p>
                  <p className="font-medium">{party.email}</p>
                </div>
              </div>
            )}
            
            {party.address && (
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">العنوان</p>
                  <p className="font-medium">{party.address}</p>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <Separator className="my-4" />
        
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">الرصيد الحالي</p>
            <p className={`text-xl font-bold ${party.balance > 0 ? 'text-red-600' : party.balance < 0 ? 'text-green-600' : ''}`}>
              {Math.abs(party.balance).toFixed(2)} {party.balance > 0 ? '(مدين)' : party.balance < 0 ? '(دائن)' : ''}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
