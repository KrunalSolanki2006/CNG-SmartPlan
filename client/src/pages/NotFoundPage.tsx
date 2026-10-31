import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home } from 'lucide-react';
import { EmptyState } from '../components/ui/EmptyState';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="py-12">
      <EmptyState
        title="Page Not Found"
        description="The requested route does not exist in the CNG SmartPlan navigation structure."
        actionLabel="Back to Dashboard"
        onAction={() => navigate('/')}
        icon={<Home className="w-6 h-6 text-[#0F766E]" />}
      />
    </div>
  );
};
