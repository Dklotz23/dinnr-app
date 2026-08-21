import { useState } from 'react';
import { useData } from '../context/DataContext';
import { db } from '../lib/firebase';
import { collection, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';

const PRESET_TAGS = ["Quick", "Healthy", "Weekend", "Takeout", "Cheat Meal"];
const AMOUNTS = [" " ,"1/4", "1/2", "3/4", "1", "1 1/4", "1 1/2", "1 3/4", "2", "3", "4", "5", "Whole", "Bag", "Box"];
const UNITS = [" ", "tsp", "Tbsp", "cup", "oz", "lb", "g", "kg", "ml", "pt", "qt", "ct", "clove", "can"];

export default function ManageMeals() {
  const { meals, loading, HOUSEHOLD_ID } = useData();
  const [newMealName, setNewMealName] = useState("");
  const [selectedTags, setSelectedTags] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Ingredient Builder State
  const [ingredients, setIngredients] = useState([]);
  const [curAmount, setCurAmount] = useState("1");
  const [curUnit, setCurUnit] = useState("cup");
  const [curIngredientName, setCurIngredientName] = useState("");

  const toggleTag = (tag) => {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const addIngredientToList = () => {
    if (!curIngredientName.trim()) return;
    const newIngredient = {
      amount: curAmount,
      unit: curUnit,
      name: curIngredientName.trim()
    };
    setIngredients([...ingredients, newIngredient]);
    setCurIngredientName(""); // Reset name only, keep amount/unit for speed
  };

  const removeIngredientFromList = (index) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const handleAddMeal = async (e) => {
    e.preventDefault();
    if (!newMealName.trim()) return;

    setIsSubmitting(true);
    try {
      const mealsRef = collection(db, "households", HOUSEHOLD_ID, "meals");

      await addDoc(mealsRef, {
        name: newMealName,
        tags: selectedTags,
        ingredients: ingredients, // Injected the ingredients array here
        created_at: serverTimestamp()
      });
      
      // Reset everything
      setNewMealName('');
      setSelectedTags([]);
      setIngredients([]);
      setCurIngredientName("");
    } catch (error) {
      console.error("Error adding meal:", error);
      alert("Failed to add meal.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Remove this meal forever?")) {
      await deleteDoc(doc(db, "households", HOUSEHOLD_ID, "meals", id));
    }
  };

  if (loading) return <div className="p-8 text-center">Loading meals...</div>;

  return (
    <div className="pb-24 max-w-md mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Your Menu</h1>

      <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 mb-8">
        <h2 className="text-lg font-semibold mb-4 text-gray-700">Add New Option</h2>
        <form onSubmit={handleAddMeal}>
          
          {/* Meal Name */}
          <div className="mb-4">
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Meal Name</label>
            <input 
              type="text" 
              value={newMealName}
              onChange={(e) => setNewMealName(e.target.value)}
              placeholder="e.g. Tacos"
              className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none transition-all"
            />
          </div>

          {/* --- INGREDIENT BUILDER AREA --- */}
          <div className="mb-6 p-4 bg-gray-50 rounded-2xl border border-gray-200">
            <label className="block text-xs font-bold text-gray-400 uppercase mb-4 tracking-wider">
              Ingredient Builder
            </label>

            <div className="flex items-start gap-2 h-32 mb-4">
              
              {/* NEW GROUP FOR THE WHEELS ONLY - THIS IS WHERE THE HIGHLIGHT LIVES */}
              <div className="flex-1 h-full flex relative rounded-xl border border-gray-100 bg-white shadow-inner overflow-hidden">
                
                {/* 1. VISUAL CENTER HIGHLIGHT OVERLAY (Fixed positioning relative to this parent) */}
                <div className="absolute inset-x-0 h-10 border-y border-orange-200 bg-orange-50/40 pointer-events-none top-1/2 -translate-y-1/2 rounded-md z-10" />

                {/* 2. Amount Wheel */}
                <div className="flex-1 h-full overflow-y-scroll snap-y snap-mandatory no-scrollbar text-center py-12 scroll-smooth"
                    onScroll={(e) => {
                      const idx = Math.round(e.target.scrollTop / 40);
                      if (AMOUNTS[idx] && AMOUNTS[idx] !== curAmount) setCurAmount(AMOUNTS[idx]);
                    }}>
                  {AMOUNTS.map((a) => (
                    <div key={a} className={`h-10 flex items-center justify-center snap-center text-sm font-medium transition-colors ${a === curAmount ? 'text-orange-700' : 'text-gray-400'}`}>
                      {a}
                    </div>
                  ))}
                </div>

                {/* 3. Unit Wheel */}
                <div className="flex-1 h-full overflow-y-scroll snap-y snap-mandatory no-scrollbar text-center py-12 scroll-smooth"
                    onScroll={(e) => {
                      const idx = Math.round(e.target.scrollTop / 40);
                      if (UNITS[idx] && UNITS[idx] !== curUnit) setCurUnit(UNITS[idx]);
                    }}>
                  {UNITS.map((u) => (
                    <div key={u} className={`h-10 flex items-center justify-center snap-center text-sm font-medium transition-colors ${u === curUnit ? 'text-orange-700' : 'text-gray-400'}`}>
                      {u}
                    </div>
                  ))}
                </div>
              </div>

              {/* 4. Name Input & Add Button (Now naturally aligned on the right) */}
              <div className="flex-[1.2] flex flex-col gap-2">
                <input 
                  type="text"
                  placeholder="Item name..."
                  value={curIngredientName}
                  onChange={(e) => setCurIngredientName(e.target.value)}
                  className="p-3 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500 shadow-sm transition-all"
                />
                <button 
                  type="button"
                  onClick={addIngredientToList}
                  className="bg-orange-600 text-white py-3 rounded-xl font-bold text-sm active:scale-95 transition-transform flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
                  disabled={!curIngredientName.trim()}
                >
                  <span>Add Item</span>
                  <span className="text-xl leading-none">+</span>
                </button>
              </div>
            </div>

            {/* ... visual list of ingredients below ... */}
            <div className="flex flex-wrap gap-2 min-h-[32px]">
              {ingredients.map((ing, idx) => (
                <div key={idx} className="flex items-center gap-1 bg-white border border-orange-100 px-3 py-1.5 rounded-full text-xs shadow-sm animate-in zoom-in duration-200">
                  <span className="font-bold text-orange-600">{ing.amount} {ing.unit}</span>
                  <span className="text-gray-700">{ing.name}</span>
                  <button onClick={() => removeIngredientFromList(idx)} className="ml-1 text-gray-400 hover:text-red-500 font-bold">×</button>
                </div>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div className="mb-6">
            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Tags</label>
            <div className="flex flex-wrap gap-2">
              {PRESET_TAGS.map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                    selectedTags.includes(tag) 
                      ? 'bg-orange-500 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <button 
            type="submit" 
            disabled={!newMealName.trim() || isSubmitting}
            className="w-full bg-gray-900 text-white font-bold py-3 rounded-xl shadow-lg hover:bg-black disabled:opacity-50 transition-all active:scale-95"
          >
            {isSubmitting ? 'Saving...' : 'Save Meal to Library'}
          </button>
        </form>
      </div>

      {/* List Display */}
      <div>
        <h2 className="text-lg font-semibold mb-4 text-gray-700">Current Library ({meals.length})</h2>
        <div className="space-y-3">
          {meals.map(meal => (
            <div key={meal.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-start">
              <div>
                <h3 className="font-bold text-gray-800">{meal.name}</h3>
                <div className="flex flex-wrap gap-1 mt-1">
                  {meal.ingredients?.slice(0, 3).map((ing, i) => (
                    <span key={i} className="text-[10px] text-gray-400 italic">
                      • {ing.name}{i === 2 && meal.ingredients.length > 3 ? '...' : ''}
                    </span>
                  ))}
                </div>
              </div>
              <button onClick={() => handleDelete(meal.id)} className="text-gray-300 hover:text-red-500 p-2 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}