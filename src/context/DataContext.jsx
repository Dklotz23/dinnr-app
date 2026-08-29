import { createContext, useContext, useState, useEffect } from "react";
import { db } from "../lib/firebase";
import { collection, doc, onSnapshot, setDoc } from "firebase/firestore";

const DataContext = createContext();

export function useData() {
  return useContext(DataContext);
}

export function DataProvider({ children }) {
  const [meals, setMeals] = useState([]);
  const [pantry, setPantry] = useState([]);
  const [weekPlan, setWeekPlan] = useState({});
  const [lockedDays, setLockedDays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDays, setSelectedDays] = useState([]);

  const HOUSEHOLD_ID = "demo_household";

  // Define a list of common "Starter Meals"
  const starterMeals = [
    { name: "Spaghetti Bolognese", tags: ["Pasta"] },
    { name: "Chicken Stir Fry", tags: ["Quick"] },
    { name: "Taco Tuesday", tags: ["Mexican"] },
    { name: "Homemade Pizza", tags: ["Family Favorite"] },
    { name: "Grilled Salmon & Veggies", tags: ["Healthy"] }
  ];

  useEffect(() => {
    const mealsRef = collection(db, "households", HOUSEHOLD_ID, "meals");
    const householdRef = doc(db, "households", HOUSEHOLD_ID);

    // 1. Subscribe to Meals
    const unsubMeals = onSnapshot(mealsRef, (snapshot) => {
      const mealsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setMeals(mealsData);
    });

    // 2. Subscribe to Household + Handle Initialization
const unsubHousehold = onSnapshot(householdRef, async (docSnap) => {
  // Check if the document truly exists in the cloud
  if (docSnap.exists() && docSnap.data() !== undefined) {
    const data = docSnap.data();
    setPantry(data.pantry || []);
    setWeekPlan(data.week_plan || {});
    setLockedDays(data.locked_days || []);
    setLoading(false);
    setSelectedDays(data.selected_days || []);
  } else {
    // If we reach here, the document is officially GONE.
    console.log("No household found. Seeding initial data...");
    
    try {
      // 1. Create the parent household document
      await setDoc(householdRef, {
        pantry: [],
        week_plan: {},
        locked_days: [],
        selected_days: []
      });

      // 2. Seed the meals sub-collection
      // We use a Batch or Promise.all to ensure they all fire off
      const mealPromises = starterMeals.map(meal => {
        const newMealRef = doc(collection(db, "households", HOUSEHOLD_ID, "meals"));
        return setDoc(newMealRef, {
          ...meal,
          createdAt: new Date()
        });
      });

      await Promise.all(mealPromises);
      console.log("Seeding complete!");
      
    } catch (err) {
      console.error("Seeding failed:", err);
    } finally {
      setLoading(false);
    }
  }
});

    return () => {
      unsubMeals();
      unsubHousehold();
    };
  }, []);

  // ... rest of provider
  const value = {
    meals,
    pantry,
    weekPlan,
    lockedDays,
    selectedDays,
    loading,
    HOUSEHOLD_ID
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}