"use client";
import { createContext, useContext, useEffect, useState } from "react";
import api from "@/utils/api";
import { ITransaction } from "@/interfaces/ITransaction";

const INITIAL_DATA: {
  transactionData: {
    currentYear: number;
    currency: string;
    transactions: ITransaction[] | null;
  };
  refreshTransactionData: (year: number) => void;
  addTransaction: (transaction: ITransaction) => void;
  updateTransaction: (transaction: ITransaction) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  changeToPreviousYear: () => void;
  changeToNextYear: () => void;
} = {
  transactionData: {
    currentYear: new Date().getFullYear(),
    currency: "USD",
    transactions: null,
  },
  refreshTransactionData: () => {},
  addTransaction: () => {},
  updateTransaction: async () => {},
  deleteTransaction: async () => {},
  changeToPreviousYear: () => {},
  changeToNextYear: () => {},
};

const TransactionContext = createContext(INITIAL_DATA);

function TransactionProvider({ children }: { children: React.ReactNode }) {
  const [transactionData, setTransactionData] = useState(
    INITIAL_DATA.transactionData
  );

  const refreshTransactionData = async (year: number) => {
    const response = await api.get<ITransaction[]>(
      `/api/transactions?year=${year}`
    );
    if (response.status === "success")
      setTransactionData({
        ...transactionData,
        currentYear: year,
        transactions: response.data,
      });
  };

  const addTransaction = async (transaction: ITransaction) => {
    if (transactionData.transactions === null) return;

    const response = await api.post<ITransaction>(
      `/api/transactions`,
      transaction
    );

    if (response.status !== "success") throw new Error(response.message);

    const updatedTransactions = [...transactionData.transactions];
    updatedTransactions.push(response.data);
    setTransactionData({
      ...transactionData,
      transactions: updatedTransactions,
    });
  };

  const updateTransaction = async (transaction: ITransaction) => {
    const response = await api.put<ITransaction>(`/api/transactions/${transaction._id}`, transaction);
    if (response.status !== "success") throw new Error(response.message);
    setTransactionData((current) => ({ ...current, transactions: current.transactions?.map((item) => item._id === transaction._id ? response.data : item) || null }));
  };

  const deleteTransaction = async (id: string) => {
    const response = await api.remove(`/api/transactions/${id}`);
    if (response.status !== "success") throw new Error(response.message);
    setTransactionData((current) => ({ ...current, transactions: current.transactions?.filter((item) => item._id !== id) || null }));
  };

  const changeToPreviousYear = () => {
    const prevYear = transactionData.currentYear - 1;
    setTransactionData({
      ...transactionData,
      currentYear: prevYear,
    });
    refreshTransactionData(prevYear);
  };

  const changeToNextYear = () => {
    const nextYear = transactionData.currentYear + 1;
    setTransactionData({
      ...transactionData,
      currentYear: nextYear,
    });
    refreshTransactionData(nextYear);
  };

  return (
    <TransactionContext.Provider
      value={{
        transactionData,
        refreshTransactionData,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        changeToPreviousYear,
        changeToNextYear,
      }}
    >
      {children}
    </TransactionContext.Provider>
  );
}

const useTransaction = () => {
  return useContext(TransactionContext);
};

export { TransactionProvider, useTransaction };
