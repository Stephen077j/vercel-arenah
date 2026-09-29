import { createRoot } from "react-dom/client";
import { seedRestaurantMenu } from "@/lib/menuSeed";
import App from "./App.tsx";
import "./index.css";

// Seed ARENAH restaurant menu on first load
seedRestaurantMenu();

createRoot(document.getElementById("root")!).render(<App />);
