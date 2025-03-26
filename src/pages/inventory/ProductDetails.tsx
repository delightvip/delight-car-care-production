
import React from 'react';
import { useParams } from 'react-router-dom';
import ProductDetailsContainer from './ProductDetailsContainer';

const ProductDetails = () => {
  const { id } = useParams<{ id: string }>();
  
  return <ProductDetailsContainer id={id} />;
};

export default ProductDetails;
