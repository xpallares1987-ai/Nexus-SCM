import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/data-display/card';
import { Button } from '@/components/ui/forms/button';
import { Download, FileText, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function PublicDocumentViewer() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [document, setDocument] = useState<any>(null);

  useEffect(() => {
    if (!token) return;
    
    const fetchDoc = async () => {
      try {
        const res = await fetch(`/api/public/documents/share/${token}`);
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Failed to load document');
        }
        const data = await res.json();
        setDocument(data);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDoc();
  }, [token]);

  const handleDownload = () => {
    if (!document?.fileUrl) return;
    const a = window.document.createElement('a');
    a.href = document.fileUrl;
    a.download = document.fileName;
    a.click();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4 text-zinc-500">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p>Verifying secure link...</p>
        </div>
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl border-red-100">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <CardTitle className="text-xl text-red-700">Access Denied</CardTitle>
            <CardDescription className="text-red-600/80 mt-2">{error}</CardDescription>
          </CardHeader>
          <CardContent className="text-center pt-4">
            <p className="text-sm text-zinc-500">This secure link may have expired or is invalid. Please request a new link from the document owner.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isPdf = document.fileUrl.startsWith('data:application/pdf');
  const isImage = document.fileUrl.startsWith('data:image');

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-4 sm:p-8">
      <Card className="w-full max-w-4xl shadow-xl overflow-hidden flex flex-col" style={{ maxHeight: '90vh' }}>
        <div className="bg-indigo-600 p-4 sm:px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 text-white">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-sm sm:text-base leading-tight truncate max-w-[200px] sm:max-w-md">{document.fileName}</h1>
              <p className="text-indigo-100 text-[10px] sm:text-xs">Secure Document View • Shared externally</p>
            </div>
          </div>
          <Button onClick={handleDownload} size="sm" className="bg-white text-indigo-700 hover:bg-zinc-100 shadow-sm shrink-0">
            <Download className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Download</span>
          </Button>
        </div>
        
        <div className="flex-1 bg-zinc-200/50 p-4 sm:p-6 overflow-hidden flex flex-col">
          <div className="flex-1 bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden relative">
            {isPdf ? (
              <iframe src={document.fileUrl} className="w-full h-full min-h-[500px]" title={document.fileName} />
            ) : isImage ? (
              <div className="w-full h-full min-h-[500px] overflow-auto flex items-center justify-center p-4">
                <img src={document.fileUrl} alt={document.fileName} className="max-w-full h-auto max-h-full object-contain" />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-zinc-500">
                <FileText className="w-16 h-16 mb-4 opacity-50" />
                <p>Preview not available for this file type.</p>
                <Button onClick={handleDownload} variant="outline" className="mt-4">
                  Download to View
                </Button>
              </div>
            )}
          </div>
        </div>
      </Card>
      <div className="mt-6 text-center text-xs text-zinc-400">
        <p>This is a secure, time-limited link generated via Document Hub.</p>
      </div>
    </div>
  );
}
