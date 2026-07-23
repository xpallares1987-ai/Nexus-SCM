import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/data-display/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { Document } from './DocumentHub';
import { Activity, AlertTriangle } from 'lucide-react';

export function OcrAnalyticsDashboard({ documents }: { documents: Document[] }) {
  const chartData = useMemo(() => {
    // 1. Line Chart: Average OCR extraction confidence trend over the last 90 days
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const trendMap = new Map<string, { totalConfidence: number; count: number }>();
    const docTypeInterventionMap = new Map<string, { totalDocs: number; lowConfidenceDocs: number }>();

    documents.forEach(doc => {
      const createdAt = new Date(doc.createdAt);
      if (createdAt < ninetyDaysAgo) return;

      const conf = doc.extractedMetadata?.confidenceScore;
      if (conf !== undefined) {
        // Simple MM/DD format
        const dateStr = `${createdAt.getMonth() + 1}/${createdAt.getDate()}`;
        
        // Trend data
        const currentTrend = trendMap.get(dateStr) || { totalConfidence: 0, count: 0 };
        currentTrend.totalConfidence += (conf * 100);
        currentTrend.count += 1;
        trendMap.set(dateStr, currentTrend);

        // Intervention Data (Average confidence < 80%)
        const docType = doc.documentType;
        const currentIntervention = docTypeInterventionMap.get(docType) || { totalDocs: 0, lowConfidenceDocs: 0 };
        currentIntervention.totalDocs += 1;
        if (conf < 0.8) {
          currentIntervention.lowConfidenceDocs += 1;
        }
        docTypeInterventionMap.set(docType, currentIntervention);
      }
    });

    const trendData = Array.from(trendMap.entries())
      .map(([date, data]) => ({
        date,
        averageConfidence: Math.round(data.totalConfidence / data.count)
      }))
      // A simple string sort works okay-ish for MM/DD if we zero pad, but let's just sort by actual date
      .sort((a, b) => {
          const [m1, d1] = a.date.split('/').map(Number);
          const [m2, d2] = b.date.split('/').map(Number);
          if (m1 !== m2) return m1 - m2;
          return d1 - d2;
      });

    const interventionData = Array.from(docTypeInterventionMap.entries())
      .map(([documentType, data]) => ({
        documentType,
        interventionRate: Math.round((data.lowConfidenceDocs / data.totalDocs) * 100),
        lowConfidenceDocs: data.lowConfidenceDocs
      }))
      .filter(data => data.interventionRate > 0)
      .sort((a, b) => b.interventionRate - a.interventionRate)
      .slice(0, 5); // top 5 worst offenders

    return { trendData, interventionData };
  }, [documents]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card className="border border-border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-500" />
            90-Day Extraction Confidence Trend
          </CardTitle>
          <CardDescription className="text-xs">
            Average daily OCR confidence scores across all processed documents.
          </CardDescription>
        </CardHeader>
        <CardContent className="h-[250px] pt-4">
          {chartData.trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData.trendData} margin={{ top: 5, right: 20, bottom: 5, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" className="dark:stroke-zinc-800" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} tickFormatter={(val) => `${val}%`} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', fontSize: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number) => [`${value}%`, 'Avg Confidence']}
                />
                <Line type="monotone" dataKey="averageConfidence" stroke="#6366f1" strokeWidth={2} dot={{ r: 3, fill: '#6366f1' }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground bg-muted/5 rounded-lg border border-dashed border-border">
              No trend data available for the last 90 days.
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border border-border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            High-Intervention Document Types
          </CardTitle>
          <CardDescription className="text-xs">
            Document categories with the highest manual correction rates (under 80% confidence).
          </CardDescription>
        </CardHeader>
        <CardContent className="h-[250px] pt-4">
          {chartData.interventionData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData.interventionData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e5e7eb" className="dark:stroke-zinc-800" />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} tickFormatter={(val) => `${val}%`} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="documentType" width={100} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', fontSize: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number) => [`${value}%`, 'Intervention Rate']}
                />
                <Bar dataKey="interventionRate" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground bg-muted/5 rounded-lg border border-dashed border-border">
              No manual interventions recorded.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
