const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export interface UploadProgress {
  loaded: number;
  total: number;
}

export class FileUploadService {
  static async uploadFile(
    file: File,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<{ url: string; key: string }> {
    const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');

    if (!token) {
      throw new Error('No authentication token found');
    }

    // Validate file
    this.validateFile(file);

    const formData = new FormData();
    formData.append('file', file);

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      // Track upload progress
      if (onProgress) {
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            onProgress({
              loaded: event.loaded,
              total: event.total,
            });
          }
        });
      }

      xhr.addEventListener('load', () => {
        if (xhr.status === 201 || xhr.status === 200) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve({ url: response.url, key: response.key });
          } catch (error) {
            reject(new Error('Failed to parse upload response'));
          }
        } else {
          try {
            const error = JSON.parse(xhr.responseText);
            reject(new Error(error.error || 'Upload failed'));
          } catch {
            reject(new Error('Upload failed'));
          }
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Network error during upload'));
      });

      xhr.addEventListener('abort', () => {
        reject(new Error('Upload cancelled'));
      });

      xhr.open('POST', `${API_URL}/upload`);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.send(formData);
    });
  }

  static async uploadMultipleFiles(
    files: File[],
    onProgress?: (index: number, progress: UploadProgress) => void
  ): Promise<string[]> {
    const urls: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const { url } = await this.uploadFile(files[i], (progress) => {
        if (onProgress) {
          onProgress(i, progress);
        }
      });
      urls.push(url);
    }

    return urls;
  }

  static validateFile(file: File): void {
    // Check file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Only image files (JPEG, PNG, WebP, GIF, HEIC, HEIF) are allowed');
    }

    // Check file size (5MB max)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new Error('File size must be less than 5MB');
    }

    // Check file size (minimum 10KB)
    const minSize = 10 * 1024;
    if (file.size < minSize) {
      throw new Error('File size must be at least 10KB');
    }
  }

  static getFilePreview(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }
}
