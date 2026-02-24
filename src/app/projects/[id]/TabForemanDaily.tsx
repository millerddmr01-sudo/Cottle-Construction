"use client";

import { useState, useEffect } from "react";
import { Loader2, Plus, DollarSign, Clock, FileCheck2, Trash2, CheckCircle, AlertTriangle } from "lucide-react";

export default function TabForemanDaily({ projectId, userRole, userId, supabase }: { projectId: string, userRole: string, userId: string, supabase: any }) {
    const [employees, setEmployees] = useState<any[]>([]);
    const [hours, setHours] = useState<any[]>([]);
    const [expenses, setExpenses] = useState<any[]>([]);
    const [reports, setReports] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const todayStr = new Date().toISOString().split('T')[0];

    // Form States
    const [hourForm, setHourForm] = useState({ employee_id: "", date: todayStr, hours_worked: "" });
    const [expenseForm, setExpenseForm] = useState({ expense_type: "material", description: "", cost: "", date_incurred: todayStr });
    const [reportForm, setReportForm] = useState({ report_date: todayStr, status_notes: "", task_completion_notes: "", closeout_completed: false });

    useEffect(() => {
        let isMounted = true;
        const fetchData = async () => {
            // Fetch Employees
            const { data: empData } = await supabase.from("user_profiles").select("id, full_name, role").in("role", ["employee", "foreman"]).order("full_name");
            if (isMounted) setEmployees(empData || []);

            // Fetch Project Hours
            const { data: hrData } = await supabase.from("project_hours").select("*, employee:user_profiles(full_name)").eq("project_id", projectId).order("date", { ascending: false });
            if (isMounted) setHours(hrData || []);

            // Fetch Expenses
            const { data: exData } = await supabase.from("project_expenses").select("*").eq("project_id", projectId).order("date_incurred", { ascending: false });
            if (isMounted) setExpenses(exData || []);

            // Fetch Daily Reports
            const { data: repData } = await supabase.from("foreman_daily_reports").select("*, foreman:user_profiles(full_name)").eq("project_id", projectId).order("report_date", { ascending: false });
            if (isMounted) setReports(repData || []);

            if (isMounted) setLoading(false);
        };
        fetchData();
        return () => { isMounted = false; };
    }, [projectId, supabase]);

    // --- SUBMISSION HANDLERS ---

    const handleLogHours = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        const { data, error } = await supabase.from("project_hours").insert({
            project_id: projectId,
            employee_id: hourForm.employee_id,
            date: hourForm.date,
            hours_worked: parseFloat(hourForm.hours_worked)
        }).select("*, employee:user_profiles(full_name)").single();

        if (error) alert("Error logging hours: " + error.message);
        else {
            setHours([data, ...hours]);
            setHourForm({ employee_id: "", date: todayStr, hours_worked: "" });
        }
        setSaving(false);
    };

    const handleLogExpense = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        const { data, error } = await supabase.from("project_expenses").insert({
            project_id: projectId,
            expense_type: expenseForm.expense_type,
            description: expenseForm.description,
            cost: parseFloat(expenseForm.cost),
            date_incurred: expenseForm.date_incurred
        }).select().single();

        if (error) alert("Error logging expense: " + error.message);
        else {
            setExpenses([data, ...expenses]);
            setExpenseForm({ expense_type: "material", description: "", cost: "", date_incurred: todayStr });
        }
        setSaving(false);
    };

    const handleLogReport = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        // Check if report already exists for today
        const existingReport = reports.find(r => r.report_date === reportForm.report_date);

        if (existingReport) {
            alert(`A daily report already exists for ${reportForm.report_date}. Cannot duplicate.`);
            setSaving(false);
            return;
        }

        const { data, error } = await supabase.from("foreman_daily_reports").insert({
            project_id: projectId,
            foreman_id: userId,
            report_date: reportForm.report_date,
            status_notes: reportForm.status_notes,
            task_completion_notes: reportForm.task_completion_notes,
            closeout_completed: reportForm.closeout_completed
        }).select("*, foreman:user_profiles(full_name)").single();

        if (error) alert("Error saving daily report: " + error.message);
        else {
            setReports([data, ...reports]);
            setReportForm({ report_date: todayStr, status_notes: "", task_completion_notes: "", closeout_completed: false });
        }
        setSaving(false);
    };

    // --- DELETION HANDLERS ---
    const deleteRecord = async (table: string, id: string, setter: any, arr: any[]) => {
        if (!confirm("Are you sure you want to delete this record?")) return;
        const { error } = await supabase.from(table).delete().eq("id", id);
        if (error) alert("Error deleting record: " + error.message);
        else setter(arr.filter(a => a.id !== id));
    };

    if (loading) return <div className="py-12 text-center text-gray-500"><Loader2 className="animate-spin inline mr-2" />Loading daily logs...</div>;

    const aggregateTotalHours = hours.reduce((acc, curr) => acc + Number(curr.hours_worked), 0);
    const aggregateTotalExpenses = expenses.reduce((acc, curr) => acc + Number(curr.cost), 0);

    return (
        <div className="space-y-8">

            {/* QUICK STATS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col items-center justify-center">
                    <div className="text-gray-500 font-bold uppercase tracking-wider text-xs mb-2">Total Project Hours</div>
                    <div className="text-3xl font-extrabold text-primary flex items-center gap-2">
                        <Clock size={28} /> {aggregateTotalHours.toFixed(2)}
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col items-center justify-center">
                    <div className="text-gray-500 font-bold uppercase tracking-wider text-xs mb-2">Total Logged Expenses</div>
                    <div className="text-3xl font-extrabold text-red-600 flex items-center gap-2">
                        <DollarSign size={28} /> {aggregateTotalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                </div>
            </div>

            {/* THREE COLUMN GRID FOR FORMS & LISTS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* --- 1. DAILY REPORT COLUMN --- */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2"><FileCheck2 className="text-primary" /> Post Daily Report</h2>
                        <form onSubmit={handleLogReport} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Date</label>
                                <input type="date" required value={reportForm.report_date} onChange={e => setReportForm({ ...reportForm, report_date: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 bg-white focus:ring-primary focus:border-primary" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Daily Summary & Status</label>
                                <textarea required rows={3} value={reportForm.status_notes} onChange={e => setReportForm({ ...reportForm, status_notes: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 bg-white focus:ring-primary focus:border-primary" placeholder="What happened today?" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Task Completion Notes</label>
                                <textarea rows={2} value={reportForm.task_completion_notes} onChange={e => setReportForm({ ...reportForm, task_completion_notes: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 bg-white focus:ring-primary focus:border-primary" placeholder="Additional details on tasks finished..." />
                            </div>
                            <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                                <input type="checkbox" id="closeout" checked={reportForm.closeout_completed} onChange={e => setReportForm({ ...reportForm, closeout_completed: e.target.checked })} className="h-5 w-5 text-primary rounded ring-primary" />
                                <label htmlFor="closeout" className="text-sm font-bold text-green-700">Project Secured & Daily Closeout Finished</label>
                            </div>
                            <button type="submit" disabled={saving} className="w-full py-2 bg-primary text-white font-bold rounded hover:bg-primary/90 disabled:opacity-50 mt-4 flex justify-center items-center">
                                {saving ? <Loader2 className="animate-spin" size={16} /> : "Submit End-of-Day Report"}
                            </button>
                        </form>
                    </div>

                    {/* Report History */}
                    <div className="space-y-4">
                        <h3 className="font-bold text-gray-700 text-sm uppercase tracking-wider">Report History</h3>
                        {reports.length === 0 ? <p className="text-sm text-gray-500">No reports logged yet.</p> : reports.map(r => (
                            <div key={r.id} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm relative group">
                                <button type="button" onClick={() => deleteRecord("foreman_daily_reports", r.id, setReports, reports)} className="absolute top-2 right-2 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14} /></button>
                                <div className="text-xs font-bold text-primary mb-1">{r.report_date} - {r.foreman.full_name}</div>
                                <p className="text-sm text-gray-800 mb-2">{r.status_notes}</p>
                                {r.task_completion_notes && <p className="text-xs text-gray-500 italic mb-2">Tasks: {r.task_completion_notes}</p>}
                                {r.closeout_completed ? <div className="text-xs font-bold text-green-600"><CheckCircle size={12} className="inline mr-1" /> Closeout Complete</div> : <div className="text-xs font-bold text-red-600"><AlertTriangle size={12} className="inline mr-1" /> Closeout Not Checked</div>}
                            </div>
                        ))}
                    </div>
                </div>

                {/* --- 2. LOG HOURS COLUMN --- */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2"><Clock className="text-blue-600" /> Log Daily Hours</h2>
                        <form onSubmit={handleLogHours} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Employee</label>
                                <select required value={hourForm.employee_id} onChange={e => setHourForm({ ...hourForm, employee_id: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 bg-white focus:ring-primary focus:border-primary">
                                    <option value="">-- Select Employee --</option>
                                    {employees.map(emp => (
                                        <option key={emp.id} value={emp.id}>{emp.full_name} ({emp.role})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Date</label>
                                    <input type="date" required value={hourForm.date} onChange={e => setHourForm({ ...hourForm, date: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 bg-white focus:ring-primary focus:border-primary" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Hours</label>
                                    <input type="number" step="0.5" max="24" required value={hourForm.hours_worked} onChange={e => setHourForm({ ...hourForm, hours_worked: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 bg-white focus:ring-primary focus:border-primary" placeholder="E.g. 8" />
                                </div>
                            </div>
                            <button type="submit" disabled={saving || !hourForm.employee_id} className="w-full py-2 bg-blue-600 text-white font-bold rounded hover:bg-blue-700 disabled:opacity-50 mt-4 flex justify-center items-center">
                                {saving ? <Loader2 className="animate-spin" size={16} /> : "+ Log Hours"}
                            </button>
                        </form>
                    </div>

                    {/* Hours History */}
                    <div className="space-y-4">
                        <h3 className="font-bold text-gray-700 text-sm uppercase tracking-wider">Hours History</h3>
                        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden divide-y divide-gray-100">
                            {hours.length === 0 ? <p className="p-4 text-sm text-gray-500">No hours logged.</p> : hours.map(h => (
                                <div key={h.id} className="p-3 flex justify-between items-center group">
                                    <div>
                                        <div className="text-sm font-bold text-gray-900">{h.employee.full_name}</div>
                                        <div className="text-xs text-gray-500">{h.date}</div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-sm font-extrabold text-blue-600">{h.hours_worked} hrs</div>
                                        <button type="button" onClick={() => deleteRecord("project_hours", h.id, setHours, hours)} className="text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14} /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* --- 3. LOG EXPENSES COLUMN --- */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2"><DollarSign className="text-red-600" /> Log Project Expenses</h2>
                        <form onSubmit={handleLogExpense} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Type</label>
                                    <select required value={expenseForm.expense_type} onChange={e => setExpenseForm({ ...expenseForm, expense_type: e.target.value })} className="w-full px-2 py-2 border border-gray-300 rounded-md text-sm text-gray-900 bg-white focus:ring-primary focus:border-primary">
                                        <option value="material">Material</option>
                                        <option value="subcontractor_bill">Subcontractor Bill</option>
                                        <option value="general">General</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Date</label>
                                    <input type="date" required value={expenseForm.date_incurred} onChange={e => setExpenseForm({ ...expenseForm, date_incurred: e.target.value })} className="w-full px-2 py-2 border border-gray-300 rounded-md text-sm text-gray-900 bg-white focus:ring-primary focus:border-primary" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Description</label>
                                <input type="text" required value={expenseForm.description} onChange={e => setExpenseForm({ ...expenseForm, description: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 bg-white focus:ring-primary focus:border-primary" placeholder="E.g. Home Depot Lumber" />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Cost Amount ($)</label>
                                <input type="number" step="0.01" required value={expenseForm.cost} onChange={e => setExpenseForm({ ...expenseForm, cost: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 bg-white focus:ring-primary focus:border-primary" placeholder="0.00" />
                            </div>

                            <button type="submit" disabled={saving} className="w-full py-2 bg-red-600 text-white font-bold rounded hover:bg-red-700 disabled:opacity-50 mt-4 flex justify-center items-center">
                                {saving ? <Loader2 className="animate-spin" size={16} /> : "+ Log Expense"}
                            </button>
                        </form>
                    </div>

                    {/* Expense History */}
                    <div className="space-y-4">
                        <h3 className="font-bold text-gray-700 text-sm uppercase tracking-wider">Expense History</h3>
                        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden divide-y divide-gray-100">
                            {expenses.length === 0 ? <p className="p-4 text-sm text-gray-500">No expenses logged.</p> : expenses.map(ex => (
                                <div key={ex.id} className="p-3 flex justify-between items-center group">
                                    <div>
                                        <div className="text-sm font-bold text-gray-900 line-clamp-1">{ex.description}</div>
                                        <div className="text-xs text-gray-500 capitalize">{ex.expense_type.replace('_', ' ')} • {ex.date_incurred}</div>
                                    </div>
                                    <div className="flex items-center gap-4 ml-2">
                                        <div className="text-sm font-extrabold text-red-600 shrink-0">${Number(ex.cost).toFixed(2)}</div>
                                        <button type="button" onClick={() => deleteRecord("project_expenses", ex.id, setExpenses, expenses)} className="text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14} /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
