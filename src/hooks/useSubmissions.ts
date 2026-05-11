import { useState } from 'react';
import { submissionService } from '../services/api';
import { Submission, CreateSubmissionPayload } from '../types/api';

export function useSubmissions() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSubmissions = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await submissionService.getUserSubmissions();
      setSubmissions(response.data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const createSubmission = async (payload: CreateSubmissionPayload) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await submissionService.createSubmission(payload);
      setSubmissions([response.data, ...submissions]);
      return response.data;
    } catch (err) {
      setError((err as Error).message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const getSubmissionById = async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await submissionService.getSubmissionById(id);
      return response.data;
    } catch (err) {
      setError((err as Error).message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const updateSubmissionStatus = async (id: string, status: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await submissionService.updateSubmissionStatus(id, { status: status as any });
      setSubmissions(
        submissions.map((sub) => (sub.id === id ? response.data : sub))
      );
      return response.data;
    } catch (err) {
      setError((err as Error).message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    submissions,
    isLoading,
    error,
    fetchSubmissions,
    createSubmission,
    getSubmissionById,
    updateSubmissionStatus,
  };
}
