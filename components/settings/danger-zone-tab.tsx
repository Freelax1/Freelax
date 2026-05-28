'use client'

export default function DangerZoneTab() {
  return (
    <div className="bg-white rounded-xl border border-red-200 p-6 space-y-4">
      <h2 className="font-semibold text-red-700">Danger Zone</h2>
      <div className="py-3 border-b border-slate-100 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-700">Export all data</p>
          <p className="text-xs text-slate-400">Download a full export of your account data as CSV</p>
        </div>
        <a
          href="/api/invoices/export?type=full"
          className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50"
        >
          Export
        </a>
      </div>
      <div className="py-3 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-red-700">Delete account</p>
          <p className="text-xs text-slate-400">Permanently delete your account and all data</p>
        </div>
        <button className="px-4 py-2 border border-red-200 rounded-lg text-sm text-red-600 hover:bg-red-50">Delete</button>
      </div>
    </div>
  )
}
