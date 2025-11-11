import { sendEmail } from "@/actions/send-email";
import { db } from "../prisma";
import { inngest } from "./client";
import EmailTemplate from "@/emails/template";

// Helper function to check if the last alert was sent in a previous month/year
function isNewMonth(lastAlertDate, currentDate) {
  return (
    lastAlertDate.getMonth() !== currentDate.getMonth() ||
    lastAlertDate.getFullYear() !== currentDate.getFullYear()
  );
}

export const checkBudgetAlert = inngest.createFunction(
  { name: "Check Budget Alert" },
  { cron: "0 */6 * * *" }, // Runs every 6 hours
  async ({ step }) => {
    
    // 1. Fetch all budgets with necessary user and default account data
    const budgets = await step.run("fetch-budget", async()=>{
       return await db.budget.findMany({
        include: {
          user: {
            include: {
              accounts: {
                where: {
                  isDefault: true,
                },
              },
            },
          },
        },
      });
    });
  
  for(const budget of budgets){
    const defaultAccount = budget.user.accounts[0];
    if(!defaultAccount) continue; // Skip budgets without a default account

    await step.run(`check-budget-${budget.id}`,async () =>{
     
        // 🔑 FIX: Set startDate to midnight (00:00:00.000) for full month coverage
       const startDate = new Date();
       startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0); 


       // Aggregate all expenses from the start of the current month
       const expenses = await db.transaction.aggregate({
          where: {
            userId: budget.userId,
            type: "EXPENSE",
          },
          _sum: {
            amount: true,
          },
        });

        const totalExpenses = expenses._sum.amount?.toNumber() || 0;
        
        // 🔑 FIX: Ensure budgetAmount is a number for accurate math (Prisma Decimal/String handling)
        const budgetAmount = budget.amount; 
        const budgetAmountNum = (budgetAmount && budgetAmount.toNumber) 
            ? budgetAmount.toNumber() 
            : parseFloat(String(budgetAmount)) || 0;
            
        const percentageUsed = (totalExpenses / budgetAmountNum) * 100;
        
        // --- Debugging Logs ---
        console.log(`[Budget ${budget.id}] Total Expenses: ${totalExpenses}`);
        console.log(`[Budget ${budget.id}] Percentage Used: ${percentageUsed.toFixed(2)}%`);
        // ----------------------

        // 1. Check if the alert threshold is met
        const isOverBudget = percentageUsed >= 80;
        
        // 2. 🔑 FINAL FIX: Check if a new alert is needed by isolating the date conversion
        let needsNewAlert = false;
        
        if (!budget.lastAlertSent) {
            // Case A: First alert ever (lastAlertSent is null)
            needsNewAlert = true;
        } else {
            // Case B: Alert has been sent before, check if it was in a new month
            // We only call new Date() when the value is NOT null, preventing the TypeError.
            const lastAlertDate = new Date(budget.lastAlertSent);
            
            // Check if the resulting date object is valid before continuing
            if (!isNaN(lastAlertDate.getTime())) {
                needsNewAlert = isNewMonth(lastAlertDate, new Date());
            } else {
                // Handle case where date string was corrupted; assume alert is needed.
                console.error(`[Budget ${budget.id}] Corrupted lastAlertSent date found. Forcing alert.`);
                needsNewAlert = true;
            }
        }
        
        // Check the final alert condition
        if (isOverBudget && needsNewAlert) {
          
          console.log(`[Budget ${budget.id}] ALERT CONDITION MET. Updating timestamp.`);

       // send Email
       await sendEmail({
        to:budget.user.email,
        subject: `Budget Alert for ${defaultAccount.name}`,
        react:EmailTemplate({
                userName: budget.user.name,
                type: "budget-alert",
                data: {
                  percentageUsed,
                  budgetAmount: parseInt(budgetAmount).toFixed(1),
                  totalExpenses: parseInt(totalExpenses).toFixed(1),
                  accountName: defaultAccount.name,
                }
        }),
       });  


       // Update last Alert Sent to the current timestamp
          await db.budget.update({
            where: {id: budget.id},
            data: {lastAlertSent: new Date()},
          });
        }
    });
   }
  }
);