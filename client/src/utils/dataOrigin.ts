import { DataOrigin } from '../types/api';

export interface DataOriginBadgeConfig {
  label: string;
  shortLabel: string;
  description: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  badgeStyle: {
    backgroundColor: string;
    color: string;
    borderColor: string;
  };
}

export const DATA_ORIGIN_CONFIG: Record<DataOrigin, DataOriginBadgeConfig> = {
  synthetic_demo: {
    label: '⚠ Synthetic Demo',
    shortLabel: 'Synthetic',
    description: 'Python-generated simulation data (generate_synthetic_data.py). Not actual station sales/supply.',
    bgClass: 'bg-[#F2EFFC]',
    textClass: 'text-[#6D5BD0]',
    borderClass: 'border-[#D7D0F6]',
    badgeStyle: {
      backgroundColor: '#F2EFFC',
      color: '#6D5BD0',
      borderColor: '#D7D0F6',
    },
  },
  real_public: {
    label: '✓ Real Public Data',
    shortLabel: 'Public Record',
    description: 'Extracted from verified public directory (GEL / HPCL). Partially verified directory listing.',
    bgClass: 'bg-[#EBF7EE]',
    textClass: 'text-[#15803D]',
    borderClass: 'border-[#C2E8CB]',
    badgeStyle: {
      backgroundColor: '#EBF7EE',
      color: '#15803D',
      borderColor: '#C2E8CB',
    },
  },
  illustrative_scenario: {
    label: '~ Illustrative Scenario',
    shortLabel: 'Scenario',
    description: 'Assumption-based calculation with no real spatial or sales backing.',
    bgClass: 'bg-[#EFF6FF]',
    textClass: 'text-[#2563EB]',
    borderClass: 'border-[#BFDBFE]',
    badgeStyle: {
      backgroundColor: '#EFF6FF',
      color: '#2563EB',
      borderColor: '#BFDBFE',
    },
  },
  user_entered_scenario: {
    label: '✎ User Entry',
    shortLabel: 'User Defined',
    description: 'Value supplied by planner during runtime scenario modeling.',
    bgClass: 'bg-[#FEF3C7]',
    textClass: 'text-[#B45309]',
    borderClass: 'border-[#FDE68A]',
    badgeStyle: {
      backgroundColor: '#FEF3C7',
      color: '#B45309',
      borderColor: '#FDE68A',
    },
  },
};

export function getDataOriginConfig(origin: DataOrigin): DataOriginBadgeConfig {
  return DATA_ORIGIN_CONFIG[origin] || DATA_ORIGIN_CONFIG.synthetic_demo;
}
