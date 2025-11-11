import { getDashboardData, getUserAccounts } from "@/actions/dashboard";
import CreateAccountDrawer from "@/components/create-account-drawer";
import { Card, CardContent } from "@/components/ui/card";
import { Plus } from "lucide-react";
import React, { Suspense } from "react";
import AccountCard from "./_components/account-card";
import { getCurrentBudget } from "@/actions/budget";
import BudgetProgress from "./_components/budget-progress";
import DashboardOverview from "./_components/transaction-overview";


  async function DashboardPage() {
  const accounts = await getUserAccounts()

  

  const defaultAccount = accounts?.find((account) => account.isDefault);



  let budgetData = null;
  if (defaultAccount){
    budgetData = await getCurrentBudget(defaultAccount.id);
  }

  console.log(budgetData);

  const transactions = await getDashboardData();

  console.log("SERVER TRANSACTIONS:", transactions);

    return (
    <div className="px-5">
      {/*Budget Progress*/}

      {defaultAccount && (
      <BudgetProgress
          initialBudget={budgetData?.budget}
          currentExpenses={budgetData?.currentExpenses || 0}
      
      />)}

      {/* Overview*/}
      <div className="mt-8">
      <Suspense fallback={"Loading Overview..."}>
        <DashboardOverview      
        accounts={accounts}
        transactions={transactions || []}
        />

      </Suspense>
      </div>
      {/* Accounts Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-8">
        <CreateAccountDrawer>
          <Card className="border border-gray-300 hover:border  cursor-pointer 
  transform transition-all duration-300 hover:-translate-y-1 hover:scale-105 hover:shadow-lg">
  <CardContent className="flex flex-col items-center justify-center py-6">
    <Plus className="h-10 w-10 mb-2" />
    <p className="text-sm font-medium">Add New Account</p>
  </CardContent>
</Card>
        </CreateAccountDrawer>

        {accounts.length>0 && 
        accounts?.map((account)=>{
          return <AccountCard key ={account.id} account={account} />;

        })}

      </div>
    </div>
    );
 };

export default DashboardPage;