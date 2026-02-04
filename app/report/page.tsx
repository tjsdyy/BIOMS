'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ReportPage() {
  const router = useRouter();

  useEffect(() => {
    // 重定向到家具报表页面
    router.replace('/report/furniture');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
    </div>
  );
}
