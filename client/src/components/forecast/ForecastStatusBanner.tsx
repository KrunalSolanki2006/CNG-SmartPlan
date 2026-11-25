import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FlaskConical,
  Info,
  XCircle,
} from 'lucide-react';
import { ForecastResponse } from '../../types/api';
import { Badge } from '../ui/Badge';

interface ForecastStatusBannerProps {
  forecastData: ForecastResponse | null;
  isLoading: boolean;
}

export const ForecastStatusBanner: React.FC<ForecastStatusBannerProps> = ({
  forecastData,
  isLoading,
}) => {
  if (isLoading || !forecastData) return null;

  const {
    forecast_status,
    data_freshness,
    freshness_policy,
    data_through_date,
    current_date,
    forecast_generated_at,
    target_start_date,
    target_end_date,
    historical_demo_notice,
  } = forecastData;

  const isInsufficient = forecast_status === 'insufficient_data';
  const isUnavailable = forecast_status === 'unavailable';
  const isStale = data_freshness === 'stale' || freshness_policy?.is_stale;
  const isSimulated = forecast_status === 'simulated' || freshness_policy?.is_simulated;

  const containerStyle = isUnavailable
    ? 'bg-rose-50/80 border-rose-200 text-rose-950'
    : isInsufficient || isStale
    ? 'bg-amber-50/80 border-amber-200 text-amber-950'
    : isSimulated
    ? 'bg-purple-50/70 border-purple-200 text-purple-950'
    : 'bg-emerald-50/80 border-emerald-200 text-emerald-950';

  const statusBadge = () => {
    if (isUnavailable) {
      return (
        <Badge variant="danger" size="sm">
          <XCircle className="w-3 h-3" />
          Unavailable
        </Badge>
      );
    }
    if (isInsufficient) {
      return (
        <Badge variant="warning" size="sm">
          <AlertTriangle className="w-3 h-3" />
          Insufficient Data
        </Badge>
      );
    }
    if (forecast_status === 'current' && !isStale && !isSimulated) {
      return (
        <Badge variant="success" size="sm">
          <CheckCircle2 className="w-3 h-3" />
          Current
        </Badge>
      );
    }
    return null;
  };

  return (
    <div
      className={`rounded-2xl p-4 border shadow-2xs space-y-2.5 ${containerStyle}`}
      role="status"
      aria-label="Forecast freshness and provenance status"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          {statusBadge()}
          {isSimulated && (
            <Badge variant="synthetic" size="sm">
              <FlaskConical className="w-3 h-3" />
              SIMULATED DATA — DEMONSTRATION ONLY
            </Badge>
          )}
          {isStale && (
            <Badge variant="warning" size="sm">
              <Clock className="w-3 h-3" />
              Stale Data ({freshness_policy?.data_age_days ?? '—'}d old)
            </Badge>
          )}
          <span className="text-xs font-bold">
            {isStale
              ? 'Outdated Historical Cutoff — Not a Current Operational Forecast'
              : isSimulated
              ? 'Synthetic Demonstration Forecast'
              : 'Operational Forecast Status'}
          </span>
        </div>

        <span className="text-[11px] font-mono opacity-80">
          Generated: {forecast_generated_at}
        </span>
      </div>

      <p className="text-xs leading-relaxed flex items-start gap-2">
        <Info className="w-4 h-4 shrink-0 mt-0.5 opacity-80" />
        <span>{historical_demo_notice}</span>
      </p>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[11px] font-mono pt-1 border-t border-black/10">
        <span>
          <strong>Historical Cutoff:</strong> {data_through_date ?? 'N/A'}
        </span>
        <span>
          <strong>Reference Date:</strong> {current_date}
        </span>
        <span>
          <strong>Forecast Period:</strong>{' '}
          {target_start_date && target_end_date
            ? `${target_start_date} to ${target_end_date}`
            : 'Withheld'}
        </span>
      </div>
    </div>
  );
};
