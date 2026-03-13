
import React, { useState } from 'react';
import { Car, Member, Expense, StaffMember } from '../types';

// Modal for managing Fleet, Members, and Expenses
interface FleetModalProps {
  isOpen: boolean;
  onClose: () => void;
  cars: Car[];
  members: Member[];
  expenses: Expense[];
  onAddCar: (car: Omit<Car, 'id'>) => void;
  onDeleteCar: (id: string) => void;
  onUpdateMember: (id: string, updates: Partial<Member>) => void;
  onAddExpense: (expense: Omit<Expense, 'id'>) => void;
  onDeleteExpense: (id: string) => void;
  currentStaff?: StaffMember | null;
}

const COLORS = [
  { name: 'Blue', value: 'bg-blue-600' },
  { name: 'Red', value: 'bg-red-500' },
  { name: 'Emerald', value: 'bg-emerald-500' },
  { name: 'Indigo', value: 'bg-indigo-600' },
  { name: 'Amber', value: 'bg-amber-500' },
  { name: 'Rose', value: 'bg-rose-500' },
  { name: 'Slate', value: 'bg-slate-700' },
  { name: 'Violet', value: 'bg-violet-600' },
  { name: 'Pink', value: 'bg-pink-500' },
  { name: 'Orange', value: 'bg-orange-500' },
  { name: 'Pastel Pink', value: 'bg-[#fdb0c0]' },
  { name: 'Bright Yellow', value: 'bg-[#FFFF00]' },
];

const EXPENSE_CATEGORIES = ['Car Wash', 'Service', 'Fuel', 'Maintenance', 'Insurance', 'Other'];

