import React from 'react';
import { useTranslation } from 'react-i18next';
import { Activity, ShieldCheck, AlertCircle, Flame } from 'lucide-react';
import type { PressureBand } from '../engine/types';

interface PressureMeterProps {
  pressure: number;
  band: PressureBand;
}

export const PressureMeter: React.FC<PressureMeterProps> = ({ pressure, band }) => {
  const { t } = useTranslation();

  const getBandDetails = () => {
    switch (band) {
      case 'Calm':
        return {
          label: t('drill.call.bands.calm', 'Calm'),
          color: 'text-teal-deep',
          bgColor: 'bg-teal-deep/15',
          borderColor: 'border-teal-deep/30',
          barColor: 'bg-teal-deep',
          icon: ShieldCheck
        };
      case 'Rising':
        return {
          label: t('drill.call.bands.rising', 'Rising'),
          color: 'text-[#B45309]', // warm amber
          bgColor: 'bg-amber-100',
          borderColor: 'border-amber-300',
          barColor: 'bg-[#D97706]',
          icon: AlertCircle
        };
      case 'High pressure':
      default:
        return {
          label: t('drill.call.bands.highPressure', 'High pressure'),
          color: 'text-terracotta',
          bgColor: 'bg-terracotta/15',
          borderColor: 'border-terracotta/40',
          barColor: 'bg-terracotta',
          icon: Flame
        };
    }
  };

  const details = getBandDetails();
  const Icon = details.icon;
  const clamped = Math.max(0, Math.min(100, pressure));

  return (
    <div
      className="bg-white rounded-card p-3 sm:p-4 border-2 border-teal-deep/15 shadow-soft space-y-2"
      aria-label={`${t('drill.call.pressureMeter')}: ${clamped}%, ${details.label}`}
    >
      <div className="flex items-center justify-between text-sm sm:text-base">
        <div className="flex items-center gap-2 font-bold text-brown-dark">
          <Activity size={20} className="text-teal-deep shrink-0" />
          <span>{t('drill.call.pressureMeter', 'Pressure Meter')}</span>
        </div>
        <div
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs sm:text-sm font-extrabold border ${details.bgColor} ${details.color} ${details.borderColor}`}
        >
          <Icon size={16} />
          <span>{details.label}</span>
          <span className="opacity-75 font-mono ml-1">({clamped}%)</span>
        </div>
      </div>

      {/* Progress Bar with Band Segments */}
      <div className="relative w-full h-3.5 bg-cream/80 rounded-full overflow-hidden border border-teal-deep/20">
        <div
          className={`h-full transition-all duration-500 ease-out rounded-full ${details.barColor}`}
          style={{ width: `${clamped}%` }}
        />
      </div>

      {/* Ticks for Bands */}
      <div className="flex justify-between text-[11px] font-semibold text-brown-dark/60 px-1">
        <span>0</span>
        <span className="text-center">{t('drill.call.bands.calm', 'Calm')} (0-39)</span>
        <span className="text-center">{t('drill.call.bands.rising', 'Rising')} (40-69)</span>
        <span className="text-right">{t('drill.call.bands.highPressure', 'High')} (70-100)</span>
      </div>
    </div>
  );
};
