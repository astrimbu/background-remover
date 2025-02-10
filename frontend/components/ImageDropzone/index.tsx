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
        aspect-square w-full bg-gray-50 rounded-lg 
        border-2 border-dashed transition-colors duration-200
        flex items-center justify-center cursor-pointer
        ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
      `}
    >
      <input {...getInputProps()} />
      <div className="text-center p-6">
        {isDragActive ? (
          <p className="text-blue-500">Drop the image here...</p>
        ) : (
          <>
            <p className="text-gray-600 mb-2">Drag & drop an image here</p>
            <p className="text-gray-400 text-sm">or click to select one</p>
          </>
        )}
      </div>
    </div>
  );
} 