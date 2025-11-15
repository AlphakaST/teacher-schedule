'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Timetable {
  id: number;
  semester: number;
  start_date: string;
  end_date: string;
  name: string | null;
  created_at: string;
  slot_count: number;
}

export default function GeneratePage() {
  const [timetables, setTimetables] = useState<Timetable[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchTimetables();
  }, []);

  const fetchTimetables = async () => {
    try {
      const response = await fetch('/api/save-timetable');
      const data = await response.json();

      if (data.success) {
        setTimetables(data.timetables || []);
      } else {
        setMessage({ type: 'error', text: '시간표 목록을 불러오는데 실패했습니다.' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: '시간표 목록을 불러오는데 실패했습니다.' });
    }
  };

  const handleGenerate = async () => {
    if (!selectedId) {
      setMessage({ type: 'error', text: '시간표를 선택해주세요.' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/generate-lessons', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ timetableId: selectedId }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        // 상세한 에러 정보 표시
        const errorMsg = data.error || '진도표 생성 실패';
        const details = data.details ? `\n\n상세 정보:\n${JSON.stringify(data.details, null, 2)}` : '';
        // eslint-disable-next-line no-console
        console.error('진도표 생성 오류:', data);
        throw new Error(errorMsg + details);
      }

      setMessage({ type: 'success', text: `✅ ${data.message}` });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || '진도표 생성 중 오류가 발생했습니다.' });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
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
          <h1 className="text-3xl font-bold text-gray-900">📊 진도표 자동 생성</h1>
          <p className="text-gray-600 mt-2">저장된 시간표를 기반으로 진도표를 자동으로 생성합니다.</p>
        </div>

        {/* 메시지 박스 */}
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

        {/* 시간표 목록 섹션 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">저장된 시간표 선택</h2>

          {timetables.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-4">저장된 시간표가 없습니다.</p>
              <Link
                href="/timetable"
                className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium"
              >
                시간표 입력하기 →
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {timetables.map((tt) => (
                <div
                  key={tt.id}
                  onClick={() => setSelectedId(tt.id)}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    selectedId === tt.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-gray-900">
                      {tt.name || `${tt.semester}학기 시간표`}
                    </h3>
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                      {tt.slot_count}개 슬롯
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    {formatDate(tt.start_date)} ~ {formatDate(tt.end_date)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {tt.semester}학기
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 버튼 영역 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex gap-4 justify-end">
            <Link
              href="/schedule"
              className="px-6 py-2 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
            >
              진도표 보기
            </Link>
            <button
              onClick={handleGenerate}
              disabled={!selectedId || loading}
              className="px-6 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? '생성 중...' : '진도표 생성'}
            </button>
          </div>
        </div>

        {/* 주의사항 박스 */}
        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-yellow-900 mb-3">⚠️ 주의사항</h3>
          <ul className="space-y-2 text-sm text-yellow-800">
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>진도표 생성 전에 학사일정과 시간표가 저장되어 있어야 합니다.</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>기존 진도표는 삭제되고 새로 생성됩니다.</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>방학 기간과 휴일에는 수업이 배치되지 않습니다.</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

