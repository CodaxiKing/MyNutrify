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
import { format } from 'date-fns';

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

interface PaceDataPoint {
  timestamp: number;
  pace: number; // seconds per km
  distance: number; // km
}

interface PaceChartProps {
  data: PaceDataPoint[];
  currentPace?: number;
  targetPace?: number;
  className?: string;
}

export default function PaceChart({ 
  data, 
  currentPace, 
  targetPace,
  className = ""
}: PaceChartProps) {
  const formatPace = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const chartData = {
    labels: data.map(point => point.timestamp),
    datasets: [
      {
        label: 'Current Pace',
        data: data.map(point => ({ x: point.timestamp, y: point.pace })),
        borderColor: '#10b981', // Nike green
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 4,
        pointBackgroundColor: '#10b981',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
      },
      ...(targetPace ? [{
        label: 'Target Pace',
        data: data.map(point => ({ x: point.timestamp, y: targetPace })),
        borderColor: '#ef4444', // Nike red
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderDash: [5, 5],
        fill: false,
        pointRadius: 0,
        pointHoverRadius: 0,
      }] : [])
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
            return `Distance: ${point.distance.toFixed(2)} km`;
          },
          label: (context: any) => {
            return `Pace: ${formatPace(context.parsed.y)}/km`;
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
            return formatPace(value);
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
        hoverBackgroundColor: '#10b981',
      },
    },
  };

  return (
    <div className={`bg-white rounded-lg shadow-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Pace</h3>
        {currentPace && (
          <div className="text-right">
            <div className="text-2xl font-bold text-green-600">
              {formatPace(currentPace)}
            </div>
            <div className="text-sm text-gray-500">current /km</div>
          </div>
        )}
      </div>
      
      <div className="h-48">
        <Line data={chartData} options={options} />
      </div>
      
      {/* Pace zone indicators */}
      <div className="mt-4 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <span className="text-gray-600">Current Pace</span>
        </div>
        {targetPace && (
          <div className="flex items-center gap-2">
            <div className="w-3 h-1 bg-red-500 border-dashed border-red-500"></div>
            <span className="text-gray-600">Target ({formatPace(targetPace)}/km)</span>
          </div>
        )}
      </div>
    </div>
  );
}