import React, { useState, useRef } from 'react';
import { Upload, File, Image as ImageIcon } from 'lucide-react';
import { Input } from '@/components/ui/forms/input';

interface FileDropzoneProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  disabled?: boolean;
  fileSize?: string;
  fileName?: string;
}

export function FileDropzone({
  onFileSelect,
  accept = ".pdf,.png,.jpg,.jpeg",
  disabled = false,
  fileSize,
  fileName
}: FileDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragging(true);
    } else if (e.type === "dragleave") {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      
      // Simple validation for accept attribute if it's set
      if (accept) {
        const fileExt = '.' + droppedFile.name.split('.').pop()?.toLowerCase();
        const acceptList = accept.split(',').map(ext => ext.trim().toLowerCase());
        
        // Very basic validation - in production a more robust MIME/extension check might be needed
        if (acceptList.includes(fileExt) || acceptList.some(a => droppedFile.type.match(new RegExp(a.replace('*', '.*'))))) {
           onFileSelect(droppedFile);
        } else {
           // Optionally show a toast here for invalid file type
           console.warn("Invalid file type dropped");
        }
      } else {
        onFileSelect(droppedFile);
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelect(e.target.files[0]);
    }
  };
  
  const getFileIcon = () => {
    if (!fileName) return <Upload className={`w-10 h-10 mb-2 ${isDragging ? 'text-indigo-500' : 'text-muted-foreground'}`} />;
    
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') {
      return <File className="w-10 h-10 mb-2 text-red-500" />;
    }
    if (['png', 'jpg', 'jpeg'].includes(ext || '')) {
      return <ImageIcon className="w-10 h-10 mb-2 text-blue-500" />;
    }
    return <File className="w-10 h-10 mb-2 text-indigo-500" />;
  };

  return (
    <div
      className={`relative flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg cursor-pointer transition-all duration-200 ease-in-out
        ${isDragging ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-500/10' : 'border-border hover:bg-muted/50'} 
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      onClick={() => !disabled && inputRef.current?.click()}
    >
      <Input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={handleFileInputChange}
        accept={accept}
        disabled={disabled}
      />
      
      {getFileIcon()}
      
      <div className="text-center">
        {fileName ? (
           <p className="text-sm font-medium text-foreground truncate max-w-[250px] sm:max-w-xs">{fileName}</p>
        ) : (
          <p className="text-sm font-medium text-muted-foreground">
             <span className="text-indigo-500 hover:underline">Click to upload</span> or drag and drop
          </p>
        )}
        
        {(fileSize && fileName) ? (
          <p className="text-xs text-muted-foreground mt-1">{fileSize}</p>
        ) : (
          <p className="text-xs text-muted-foreground mt-1">
            Supported formats: PDF, PNG, JPG (max. 10MB)
          </p>
        )}
      </div>
      
      {isDragging && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/80 backdrop-blur-sm border-2 border-indigo-500">
           <p className="text-lg font-semibold text-indigo-500 animate-pulse">Drop file to upload</p>
        </div>
      )}
    </div>
  );
}
