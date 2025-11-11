import { getUserAccounts } from '@/actions/dashboard';
import { defaultCategories } from '@/data/categories';
import React from 'react';
import { getTransaction } from '@/actions/transaction';

// Import the new wrapper component, NOT the form itself
import TransactionFormLoader from '../_components/transaction-form-loader';

const AdTransactionPage = async ({ searchParams }) => {

  const accounts = await getUserAccounts();
  const editId = searchParams?.edit;
  
  console.log("Edit ID from URL:", editId);
   
  let initialData = null;
  if(editId) {
    try {
      const transaction = await getTransaction(editId);
      initialData = transaction;
    } catch (error) {
      console.error("Failed to fetch transaction:", error);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-5">
        <h1 className="text-5xl gradient-title mb-8">
          {editId ? "Edit" : "Add"} Transaction</h1>

        {/* Render the loader, which will handle the dynamic import */}
        <TransactionFormLoader 
          accounts = {accounts}
          categories = {defaultCategories}
          editMode = {!!editId}
          initialData = {initialData}
        />
    </div>
  );
};

export default AdTransactionPage;