'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function TimetablePage() {
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [slots, setSlots] = useState<string[][]>(
    Array(5).fill(null).map(() => Array(7).fill(''))
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const weekdays = ['월', '화', '수', '목', '금'];

  const handleSlotChange = (weekday: number, period: number, value: string) => {
    const newSlots = [...slots];
    newSlots[weekday][period] = value;
    setSlots(newSlots);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      // slots 2차원 배열을 API 형식으로 변환
      const slotList: any[] = [];
      slots.forEach((daySlots, weekday) => {
        daySlots.forEach((slotValue, period) => {
          if (slotValue.trim()) {
            // "101-화학" 형태를 파싱
            const parts = slotValue.split('-');
            if (parts.length === 2) {
              slotList.push({
                classroom: parts[0].trim(),
                subject: parts[1].trim(),
                weekday: weekday + 1,
                period: period + 1,
              });
            } else {
              throw new Error(`잘못된 형식입니다: "${slotValue}". "교실-과목" 형태로 입력해주세요. (예: 101-화학)`);
            }
          }
        });
      });

      if (slotList.length === 0) {
        setMessage({ type: 'error', text: '시간표를 입력해주세요.' });
        setLoading(false);
        return;
      }

      const response = await fetch('/api/save-timetable', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          start_date: startDate,
          end_date: endDate,
          name: name || '시간표',
          slots: slotList,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || '저장 실패');
      }

      setMessage({ type: 'success', text: data.message || '시간표가 저장되었습니다.' });
      
      // 폼 초기화
      setStartDate('');
      setEndDate('');
      setName('');
      setSlots(Array(5).fill(null).map(() => Array(7).fill('')));
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
          <h1 className="text-3xl font-bold text-gray-900">시간표 입력</h1>
          <p className="text-gray-600 mt-2">주간 시간표를 입력하여 수업 일정을 설정합니다.</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6">
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

          {/* 기본 정보 입력 폼 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                시간표 이름
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="예: 1학기 정규 시간표"
                className={`w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  name ? 'text-gray-900' : 'text-gray-500'
                }`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                시작일 <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={`w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  startDate ? 'text-gray-900' : 'text-gray-500'
                }`}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                종료일 <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={`w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  endDate ? 'text-gray-900' : 'text-gray-500'
                }`}
                required
              />
            </div>
          </div>

          {/* 안내 문구 */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800 font-medium mb-2">
              입력 형식 안내
            </p>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• 각 칸에 <strong>'교실-과목'</strong> 형태로 입력하세요. 예: <code className="bg-blue-100 px-1 rounded">101-화학</code>, <code className="bg-blue-100 px-1 rounded">201-수학</code></li>
              <li>• 교실 번호 규칙: 1학년 1반 = <code className="bg-blue-100 px-1 rounded">101</code>, 1학년 2반 = <code className="bg-blue-100 px-1 rounded">102</code>, 2학년 3반 = <code className="bg-blue-100 px-1 rounded">203</code></li>
            </ul>
          </div>

          {/* 시간표 그리드 테이블 */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">주간 시간표</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-4 py-3 text-left text-sm font-medium text-gray-700">
                      교시
                    </th>
                    {weekdays.map((day) => (
                      <th
                        key={day}
                        className="border border-gray-300 px-4 py-3 text-center text-sm font-medium text-gray-700"
                      >
                        {day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 7 }, (_, period) => (
                    <tr key={period}>
                      <td className="border border-gray-300 px-4 py-3 text-center font-medium text-gray-700 bg-gray-50">
                        {period + 1}교시
                      </td>
                      {weekdays.map((_, weekday) => (
                        <td key={weekday} className="border border-gray-300 p-2">
                          <input
                            type="text"
                            value={slots[weekday][period]}
                            onChange={(e) => handleSlotChange(weekday, period, e.target.value)}
                            placeholder="교실-과목"
                            className={`w-full p-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                              slots[weekday][period] ? 'text-gray-900' : 'text-gray-500'
                            }`}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 저장 후 안내 */}
          <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-sm text-gray-600">
              저장된 시간표는 학사일정의 방학/휴업일을 제외하고 진도표에 반영됩니다.
            </p>
          </div>

          {/* 버튼 영역 */}
          <div className="flex gap-4 justify-end">
            <Link
              href="/"
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
            >
              메인으로
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? '저장 중...' : '시간표 저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
