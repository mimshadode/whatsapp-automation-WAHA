'use client';

import { useState, useEffect } from 'react';
import Image from "next/image";

// --- Types ---
interface Form {
  id: string;
  title: string;
  description: string | null;
  publishedUrl: string;
  editUrl: string;
  tinyUrl: string | null;
  tinyUrlId: string | null;
  createdAt: string;
  updatedAt: string;
}

// --- Icons (Raw SVG to avoid deps) ---
const Icons = {
  Sync: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21h5v-5"/></svg>,
  Link: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>,
  Edit: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>,
  Trash: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>,
  External: () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>,
  GoogleForm: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-600"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="M8 13h8"/><path d="M8 17h8"/><path d="M8 9h2"/></svg>
};

export default function Dashboard() {
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAlias, setEditAlias] = useState('');

  // Initial Fetch
  useEffect(() => {
    fetchForms();
  }, []);

  const fetchForms = async () => {
    try {
      const res = await fetch('/api/forms');
      const data = await res.json();
      if (data.success) {
        setForms(data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/forms', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        await fetchForms();
        alert(`Synced ${data.count} forms from Drive!`);
      } else {
        alert('Sync failed: ' + data.error);
      }
    } catch (e) {
      alert('Sync error');
    } finally {
      setSyncing(false);
    }
  };

  const handleCreateTinyUrl = async (formId: string) => {
    // If no alias provided, API will auto-generate.
    // We can prompt user for optional alias.
    const alias = prompt("Enter a custom alias (optional). Leave empty for auto-generated:", "");
    if (alias === null) return; // Cancelled

    try {
      const res = await fetch(`/api/forms/${formId}/tinyurl`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alias: alias.trim() })
      });
      const data = await res.json();
      if (data.success) {
        setForms(forms.map(f => f.id === formId ? { ...f, tinyUrl: data.data.tinyUrl, tinyUrlId: data.data.tinyUrlId } : f));
      } else {
        alert('Failed: ' + data.error);
      }
    } catch (e) {
      alert('Error creating link');
    }
  };

  const handleDeleteTinyUrl = async (formId: string) => {
    if (!confirm("Are you sure you want to remove this TinyURL?")) return;
    try {
      const res = await fetch(`/api/forms/${formId}/tinyurl`, { method: 'DELETE' });
      if (res.ok) {
        setForms(forms.map(f => f.id === formId ? { ...f, tinyUrl: null, tinyUrlId: null } : f));
      }
    } catch (e) {
      alert('Error deleting link');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 text-gray-900 dark:text-gray-100 font-sans transition-colors duration-300">
      
      {/* Navbar */}
      <nav className="sticky top-0 z-50 backdrop-blur-md bg-white/70 dark:bg-zinc-900/70 border-b border-gray-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="bg-purple-600 p-1.5 rounded-lg">
                <Icons.GoogleForm />
              </div>
              <span className="font-bold text-xl tracking-tight hidden sm:block">Si Kola <span className="text-purple-600">Forms</span></span>
            </div>
            
            <button 
              onClick={handleSync}
              disabled={syncing}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all
                ${syncing 
                  ? 'bg-gray-100 dark:bg-zinc-800 text-gray-400 cursor-not-allowed' 
                  : 'bg-black dark:bg-white text-white dark:text-black hover:opacity-80 shadow-md hover:shadow-lg'}`}
            >
              <div className={syncing ? "animate-spin" : ""}>
                <Icons.Sync />
              </div>
              {syncing ? 'Syncing...' : 'Sync from Drive'}
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 mb-2">
            Dashboard
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Manage your Google Forms and TinyURLs efficiently.
          </p>
        </div>

        {/* Content */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
             {[1,2,3].map(i => (
               <div key={i} className="h-48 bg-gray-200 dark:bg-zinc-800 rounded-2xl"></div>
             ))}
          </div>
        ) : (
          forms.length === 0 ? (
             <div className="text-center py-20 bg-white dark:bg-zinc-900 rounded-3xl border border-dashed border-gray-300 dark:border-zinc-800">
               <div className="text-6xl mb-4">📂</div>
               <h3 className="text-xl font-bold mb-2">No forms found</h3>
               <p className="text-gray-500 mb-6">Sync with your Google Drive to get started.</p>
               <button onClick={handleSync} className="text-purple-600 hover:underline font-medium">Sync Now</button>
             </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {forms.map(form => (
                <div key={form.id} className="group relative bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm hover:shadow-xl border border-gray-100 dark:border-zinc-800 transition-all duration-300 hover:-translate-y-1">
                  
                  {/* Decorative Gradient Blob */}
                  <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  
                  <div className="relative mb-4">
                     <h3 className="text-lg font-bold text-gray-900 dark:text-white line-clamp-1" title={form.title}>
                       {form.title}
                     </h3>
                     <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mt-1 h-10">
                       {form.description || 'No description provided.'}
                     </p>
                  </div>

                  {/* TinyURL Section */}
                  <div className="bg-gray-50 dark:bg-zinc-800/50 rounded-xl p-3 mb-4 border border-gray-100 dark:border-zinc-700/50">
                    <div className="flex items-center justify-between mb-2">
                       <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">TinyURL</span>
                       {form.tinyUrl && (
                         <div className="flex gap-1">
                           <button onClick={() => handleCreateTinyUrl(form.id)} className="p-1 hover:bg-gray-200 dark:hover:bg-zinc-700 rounded-md text-gray-500 transition-colors" title="Edit Alias">
                             <Icons.Edit />
                           </button>
                           <button onClick={() => handleDeleteTinyUrl(form.id)} className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-md text-gray-500 hover:text-red-500 transition-colors" title="Remove Link">
                             <Icons.Trash />
                           </button>
                         </div>
                       )}
                    </div>
                    
                    {form.tinyUrl ? (
                      <a 
                        href={form.tinyUrl} 
                        target="_blank" 
                        rel="noreferrer"
                        className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-medium hover:underline truncate"
                      >
                        <Icons.Link />
                        <span className="truncate">{form.tinyUrl}</span>
                      </a>
                    ) : (
                      <button 
                        onClick={() => handleCreateTinyUrl(form.id)}
                        className="w-full py-1.5 dashed border border-gray-300 dark:border-zinc-600 rounded-lg text-sm text-gray-500 hover:border-purple-500 hover:text-purple-500 transition-all flex items-center justify-center gap-2"
                      >
                         <Icons.Link /> Create Short Link
                      </button>
                    )}
                  </div>

                  {/* Footer Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-zinc-800">
                     <span className="text-xs text-gray-400">
                       {new Date(form.updatedAt).toLocaleDateString()}
                     </span>
                     <div className="flex gap-2">
                        <a 
                          href={form.editUrl} 
                          target="_blank" 
                          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors flex items-center gap-1"
                        >
                          Edit Form <Icons.External />
                        </a>
                     </div>
                  </div>

                </div>
              ))}
            </div>
          )
        )}
      </main>
    </div>
  );
}
