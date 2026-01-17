import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const sessionCount = await prisma.whatsappSession.count();
  const recentSessions = await prisma.whatsappSession.findMany({
    take: 5,
    orderBy: { lastActivity: 'desc' }
  });

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">🤖 Automation Dashboard</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-semibold text-gray-600 mb-2">Active Sessions</h2>
              <p className="text-5xl font-bold text-blue-600">{sessionCount}</p>
          </div>
          
           <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-semibold text-gray-600 mb-2">System Status</h2>
              <div className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
                  <span className="font-medium text-green-700">Operational</span>
              </div>
              <p className="text-sm text-gray-500 mt-2">Database & Redis Connected</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-800">Recent Activity</h2>
            </div>
            <ul className="divide-y divide-gray-100">
                {recentSessions.length === 0 ? (
                    <li className="p-6 text-center text-gray-400">No active sessions yet.</li>
                ) : recentSessions.map(s => (
                    <li key={s.id} className="p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex justify-between items-center">
                            <div>
                                <div className="font-medium text-gray-900">{s.phoneNumber}</div>
                                <div className="text-xs text-gray-500 font-mono">ID: {s.id.slice(0, 8)}...</div>
                            </div>
                            <div className="text-sm text-gray-500">
                                {new Date(s.lastActivity).toLocaleString()}
                            </div>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
      </div>
    </div>
  );
}