const FleetModal: React.FC<FleetModalProps> = ({ 
  isOpen, onClose, cars, members, expenses, onAddCar, onDeleteCar, onUpdateMember, onAddExpense, onDeleteExpense, currentStaff
}) => {
  const [activeTab, setActiveTab] = useState<'vehicles' | 'members' | 'expenses'>('vehicles');
  
  // Car State
  const [plate, setPlate] = useState('');
  const [carName, setCarName] = useState('');

  // Member State - for editing own color
  const [isEditingColor, setIsEditingColor] = useState(false);

  // Expense State
  const [expenseCarId, setExpenseCarId] = useState('');
  const [expenseCategory, setExpenseCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [expenseNotes, setExpenseNotes] = useState('');

  if (!isOpen) return null;

  const handleAddVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!plate || !carName) return;
    onAddCar({
      plate: plate.toUpperCase(),
      name: carName,
      type: 'Economy'
    });
    setPlate('');
    setCarName('');
  };

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseCarId || !expenseAmount || !expenseDate) return;
    
    onAddExpense({
      carId: expenseCarId,
      category: expenseCategory,
      amount: parseFloat(expenseAmount),
      date: expenseDate,
      notes: expenseNotes
    });
    
    // Reset minimal fields
    setExpenseAmount('');
    setExpenseNotes('');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
          <h2 className="text-xl font-bold text-slate-800">Fleet Management</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100">
          <button 
            onClick={() => setActiveTab('vehicles')}
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${activeTab === 'vehicles' ? 'text-slate-900 border-b-2 border-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Vehicles
          </button>
          <button 
            onClick={() => setActiveTab('members')}
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${activeTab === 'members' ? 'text-slate-900 border-b-2 border-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Members
          </button>
          <button 
            onClick={() => setActiveTab('expenses')}
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${activeTab === 'expenses' ? 'text-slate-900 border-b-2 border-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Expenses
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-8 flex-1">
          {activeTab === 'vehicles' && (
            <>
              {/* Add New Car */}
              <section>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Add New Vehicle</h3>
                <form onSubmit={handleAddVehicle} className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl">
                  <div className="md:col-span-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Plate Number</label>
                    <input 
                      type="text"
                      placeholder="e.g. ABC-1234"
                      value={plate}
                      onChange={(e) => setPlate(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm uppercase outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="md:col-span-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Model Name</label>
                    <input 
                      type="text"
                      placeholder="e.g. Tesla Model Y"
                      value={carName}
                      onChange={(e) => setCarName(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <button 
                    type="submit"
                    className="md:col-span-2 py-2.5 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-900 transition-colors"
                  >
                    Add to Fleet
                  </button>
                </form>
              </section>

              {/* List Fleet */}
              <section>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Current Fleet ({cars.length})</h3>
                <div className="space-y-2">
                  {cars.map(car => (
                    <div key={car.id} className="flex items-center justify-between p-3 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center text-slate-500">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 012-2h5a2 2 0 012 2"/></svg>
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-800 uppercase leading-none">{car.plate}</div>
                          <div className="text-xs text-slate-500">{car.name}</div>
                        </div>
                      </div>
                      <button 
                        onClick={() => onDeleteCar(car.id)}
                        className="text-slate-300 hover:text-red-500 transition-colors p-1"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                      </button>
                    </div>
                  ))}
                  {cars.length === 0 && <div className="text-center py-4 text-slate-400 text-sm">No vehicles in fleet.</div>}
                </div>
              </section>
            </>
          )}

          {activeTab === 'members' && (
            <div className="space-y-6">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h4 className="text-sm font-semibold text-slate-900 mb-1">Registered Members</h4>
                <p className="text-xs text-slate-500">
                  Members are automatically synced from Staff Management. You can only edit your own display color.
                </p>
              </div>

              <div className="space-y-3">
                {members.map((member) => {
                  const isOwnMember = currentStaff && member.staff_id === currentStaff.id;
                  return (
                    <div key={member.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full ${member.color} flex items-center justify-center text-white text-xs font-bold shadow-sm`}>
                          {member.name.substring(0,2).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-900">{member.name}</span>
                          {isOwnMember && (
                            <span className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">
                              You
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {isOwnMember && (
                        <div className="flex items-center gap-2">
                          {isEditingColor ? (
                            <div className="flex flex-wrap gap-1 max-w-[200px] justify-end">
                              {COLORS.map((c) => (
                                <button
                                  key={c.value}
                                  onClick={() => {
                                    onUpdateMember(member.id, { color: c.value });
                                    setIsEditingColor(false);
                                  }}
                                  className={`w-6 h-6 rounded-full ${c.value} border-2 ${member.color === c.value ? 'border-slate-900' : 'border-transparent'} hover:scale-110 transition-transform`}
                                  title={c.name}
                                />
                              ))}
                              <button
                                onClick={() => setIsEditingColor(false)}
                                className="text-[10px] text-slate-500 hover:text-slate-700 ml-2"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setIsEditingColor(true)}
                              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                            >
                              Edit Color
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                {members.length === 0 && <div className="text-center py-4 text-slate-400 text-sm">No members registered.</div>}
              </div>
            </div>
          )}

          {activeTab === 'expenses' && (
            <>
              {/* Add Expense */}
              <section>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Record Expense</h3>
                <form onSubmit={handleAddExpense} className="bg-slate-50 p-4 rounded-2xl space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                       <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Vehicle</label>
                       <select 
                         value={expenseCarId}
                         onChange={(e) => setExpenseCarId(e.target.value)}
                         className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                       >
                         <option value="">-- Select Vehicle --</option>
                         {cars.map(c => (
                           <option key={c.id} value={c.id}>{c.plate} - {c.name}</option>
                         ))}
                       </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Category</label>
                      <select 
                        value={expenseCategory}
                        onChange={(e) => setExpenseCategory(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {EXPENSE_CATEGORIES.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Amount (RM)</label>
                      <input 
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={expenseAmount}
                        onChange={(e) => setExpenseAmount(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Date</label>
                      <input 
                        type="date"
                        value={expenseDate}
                        onChange={(e) => setExpenseDate(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Notes (Optional)</label>
                    <input 
                      type="text"
                      placeholder="e.g. 50k KM service"
                      value={expenseNotes}
                      onChange={(e) => setExpenseNotes(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <button 
                    type="submit"
                    className="w-full py-2.5 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-900 transition-colors"
                  >
                    Save Expense
                  </button>
                </form>
              </section>

              {/* Expense History */}
              <section>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Expense History</h3>
                <div className="space-y-2">
                  {expenses.length === 0 ? (
                    <div className="text-center py-4 text-slate-400 text-sm">No expenses recorded yet.</div>
                  ) : (
                    expenses.map(expense => {
                      const car = cars.find(c => c.id === expense.carId);
                      return (
                        <div key={expense.id} className="flex items-center justify-between p-3 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                            </div>
                            <div>
                              <div className="text-sm font-bold text-slate-800">
                                {car?.plate} <span className="text-slate-400 font-normal">| {expense.category}</span>
                              </div>
                              <div className="text-xs text-slate-500">
                                {new Date(expense.date).toLocaleDateString()} — <span className="font-semibold text-slate-700">RM {expense.amount.toFixed(2)}</span>
                              </div>
                            </div>
                          </div>
                          <button 
                            onClick={() => onDeleteExpense(expense.id)}
                            className="text-slate-300 hover:text-red-500 transition-colors p-1"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default FleetModal;
