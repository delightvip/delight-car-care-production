
import React from 'react';
import { Outlet } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';

interface AppLayoutProps {
  children?: React.ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = () => {
  return (
    <Layout>
      <Outlet />
    </Layout>
  );
};

export default AppLayout;
