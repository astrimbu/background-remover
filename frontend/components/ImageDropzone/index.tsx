'use client';

import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useEditorStore } from '@/stores/editorStore';

export function ImageDropzone() {
  const { setCurrentImage } = useEditorStore(state => state.actions);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setCurrentImage(file);
    }
  }, [setCurrentImage]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp']
    },
    multiple: false
  });

  return (
    <div
      {...getRootProps()}
      className={`
        w-full h-full
        flex items-center justify-center cursor-pointer
        ${isDragActive ? 'bg-blue-50' : ''}
      `}
    >
      <input {...getInputProps()} />
      {isDragActive && (
        <div className="text-center p-6">
          <p className="text-blue-500">Drop the image here...</p>
        </div>
      )}
    </div>
  );
} 