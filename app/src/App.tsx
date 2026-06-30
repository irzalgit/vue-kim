import Navigation from "./sections/Navigation";
import Hero from "./sections/Hero";
import Curriculum from "./sections/Curriculum";
import CinematicVision from "./sections/CinematicVision";
import AlumniArchives from './sections/AlumniArchives';
export default function App() {
  return (
    <div style={{ background: "#0a0a0a", minHeight: "100vh" }}>
      <Navigation />
      <Hero />
      <Curriculum />
      <CinematicVision />
       <AlumniArchives />
    </div>
  );
}