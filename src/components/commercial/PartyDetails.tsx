
import React from 'react';
import { Party } from '@/services/PartyService';

interface PartyDetailsProps {
  party: Party;
}

export function PartyDetails({ party }: PartyDetailsProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="font-medium">الاسم:</span>
        <span>{party.name}</span>
      </div>
      
      <div className="flex items-center gap-2">
        <span className="font-medium">النوع:</span>
        <span>
          {party.type === 'customer' ? 'عميل' :
           party.type === 'supplier' ? 'مورد' : 'آخر'}
        </span>
      </div>
      
      {party.phone && (
        <div className="flex items-center gap-2">
          <span className="font-medium">الهاتف:</span>
          <span>{party.phone}</span>
        </div>
      )}
      
      {party.email && (
        <div className="flex items-center gap-2">
          <span className="font-medium">البريد الإلكتروني:</span>
          <span>{party.email}</span>
        </div>
      )}
      
      {party.address && (
        <div className="flex items-center gap-2">
          <span className="font-medium">العنوان:</span>
          <span>{party.address}</span>
        </div>
      )}
    </div>
  );
}
