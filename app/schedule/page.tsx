'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Lesson {
  id: number;
  lesson_date: string;
  lesson_date_str: string;
  grade: number;
  class_number: number;
  period: number;
  lesson_order: number;
  lesson_title: string | null;
  subject: string | null;
  memo_id: number | null;
  memo_text: string | null;
  memo_updated_at: string | null;
}

interface CalendarEvent {
  event_date: string;
  event_date_str: string;
  title: string | null;
  description: string | null;
  is_holiday: boolean;
}

interface WeeklyLessonsResponse {
  success: boolean;
  lessons: Lesson[];
  calendarEvents?: CalendarEvent[];
  error?: string;
}

export default function SchedulePage() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [currentWeek, setCurrentWeek] = useState<Date>(new Date());
  const [loading, setLoading] = useState<boolean>(false);
  const [editingMemo, setEditingMemo] = useState<number | null>(null);
  const [memoText, setMemoText] = useState<string>('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 주의 월요일~금요일 계산
  const getWeekRange = (date: Date): { start: string; end: string } => {
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // 월요일로 조정
    const monday = new Date(date.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    
    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);
    friday.setHours(23, 59, 59, 999);

    const formatDate = (d: Date): string => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    return {
      start: formatDate(monday),
      end: formatDate(friday),
    };
  };

  // 주간 수업 조회
  const fetchWeeklyLessons = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const { start, end } = getWeekRange(new Date(currentWeek));
      const response = await fetch(
        `/api/weekly-lessons?start=${start}&end=${end}`
      );
      const data: WeeklyLessonsResponse = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || '수업 조회 실패');
      }

      setLessons(data.lessons || []);
      setCalendarEvents(data.calendarEvents || []);
    } catch (error: any) {
      console.error('수업 조회 오류:', error);
      setMessage({ type: 'error', text: error.message || '수업 조회 중 오류가 발생했습니다.' });
      setLessons([]);
    } finally {
      setLoading(false);
    }
  };

  // 주 변경 시 조회
  useEffect(() => {
    fetchWeeklyLessons();
  }, [currentWeek]);

  // 이전 주
  const prevWeek = () => {
    const newDate = new Date(currentWeek);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentWeek(newDate);
  };

  // 다음 주
  const nextWeek = () => {
    const newDate = new Date(currentWeek);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentWeek(newDate);
  };

  // 날짜/교시로 모든 학년/반의 수업 찾기
  const getLessonsByDateAndPeriod = (dateStr: string, period: number): Lesson[] => {
    return lessons.filter(
      (lesson) => 
        lesson.lesson_date_str === dateStr && 
        lesson.period === period
    ).sort((a, b) => {
      // 학년 → 반 순으로 정렬
      if (a.grade !== b.grade) return a.grade - b.grade;
      return a.class_number - b.class_number;
    });
  };

  // 날짜로 학사 일정 찾기
  const getCalendarEventsByDate = (dateStr: string): CalendarEvent[] => {
    return calendarEvents.filter(
      (event) => event.event_date_str === dateStr
    );
  };

  // 날짜가 휴일인지 확인
  const isHoliday = (dateStr: string): boolean => {
    return calendarEvents.some(
      (event) => event.event_date_str === dateStr && event.is_holiday
    );
  };

  // 메모 저장
  const saveMemo = async (lessonId: number) => {
    try {
      const response = await fetch('/api/save-memo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lessonId,
          memoText: memoText.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || '메모 저장 실패');
      }

      setEditingMemo(null);
      setMemoText('');
      setMessage({ type: 'success', text: '메모가 저장되었습니다.' });
      
      // 재조회
      await fetchWeeklyLessons();
    } catch (error: any) {
      console.error('메모 저장 오류:', error);
      setMessage({ type: 'error', text: error.message || '메모 저장 중 오류가 발생했습니다.' });
    }
  };

  // 메모 편집 시작
  const startEditMemo = (lesson: Lesson) => {
    setEditingMemo(lesson.id);
    setMemoText(lesson.memo_text || '');
  };

  // 메모 편집 취소
  const cancelEditMemo = () => {
    setEditingMemo(null);
    setMemoText('');
  };

  // 주의 날짜 범위 표시
  const weekRange = getWeekRange(new Date(currentWeek));
  const weekDays = ['월', '화', '수', '목', '금'];
  const weekDates: string[] = [];
  
  for (let i = 0; i < 5; i++) {
    const date = new Date(weekRange.start);
    date.setDate(date.getDate() + i);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    weekDates.push(`${month}/${day}`);
  }

  // 교시 범위 (1~7교시)
  const periods = [1, 2, 3, 4, 5, 6, 7];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* 헤더 */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-blue-200/60 backdrop-blur-sm text-gray-900 px-6 py-3 rounded-xl shadow-lg border border-blue-300/50">
              <h1 className="text-3xl font-bold">전체 시간표 보기</h1>
            </div>
          </div>
          <Link
            href="/"
            className="px-6 py-3 bg-white text-gray-700 rounded-lg hover:bg-gray-100 transition-all duration-200 shadow-md hover:shadow-lg font-medium border border-gray-200"
          >
            ← 메인으로
          </Link>
        </div>

        {/* 메시지 */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg shadow-md border-l-4 ${
              message.type === 'success'
                ? 'bg-green-50 text-green-800 border-green-500'
                : 'bg-red-50 text-red-800 border-red-500'
            }`}
          >
            <div className="flex items-center gap-2">
              {message.type === 'success' ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              )}
              <span className="font-medium">{message.text}</span>
            </div>
          </div>
        )}

        {/* 컨트롤 패널 */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border border-gray-200">
          <div className="flex items-center justify-between">
            {/* 주 이동 버튼 */}
            <div className="flex gap-3">
              <button
                onClick={prevWeek}
                className="px-5 py-2.5 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 rounded-lg hover:from-gray-200 hover:to-gray-300 transition-all duration-200 shadow-md hover:shadow-lg font-medium border border-gray-300"
              >
                ← 이전주
              </button>
              <button
                onClick={nextWeek}
                className="px-5 py-2.5 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 rounded-lg hover:from-gray-200 hover:to-gray-300 transition-all duration-200 shadow-md hover:shadow-lg font-medium border border-gray-300"
              >
                다음주 →
              </button>
            </div>

            {/* 날짜 범위 표시 */}
            <div className="text-right bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-3 rounded-lg border border-blue-200">
              <div className="text-sm text-gray-600 font-medium mb-1">날짜 범위</div>
              <div className="text-xl font-bold text-gray-900">
                {weekRange.start} ~ {weekRange.end}
              </div>
            </div>
          </div>
        </div>

        {/* 로딩 */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <div className="text-gray-600 text-lg font-medium">로딩 중...</div>
          </div>
        )}

        {/* 전체 시간표 테이블 (모든 학년/반 통합) */}
        {!loading && (
          <div className="bg-white rounded-xl shadow-xl overflow-hidden border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider border-r border-gray-300">
                    교시
                  </th>
                  {weekDays.map((day, index) => {
                    const dateStr = (() => {
                      const date = new Date(weekRange.start);
                      date.setDate(date.getDate() + index);
                      const year = date.getFullYear();
                      const month = String(date.getMonth() + 1).padStart(2, '0');
                      const day = String(date.getDate()).padStart(2, '0');
                      return `${year}-${month}-${day}`;
                    })();
                    const dayEvents = getCalendarEventsByDate(dateStr);
                    const holiday = isHoliday(dateStr);
                    
                    return (
                      <th
                        key={index}
                        className={`px-4 py-4 text-center text-sm font-bold uppercase tracking-wider border-r border-gray-300 last:border-r-0 ${
                          holiday 
                            ? 'bg-gradient-to-b from-red-100 to-red-50 text-red-700 border-red-200' 
                            : 'text-gray-700'
                        }`}
                      >
                        {day}
                        <br />
                        <span className={`text-xs ${holiday ? 'text-red-500' : 'text-gray-400'}`}>
                          {weekDates[index]}
                        </span>
                        {dayEvents.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {dayEvents.map((event, idx) => (
                              <div 
                                key={idx} 
                                className={`text-xs font-semibold px-2 py-1 rounded ${
                                  event.is_holiday 
                                    ? 'bg-red-200 text-red-800' 
                                    : 'bg-blue-100 text-blue-700'
                                }`}
                              >
                                {event.title || '학사일정'}
                              </div>
                            ))}
                          </div>
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {periods.map((period) => (
                  <tr key={period} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-bold text-gray-900 text-center bg-gray-50 border-r border-gray-300">
                      {period}
                    </td>
                    {weekDays.map((_, dayIndex) => {
                      const dateStr = (() => {
                        const date = new Date(weekRange.start);
                        date.setDate(date.getDate() + dayIndex);
                        const year = date.getFullYear();
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const day = String(date.getDate()).padStart(2, '0');
                        return `${year}-${month}-${day}`;
                      })();

                      const dayLessons = getLessonsByDateAndPeriod(dateStr, period);
                      const holiday = isHoliday(dateStr);

                      return (
                        <td 
                          key={dayIndex} 
                          className={`px-4 py-4 text-sm align-top border-r border-gray-200 last:border-r-0 ${
                            holiday ? 'bg-red-50/50' : 'bg-white'
                          }`}
                        >
                          {dayLessons.length > 0 ? (
                            <div className="space-y-3">
                              {dayLessons.map((lesson) => {
                                const isEditing = editingMemo === lesson.id;
                                return (
                                  <div key={lesson.id} className="border-b border-gray-200 last:border-b-0 pb-3 last:pb-0 mb-3 last:mb-0">
                                    {/* 학년/반 및 과목 */}
                                    <div className="font-semibold text-gray-900 mb-2">
                                      <span className="inline-block bg-blue-100 text-blue-700 px-2 py-1 rounded-md text-xs font-bold mr-2">
                                        {lesson.grade}학년 {lesson.class_number}반
                                      </span>
                                      <span className="text-gray-700">
                                        {lesson.subject || '미정'} - {lesson.lesson_title || `${lesson.lesson_order}차시`}
                                      </span>
                                    </div>

                                    {/* 메모 영역 */}
                                    {isEditing ? (
                                      <div className="space-y-2">
                                        <textarea
                                          value={memoText}
                                          onChange={(e) => setMemoText(e.target.value)}
                                          placeholder="메모를 입력하세요..."
                                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                                          rows={3}
                                        />
                                        <div className="flex gap-2">
                                          <button
                                            onClick={() => saveMemo(lesson.id)}
                                            className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition"
                                          >
                                            저장
                                          </button>
                                          <button
                                            onClick={cancelEditMemo}
                                            className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition"
                                          >
                                            취소
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <div
                                        onClick={() => startEditMemo(lesson)}
                                        className="text-xs text-gray-600 cursor-pointer hover:bg-gray-100 p-3 rounded-lg border-2 border-dashed border-gray-300 min-h-[50px] transition-all hover:border-blue-400 hover:bg-blue-50"
                                      >
                                        {lesson.memo_text ? (
                                          <div className="whitespace-pre-wrap text-gray-700">{lesson.memo_text}</div>
                                        ) : (
                                          <div className="text-gray-400 italic flex items-center gap-2">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                            </svg>
                                            메모 추가 (클릭)
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="text-gray-300 text-center text-lg font-light">-</div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 데이터 없음 */}
        {!loading && lessons.length === 0 && (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center border border-gray-200">
            <div className="text-gray-500 text-lg font-medium">
              해당 기간에 수업 데이터가 없습니다.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

