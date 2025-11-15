'use client';

import { useState } from 'react';
import Link from 'next/link';

interface CalendarEvent {
  date: string;
  title: string;
  is_holiday: boolean;
}

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [rawText, setRawText] = useState<string>('');
  const [showRawText, setShowRawText] = useState(false);
  const [selectedEvents, setSelectedEvents] = useState<Set<number>>(new Set());

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'application/pdf' && !selectedFile.name.endsWith('.pdf')) {
        setMessage({ type: 'error', text: 'PDF 파일만 업로드 가능합니다.' });
        return;
      }
      setFile(selectedFile);
      setMessage(null);
      setEvents([]);
      setSelectedEvents(new Set());
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setMessage({ type: 'error', text: '파일을 선택해주세요.' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload-schedule', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || '업로드 실패');
      }

      setEvents(data.events || []);
      setRawText(data.rawText || '');
      setSelectedEvents(new Set(data.events?.map((_: any, index: number) => index) || []));
      setMessage({ type: 'success', text: `${data.events?.length || 0}개 일정이 추출되었습니다.` });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || '업로드 중 오류가 발생했습니다.' });
    } finally {
      setLoading(false);
    }
  };

  const handleEventChange = (index: number, field: keyof CalendarEvent, value: any) => {
    const newEvents = [...events];
    newEvents[index] = { ...newEvents[index], [field]: value };
    setEvents(newEvents);
  };

  const handleSelectAll = () => {
    if (selectedEvents.size === events.length) {
      setSelectedEvents(new Set());
    } else {
      setSelectedEvents(new Set(events.map((_, index) => index)));
    }
  };

  const handleToggleSelect = (index: number) => {
    const newSelected = new Set(selectedEvents);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedEvents(newSelected);
  };

  const handleSave = async () => {
    const selectedEventsList = events.filter((_, index) => selectedEvents.has(index));

    if (selectedEventsList.length === 0) {
      setMessage({ type: 'error', text: '저장할 일정을 선택해주세요.' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/save-calendar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ events: selectedEventsList }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || '저장 실패');
      }

      setMessage({ type: 'success', text: data.message || '일정이 저장되었습니다.' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || '저장 중 오류가 발생했습니다.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4"
          >
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            메인으로 돌아가기
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">학사일정 업로드</h1>
          <p className="text-gray-600 mt-2">PDF 파일을 업로드하여 학사일정을 자동으로 추출합니다.</p>
        </div>

        {/* 파일 업로드 섹션 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              PDF 파일 선택
            </label>
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              disabled={loading}
            />
            {file && (
              <p className="mt-2 text-sm text-gray-600">선택된 파일: {file.name}</p>
            )}
          </div>

          <button
            onClick={handleUpload}
            disabled={loading || !file}
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'GPT가 학사일정을 분석 중입니다... (5-10초 소요)' : 'PDF 업로드'}
          </button>
        </div>

        {/* 메시지 표시 */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* 추출된 일정 테이블 */}
        {events.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                추출된 일정 ({events.length}개)
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={handleSelectAll}
                  className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  {selectedEvents.size === events.length ? '전체 해제' : '전체 선택'}
                </button>
                <button
                  onClick={() => setShowRawText(!showRawText)}
                  className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  {showRawText ? '원본 텍스트 숨기기' : '원본 텍스트 보기'}
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <input
                        type="checkbox"
                        checked={selectedEvents.size === events.length && events.length > 0}
                        onChange={handleSelectAll}
                        className="rounded"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      날짜
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      제목
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      방학/공휴일
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {events.map((event, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedEvents.has(index)}
                          onChange={() => handleToggleSelect(index)}
                          className="rounded"
                        />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <input
                          type="date"
                          value={event.date}
                          onChange={(e) => handleEventChange(index, 'date', e.target.value)}
                          className="border border-gray-300 rounded px-2 py-1 text-sm"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={event.title}
                          onChange={(e) => handleEventChange(index, 'title', e.target.value)}
                          className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                        />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={event.is_holiday}
                            onChange={(e) =>
                              handleEventChange(index, 'is_holiday', e.target.checked)
                            }
                            className="rounded mr-2"
                          />
                          <span className="text-sm text-gray-600">
                            {event.is_holiday ? '예' : '아니오'}
                          </span>
                        </label>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={handleSave}
                disabled={loading || selectedEvents.size === 0}
                className="bg-green-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                선택한 일정 저장 ({selectedEvents.size}개)
              </button>
            </div>
          </div>
        )}

        {/* 원본 텍스트 표시 */}
        {showRawText && rawText && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">원본 텍스트 (처음 1000자)</h2>
            <pre className="bg-gray-50 p-4 rounded-lg overflow-auto max-h-96 text-sm text-gray-700 whitespace-pre-wrap">
              {rawText}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

