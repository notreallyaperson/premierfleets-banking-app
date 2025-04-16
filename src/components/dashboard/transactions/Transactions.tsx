import { useState } from 'react';
import { TransactionList } from './TransactionList';
import { TransactionRules } from './TransactionRules';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/Tabs';

export function Transactions() {
  const [activeTab, setActiveTab] = useState('transactions');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="rules">Rules & Categories</TabsTrigger>
        </TabsList>
        
        <TabsContent value="transactions">
          <TransactionList />
        </TabsContent>
        
        <TabsContent value="rules">
          <TransactionRules />
        </TabsContent>
      </Tabs>
    </div>
  );
}