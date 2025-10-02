const { useState, useEffect } = React;
const { Plus, Calendar, User, Clock, Trash2, Send, CheckCircle, List, Flame, TrendingUp, AlertTriangle, Archive, Users, Mail, Download, Upload, Settings, UserPlus } = lucide;

const BallInCourtApp = () => {
  // State management
  const [tasks, setTasks] = useState(() => {
    const saved = localStorage.getItem('ballInCourtTasks');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [contacts, setContacts] = useState(() => {
    const saved = localStorage.getItem('ballInCourtContacts');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [activeView, setActiveView] = useState('all');
  const [showAddTask, setShowAddTask] = useState(false);
  const [showHandoff, setShowHandoff] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showContactManager, setShowContactManager] = useState(false);
  
  const [newTask, setNewTask] = useState({
    title: '', dueDate: '', urgency: 'medium', owner: 'Me'
  });

  const [newContact, setNewContact] = useState({ name: '', email: '' });

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem('ballInCourtTasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('ballInCourtContacts', JSON.stringify(contacts));
  }, [contacts]);

  // Utility functions
  const getToday = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  };

  const addDays = (date, days) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  };

  const parseDate = (dateStr) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    date.setHours(0, 0, 0, 0);
    return date;
  };

  // Task handlers
  const handleAddTask = () => {
    if (!newTask.title.trim()) return;
    const task = {
      id: Date.now(),
      title: newTask.title,
      dueDate: newTask.dueDate,
      urgency: newTask.urgency,
      owner: newTask.owner,
      createdAt: new Date().toISOString(),
      status: 'active'
    };
    setTasks([...tasks, task]);
    setNewTask({ title: '', dueDate: '', urgency: 'medium', owner: 'Me' });
    setShowAddTask(false);
  };

  const handleHandoff = (taskId, handoffData) => {
    const today = getToday();
    const followUpDate = handoffData.followUpDate || addDays(today, 2).toISOString().split('T')[0];
    setTasks(tasks.map(task => 
      task.id === taskId ? {
        ...task,
        owner: handoffData.owner,
        ownerEmail: handoffData.ownerEmail,
        urgency: handoffData.urgency,
        dueDate: handoffData.dueDate,
        followUpDate: followUpDate,
        handoffDate: new Date().toISOString(),
        status: 'handed-off'
      } : task
    ));
    setShowHandoff(null);
  };

  const deleteTask = (taskId) => {
    if (confirm('Are you sure you want to delete this task?')) {
      setTasks(tasks.filter(task => task.id !== taskId));
    }
  };

  const completeTask = (taskId) => {
    setTasks(tasks.map(task => 
      task.id === taskId ? { ...task, status: 'completed', completedDate: new Date().toISOString() } : task
    ));
  };

  // Contact handlers
  const addContact = () => {
    if (!newContact.name.trim()) return;
    const contact = { id: Date.now(), name: newContact.name, email: newContact.email };
    setContacts([...contacts, contact]);
    setNewContact({ name: '', email: '' });
  };

  const deleteContact = (contactId) => {
    if (confirm('Are you sure you want to delete this contact?')) {
      setContacts(contacts.filter(c => c.id !== contactId));
    }
  };

  // Export/Import
  const exportTasks = () => {
    const dataStr = JSON.stringify({ tasks, contacts }, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ball-in-court-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importTasks = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (data.tasks) {
          if (confirm('This will replace your current tasks. Continue?')) {
            setTasks(data.tasks);
            if (data.contacts) setContacts(data.contacts);
            alert('Tasks imported successfully!');
          }
        }
      } catch (error) {
        alert('Error importing file. Please make sure it\'s a valid Ball-in-Court export.');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  // Email notification
  const sendEmailNotification = (task, ownerEmail) => {
    const subject = encodeURIComponent(`Task Assigned: ${task.title}`);
    const body = encodeURIComponent(
      `Hi,\n\nYou've been assigned a task in Ball-in-Court:\n\n` +
      `Task: ${task.title}\n` +
      `Urgency: ${task.urgency.charAt(0).toUpperCase() + task.urgency.slice(1)}\n` +
      `Due Date: ${task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'Not set'}\n` +
      `Follow Up: ${task.followUpDate ? new Date(task.followUpDate).toLocaleDateString() : 'Not set'}\n\n` +
      `Please let me know if you have any questions!\n\nBest regards`
    );
    window.location.href = `mailto:${ownerEmail}?subject=${subject}&body=${body}`;
  };

  // Task filtering
  const isCompletedToday = (task) => {
    if (!task.completedDate) return false;
    const completedDate = new Date(task.completedDate);
    const today = getToday();
    completedDate.setHours(0, 0, 0, 0);
    return completedDate.getTime() === today.getTime();
  };

  const getCompletedTasks = () => {
    return tasks.filter(task => task.status === 'completed' && !isCompletedToday(task))
      .sort((a, b) => new Date(b.completedDate) - new Date(a.completedDate));
  };

  const getBubbleUpTasks = () => {
    const today = getToday();
    return tasks.filter(task => {
      if (task.status !== 'handed-off' || !task.handoffDate) return false;
      const handoffDate = new Date(task.handoffDate);
      const daysSinceHandoff = Math.floor((today - handoffDate) / (1000 * 60 * 60 * 24));
      return daysSinceHandoff <= 3;
    });
  };

  const getStaleTasks = () => {
    const today = getToday();
    return tasks.filter(task => {
      if (task.status === 'completed') return false;
      const dueDate = parseDate(task.dueDate);
      const followUpDate = parseDate(task.followUpDate);
      let isStale = false;
      if (dueDate && Math.floor((today - dueDate) / (1000 * 60 * 60 * 24)) >= 7) isStale = true;
      if (followUpDate && Math.floor((today - followUpDate) / (1000 * 60 * 60 * 24)) >= 7) isStale = true;
      return isStale;
    }).sort((a, b) => {
      const dateA = parseDate(a.followUpDate || a.dueDate);
      const dateB = parseDate(b.followUpDate || b.dueDate);
      if (!dateA) return 1;
      if (!dateB) return -1;
      return dateB - dateA;
    });
  };

  const getTopTasks = (limit) => {
    const myActiveTasks = tasks.filter(task => 
      task.owner === 'Me' && (task.status === 'active' || (task.status === 'completed' && isCompletedToday(task)))
    );
    const urgencyWeight = { high: 3, medium: 2, low: 1 };
    return myActiveTasks.sort((a, b) => {
      const urgencyDiff = urgencyWeight[b.urgency] - urgencyWeight[a.urgency];
      if (urgencyDiff !== 0) return urgencyDiff;
      const dateA = parseDate(a.dueDate);
      const dateB = parseDate(b.dueDate);
      if (!dateA && !dateB) return 0;
      if (!dateA) return 1;
      if (!dateB) return -1;
      return dateA - dateB;
    }).slice(0, limit);
  };

  // Components
  const TennisNet = () => (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <rect x="2" y="14" width="28" height="4" fill="currentColor"/>
      <line x1="4" y1="6" x2="4" y2="26" stroke="currentColor" strokeWidth="1.5"/>
      <line x1="8" y1="6" x2="8" y2="26" stroke="currentColor" strokeWidth="1.5"/>
      <line x1="12" y1="6" x2="12" y2="26" stroke="currentColor" strokeWidth="1.5"/>
      <line x1="16" y1="6" x2="16" y2="26" stroke="currentColor" strokeWidth="1.5"/>
      <line x1="20" y1="6" x2="20" y2="26" stroke="currentColor" strokeWidth="1.5"/>
      <line x1="24" y1="6" x2="24" y2="26" stroke="currentColor" strokeWidth="1.5"/>
      <line x1="28" y1="6" x2="28" y2="26" stroke="currentColor" strokeWidth="1.5"/>
      <line x1="2" y1="10" x2="30" y2="10" stroke="currentColor" strokeWidth="1"/>
      <line x1="2" y1="22" x2="30" y2="22" stroke="currentColor" strokeWidth="1"/>
    </svg>
  );

  const TaskCard = ({ task, showActions = true }) => {
    const urgencyColors = { high: 'from-red-500 to-red-600', medium: 'from-amber-500 to-amber-600', low: 'from-emerald-500 to-emerald-600' };
    const completedToday = isCompletedToday(task);
    const isCompleted = task.status === 'completed';

    return (
      <div className={`bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 p-5 mb-3 border border-gray-100 ${completedToday ? 'opacity-70' : ''}`}>
        <div className="flex justify-between items-start mb-3">
          <h3 className={`font-semibold text-lg text-gray-900 flex-1 ${completedToday ? 'line-through text-gray-500' : ''}`}>{task.title}</h3>
          {showActions && !isCompleted && (
            <div className="flex gap-2">
              {task.owner === 'Me' && task.status === 'active' && (
                <>
                  <button onClick={() => completeTask(task.id)} className="text-green-600 hover:text-green-700 hover:bg-green-50 p-1.5 rounded-lg transition-colors" title="Mark complete"><CheckCircle size={20} /></button>
                  <button onClick={() => setShowHandoff(task.id)} className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 p-1.5 rounded-lg transition-colors" title="Hand off task"><Send size={20} /></button>
                </>
              )}
              {task.ownerEmail && task.owner !== 'Me' && (
                <button onClick={() => sendEmailNotification(task, task.ownerEmail)} className="text-purple-600 hover:text-purple-700 hover:bg-purple-50 p-1.5 rounded-lg transition-colors" title="Send email reminder"><Mail size={20} /></button>
              )}
              <button onClick={() => deleteTask(task.id)} className="text-red-600 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-lg transition-colors" title="Delete task"><Trash2 size={20} /></button>
            </div>
          )}
          {isCompleted && !completedToday && (
            <div className="flex gap-2">
              <button onClick={() => deleteTask(task.id)} className="text-red-600 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-lg transition-colors" title="Delete task"><Trash2 size={20} /></button>
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <span className={`px-3 py-1 rounded-full text-white font-medium bg-gradient-to-r ${urgencyColors[task.urgency]}`}>{task.urgency.charAt(0).toUpperCase() + task.urgency.slice(1)}</span>
          {task.dueDate && <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full flex items-center gap-1.5 font-medium"><Calendar size={14} />{new Date(task.dueDate).toLocaleDateString()}</span>}
          <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full flex items-center gap-1.5 font-medium"><User size={14} />{task.owner}</span>
          {task.followUpDate && <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full flex items-center gap-1.5 font-medium"><Clock size={14} />Follow up: {new Date(task.followUpDate).toLocaleDateString()}</span>}
          {isCompleted && task.completedDate && <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full flex items-center gap-1.5 font-medium"><CheckCircle size={14} />{new Date(task.completedDate).toLocaleDateString()}</span>}
        </div>
      </div>
    );
  };

  const HandoffModal = ({ task }) => {
    const [handoffData, setHandoffData] = useState({
      owner: '', ownerEmail: '', urgency: task.urgency, dueDate: task.dueDate,
      followUpDate: addDays(getToday(), 2).toISOString().split('T')[0], sendEmail: false
    });
    const [useCustomName, setUseCustomName] = useState(false);

    const selectContact = (contact) => {
      setHandoffData({ ...handoffData, owner: contact.name, ownerEmail: contact.email });
      setUseCustomName(false);
    };

    const handleSubmit = () => {
      const updatedTask = { ...task, ...handoffData };
      handleHandoff(task.id, handoffData);
      if (handoffData.sendEmail && handoffData.ownerEmail) {
        setTimeout(() => sendEmailNotification(updatedTask, handoffData.ownerEmail), 100);
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
        <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl my-8">
          <h3 className="text-2xl font-bold mb-6 text-gray-900">Hand Off Task</h3>
          <div className="space-y-4">
            {!useCustomName ? (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-semibold text-gray-700">Select Contact:</label>
                  <button onClick={() => setUseCustomName(true)} className="text-xs text-blue-600 hover:text-blue-700 font-medium">Enter custom name</button>
                </div>
                {contacts.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-xl p-2">
                    {contacts.map(contact => (
                      <button key={contact.id} onClick={() => selectContact(contact)} className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${handoffData.owner === contact.name ? 'bg-blue-100 border-2 border-blue-500' : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'}`}>
                        <div className="font-semibold text-gray-900">{contact.name}</div>
                        {contact.email && <div className="text-sm text-gray-600">{contact.email}</div>}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500 text-sm border border-gray-200 rounded-xl">No contacts yet. Add contacts in Settings.</div>
                )}
              </div>
            ) : (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-semibold text-gray-700">Custom Name:</label>
                  <button onClick={() => setUseCustomName(false)} className="text-xs text-blue-600 hover:text-blue-700 font-medium">Select from contacts</button>
                </div>
                <input type="text" value={handoffData.owner} onChange={(e) => setHandoffData({...handoffData, owner: e.target.value})} className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:border-blue-500 focus:outline-none transition-colors" placeholder="Person's name" />
                <input type="email" value={handoffData.ownerEmail} onChange={(e) => setHandoffData({...handoffData, ownerEmail: e.target.value})} className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:border-blue-500 focus:outline-none transition-colors mt-2" placeholder="Email (optional)" />
              </div>
            )}
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">Urgency:</label>
              <select value={handoffData.urgency} onChange={(e) => setHandoffData({...handoffData, urgency: e.target.value})} className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:border-blue-500 focus:outline-none transition-colors">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">Due Date:</label>
              <input type="date" value={handoffData.dueDate} onChange={(e) => setHandoffData({...handoffData, dueDate: e.target.value})} className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:border-blue-500 focus:outline-none transition-colors" />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">Follow Up Date:</label>
              <input type="date" value={handoffData.followUpDate} onChange={(e) => setHandoffData({...handoffData, followUpDate: e.target.value})} className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:border-blue-500 focus:outline-none transition-colors" />
            </div>
            {handoffData.ownerEmail && (
              <div className="flex items-center gap-2">
                <input type="checkbox" id="sendEmail" checked={handoffData.sendEmail} onChange={(e) => setHandoffData({...handoffData, sendEmail: e.target.checked})} className="w-4 h-4 text-blue-600 rounded" />
                <label htmlFor="sendEmail" className="text-sm font-medium text-gray-700">Send email notification</label>
              </div>
            )}
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={handleSubmit} className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-blue-800 font-semibold transition-all shadow-sm disabled:opacity-50" disabled={!handoffData.owner.trim()}>Hand Off</button>
            <button onClick={() => setShowHandoff(null)} className="flex-1 bg-gray-100 text-gray-700 px-6 py-3 rounded-xl hover:bg-gray-200 font-semibold transition-all">Cancel</button>
          </div>
        </div>
      </div>
    );
  };

  const ContactManager = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl p-6 w-full max-w-2xl shadow-2xl my-8">
        <h3 className="text-2xl font-bold mb-6 text-gray-900">Manage Contacts</h3>
        <div className="mb-6 bg-gray-50 rounded-xl p-4">
          <h4 className="font-semibold text-gray-900 mb-3">Add New Contact</h4>
          <div className="flex gap-2">
            <input type="text" value={newContact.name} onChange={(e) => setNewContact({...newContact, name: e.target.value})} className="flex-1 border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:border-blue-500 focus:outline-none transition-colors" placeholder="Name" />
            <input type="email" value={newContact.email} onChange={(e) => setNewContact({...newContact, email: e.target.value})} className="flex-1 border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:border-blue-500 focus:outline-none transition-colors" placeholder="Email (optional)" />
            <button onClick={addContact} className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-2.5 rounded-xl hover:from-green-700 hover:to-emerald-700 font-semibold transition-all whitespace-nowrap" disabled={!newContact.name.trim()}><UserPlus size={20} /></button>
          </div>
        </div>
        <div className="mb-6">
          <h4 className="font-semibold text-gray-900 mb-3">Your Contacts ({contacts.length})</h4>
          {contacts.length > 0 ? (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {contacts.map(contact => (
                <div key={contact.id} className="flex justify-between items-center bg-white border border-gray-200 rounded-xl p-4">
                  <div>
                    <div className="font-semibold text-gray-900">{contact.name}</div>
                    {contact.email && <div className="text-sm text-gray-600">{contact.email}</div>}
                  </div>
                  <button onClick={() => deleteContact(contact.id)} className="text-red-600 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-colors"><Trash2 size={18} /></button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">No contacts yet. Add your first contact above!</div>
          )}
        </div>
        <button onClick={() => setShowContactManager(false)} className="w-full bg-gray-100 text-gray-700 px-6 py-3 rounded-xl hover:bg-gray-200 font-semibold transition-all">Close</button>
      </div>
    </div>
  );

  const SettingsModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl my-8">
        <h3 className="text-2xl font-bold mb-6 text-gray-900">Settings</h3>
        <div className="space-y-4">
          <button onClick={() => { setShowSettings(false); setShowContactManager(true); }} className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 text-white px-6 py-3 rounded-xl hover:from-indigo-700 hover:to-blue-700 font-semibold transition-all flex items-center justify-center gap-2"><Users size={20} />Manage Contacts</button>
          <button onClick={exportTasks} className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-3 rounded-xl hover:from-green-700 hover:to-emerald-700 font-semibold transition-all flex items-center justify-center gap-2"><Download size={20} />Export Tasks & Contacts</button>
          <label className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-blue-800 font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer"><Upload size={20} />Import Tasks & Contacts<input type="file" accept=".json" onChange={importTasks} className="hidden" /></label>
          <div className="pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600"><strong>Export/Import:</strong> Save your tasks and contacts to share between devices or backup your data.</p>
          </div>
        </div>
        <button onClick={() => setShowSettings(false)} className="w-full bg-gray-100 text-gray-700 px-6 py-3 rounded-xl hover:bg-gray-200 font-semibold transition-all mt-4">Close</button>
      </div>
    </div>
  );

  // Main render
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 pb-24">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-indigo-600"><TennisNet /></div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent">Ball-in-Court</h1>
                <p className="text-gray-600 font-medium">Keep track of whose court the ball is in</p>
              </div>
            </div>
            <button onClick={() => setShowSettings(true)} className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 p-2 rounded-lg transition-colors" title="Settings"><Settings size={24} /></button>
          </div>
        </header>

        <button onClick={() => setShowAddTask(true)} className="mb-6 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-green-700 hover:to-emerald-700 flex items-center gap-2 shadow-lg shadow-green-500/30 transition-all"><Plus size={20} />Add New Task</button>

        {showAddTask && (
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-6 border border-gray-100">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">New Task</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">Task Title:</label>
                <input type="text" value={newTask.title} onChange={(e) => setNewTask({...newTask, title: e.target.value})} className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:border-blue-500 focus:outline-none transition-colors" placeholder="What needs to be done?" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700">Due Date:</label>
                  <input type="date" value={newTask.dueDate} onChange={(e) => setNewTask({...newTask, dueDate: e.target.value})} className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:border-blue-500 focus:outline-none transition-colors" />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700">Urgency:</label>
                  <select value={newTask.urgency} onChange={(e) => setNewTask({...newTask, urgency: e.target.value})} className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:border-blue-500 focus:outline-none transition-colors">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700">Owner:</label>
                  <input type="text" value={newTask.owner} onChange={(e) => setNewTask({...newTask, owner: e.target.value})} className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 focus:border-blue-500 focus:outline-none transition-colors" placeholder="Me" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={handleAddTask} className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-2.5 rounded-xl hover:from-blue-700 hover:to-blue-800 font-semibold transition-all shadow-sm">Add Task</button>
                <button onClick={() => { setShowAddTask(false); setNewTask({ title: '', dueDate: '', urgency: 'medium', owner: 'Me' }); }} className="bg-gray-100 text-gray-700 px-6 py-2.5 rounded-xl hover:bg-gray-200 font-semibold transition-all">Cancel</button>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100 min-h-96">
          {activeView === 'all' && (
            <>
              <h2 className="text-2xl font-bold mb-6 text-gray-900">All Active Tasks</h2>
              {tasks.filter(t => t.status === 'active').length === 0 ? (
                <div className="text-center py-12"><div className="text-gray-300 mb-4 flex justify-center"><List size={64} /></div><p className="text-gray-500 font-medium">No active tasks. Add one to get started!</p></div>
              ) : (
                tasks.filter(t => t.status === 'active').map(task => <TaskCard key={task.id} task={task} />)
              )}
            </>
          )}

          {activeView === 'top1' && (
            <>
              <h2 className="text-2xl font-bold mb-6 text-gray-900">Top Priority Today</h2>
              {getTopTasks(1).length === 0 ? (
                <div className="text-center py-12"><div className="text-gray-300 mb-4 flex justify-center"><Flame size={64} /></div><p className="text-gray-500 font-medium">No tasks for today!</p></div>
              ) : (
                getTopTasks(1).map(task => <TaskCard key={task.id} task={task} />)
              )}
            </>
          )}

          {activeView === 'top5' && (
            <>
              <h2 className="text-2xl font-bold mb-6 text-gray-900">Top 5 Priorities Today</h2>
              {getTopTasks(5).length === 0 ? (
                <div className="text-center py-12"><div className="text-gray-300 mb-4 flex justify-center"><TrendingUp size={64} /></div><p className="text-gray-500 font-medium">No tasks for today!</p></div>
              ) : (
                getTopTasks(5).map(task => <TaskCard key={task.id} task={task} />)
              )}
            </>
          )}

          {activeView === 'bubble' && (
            <>
              <h2 className="text-2xl font-bold mb-6 text-gray-900">Bubble Up Tasks</h2>
              <p className="text-sm text-gray-600 mb-4 font-medium">Tasks handed off in the last 3 days</p>
              {getBubbleUpTasks().length === 0 ? (
                <div className="text-center py-12"><div className="text-gray-300 mb-4 flex justify-center"><TrendingUp size={64} /></div><p className="text-gray-500 font-medium">No bubble up tasks</p></div>
              ) : (
                getBubbleUpTasks().map(task => <TaskCard key={task.id} task={task} />)
              )}
            </>
          )}

          {activeView === 'stale' && (
            <>
              <h2 className="text-2xl font-bold mb-6 text-gray-900">Stale Tasks</h2>
              <p className="text-sm text-gray-600 mb-4 font-medium">Tasks 7+ days past due or follow-up date</p>
              {getStaleTasks().length === 0 ? (
                <div className="text-center py-12"><div className="text-gray-300 mb-4 flex justify-center"><AlertTriangle size={64} /></div><p className="text-gray-500 font-medium">No stale tasks</p></div>
              ) : (
                getStaleTasks().map(task => <TaskCard key={task.id} task={task} />)
              )}
            </>
          )}

          {activeView === 'completed' && (
            <>
              <h2 className="text-2xl font-bold mb-6 text-gray-900">Completed Tasks</h2>
              <p className="text-sm text-gray-600 mb-4 font-medium">Tasks completed yesterday or earlier</p>
              {getCompletedTasks().length === 0 ? (
                <div className="text-center py-12"><div className="text-gray-300 mb-4 flex justify-center"><Archive size={64} /></div><p className="text-gray-500 font-medium">No completed tasks yet</p></div>
              ) : (
                getCompletedTasks().map(task => <TaskCard key={task.id} task={task} showActions={true} />)
              )}
            </>
          )}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="flex justify-around items-center py-2">
            <button onClick={() => setActiveView('all')} className={`flex flex-col items-center py-2 px-3 rounded-lg transition-all ${activeView === 'all' ? 'text-blue-600 bg-blue-50' : 'text-gray-600 hover:bg-gray-50'}`}><List size={24} /><span className="text-xs font-semibold mt-1">All</span></button>
            <button onClick={() => setActiveView('top1')} className={`flex flex-col items-center py-2 px-3 rounded-lg transition-all ${activeView === 'top1' ? 'text-blue-600 bg-blue-50' : 'text-gray-600 hover:bg-gray-50'}`}><Flame size={24} /><span className="text-xs font-semibold mt-1">Top 1</span></button>
            <button onClick={() => setActiveView('top5')} className={`flex flex-col items-center py-2 px-3 rounded-lg transition-all ${activeView === 'top5' ? 'text-blue-600 bg-blue-50' : 'text-gray-600 hover:bg-gray-50'}`}><TrendingUp size={24} /><span className="text-xs font-semibold mt-1">Top 5</span></button>
            <button onClick={() => setActiveView('bubble')} className={`flex flex-col items-center py-2 px-3 rounded-lg transition-all ${activeView === 'bubble' ? 'text-blue-600 bg-blue-50' : 'text-gray-600 hover:bg-gray-50'}`}><Clock size={24} /><span className="text-xs font-semibold mt-1">Bubble</span></button>
            <button onClick={() => setActiveView('stale')} className={`flex flex-col items-center py-2 px-3 rounded-lg transition-all ${activeView === 'stale' ? 'text-blue-600 bg-blue-50' : 'text-gray-600 hover:bg-gray-50'}`}><AlertTriangle size={24} /><span className="text-xs font-semibold mt-1">Stale</span></button>
            <button onClick={() => setActiveView('completed')} className={`flex flex-col items-center py-2 px-3 rounded-lg transition-all ${activeView === 'completed' ? 'text-blue-600 bg-blue-50' : 'text-gray-600 hover:bg-gray-50'}`}><Archive size={24} /><span className="text-xs font-semibold mt-1">Done</span></button>
          </div>
        </div>
      </div>

      {showHandoff && <HandoffModal task={tasks.find(t => t.id === showHandoff)} />}
      {showSettings && <SettingsModal />}
      {showContactManager && <ContactManager />}
    </div>
  );
};

ReactDOM.render(<BallInCourtApp />, document.getElementById('root'));