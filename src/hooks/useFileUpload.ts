import { useState } from 'react';
import { FileUploadService, UploadProgress } from '../services/fileUpload';

export interface FileUploadState {
  isLoading: boolean;
  progress: number;
  error: string | null;
  uploadedUrls: string[];
}

export function useFileUpload() {
  const [state, setState] = useState<FileUploadState>({
    isLoading: false,
    progress: 0,
    error: null,
    uploadedUrls: [],
  });

  const uploadFile = async (file: File): Promise<string | null> => {
    setState({ isLoading: true, progress: 0, error: null, uploadedUrls: [] });

    try {
      FileUploadService.validateFile(file);

      const { url } = await FileUploadService.uploadFile(file, (progress: UploadProgress) => {
        const percentage = Math.round((progress.loaded / progress.total) * 100);
        setState((prev) => ({ ...prev, progress: percentage }));
      });

      setState((prev) => ({
        ...prev,
        isLoading: false,
        progress: 100,
        uploadedUrls: [...prev.uploadedUrls, url],
      }));

      return url;
    } catch (error) {
      const errorMessage = (error as Error).message || 'Upload failed';
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      return null;
    }
  };

  const uploadMultipleFiles = async (files: File[]): Promise<string[]> => {
    setState({ isLoading: true, progress: 0, error: null, uploadedUrls: [] });

    try {
      const urls = await FileUploadService.uploadMultipleFiles(
        files,
        (index: number, progress: UploadProgress) => {
          const percentage = Math.round(
            ((index + progress.loaded / progress.total) / files.length) * 100
          );
          setState((prev) => ({ ...prev, progress: percentage }));
        }
      );

      setState((prev) => ({
        ...prev,
        isLoading: false,
        progress: 100,
        uploadedUrls: urls,
      }));

      return urls;
    } catch (error) {
      const errorMessage = (error as Error).message || 'Upload failed';
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      return [];
    }
  };

  const getFilePreview = async (file: File): Promise<string | null> => {
    try {
      return await FileUploadService.getFilePreview(file);
    } catch (error) {
      const errorMessage = (error as Error).message || 'Failed to preview file';
      setState((prev) => ({ ...prev, error: errorMessage }));
      return null;
    }
  };

  const resetState = () => {
    setState({
      isLoading: false,
      progress: 0,
      error: null,
      uploadedUrls: [],
    });
  };

  return {
    ...state,
    uploadFile,
    uploadMultipleFiles,
    getFilePreview,
    resetState,
  };
}
