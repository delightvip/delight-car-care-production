
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export interface RelatedProductsTableProps {
  relatedProducts: any[];
  productType: string;
}

const RelatedProductsTable: React.FC<RelatedProductsTableProps> = ({ 
  relatedProducts,
  productType
}) => {
  const navigate = useNavigate();

  const handleViewProduct = (id: number) => {
    navigate(`/inventory/${productType}/${id}`);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Related Products</CardTitle>
      </CardHeader>
      <CardContent>
        {relatedProducts && relatedProducts.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {relatedProducts.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>{product.code}</TableCell>
                  <TableCell>{product.name}</TableCell>
                  <TableCell>{product.quantity} {product.unit}</TableCell>
                  <TableCell>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleViewProduct(product.id)}
                    >
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-4 text-muted-foreground">No related products</div>
        )}
      </CardContent>
    </Card>
  );
};

export default RelatedProductsTable;
