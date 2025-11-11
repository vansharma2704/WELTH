"use client";

import React, { useEffect } from "react";
import { toast } from "sonner";
import { useFetch } from "@/hooks/use-fetch";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { ArrowDownRight, ArrowUpRight, Loader2, Trash2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { updateDefaultAccount } from "@/actions/accounts";
import { deleteAccount } from "@/actions/dashboard";

//
// --- This is the DeleteButton component ---
//
function DeleteButton({ onClick, disabled }) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className="text-red-500 hover:text-red-600"
      disabled={disabled}
      onClick={onClick}
    >
      {disabled ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Trash2 className="h-4 w-4" />
      )}
    </Button>
  );
}

//
// --- Your updated AccountCard component ---
//
const AccountCard = ({ account }) => {
  const { name, type, balance, id, isDefault } = account;

  // --- useFetch for the SWITCH ---
  const {
    loading: updateDefaultLoading,
    fn: updateDefaultFn,
    data: updatedAccount,
    error: updateError,
  } = useFetch(updateDefaultAccount);

  // --- useFetch for DELETE ---
  const {
    loading: deleteLoading,
    fn: deleteFn,
    data: deletedAccount,
    error: deleteError,
  } = useFetch(deleteAccount);


  const handleDefaultChange = async (event) => {
    event.preventDefault();
    if (isDefault) {
      toast.warning("You must have at least 1 default account");
      return;
    }
    await updateDefaultFn(id);
  };

  // --- Handle Delete Click ---
  const handleDelete = async (event) => {
    event.preventDefault();
    // You can add an "Are you sure?" popup here
    await deleteFn(id);
  };

  // --- useEffect for SWITCH ---
  useEffect(() => {
    if (updatedAccount?.success) {
      toast.success("Default account updated successfully");
    }
    if (updateError) {
      toast.error(updateError.message || "Failed to update default account");
    }
  }, [updatedAccount, updateError]);


  // --- useEffect for DELETE ---
  useEffect(() => {
    if (deletedAccount?.success) {
      toast.success("Account deleted successfully");
    }
    if (deleteError) {
      toast.error(deleteError.message || "Failed to delete account");
    }
  }, [deletedAccount, deleteError]);


  return(

    <Card className="flex flex-col h-full hover:border border-gray-300  cursor-pointer transform transition-all duration-300 hover:-translate-y-1 hover:scale-105 hover:shadow-lg">
      <Link href={`/account/${id}`} className="flex flex-col flex-grow">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{name}</CardTitle>
          
          {/* --- Spinning Switch --- */}
          {updateDefaultLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Switch
              checked={isDefault}
              onClick={handleDefaultChange}
              className="data-[state=unchecked]:bg-gray-400 data-[state=checked]:bg-black"
            />
          )}
        </CardHeader>
        <CardContent className="p-6 pt-4 flex-grow">
          <div className="text-2xl font-bold mb-1">
            ₹{parseFloat(balance).toFixed(2)}
          </div>
          <p className="text-xs text-muted-foreground">
            {type.charAt(0).toUpperCase() + type.slice(1).toLowerCase()} Account
          </p>
        </CardContent>
      </Link>
      <CardFooter className="flex items-center justify-between text-sm text-muted-foreground">
        
        {/* --- Income/Expense on the Left --- */}
        <div className="flex items-center gap-4">
          <div className="flex items-center">
            <ArrowUpRight className="mr-1 h-4 w-4 text-green-500" />
            Income
          </div>
          <div className="flex items-center">
            <ArrowDownRight className="mr-1 h-4 w-4 text-red-500" />
            Expense
          </div>
        </div>

        {/* --- UPDATED: Delete Button is now wired up --- */}
        <DeleteButton
          onClick={handleDelete}
          disabled={deleteLoading}
        />

      </CardFooter>
    </Card>
  );
};

export default AccountCard;