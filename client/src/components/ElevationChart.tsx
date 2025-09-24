import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  TimeScale,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  TimeScale
);

interface ElevationDataPoint {
  timestamp: number;
  elevation: number; // meters
  distance: number; // km
}

interface ElevationChartProps {
  data: ElevationDataPoint[];
  totalElevationGain?: number;
  totalElevationLoss?: number;
  className?: string;
}

export default function ElevationChart({ 
  data, 
  totalElevationGain = 0,
  totalElevationLoss = 0,
  className = ""
}: ElevationChartProps) {
  const formatElevation = (meters: number): string => {
    return `${Math.round(meters)}m`;
  };

  const formatDistance = (km: number): string => {
    return `${km.toFixed(2)} km`;
  };

  const chartData = {
    labels: data.map(point => point.timestamp),
    datasets: [
      {
        label: 'Elevation',
        data: data.map(point => ({ x: point.timestamp, y: point.elevation })),
        borderColor: '#3b82f6', // Nike blue
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.2,
        pointRadius: 0,
        pointHoverRadius: 4,
        pointBackgroundColor: '#3b82f6',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: '#ffffff',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: false,
        callbacks: {
          title: (context: any) => {
            const point = data[context[0].dataIndex];
            return `Distance: ${formatDistance(point.distance)}`;
          },
          label: (context: any) => {
            return `Elevation: ${formatElevation(context.parsed.y)}`;
          },
        },
      },
    },
    scales: {
      x: {
        type: 'time' as const,
        time: {
          displayFormats: {
            minute: 'HH:mm',
            second: 'mm:ss'
          },
          tooltipFormat: 'HH:mm:ss'
        },
        grid: {
          display: false,
        },
        ticks: {
          color: '#6b7280',
          font: {
            size: 12,
          },
          maxTicksLimit: 6,
        },
        border: {
          display: false,
        },
      },
      y: {
        beginAtZero: false,
        grid: {
          color: 'rgba(107, 114, 128, 0.1)',
          borderDash: [2, 2],
        },
        ticks: {
          color: '#6b7280',
          font: {
            size: 12,
          },
          callback: function(value: any) {
            return formatElevation(value);
          },
          maxTicksLimit: 5,
        },
        border: {
          display: false,
        },
      },
    },
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
    animation: {
      duration: 0, // Disable animations for real-time updates
    },
    elements: {
      point: {
        hoverBackgroundColor: '#3b82f6',
      },
    },
  };

  return (
    <div className={`bg-white rounded-lg shadow-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Elevation</h3>
        <div className="text-right">
          <div className="text-2xl font-bold text-blue-600">
            {data.length > 0 ? formatElevation(data[data.length - 1].elevation) : '0m'}
          </div>
          <div className="text-sm text-gray-500">current</div>
        </div>
      </div>
      
      <div className="h-48">
        <Line data={chartData} options={options} />
      </div>
      
      {/* Elevation stats */}
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="text-center">
          <div className="text-lg font-semibold text-green-600">
            ↗ {formatElevation(totalElevationGain)}
          </div>
          <div className="text-xs text-gray-500">Elevation Gain</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-semibold text-red-600">
            ↘ {formatElevation(totalElevationLoss)}
          </div>
          <div className="text-xs text-gray-500">Elevation Loss</div>
        </div>
      </div>
      
      {/* Legend */}
      <div className="mt-4 flex items-center justify-center">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
          <span className="text-xs text-gray-600">Elevation Profile</span>
        </div>
      </div>
    </div>
  );
}