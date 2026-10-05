import { Route, Routes } from "react-router-dom";
import AssistantView from "./views/AssistantView";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<AssistantView />} />
    </Routes>
  );
}
