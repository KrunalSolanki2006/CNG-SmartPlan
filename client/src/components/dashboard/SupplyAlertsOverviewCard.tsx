import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, AlertTriangle, CheckCircle2, Bell } from 'lucide-react';
import { SupplyAlertAggregation } from '../../types/dashboard';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Skeleton } from '../ui/Skeleton';

interface SupplyAlertsOverviewCardProps {
  alerts: SupplyAlertAggregation | undefined;
  isLoading: boolean;
}

const ALERT_TYPE_LABELS: Record<string, string> = {
  compressor_outage: 'Compressor Outage Alert',
  potential_supply_shortage: 'Potential Supply Shortage',
  peak_demand_warning: 'Peak-Demand Warning',
};

export const SupplyAlertsOverviewCard: React.FC<SupplyAlertsOverviewCardProps> = ({
  alerts,
  isLoading,
}) => {
  const navigate = useNavigate();

  if (isLoading) {
    return <Skeleton className="h-[280px] w-full rounded-2xl" />;
  }

  if (!alerts) return null;

  const hasAlerts = alerts.total_active_alerts > 0;

  return (
    <Card className="rounded-2xl border-slate-200 bg-white shadow-xs">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <div
              className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 ${
                alerts.critical_alerts_count > 0
                  ? 'bg-red-50 border-red-200 text-red-600'
                  : hasAlerts
                  ? 'bg-amber-50 border-amber-200 text-amber-600'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-600'
              }`}
            >
              <Bell className="w-4 h-4" />
            </div>
            <CardTitle className="text-base font-bold text-slate-900">
              Supply Alerts & Notifications
            </CardTitle>
            <Badge
              variant={
                alerts.critical_alerts_count > 0
                  ? 'danger'
                  : hasAlerts
                  ? 'warning'
                  : 'success'
              }
              size="sm"
            >
              {alerts.total_active_alerts} Active ({alerts.distinct_stations_affected} Stations)
            </Badge>
          </div>
          <CardDescription className="text-xs text-slate-500 mt-1">
            {alerts.note}
          </CardDescription>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/alerts')}
          rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
          className="rounded-xl shrink-0"
        >
          Open Supply Alerts
        </Button>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {/* Alert Severity & Category Breakdown */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl bg-red-50/70 border border-red-200">
            <span className="text-[11px] font-semibold text-red-800 block">Critical Alerts</span>
            <span className="text-lg font-bold font-mono text-red-700">
              {alerts.critical_alerts_count}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200">
            <span className="text-[11px] font-semibold text-amber-800 block">Warning Alerts</span>
            <span className="text-lg font-bold font-mono text-amber-700">
              {alerts.warning_alerts_count}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[11px] font-semibold text-slate-600 block">Supply Shortages</span>
            <span className="text-lg font-bold font-mono text-slate-900">
              {alerts.potential_supply_shortage_alerts_count}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[11px] font-semibold text-slate-600 block">Peak-Demand Warnings</span>
            <span className="text-lg font-bold font-mono text-slate-900">
              {alerts.peak_demand_warnings_count}
            </span>
          </div>
        </div>

        {/* Notifications List or Empty State */}
        {!hasAlerts || alerts.recent_notifications.length === 0 ? (
          <div className="p-5 rounded-xl bg-emerald-50/60 border border-emerald-200 flex items-center gap-3 text-xs text-emerald-900">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-medium">
              No critical alerts currently. The network is operating within the available monitored thresholds.
            </span>
          </div>
        ) : (
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Recent Active Notifications
            </span>
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
              {alerts.recent_notifications.slice(0, 6).map((notif, idx) => {
                const isCritical = notif.severity === 'critical';
                return (
                  <div
                    key={`${notif.station_id}-${notif.alert_type}-${idx}`}
                    className={`p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs ${
                      isCritical ? 'bg-red-50/40' : 'bg-white'
                    }`}
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <AlertTriangle
                        className={`w-4 h-4 shrink-0 mt-0.5 ${
                          isCritical ? 'text-red-600' : 'text-amber-600'
                        }`}
                      />
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900">
                            {ALERT_TYPE_LABELS[notif.alert_type] || notif.alert_type}
                          </span>
                          <Badge variant={isCritical ? 'danger' : 'warning'} size="sm">
                            {notif.severity.toUpperCase()}
                          </Badge>
                          <span className="font-mono text-[11px] text-slate-600">
                            {notif.station_name} ({notif.station_id}) • {notif.district}
                          </span>
                        </div>
                        <p className="text-slate-600 leading-snug">{notif.message}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 shrink-0">
                      {notif.timestamp}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
