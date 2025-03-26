
import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const NavbarBranding = () => {
  return (
    <Link to="/" className="text-xl font-bold">
      <motion.span 
        className="text-primary"
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
      >
        ديلايت
      </motion.span>
      <motion.span 
        className="text-muted-foreground"
        initial={{ opacity: 0, x: -5 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        مصنع
      </motion.span>
    </Link>
  );
};

export default NavbarBranding;
