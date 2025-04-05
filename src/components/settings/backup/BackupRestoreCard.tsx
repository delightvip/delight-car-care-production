
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Database } from "lucide-react";
import BackupSection from "./BackupSection";
import RestoreSection from "./RestoreSection";

const BackupRestoreCard = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database size={20} />
          <span>النسخ الاحتياطي واستعادة البيانات</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <BackupSection />
        <Separator />
        <RestoreSection />
      </CardContent>
    </Card>
  );
};

export default BackupRestoreCard;
