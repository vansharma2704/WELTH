"use server";

import aj from "@/lib/arcjet";
import { db } from "@/lib/prisma";
import { request } from "@arcjet/next";
import  {auth}  from "@clerk/nextjs/server";


import  {revalidatePath}  from "next/cache";
import { success } from "zod";




const serializeAmount = (obj) => ({
  ...obj,
  
  amount: obj.amount.toNumber(),
  
 
  date: obj.date.toISOString(),
  createdAt: obj.createdAt.toISOString(), 
  updatedAt: obj.updatedAt.toISOString(), 


  nextRecurringDate: obj.nextRecurringDate
    ? obj.nextRecurringDate.toISOString()
    : null,
});

export async function createTransaction(data){
 try { 
    const {userId} = await auth();
    if (!userId) throw new Error("Unauthorized");

    // Arcjet to add rate limiting
    const req = await request();
    const decision = await aj.protect(req,{
        userId,
        requested: 1,
    });

    if(decision.isDenied()){
        if(decision.reason.isRateLimit()){
            const {remaining, reset} = decision.reason;
            console.error({
                code: "RATE_LIMIT_EXCEEDED",
                details: {
                    remaining,
                    resetInSeconds: reset,
                },
            });

            throw new Error("Too many requests. Please try again later.");
        }
            throw new Error("Request Blocked");
    }
        
    const user = await db.user.findUnique({
    where: {clerkUserid: userId},
  });
        
    if(!user){
  throw new Error("User not found");
    }

    const account = await db.account.findUnique({
        where: {
            id: data.accountId,
            userId: user.id,
        },
    });

    if(!account){
        throw new Error("Account not found");
    }

    const balanceChange = data.type === "EXPENSE" ? -data.amount : data.amount;
    const newBalance = account.balance.toNumber() + balanceChange;

    const transaction = await db.$transaction(async(tx)=>{
        const newTransaction = await tx.transaction.create({
            data:{
                type: data.type,
                amount: data.amount,
                description: data.description,
                date: data.date,
                accountId: data.accountId,
                category: data.category,
                userId:user.id,

                isRecurring: data.isRecurring,
                
                recurringInterval: data.isRecurring ? data.recurringInterval : null,
                nextRecurringDate: data.isRecurring && data.recurringInterval
                ? calculateNextRecurringDate(data.date, data.recurringInterval) 
                : null ,
            },
        });

        await tx.account.update({
            where: {id: data.accountId},
            data: {balance: newBalance},
        });

        return newTransaction;
    });

    revalidatePath("/dashboard");
    revalidatePath(`/account/${transaction.accountId}`);

    return {success: true, data: serializeAmount(transaction) };
 } catch (error) {
    return {success:false,message:error.message};
 }
}

function calculateNextRecurringDate(startDate, interval){
    const date = new Date(startDate);

    switch (interval){
        case "DAILY":
            date.setDate(date.getDate() + 1);
            break;
        case "WEEKLY":
            date.setDate(date.getDate() + 7);
            break;
        case "MONTHLY":
            date.setDate(date.getMonth() + 1);
            break;
        case "YEARLY":
            date.setFullYear(date.getFullYear() + 1);
            break;
    }

    return date;
}

export async function scanReceipt(file) {
   
}

export async function getTransaction(id) {
    const {userId} = await auth();
    if (!userId) throw new Error ("Unauthorized");

    const user = await db.user.findUnique({
        where: {clerkUserid: userId},
    });

    if(!user) throw new Error("User not found");

    const transaction = await db.transaction.findUnique({
        where: {
            id,
            userId: user.id,
        },
    });

    if(!transaction) throw new Error("Transaction not found");

    return serializeAmount(transaction);
}

// REPLACE your old function with this one
export async function updateTransaction(id, data) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
      where: { clerkUserid: userId },
    });

    if (!user) throw new Error("User not found");

    const originalTransaction = await db.transaction.findUnique({
      where: {
        id,
        userId: user.id,
      },
      include: {
        account: true,
      },
    });

    if (!originalTransaction) throw new Error("Transaction not found");

    // --- START OF NEW BALANCE LOGIC ---

    // 1. Calculate the old and new balance changes
    const oldBalanceChange =
      originalTransaction.type === "EXPENSE"
        ? -originalTransaction.amount.toNumber()
        : originalTransaction.amount.toNumber();

    const newBalanceChange =
      data.type === "EXPENSE" ? -data.amount : data.amount;

    // 2. Start the database transaction
    const transaction = await db.$transaction(async (tx) => {
      // 3. Update the transaction itself
      const updated = await tx.transaction.update({
        where: {
          id,
          userId: user.id,
        },
        data: {
          ...data,
          nextRecurringDate:
            data.isRecurring && data.recurringInterval
              ? calculateNextRecurringDate(data.date, data.recurringInterval)
              : null,
        },
      });

      // 4. Check if the account was changed
      if (originalTransaction.accountId === data.accountId) {
        // --- Case 1: Account is THE SAME ---
        // We only need to apply the net difference
        const netBalanceChange = newBalanceChange - oldBalanceChange;
        await tx.account.update({
          where: { id: data.accountId },
          data: {
            balance: {
              increment: netBalanceChange,
            },
          },
        });
      } else {
        // --- Case 2: Account was CHANGED ---
        // Revert the old transaction from the old account
        await tx.account.update({
          where: { id: originalTransaction.accountId },
          data: {
            balance: {
              increment: -oldBalanceChange, // Revert the old amount
            },
          },
        });

        // Apply the new transaction to the new account
        await tx.account.update({
          where: { id: data.accountId },
          data: {
            balance: {
              increment: newBalanceChange, // Apply the new amount
            },
          },
        });
      }
      // --- END OF NEW BALANCE LOGIC ---

      return updated;
    });

    revalidatePath("/dashboard");
    revalidatePath(`/account/${data.accountId}`);
    
    // This now correctly revalidates the old account page if it changed
    if (originalTransaction.accountId !== data.accountId) {
      revalidatePath(`/account/${originalTransaction.accountId}`);
    }

    // FIX: Changed "sucess" to "success"
    return { success: true, data:{accountId: transaction.accountId}  };

  } catch (error) {
    // FIX: Return an object instead of throwing
    return { success: false, message: error.message };
  }
}