import React from 'react';
import { Construction } from 'lucide-react';

const EmptyState = ({ title = 'Coming soon', message = 'This area is being prepared for the parent portal.' }) => {
  return (
    <div className="flex min-h-[60vh] items-center justify-center rounded-2xl border border-[#E6ECF3] bg-white p-8 text-center">
      <div className="max-w-md">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F0F7FF] text-[#003366]">
          <Construction className="h-7 w-7" />
        </div>
        <h1 className="mt-5 text-2xl font-bold text-[#101828]">{title}</h1>
        <p className="mt-2 text-sm text-[#667085]">{message}</p>
      </div>
    </div>
  );
};

export default EmptyState;
