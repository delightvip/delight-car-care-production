
import React from 'react';
import { Link } from 'react-router-dom';

interface SidebarBrandingProps {
  brandName: string;
  brandVersion?: string;
  brandImage?: string;
}

const SidebarBranding: React.FC<SidebarBrandingProps> = ({
  brandName,
  brandVersion,
  brandImage
}) => {
  return (
    <div className="flex items-center py-4 px-4">
      {brandImage && (
        <img
          src={brandImage}
          alt={brandName}
          className="h-8 w-8 rounded-md mr-2"
        />
      )}
      <Link to="/" className="flex items-center">
        <h1 className="text-lg font-bold">{brandName}</h1>
        {brandVersion && (
          <span className="text-xs text-muted-foreground ml-2">
            v{brandVersion}
          </span>
        )}
      </Link>
    </div>
  );
};

export default SidebarBranding;
