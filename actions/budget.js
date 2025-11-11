"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";


export async function getCurrentBudget(accountId) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
      where: { clerkUserid: userId },
    });

    if (!user) {
      throw new Error("User not found");
    }

    const budget = await db.budget.findFirst({
      where: {
        userID: user.id,
      },
    });

const currentDate = new Date();
const startOfMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    1,
    0 ,0 ,0 , 0
);

const firstDayOfNextMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1, // Go to next month
    1,
    0, 0, 0, 0
);

const endofMonth = new Date(
firstDayOfNextMonth.getTime()-1
);


const expenses = await db.transaction.aggregate({
    where:{
        userId: user.id,
        type: "EXPENSE",
       /* date: {
            gte: startOfMonth,
            lte: endofMonth,
        },
        ...(accountId && {accountId}),
    */},
    _sum:{
        amount: true,
    }
});

return{
    budget: budget ? {...budget, amount: budget.amount.toNumber()} : null,
    currentExpenses: expenses._sum.amount?.toNumber() ?? 0,};

  }catch (error){
    console.error("Error fetching budget:", error);
    throw error;
  }
}

export async function updateBudget(amount){
 try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
      where: { clerkUserid: userId },
    });

    if (!user) {
      throw new Error("User not found");
    }


    const budget = await db.budget.upsert({
        where: {
            userID: user.id,
        },
        update: {
            amount,
        },
        create: {
            userID: user.id,
            amount,
        },
    });


    revalidatePath("/dashboard");
    return {
        success: true,
        data: {...budget, amount: budget.amount.toNumber() },
    };
 } catch (error) {
    console.error("Error updating budget:", error);
    return {success: false, error: error.message};
 }   
}