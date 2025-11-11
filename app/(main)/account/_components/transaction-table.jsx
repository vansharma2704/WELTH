"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";


import { format } from "date-fns";

import React, { useEffect, useMemo, useState } from "react";

import { ChevronDown, ChevronUp, Clock, MoreHorizontal, RefreshCcw, Search, Trash, X } from "lucide-react";

import { categoryColors } from "@/data/categories";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { Badge } from "@/components/ui/badge";

import { TooltipProvider } from "@radix-ui/react-tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFetch } from "@/hooks/use-fetch";
import { bulkDeleteTransactions } from "@/actions/accounts";
import { BarLoader } from "react-spinners";
import { toast } from "sonner";

const RECCURRING_INTERVALS = {
  DAILY: "Daily",
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
  YEARLY: "Yearly",
};

const isValidDate = (d) => d && !isNaN(new Date(d));

// --- Define a simple data structure for clarity (Optional but recommended) ---

/**

 * @typedef {Object} Transaction

 * @property {string} id

 * @property {string} date - A date string (e.g., "2024-10-25T10:00:00Z")

 * @property {string} description

 * @property {string} category

 * @property {number} amount

 * @property {boolean} isRecurring

 */

/**

 * @param {{ transactions: Transaction[] }} props

 */

const TransactionTable = ({ transactions }) => {
  const router = useRouter();

  const [selectedIds,setSelectedIds] = useState([]);
  const [sortConfig, setSortConfig] = useState({
    field:"date",
    direction:"desc",
  });
 
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [recurringFilter, setRecurringFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE =10;
  

  const {
    loading: deleteLoading,
    fn: deleteFn,
    data: deleted,
  } = useFetch(bulkDeleteTransactions);


  const filteredAndSortedTransactions = useMemo(() => {
    let result = [... transactions];

  if (searchTerm){
    const searchLower = searchTerm.toLowerCase();
    result = result.filter((transaction) => 
      transaction.description?.toLowerCase().includes(searchLower)
    );
  }

  if(recurringFilter){
    result = result.filter((transaction) => {
      if(recurringFilter === "recurring") return transaction.isRecurring;
      return !transaction.isRecurring;
    });
  }

  if(typeFilter){
    result = result.filter((transaction) => transaction.type === typeFilter);
  }

  result.sort((a,b) => {
    let comparison = 0;

    switch (sortConfig.field){
      case "date":
        comparison = new Date(a.date) - new Date(b.date);
        break;
      case "amount":
        comparison = a.amount - b.amount;
        break;
      case "category":
        comparison = a.category.localeCompare(b.category);
        break;

      default:
        comparison = 0;
        break;
    }
    return sortConfig.direction === "asc" ? comparison : -comparison;
  });



 
    return result;
  },[transactions,searchTerm,typeFilter,recurringFilter,sortConfig,]);

  const totalPages = Math.ceil(filteredAndSortedTransactions.length / ITEMS_PER_PAGE);
  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredAndSortedTransactions.slice(
      startIndex,
      startIndex + ITEMS_PER_PAGE
    );
  }, [filteredAndSortedTransactions, currentPage]);
  
  const handleSort = (field) => {
    setSortConfig(current=>({
      field,
      direction:
      current.field==field && current.direction === "asc" ?"desc":"asc"

    }))
  };

  const handleSelect=(id)=>{
    setSelectedIds((current) =>
      current.includes(id)
    ?current.filter((item) => item !=id)
    :[...current,id]
);
  };

  const handleSelectAll=(id)=>{ setSelectedIds((current) =>
      current.length === paginatedTransactions.length  
    ? []
    : paginatedTransactions.map((t) => t.id)
);};

const handleBulkDelete= async () => {
  if(!window.confirm(
      `Are you sure you want to delete ${selectedIds.length} transactions?`
    ))
    {
      return;
    }
    deleteFn(selectedIds);
    
  };

  useEffect(() =>{
    if (deleted && !deleteLoading){
      toast.error("Transactions deleted successfully");
      setSelectedIds([]);
    }
  }, [deleted , deleteLoading]);

