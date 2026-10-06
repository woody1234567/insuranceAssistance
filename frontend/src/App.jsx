import { Route, Routes } from "react-router-dom";
import AssistantView from "./views/AssistantView";
import HumanServiceView from "./views/HumanServiceView";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<AssistantView />} />
      <Route path="/human-service" element={<HumanServiceView />} />
    </Routes>
  );
}
