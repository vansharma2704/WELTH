"use client";

import dynamic from "next/dynamic";
import React from "react";

// 1. Dynamically import your REAL form with ssr: false
const AddTransactionForm = dynamic(
  () => import('./transaction-form'),
  { 
    ssr: false, 
    loading: () => <p>Loading form...</p> 
  }
);

// 2. This new component just passes all the props through
const TransactionFormLoader = (props) => {
  return <AddTransactionForm {...props} />;
};

export default TransactionFormLoader;