const handleClearFilters=() => {
  setSearchTerm("");
  setTypeFilter("");
  setRecurringFilter("");
  setSelectedIds([]);
};


  return (
    <div className="space-y-4">
      {deleteLoading && (
        <BarLoader className="mt-4" width={"100%"} color="#9333ea" />
        )}

      {/* Filters */}
<div className="flex flex-col sm:flex-row gap-4">
  <div className="relative flex-1">
    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground"/>
    <Input
    placeholder = "Search Transactions..."
    value={searchTerm}
    onChange={(e) => setSearchTerm(e.target.value)}
    className="pl-8 border-gray-400" 
    />
  </div>
  <div className="flex gap-2">
    <Select value={typeFilter} onValueChange={setTypeFilter}>
  <SelectTrigger className="border-gray-400">
    <SelectValue placeholder="All Types" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="INCOME">Income</SelectItem>
    <SelectItem value="EXPENSE">Expense</SelectItem>
  </SelectContent>
</Select>

<Select value={recurringFilter} onValueChange={(value)=>setRecurringFilter(value)}>
  <SelectTrigger className="w-[150px] border-gray-400">
    <SelectValue placeholder="All Transaction" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="recurring">Recurring Only</SelectItem>
    <SelectItem value="non-recurring">Non-recurring Only</SelectItem>
  </SelectContent>
</Select> 

{selectedIds.length>0 && (
  <div className="flex items-center gap-2">
    <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
      <Trash className="h-4 w-4 mr-2" />
      Delete Selected({selectedIds.length})
    </Button>
  </div>
) }

{(searchTerm || typeFilter || recurringFilter)&&(
  <Button 
  variant="outline" 
  size="icon" 
  onClick={handleClearFilters} 
  title="Clear Filters">
    <X className="h-4 w-5 "/></Button>
)}

  </div>

</div>

      {/* Transactions */}

      <div className="rounded-md border">
        <Table className="border-collapse border border-gray-300">
          <TableHeader>
            <TableRow>
              {/* 1. Checkbox */}

              <TableHead className="w-[50px]">
                <Checkbox onCheckedChange={handleSelectAll}
                checked={
                  selectedIds.length === filteredAndSortedTransactions.length && filteredAndSortedTransactions.length > 0
                }
                className="border-gray-600"/>
              </TableHead>

              {/* 2. Date */}

              <TableHead
                className="cursor-pointer"
                onClick={() => handleSort("date")}
              >
                <div className="flex items-center">Date{sortConfig.field==='date' && (
                  sortConfig.direction==="asc"? (
                  <ChevronUp className="m1-1 h-4 w-4"/>
                ):(
                  <ChevronDown className="m1-1 h-4 w-4"/>
                ))}</div>
              </TableHead>

              {/* 3. Description */}

              <TableHead>Description</TableHead>

              {/* 4. Category */}

              <TableHead
                className="cursor-pointer"
                onClick={() => handleSort("category")}
              >
                <div className="flex items-center">
                  Category 
                  {sortConfig.field==="category" && 
                  (sortConfig.direction==="asc"? (
                  <ChevronUp className="m1-1 h-4 w-4"/>
                ):(
                  <ChevronDown className="m1-1 h-4 w-4"/>
                ))}</div>
              </TableHead>

              {/* 5. Amount */}

              <TableHead
                className="cursor-pointer"
                onClick={() => handleSort("amount")}
              >
                <div className="flex items-center justify-end">Amount {sortConfig.field==='amount' && (
                  sortConfig.direction==="asc"? (
                  <ChevronUp className="m1-1 h-4 w-4"/>
                ):(
                  <ChevronDown className="m1-1 h-4 w-4"/>
                ))}</div>
              </TableHead>

              {/* 6. Recurring */}

              <TableHead>Recurring</TableHead>

              {/* 7. Action/Options (empty header for a dropdown) */}

              <TableHead className="w-[50px]" />
            </TableRow>
          </TableHeader>

          <TableBody>
            {filteredAndSortedTransactions.length === 0 ? (
              // Empty State Row

              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center text-muted-foreground"
                >
                  No Transactions Found
                </TableCell>
              </TableRow>
            ) : (
              // Map over transactions

              paginatedTransactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  {/* 1. Checkbox */}

                  <TableCell>
                    <Checkbox onCheckedChange={() => handleSelect(transaction.id)}
                    checked={selectedIds.includes(transaction.id)}
                    className="border-gray-600"
                    />
                  </TableCell>

                  {/* 2. Date: RangeError Fix Implemented */}

                  <TableCell>
                    {isValidDate(transaction.date)
                      ? format(new Date(transaction.date), "PP")
                      : "Invalid Date"}
                  </TableCell>

                  {/* 3. Description */}

                  {/* Using placeholder data for now, replace "Credit Card" */}

                  <TableCell>
                    {transaction.description || "Credit Card Payment"}
                  </TableCell>

                  {/* 4. Category (Missing in your original mapping) */}

                  <TableCell className="capitalize">
                    <span
                      style={{
                        background: categoryColors[transaction.category],
                      }}
                      className="px-2 py-1 rounded text-white text-sm"
                    >
                      {transaction.category || "General"}
                    </span>
                  </TableCell>

                  {/* 5. Amount */}

                  {/* Assuming amount is a number; using optional chaining and toFixed(2) */}

                  <TableCell
                    className="text-right font-medium"
                    style={{
                      color: transaction.type === "EXPENSE" ? "red" : "green",
                    }}
                  >
                    {transaction.type === "EXPENSE" ? "-" : "+"}₹
                    {transaction.amount?.toFixed(2)}
                  </TableCell>

                  {/* 6. Recurring (Missing in your original mapping) */}

                  <TableCell>
                    {transaction.isRecurring ? (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Badge
                              variant="outline"
                              className="gap-1 bg-purple-100 text-purple-700 hover:bg-pink-200"
                            >
                                <RefreshCcw className="h-3 w-3" /> {" "}
                              {/* FIX 1: Corrected typo */} {" "}
                              {
                                RECCURRING_INTERVALS[
                                  transaction.recurringInterval
                                ]
                              }
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="text-sm">
                              <div className="font-medium">Next Date:</div>
                              <div>
                                {transaction.nextRecurringDate &&
                                  format(
                                    new Date(transaction.nextRecurringDate),
                                    "PP"
                                  )}
                              </div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : (
                      <Badge variant="outline" className="gap-1">
                          <Clock className="h-3 w-3" />  One-time
                      </Badge>
                    )}
                  </TableCell>

                  {/* 7. Action/Options (Missing in your original mapping) */}

                  <TableCell className="text-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4 text-muted-foreground hover:text-primary cursor-pointer" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem
                          onClick={() =>
                            router.push(
                              `/transaction/create?edit=${transaction.id}`
                            )
                          }
                        >
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                         onClick={()=>deleteFn([transaction.id])}
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <div className="flex items-center justify-between mt-4">
  <span>
    Page {currentPage} of {totalPages}
  </span>
  <div className="flex gap-2">
    <Button
      onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
      disabled={currentPage === 1}
      variant="outline"
    >
      Previous
    </Button>
    <Button
      onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
      disabled={currentPage === totalPages}
      variant="outline"
    >
      Next
    </Button>
  </div>
</div>
      </div>
    </div>
  );
};

export default TransactionTable;