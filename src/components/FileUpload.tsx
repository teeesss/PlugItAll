import React, { useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, FileText, X } from 'lucide-react';
import { cn } from '../utils/cn';

interface FileUploadProps {
  onFilesSelected: (files: File[]) => void;
  className?: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFilesSelected, className }) => {
  const [isDragActive, setIsDragActive] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  const processFiles = useCallback(
    (files: File[]) => {
      // Filter for PDF/CSV if needed, or just warn in UI.
      // For now, accepting them and letting the parser handle validation.
      setUploadedFiles((prev) => [...prev, ...files]);
      onFilesSelected(files);
    },
    [onFilesSelected]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragActive(false);

      const droppedFiles = Array.from(e.dataTransfer.files);
      if (droppedFiles.length > 0) {
        processFiles(droppedFiles);
      }
    },
    [processFiles]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        processFiles(Array.from(e.target.files));
      }
    },
    [processFiles]
  );

  const removeFile = (index: number) => {
    // In a real app we might want to "un-parse" data, but for now this just clears the UI list
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
    // Note: We aren't bubbling the 'remove' up yet because App.tsx accumulates parsers.
    // This is primarily a UI feedback mechanism for now.
  };

  return (
    <div className={cn('w-full space-y-4', className)}>
      <motion.div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        animate={{
          scale: isDragActive ? 1.02 : 1,
          borderColor: isDragActive ? '#818cf8' : 'rgba(255,255,255,0.1)',
          backgroundColor: isDragActive ? 'rgba(79, 70, 229, 0.1)' : 'rgba(15, 23, 42, 0.4)',
        }}
        className={cn(
          'relative border-2 border-dashed rounded-xl p-8 transition-colors cursor-pointer',
          'hover:border-indigo-400 group backdrop-blur-sm'
        )}
      >
        <input
          type="file"
          multiple
          onChange={handleFileInput}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        />

        <div className="flex flex-col items-center justify-center text-center space-y-4">
          <div className="p-4 rounded-full bg-slate-800/50 group-hover:bg-slate-700/50 transition-colors ring-1 ring-white/10">
            <UploadCloud className="w-8 h-8 text-indigo-400" />
          </div>
          <div>
            <p className="text-lg font-medium text-slate-200">Drop your bank statements here</p>
            <p className="text-sm text-slate-400 mt-1">
              Supports .CSV and .PDF (Multiple files allowed)
            </p>
          </div>
        </div>
      </motion.div>

      {/* Uploaded Files List */}
      <AnimatePresence>
        {uploadedFiles.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-2 gap-2"
          >
            {uploadedFiles.map((file, i) => (
              <motion.div
                key={`${file.name}-${i}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 border border-white/5"
              >
                <div className="flex items-center space-x-3 truncate">
                  <FileText className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-slate-200 truncate max-w-[150px]">{file.name}</span>
                </div>
                <button
                  onClick={() => removeFile(i)}
                  className="p-1 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X className="w-4 h-4 text-slate-500 hover:text-red-400" />
                </button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
