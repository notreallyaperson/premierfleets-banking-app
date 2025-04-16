import * as React from 'react';

interface TabsProps {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
}

interface TabsListProps {
  children: React.ReactNode;
}

interface TabsTriggerProps {
  value: string;
  children: React.ReactNode;
}

interface TabsContentProps {
  value: string;
  children: React.ReactNode;
}

export function Tabs({ value, onValueChange, children }: TabsProps) {
  return (
    <div className="space-y-4">
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, { value, onValueChange });
        }
        return child;
      })}
    </div>
  );
}

export function TabsList({ children }: TabsListProps) {
  return (
    <div className="border-b border-gray-200">
      <nav className="-mb-px flex space-x-8" aria-label="Tabs">
        {children}
      </nav>
    </div>
  );
}

export function TabsTrigger({ value, children }: TabsTriggerProps) {
  return (
    <button
      onClick={() => {
        const parent = document.querySelector('[role="tablist"]');
        parent?.dispatchEvent(
          new CustomEvent('tabChange', { detail: { value } })
        );
      }}
      className={`
        whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
        ${value === (document.querySelector('[role="tablist"]')?.getAttribute('data-value') || '')
          ? 'border-blue-500 text-blue-600'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
      `}
    >
      {children}
    </button>
  );
}

export function TabsContent({ value, children }: TabsContentProps) {
  const isActive = value === (document.querySelector('[role="tablist"]')?.getAttribute('data-value') || '');
  
  if (!isActive) return null;
  
  return <div className="mt-4">{children}</div>;
}